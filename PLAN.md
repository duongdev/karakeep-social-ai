# Karakeep Social AI - Implementation Plan

## Project Overview
A personal bookmark manager that auto-syncs saved posts from multiple social platforms (X, Reddit, YouTube, TikTok, Dribbble, Instagram, Facebook), with AI-powered summarization, categorization, and intelligent search using Claude.

## Core Requirements
- **User**: Single user (you) with support for multiple accounts per platform
- **Sync Methods**: Scheduled cron jobs, manual triggers, and real-time webhooks where available
- **AI**: Claude API for summarization, categorization, and Q&A (extensible for other models)
- **Database**: PostgreSQL
- **Backend**: Hono API
- **Deployment**: Vercel (primary) or Docker (fallback)
- **Extensibility**: Easy addition of new social platforms

## Architecture Overview

### Tech Stack
```
Frontend (Future):
├── React/Next.js (optional web UI)
└── Browser Extension (Chrome/Firefox)

Backend:
├── Hono API (TypeScript)
├── PostgreSQL (Vercel Postgres/Neon/Supabase)
├── Prisma ORM (database access & migrations)
├── Vercel Cron (scheduled sync)
├── Claude API (Anthropic)
├── OpenAI Whisper API (audio/video transcription)
├── Cobalt API (video/audio download - better than yt-dlp)
└── Zod (validation)

Infrastructure:
├── Vercel (serverless API - queues jobs only)
├── Railway/Render (background workers - transcription)
├── Upstash Redis (job queue - required for video transcription)
└── Docker (alternative deployment)
```

### System Architecture

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

**Key Points**:
- ✅ Vercel API: Fast endpoints, queues heavy tasks
- ✅ Redis Queue: Reliable job distribution
- ✅ Background Worker: No timeouts, processes videos of any length
- ✅ Same PostgreSQL: Shared database for all components
- ✅ All can be free tier: Vercel + Railway + Upstash

## Phase 1: Foundation (Week 1-2)

### 1.1 Project Setup
- [ ] Initialize Hono TypeScript project
- [ ] Setup Prisma ORM with PostgreSQL
- [ ] Configure environment variables
- [ ] Setup Vercel deployment config
- [ ] Create Dockerfile for alternative deployment

### 1.2 Prisma Schema

Create `prisma/schema.prisma`:

```prisma
// This is your Prisma schema file

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Account {
  id            String    @id @default(uuid())
  platform      String    // 'twitter', 'reddit', etc.
  username      String?
  authType      String    // 'token', 'cookie', 'oauth'
  credentials   Json      // encrypted tokens/cookies
  isActive      Boolean   @default(true)
  lastSyncedAt  DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  bookmarks     Bookmark[]
  syncJobs      SyncJob[]

  @@map("accounts")
}

model Bookmark {
  id              String    @id @default(uuid())
  accountId       String
  platform        String
  platformPostId  String
  url             String
  title           String?
  content         String?   // post text/description
  authorName      String?
  authorUrl       String?
  mediaUrls       Json?     // array of images, videos
  metadata        Json?     // platform-specific data
  savedAt         DateTime? // when saved on platform
  syncedAt        DateTime  @default(now())
  createdAt       DateTime  @default(now())

  account         Account   @relation(fields: [accountId], references: [id])
  aiAnalysis      AIAnalysis?
  lists           BookmarkList[]
  tags            BookmarkTag[]

  @@unique([platform, platformPostId, accountId])
  @@index([accountId])
  @@index([platform])
  @@index([savedAt])
  @@map("bookmarks")
}

model AIAnalysis {
  id          String    @id @default(uuid())
  bookmarkId  String    @unique
  summary     String?
  keyPoints   Json?     // array of key takeaways
  topics      Json?     // array of detected topics
  sentiment   String?   // positive, negative, neutral
  language    String?
  transcript  String?   // full transcript for video/audio content
  duration    Int?      // duration in seconds for video/audio
  analyzedAt  DateTime  @default(now())
  modelUsed   String    @default("claude-3-5-sonnet")

  bookmark    Bookmark  @relation(fields: [bookmarkId], references: [id], onDelete: Cascade)

  @@index([bookmarkId])
  @@map("ai_analysis")
}

model List {
  id          String    @id @default(uuid())
  name        String
  description String?
  color       String?   // hex color
  icon        String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  bookmarks   BookmarkList[]

  @@map("lists")
}

model Tag {
  id          String    @id @default(uuid())
  name        String    @unique
  color       String?
  createdAt   DateTime  @default(now())

  bookmarks   BookmarkTag[]

  @@map("tags")
}

model BookmarkList {
  bookmarkId  String
  listId      String
  addedAt     DateTime  @default(now())

  bookmark    Bookmark  @relation(fields: [bookmarkId], references: [id], onDelete: Cascade)
  list        List      @relation(fields: [listId], references: [id], onDelete: Cascade)

  @@id([bookmarkId, listId])
  @@map("bookmark_lists")
}

model BookmarkTag {
  bookmarkId  String
  tagId       String
  confidence  Float?    // AI confidence score (0-1)
  addedAt     DateTime  @default(now())

  bookmark    Bookmark  @relation(fields: [bookmarkId], references: [id], onDelete: Cascade)
  tag         Tag       @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([bookmarkId, tagId])
  @@index([tagId])
  @@map("bookmark_tags")
}

enum SyncStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
}

enum TriggerType {
  CRON
  MANUAL
  WEBHOOK
}

model SyncJob {
  id            String      @id @default(uuid())
  accountId     String?
  status        SyncStatus  @default(PENDING)
  triggerType   TriggerType
  itemsSynced   Int         @default(0)
  errorMessage  String?
  startedAt     DateTime?
  completedAt   DateTime?
  createdAt     DateTime    @default(now())

  account       Account?    @relation(fields: [accountId], references: [id])

  @@map("sync_jobs")
}
```

