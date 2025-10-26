# Reddit Adapter

## Status
✅ **Implemented** - Completed in Phase 2 (Week 4)

## Authentication
- **Type**: OAuth 2.0 (Password Flow)
- **Required Scopes**: `history`, `read`, `identity`
- **Credentials Needed**:
  - Client ID
  - Client Secret
  - Reddit Username
  - Reddit Password

## Features
- [x] Fetch saved posts and comments
- [x] Parse submission and comment data
- [x] Handle pagination (up to 10,000 items)
- [x] Rate limiting (600ms between requests)
- [x] OAuth2 password flow authentication
- [x] Token auto-refresh (tokens valid for 60 minutes)
- [x] Media URL extraction (images, videos, previews)
- [x] Submission and comment differentiation
- [x] Comprehensive metadata preservation

## Usage

### Basic Example

```typescript
import { createAdapter } from '@/adapters'

const adapter = createAdapter('reddit', {
  clientId: process.env.REDDIT_CLIENT_ID,
  clientSecret: process.env.REDDIT_CLIENT_SECRET,
  username: process.env.REDDIT_USERNAME,
  password: process.env.REDDIT_PASSWORD
})

// Fetch all saved posts
const posts = await adapter.fetchSavedPosts()

// Incremental sync (fetch only posts since last sync)
const newPosts = await adapter.fetchSavedPosts(lastSyncDate)
```

### Setting Up Reddit App

1. Go to https://www.reddit.com/prefs/apps
2. Click "Create app" or "Create another app"
3. Select "script" as the app type
4. Fill in the details:
   - **name**: Your app name (e.g., "Karakeep")
   - **redirect uri**: http://localhost (not used for password flow)
5. Click "Create app"
6. Copy the **client ID** (under the app name)
7. Copy the **client secret**

### Environment Variables

```env
REDDIT_CLIENT_ID=your_client_id_here
REDDIT_CLIENT_SECRET=your_secret_here
REDDIT_USERNAME=your_reddit_username
REDDIT_PASSWORD=your_reddit_password
```

## Data Mapping

### Reddit Submissions (Posts)

```typescript
{
  platformPostId: submission.id,
  url: "https://reddit.com/r/subreddit/comments/...",
  title: submission.title,
  content: submission.selftext || submission.url,
  authorName: submission.author,
  authorUrl: "https://reddit.com/u/username",
  mediaUrls: [...images, videos from preview/media],
  savedAt: new Date(submission.created_utc * 1000),
  metadata: {
    type: 'submission',
    subreddit: 'programming',
    score: 142,
    num_comments: 23,
    is_video: false,
    over_18: false,
    link_flair_text: 'Discussion'
  }
}
```

### Reddit Comments

```typescript
{
  platformPostId: comment.id,
  url: "https://reddit.com/r/subreddit/comments/.../comment_id",
  title: "Comment on: Original Post Title",
  content: comment.body,
  authorName: comment.author,
  authorUrl: "https://reddit.com/u/username",
  mediaUrls: [],
  savedAt: new Date(comment.created_utc * 1000),
  metadata: {
    type: 'comment',
    subreddit: 'programming',
    score: 42,
    link_id: 't3_abc123',
    link_title: 'Original Post Title',
    link_url: 'https://reddit.com/...'
  }
}
```

## API Endpoints Used

- **Authentication**: `POST https://www.reddit.com/api/v1/access_token`
- **User Info**: `GET https://oauth.reddit.com/api/v1/me`
- **Saved Posts**: `GET https://oauth.reddit.com/user/me/saved`

## Rate Limits

- **API Limit**: 100 requests per minute (QPM)
- **Adapter Rate**: 600ms between requests (~100 req/min)
- **Token Expiry**: 60 minutes (auto-refreshed)

## Pagination

Reddit uses cursor-based pagination:
- Max 100 items per page
- Use `after` parameter for next page
- Safety limit: 100 pages (10,000 items max)

## Testing

```bash
# Run Reddit adapter tests
npm run test:unit -- reddit

# With coverage
npm run test:coverage -- reddit
```

## Implementation Details

### File Structure

```
src/adapters/reddit/
├── adapter.ts       # Main RedditAdapter class
├── api-client.ts    # Reddit API HTTP client
├── types.ts         # TypeScript type definitions
├── index.ts         # Exports
└── README.md        # This file
```

### Type Guards

```typescript
import { isSubmission, isComment } from '@/adapters/reddit'

if (isSubmission(item)) {
  // TypeScript knows this is a submission
  console.log(item.title, item.selftext)
} else if (isComment(item)) {
  // TypeScript knows this is a comment
  console.log(item.body, item.link_title)
}
```

## Troubleshooting

### Authentication Failed

- Verify client ID and secret are correct
- Check that username and password are correct
- Ensure app type is set to "script"

### Rate Limit Errors

- The adapter handles rate limiting automatically
- If you hit limits, wait 1 minute and retry
- Consider reducing concurrent requests

### Token Expired

- Tokens are automatically refreshed
- If issues persist, re-authenticate manually

## API Documentation

- [Reddit API OAuth2](https://github.com/reddit-archive/reddit/wiki/OAuth2)
- [Saved Posts Endpoint](https://www.reddit.com/dev/api#GET_user_{username}_saved)
- [Reddit API Documentation](https://www.reddit.com/dev/api/)

## Notes

- Submissions include: posts, links, images, videos
- Comments include: replies to posts and other comments
- Both submissions and comments can be saved
- Media URLs include: thumbnails, preview images, Reddit videos, external URLs
- HTML entities in URLs are automatically decoded
- Metadata preserves all Reddit-specific data for future use

---

**Phase 2 - Week 4: Reddit Adapter** ✅ **COMPLETED**
