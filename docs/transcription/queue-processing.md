# Queue Processing for Transcription

[← Back to Documentation Index](../README.md)

Complete guide for implementing background queue processing for video transcription in Karakeep.

## Table of Contents

- [Why Queue Processing?](#why-queue-processing)
- [Architecture](#architecture)
- [Setup](#setup)
- [Implementation](#implementation)
- [Deployment](#deployment)
- [Monitoring](#monitoring)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Why Queue Processing?

### The Problem

Vercel serverless functions have strict timeout limits that make direct video transcription impossible:

| Plan | Timeout | Can Process? |
|------|---------|-------------|
| Hobby | 10s | ❌ Nothing |
| Pro | 60s | ❌ Only very short videos |
| Enterprise | 900s | ⚠️ Some videos |

### Typical Video Processing Time

```
5-minute video:
├── Download (Cobalt):     10-30s
├── Transcribe (Whisper):  30-60s
├── AI Analysis (Claude):   2-5s
└── Total:                 42-95s  ❌ TIMEOUT!

15-minute video:
└── Total:                120-270s  ❌ ALWAYS TIMEOUT!
```

### The Solution

Use a **queue-based architecture**:

1. **Vercel API** - Queue jobs immediately (<1s)
2. **Redis Queue** - Store pending jobs
3. **Background Worker** - Process with no timeout
4. **Status API** - Check progress

## Architecture

### Request Flow

```
┌──────────────────────────────────────────────────────────┐
│                     User Request                          │
│            POST /api/transcribe/bookmark-id               │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│              Vercel Serverless Function                   │
│  - Validates request                                      │
│  - Adds job to Redis queue                               │
│  - Returns job ID immediately (<500ms)                    │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│                Redis Queue (Upstash)                      │
│  - Stores job data                                        │
│  - Tracks job status and progress                        │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│           Background Worker (Railway/Render)              │
│  - Picks up jobs from queue                              │
│  - Downloads video (Cobalt) - no timeout!                │
│  - Transcribes audio (Whisper)                           │
│  - Runs AI analysis (Claude)                             │
│  - Stores results in PostgreSQL                          │
│  - Updates job status                                    │
└──────────────────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│                  User Polls Status                        │
│           GET /api/transcribe/status/job-id               │
│  Returns: { state, progress, result }                    │
└──────────────────────────────────────────────────────────┘
```

## Setup

### 1. Install Dependencies

```bash
npm install bullmq ioredis
```

### 2. Setup Redis (Upstash)

1. Go to [Upstash Console](https://console.upstash.com/)
2. Create a new Redis database
3. Copy the connection URL
4. Add to `.env`:

```env
REDIS_URL=redis://default:xxx@xxx.upstash.io:6379
```

### 3. Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# AI Services
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-proj-xxx

# Queue
REDIS_URL=redis://...

# Cobalt
COBALT_API_URL=https://api.cobalt.tools
```

## Implementation

### 1. Queue Configuration

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
    attempts: 3,           // Retry up to 3 times
    backoff: {
      type: 'exponential',
      delay: 5000,         // Start with 5s delay
    },
    removeOnComplete: {
      age: 24 * 3600,      // Keep completed jobs for 24h
      count: 100,          // Keep last 100 jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600,  // Keep failures for 7 days
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

### 2. API Endpoints (Vercel)

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
    select: {
      id: true,
      url: true,
      platform: true,
      accountId: true,
    }
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
    message: 'Transcription queued. Check status endpoint for progress.',
    statusUrl: `/api/transcribe/status/${job.id}`
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
    state,        // 'waiting', 'active', 'completed', 'failed'
    progress,     // 0-100
    failedReason: job.failedReason,
    finishedOn: job.finishedOn,
    returnvalue: job.returnvalue,
  })
})

// Get transcript result
app.get('/transcript/:bookmarkId', async (c) => {
  const bookmarkId = c.req.param('bookmarkId')

  const analysis = await prisma.aIAnalysis.findUnique({
    where: { bookmarkId },
    select: {
      transcript: true,
      duration: true,
      language: true,
      transcriptionStatus: true,
      transcriptionError: true,
    }
  })

  if (!analysis) {
    return c.json({ error: 'No analysis found' }, 404)
  }

  return c.json(analysis)
})

export default app
```

### 3. Background Worker

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
    concurrency: 2,      // Process 2 videos at a time
    limiter: {
      max: 10,           // Max 10 jobs per interval
      duration: 60000,   // 1 minute
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

### 4. Update Prisma Schema

Add status tracking to `prisma/schema.prisma`:

```prisma
enum TranscriptionStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

model AIAnalysis {
  // ... existing fields
  transcript  String?
  duration    Int?
  language    String?

  // Add these fields
  transcriptionStatus  TranscriptionStatus?
  transcriptionJobId   String?
  transcriptionError   String?

  // ... rest of schema
}
```

Run migration:

```bash
npx prisma migrate dev --name add_transcription_status
```

## Deployment

### Option 1: Railway (Free Tier - 500 hours/month)

1. Create `railway.json`:

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

2. Deploy:
```bash
# Connect GitHub repo to Railway
# Set environment variables in Railway dashboard
# Worker starts automatically
```

### Option 2: Render (Free Tier - 750 hours/month)

1. Create `render.yaml`:

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
      - key: ANTHROPIC_API_KEY
        sync: false
      - key: COBALT_API_URL
        value: https://api.cobalt.tools
```

2. Deploy via Render dashboard

### Option 3: Docker

1. Create `Dockerfile.worker`:

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

2. Build and run:

```bash
docker build -f Dockerfile.worker -t karakeep-worker .
docker run -d \
  -e DATABASE_URL=$DATABASE_URL \
  -e REDIS_URL=$REDIS_URL \
  -e OPENAI_API_KEY=$OPENAI_API_KEY \
  -e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
  karakeep-worker
```

### Option 4: Fly.io

1. Create `fly.toml`:

```toml
app = "karakeep-worker"

[build]
  builder = "heroku/buildpacks:20"

[processes]
  worker = "node dist/worker.js"
```

2. Deploy:

```bash
fly launch
fly deploy
```

## Monitoring

### Worker Status Dashboard

```typescript
// src/routes/admin.ts
app.get('/admin/queue/stats', async (c) => {
  const [waiting, active, completed, failed] = await Promise.all([
    transcriptionQueue.getWaitingCount(),
    transcriptionQueue.getActiveCount(),
    transcriptionQueue.getCompletedCount(),
    transcriptionQueue.getFailedCount(),
  ])

  return c.json({
    waiting,
    active,
    completed,
    failed,
    total: waiting + active + completed + failed
  })
})

// Get recent jobs
app.get('/admin/queue/jobs', async (c) => {
  const limit = Number(c.req.query('limit') || '10')

  const [waiting, active, completed, failed] = await Promise.all([
    transcriptionQueue.getWaiting(0, limit),
    transcriptionQueue.getActive(0, limit),
    transcriptionQueue.getCompleted(0, limit),
    transcriptionQueue.getFailed(0, limit),
  ])

  return c.json({
    waiting,
    active,
    completed,
    failed
  })
})
```

### Logging

```typescript
// Worker logging
worker.on('completed', (job) => {
  const duration = job.finishedOn! - job.processedOn!
  console.log(`[Worker] ✅ Job ${job.id} completed in ${duration}ms`)

  // Log to database or external service
  logMetric({
    type: 'job_completed',
    jobId: job.id,
    duration,
    result: job.returnvalue
  })
})

worker.on('failed', (job, err) => {
  console.error(`[Worker] ❌ Job ${job?.id} failed:`, err.message)

  // Alert on critical failures
  if (job?.attemptsMade === job?.opts.attempts) {
    alertAdmin({
      type: 'job_permanently_failed',
      jobId: job.id,
      error: err.message
    })
  }
})

worker.on('progress', (job, progress) => {
  console.log(`[Worker] Job ${job.id} progress: ${progress}%`)
})
```

## Best Practices

### 1. Immediate User Feedback

```typescript
// Always return immediately with job ID
return c.json({
  jobId: '123',
  status: 'queued',
  estimatedTime: '2-5 minutes',
  statusUrl: '/api/status/123',
  message: 'Transcription started. Check status endpoint for updates.'
})
```

### 2. Progress Updates

```typescript
// Update progress regularly in worker
await job.updateProgress(0, 'Downloading video')
await job.updateProgress(30, 'Converting audio')
await job.updateProgress(60, 'Transcribing')
await job.updateProgress(90, 'Analyzing content')
await job.updateProgress(100, 'Complete')
```

### 3. Idempotent Jobs

```typescript
// Make jobs safe to retry
async function transcribeBookmark(bookmarkId: string) {
  // Check if already done
  const existing = await prisma.aIAnalysis.findUnique({
    where: { bookmarkId },
    select: { transcript: true }
  })

  if (existing?.transcript) {
    console.log('Already transcribed, skipping')
    return existing
  }

  // Do the work
  return await doTranscription(bookmarkId)
}
```

### 4. Error Recovery

```typescript
// Handle failures gracefully
try {
  await processJob(job)
} catch (error) {
  // Store error for debugging
  await storeError(job.id, error)

  // Different handling based on error type
  if (error.message.includes('rate limit')) {
    // Don't retry immediately
    throw new Error('RATE_LIMITED')
  } else if (error.message.includes('not found')) {
    // Don't retry
    throw new Error('PERMANENT_FAILURE')
  } else {
    // Retry with backoff
    throw error
  }
}
```

### 5. Resource Cleanup

```typescript
// Always cleanup resources
let audioPath: string | null = null

try {
  audioPath = await downloadAudio(url)
  const transcript = await transcribe(audioPath)
  return transcript
} finally {
  // Cleanup even on error
  if (audioPath) {
    await fs.unlink(audioPath).catch(console.error)
  }
}
```

## Troubleshooting

### Problem: Worker not processing jobs

**Check**:
- Is worker running?
- Is Redis connection valid?
- Are there any errors in worker logs?

**Solution**:
```bash
# Check worker logs
docker logs karakeep-worker

# Restart worker
railway restart
# or
render service restart karakeep-worker
```

### Problem: Jobs stuck in 'active' state

**Cause**: Worker crashed mid-job

**Solution**:
```typescript
// Clean stalled jobs
await transcriptionQueue.clean(5000, 'active')

// Or restart worker
```

### Problem: Too many failed jobs

**Solution**:
```typescript
// Retry failed jobs
const failed = await transcriptionQueue.getFailed()

for (const job of failed) {
  await job.retry()
}

// Or remove old failures
await transcriptionQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed')
```

### Problem: High memory usage

**Solution**:
- Reduce concurrency
- Cleanup completed jobs more aggressively
- Process smaller batches

```typescript
const worker = new Worker('transcription', processJob, {
  connection,
  concurrency: 1,  // Reduce from 2 to 1
  removeOnComplete: {
    age: 3600,     // Keep for 1 hour instead of 24
  }
})
```

## Related Documentation

- [Cobalt Setup](./cobalt-setup.md) - Audio download service
- [Whisper Setup](./whisper-setup.md) - Audio transcription
- [Transcription Overview](./overview.md) - Complete guide
- [Architecture: Queue System](../architecture/queue-system.md) - System design

## References

- [BullMQ Documentation](https://docs.bullmq.io/)
- [Upstash Redis](https://docs.upstash.com/redis)
- [Railway Documentation](https://docs.railway.app/)
- [Render Documentation](https://render.com/docs)

---

**Last Updated**: 2025-10-26
