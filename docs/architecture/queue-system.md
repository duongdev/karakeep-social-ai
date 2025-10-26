# Queue System

> Background job processing architecture using BullMQ and Redis to handle long-running tasks

[← Back to Documentation Index](../README.md) | [Database Schema](./database-schema.md) →

## Contents

- [Overview](#overview)
- [Why Queue System?](#why-queue-system)
- [Architecture](#architecture)
- [Implementation](#implementation)
- [Job Types](#job-types)
- [Deployment](#deployment)
- [Monitoring](#monitoring)
- [Best Practices](#best-practices)

## Overview

Karakeep uses a **queue-based architecture** to handle operations that exceed Vercel's timeout limits. This allows us to:

- Process videos of any length
- Handle batch operations
- Provide real-time progress updates
- Implement retry logic
- Scale horizontally

## Why Queue System?

### The Problem

Vercel serverless functions have strict timeout limits:

| Plan | Timeout | What Breaks |
|------|---------|-------------|
| Hobby | 10s | ❌ ALL video transcription |
| Pro | 60s | ❌ Videos > 3 minutes |
| Enterprise | 900s | ⚠️ Videos > 45 minutes |

### Breakdown for 5-minute video:

```
1. Cobalt Download:     10-30s
2. Whisper Transcribe:  30-60s
3. Claude Analysis:     2-5s
4. Database Write:      0.5s
   ──────────────────────────
   Total:               42.5-95.5s  ❌ TIMEOUT on Pro!
```

### The Solution

```
┌──────────────────┐
│  Vercel API      │ → Queues job (<1s)
│  (Fast response) │
└─────────┬────────┘
          │
          ▼
┌──────────────────┐
│  Redis Queue     │ → Stores job data
│  (Upstash)       │
└─────────┬────────┘
          │
          ▼
┌──────────────────┐
│  Background      │ → Processes with NO timeout
│  Worker          │ → Can take hours if needed
│  (Railway/Render)│
└──────────────────┘
```

## Architecture

### Component Breakdown

**1. Vercel API (Queue Producer)**
- Receives user requests
- Validates input
- Queues job to Redis
- Returns job ID immediately
- Response time: <500ms ✅

**2. Redis Queue (Upstash)**
- Stores pending jobs
- Manages job lifecycle
- Tracks progress
- Free tier: 10K requests/day

**3. Background Worker (Railway/Render)**
- Picks up jobs from queue
- Processes without timeout
- Updates progress in real-time
- Stores results in database
- Free tier: 500-750 hours/month

**4. Shared PostgreSQL**
- All components use same database
- Workers write results
- API reads results
- Consistent data everywhere

### Request Flow

#### Fast Operations (< 10s)

```
User Request
    │
    ▼
Vercel API
    │
    ▼
PostgreSQL (read/write)
    │
    ▼
Response to User
```

**Examples**: List bookmarks, get single bookmark, create account, simple searches

#### Long Operations (> 10s)

```
User Request
    │
    ▼
Vercel API
    │
    ├─> Queue Job in Redis
    │   (returns job ID immediately)
    └─> Response: "Job queued, ID: 123"

Background Worker (separate process)
    │
    ├─> Picks up job from Redis
    ├─> Downloads video (Cobalt)
    ├─> Transcribes (Whisper)
    ├─> Stores in PostgreSQL
    └─> Updates job status

User (polling)
    │
    └─> Check /api/jobs/123/status
```

**Examples**: Video transcription, batch processing, README downloads

## Implementation

### Install Dependencies

```bash
npm install bullmq ioredis
```

### Setup Redis Queue

Create `src/lib/queue.ts`:

```typescript
import { Queue, Worker, Job } from 'bullmq'
import Redis from 'ioredis'

const connection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
})

export const transcriptionQueue = new Queue('transcription', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep for 24 hours
      count: 100,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failures for 7 days
    },
  },
})

export interface TranscriptionJob {
  bookmarkId: string
  url: string
  platform: string
  accountId: string
}
```

### API Endpoint (Queue Producer)

Create `src/routes/transcription.ts`:

```typescript
import { Hono } from 'hono'
import { transcriptionQueue } from '@/lib/queue'
import { prisma } from '@/lib/db'

const app = new Hono()

// Queue transcription (returns immediately)
app.post('/transcribe/:id', async (c) => {
  const bookmarkId = c.req.param('id')

  const bookmark = await prisma.bookmark.findUnique({
    where: { id: bookmarkId },
    select: { id: true, url: true, platform: true, accountId: true }
  })

  if (!bookmark) {
    return c.json({ error: 'Bookmark not found' }, 404)
  }

  // Add to queue (this is fast - returns in <1s)
  const job = await transcriptionQueue.add('transcribe', {
    bookmarkId: bookmark.id,
    url: bookmark.url,
    platform: bookmark.platform,
    accountId: bookmark.accountId,
  })

  // Mark as pending
  await prisma.aIAnalysis.upsert({
    where: { bookmarkId },
    create: {
      bookmarkId,
      transcript: null,
      transcriptionStatus: 'PENDING',
      transcriptionJobId: job.id,
    },
    update: {
      transcriptionStatus: 'PENDING',
      transcriptionJobId: job.id,
    }
  })

  return c.json({
    success: true,
    jobId: job.id,
    status: 'queued',
    message: 'Transcription queued. Check status endpoint for progress.'
  })
})

// Check transcription status
app.get('/transcribe/status/:jobId', async (c) => {
  const jobId = c.req.param('jobId')
  const job = await transcriptionQueue.getJob(jobId)

  if (!job) {
    return c.json({ error: 'Job not found' }, 404)
  }

  const state = await job.getState()
  const progress = job.progress

  return c.json({
    jobId,
    state, // 'waiting', 'active', 'completed', 'failed'
    progress,
    failedReason: job.failedReason,
    finishedOn: job.finishedOn,
  })
})

export default app
```

### Background Worker (Job Consumer)

Create `src/worker.ts`:

```typescript
import { Worker, Job } from 'bullmq'
import Redis from 'ioredis'
import { TranscriptionService } from './services/transcription'
import { AIProcessor } from './services/ai-processor'
import { prisma } from './lib/db'
import { TranscriptionJob } from './lib/queue'

const connection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
})

const transcriptionService = new TranscriptionService()
const aiProcessor = new AIProcessor()

// Worker processes jobs from queue
const worker = new Worker<TranscriptionJob>(
  'transcription',
  async (job: Job<TranscriptionJob>) => {
    const { bookmarkId, url, platform, accountId } = job.data

    console.log(`[Worker] Processing transcription for bookmark ${bookmarkId}`)

    try {
      // Update status to PROCESSING
      await prisma.aIAnalysis.upsert({
        where: { bookmarkId },
        create: {
          bookmarkId,
          transcriptionStatus: 'PROCESSING',
        },
        update: {
          transcriptionStatus: 'PROCESSING',
        }
      })

      // Step 1: Download & transcribe (can take minutes - no timeout!)
      await job.updateProgress(10)
      console.log(`[Worker] Downloading audio from ${url}`)

      const transcript = await transcriptionService.transcribeFromUrl(url, platform)

      if (!transcript) {
        throw new Error('No media content found or transcription failed')
      }

      await job.updateProgress(60)
      console.log(`[Worker] Transcription complete: ${transcript.text.length} chars`)

      // Step 2: Store transcript
      await prisma.aIAnalysis.upsert({
        where: { bookmarkId },
        create: {
          bookmarkId,
          transcript: transcript.text,
          duration: transcript.duration,
          language: transcript.language,
          transcriptionStatus: 'COMPLETED',
        },
        update: {
          transcript: transcript.text,
          duration: transcript.duration,
          language: transcript.language,
          transcriptionStatus: 'COMPLETED',
        }
      })

      await job.updateProgress(80)

      // Step 3: Trigger AI analysis (optional)
      console.log(`[Worker] Triggering AI analysis`)
      await aiProcessor.analyzeBookmark(bookmarkId)

      await job.updateProgress(100)

      return {
        success: true,
        transcriptLength: transcript.text.length,
        duration: transcript.duration,
      }
    } catch (error) {
      console.error(`[Worker] Transcription failed for ${bookmarkId}:`, error)

      // Update status to FAILED
      await prisma.aIAnalysis.upsert({
        where: { bookmarkId },
        create: {
          bookmarkId,
          transcriptionStatus: 'FAILED',
          transcriptionError: error.message,
        },
        update: {
          transcriptionStatus: 'FAILED',
          transcriptionError: error.message,
        }
      })

      throw error
    }
  },
  {
    connection,
    concurrency: 2, // Process 2 videos at a time
    limiter: {
      max: 10, // Max 10 jobs per interval
      duration: 60000, // 1 minute
    },
  }
)

// Event handlers
worker.on('completed', (job) => {
  console.log(`[Worker] ✅ Job ${job.id} completed`)
})

worker.on('failed', (job, err) => {
  console.error(`[Worker] ❌ Job ${job?.id} failed:`, err.message)
})

worker.on('error', (err) => {
  console.error('[Worker] Error:', err)
})

console.log('[Worker] 🚀 Transcription worker started')

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Worker] Shutting down...')
  await worker.close()
  process.exit(0)
})
```

## Job Types

### What Gets Queued?

**Always Queue (>10s operations)**:
- ✅ Video transcription
- ✅ Large file downloads
- ✅ Batch processing (>10 items)
- ✅ GitHub README fetching (many repos)
- ✅ Heavy AI analysis (long documents)

**Never Queue (Fast operations)**:
- ❌ List bookmarks
- ❌ Get single bookmark
- ❌ Create/update records
- ❌ Simple searches
- ❌ Tag assignment

**Sometimes Queue (Depends on size)**:
- ⚠️ Single AI analysis (queue if >5000 chars)
- ⚠️ Platform sync (queue if >50 posts)
- ⚠️ Semantic search (queue if searching 1000+ items)

## Deployment

### Option 1: Railway (Recommended)

**railway.json**:
```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm run build"
  },
  "deploy": {
    "startCommand": "node dist/worker.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Free Tier**: 500 hours/month

### Option 2: Render.com

**render.yaml**:
```yaml
services:
  - type: worker
    name: karakeep-worker
    env: node
    buildCommand: npm install && npm run build
    startCommand: node dist/worker.js
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: REDIS_URL
        sync: false
      - key: OPENAI_API_KEY
        sync: false
```

**Free Tier**: 750 hours/month (enough for 24/7!)

### Option 3: Docker

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .
RUN npm run build

# Run worker only
CMD ["node", "dist/worker.js"]
```

### Environment Variables

```env
# Shared (Vercel + Worker)
DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=sk-ant-...

# Worker only
REDIS_URL=redis://default:xxx@redis.railway.app:6379
OPENAI_API_KEY=sk-proj-...
COBALT_API_URL=https://api.cobalt.tools
```

## Monitoring

### Job Lifecycle

```
PENDING → ACTIVE → COMPLETED
              ↓
           FAILED (can retry)
```

### Progress Tracking

```typescript
// Worker updates progress
await job.updateProgress(10)  // Downloaded
await job.updateProgress(50)  // Transcribing
await job.updateProgress(80)  // Analyzing
await job.updateProgress(100) // Complete
```

### Frontend Polling

```typescript
const pollStatus = async (jobId: string) => {
  const interval = setInterval(async () => {
    const response = await fetch(`/api/transcribe/status/${jobId}`)
    const data = await response.json()

    if (data.state === 'completed') {
      clearInterval(interval)
      showTranscript(data.result)
    }

    updateProgressBar(data.progress)
  }, 2000) // Poll every 2 seconds
}
```

### Logging

```typescript
worker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed in ${job.processedOn - job.timestamp}ms`)
})

worker.on('failed', (job, err) => {
  console.error(`❌ Job ${job.id} failed:`, err.message)
  // Send alert if critical
})
```

## Best Practices

### 1. Immediate Feedback

Always return job ID immediately:

```typescript
return c.json({
  jobId: '123',
  status: 'queued',
  estimatedTime: '2-5 minutes',
  statusUrl: '/api/status/123'
})
```

### 2. Idempotency

Make jobs safe to retry:

```typescript
async function transcribeBookmark(bookmarkId: string) {
  // Check if already done
  const existing = await getTranscript(bookmarkId)
  if (existing) return existing

  // Do the work
  return await doTranscription(bookmarkId)
}
```

### 3. Error Handling

Handle failures gracefully:

```typescript
try {
  await processJob(job)
} catch (error) {
  await markJobFailed(job.id, error.message)
  throw error // Let BullMQ retry
}
```

### 4. Resource Cleanup

Clean up temporary files:

```typescript
try {
  const result = await processVideo(videoPath)
  return result
} finally {
  await fs.unlink(videoPath) // Always cleanup
}
```

### 5. Rate Limiting

Don't overwhelm external APIs:

```typescript
const worker = new Worker('transcription', processFn, {
  connection,
  concurrency: 2, // Only 2 at a time
  limiter: {
    max: 10,        // Max 10 jobs
    duration: 60000 // per minute
  }
})
```

## Cost Analysis

### Free Tier Stack

| Service | Free Tier | Usage |
|---------|-----------|-------|
| Vercel | ✅ Yes | API hosting |
| Render | 750h/mo | Worker (24/7) |
| Upstash Redis | 10K req/day | Job queue |
| Neon PostgreSQL | ✅ Yes | Database |

**Total Infrastructure: $0/month** 🎉

### Paid Stack

| Service | Cost | What For |
|---------|------|----------|
| Vercel Pro | $20/mo | 60s timeout (optional) |
| Railway | $5/mo | 24/7 worker |
| Upstash | $0.20/100K | Extra requests |

**Total: $5-25/month**

## Related Documentation

- [System Design](./system-design.md) - Overall architecture
- [Transcription Overview](../transcription/overview.md) - What gets queued
- [Deployment Workers](../deployment/workers.md) - How to deploy workers
- [Vercel Setup](../deployment/vercel.md) - API deployment

---

[← Back to Index](../README.md) | [Next: Transcription Overview →](../transcription/overview.md)

**Last Updated**: 2025-10-26
