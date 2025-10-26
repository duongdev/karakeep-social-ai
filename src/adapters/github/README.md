# GitHub Adapter

## Status
⏳ **Planned** - Implementation in Phase 2 (Week 4)

## Authentication
- **Type**: Personal Access Token (PAT) / OAuth2
- **Required Scopes**: `repo`, `read:user`

## Features
- [ ] Fetch starred repositories
- [ ] Download README content
- [ ] Extract repository metadata
- [ ] Webhook support for real-time updates
- [ ] Track star timestamps

## API Documentation
- [GitHub REST API - Starring](https://docs.github.com/en/rest/activity/starring)
- [Repository Content API](https://docs.github.com/en/rest/repos/contents)
- [Webhooks](https://docs.github.com/en/webhooks)

## Implementation Plan
1. Create PAT authentication
2. Fetch starred repos with pagination
3. Download README for each repo
4. Map repo data to Post format
5. Implement webhook handling
6. Write tests

## Notes
- Rate limit: 5,000 requests/hour (authenticated)
- Pagination: 100 repos per page (max)
- README download is separate API call
- Webhook support available for real-time updates