### 1.3 Prisma Client Setup

Create `src/lib/db.ts` for Prisma Client initialization:

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

Example Hono route using Prisma:

```typescript
import { Hono } from 'hono'
import { prisma } from './lib/db'

const app = new Hono()

// Get all bookmarks with pagination
app.get('/api/bookmarks', async (c) => {
  const page = Number(c.req.query('page') ?? '1')
  const limit = Number(c.req.query('limit') ?? '20')
  const platform = c.req.query('platform')

  const bookmarks = await prisma.bookmark.findMany({
    where: platform ? { platform } : undefined,
    include: {
      account: true,
      aiAnalysis: true,
      tags: {
        include: {
          tag: true
        }
      },
      lists: {
        include: {
          list: true
        }
      }
    },
    skip: (page - 1) * limit,
    take: limit,
    orderBy: {
      savedAt: 'desc'
    }
  })

  const total = await prisma.bookmark.count({
    where: platform ? { platform } : undefined
  })

  return c.json({
    bookmarks,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  })
})

// Create new bookmark
app.post('/api/bookmarks', async (c) => {
  const body = await c.req.json()

  const bookmark = await prisma.bookmark.create({
    data: {
      accountId: body.accountId,
      platform: body.platform,
      platformPostId: body.platformPostId,
      url: body.url,
      title: body.title,
      content: body.content,
      authorName: body.authorName,
      authorUrl: body.authorUrl,
      mediaUrls: body.mediaUrls,
      metadata: body.metadata,
      savedAt: body.savedAt ? new Date(body.savedAt) : null
    },
    include: {
      account: true
    }
  })

  return c.json(bookmark, 201)
})

export default app
```

### 1.4 Core API Endpoints
```
POST   /api/accounts                    # Add platform account
GET    /api/accounts                    # List all accounts
PUT    /api/accounts/:id                # Update account
DELETE /api/accounts/:id                # Remove account

POST   /api/sync/trigger                # Manually trigger sync
GET    /api/sync/status                 # Check sync status
GET    /api/sync/history                # Sync job history

GET    /api/bookmarks                   # List bookmarks (paginated, filtered)
GET    /api/bookmarks/:id               # Get single bookmark
DELETE /api/bookmarks/:id               # Delete bookmark
PUT    /api/bookmarks/:id/lists         # Add to lists
PUT    /api/bookmarks/:id/tags          # Add tags

POST   /api/lists                       # Create list
GET    /api/lists                       # Get all lists
PUT    /api/lists/:id                   # Update list
DELETE /api/lists/:id                   # Delete list

POST   /api/tags                        # Create tag
GET    /api/tags                        # Get all tags

POST   /api/chat                        # Ask Claude about bookmarks
POST   /api/search                      # Semantic search with Claude
```

## Phase 2: Platform Adapters (Week 3-4)

### 2.1 Adapter Interface
Create a standardized interface for all platform adapters:

