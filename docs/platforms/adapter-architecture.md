# Platform Adapter Architecture

[← Back to Documentation Index](../README.md)

Complete guide to the platform adapter system in Karakeep, enabling easy integration of new social platforms.

## Table of Contents

- [Overview](#overview)
- [Adapter Interface](#adapter-interface)
- [Implementation Guide](#implementation-guide)
- [Platform Registry](#platform-registry)
- [Authentication Patterns](#authentication-patterns)
- [Data Mapping](#data-mapping)
- [Error Handling](#error-handling)
- [Testing](#testing)
- [Best Practices](#best-practices)

## Overview

Platform adapters are modular components that connect Karakeep to external social platforms. Each adapter implements a standardized interface, making it easy to add new platforms without modifying core application code.

### ✅ Implementation Status

**Phase 2 - Week 3: Adapter Framework** - **COMPLETED**

The core adapter infrastructure is now fully implemented and tested:

- ✅ **Base Adapter Interface** (`src/adapters/base.ts`) - Abstract base class with common functionality
- ✅ **Type Definitions** (`src/adapters/types.ts`) - Shared types for all adapters
- ✅ **Error Handling** (`src/adapters/errors.ts`) - Standardized error classes
- ✅ **Adapter Registry** (`src/adapters/registry.ts`) - Factory pattern for adapter management
- ✅ **Test Suite** - Comprehensive unit tests (53 tests passing)
- ✅ **Platform Directories** - Scaffold created for all 8 planned platforms

**Next Steps**: Week 4 - Implement platform-specific adapters (Twitter, Reddit, GitHub)

### Design Principles

- **Loose Coupling** - Adapters are independent modules
- **Standardized Interface** - All adapters follow the same contract
- **Extensibility** - Easy to add new platforms
- **Maintainability** - Each platform isolated in its own module
- **Testability** - Adapters can be tested independently

### Supported Platforms

| Platform | Status | Auth Type | Webhook Support |
|----------|--------|-----------|-----------------|
| X (Twitter) | ✅ Planned | OAuth2 / Bearer Token | ❌ |
| Reddit | ✅ Planned | OAuth2 | ❌ |
| YouTube | ✅ Planned | OAuth2 | ✅ Optional |
| TikTok | ✅ Planned | Cookie / API Token | ❌ |
| Dribbble | ✅ Planned | OAuth2 / API Token | ❌ |
| Instagram | ✅ Planned | Cookie-based | ❌ |
| Facebook | ✅ Planned | OAuth2 | ❌ |
| GitHub | ✅ Documented | PAT / OAuth2 | ✅ Yes |

## Adapter Interface

### Core Interface Definition

Create `src/adapters/base.ts`:

```typescript
export interface PlatformAdapter {
  /**
   * Platform identifier (lowercase)
   */
  platform: string

  /**
   * Authenticate with the platform using provided credentials
   */
  authenticate(credentials: any): Promise<boolean>

  /**
   * Fetch saved/bookmarked posts from the platform
   * @param since - Optional date to fetch posts since
   */
  fetchSavedPosts(since?: Date): Promise<Post[]>

  /**
   * Validate that current credentials are still valid
   */
  validateCredentials(): Promise<boolean>

  /**
   * Get supported authentication types for this platform
   */
  getSupportedAuthTypes(): AuthType[]

  /**
   * Optional: Setup webhook for real-time updates
   */
  setupWebhook?(webhookUrl: string): Promise<void>
}

export interface Post {
  /**
   * Unique post ID on the platform
   */
  platformPostId: string

  /**
   * Direct URL to the post
   */
  url: string

  /**
   * Post title (if applicable)
   */
  title?: string

  /**
   * Post content/text
   */
  content: string

  /**
   * Author/creator name
   */
  authorName: string

  /**
   * URL to author's profile
   */
  authorUrl: string

  /**
   * Media URLs (images, videos)
   */
  mediaUrls: string[]

  /**
   * When the post was saved/bookmarked
   */
  savedAt: Date

  /**
   * Platform-specific metadata
   */
  metadata: Record<string, any>
}

export enum AuthType {
  OAUTH2 = 'oauth2',
  API_TOKEN = 'api_token',
  BEARER_TOKEN = 'bearer_token',
  COOKIE = 'cookie',
  USERNAME_PASSWORD = 'username_password'
}
```

### Base Adapter Class

```typescript
export abstract class BaseAdapter implements PlatformAdapter {
  protected credentials: any
  abstract platform: string

  constructor(credentials: any) {
    this.credentials = credentials
  }

  abstract authenticate(credentials: any): Promise<boolean>
  abstract fetchSavedPosts(since?: Date): Promise<Post[]>
  abstract validateCredentials(): Promise<boolean>
  abstract getSupportedAuthTypes(): AuthType[]

  /**
   * Common rate limiting logic
   */
  protected async rateLimit(waitMs: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, waitMs))
  }

  /**
   * Common retry logic with exponential backoff
   */
  protected async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn()
      } catch (error) {
        if (i === maxRetries - 1) throw error
        await this.rateLimit(Math.pow(2, i) * 1000)
      }
    }
    throw new Error('Max retries exceeded')
  }

  /**
   * Common error handling
   */
  protected handleError(error: any, context: string): never {
    console.error(`[${this.platform}] ${context}:`, error)

    if (error.response?.status === 401) {
      throw new Error('Invalid credentials')
    } else if (error.response?.status === 429) {
      throw new Error('Rate limit exceeded')
    } else if (error.response?.status === 404) {
      throw new Error('Resource not found')
    }

    throw error
  }
}
```

## Implementation Guide

### Step-by-Step: Creating a New Adapter

#### 1. Create Adapter Directory

```bash
mkdir -p src/adapters/platform-name
cd src/adapters/platform-name
```

#### 2. Define Types

Create `types.ts`:

```typescript
export interface PlatformCredentials {
  apiKey?: string
  accessToken?: string
  refreshToken?: string
  // Platform-specific fields
}

export interface PlatformPost {
  // Raw post data from platform API
  id: string
  text: string
  author: {
    username: string
    displayName: string
  }
  created_at: string
  media?: any[]
  // ... other platform-specific fields
}
```

#### 3. Create API Client

Create `api-client.ts`:

```typescript
import axios, { AxiosInstance } from 'axios'

export class PlatformAPIClient {
  private client: AxiosInstance

  constructor(private accessToken: string) {
    this.client = axios.create({
      baseURL: 'https://api.platform.com/v1',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })
  }

  async getSavedPosts(limit = 100, cursor?: string) {
    const response = await this.client.get('/saved-posts', {
      params: { limit, cursor }
    })
    return response.data
  }

  async getUserInfo() {
    const response = await this.client.get('/me')
    return response.data
  }

  // Add more API methods as needed
}
```

#### 4. Implement Adapter

Create `adapter.ts`:

```typescript
import { BaseAdapter, Post, AuthType } from '../base'
import { PlatformAPIClient } from './api-client'
import { PlatformCredentials, PlatformPost } from './types'

export class PlatformAdapter extends BaseAdapter {
  platform = 'platform-name'
  private client: PlatformAPIClient

  constructor(credentials: PlatformCredentials) {
    super(credentials)
    this.client = new PlatformAPIClient(credentials.accessToken!)
  }

  async authenticate(credentials: PlatformCredentials): Promise<boolean> {
    try {
      await this.client.getUserInfo()
      return true
    } catch (error) {
      return false
    }
  }

  async fetchSavedPosts(since?: Date): Promise<Post[]> {
    const posts: Post[] = []
    let cursor: string | undefined

    try {
      while (true) {
        const response = await this.client.getSavedPosts(100, cursor)

        for (const rawPost of response.data) {
          // Stop if we've reached posts older than 'since'
          if (since && new Date(rawPost.created_at) < since) {
            return posts
          }

          // Map platform post to standard format
          posts.push(this.mapPost(rawPost))
        }

        // Check for pagination
        cursor = response.pagination?.next_cursor
        if (!cursor) break

        // Rate limiting
        await this.rateLimit(100)
      }

      return posts
    } catch (error) {
      this.handleError(error, 'fetchSavedPosts')
    }
  }

  async validateCredentials(): Promise<boolean> {
    return this.authenticate(this.credentials)
  }

  getSupportedAuthTypes(): AuthType[] {
    return [AuthType.OAUTH2, AuthType.API_TOKEN]
  }

  /**
   * Map platform-specific post to standard Post format
   */
  private mapPost(rawPost: PlatformPost): Post {
    return {
      platformPostId: rawPost.id,
      url: `https://platform.com/posts/${rawPost.id}`,
      title: undefined,  // Not all platforms have titles
      content: rawPost.text,
      authorName: rawPost.author.displayName,
      authorUrl: `https://platform.com/users/${rawPost.author.username}`,
      mediaUrls: rawPost.media?.map(m => m.url) || [],
      savedAt: new Date(rawPost.created_at),
      metadata: {
        // Store platform-specific data
        likes: rawPost.likes_count,
        shares: rawPost.shares_count,
        // ... other metadata
      }
    }
  }
}
```

#### 5. Export Adapter

Create `index.ts`:

```typescript
export { PlatformAdapter } from './adapter'
export { PlatformAPIClient } from './api-client'
export * from './types'
```

## Platform Registry

### Adapter Registry

Create `src/adapters/registry.ts`:

```typescript
import { PlatformAdapter } from './base'
import { TwitterAdapter } from './twitter'
import { RedditAdapter } from './reddit'
import { YouTubeAdapter } from './youtube'
import { GitHubAdapter } from './github'

export class AdapterRegistry {
  private adapters = new Map<string, typeof PlatformAdapter>()

  constructor() {
    // Register all adapters
    this.register('twitter', TwitterAdapter)
    this.register('reddit', RedditAdapter)
    this.register('youtube', YouTubeAdapter)
    this.register('github', GitHubAdapter)
    // Add more platforms...
  }

  register(platform: string, adapter: typeof PlatformAdapter) {
    this.adapters.set(platform, adapter)
  }

  create(platform: string, credentials: any): PlatformAdapter {
    const AdapterClass = this.adapters.get(platform)

    if (!AdapterClass) {
      throw new Error(`No adapter found for platform: ${platform}`)
    }

    return new AdapterClass(credentials)
  }

  getSupportedPlatforms(): string[] {
    return Array.from(this.adapters.keys())
  }

  hasAdapter(platform: string): boolean {
    return this.adapters.has(platform)
  }
}

// Singleton instance
export const adapterRegistry = new AdapterRegistry()
```

### Using the Registry

```typescript
import { adapterRegistry } from '@/adapters/registry'

// Create adapter for a platform
const adapter = adapterRegistry.create('twitter', {
  bearerToken: 'xxx'
})

// Fetch saved posts
const posts = await adapter.fetchSavedPosts()

// Check supported platforms
const platforms = adapterRegistry.getSupportedPlatforms()
console.log('Supported:', platforms)
```

## Authentication Patterns

### OAuth2 Flow

```typescript
export class OAuth2Adapter extends BaseAdapter {
  async getAuthUrl(redirectUri: string): Promise<string> {
    const params = new URLSearchParams({
      client_id: process.env.PLATFORM_CLIENT_ID!,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'read:saved write:saved'
    })

    return `https://platform.com/oauth/authorize?${params}`
  }

  async exchangeCodeForToken(code: string): Promise<{
    accessToken: string
    refreshToken: string
  }> {
    const response = await axios.post('https://platform.com/oauth/token', {
      client_id: process.env.PLATFORM_CLIENT_ID,
      client_secret: process.env.PLATFORM_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code'
    })

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<string> {
    const response = await axios.post('https://platform.com/oauth/token', {
      client_id: process.env.PLATFORM_CLIENT_ID,
      client_secret: process.env.PLATFORM_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })

    return response.data.access_token
  }
}
```

### API Token / Bearer Token

```typescript
export class TokenAdapter extends BaseAdapter {
  private client: AxiosInstance

  constructor(credentials: { token: string }) {
    super(credentials)

    this.client = axios.create({
      baseURL: 'https://api.platform.com',
      headers: {
        'Authorization': `Bearer ${credentials.token}`
      }
    })
  }

  async validateCredentials(): Promise<boolean> {
    try {
      await this.client.get('/me')
      return true
    } catch {
      return false
    }
  }
}
```

### Cookie-Based (for platforms without public APIs)

```typescript
export class CookieAdapter extends BaseAdapter {
  constructor(credentials: { cookies: string }) {
    super(credentials)
  }

  async fetchSavedPosts(since?: Date): Promise<Post[]> {
    // Use puppeteer or similar for scraping
    const browser = await puppeteer.launch()
    const page = await browser.newPage()

    // Set cookies
    await page.setCookie(...this.parseCookies(this.credentials.cookies))

    // Navigate and scrape
    await page.goto('https://platform.com/saved')
    const posts = await page.evaluate(() => {
      // Extract post data from DOM
      return Array.from(document.querySelectorAll('.post')).map(post => ({
        // ... extract data
      }))
    })

    await browser.close()
    return posts.map(p => this.mapPost(p))
  }

  private parseCookies(cookieString: string) {
    return cookieString.split(';').map(cookie => {
      const [name, value] = cookie.trim().split('=')
      return { name, value, domain: '.platform.com' }
    })
  }
}
```

## Data Mapping

### Mapping Platform Data to Standard Format

```typescript
class AdapterMapper {
  /**
   * Map raw platform post to standard Post format
   */
  mapPost(raw: any, platform: string): Post {
    const mappers = {
      twitter: this.mapTwitterPost,
      reddit: this.mapRedditPost,
      youtube: this.mapYouTubePost,
      github: this.mapGitHubPost,
    }

    const mapper = mappers[platform]
    if (!mapper) {
      throw new Error(`No mapper for platform: ${platform}`)
    }

    return mapper.call(this, raw)
  }

  private mapTwitterPost(tweet: any): Post {
    return {
      platformPostId: tweet.id,
      url: `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id}`,
      title: undefined,
      content: tweet.full_text,
      authorName: tweet.user.name,
      authorUrl: `https://twitter.com/${tweet.user.screen_name}`,
      mediaUrls: tweet.entities?.media?.map(m => m.media_url_https) || [],
      savedAt: new Date(tweet.created_at),
      metadata: {
        retweets: tweet.retweet_count,
        likes: tweet.favorite_count,
        replies: tweet.reply_count,
        hashtags: tweet.entities?.hashtags?.map(h => h.text) || []
      }
    }
  }

  private mapRedditPost(submission: any): Post {
    return {
      platformPostId: submission.id,
      url: `https://reddit.com${submission.permalink}`,
      title: submission.title,
      content: submission.selftext,
      authorName: submission.author,
      authorUrl: `https://reddit.com/u/${submission.author}`,
      mediaUrls: submission.url ? [submission.url] : [],
      savedAt: new Date(submission.created_utc * 1000),
      metadata: {
        subreddit: submission.subreddit,
        score: submission.score,
        num_comments: submission.num_comments,
        awards: submission.all_awardings
      }
    }
  }

  // Add mappers for other platforms...
}
```

## Error Handling

### Common Error Patterns

```typescript
export class AdapterError extends Error {
  constructor(
    message: string,
    public code: string,
    public platform: string,
    public originalError?: any
  ) {
    super(message)
    this.name = 'AdapterError'
  }
}

export class AuthenticationError extends AdapterError {
  constructor(platform: string, originalError?: any) {
    super(
      'Authentication failed',
      'AUTH_FAILED',
      platform,
      originalError
    )
  }
}

export class RateLimitError extends AdapterError {
  constructor(
    platform: string,
    public resetTime?: Date
  ) {
    super(
      'Rate limit exceeded',
      'RATE_LIMIT',
      platform
    )
  }
}

export class ResourceNotFoundError extends AdapterError {
  constructor(platform: string, resource: string) {
    super(
      `Resource not found: ${resource}`,
      'NOT_FOUND',
      platform
    )
  }
}
```

### Error Handling in Adapters

```typescript
async fetchSavedPosts(since?: Date): Promise<Post[]> {
  try {
    const response = await this.client.get('/saved')
    return response.data.map(p => this.mapPost(p))
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new AuthenticationError(this.platform, error)
      } else if (error.response?.status === 429) {
        const resetTime = new Date(error.response.headers['x-ratelimit-reset'] * 1000)
        throw new RateLimitError(this.platform, resetTime)
      } else if (error.response?.status === 404) {
        throw new ResourceNotFoundError(this.platform, 'saved posts')
      }
    }

    throw new AdapterError(
      'Failed to fetch saved posts',
      'FETCH_FAILED',
      this.platform,
      error
    )
  }
}
```

## Testing

### Unit Tests

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { PlatformAdapter } from './adapter'

describe('PlatformAdapter', () => {
  let adapter: PlatformAdapter

  beforeEach(() => {
    adapter = new PlatformAdapter({
      accessToken: 'test-token'
    })
  })

  it('should authenticate successfully', async () => {
    const result = await adapter.authenticate({
      accessToken: 'valid-token'
    })

    expect(result).toBe(true)
  })

  it('should fetch saved posts', async () => {
    const posts = await adapter.fetchSavedPosts()

    expect(posts).toBeInstanceOf(Array)
    expect(posts.length).toBeGreaterThan(0)
    expect(posts[0]).toHaveProperty('platformPostId')
    expect(posts[0]).toHaveProperty('url')
  })

  it('should handle rate limiting', async () => {
    // Mock API to return 429
    await expect(
      adapter.fetchSavedPosts()
    ).rejects.toThrow(RateLimitError)
  })

  it('should map posts correctly', async () => {
    const posts = await adapter.fetchSavedPosts()
    const post = posts[0]

    expect(post.platformPostId).toBeDefined()
    expect(post.url).toMatch(/^https?:\/\//)
    expect(post.authorName).toBeDefined()
    expect(post.savedAt).toBeInstanceOf(Date)
  })
})
```

### Integration Tests

```typescript
describe('PlatformAdapter Integration', () => {
  it('should sync with real API', async () => {
    const adapter = new PlatformAdapter({
      accessToken: process.env.TEST_ACCESS_TOKEN
    })

    const posts = await adapter.fetchSavedPosts()

    expect(posts.length).toBeGreaterThan(0)

    // Verify data structure
    posts.forEach(post => {
      expect(post).toMatchObject({
        platformPostId: expect.any(String),
        url: expect.any(String),
        content: expect.any(String),
        authorName: expect.any(String),
        savedAt: expect.any(Date)
      })
    })
  })
})
```

## Best Practices

### 1. Rate Limiting

Always implement rate limiting to respect platform API limits:

```typescript
private lastRequest = 0
private minInterval = 1000  // 1 second between requests

async makeRequest<T>(fn: () => Promise<T>): Promise<T> {
  const now = Date.now()
  const timeSinceLastRequest = now - this.lastRequest

  if (timeSinceLastRequest < this.minInterval) {
    await this.rateLimit(this.minInterval - timeSinceLastRequest)
  }

  this.lastRequest = Date.now()
  return await fn()
}
```

### 2. Pagination

Handle pagination properly to fetch all posts:

```typescript
async fetchAllPosts(): Promise<Post[]> {
  const allPosts: Post[] = []
  let cursor: string | undefined

  do {
    const response = await this.client.getPosts(cursor)
    allPosts.push(...response.data.map(p => this.mapPost(p)))
    cursor = response.pagination?.next
  } while (cursor)

  return allPosts
}
```

### 3. Incremental Sync

Only fetch new posts since last sync:

```typescript
async fetchSavedPosts(since?: Date): Promise<Post[]> {
  const posts: Post[] = []

  for await (const post of this.iteratePosts()) {
    if (since && post.savedAt < since) {
      break  // Stop when we reach old posts
    }
    posts.push(post)
  }

  return posts
}
```

### 4. Logging

Add comprehensive logging for debugging:

```typescript
import { logger } from '@/lib/logger'

async fetchSavedPosts(since?: Date): Promise<Post[]> {
  logger.info(`[${this.platform}] Starting sync`, { since })

  try {
    const posts = await this.doFetch(since)
    logger.info(`[${this.platform}] Sync complete`, {
      count: posts.length
    })
    return posts
  } catch (error) {
    logger.error(`[${this.platform}] Sync failed`, { error })
    throw error
  }
}
```

### 5. Credentials Security

Never log or expose credentials:

```typescript
constructor(credentials: any) {
  super(credentials)

  // Don't log credentials
  logger.info(`[${this.platform}] Adapter initialized`)
  // NOT: logger.info('Credentials:', credentials)

  // Store encrypted in database
  this.credentials = encryptCredentials(credentials)
}
```

## Related Documentation

- [GitHub Adapter](./github.md) - Complete GitHub implementation
- [Adding Platforms](./adding-platforms.md) - Step-by-step guide
- [Database Schema](../architecture/database-schema.md) - Data models

## References

- [Platform Adapter Design Pattern](https://refactoring.guru/design-patterns/adapter)
- [API Client Best Practices](https://swagger.io/resources/articles/best-practices-in-api-design/)

---

**Last Updated**: 2025-10-26
