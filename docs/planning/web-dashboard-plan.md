# Karakeep Web Dashboard - Technical Plan

> **Last Updated**: 2025-10-26

Comprehensive plan for building a web dashboard to manage social media connections and bookmarks, deployed alongside the Hono API on Vercel.

## Table of Contents

- [Overview](#overview)
- [Architecture Strategy](#architecture-strategy)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Core Features](#core-features)
- [Implementation Phases](#implementation-phases)
- [Deployment Strategy](#deployment-strategy)
- [Technical Details](#technical-details)

## Overview

### Goals

Build a user-friendly web interface for Karakeep that allows users to:
- Connect and manage social media accounts (Twitter, Reddit, etc.)
- View and search their synced bookmarks
- Configure AI analysis and tagging preferences
- Monitor sync status and history
- Use semantic search and Q&A features

### Constraints

- **Same Project Deployment**: Dashboard and API must deploy together on Vercel
- **Serverless**: Must work within Vercel's serverless constraints
- **Cost-Effective**: Leverage free tier as much as possible
- **Type-Safe**: Full TypeScript throughout
- **Modern Stack**: Use latest Next.js 15 and React 19 features

## Architecture Strategy

### Monorepo Approach (Recommended)

Deploy both Hono API and Next.js dashboard in the same Vercel project:

```
karakeep-social-ai/
├── src/                    # Backend (Hono API)
│   ├── adapters/
│   ├── routes/
│   └── index.ts
├── web/                    # Frontend (Next.js)
│   ├── app/               # App Router
│   ├── components/
│   ├── lib/
│   └── public/
├── api/                    # Vercel API routes (optional proxy)
├── vercel.json            # Vercel configuration
└── package.json
```

### How It Works on Vercel

**Deployment Configuration** (`vercel.json`):

```json
{
  "buildCommand": "npm run build:all",
  "outputDirectory": "web/.next",
  "devCommand": "npm run dev:all",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api-backend/:path*"
    },
    {
      "source": "/:path*",
      "destination": "/web/:path*"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api-backend/$1"
    }
  ]
}
```

### Why This Approach?

✅ **Single Deployment**: One `vercel deploy` for everything
✅ **Shared Environment**: Same environment variables for both
✅ **No CORS Issues**: Same origin for API and frontend
✅ **Simplified Development**: One dev server setup
✅ **Cost-Effective**: Single Vercel project, no multiple deployments
✅ **Type Sharing**: Share TypeScript types between frontend and backend

## Technology Stack

### Frontend

**Framework**:
- **Next.js 15** - Latest App Router with React Server Components
- **React 19** - New compiler, Actions API, and `use()` hook

**UI Components**:
- **shadcn/ui** - Beautiful, accessible component library built on Radix UI
- **Tailwind CSS** - Utility-first styling
- **Lucide Icons** - Modern icon library

**Data Fetching & State**:
- **Hono RPC** - End-to-end type-safe API client ([See guide](./hono-rpc-integration.md))
- **TanStack Query (React Query) v5** - Server state management
- **TanStack Table v8** - Advanced data tables
- **Zustand** - Client state (minimal, if needed)

**Forms & Validation**:
- **React Hook Form** - Form handling
- **Zod** - Runtime validation (shared with backend!)

**Charts & Visualization**:
- **Recharts** - Simple, composable charts
- **Tremor** - Dashboard-specific components

### Backend

**Keep Existing**:
- **Hono** - Fast, lightweight web framework
- **Prisma** - Type-safe ORM
- **TypeScript** - End-to-end type safety

### Shared

- **TypeScript** - Shared types between frontend and backend
- **Zod** - Shared validation schemas
- **ESLint** - Consistent linting rules
- **Prettier** - Code formatting

## Project Structure

```
karakeep-social-ai/
│
├── src/                           # Backend (Hono API)
│   ├── adapters/                 # Platform adapters
│   ├── lib/                      # Database, AI clients
│   ├── routes/                   # API routes
│   ├── services/                 # Business logic
│   ├── index.ts                  # Hono app entry
│   └── types/                    # Backend types
│
├── web/                          # Frontend (Next.js)
│   ├── app/                      # App Router
│   │   ├── (auth)/              # Auth routes
│   │   │   ├── login/
│   │   │   └── signup/
│   │   ├── (dashboard)/         # Protected routes
│   │   │   ├── layout.tsx       # Dashboard layout
│   │   │   ├── page.tsx         # Dashboard home
│   │   │   ├── accounts/        # Social accounts
│   │   │   ├── bookmarks/       # Bookmarks list
│   │   │   ├── search/          # Semantic search
│   │   │   ├── settings/        # User settings
│   │   │   └── ai/              # AI features
│   │   ├── layout.tsx           # Root layout
│   │   └── page.tsx             # Landing page
│   │
│   ├── components/              # React components
│   │   ├── ui/                  # shadcn/ui components
│   │   ├── accounts/            # Account management
│   │   ├── bookmarks/           # Bookmark components
│   │   ├── layout/              # Layout components
│   │   └── shared/              # Shared components
│   │
│   ├── lib/                     # Frontend utilities
│   │   ├── api-client.ts        # API client (fetch wrapper)
│   │   ├── hooks/               # Custom React hooks
│   │   ├── utils.ts             # Utility functions
│   │   └── constants.ts         # Constants
│   │
│   ├── styles/
│   │   └── globals.css          # Global styles
│   │
│   └── public/                  # Static assets
│       ├── icons/
│       └── images/
│
├── shared/                      # Shared between frontend and backend
│   ├── types/                   # Shared TypeScript types
│   │   ├── api.ts              # API request/response types
│   │   ├── models.ts           # Data models
│   │   └── enums.ts            # Shared enums
│   └── schemas/                 # Shared Zod schemas
│       ├── account.ts
│       ├── bookmark.ts
│       └── user.ts
│
├── prisma/
│   └── schema.prisma            # Database schema
│
├── api/                         # Vercel serverless functions (if needed)
│   └── backend/
│       └── [...path].ts         # Proxy to Hono
│
├── vercel.json                  # Vercel config
├── package.json
├── tsconfig.json                # Root TypeScript config
├── next.config.mjs              # Next.js config
└── tailwind.config.ts           # Tailwind config
```

## Core Features

### Phase 1: Account Management (Week 1)

**Pages**:
- Landing page with product overview
- Login/Signup (simple authentication)
- Dashboard home with overview stats

**Account Features**:
- ✅ View connected social accounts
- ✅ Add new account (Twitter, Reddit)
- ✅ Test connection / Re-authenticate
- ✅ Remove account
- ✅ View sync status and last sync time

**Components**:
- Account card with platform icon
- Connection wizard/modal
- Authentication flow (OAuth redirect handling)

### Phase 2: Bookmarks Display (Week 2)

**Pages**:
- Bookmarks list view
- Bookmark detail view
- Filter and search UI

**Bookmark Features**:
- ✅ Browse all bookmarks
- ✅ Filter by platform
- ✅ Filter by date range
- ✅ Sort by saved date, likes, etc.
- ✅ Search by keyword (basic text search)
- ✅ View bookmark details (content, metadata)
- ✅ Media preview (images, videos)
- ✅ Open original URL

**Components**:
- Bookmark card (grid/list view)
- Filter sidebar
- Sort dropdown
- Pagination
- Media viewer/modal

### Phase 3: Sync Management (Week 3)

**Pages**:
- Sync history page
- Sync settings

**Sync Features**:
- ✅ Trigger manual sync (all or specific account)
- ✅ View sync progress (real-time updates)
- ✅ Sync history and logs
- ✅ Configure auto-sync schedule
- ✅ Error handling and retry

**Components**:
- Sync button with loading state
- Progress indicator
- Sync history table
- Error alerts

### Phase 4: AI Features (Week 4)

**Pages**:
- Semantic search page
- Q&A interface
- AI settings

**AI Features**:
- ✅ Semantic search UI
- ✅ Q&A chat interface
- ✅ View AI-generated summaries
- ✅ View auto-tags
- ✅ Configure AI preferences
- ✅ Batch analyze bookmarks

**Components**:
- Search input with suggestions
- Chat interface
- Tag chips
- Summary cards
- Settings form

### Phase 5: Advanced Features (Future)

- Lists/Collections management
- Export bookmarks (JSON, CSV)
- Bookmark annotations/notes
- Sharing bookmarks
- Analytics dashboard
- Mobile responsive design
- Dark mode
- Notifications

## Implementation Phases

### Phase 1: Project Setup (Days 1-2)

**Tasks**:
1. Set up Next.js in `/web` directory
2. Install and configure shadcn/ui
3. Set up TanStack Query
4. Configure Tailwind CSS
5. Set up shared types in `/shared`
6. Configure Vercel deployment
7. Set up development scripts

**Deliverables**:
- Working Next.js app alongside Hono API
- Basic routing structure
- shadcn/ui components installed
- Deployment pipeline working

### Phase 2: Authentication & Layout (Days 3-5)

**Tasks**:
1. Create authentication pages (login/signup)
2. Implement session management
3. Build dashboard layout with sidebar
4. Create navigation components
5. Set up protected routes

**Deliverables**:
- Login/signup flows
- Protected dashboard
- Responsive layout
- Navigation system

### Phase 3: Account Management (Days 6-10)

**Tasks**:
1. Create accounts list page
2. Build "Add Account" wizard
3. Implement OAuth redirect handling
4. Create account card component
5. Add connection testing
6. Implement account removal

**Deliverables**:
- Full account CRUD
- OAuth flows for Twitter/Reddit
- Account status indicators
- Connection management

### Phase 4: Bookmarks Display (Days 11-15)

**Tasks**:
1. Create bookmarks list page
2. Implement data table with TanStack Table
3. Add filtering and sorting
4. Build bookmark detail view
5. Add media preview
6. Implement pagination

**Deliverables**:
- Bookmarks browser
- Rich filtering/sorting
- Detail views
- Media handling

### Phase 5: Sync Features (Days 16-20)

**Tasks**:
1. Create sync trigger UI
2. Implement real-time sync progress
3. Build sync history page
4. Add error handling UI
5. Create sync settings

**Deliverables**:
- Manual sync controls
- Progress tracking
- History and logs
- Settings management

### Phase 6: AI Integration (Days 21-25)

**Tasks**:
1. Build semantic search UI
2. Create Q&A chat interface
3. Display AI summaries and tags
4. Add AI settings page
5. Implement batch processing UI

**Deliverables**:
- Semantic search
- Q&A interface
- AI content display
- AI configuration

## Deployment Strategy

### Development Environment

```bash
# Install dependencies
npm install

# Run both frontend and backend in development
npm run dev:all
```

`package.json` scripts:
```json
{
  "scripts": {
    "dev:api": "tsx watch src/index.ts",
    "dev:web": "cd web && next dev",
    "dev:all": "concurrently \"npm run dev:api\" \"npm run dev:web\"",
    "build:api": "tsup src/index.ts",
    "build:web": "cd web && next build",
    "build:all": "npm run build:api && npm run build:web",
    "start": "node dist/index.js"
  }
}
```

### Vercel Configuration

**`vercel.json`**:
```json
{
  "version": 2,
  "buildCommand": "npm run build:all",
  "devCommand": "npm run dev:all",
  "installCommand": "npm install",
  "framework": "nextjs",
  "outputDirectory": "web/.next",
  "functions": {
    "api/**/*.ts": {
      "runtime": "nodejs20.x"
    }
  },
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api/:path*"
    }
  ]
}
```

### Environment Variables

Both frontend and backend share the same environment variables on Vercel:

```env
# Database
DATABASE_URL=

# API Keys
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# Authentication
NEXTAUTH_URL=
NEXTAUTH_SECRET=

# Social Platform Credentials
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=

# Optional
REDIS_URL=
SENTRY_DSN=
```

### Deployment Flow

1. **Commit & Push**:
   ```bash
   git add .
   git commit -m "feat: add dashboard"
   git push origin main
   ```

2. **Auto-Deploy**: Vercel automatically builds and deploys

3. **Deployment Structure**:
   - Frontend: `https://karakeep.vercel.app/`
   - API: `https://karakeep.vercel.app/api/*`

## Technical Details

### API Client (Frontend)

**`web/lib/api-client.ts`**:
```typescript
import { z } from 'zod'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api'

class ApiClient {
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }

    return response.json()
  }

  async getAccounts() {
    return this.request<Account[]>('/accounts')
  }

  async addAccount(data: CreateAccountInput) {
    return this.request<Account>('/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getBookmarks(filters?: BookmarkFilters) {
    const params = new URLSearchParams(filters as any)
    return this.request<Bookmark[]>(`/bookmarks?${params}`)
  }

  // ... more methods
}

export const apiClient = new ApiClient()
```

### TanStack Query Setup

**`web/lib/hooks/use-accounts.ts`**:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: () => apiClient.getAccounts(),
  })
}

export function useAddAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: apiClient.addAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}
```

### Shared Types

**`shared/types/api.ts`**:
```typescript
// Shared between frontend and backend
export interface Account {
  id: string
  platform: 'twitter' | 'reddit' | 'github'
  username: string
  status: 'connected' | 'disconnected' | 'error'
  lastSyncAt: Date | null
  createdAt: Date
}

export interface Bookmark {
  id: string
  platform: string
  title: string | null
  content: string
  url: string
  authorName: string
  savedAt: Date
  metadata: Record<string, any>
}

export interface CreateAccountInput {
  platform: string
  username: string
  credentials: Record<string, string>
}
```

### Component Example

**`web/components/accounts/account-card.tsx`**:
```typescript
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Account } from '@shared/types/api'