```typescript
interface PlatformAdapter {
  platform: string;
  authenticate(credentials: any): Promise<boolean>;
  fetchSavedPosts(since?: Date): Promise<Post[]>;
  validateCredentials(): Promise<boolean>;
  getSupportedAuthTypes(): AuthType[];
}

interface Post {
  platformPostId: string;
  url: string;
  title?: string;
  content: string;
  authorName: string;
  authorUrl: string;
  mediaUrls: string[];
  savedAt: Date;
  metadata: Record<string, any>;
}
```

### 2.2 Platform Implementation Priority
1. **X (Twitter)** - Start here
   - Auth: Bearer token or cookie-based
   - API: Twitter API v2 (bookmarks endpoint) or scraping
   - Webhook: Not available (poll only)

2. **Reddit**
   - Auth: OAuth2 or personal API token
   - API: Reddit API (saved posts endpoint)
   - Webhook: Not available (poll only)

3. **YouTube**
   - Auth: OAuth2 (Google)
   - API: YouTube Data API (liked videos, playlists)
   - Webhook: PubSubHubbub (optional)

4. **TikTok**
   - Auth: Cookie-based or API token
   - API: TikTok API (favorites) or scraping
   - Webhook: Not available

5. **Dribbble**
   - Auth: OAuth2 or API token
   - API: Dribbble API (likes)
   - Webhook: Not available

6. **Instagram**
   - Auth: Cookie-based (API restricted)
   - API: Unofficial API or scraping
   - Webhook: Not available

7. **Facebook**
   - Auth: OAuth2 (Graph API)
   - API: Graph API (saved posts)
   - Webhook: Not available

8. **GitHub** - Stars & saved repos
   - Auth: Personal Access Token (PAT) or OAuth2
   - API: GitHub REST API (starred repos)
   - Webhook: Available (star events)
   - Features:
     - Sync starred repositories
     - Track repository metadata (language, stars, topics)
     - Detect updates to starred repos
     - Categorize by programming language
     - Extract README content for better search

### 2.3 Adapter Implementation Structure
```
src/adapters/
├── base.ts              # Base adapter interface
├── twitter/
│   ├── adapter.ts
│   ├── api-client.ts
│   └── types.ts
├── reddit/
│   ├── adapter.ts
│   └── api-client.ts
├── youtube/
│   ├── adapter.ts
│   └── api-client.ts
└── registry.ts          # Adapter factory/registry
```

## Phase 3: Sync Engine (Week 5)

### 3.1 Sync Orchestrator
```typescript
class SyncOrchestrator {
  async syncAccount(accountId: string, triggerType: string): Promise<void>
  async syncAllAccounts(): Promise<void>
  async processSyncJob(jobId: string): Promise<void>
}
```

### 3.2 Vercel Cron Configuration
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "0 */6 * * *"  // Every 6 hours
    }
  ]
}
```

### 3.3 Sync Flow
```
1. Create sync job record (status: pending)
2. For each active account:
   a. Get last_synced_at timestamp
   b. Fetch new saved posts since last sync
   c. Deduplicate against existing bookmarks
   d. Insert new bookmarks
   e. Queue for AI processing
   f. Update last_synced_at
3. Update sync job (status: completed)
4. Log metrics (items synced, duration, errors)
```

### 3.4 Error Handling & Retries
- Exponential backoff for rate limits
- Skip failing accounts, continue with others
- Log detailed error messages
- Alert on repeated failures

## Phase 4: AI Processing (Week 6-7)

### 4.1 AI Processor Service
```typescript
class AIProcessor {
  async analyzeBookmark(bookmarkId: string): Promise<AIAnalysis>
  async categorizeBookmarks(bookmarkIds: string[]): Promise<void>
  async suggestTags(content: string): Promise<Tag[]>
  async batchProcess(bookmarkIds: string[]): Promise<void>
}
```

### 4.2 Claude Integration
**API**: Anthropic Claude API (claude-3-5-sonnet-20241022)

**Use Cases**:
1. **Summarization**: Generate concise summaries of posts
2. **Key Points Extraction**: Extract main takeaways
3. **Topic Detection**: Identify topics/themes
4. **Auto-tagging**: Suggest relevant tags
5. **Categorization**: Assign to lists based on content
6. **Sentiment Analysis**: Detect sentiment/tone
7. **Q&A**: Answer questions about bookmarks
8. **Semantic Search**: Find relevant bookmarks

### 4.3 Prompt Templates
```typescript
const PROMPTS = {
  summarize: `Analyze this social media post and provide:
1. A concise 2-3 sentence summary
2. 3-5 key points or takeaways
3. Primary topic/category
4. Sentiment (positive/negative/neutral)
5. Suggested tags (3-5 relevant tags)

Post: {content}`,

  categorize: `Given these existing lists: {lists}
And this post: {content}
Which list(s) should this post belong to? Return list IDs.`,

  search: `User query: {query}
Based on my bookmarks, find the most relevant posts and explain why.`,

  qa: `Answer this question based on my saved bookmarks: {question}
Bookmarks context: {context}`
};
```

### 4.4 AI Processing Pipeline

```
1. New bookmark inserted → Queue for AI processing
2. Check if video/audio content:
   a. If yes: Download media → Transcribe → Extract content
   b. If no: Use existing text content
