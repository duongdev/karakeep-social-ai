# Reddit Adapter

## Status
⏳ **Planned** - Implementation in Phase 2 (Week 4)

## Authentication
- **Type**: OAuth 2.0
- **Required Scopes**: `history`, `read`, `identity`

## Features
- [ ] Fetch saved posts and comments
- [ ] Parse submission and comment data
- [ ] Handle pagination
- [ ] Subreddit filtering

## API Documentation
- [Reddit API OAuth2](https://github.com/reddit-archive/reddit/wiki/OAuth2)
- [Saved Posts Endpoint](https://www.reddit.com/dev/api#GET_user_{username}_saved)

## Implementation Plan
1. Implement OAuth2 flow
2. Create API client
3. Fetch saved posts with pagination
4. Map Reddit data to Post format
5. Write tests

## Notes
- OAuth access tokens valid for 60 minutes
- Need to implement token refresh
- Pagination using 'after' parameter
- Rate limit: 60 requests per minute
