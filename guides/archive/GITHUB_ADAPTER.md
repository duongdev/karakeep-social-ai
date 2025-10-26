# GitHub Stars Adapter

Complete implementation guide for syncing GitHub starred repositories into Karakeep.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Authentication](#authentication)
- [Implementation](#implementation)
- [Data Schema](#data-schema)
- [Sync Strategy](#sync-strategy)
- [API Endpoints](#api-endpoints)
- [Cost & Rate Limits](#cost--rate-limits)
- [Best Practices](#best-practices)

## Overview

The GitHub adapter syncs your starred repositories, allowing you to:

- **Search** starred repos with AI-powered semantic search
- **Categorize** repos by language, topic, or framework
- **Track updates** to starred repositories
- **Discover patterns** in what you star
- **Search README content** for better discoverability

## Features

### Core Features

✅ **Sync Starred Repos**: Automatically fetch all starred repositories
✅ **README Extraction**: Pull README content for full-text search
✅ **Metadata Tracking**: Language, topics, stars, forks, last update
✅ **Incremental Sync**: Only fetch new stars since last sync
✅ **Update Detection**: Track when starred repos get updates
✅ **Auto-categorization**: Group by language, framework, topic
✅ **Webhook Support**: Real-time sync when you star a repo

### Advanced Features

🚀 **Trending Detection**: Identify rapidly growing repos you've starred
🚀 **Duplicate Detection**: Find similar repos in your stars
🚀 **Recommendation Engine**: Suggest related repos based on your stars
🚀 **Changelog Tracking**: Monitor releases and updates
🚀 **Dependency Analysis**: Track dependencies of starred projects

## Authentication

### Option 1: Personal Access Token (Recommended)

1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Select scopes:
   - ✅ `public_repo` (for public repos only)
   - ✅ `repo` (if you have private starred repos)
   - ✅ `user:email` (optional, for user info)
4. Generate and copy the token

### Option 2: OAuth2 Flow

For web UI authentication:

```typescript
const oauth = {
  client_id: process.env.GITHUB_CLIENT_ID,
  client_secret: process.env.GITHUB_CLIENT_SECRET,
  redirect_uri: 'https://your-app.com/auth/github/callback',
  scope: 'public_repo user:email'
}
```

## Implementation

### 1. Install GitHub SDK

```bash
npm install @octokit/rest
npm install @octokit/webhooks  # For webhook support
```

### 2. GitHub Client Setup

Create `src/lib/github.ts`:

```typescript
import { Octokit } from '@octokit/rest'

export function createGitHubClient(token: string): Octokit {
  return new Octokit({
    auth: token,
    userAgent: 'Karakeep v1.0.0',
    timeZone: 'UTC',
  })
}

// Rate limit check
export async function checkRateLimit(octokit: Octokit) {
  const { data } = await octokit.rateLimit.get()

  return {
    limit: data.rate.limit,
    remaining: data.rate.remaining,
    reset: new Date(data.rate.reset * 1000)
  }
}
```

### 3. GitHub Adapter

Create `src/adapters/github/adapter.ts`:

```typescript
import { Octokit } from '@octokit/rest'
import { createGitHubClient, checkRateLimit } from '@/lib/github'

export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  html_url: string
  description: string | null
  language: string | null
  stargazers_count: number
  forks_count: number
  topics: string[]
  created_at: string
  updated_at: string
  pushed_at: string
  owner: {
    login: string
    avatar_url: string
  }
  license: {
    name: string
    spdx_id: string
  } | null
  homepage: string | null
  archived: boolean
  default_branch: string
}

export class GitHubAdapter {
  private octokit: Octokit
  private username: string

  constructor(token: string, username: string) {
    this.octokit = createGitHubClient(token)
    this.username = username
  }

  /**
   * Fetch all starred repositories
   */
  async fetchStarredRepos(since?: Date): Promise<GitHubRepo[]> {
    const repos: GitHubRepo[] = []
    let page = 1
    const perPage = 100

    while (true) {
      const { data } = await this.octokit.activity.listReposStarredByUser({
        username: this.username,
        per_page: perPage,
        page,
        sort: 'created',  // Sort by when you starred it
        direction: 'desc',
      })

      if (data.length === 0) break

      for (const repo of data) {
        // If we have a 'since' date, stop when we reach older stars
        if (since && new Date(repo.starred_at!) < since) {
          return repos
        }

        repos.push(repo as GitHubRepo)
      }

      // Check if there are more pages
      if (data.length < perPage) break

      page++

      // Rate limiting: wait between requests
      await this.sleep(100)
    }

    return repos
  }

  /**
   * Fetch README content for a repository
   */
  async fetchReadme(owner: string, repo: string): Promise<string | null> {
    try {
      const { data } = await this.octokit.repos.getReadme({
        owner,
        repo,
      })

      // Decode base64 content
      const content = Buffer.from(data.content, 'base64').toString('utf-8')
      return content
    } catch (error) {
      // README not found
      if (error.status === 404) {
        return null
      }
      throw error
    }
  }

  /**
   * Fetch repository topics
   */
  async fetchTopics(owner: string, repo: string): Promise<string[]> {
    try {
      const { data } = await this.octokit.repos.getAllTopics({
        owner,
        repo,
      })

      return data.names
    } catch {
      return []
    }
  }

  /**
   * Fetch latest release
   */
  async fetchLatestRelease(owner: string, repo: string) {
    try {
      const { data } = await this.octokit.repos.getLatestRelease({
        owner,
        repo,
      })

      return {
        tag_name: data.tag_name,
        name: data.name,
        body: data.body,
        published_at: data.published_at,
        html_url: data.html_url,
      }
    } catch {
      return null
    }
  }

  /**
   * Get authenticated user info
   */
  async getAuthenticatedUser() {
    const { data } = await this.octokit.users.getAuthenticated()

    return {
      id: data.id,
      login: data.login,
      name: data.name,
      email: data.email,
      avatar_url: data.avatar_url,
    }
  }

  /**
   * Validate token and get rate limit info
   */
  async validateToken(): Promise<boolean> {
    try {
      await this.getAuthenticatedUser()
      return true
    } catch {
      return false
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
```

### 4. Sync Service

Create `src/services/github-sync.ts`:

```typescript
import { GitHubAdapter } from '@/adapters/github/adapter'
import { prisma } from '@/lib/db'

export class GitHubSyncService {
  private adapter: GitHubAdapter

  constructor(token: string, username: string) {
    this.adapter = new GitHubAdapter(token, username)
  }

  /**
   * Sync all starred repositories
   */
  async syncStarredRepos(accountId: string): Promise<{
    synced: number
    newRepos: number
    updated: number
  }> {
    // Get last sync time
    const account = await prisma.account.findUnique({
      where: { id: accountId }
    })

    const since = account?.lastSyncedAt || undefined

    // Fetch starred repos
    const repos = await this.adapter.fetchStarredRepos(since)

    let newRepos = 0
    let updated = 0

    for (const repo of repos) {
      const [owner, repoName] = repo.full_name.split('/')

      // Check if already exists
      const existing = await prisma.bookmark.findUnique({
        where: {
          platform_platformPostId_accountId: {
            platform: 'github',
            platformPostId: repo.id.toString(),
            accountId
          }
        }
      })

      // Fetch README for new repos
      let readme: string | null = null
      if (!existing) {
        readme = await this.adapter.fetchReadme(owner, repoName)
      }

      const bookmarkData = {
        url: repo.html_url,
        title: repo.full_name,
        content: readme || repo.description || '',
        authorName: repo.owner.login,
        authorUrl: `https://github.com/${repo.owner.login}`,
        mediaUrls: repo.owner.avatar_url ? [repo.owner.avatar_url] : [],
        savedAt: new Date(repo.created_at),
        metadata: {
          language: repo.language,
          topics: repo.topics,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          license: repo.license?.name,
          homepage: repo.homepage,
          archived: repo.archived,
          default_branch: repo.default_branch,
          last_updated: repo.updated_at,
          last_pushed: repo.pushed_at,
        }
      }

      if (existing) {
        // Update existing
        await prisma.bookmark.update({
          where: { id: existing.id },
          data: {
            ...bookmarkData,
            syncedAt: new Date()
          }
        })
        updated++
      } else {
        // Create new
        await prisma.bookmark.create({
          data: {
            accountId,
            platform: 'github',
            platformPostId: repo.id.toString(),
            ...bookmarkData,
          }
        })
        newRepos++
      }

      // Rate limiting
      await this.sleep(100)
    }

    // Update last synced time
    await prisma.account.update({
      where: { id: accountId },
      data: { lastSyncedAt: new Date() }
    })

    return {
      synced: repos.length,
      newRepos,
      updated
    }
  }

  /**
   * Sync README for existing bookmarks without content
   */
  async syncReadmes(accountId: string): Promise<number> {
    const bookmarks = await prisma.bookmark.findMany({
      where: {
        accountId,
        platform: 'github',
        OR: [
          { content: null },
          { content: '' }
        ]
      }
    })

    let synced = 0

    for (const bookmark of bookmarks) {
      const [owner, repo] = bookmark.title!.split('/')

      try {
        const readme = await this.adapter.fetchReadme(owner, repo)

        if (readme) {
          await prisma.bookmark.update({
            where: { id: bookmark.id },
            data: { content: readme }
          })
          synced++
        }
      } catch (error) {
        console.error(`Failed to fetch README for ${bookmark.title}:`, error)
      }

      await this.sleep(200)  // Be nice to GitHub API
    }

    return synced
  }

  /**
   * Check for updates to starred repos
   */
  async checkForUpdates(accountId: string): Promise<{
    updated: string[]
    newReleases: string[]
  }> {
    const bookmarks = await prisma.bookmark.findMany({
      where: {
        accountId,
        platform: 'github'
      }
    })

    const updated: string[] = []
    const newReleases: string[] = []

    for (const bookmark of bookmarks) {
      const [owner, repo] = bookmark.title!.split('/')
      const lastPushed = bookmark.metadata?.last_pushed

      // Fetch current repo data
      const repos = await this.adapter.fetchStarredRepos()
      const current = repos.find(r => r.id.toString() === bookmark.platformPostId)

      if (!current) continue

      // Check if repo was updated
      if (lastPushed && current.pushed_at > lastPushed) {
        updated.push(bookmark.title!)

        // Update bookmark
        await prisma.bookmark.update({
          where: { id: bookmark.id },
          data: {
            metadata: {
              ...bookmark.metadata,
              last_pushed: current.pushed_at,
              stars: current.stargazers_count,
              forks: current.forks_count,
            }
          }
        })
      }

      // Check for new releases
      const release = await this.adapter.fetchLatestRelease(owner, repo)
      if (release && (!bookmark.metadata?.latest_release || release.published_at > bookmark.metadata.latest_release)) {
        newReleases.push(bookmark.title!)

        await prisma.bookmark.update({
          where: { id: bookmark.id },
          data: {
            metadata: {
              ...bookmark.metadata,
              latest_release: release.published_at,
              latest_release_tag: release.tag_name,
            }
          }
        })
      }

      await this.sleep(200)
    }

    return { updated, newReleases }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
```

## Data Schema

No schema changes needed! GitHub repos are stored as regular bookmarks:

```typescript
{
  platform: 'github',
  platformPostId: '12345',  // Repo ID
  url: 'https://github.com/owner/repo',
  title: 'owner/repo',
  content: '# README content...',  // Full README
  authorName: 'owner',
  authorUrl: 'https://github.com/owner',
  metadata: {
    language: 'TypeScript',
    topics: ['react', 'ui', 'components'],
    stars: 15000,
    forks: 1200,
    license: 'MIT',
    homepage: 'https://example.com',
    archived: false,
    default_branch: 'main',
    last_updated: '2024-01-15T10:00:00Z',
    last_pushed: '2024-01-20T15:30:00Z',
    latest_release: '2024-01-18T12:00:00Z',
    latest_release_tag: 'v2.0.0'
  }
}
```

## Sync Strategy

### Initial Sync

```typescript
// Full sync of all starred repos
const service = new GitHubSyncService(token, username)
await service.syncStarredRepos(accountId)
```

### Incremental Sync

```typescript
// Only fetch new stars since last sync
// Automatically handled by checking account.lastSyncedAt
await service.syncStarredRepos(accountId)
```

### Scheduled Sync (Cron)

```typescript
// Run daily to catch new stars and updates
cron.schedule('0 2 * * *', async () => {  // 2 AM daily
  const githubAccounts = await prisma.account.findMany({
    where: { platform: 'github', isActive: true }
  })

  for (const account of githubAccounts) {
    const credentials = account.credentials as { token: string; username: string }
    const service = new GitHubSyncService(credentials.token, credentials.username)

    await service.syncStarredRepos(account.id)
    await service.checkForUpdates(account.id)
  }
})
```

### Webhook Integration (Real-time)

```typescript
import { Webhooks } from '@octokit/webhooks'

const webhooks = new Webhooks({
  secret: process.env.GITHUB_WEBHOOK_SECRET!,
})

// Listen for star events
webhooks.on('star.created', async ({ payload }) => {
  const repo = payload.repository
  const user = payload.sender

  // Find user's account
  const account = await prisma.account.findFirst({
    where: {
      platform: 'github',
      username: user.login
    }
  })

  if (!account) return

  // Create bookmark immediately
  await prisma.bookmark.create({
    data: {
      accountId: account.id,
      platform: 'github',
      platformPostId: repo.id.toString(),
      url: repo.html_url,
      title: repo.full_name,
      content: repo.description,
      authorName: repo.owner.login,
      authorUrl: repo.owner.html_url,
      metadata: {
        language: repo.language,
        topics: repo.topics,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
      }
    }
  })

  // Queue README fetch and AI analysis
  await queueJob('fetch-readme', { bookmarkId: bookmark.id })
  await queueJob('ai-analysis', { bookmarkId: bookmark.id })
})
```

## API Endpoints

### Sync Endpoints

```typescript
// src/routes/github.ts
import { Hono } from 'hono'
import { GitHubSyncService } from '@/services/github-sync'

const app = new Hono()

// Trigger manual sync
app.post('/sync/:accountId', async (c) => {
  const accountId = c.req.param('accountId')

  const account = await prisma.account.findUnique({
    where: { id: accountId }
  })

  if (!account || account.platform !== 'github') {
    return c.json({ error: 'Invalid GitHub account' }, 404)
  }

  const credentials = account.credentials as { token: string; username: string }
  const service = new GitHubSyncService(credentials.token, credentials.username)

  const result = await service.syncStarredRepos(accountId)

  return c.json({
    success: true,
    ...result
  })
})

// Sync READMEs
app.post('/sync-readmes/:accountId', async (c) => {
  const accountId = c.req.param('accountId')

  const account = await prisma.account.findUnique({
    where: { id: accountId }
  })

  if (!account || account.platform !== 'github') {
    return c.json({ error: 'Invalid GitHub account' }, 404)
  }

  const credentials = account.credentials as { token: string; username: string }
  const service = new GitHubSyncService(credentials.token, credentials.username)

  const synced = await service.syncReadmes(accountId)

  return c.json({
    success: true,
    synced
  })
})

// Check for updates
app.post('/check-updates/:accountId', async (c) => {
  const accountId = c.req.param('accountId')

  const account = await prisma.account.findUnique({
    where: { id: accountId }
  })

  if (!account || account.platform !== 'github') {
    return c.json({ error: 'Invalid GitHub account' }, 404)
  }

  const credentials = account.credentials as { token: string; username: string }
  const service = new GitHubSyncService(credentials.token, credentials.username)

  const updates = await service.checkForUpdates(accountId)

  return c.json({
    success: true,
    ...updates
  })
})

// Webhook endpoint
app.post('/webhook', async (c) => {
  const signature = c.req.header('X-Hub-Signature-256')
  const payload = await c.req.text()

  // Verify webhook signature
  const webhooks = new Webhooks({
    secret: process.env.GITHUB_WEBHOOK_SECRET!,
  })

  const verified = await webhooks.verify(payload, signature!)

  if (!verified) {
    return c.json({ error: 'Invalid signature' }, 401)
  }

  // Process webhook
  await webhooks.receive({
    id: c.req.header('X-GitHub-Delivery')!,
    name: c.req.header('X-GitHub-Event')! as any,
    payload: JSON.parse(payload)
  })

  return c.json({ success: true })
})

export default app
```

## Cost & Rate Limits

### GitHub API Rate Limits

**Authenticated Requests**:
- 5,000 requests/hour
- ~83 requests/minute

**Unauthenticated**:
- 60 requests/hour (don't use)

### Typical Usage

| Action | API Calls | Time (at 100ms/call) |
|--------|-----------|---------------------|
| Sync 100 stars | 2-3 | ~0.2-0.3 seconds |
| Sync 500 stars | 5-6 | ~0.5-0.6 seconds |
| Sync 1000 stars | 10-11 | ~1-1.1 seconds |
| Fetch 100 READMEs | 100 | ~10 seconds |
| Check updates (100 repos) | 200 | ~20 seconds |

### Cost Estimate

GitHub API is **FREE** ✅

- No API costs
- Only costs: Claude AI analysis (~$0.002 per repo)
- 1000 repos = ~$2 for AI analysis

## Best Practices

### 1. Incremental Syncs

Only sync new stars:

```typescript
// Store last sync time
const since = account.lastSyncedAt

// GitHub API supports 'since' parameter
const repos = await octokit.activity.listReposStarredByUser({
  username,
  since: since?.toISOString(),
})
```

### 2. README Caching

Don't re-fetch READMEs unnecessarily:

```typescript
// Only fetch if content is empty
if (!bookmark.content) {
  const readme = await adapter.fetchReadme(owner, repo)
  await updateBookmark({ content: readme })
}
```

### 3. Rate Limit Handling

```typescript
async function withRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (error.status === 403 && error.message.includes('rate limit')) {
      const resetTime = new Date(error.response.headers['x-ratelimit-reset'] * 1000)
      const waitTime = resetTime.getTime() - Date.now()

      console.log(`Rate limited. Waiting ${waitTime}ms until ${resetTime}`)
      await sleep(waitTime)

      return await fn()  // Retry
    }
    throw error
  }
}
```

### 4. Batch Processing

Process repos in batches:

```typescript
const BATCH_SIZE = 10

for (let i = 0; i < repos.length; i += BATCH_SIZE) {
  const batch = repos.slice(i, i + BATCH_SIZE)

  await Promise.all(
    batch.map(repo => processRepo(repo))
  )

  await sleep(1000)  // Pause between batches
}
```

### 5. Error Recovery

Handle failures gracefully:

```typescript
for (const repo of repos) {
  try {
    await syncRepo(repo)
  } catch (error) {
    console.error(`Failed to sync ${repo.full_name}:`, error)

    // Log error but continue
    await logError({
      type: 'github_sync_error',
      repo: repo.full_name,
      error: error.message
    })

    continue  // Don't stop entire sync
  }
}
```

### 6. Webhook Setup

1. Go to your GitHub account settings
2. Settings → Developer settings → Webhooks
3. Add webhook:
   - Payload URL: `https://your-app.com/api/github/webhook`
   - Content type: `application/json`
   - Secret: Generate strong secret
   - Events: Select "Stars"

## Advanced Features

### Language-Based Auto-Lists

```typescript
// Auto-assign to lists by language
const languageLists = {
  'TypeScript': 'typescript-projects',
  'Python': 'python-projects',
  'Go': 'go-projects',
  'Rust': 'rust-projects',
}

const language = repo.language
if (language && languageLists[language]) {
  const listId = await findOrCreateList(languageLists[language])
  await assignToList(bookmark.id, listId)
}
```

### Topic-Based Tagging

```typescript
// Auto-tag based on topics
for (const topic of repo.topics) {
  const tag = await findOrCreateTag(topic)
  await assignTag(bookmark.id, tag.id, confidence: 1.0)
}
```

### Trending Repos Detection

```typescript
// Detect repos gaining stars rapidly
const lastWeekStars = bookmark.metadata?.stars || 0
const currentStars = repo.stargazers_count

const growth = currentStars - lastWeekStars
const growthRate = growth / 7  // Stars per day

if (growthRate > 100) {
  await addTag(bookmark.id, 'trending')
}
```

## Testing

```typescript
describe('GitHubAdapter', () => {
  it('should fetch starred repos', async () => {
    const adapter = new GitHubAdapter(TEST_TOKEN, 'octocat')
    const repos = await adapter.fetchStarredRepos()

    expect(repos.length).toBeGreaterThan(0)
    expect(repos[0]).toHaveProperty('full_name')
  })

  it('should fetch README', async () => {
    const adapter = new GitHubAdapter(TEST_TOKEN, 'octocat')
    const readme = await adapter.fetchReadme('vercel', 'next.js')

    expect(readme).toContain('Next.js')
  })
})
```

## References

- [GitHub REST API Documentation](https://docs.github.com/en/rest)
- [Octokit.js](https://github.com/octokit/octokit.js)
- [GitHub Webhooks](https://docs.github.com/en/webhooks)
- [Rate Limiting](https://docs.github.com/en/rest/overview/rate-limits-for-the-rest-api)

---

**Happy starring! 🌟**