3. Batch processing (every 10 bookmarks or 5 minutes)
4. Call Claude API with bookmark content/transcript
5. Parse response and extract:
   - Summary
   - Key points
   - Topics
   - Suggested tags
   - Sentiment
6. Store in ai_analysis table (including transcript if applicable)
7. Auto-create tags if needed
8. Auto-assign to lists based on rules
```

### 4.5 Video/Audio Transcription

**Supported Platforms**:
- YouTube (videos, shorts)
- TikTok (videos)
- Twitter/X (video tweets)
- Instagram (reels, videos)
- Reddit (video posts)

**Transcription Flow**:

```
1. Detect media type from platform and URL
2. Download audio using Cobalt API:
   - Request audio-only mode (saves bandwidth)
   - Supports YouTube, TikTok, Instagram, Twitter, Reddit, etc.
   - No system dependencies (pure HTTP API)
   - Max 25MB file size (Whisper API limit)
3. Upload to OpenAI Whisper API
4. Receive transcript with timestamps
5. Store transcript in ai_analysis table
6. Use transcript + title for Claude analysis
7. Clean up downloaded files
```

**Why Cobalt over yt-dlp?**
- ✅ No system dependencies (works on Vercel)
- ✅ Better platform support
- ✅ Active maintenance
- ✅ Simple HTTP API
- ✅ Can use public API or self-host

**Implementation Details**:

```typescript
// Media detection
function isMediaContent(bookmark: Bookmark): boolean {
  const mediaPatterns = [
    /youtube\.com\/watch/,
    /youtu\.be\//,
    /youtube\.com\/shorts/,
    /tiktok\.com\/@.*\/video/,
    /twitter\.com\/.*\/status\/.*\/video/,
    /instagram\.com\/(reel|p)\//,
    /reddit\.com\/.*\/comments\/.*\/.*\//
  ]

  return mediaPatterns.some(pattern => pattern.test(bookmark.url))
}

// Download & transcribe
async function transcribeMedia(url: string): Promise<Transcript> {
  // 1. Download audio using yt-dlp
  const audioPath = await downloadAudio(url)

  // 2. Check file size
  const stats = await fs.stat(audioPath)
  if (stats.size > 25 * 1024 * 1024) {
    throw new Error('File too large for Whisper API (>25MB)')
  }

  // 3. Transcribe with Whisper
  const transcript = await openai.audio.transcriptions.create({
    file: fs.createReadStream(audioPath),
    model: 'whisper-1',
    language: 'en', // or auto-detect
    response_format: 'verbose_json', // includes timestamps
  })

  // 4. Cleanup
  await fs.unlink(audioPath)

  return {
    text: transcript.text,
    duration: transcript.duration,
    language: transcript.language,
    segments: transcript.segments // with timestamps
  }
}
```

**Cost Estimates**:
- Whisper API: $0.006 per minute of audio
- Average video: 5-10 minutes = $0.03-$0.06
- 100 videos/month = $3-$6/month

### 4.6 Cost Optimization
- Cache AI responses (don't re-analyze unchanged content)
- Batch similar requests
- Use Claude Haiku for simple tasks (future)
- Implement request quotas/limits
- Store intermediate results

## Phase 5: Search & Q&A (Week 8)

### 5.1 Search Capabilities
1. **Keyword Search**: PostgreSQL full-text search
2. **Semantic Search**: Claude-powered contextual search
3. **Filters**: Platform, date range, tags, lists, author
4. **Sorting**: Relevance, date, engagement

### 5.2 Q&A System
```typescript
interface ChatRequest {
  query: string;
  filters?: {
    platforms?: string[];
    dateRange?: { start: Date; end: Date };
    tags?: string[];
    lists?: string[];
  };
  conversationId?: string; // For follow-up questions
}

