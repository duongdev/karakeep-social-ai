# Getting Started with Platform Adapters

> **Last Updated**: 2025-10-26

Quick guide to start using the implemented Twitter/X and Reddit platform adapters to sync your saved posts and bookmarks.

## Table of Contents

- [Overview](#overview)
- [Currently Implemented Platforms](#currently-implemented-platforms)
- [Twitter/X Setup](#twitterx-setup)
- [Reddit Setup](#reddit-setup)
- [Usage Examples](#usage-examples)
- [Troubleshooting](#troubleshooting)
- [Next Steps](#next-steps)

## Overview

Karakeep uses **platform adapters** to connect to social media platforms and sync your saved content. Each adapter handles authentication, fetching bookmarks, and mapping platform-specific data to a standardized format.

### What You Can Do

- ✅ **Sync Twitter/X bookmarks** - Fetch all your bookmarked tweets
- ✅ **Sync Reddit saved posts** - Fetch saved posts and comments
- ✅ **Automatic sync** - Schedule regular syncs via cron jobs
- ✅ **Manual sync** - Trigger sync on-demand via API
- 🚧 **GitHub stars** - Coming soon
- 🚧 **YouTube likes** - Coming soon

## Currently Implemented Platforms

### ✅ Twitter/X (`twitter`)

**Status**: Fully implemented and tested
**Authentication**: OAuth2 or Bearer Token
**Features**:
- Fetch bookmarked tweets
- Support for retweets and quote tweets
- Extract media (photos, videos)
- Preserve tweet metadata (likes, retweets, hashtags)

### ✅ Reddit (`reddit`)

**Status**: Fully implemented and tested
**Authentication**: OAuth2 or Username/Password
**Features**:
- Fetch saved posts (submissions)
- Fetch saved comments
- Extract media from previews
- Preserve Reddit metadata (score, subreddit, awards)

## Twitter/X Setup

### Prerequisites

You'll need Twitter/X API credentials. Choose one of these methods:

#### Option 1: Bearer Token (Simplest)

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a new app or select existing app
3. Go to "Keys and tokens" section
4. Generate "Bearer Token"
5. Copy the token

**Pros**: Simple, read-only access
**Cons**: Can't access some user-specific endpoints

#### Option 2: OAuth 2.0 (Recommended for User Context)

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a new app with OAuth 2.0 enabled
3. Set callback URL: `http://localhost:3000/auth/twitter/callback` (dev) or your production URL
4. Get Client ID and Client Secret
5. Use OAuth flow to get access token

**Pros**: Full access, user context
**Cons**: More complex setup

### Configure Environment Variables

Add to your `.env`:

```env
# Twitter/X Credentials
TWITTER_BEARER_TOKEN=AAAAAAAAAAAAAAAAAAAAAA...  # If using bearer token
TWITTER_CLIENT_ID=xxx                           # If using OAuth2
TWITTER_CLIENT_SECRET=xxx                       # If using OAuth2
TWITTER_ACCESS_TOKEN=xxx                        # After OAuth2 flow
TWITTER_REFRESH_TOKEN=xxx                       # After OAuth2 flow
```

### Add Twitter Account via API

```bash
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "platform": "twitter",
    "username": "your_twitter_handle",
    "credentials": {
      "bearerToken": "AAAAAAAAAAAAAAAAAAAAAA..."
    }
  }'
```

Or with OAuth2:

```bash
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "platform": "twitter",
    "username": "your_twitter_handle",
    "credentials": {
      "accessToken": "xxx",
      "refreshToken": "xxx"
    }
  }'
```

## Reddit Setup

### Prerequisites

You'll need Reddit API credentials:

#### Method 1: Script Application (For Personal Use)

1. Go to [Reddit Apps](https://www.reddit.com/prefs/apps)
2. Scroll to bottom and click "create another app..."
3. Fill in:
   - **name**: Karakeep
   - **type**: script
   - **description**: Personal bookmark manager
   - **about url**: (optional)
   - **redirect uri**: `http://localhost:3000/auth/reddit/callback`
4. Click "create app"
5. Copy the Client ID (under the app name) and Secret

#### Method 2: Username/Password (Simple but Less Secure)

If you're using the "script" app type, you can authenticate with username/password.

### Configure Environment Variables

Add to your `.env`:

```env
# Reddit Credentials
REDDIT_CLIENT_ID=xxx
REDDIT_CLIENT_SECRET=xxx
REDDIT_USERNAME=your_username        # For username/password auth
REDDIT_PASSWORD=your_password        # For username/password auth
REDDIT_ACCESS_TOKEN=xxx              # After OAuth2 flow
REDDIT_REFRESH_TOKEN=xxx             # After OAuth2 flow
```

### Add Reddit Account via API

With username/password:

```bash
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "platform": "reddit",
    "username": "your_reddit_username",
    "credentials": {
      "clientId": "xxx",
      "clientSecret": "xxx",
      "username": "your_reddit_username",
      "password": "your_password"
    }
  }'
```

With OAuth2:

```bash
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "platform": "reddit",
    "username": "your_reddit_username",
    "credentials": {
      "clientId": "xxx",
      "clientSecret": "xxx",
      "accessToken": "xxx",
      "refreshToken": "xxx"
    }
  }'
```

## Usage Examples

### Using the Adapters Programmatically

```typescript
import { createAdapter } from '@/adapters'

// Create Twitter adapter
const twitterAdapter = createAdapter('twitter', {
  bearerToken: process.env.TWITTER_BEARER_TOKEN
})

// Authenticate
const authenticated = await twitterAdapter.authenticate()
if (!authenticated) {
  throw new Error('Twitter authentication failed')
}

// Fetch bookmarks
const bookmarks = await twitterAdapter.fetchSavedPosts()
console.log(`Fetched ${bookmarks.length} bookmarks`)

// Fetch only new bookmarks since last sync
const lastSyncDate = new Date('2025-10-20')
const newBookmarks = await twitterAdapter.fetchSavedPosts(lastSyncDate)
console.log(`Fetched ${newBookmarks.length} new bookmarks`)
```

```typescript
// Create Reddit adapter
const redditAdapter = createAdapter('reddit', {
  clientId: process.env.REDDIT_CLIENT_ID,
  clientSecret: process.env.REDDIT_CLIENT_SECRET,
  username: process.env.REDDIT_USERNAME,
  password: process.env.REDDIT_PASSWORD
})

// Authenticate
await redditAdapter.authenticate()

// Fetch saved posts
const savedPosts = await redditAdapter.fetchSavedPosts()
console.log(`Fetched ${savedPosts.length} saved items`)

// Posts include both submissions and comments
savedPosts.forEach(post => {
  if (post.metadata.type === 'submission') {
    console.log(`Post: ${post.title} in r/${post.metadata.subreddit}`)
  } else {
    console.log(`Comment in r/${post.metadata.subreddit}`)
  }
})
```

### Trigger Manual Sync via API

Sync all connected accounts:

```bash
curl -X POST http://localhost:3000/api/sync/trigger \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

Sync specific account:

```bash
curl -X POST http://localhost:3000/api/sync/trigger \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "ACCOUNT_ID"
  }'
```

Sync specific platform:

```bash
curl -X POST http://localhost:3000/api/sync/trigger \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "twitter"
  }'
```

### Check Sync Status

```bash
curl http://localhost:3000/api/sync/status/ACCOUNT_ID \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Response:

```json
{
  "accountId": "xxx",
  "platform": "twitter",
  "lastSyncAt": "2025-10-26T10:30:00Z",
  "status": "completed",
  "bookmarksCount": 247,
  "newBookmarks": 5,
  "errors": []
}
```

### List Synced Bookmarks

```bash
curl http://localhost:3000/api/bookmarks \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Filter by platform:

```bash
curl "http://localhost:3000/api/bookmarks?platform=twitter" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Filter by date:

```bash
curl "http://localhost:3000/api/bookmarks?since=2025-10-20" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Get Bookmark Details

```bash
curl http://localhost:3000/api/bookmarks/BOOKMARK_ID \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Response includes:

```json
{
  "id": "xxx",
  "platform": "twitter",
  "platformPostId": "1234567890",
  "url": "https://twitter.com/user/status/1234567890",
  "title": null,
  "content": "This is a tweet...",
  "authorName": "User Name",
  "authorUrl": "https://twitter.com/user",
  "mediaUrls": ["https://pbs.twimg.com/media/xxx.jpg"],
  "savedAt": "2025-10-26T10:00:00Z",
  "metadata": {
    "retweets": 42,
    "likes": 156,
    "hashtags": ["design", "ux"]
  }
}
```

## Troubleshooting

### Twitter Issues

#### "Invalid authentication credentials"

**Cause**: Bearer token is invalid or expired
**Fix**: Generate a new bearer token in Twitter Developer Portal

```bash
# Test your bearer token
curl "https://api.twitter.com/2/users/me" \
  -H "Authorization: Bearer YOUR_BEARER_TOKEN"
```

#### "Rate limit exceeded"

**Cause**: Twitter API rate limits (75 requests per 15 minutes for bookmarks)
**Fix**: The adapter automatically handles rate limiting. Wait 15 minutes and try again.

#### "Could not authenticate you"

**Cause**: Access token expired (OAuth2)
**Fix**: Refresh the access token using refresh token

```typescript
const newToken = await twitterAdapter.refreshAccessToken(refreshToken)
```

### Reddit Issues

#### "401 Unauthorized"

**Cause**: Invalid credentials or expired token
**Fix**: Verify credentials and re-authenticate

```bash
# Test Reddit credentials
curl -X POST "https://www.reddit.com/api/v1/access_token" \
  -u "CLIENT_ID:CLIENT_SECRET" \
  -d "grant_type=password&username=YOUR_USERNAME&password=YOUR_PASSWORD"
```

#### "403 Forbidden"

**Cause**: App doesn't have required scopes
**Fix**: When creating the Reddit app, ensure you request these scopes:
- `identity`
- `history`
- `read`

#### "Too Many Requests"

**Cause**: Reddit rate limits (60 requests per minute)
**Fix**: The adapter implements automatic rate limiting. If you still hit limits, reduce sync frequency.

### General Issues

#### "Database connection failed"

**Cause**: DATABASE_URL not set or database not running
**Fix**:

```bash
# Check DATABASE_URL
echo $DATABASE_URL

# Test connection
npx prisma db pull
```

#### "Adapter not found for platform: xxx"

**Cause**: Platform adapter not registered
**Fix**: Check `src/adapters/index.ts` - the adapter must be registered

```typescript
// Should see this in src/adapters/index.ts
adapterRegistry.register("twitter", {
  displayName: "Twitter / X",
  // ...
  adapterClass: TwitterAdapter,
})
```

#### "Module not found"

**Cause**: Dependencies not installed
**Fix**:

```bash
npm install
npx prisma generate
```

## Next Steps

### 1. Set Up Automatic Sync

Create a cron job to sync every hour:

```bash
# Add to crontab
crontab -e

# Add line (sync every hour)
0 * * * * curl -X POST http://localhost:3000/api/sync/trigger \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Or use GitHub Actions:

```yaml
# .github/workflows/sync.yml
name: Sync Bookmarks
on:
  schedule:
    - cron: '0 * * * *'  # Every hour
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger sync
        run: |
          curl -X POST ${{ secrets.API_URL }}/api/sync/trigger \
            -H "Authorization: Bearer ${{ secrets.API_KEY }}"
```

### 2. Enable AI Features

Analyze bookmarks with Claude AI:

```bash
# Analyze a bookmark
curl -X POST http://localhost:3000/api/ai/analyze/BOOKMARK_ID \
  -H "Authorization: Bearer YOUR_API_KEY"
```

See [AI Features Guide](../ai/features.md) for details.

### 3. Set Up Webhooks (Future)

Some platforms support webhooks for real-time sync. This will be added in future updates.

### 4. Add More Platforms

Follow the [Adapter Architecture Guide](./adapter-architecture.md) to add more platforms:
- GitHub stars
- YouTube likes
- TikTok favorites
- Instagram saves

## Related Documentation

- [Platform Adapter Architecture](./adapter-architecture.md) - Technical details
- [Twitter/X Adapter](./twitter.md) - Twitter-specific documentation
- [Reddit Adapter](./reddit.md) - Reddit-specific documentation
- [Quick Start Guide](../planning/quick-start.md) - Initial setup
- [API Endpoints](../api/endpoints.md) - Complete API reference

## Resources

### API Documentation
- [Twitter API v2](https://developer.twitter.com/en/docs/twitter-api)
- [Reddit API](https://www.reddit.com/dev/api/)
- [Twitter Rate Limits](https://developer.twitter.com/en/docs/twitter-api/rate-limits)
- [Reddit Rate Limits](https://github.com/reddit-archive/reddit/wiki/API)

### Getting API Keys
- [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
- [Reddit Apps Page](https://www.reddit.com/prefs/apps)

---

**Questions or Issues?**

Open an issue on GitHub or refer to the main [Documentation Index](../README.md).
