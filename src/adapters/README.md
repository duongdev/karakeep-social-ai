# Platform Adapters

> Modular components for connecting Karakeep to social platforms

## Overview

This directory contains the platform adapter system that enables Karakeep to sync bookmarks from multiple social platforms. Each adapter implements a standardized interface, making it easy to add new platforms without modifying core application code.

## Architecture

```
src/adapters/
├── base.ts              # Base adapter interface and abstract class
├── types.ts             # Shared types for all adapters
├── errors.ts            # Standardized error classes
├── registry.ts          # Adapter registry (Factory pattern)
├── index.ts             # Main export file
├── twitter/             # Twitter/X adapter
├── reddit/              # Reddit adapter
├── github/              # GitHub adapter
├── youtube/             # YouTube adapter
├── tiktok/              # TikTok adapter
├── dribbble/            # Dribbble adapter
├── instagram/           # Instagram adapter
└── facebook/            # Facebook adapter
```

## Core Components

### BaseAdapter

Abstract base class providing common functionality:
- Rate limiting with exponential backoff
- Retry logic for failed requests
- Standardized error handling
- Debug logging
- Credential validation

**Location**: `base.ts`

### Type Definitions

Common types used across all adapters:
- `Post` - Standardized post format
- `AuthType` - Supported authentication methods
- `PaginationCursor` - Pagination handling
- `AdapterConfig` - Adapter configuration options

**Location**: `types.ts`

### Error Handling

Specialized error classes:
- `AdapterError` - Base error class
- `AuthenticationError` - Authentication failures
- `RateLimitError` - Rate limit exceeded
- `ResourceNotFoundError` - 404 errors
- `NetworkError` - Connection issues
- `ServiceUnavailableError` - Platform downtime

**Location**: `errors.ts`

### Adapter Registry

Factory pattern for managing adapters:
- Register new adapters
- Create adapter instances
- Query supported platforms
- Filter by authentication type

**Location**: `registry.ts`

## Usage

### Creating an Adapter Instance

```typescript
import { createAdapter } from '@/adapters'

// Create a Twitter adapter
const adapter = createAdapter('twitter', {
  bearerToken: process.env.TWITTER_BEARER_TOKEN
})

// Fetch saved posts
const posts = await adapter.fetchSavedPosts()
```

### Registering a New Adapter

```typescript
import { adapterRegistry } from '@/adapters'
import { MyPlatformAdapter } from './my-platform'
import { AuthType } from '@/adapters/types'

adapterRegistry.register('my-platform', {
  displayName: 'My Platform',
  description: 'Adapter for My Platform',
  supportedAuthTypes: [AuthType.API_TOKEN],
  requiresWebhookSupport: false,
  adapterClass: MyPlatformAdapter
})
```

## Creating a New Adapter

### 1. Create Directory

```bash
mkdir -p src/adapters/my-platform
```

### 2. Implement Adapter

```typescript
// src/adapters/my-platform/adapter.ts
import { BaseAdapter, type Post, AuthType } from '../base'

export class MyPlatformAdapter extends BaseAdapter {
  readonly platform = 'my-platform'

  async authenticate(credentials: any): Promise<boolean> {
    // Implement authentication
  }

  async fetchSavedPosts(since?: Date): Promise<Post[]> {
    // Fetch and map posts to standard format
  }

  async validateCredentials(): Promise<boolean> {
    return this.authenticate(this.credentials)
  }

  getSupportedAuthTypes(): AuthType[] {
    return [AuthType.API_TOKEN]
  }
}
```

### 3. Export Adapter

```typescript
// src/adapters/my-platform/index.ts
export { MyPlatformAdapter } from './adapter'
```

### 4. Register in Main Index

```typescript
// src/adapters/index.ts
import { MyPlatformAdapter } from './my-platform'

adapterRegistry.register('my-platform', {
  displayName: 'My Platform',
  description: 'My Platform adapter',
  supportedAuthTypes: [AuthType.API_TOKEN],
  requiresWebhookSupport: false,
  adapterClass: MyPlatformAdapter
})
```

### 5. Write Tests

```typescript
// src/__tests__/unit/adapters/my-platform.test.ts
import { MyPlatformAdapter } from '@/adapters/my-platform'

describe('MyPlatformAdapter', () => {
  it('should authenticate successfully', async () => {
    const adapter = new MyPlatformAdapter({ apiToken: 'test' })
    const result = await adapter.authenticate({ apiToken: 'valid' })
    expect(result).toBe(true)
  })
})
```

## Platform Status

| Platform | Status | Priority | Auth Type |
|----------|--------|----------|-----------|
| Twitter/X | ⏳ Planned | High | OAuth2 / Bearer |
| Reddit | ✅ Implemented | High | OAuth2 / Password |
| GitHub | ⏳ Planned | High | PAT / OAuth2 |
| YouTube | ⏳ Planned | Medium | OAuth2 |
| TikTok | ⏳ Planned | Medium | API Token |
| Dribbble | ⏳ Planned | Low | OAuth2 |
| Instagram | ⏳ Planned | Low | Cookie |
| Facebook | ⏳ Planned | Low | OAuth2 |

## Testing

Run adapter tests:

```bash
# All adapter tests
npm run test:unit -- adapters

# Specific adapter
npm run test:unit -- adapters/twitter

# With coverage
npm run test:coverage -- adapters
```

## Documentation

- **Architecture Guide**: [docs/platforms/adapter-architecture.md](../../docs/platforms/adapter-architecture.md)
- **Adding Platforms**: [docs/platforms/adding-platforms.md](../../docs/platforms/adding-platforms.md)
- **Platform-specific guides**: See `src/adapters/{platform}/README.md`

## Best Practices

1. **Always extend BaseAdapter** - Use the common functionality
2. **Handle rate limits** - Respect platform API limits
3. **Implement pagination** - Fetch all posts efficiently
4. **Map data correctly** - Use the standardized `Post` format
5. **Add comprehensive tests** - Test authentication, fetching, error handling
6. **Document auth setup** - Provide clear setup instructions
7. **Use retry logic** - Handle transient failures gracefully

## Support

For questions or issues:
1. Check the [documentation](../../docs/platforms/adapter-architecture.md)
2. Review existing adapter implementations
3. Open an issue on GitHub

---

**Phase 2 - Week 3: Adapter Framework** ✅ **COMPLETED**