interface ChatResponse {
  answer: string;
  relevantBookmarks: Bookmark[];
  sources: { bookmarkId: string; excerpt: string }[];
}
```

### 5.3 RAG (Retrieval Augmented Generation)
```
1. User asks question
2. Convert query to semantic representation
3. Search relevant bookmarks (top 10-20)
4. Construct prompt with:
   - User question
   - Relevant bookmark content
   - Bookmark metadata (source, date, tags)
5. Send to Claude
6. Return answer with citations
```

## Phase 6: API Finalization (Week 9)

### 6.1 Authentication & Security
- API key authentication (for personal use)
- Environment variable for master API key
- Rate limiting (Vercel KV or Upstash)
- Input validation with Zod
- SQL injection prevention (parameterized queries)
- Encrypt credentials in database

### 6.2 Deployment Configuration

**Vercel**:
```json
// vercel.json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": null,
  "outputDirectory": "dist",
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "0 */6 * * *"
    }
  ],
  "env": {
    "DATABASE_URL": "@database-url",
    "ANTHROPIC_API_KEY": "@anthropic-api-key",
    "API_KEY": "@api-key"
  }
}
```

**Docker**:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### 6.3 Environment Variables
```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/karakeep

# AI
ANTHROPIC_API_KEY=sk-ant-xxx

# API Security
API_KEY=your-secret-key

# Optional
REDIS_URL=redis://...
SENTRY_DSN=https://...
```

## Phase 7: Extension & Future Features (Week 10+)

### 7.1 Easy Platform Addition
Create a platform generator/template:
```bash
npm run generate:platform <platform-name>
```

This creates:
- `src/adapters/<platform>/adapter.ts` (template)
- `src/adapters/<platform>/types.ts`
- Test files
- Documentation

### 7.2 Browser Extension (Future)
- Chrome/Firefox extension
- One-click save from any platform
- Background sync without API limits
- Offline reading

### 7.3 Advanced AI Features (Future)
- Multi-model support (GPT, Gemini, local LLMs)
- Custom prompts/rules per list
- AI-powered list creation
- Duplicate detection
- Related posts suggestions
- Automatic archiving of old/irrelevant posts

### 7.4 Web UI (Future)
- Next.js dashboard
- Visual bookmark grid/list
- Tag cloud
- Analytics (saved posts over time, top sources)
- Search interface
- Chat interface for Q&A

## Implementation Checklist

### Week 1-2: Foundation
- [ ] Setup Hono project with TypeScript
- [ ] Install and configure Prisma ORM
- [ ] Create Prisma schema (see section 1.2)
- [ ] Setup local PostgreSQL or cloud database (Neon/Supabase/Vercel)
- [ ] Run initial Prisma migration
- [ ] Generate Prisma Client
- [ ] Implement core CRUD endpoints using Prisma
- [ ] Add authentication middleware
- [ ] Test local deployment
- [ ] Test Prisma Studio for database management

### Week 3-4: First Platform Adapter
- [ ] Implement Twitter/X adapter
- [ ] Test authentication
- [ ] Test fetching saved posts
- [ ] Implement deduplication logic
- [ ] Add Reddit adapter
- [ ] Create adapter registry

### Week 5: Sync Engine
- [ ] Build sync orchestrator
- [ ] Implement manual sync endpoint
- [ ] Setup Vercel cron job
- [ ] Add sync job tracking
- [ ] Test sync with multiple accounts

### Week 6-7: AI Integration
- [ ] Setup Claude API client
- [ ] Implement summarization
- [ ] Implement tagging
- [ ] Implement categorization
- [ ] Create batch processing queue
- [ ] Test AI responses

### Week 8: Search & Q&A
- [ ] Implement keyword search
- [ ] Implement semantic search with Claude
- [ ] Build Q&A endpoint
- [ ] Test RAG pipeline
- [ ] Add conversation history

### Week 9: Deployment
- [ ] Configure Vercel deployment
- [ ] Setup environment variables
- [ ] Test cron jobs on Vercel
- [ ] Create Dockerfile
- [ ] Document deployment process
- [ ] Setup monitoring/logging

### Week 10+: Additional Platforms
- [ ] Add YouTube adapter
- [ ] Add TikTok adapter
- [ ] Add remaining platforms
- [ ] Create platform generator tool

## Technical Considerations

### Rate Limits
- Twitter: 300 requests/15min (API v2 Free)
- Reddit: 60 requests/min
- YouTube: 10,000 units/day
- Claude API: 50 req/min (Tier 1)

**Strategy**:
- Implement exponential backoff
- Cache responses
- Use batch processing
- Sync less frequently for rate-limited platforms

### Vercel Limitations
- Serverless function timeout: 10s (hobby), 60s (pro)
- Cron jobs: Limited on hobby plan
- Cold starts: Acceptable for cron jobs

**Mitigation**:
- Break long sync jobs into chunks
- Use async processing
- Consider Vercel Pro if needed
- Docker as backup deployment

### Cost Estimates

**Monthly Costs (100 bookmarks: 50 text, 30 videos, 20 GitHub repos)**:

| Service | Free Tier | Usage | Cost |
|---------|-----------|-------|------|
| Vercel | ✅ Yes | API hosting | **$0** |
| Railway | ✅ 500h/mo | Worker (always-on) | **$0** |
| Upstash Redis | ✅ 10K req/day | Job queue | **$0** |
| Neon/Supabase | ✅ Yes | PostgreSQL | **$0** |
| Claude API | ❌ Pay-per-use | 100 analyses | **$0.20** |
| Whisper API | ❌ Pay-per-use | 30 videos × 8min | **$2.40** |
| Cobalt API | ✅ Free | Video downloads | **$0** |
| GitHub API | ✅ Free | Repo metadata | **$0** |
| **Total** | | | **~$2.60/mo** 🎉 |

**Scaling Costs**:
- 500 bookmarks/mo (150 videos): ~$13/mo
- 1000 bookmarks/mo (300 videos): ~$26/mo
- Need paid tiers only at high scale (1000+ bookmarks/mo)

## Documentation Structure
```
docs/
├── API.md                    # API documentation
├── DEPLOYMENT.md             # Deployment guides
├── ADAPTERS.md               # Platform adapter guide
├── AI_PROMPTS.md             # Prompt engineering guide
└── DEVELOPMENT.md            # Local development setup
```

## Success Metrics
- Sync reliability: 99% success rate
- AI processing: <5 seconds per bookmark
- Search latency: <2 seconds
- Platform coverage: 7+ platforms by week 10
- Time to add new platform: <4 hours

## Future Enhancements
1. Mobile app (React Native)
2. Public sharing of curated lists
3. Collaborative lists
4. Export to Notion/Obsidian
5. Email digest of new bookmarks
6. Integration with read-it-later apps
7. Full-text content archiving
8. AI-powered reading recommendations
9. Cross-platform duplicate detection
10. Advanced analytics dashboard

## Getting Started

### Initial Setup Commands

```bash
# 1. Initialize project
npm init -y
npm install hono @hono/node-server
npm install -D typescript @types/node tsx

