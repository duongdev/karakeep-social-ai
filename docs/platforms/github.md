# GitHub Stars Adapter

[← Back to Documentation Index](../README.md)

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
- [Troubleshooting](#troubleshooting)

## Overview

The GitHub adapter syncs your starred repositories, allowing you to:

- **Search** starred repos with AI-powered semantic search
- **Categorize** repos by language, topic, or framework
- **Track updates** to starred repositories
- **Discover patterns** in what you star
- **Search README content** for better discoverability

## Features

### Core Features

✅ **Sync Starred Repos** - Automatically fetch all starred repositories
✅ **README Extraction** - Pull README content for full-text search
✅ **Metadata Tracking** - Language, topics, stars, forks, last update
✅ **Incremental Sync** - Only fetch new stars since last sync
✅ **Update Detection** - Track when starred repos get updates
✅ **Auto-categorization** - Group by language, framework, topic
✅ **Webhook Support** - Real-time sync when you star a repo

### Advanced Features

🚀 **Trending Detection** - Identify rapidly growing repos
🚀 **Duplicate Detection** - Find similar repos in your stars
🚀 **Recommendation Engine** - Suggest related repos
🚀 **Changelog Tracking** - Monitor releases and updates
🚀 **Dependency Analysis** - Track dependencies

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

For complete implementation, see [GITHUB_ADAPTER.md](../../GITHUB_ADAPTER.md) sections on:
- GitHub Adapter class
- Sync Service
- Data mapping
- API endpoints

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

See [GITHUB_ADAPTER.md](../../GITHUB_ADAPTER.md) section 5 for complete webhook implementation.

## API Endpoints

### Sync Endpoints

```typescript
// Trigger manual sync
POST /api/github/sync/:accountId

// Sync READMEs
POST /api/github/sync-readmes/:accountId

// Check for updates
POST /api/github/check-updates/:accountId

// Webhook endpoint
POST /api/github/webhook
```

See [GITHUB_ADAPTER.md](../../GITHUB_ADAPTER.md) section 6 for complete API implementation.

## Cost & Rate Limits

### GitHub API Rate Limits

**Authenticated Requests**: 5,000 requests/hour (~83 requests/minute)

**Unauthenticated**: 60 requests/hour (don't use)

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
const since = account.lastSyncedAt
const repos = await octokit.activity.listReposStarredByUser({
  username,
  since: since?.toISOString(),
})
```

### 2. README Caching

Don't re-fetch READMEs unnecessarily:

```typescript
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

## Troubleshooting

### Problem: Rate limit exceeded

**Solution**: Use exponential backoff and respect reset time

```typescript
if (error.status === 403) {
  const resetTime = error.response.headers['x-ratelimit-reset']
  await sleep(resetTime * 1000 - Date.now())
  return retry()
}
```

### Problem: README not found

**Solution**: Not all repos have READMEs, handle gracefully

```typescript
try {
  const readme = await fetchReadme(owner, repo)
} catch (error) {
  if (error.status === 404) {
    console.log('No README found')
    return null
  }
  throw error
}
```

### Problem: Webhook signature verification fails

**Solution**: Check webhook secret and signature validation

```typescript
const webhooks = new Webhooks({
  secret: process.env.GITHUB_WEBHOOK_SECRET,
})

const verified = await webhooks.verify(payload, signature)
if (!verified) {
  return c.json({ error: 'Invalid signature' }, 401)
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

## Related Documentation

- [Adapter Architecture](./adapter-architecture.md) - Platform adapter design
- [Adding Platforms](./adding-platforms.md) - Step-by-step guide
- [Complete Implementation](../../GITHUB_ADAPTER.md) - Full code examples

## References

- [GitHub REST API Documentation](https://docs.github.com/en/rest)
- [Octokit.js](https://github.com/octokit/octokit.js)
- [GitHub Webhooks](https://docs.github.com/en/webhooks)
- [Rate Limiting](https://docs.github.com/en/rest/overview/rate-limits-for-the-rest-api)

---

**Last Updated**: 2025-10-26
