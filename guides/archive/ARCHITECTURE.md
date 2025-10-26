# Karakeep Architecture Guide

Complete architecture overview addressing Vercel timeout limitations.

## 🏗️ Architecture Overview

Karakeep uses a **hybrid architecture** to work within Vercel's timeout constraints while supporting long-running video transcription:

### Components

1. **Vercel API** (Serverless Functions)
   - Fast HTTP endpoints
   - Queues long-running jobs
   - Returns immediately (<1s response)
   - Timeout: 10s (Hobby) / 60s (Pro)

2. **Redis Queue** (Upstash)
   - Job queue and status tracking
   - Free tier: 10,000 requests/day
   - Persists job data and progress

3. **Background Worker** (Railway/Render)
   - Processes queued jobs
   - **No timeout limits**
   - Can process videos of any length
   - Free tier: 500 hours/month

4. **PostgreSQL** (Neon/Supabase)
   - Shared database for all components
   - Stores bookmarks, transcripts, analysis
   - Free tier available

## ⚡ Request Flow

### Fast Operations (< 10s)

```
User Request
    │
    ▼
Vercel API (responds immediately)
    │
    ▼
PostgreSQL (read/write)
    │
    ▼
Response to User
```

**Examples**:
- List bookmarks
- Get single bookmark
- Create account
- Search (using existing data)
- Tag/categorize existing bookmarks

### Long Operations (> 10s)

```
User Request
    │
    ▼
Vercel API
    │
    ├─> Queue Job in Redis
    │   (returns job ID immediately)
    └─> Response: "Job queued"

Background Worker (separate process)
    │
    ├─> Picks up job from Redis
    ├─> Downloads video (Cobalt)
    ├─> Transcribes (Whisper)
    ├─> Stores in PostgreSQL
    └─> Updates job status

User (polling/webhook)
    │
    └─> Check job status endpoint
```

**Examples**:
- Video transcription (2-10 minutes)
- Large PDF analysis
- Batch processing (100+ bookmarks)
- GitHub README downloads (many repos)

## 📊 Vercel Timeout Problem

### The Issue

| Plan | Timeout | What Breaks |
|------|---------|-------------|
| Hobby | 10s | ❌ ALL video transcription |
| Pro | 60s | ❌ Videos > 3 minutes |
| Enterprise | 900s | ⚠️ Videos > 45 minutes |

### Breakdown for 5-minute video

```
1. Cobalt Download:     10-30s
2. Whisper Transcribe:  30-60s
3. Claude Analysis:     2-5s
4. Database Write:      0.5s
   ──────────────────────────
   Total:               42.5-95.5s  ❌ TIMEOUT on Pro!
```

## ✅ Our Solution: Queue Architecture

### Why This Works

1. **Vercel API** - Only queues jobs (<1s)
2. **Redis** - Stores job data
3. **Worker** - Processes with no timeout
4. **Polling/Webhooks** - User gets updates

### Implementation

#### 1. API Endpoint (Vercel)

```typescript
// src/routes/transcription.ts
app.post('/transcribe/:id', async (c) => {
  const bookmark = await getBookmark(id)

  // Queue the job (fast!)
  const job = await transcriptionQueue.add('transcribe', {
    bookmarkId: bookmark.id,
    url: bookmark.url,
  })

  // Return immediately
  return c.json({
    jobId: job.id,
    status: 'queued',
    checkStatusUrl: `/api/transcribe/status/${job.id}`
  })
})
```

**Response time**: <500ms ✅

#### 2. Worker Process (Railway)

```typescript
// src/worker.ts
const worker = new Worker('transcription', async (job) => {
  const { bookmarkId, url } = job.data

  // This can take minutes - no timeout!
  const transcript = await transcribe(url)

  // Store result
  await saveTranscript(bookmarkId, transcript)
})

worker.process()
```

**Processing time**: Unlimited ✅

#### 3. Status Endpoint (Vercel)

```typescript
app.get('/transcribe/status/:jobId', async (c) => {
  const job = await transcriptionQueue.getJob(jobId)

  return c.json({
    state: job.state, // 'waiting', 'active', 'completed', 'failed'
    progress: job.progress, // 0-100
    result: job.returnvalue,
  })
})
```

## 🚀 Deployment Strategy

### Free Tier Setup

```
┌─────────────────────────────────────────────────┐
│ Vercel (Free)                                   │
│ - API endpoints                                  │
│ - 100GB bandwidth/month                         │
│ - Serverless functions                          │
│ - Custom domain                                 │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Railway (Free - 500 hours/month)                │
│ - Background worker                              │
│ - Always running (uses ~720 hours/month)        │
│ - ⚠️ Will need paid plan for 24/7              │
│ - OR use Render (750 hours/month)              │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Upstash Redis (Free)                            │
│ - 10,000 requests/day                           │
│ - Perfect for job queue                         │
│ - Low latency globally                          │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Neon PostgreSQL (Free)                          │
│ - 3GB storage                                    │
│ - Shared for all components                    │
│ - Auto-pause after inactivity                   │
└─────────────────────────────────────────────────┘
```

