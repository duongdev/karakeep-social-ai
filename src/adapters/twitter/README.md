# Twitter / X Adapter

## Status
⏳ **Planned** - Implementation in Phase 2 (Week 4)

## Authentication
- **Type**: OAuth 2.0 with PKCE / Bearer Token
- **Required Scopes**: `tweet.read`, `users.read`, `bookmark.read`

## Features
- [ ] Fetch bookmarked tweets
- [ ] Parse tweet content and media
- [ ] Handle rate limits (50 requests per 15 minutes)
- [ ] Pagination support

## API Documentation
- [Twitter API v2 Bookmarks](https://developer.x.com/en/docs/x-api/tweets/bookmarks/introduction)
- [Authentication Guide](https://developer.x.com/en/docs/authentication/oauth-2-0)

## Implementation Plan
1. Create OAuth2 client
2. Implement bookmark fetching
3. Map tweet data to Post format
4. Add rate limiting
5. Write tests

## Notes
- Bookmarks endpoint returns max 800 most recent tweets
- Requires OAuth 2.0 user context
- Rate limits: 50 requests per 15 minutes
