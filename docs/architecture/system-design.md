# System Design

**Last Updated:** 2025-10-26

Complete architecture overview for Karakeep Social AI.

## Navigation

- [Database Schema](./database-schema.md)
- [Queue System](./queue-system.md)
- [Quick Start](../planning/quick-start.md)
- [Deployment](../deployment/vercel.md)

---

## Overview

Karakeep is a personal bookmark manager that auto-syncs saved posts from multiple social platforms with AI-powered analysis, categorization, and intelligent search using Claude.

### Core Requirements

- **User**: Single user with support for multiple accounts per platform
- **Sync Methods**: Scheduled cron jobs, manual triggers, and real-time webhooks
- **AI**: Claude API for summarization and Q&A (extensible for other models)
- **Database**: PostgreSQL with Prisma ORM
- **Backend**: Hono API (TypeScript)
- **Deployment**: Vercel (API) + Railway/Render (workers)
- **Extensibility**: Easy addition of new social platforms

---

## Tech Stack

```
Frontend (Future):
├── React/Next.js (web UI)
└── Browser Extension (Chrome/Firefox)

Backend:
├── Hono API (TypeScript)
├── PostgreSQL (Neon/Supabase/Vercel Postgres)
├── Prisma ORM (database access & migrations)
├── Vercel Cron (scheduled sync)
├── Claude API (Anthropic)
├── OpenAI Whisper API (audio/video transcription)
├── Cobalt API (video/audio download)
└── Zod (validation)

Infrastructure:
├── Vercel (serverless API - queues jobs only)
├── Railway/Render (background workers - transcription)
├── Upstash Redis (job queue - required for video transcription)
└── Docker (alternative deployment)
```

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Social Platforms                      │
│  X │ Reddit │ YouTube │ TikTok │ Dribbble │ IG │ FB │ GH│
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│              Platform Adapters Layer                     │
│  (Fetch saved posts via API/scraping)                   │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│            Hono API Server (Vercel)                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ Sync Engine │  │ AI Processor │  │ Search/Query   │ │
│  │  (Cron)     │  │  (Claude)    │  │  (Claude)      │ │
│  └─────────────┘  └──────────────┘  └────────────────┘ │
│                                                           │
│  ⚠️ Timeout: 10s (Hobby) / 60s (Pro)                    │
│  ✅ Queues long-running jobs to Redis                   │
└──────────────┬──────────────────────────────────────────┘
               │
               ├─────────────────────────────┐
               │                             │
               ▼                             ▼
┌──────────────────────────┐  ┌──────────────────────────────┐
│  PostgreSQL Database     │  │   Redis Queue (Upstash)      │
│  ├── accounts            │  │   - Transcription jobs       │
│  ├── bookmarks           │  │   - Heavy processing tasks   │
│  ├── ai_analysis         │  └──────────┬───────────────────┘
│  ├── tags/lists          │             │
│  └── sync_jobs           │             ▼
└──────────────────────────┘  ┌──────────────────────────────┐
                              │  Background Worker           │
                              │  (Railway/Render/Docker)     │
                              │                              │
                              │  ┌────────────────────────┐  │
                              │  │ Video Transcription    │  │
                              │  │ - Cobalt download      │  │
                              │  │ - Whisper API          │  │
                              │  │ - No timeout limits!   │  │
                              │  └────────────────────────┘  │
                              │                              │
                              │  ┌────────────────────────┐  │
                              │  │ Heavy AI Processing    │  │
                              │  │ - Batch analysis       │  │
                              │  │ - Large documents      │  │
                              │  └────────────────────────┘  │
                              └──────────────────────────────┘
```

### Key Points

- ✅ **Vercel API**: Fast endpoints, queues heavy tasks
- ✅ **Redis Queue**: Reliable job distribution
- ✅ **Background Worker**: No timeouts, processes videos of any length
- ✅ **Same PostgreSQL**: Shared database for all components
- ✅ **All can be free tier**: Vercel + Railway + Upstash

---

## Component Details

### 1. API Server (Hono on Vercel)

**Responsibilities:**
- Handle HTTP requests
- Authenticate requests
- Queue long-running jobs
- Return immediate responses

**Endpoints:**
```
POST   /api/accounts                  # Add platform account
GET    /api/accounts                  # List accounts
POST   /api/sync/trigger              # Trigger sync
GET    /api/bookmarks                 # List bookmarks
POST   /api/ai/analyze/:id            # Queue AI analysis
POST   /api/ai/search                 # Semantic search
POST   /api/ai/chat                   # Q&A system
```

**Constraints:**
- 10-second timeout (Hobby plan)
- 60-second timeout (Pro plan)
- Must queue anything longer

### 2. Platform Adapters

**Base Interface:**
```typescript
interface PlatformAdapter {
  platform: string
  authenticate(credentials: any): Promise<boolean>
  fetchSavedPosts(since?: Date): Promise<Post[]>
  validateCredentials(): Promise<boolean>
  getSupportedAuthTypes(): AuthType[]
}
```

**Implementations:**
- Twitter/X
- Reddit
- YouTube
- TikTok
- GitHub
- Dribbble
- Instagram
- Facebook

See [Platform Architecture](../platforms/adapter-architecture.md) for details.

### 3. Sync Engine

**Orchestrates** bookmark synchronization:

```typescript
class SyncOrchestrator {
  async syncAccount(accountId: string): Promise<void> {
    // 1. Get adapter for platform
    // 2. Fetch new saved posts
    // 3. Deduplicate
    // 4. Insert bookmarks
    // 5. Queue AI analysis
    // 6. Update last_synced_at
  }

