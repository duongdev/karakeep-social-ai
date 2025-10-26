# Database Schema

> Complete database schema documentation for Karakeep using Prisma ORM with PostgreSQL

[← Back to Documentation Index](../README.md) | [Architecture Overview](./system-design.md) →

## Contents

- [Overview](#overview)
- [Schema Diagram](#schema-diagram)
- [Models](#models)
- [Relationships](#relationships)
- [Indexes](#indexes)
- [Enums](#enums)
- [Usage Examples](#usage-examples)
- [Migrations](#migrations)

## Overview

Karakeep uses **Prisma ORM** with **PostgreSQL** for type-safe database access and migrations. The schema is designed to support:

- Multiple social platform accounts per user
- Bookmarks with rich metadata
- AI analysis and transcription
- Tags and lists for organization
- Sync job tracking

## Schema Diagram

```
┌─────────────┐
│  Account    │──┐
└─────────────┘  │
                 │ 1:N
                 ▼
┌─────────────┐  ┌──────────────┐
│  SyncJob    │  │   Bookmark   │
└─────────────┘  └──────────────┘
                        │
         ┌──────────────┼──────────────┐
         │              │              │
         ▼              ▼              ▼
┌──────────────┐ ┌────────────┐ ┌────────────┐
│ AIAnalysis   │ │BookmarkList│ │BookmarkTag │
└──────────────┘ └────────────┘ └────────────┘
                        │              │
                        ▼              ▼
                  ┌─────────┐    ┌─────────┐
                  │  List   │    │   Tag   │
                  └─────────┘    └─────────┘
```

## Models

### Account

Stores authentication credentials for social platform accounts.

```prisma
model Account {
  id            String    @id @default(uuid())
  platform      String    // 'twitter', 'reddit', 'github', etc.
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
```

**Fields Explained**:
- `platform`: Social platform identifier (twitter, reddit, youtube, github, etc.)
- `authType`: Authentication method (token, cookie, oauth)
- `credentials`: JSON object storing encrypted API keys, tokens, or cookies
- `isActive`: Whether to include this account in syncs
- `lastSyncedAt`: Last successful sync timestamp for incremental syncing

### Bookmark

Core model storing saved posts/repos from all platforms.

```prisma
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
```

**Fields Explained**:
- `platformPostId`: Platform's native ID (tweet ID, repo ID, etc.)
- `content`: Post text, README content, video description, etc.
- `mediaUrls`: Array of image/video URLs in JSON format
- `metadata`: Platform-specific fields (stars, topics, language for GitHub, etc.)
- `savedAt`: When the user saved/starred the content on the platform
- `syncedAt`: When we fetched it into Karakeep

**Unique Constraint**: Ensures we don't duplicate the same post from the same account.

### AIAnalysis

Stores Claude AI analysis results and video transcripts.

```prisma
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
```

**Fields Explained**:
- `summary`: 2-3 sentence AI-generated summary
- `keyPoints`: JSON array of main takeaways
- `topics`: JSON array of detected topics/themes
- `transcript`: Full text from video/audio transcription (Whisper API)
- `duration`: Video/audio length in seconds
- `modelUsed`: Which AI model generated this analysis

### List

User-created collections for organizing bookmarks.

```prisma
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
```

**Use Cases**:
- "Design Inspiration"
- "Python Projects"
- "Tutorials to Watch"
- "Research Papers"

### Tag

Labels for categorizing bookmarks.

```prisma
model Tag {
  id          String    @id @default(uuid())
  name        String    @unique
  color       String?
  createdAt   DateTime  @default(now())

  bookmarks   BookmarkTag[]

  @@map("tags")
}
```

**Use Cases**:
- Auto-generated from AI: "machine-learning", "react", "design"
- User-created: "read-later", "important"

### BookmarkList

Join table for many-to-many relationship between bookmarks and lists.

```prisma
model BookmarkList {
  bookmarkId  String
  listId      String
  addedAt     DateTime  @default(now())

  bookmark    Bookmark  @relation(fields: [bookmarkId], references: [id], onDelete: Cascade)
  list        List      @relation(fields: [listId], references: [id], onDelete: Cascade)

  @@id([bookmarkId, listId])
  @@map("bookmark_lists")
}
```

### BookmarkTag

Join table for many-to-many relationship between bookmarks and tags.

```prisma
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
```

**Fields Explained**:
- `confidence`: AI's confidence in this tag (0.0 to 1.0)
  - User-added tags: null or 1.0
  - AI-suggested tags: 0.6 to 0.95

### SyncJob

Tracks sync operations and their status.

```prisma
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

**Use Cases**:
- Track progress of scheduled syncs
- Debug sync failures
- Monitor sync performance

## Enums

### SyncStatus

```prisma
enum SyncStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
}
```

### TriggerType

```prisma
enum TriggerType {
  CRON      // Scheduled automatic sync
  MANUAL    // User-triggered sync
  WEBHOOK   // Real-time webhook (if available)
}
```

## Relationships

### One-to-Many

- `Account` → `Bookmark`: One account has many bookmarks
- `Account` → `SyncJob`: One account has many sync jobs
- `Bookmark` → `AIAnalysis`: One bookmark has one analysis (1:1)

### Many-to-Many

- `Bookmark` ↔ `List`: Through `BookmarkList`
- `Bookmark` ↔ `Tag`: Through `BookmarkTag`

## Indexes

Performance-critical indexes:

```prisma
// On Bookmark
@@index([accountId])    // Filter by account
@@index([platform])     // Filter by platform
@@index([savedAt])      // Sort by save date

// On BookmarkTag
@@index([tagId])        // Find all bookmarks with a tag

// On AIAnalysis
@@index([bookmarkId])   // Quick lookup of analysis
```

## Usage Examples

### Prisma Client Setup

```typescript
// src/lib/db.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

### Create Account

```typescript
const account = await prisma.account.create({
  data: {
    platform: 'twitter',
    username: 'johndoe',
    authType: 'token',
    credentials: {
      token: 'encrypted-token-here'
    }
  }
})
```

### Create Bookmark with Relations

```typescript
const bookmark = await prisma.bookmark.create({
  data: {
    accountId: account.id,
    platform: 'twitter',
    platformPostId: '1234567890',
    url: 'https://twitter.com/user/status/1234567890',
    title: 'Tweet title',
    content: 'Tweet content here...',
    authorName: 'John Doe',
    authorUrl: 'https://twitter.com/johndoe',
    savedAt: new Date(),

    // Create AI analysis at the same time
    aiAnalysis: {
      create: {
        summary: 'AI-generated summary',
        topics: ['tech', 'ai'],
        sentiment: 'positive',
        language: 'en',
        modelUsed: 'claude-3-5-sonnet'
      }
    }
  },
  include: {
    aiAnalysis: true
  }
})
```

### Query with Relations

```typescript
// Get bookmarks with all related data
const bookmarks = await prisma.bookmark.findMany({
  where: {
    platform: 'github',
    tags: {
      some: {
        tag: {
          name: 'typescript'
        }
      }
    }
  },
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
  orderBy: {
    savedAt: 'desc'
  },
  take: 20
})
```

### Pagination

```typescript
const page = 1
const limit = 20

const [bookmarks, total] = await Promise.all([
  prisma.bookmark.findMany({
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { savedAt: 'desc' }
  }),
  prisma.bookmark.count()
])

return {
  bookmarks,
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit)
  }
}
```

### Update with Upsert

```typescript
// Update or create bookmark
await prisma.bookmark.upsert({
  where: {
    platform_platformPostId_accountId: {
      platform: 'github',
      platformPostId: '12345',
      accountId: account.id
    }
  },
  create: {
    // Create data
    accountId: account.id,
    platform: 'github',
    platformPostId: '12345',
    url: 'https://github.com/user/repo',
    // ...
  },
  update: {
    // Update data
    title: 'Updated title',
    syncedAt: new Date()
  }
})
```

## Migrations

### Useful Commands

```bash
# Generate Prisma Client after schema changes
npx prisma generate

# Create a new migration
npx prisma migrate dev --name add_transcription_fields

# Apply migrations in production
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset

# Open Prisma Studio (database GUI)
npx prisma studio

# Pull database schema into Prisma schema
npx prisma db pull

# Push schema changes without creating migrations (dev only)
npx prisma db push
```

### Migration Workflow

1. **Update schema**: Edit `prisma/schema.prisma`
2. **Generate migration**: `npx prisma migrate dev --name descriptive_name`
3. **Review migration**: Check `prisma/migrations/` folder
4. **Test locally**: Verify changes work
5. **Deploy to production**: `npx prisma migrate deploy`

### Example Migration

Adding transcription status tracking:

```prisma
// Before
model AIAnalysis {
  id         String  @id
  transcript String?
  // ...
}

// After
model AIAnalysis {
  id                   String               @id
  transcript           String?
  transcriptionStatus  TranscriptionStatus?
  transcriptionJobId   String?
  transcriptionError   String?
  // ...
}

enum TranscriptionStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}
```

Generate migration:
```bash
npx prisma migrate dev --name add_transcription_status
```

## Why Prisma?

✅ **Type Safety**: Auto-generated TypeScript types
✅ **Developer Experience**: Intuitive API, great autocomplete
✅ **Migrations**: Built-in migration system with version control
✅ **Prisma Studio**: Visual database browser and editor
✅ **Performance**: Optimized queries with connection pooling
✅ **Vercel Integration**: First-class support for Vercel deployments
✅ **Active Development**: Large community and regular updates

## Related Documentation

- [System Design](./system-design.md) - Overall architecture
- [Queue System](./queue-system.md) - Background job processing
- [API Endpoints](../api/endpoints.md) - How to query the database via API
- [Platform Adapters](../platforms/adapter-architecture.md) - How platforms use this schema

---

[← Back to Index](../README.md) | [Next: Queue System →](./queue-system.md)

**Last Updated**: 2025-10-26