interface AccountCardProps {
  account: Account
  onRemove: (id: string) => void
}

export function AccountCard({ account, onRemove }: AccountCardProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <PlatformIcon platform={account.platform} />
          <div>
            <h3 className="font-semibold">{account.username}</h3>
            <p className="text-sm text-muted-foreground">
              {account.platform}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={account.status} />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(account.id)}
          >
            Remove
          </Button>
        </div>
      </div>

      {account.lastSyncAt && (
        <p className="mt-4 text-xs text-muted-foreground">
          Last synced: {formatDate(account.lastSyncAt)}
        </p>
      )}
    </Card>
  )
}
```

## Benefits Summary

### For Users
- ✅ **Easy Setup**: Visual interface for connecting accounts
- ✅ **Better UX**: Browse bookmarks with rich filtering
- ✅ **Real-time Updates**: See sync progress live
- ✅ **AI Features**: Interactive search and Q&A
- ✅ **Mobile Friendly**: Responsive design

### For Developers
- ✅ **Type Safety**: End-to-end TypeScript
- ✅ **Shared Code**: Reuse types and validation
- ✅ **Modern Stack**: Latest Next.js and React features
- ✅ **Developer Experience**: Hot reload, great tooling
- ✅ **Easy Deployment**: Single Vercel project

### For Project
- ✅ **Monorepo**: Everything in one place
- ✅ **Cost-Effective**: Free tier friendly
- ✅ **Scalable**: Can grow with features
- ✅ **Maintainable**: Clear architecture
- ✅ **SEO Friendly**: Next.js SSR

## Next Steps

1. **Review & Approve Plan**: Get feedback on architecture
2. **Set Up Project**: Initialize Next.js in `/web`
3. **Install Dependencies**: shadcn/ui, TanStack Query, etc.
4. **Build Phase 1**: Authentication and basic layout
5. **Iterate**: Add features incrementally

## Related Documentation

- **[Hono RPC Integration](./hono-rpc-integration.md)** - Complete guide for type-safe frontend/backend communication
- [System Architecture](../architecture/system-design.md)
- [Platform Getting Started](../platforms/getting-started.md)
- [Vercel Deployment](../deployment/vercel.md)
- [API Endpoints](../api/endpoints.md)

---

**Ready to start building?** Let's create an amazing dashboard! 🚀