### Cost Optimization

**Option 1: Free Tier** (Render instead of Railway)
- Vercel: Free
- Render: 750 hours/month (enough for 24/7!)
- Upstash: Free
- Neon: Free
- **Total Infrastructure: $0/month** ✅

**Option 2: Paid but Cheap**
- Vercel: Free (or $20/mo Pro for 60s timeout)
- Railway: $5/month (24/7 worker)
- Upstash: Free (or $0.20/100K requests)
- Neon: Free (or $19/mo for more storage)
- **Total Infrastructure: $5-25/month**

Plus AI costs:
- Claude: ~$0.20/100 bookmarks
- Whisper: ~$2.40/30 videos
- **Total AI: ~$2.60/month for 100 bookmarks**

**Grand Total: $2.60-28/month** depending on infrastructure choices

## 🔄 Job Queue Details

### Using BullMQ

```typescript
// Queue configuration
const transcriptionQueue = new Queue('transcription', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,           // Retry 3 times
    backoff: {
      type: 'exponential',
      delay: 5000,         // Start with 5s delay
    },
    removeOnComplete: {
      age: 24 * 3600,      // Keep completed jobs for 24h
      count: 100,          // Keep last 100 jobs
    },
  },
})
```

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

User can poll for progress:

```typescript
// Frontend polling
const pollStatus = async (jobId) => {
  const interval = setInterval(async () => {
    const status = await fetch(`/api/transcribe/status/${jobId}`)
    const data = await status.json()

    if (data.state === 'completed') {
      clearInterval(interval)
      showTranscript(data.result)
    }

    updateProgressBar(data.progress)
  }, 2000) // Poll every 2 seconds
}
```

## 📦 What Gets Queued?

### Always Queue (>10s operations)

✅ Video transcription
✅ Large file downloads
✅ Batch processing (>10 items)
✅ GitHub README fetching (many repos)
✅ Heavy AI analysis (long documents)

### Never Queue (Fast operations)

❌ List bookmarks
❌ Get single bookmark
❌ Create/update records
❌ Simple searches
❌ Tag assignment

### Sometimes Queue (Depends on size)

⚠️ Single AI analysis (usually fast, queue if >5000 chars)
⚠️ Platform sync (queue if >50 posts)
⚠️ Semantic search (usually fast, queue if searching 1000+ items)

## 🎯 Best Practices

### 1. Immediate Feedback

Always return immediately with job ID:

```typescript
return c.json({
  jobId: '123',
  status: 'queued',
  estimatedTime: '2-5 minutes',
  statusUrl: '/api/status/123'
})
```

### 2. Progress Updates

Update progress regularly:

```typescript
await job.updateProgress(0, 'Downloading video')
await job.updateProgress(30, 'Converting audio')
await job.updateProgress(60, 'Transcribing')
await job.updateProgress(90, 'Analyzing content')
await job.updateProgress(100, 'Complete')
```

### 3. Error Handling

Handle failures gracefully:

```typescript
try {
  await processJob(job)
} catch (error) {
  // Store error for user to see
  await markJobFailed(job.id, error.message)
  throw error // Let BullMQ retry if configured
}
```

### 4. Idempotency

Make jobs idempotent (safe to retry):

```typescript
async function transcribeBookmark(bookmarkId) {
  // Check if already done
  const existing = await getTranscript(bookmarkId)
  if (existing) return existing

  // Do the work
  return await doTranscription(bookmarkId)
}
```

### 5. Monitoring

Log everything:

```typescript
worker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed in ${job.processedOn - job.timestamp}ms`)
})

worker.on('failed', (job, err) => {
  console.error(`❌ Job ${job.id} failed:`, err.message)
  // Alert if critical
})
```

## 🔍 Debugging

### Check Queue Status

```bash
# Using BullMQ CLI
npm install -g bullmq-cli
bullmq-cli -u $REDIS_URL

# Or Redis CLI
redis-cli -u $REDIS_URL
> KEYS bull:transcription:*
> HGETALL bull:transcription:123
```

### Common Issues

**Problem**: Worker not processing jobs
**Solution**: Check Redis connection, restart worker

**Problem**: Jobs stuck in 'active' state
**Solution**: Worker crashed mid-job, restart worker

**Problem**: Too many failed jobs
**Solution**: Check error logs, fix underlying issue, retry failed jobs

## 📚 References

- [BullMQ Documentation](https://docs.bullmq.io/)
- [Vercel Timeouts](https://vercel.com/docs/functions/serverless-functions/runtimes#max-duration)
- [Railway Documentation](https://docs.railway.app/)
- [Upstash Redis](https://docs.upstash.com/redis)

---

**This architecture allows Karakeep to handle videos of ANY length while staying within Vercel's free tier!** 🎉