# 2. Setup Prisma ORM
npm install prisma @prisma/client
npm install -D prisma
npx prisma init

# Edit prisma/schema.prisma (use schema from section 1.2)

# Generate Prisma Client
npx prisma generate

# Create and run migrations
npx prisma migrate dev --name init

# 3. Setup Claude API
npm install @anthropic-ai/sdk

# 4. Additional dependencies
npm install zod               # Schema validation
npm install dotenv            # Environment variables
npm install @vercel/postgres  # Vercel Postgres (if using)

# 5. Development
npm run dev

# 6. Prisma Studio (Database GUI)
npx prisma studio

# 7. Deploy to Vercel
npm install -g vercel
vercel
```

### Prisma Useful Commands

```bash
# Generate Prisma Client after schema changes
npx prisma generate

# Create a new migration
npx prisma migrate dev --name <migration-name>

# Apply migrations in production
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio

# Pull database schema into Prisma schema
npx prisma db pull

# Push schema changes without creating migrations (development only)
npx prisma db push

# Seed database
npx prisma db seed
```

---

## Notes

### Why Prisma?
- **Type Safety**: Full TypeScript support with auto-generated types
- **Developer Experience**: Intuitive API, excellent autocomplete
- **Migrations**: Built-in migration system with version control
- **Prisma Studio**: Visual database browser and editor
- **Performance**: Optimized queries with connection pooling
- **Vercel Integration**: First-class support for Vercel deployments
- **Active Development**: Large community and regular updates

### Development Tips
- Start with Twitter/X and Reddit as proof of concept
- Focus on core sync + AI features first
- UI can come later
- Prioritize reliability over features
- Document everything for future platforms
- Keep adapters loosely coupled
- Use feature flags for new platforms
- Use Prisma Studio for debugging database issues
- Always run `npx prisma generate` after schema changes
- Use transactions for complex multi-table operations