  async syncAllAccounts(): Promise<void> {
    // Sync all active accounts in parallel
  }
}
```

**Triggers:**
- Vercel Cron (every 6 hours)
- Manual API call
- Webhooks (where available)

### 4. AI Processor

**Uses Claude API** for analysis:

```typescript
class AIProcessor {
  async analyzeBookmark(bookmarkId: string): Promise<AIAnalysis> {
    // 1. Fetch bookmark
    // 2. Check if video (transcribe if needed)
    // 3. Prepare content for Claude
    // 4. Call Claude API
    // 5. Parse response
    // 6. Store analysis
    // 7. Auto-assign tags
  }

  async categorizeToLists(bookmarkId: string): Promise<string[]> {
    // Assign bookmark to appropriate lists
  }

  async batchProcess(bookmarkIds: string[]): Promise<void> {
    // Process multiple bookmarks efficiently
  }
}
```

See [Claude Integration](../ai/claude-setup.md) for details.

### 5. Transcription Service

**Downloads and transcribes** video/audio:

```typescript
class TranscriptionService {
  async transcribeFromUrl(url: string, platform: string): Promise<Transcript> {
    // 1. Detect if media content
    // 2. Download audio (Cobalt API)
    // 3. Transcribe (Whisper API)
    // 4. Return transcript
    // 5. Cleanup files
  }
}
```

**Runs in background worker** due to long processing time (2-10 minutes).

See [Transcription Guide](../transcription/overview.md) for details.

### 6. Search & Q&A

**Semantic search** using Claude:

```typescript
class SearchService {
  async search(query: string, limit: number): Promise<SearchResult[]> {
    // 1. Get recent bookmarks
    // 2. Prepare context for Claude
    // 3. Ask Claude to rank relevance
    // 4. Return ranked results
  }
}

class QAService {
  async ask(question: string, filters?: Filters): Promise<Answer> {
    // 1. Retrieve relevant bookmarks (RAG)
    // 2. Construct context
    // 3. Ask Claude
    // 4. Return answer with citations
  }
}
```

See [Semantic Search](../ai/semantic-search.md) for details.

### 7. Background Worker

**Processes queued jobs** without timeout limits:

```typescript
const worker = new Worker('transcription', async (job) => {
  const { bookmarkId, url, platform } = job.data

  // Download and transcribe (can take minutes)
  const transcript = await transcriptionService.transcribeFromUrl(url, platform)

  // Store result
  await prisma.aIAnalysis.upsert({
    where: { bookmarkId },
    create: {
      bookmarkId,
      transcript: transcript.text,
      duration: transcript.duration,
      language: transcript.language,
    },
    update: { /* ... */ }
  })
})
```

See [Queue System](./queue-system.md) for details.

---

## Data Flow

### Bookmark Sync Flow

```
1. Cron triggers /api/cron/sync
2. SyncOrchestrator gets all active accounts
3. For each account:
   a. Get platform adapter
   b. Fetch saved posts since last_synced_at
   c. For each post:
      - Check if already exists (dedup)
      - Insert/update bookmark
      - Queue AI analysis if new
   d. Update account.last_synced_at
4. Return sync summary
```

### AI Analysis Flow

```
1. User saves bookmark OR auto-sync creates bookmark
2. Detect if media content
3. If video/audio:
   a. Queue transcription job → Background worker
   b. Worker downloads audio (Cobalt)
   c. Worker transcribes (Whisper)
   d. Worker stores transcript
4. Queue AI analysis with transcript
5. AI Processor:
   a. Prepare content (text + transcript)
   b. Call Claude API
   c. Parse response
   d. Store analysis (summary, key points, topics, sentiment)
   e. Auto-create and assign tags
   f. Auto-assign to lists
6. Return analysis result
```

### Search Flow

```
1. User sends search query
2. SearchService fetches recent bookmarks with AI analysis
3. Prepare context (bookmarks + summaries)
4. Ask Claude to rank by relevance
5. Claude returns indices and reasons
6. Return ranked bookmarks to user
```

### Q&A Flow (RAG)

```
1. User asks question
2. QAService retrieves relevant bookmarks (filters applied)
3. Prepare context:
   - Bookmark summaries
   - Transcripts
   - Key points
   - Topics
