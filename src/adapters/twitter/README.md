# Twitter / X Adapter

## Status
✅ **Implemented** - Completed in Phase 2 (Week 4)

## Authentication
- **Type**: OAuth 2.0 (Bearer Token or Access Token)
- **Required Scopes**: `tweet.read`, `users.read`, `bookmark.read`
- **Credentials Needed**:
  - Bearer Token (App-only) OR
  - Access Token (OAuth 2.0 with PKCE for user context)

## Features
- [x] Fetch bookmarked tweets (up to 800 most recent)
- [x] Fetch user retweets from timeline
- [x] Parse tweet content and media
- [x] Handle pagination for both endpoints
- [x] Rate limiting (18s for bookmarks, 1s for tweets)
- [x] Media URL extraction (photos, videos, GIFs)
- [x] Hashtag and mention extraction
- [x] URL expansion (unwound URLs)
- [x] Public metrics (likes, retweets, replies)
- [x] Retweet detection and filtering
- [x] Comprehensive metadata preservation

## Usage

### Basic Example

```typescript
import { createAdapter } from '@/adapters'

// Using Bearer Token (App-only)
const adapter = createAdapter('twitter', {
  bearerToken: process.env.TWITTER_BEARER_TOKEN
})

// Fetch all saved posts (bookmarks + retweets)
const posts = await adapter.fetchSavedPosts()
```

## API Documentation

- [Twitter API v2 Overview](https://developer.twitter.com/en/docs/twitter-api)
- [Bookmarks Endpoint](https://developer.twitter.com/en/docs/twitter-api/tweets/bookmarks/api-reference/get-users-id-bookmarks)
- [OAuth 2.0 Authentication](https://developer.twitter.com/en/docs/authentication/oauth-2-0)

---

**Phase 2 - Week 4: Twitter/X Adapter** ✅ **COMPLETED**
