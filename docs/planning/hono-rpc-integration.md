# Hono RPC Integration Guide

> **Last Updated**: 2025-10-26

Complete guide for integrating Hono RPC with Next.js frontend for end-to-end type safety between your Hono API and Next.js dashboard.

## Table of Contents

- [Why Hono RPC?](#why-hono-rpc)
- [Architecture Overview](#architecture-overview)
- [Server Setup](#server-setup)
- [Client Setup](#client-setup)
- [React Query Integration](#react-query-integration)
- [Type Inference](#type-inference)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [Complete Examples](#complete-examples)

## Why Hono RPC?

### Benefits Over Traditional REST API Client

**Traditional Approach** (manual API client):
```typescript
// ❌ No type safety
const response = await fetch('/api/accounts')
const data = await response.json() // any type!
```

**Hono RPC Approach**:
```typescript
// ✅ Full type safety!
const response = await client.api.accounts.$get()
const data = await response.json() // Account[] - fully typed!
```

### Key Advantages

✅ **End-to-End Type Safety**: Types flow from backend to frontend automatically
✅ **No Manual Type Definitions**: Don't duplicate types - infer from backend
✅ **IntelliSense Support**: Full autocomplete for endpoints, parameters, responses
✅ **Compile-Time Safety**: Catch API mismatches before runtime
✅ **Zod Integration**: Share validation schemas between backend and frontend
✅ **React Query Compatible**: Works seamlessly with TanStack Query
✅ **Zero Runtime Overhead**: Type safety is compile-time only

## Architecture Overview

### Monorepo Structure with RPC

```
karakeep-social-ai/
├── src/                    # Backend (Hono API)
│   ├── routes/
│   │   ├── accounts.ts    # Export route types
│   │   ├── bookmarks.ts
│   │   └── sync.ts
│   └── index.ts           # Export AppType
│
├── web/                   # Frontend (Next.js)
│   ├── lib/
│   │   ├── api.ts        # Hono RPC client
│   │   └── hooks/        # React Query hooks
│   └── app/
│
└── tsconfig.json          # Shared TypeScript config
```

### How It Works

1. **Backend**: Export Hono app type with all routes
2. **Frontend**: Import app type and create typed client
3. **TypeScript**: Infers all request/response types
4. **React Query**: Use typed client in hooks

## Server Setup

### 1. Install Hono RPC Dependencies

```bash
npm install hono zod @hono/zod-validator
```

### 2. Create Typed Routes

**`src/routes/accounts.ts`**:
```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { prisma } from '@/lib/db'

// Zod schemas for validation AND type inference
const createAccountSchema = z.object({
  platform: z.enum(['twitter', 'reddit', 'github']),
  username: z.string().min(1),
  credentials: z.record(z.string()),
})

const accountsRoute = new Hono()
  // List accounts
  .get('/', async (c) => {
    const accounts = await prisma.account.findMany({
      select: {
        id: true,
        platform: true,
        username: true,
        status: true,
        lastSyncAt: true,
        createdAt: true,
      },
    })

    return c.json({ accounts })
  })

  // Get single account
  .get('/:id', async (c) => {
    const id = c.req.param('id')

    const account = await prisma.account.findUnique({
      where: { id },
    })

    if (!account) {
      return c.json({ error: 'Account not found' }, 404)
    }

    return c.json({ account })
  })

  // Create account
  .post(
    '/',
    zValidator('json', createAccountSchema),
    async (c) => {
      const data = c.req.valid('json')

      const account = await prisma.account.create({
        data: {
          platform: data.platform,
          username: data.username,
          credentials: data.credentials,
          status: 'connected',
        },
      })

      return c.json({ account }, 201)
    }
  )

  // Delete account
  .delete('/:id', async (c) => {
    const id = c.req.param('id')

    await prisma.account.delete({
      where: { id },
    })

    return c.json({ success: true })
  })

export default accountsRoute
```

**`src/routes/bookmarks.ts`**:
```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const bookmarkFiltersSchema = z.object({
  platform: z.enum(['twitter', 'reddit', 'github']).optional(),
  since: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
})

const bookmarksRoute = new Hono()
  // List bookmarks with filters
  .get(
    '/',
    zValidator('query', bookmarkFiltersSchema),
    async (c) => {
      const filters = c.req.valid('query')

      const bookmarks = await prisma.bookmark.findMany({
        where: {
          ...(filters.platform && { platform: filters.platform }),
          ...(filters.since && { savedAt: { gte: new Date(filters.since) } }),
        },
        take: filters.limit,
        skip: filters.offset,
        orderBy: { savedAt: 'desc' },
      })

      return c.json({ bookmarks })
    }
  )

  // Get single bookmark
  .get('/:id', async (c) => {
    const id = c.req.param('id')

    const bookmark = await prisma.bookmark.findUnique({
      where: { id },
      include: {
        aiAnalysis: true,
        tags: { include: { tag: true } },
      },
    })

    if (!bookmark) {
      return c.json({ error: 'Bookmark not found' }, 404)
    }

    return c.json({ bookmark })
  })

export default bookmarksRoute
```

**`src/routes/sync.ts`**:
```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const triggerSyncSchema = z.object({
  accountId: z.string().uuid().optional(),
  platform: z.enum(['twitter', 'reddit', 'github']).optional(),
})

const syncRoute = new Hono()
  // Trigger sync
  .post(
    '/trigger',
    zValidator('json', triggerSyncSchema),
    async (c) => {
      const data = c.req.valid('json')

      // Queue sync job
      // ... implementation

      return c.json({
        success: true,
        jobId: 'job_123',
        message: 'Sync started'
      })
    }
  )

  // Get sync status
  .get('/status/:accountId', async (c) => {
    const accountId = c.req.param('accountId')

    // Get latest sync job
    // ... implementation

    return c.json({
      accountId,
      status: 'completed',
      lastSyncAt: new Date().toISOString(),
      bookmarksCount: 247,
      newBookmarks: 5,
    })
  })

export default syncRoute
```

### 3. Compose Routes and Export AppType

**`src/index.ts`**:
```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import accountsRoute from './routes/accounts'
import bookmarksRoute from './routes/bookmarks'
import syncRoute from './routes/sync'

const app = new Hono()

// Middleware
app.use('/*', cors())

// Routes
const apiRoutes = app.basePath('/api')
  .route('/accounts', accountsRoute)
  .route('/bookmarks', bookmarksRoute)
  .route('/sync', syncRoute)

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }))

// Export AppType for RPC client
export type AppType = typeof apiRoutes

export default app
```

## Client Setup

### 1. Install Client Dependencies

```bash
cd web
npm install hono
```

### 2. Create RPC Client

**`web/lib/api.ts`**:
```typescript
import { hc } from 'hono/client'
import type { AppType } from '@/../../src/index' // Import from backend

// Create typed client
export const client = hc<AppType>(
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
)

// Export for convenience
export const api = client.api

// Type helpers
export type { InferRequestType, InferResponseType } from 'hono'
```

### 3. TypeScript Configuration

**Root `tsconfig.json`**:
```json
{
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./src/*"],
      "@web/*": ["./web/*"]
    }
  },
  "include": ["src/**/*", "web/**/*"]
}
```

**`web/tsconfig.json`**:
```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@/../../src/*": ["../src/*"]  // Reference backend
    }
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "references": [
    { "path": "../tsconfig.json" }
  ]
}
```

## React Query Integration

### 1. Setup Query Client

**`web/lib/query-client.ts`**:
```typescript
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
})
```

**`web/app/providers.tsx`**:
```typescript
'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/lib/query-client'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

### 2. Create Typed Hooks

**`web/lib/hooks/use-accounts.ts`**:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { InferRequestType, InferResponseType } from 'hono'

// Type inference from RPC!
type AccountsResponse = InferResponseType<typeof api.accounts.$get>
type CreateAccountInput = InferRequestType<typeof api.accounts.$post>['json']

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await api.accounts.$get()
      if (!res.ok) {
        throw new Error('Failed to fetch accounts')
      }
      return res.json()
    },
  })
}

export function useAccount(id: string) {
  return useQuery({
    queryKey: ['accounts', id],
    queryFn: async () => {
      const res = await api.accounts[':id'].$get({
        param: { id },
      })
      if (!res.ok) {
        throw new Error('Failed to fetch account')
      }
      return res.json()
    },
    enabled: !!id,
  })
}

export function useCreateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateAccountInput) => {
      const res = await api.accounts.$post({
        json: data,
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create account')
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}

export function useDeleteAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.accounts[':id'].$delete({
        param: { id },
      })

      if (!res.ok) {
        throw new Error('Failed to delete account')
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}
```

**`web/lib/hooks/use-bookmarks.ts`**:
```typescript
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { InferRequestType } from 'hono'

type BookmarkFilters = InferRequestType<typeof api.bookmarks.$get>['query']

export function useBookmarks(filters?: BookmarkFilters) {
  return useQuery({
    queryKey: ['bookmarks', filters],
    queryFn: async () => {
      const res = await api.bookmarks.$get({
        query: filters,
      })

      if (!res.ok) {
        throw new Error('Failed to fetch bookmarks')
      }

      return res.json()
    },
  })
}

export function useBookmark(id: string) {
  return useQuery({
    queryKey: ['bookmarks', id],
    queryFn: async () => {
      const res = await api.bookmarks[':id'].$get({
        param: { id },
      })

      if (!res.ok) {
        throw new Error('Failed to fetch bookmark')
      }

      return res.json()
    },
    enabled: !!id,
  })
}
```

**`web/lib/hooks/use-sync.ts`**:
```typescript
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { InferRequestType } from 'hono'

type TriggerSyncInput = InferRequestType<typeof api.sync.trigger.$post>['json']

export function useTriggerSync() {
  return useMutation({
    mutationFn: async (data?: TriggerSyncInput) => {
      const res = await api.sync.trigger.$post({
        json: data || {},
      })

      if (!res.ok) {
        throw new Error('Failed to trigger sync')
      }

      return res.json()
    },
  })
}

export function useSyncStatus(accountId: string) {
  return useQuery({
    queryKey: ['sync-status', accountId],
    queryFn: async () => {
      const res = await api.sync.status[':accountId'].$get({
        param: { accountId },
      })

      if (!res.ok) {
        throw new Error('Failed to fetch sync status')
      }

      return res.json()
    },
    enabled: !!accountId,
    refetchInterval: 5000, // Poll every 5 seconds
  })
}
```

## Type Inference

### Automatic Type Inference

Hono RPC automatically infers:

1. **Request Types** (from validators):
```typescript
// Backend with zValidator
.post('/', zValidator('json', z.object({
  title: z.string(),
  body: z.string()
})), ...)

// Frontend - TypeScript knows the shape!
await api.posts.$post({
  json: {
    title: 'Hello',  // ✅ Typed!
    body: 'World',   // ✅ Typed!
    // invalid: 'field'  // ❌ Type error!
  }
})
```

2. **Response Types** (from `c.json()`):
```typescript
// Backend
return c.json({ accounts: [...] })

// Frontend
const res = await api.accounts.$get()
const data = await res.json()
// data.accounts is automatically typed as Account[]!
```

3. **Status Codes**:
```typescript
// Backend
return c.json({ error: 'Not found' }, 404)

// Frontend
const res = await api.accounts[':id'].$get({ param: { id } })
if (res.status === 404) {
  // TypeScript knows response is { error: string }
}
```

### Using Type Helpers

**`InferRequestType`**:
```typescript
import type { InferRequestType } from 'hono'

// Extract request type from route
type CreateAccountRequest = InferRequestType<typeof api.accounts.$post>

// Use in component
function AddAccountForm() {
  const [formData, setFormData] = useState<CreateAccountRequest['json']>({
    platform: 'twitter',
    username: '',
    credentials: {},
  })

  // ...
}
```

**`InferResponseType`**:
```typescript
import type { InferResponseType } from 'hono'

// Extract response type from route
type AccountsResponse = InferResponseType<typeof api.accounts.$get>

// Use in component
function AccountsList() {
  const { data } = useAccounts()
  // data is typed as AccountsResponse

  return (
    <div>
      {data?.accounts.map((account) => (
        <div key={account.id}>{account.username}</div>
      ))}
    </div>
  )
}
```

## Error Handling

### Pattern 1: Try-Catch in Components

```typescript
'use client'

import { useCreateAccount } from '@/lib/hooks/use-accounts'
import { toast } from 'sonner'

export function AddAccountButton() {
  const createAccount = useCreateAccount()

  const handleAdd = async () => {
    try {
      await createAccount.mutateAsync({
        platform: 'twitter',
        username: 'example',
        credentials: { token: 'xxx' },
      })

      toast.success('Account added successfully!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add account')
    }
  }

  return (
    <button onClick={handleAdd} disabled={createAccount.isPending}>
      {createAccount.isPending ? 'Adding...' : 'Add Account'}
    </button>
  )
}
```

### Pattern 2: React Query Error Handling

```typescript
export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await api.accounts.$get()

      if (!res.ok) {
        // Parse error from backend
        const error = await res.json()
        throw new Error(error.error || 'Failed to fetch accounts')
      }

      return res.json()
    },
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors
      if (error.message.includes('404')) return false
      return failureCount < 3
    },
  })
}
```

### Pattern 3: Type-Safe Error Wrapper

**`web/lib/api-wrapper.ts`**:
```typescript
type ApiResult<T> =
  | { data: T; error: null }
  | { data: null; error: string }

export async function apiCall<T>(
  promise: Promise<Response>
): Promise<ApiResult<T>> {
  try {
    const res = await promise

    if (!res.ok) {
      const error = await res.json()
      return {
        data: null,
        error: error.error || `Request failed with status ${res.status}`,
      }
    }

    const data = await res.json()
    return { data: data as T, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Usage in hooks
export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const result = await apiCall(api.accounts.$get())

      if (result.error) {
        throw new Error(result.error)
      }

      return result.data
    },
  })
}
```

## Best Practices

### 1. Use Zod for Validation

✅ **Do**: Use Zod validators on backend
```typescript
.post('/', zValidator('json', createAccountSchema), ...)
```

❌ **Don't**: Skip validation
```typescript
.post('/', (c) => {
  const body = c.req.json() // No validation!
})
```

### 2. Always Return `c.json()` with Status

✅ **Do**: Explicit status codes
```typescript
return c.json({ account }, 201)
return c.json({ error: 'Not found' }, 404)
```

❌ **Don't**: Use `c.notFound()`
```typescript
return c.notFound() // Won't infer correctly in RPC
```

### 3. Export Specific Routes, Not Entire App

✅ **Do**: Export only API routes
```typescript
const apiRoutes = app.basePath('/api').route(...)
export type AppType = typeof apiRoutes
```

❌ **Don't**: Export app with non-API routes
```typescript
export type AppType = typeof app // Includes all routes
```

### 4. Use Type Helpers for Reusability

✅ **Do**: Extract types with `InferRequestType`/`InferResponseType`
```typescript
type CreateAccountInput = InferRequestType<typeof api.accounts.$post>['json']
```

❌ **Don't**: Manually define types
```typescript
type CreateAccountInput = {
  platform: string
  username: string
  // Duplicate definition!
}
```

### 5. Handle Errors Gracefully

✅ **Do**: Check response status
```typescript
const res = await api.accounts.$get()
if (!res.ok) {
  throw new Error('Failed to fetch')
}
return res.json()
```

❌ **Don't**: Assume success
```typescript
const res = await api.accounts.$get()
return res.json() // Might be error response!
```

### 6. Use Query Keys Consistently

✅ **Do**: Structured query keys
```typescript
queryKey: ['accounts']
queryKey: ['accounts', id]
queryKey: ['bookmarks', filters]
```

❌ **Don't**: Random keys
```typescript
queryKey: ['data']
queryKey: ['fetch-accounts']
```

## Complete Examples

### Example 1: Accounts Page

**`web/app/(dashboard)/accounts/page.tsx`**:
```typescript
'use client'

import { useAccounts, useDeleteAccount } from '@/lib/hooks/use-accounts'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'

export default function AccountsPage() {
  const { data, isLoading, error } = useAccounts()
  const deleteAccount = useDeleteAccount()

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Connected Accounts</h1>

      <div className="grid gap-4">
        {data?.accounts.map((account) => (
          <Card key={account.id} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{account.username}</h3>
                <p className="text-sm text-muted-foreground">
                  {account.platform}
                </p>
                {account.lastSyncAt && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Last synced: {new Date(account.lastSyncAt).toLocaleString()}
                  </p>
                )}
              </div>

              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  try {
                    await deleteAccount.mutateAsync(account.id)
                    toast.success('Account removed')
                  } catch (error) {
                    toast.error('Failed to remove account')
                  }
                }}
                disabled={deleteAccount.isPending}
              >
                Remove
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

### Example 2: Bookmarks with Filters

**`web/app/(dashboard)/bookmarks/page.tsx`**:
```typescript
'use client'

import { useState } from 'react'
import { useBookmarks } from '@/lib/hooks/use-bookmarks'
import { Select } from '@/components/ui/select'

export default function BookmarksPage() {
  const [filters, setFilters] = useState({
    platform: undefined as 'twitter' | 'reddit' | undefined,
    limit: 20,
    offset: 0,
  })

  const { data, isLoading } = useBookmarks(filters)

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Select
          value={filters.platform}
          onValueChange={(platform) =>
            setFilters({ ...filters, platform: platform as any, offset: 0 })
          }
        >
          <option value="">All Platforms</option>
          <option value="twitter">Twitter</option>
          <option value="reddit">Reddit</option>
        </Select>
      </div>

      {isLoading && <div>Loading...</div>}

      <div className="grid gap-4">
        {data?.bookmarks.map((bookmark) => (
          <Card key={bookmark.id} className="p-4">
            <h3 className="font-semibold">{bookmark.title || 'Untitled'}</h3>
            <p className="text-sm text-muted-foreground mt-2">
              {bookmark.content.substring(0, 200)}...
            </p>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex gap-2">
        <Button
          onClick={() => setFilters({ ...filters, offset: filters.offset - filters.limit })}
          disabled={filters.offset === 0}
        >
          Previous
        </Button>
        <Button
          onClick={() => setFilters({ ...filters, offset: filters.offset + filters.limit })}
          disabled={!data || data.bookmarks.length < filters.limit}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
```

### Example 3: Sync with Real-time Status

**`web/components/sync-button.tsx`**:
```typescript
'use client'

import { useTriggerSync, useSyncStatus } from '@/lib/hooks/use-sync'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useState } from 'react'

interface SyncButtonProps {
  accountId?: string
}

export function SyncButton({ accountId }: SyncButtonProps) {
  const [jobId, setJobId] = useState<string | null>(null)
  const triggerSync = useTriggerSync()

  // Poll sync status if we have a job running
  const { data: status } = useSyncStatus(accountId || '', {
    enabled: !!accountId && !!jobId,
  })

  const handleSync = async () => {
    try {
      const result = await triggerSync.mutateAsync(
        accountId ? { accountId } : undefined
      )

      setJobId(result.jobId)
      toast.success(result.message)
    } catch (error) {
      toast.error('Failed to start sync')
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleSync}
        disabled={triggerSync.isPending}
      >
        {triggerSync.isPending ? 'Starting...' : 'Sync Now'}
      </Button>

      {status && (
        <span className="text-sm text-muted-foreground">
          Status: {status.status} ({status.newBookmarks} new)
        </span>
      )}
    </div>
  )
}
```

## Performance Considerations

### 1. Split Large Apps

If your app has many routes, split into smaller modules:

```typescript
// Don't export entire app
export type AppType = typeof app // ❌ Slow with many routes

// Export specific route groups
const apiRoutes = app.basePath('/api')
  .route('/accounts', accountsRoute)
  .route('/bookmarks', bookmarksRoute)

export type AppType = typeof apiRoutes // ✅ Faster
```

### 2. Use Build-Time Type Generation

For very large apps, consider generating types at build time:

```bash
# In your build script
npm run build:api && npm run build:web
```

### 3. Optimize Query Keys

Use structured query keys for better invalidation:

```typescript
// ✅ Good - specific invalidation
queryClient.invalidateQueries({ queryKey: ['accounts'] })
queryClient.invalidateQueries({ queryKey: ['accounts', id] })

// ❌ Bad - invalidates everything
queryClient.invalidateQueries()
```

## Related Documentation

- [Web Dashboard Plan](./web-dashboard-plan.md)
- [Platform Getting Started](../platforms/getting-started.md)
- [System Architecture](../architecture/system-design.md)

## Resources

- [Hono RPC Official Docs](https://hono.dev/docs/guides/rpc)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Zod Documentation](https://zod.dev/)

---

**Ready to implement?** Start with the server setup, then move to the client! 🚀