4. Construct prompt:
   - Context
   - User question
   - Instructions (cite sources)
5. Call Claude
6. Parse response
7. Extract cited URLs
8. Return answer with sources
```

---

## Database Schema

### Core Models

```prisma
model Account {
  id            String    @id @default(uuid())
  platform      String
  username      String?
  authType      String
  credentials   Json
  isActive      Boolean   @default(true)
  lastSyncedAt  DateTime?
  bookmarks     Bookmark[]
}

model Bookmark {
  id              String    @id @default(uuid())
  platform        String
  platformPostId  String
  url             String
  title           String?
  content         String?
  authorName      String?
  savedAt         DateTime?

  aiAnalysis      AIAnalysis?
  tags            BookmarkTag[]
  lists           BookmarkList[]
}

model AIAnalysis {
  id          String   @id @default(uuid())
  bookmarkId  String   @unique
  summary     String?
  keyPoints   Json?
  topics      Json?
  sentiment   String?
  transcript  String?
  duration    Int?
}
```

See [Database Schema](./database-schema.md) for complete reference.

---

## Deployment Architecture

### Production Setup

```
┌─────────────────────────────────┐
│         Vercel                   │
│  - API endpoints                 │
│  - Cron jobs                     │
│  - Environment variables         │
│  - Custom domain                 │
└─────────────────────────────────┘
         │
         ├──────────────────┐
         │                  │
         ▼                  ▼
┌──────────────┐  ┌──────────────────┐
│ Neon/        │  │ Upstash Redis    │
│ Supabase     │  │ - Job queue      │
│ PostgreSQL   │  │ - Job status     │
└──────────────┘  └─────────┬────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │ Railway/Render   │
                  │ - Worker process │
                  │ - Always running │
                  └──────────────────┘
```

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# AI
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...

# Queue (for workers)
REDIS_URL=redis://...

# API Security
API_KEY=your-secret-key

# Optional
SENTRY_DSN=https://...
COBALT_API_URL=https://api.cobalt.tools
```

See [Deployment Guide](../deployment/vercel.md) for step-by-step instructions.

---

## Scalability Considerations

### Horizontal Scaling

**API (Vercel):**
- Auto-scales serverless functions
- No configuration needed
- Pay only for usage

**Workers:**
- Add more worker instances
- Configure concurrency
- Use load balancing

**Database:**
- Connection pooling (Prisma)
- Read replicas for heavy load
- Indexes on frequently queried fields

### Vertical Scaling

**Database:**
- Upgrade to larger instance
- More storage
- Better CPU/RAM

**Workers:**
- Increase concurrency
- Larger instance size
- More memory

### Performance Optimization

1. **Caching**
   - Cache AI analysis results
   - Cache search results (short-lived)
   - Redis for session data

2. **Database**
   - Proper indexes
   - Connection pooling
   - Efficient queries

3. **API**
   - Response compression
   - CDN for static assets
   - Edge caching

---

## Security

### API Authentication

```typescript
// API key middleware
app.use('*', async (c, next) => {
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '')

  if (apiKey !== process.env.API_KEY) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  await next()
})
```

### Credential Encryption

```typescript
// Encrypt sensitive credentials
import { encrypt, decrypt } from '@/lib/crypto'

const encryptedCredentials = encrypt(credentials)

await prisma.account.create({
  data: {
    credentials: encryptedCredentials
  }
})
```

### Input Validation

```typescript
import { z } from 'zod'

const CreateAccountSchema = z.object({
  platform: z.string(),
  username: z.string().optional(),
  authType: z.enum(['token', 'cookie', 'oauth']),
  credentials: z.object({}).passthrough()
})

app.post('/api/accounts', async (c) => {
  const body = await c.req.json()
  const validated = CreateAccountSchema.parse(body)
  // ...
})
```

---

## Monitoring & Logging

### Error Tracking (Sentry)

```typescript
import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
})

app.onError((err, c) => {
  Sentry.captureException(err)
  return c.json({ error: 'Internal server error' }, 500)
})
```

### Usage Metrics

```typescript
// Track AI usage
await prisma.apiUsage.create({
  data: {
    model: 'claude-3-5-sonnet',
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cost: calculateCost(usage),
  }
})
```

### Health Checks

```typescript
app.get('/health', async (c) => {
  // Check database
  await prisma.$queryRaw`SELECT 1`

  // Check Redis
  await redis.ping()

  return c.json({ status: 'ok' })
})
```

---

## Related Documentation

- [Quick Start Guide](../planning/quick-start.md) - Get started
- [Roadmap](../planning/roadmap.md) - Implementation plan
- [Database Schema](./database-schema.md) - Complete schema
- [Queue System](./queue-system.md) - Background processing
- [Platform Adapters](../platforms/adapter-architecture.md) - Adapter guide
- [Deployment](../deployment/vercel.md) - Production setup

---

**This architecture enables Karakeep to handle unlimited bookmarks while staying on free tiers!**
