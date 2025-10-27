# Authentication Strategy

> **Last Updated**: 2025-10-26

Complete authentication system for Karakeep using Better Auth with Hono, Prisma, and Next.js.

## Table of Contents

- [Overview](#overview)
- [Why Better Auth?](#why-better-auth)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [Backend Setup (Hono)](#backend-setup-hono)
- [Frontend Setup (Next.js)](#frontend-setup-nextjs)
- [Authentication Flows](#authentication-flows)
- [Session Management](#session-management)
- [Protected Routes](#protected-routes)
- [User Management](#user-management)

## Overview

### Authentication Methods

Karakeep supports multiple authentication methods:

1. **Email & Password** - Traditional signup/login
2. **OAuth Providers** (Future):
   - Google
   - GitHub
   - Twitter/X (for seamless integration with Twitter bookmarks)
3. **Magic Links** (Future) - Passwordless email authentication

### Security Features

- ✅ **Secure Password Hashing**: Using bcrypt
- ✅ **Session-Based Auth**: Cookies with httpOnly flag
- ✅ **CSRF Protection**: Built into Better Auth
- ✅ **Rate Limiting**: Prevent brute force attacks
- ✅ **Email Verification**: Optional email confirmation
- ✅ **Password Reset**: Secure password recovery

## Why Better Auth?

### vs NextAuth/Auth.js

| Feature | Better Auth | NextAuth/Auth.js |
|---------|-------------|------------------|
| **Setup Complexity** | Simple | Complex |
| **Type Safety** | Excellent | Good |
| **Hono Integration** | Official | Manual |
| **DX** | Modern, intuitive | Older API |
| **Documentation** | Clear | Sometimes confusing |
| **Session Management** | Built-in | Requires JWT or database |
| **Middleware** | Clean API | Complex with Next.js 15 |

### Key Advantages

✅ **Works with our stack**: Hono + Prisma + Next.js
✅ **Type-safe by default**: Full TypeScript support
✅ **Database sessions**: Uses Prisma for session storage
✅ **Simple API**: Easy to understand and implement
✅ **Active development**: Modern, well-maintained
✅ **RPC-friendly**: Works perfectly with Hono RPC

## Architecture

### Component Flow

```
┌─────────────────┐
│   Next.js UI    │
│  (Frontend)     │
└────────┬────────┘
         │
         ├─ /auth/login → Better Auth Client
         ├─ /auth/signup → Better Auth Client
         └─ API calls → Hono RPC (with session cookie)
         │
         ↓
┌─────────────────┐
│   Hono API      │
│   (Backend)     │
└────────┬────────┘
         │
         ├─ /api/auth/* → Better Auth Handler
         ├─ auth middleware → Validates session
         └─ Protected routes → Requires auth
         │
         ↓
┌─────────────────┐
│   PostgreSQL    │
│   (Prisma)      │
└─────────────────┘
    ├─ user table
    ├─ session table
    └─ account table
```

### Request Flow Example

```
1. User submits login form (Next.js)
   ↓
2. POST /api/auth/sign-in/email (Better Auth)
   ↓
3. Better Auth validates credentials
   ↓
4. Creates session in database (Prisma)
   ↓
5. Returns session cookie (httpOnly, secure)
   ↓
6. Frontend stores cookie automatically
   ↓
7. User makes API call to /api/bookmarks
   ↓
8. Cookie sent automatically with request
   ↓
9. Hono middleware validates session
   ↓
10. User data available in c.get('user')
```

## Database Schema

### Prisma Schema Updates

Add these models to `prisma/schema.prisma`:

```prisma
// User authentication
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  emailVerified Boolean   @default(false)
  name          String?
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relations
  sessions      Session[]
  accounts      Account[] // Social accounts (Twitter, Reddit, etc.)

  @@map("users")
}

// Better Auth session management
model Session {
  id        String   @id @default(cuid())
  userId    String
  expiresAt DateTime
  token     String   @unique
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([token])
  @@map("sessions")
}

// Update existing Account model to include userId
model Account {
  id               String   @id @default(cuid())
  userId           String   // Link to user
  platform         String   // twitter, reddit, github, etc.
  username         String
  credentials      Json     // Encrypted credentials
  status           String   @default("connected")
  lastSyncAt       DateTime?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  // Relations
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  bookmarks Bookmark[]
  syncJobs  SyncJob[]

  @@unique([userId, platform])
  @@index([userId])
  @@index([platform])
  @@map("accounts")
}
```

### Migration

```bash
npx prisma migrate dev --name add-authentication
npx prisma generate
```

## Backend Setup (Hono)

### 1. Install Better Auth

```bash
npm install better-auth
```

### 2. Create Auth Configuration

**`src/lib/auth.ts`**:
```typescript
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from './db'

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true in production
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },

  advanced: {
    cookiePrefix: 'karakeep',
    crossSubDomainCookies: {
      enabled: true,
    },
  },
})

export type Session = typeof auth.$Infer.Session
```

### 3. Mount Auth Handler in Hono

**`src/index.ts`**:
```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { auth } from './lib/auth'
import accountsRoute from './routes/accounts'
import bookmarksRoute from './routes/bookmarks'

const app = new Hono()

// CORS (must be before routes)
app.use('/*', cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true, // Important for cookies!
}))

// Mount Better Auth handler
// Handles /api/auth/sign-in, /api/auth/sign-up, etc.
app.on(['POST', 'GET'], '/api/auth/**', (c) => {
  return auth.handler(c.req.raw)
})

// Auth middleware for protected routes
app.use('/api/*', async (c, next) => {
  // Skip auth routes
  if (c.req.path.startsWith('/api/auth')) {
    return next()
  }

  // Get session from cookie
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  })

  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  // Store user in context
  c.set('user', session.user)
  c.set('session', session.session)

  return next()
})

// Protected API routes
const apiRoutes = app
  .basePath('/api')
  .route('/accounts', accountsRoute)
  .route('/bookmarks', bookmarksRoute)

export type AppType = typeof apiRoutes
export default app
```

### 4. Use User in Routes

**`src/routes/accounts.ts`**:
```typescript
import { Hono } from 'hono'
import { prisma } from '@/lib/db'

const accountsRoute = new Hono()

accountsRoute.get('/', async (c) => {
  // Get authenticated user from context
  const user = c.get('user')

  // Fetch only this user's accounts
  const accounts = await prisma.account.findMany({
    where: { userId: user.id },
  })

  return c.json({ accounts })
})

accountsRoute.post('/', async (c) => {
  const user = c.get('user')
  const data = await c.req.json()

  // Create account for authenticated user
  const account = await prisma.account.create({
    data: {
      userId: user.id,
      platform: data.platform,
      username: data.username,
      credentials: data.credentials,
    },
  })

  return c.json({ account }, 201)
})

export default accountsRoute
```

## Frontend Setup (Next.js)

### 1. Install Better Auth Client

```bash
cd web
npm install better-auth
```

### 2. Create Auth Client

**`web/lib/auth-client.ts`**:
```typescript
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
})

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  useUser,
} = authClient
```

### 3. Add Auth Provider

**`web/app/providers.tsx`**:
```typescript
'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/query-client'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

### 4. Create Auth Pages

**`web/app/(auth)/login/page.tsx`**:
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await signIn.email({
        email,
        password,
      })

      toast.success('Logged in successfully!')
      router.push('/dashboard')
    } catch (error) {
      toast.error('Invalid email or password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground">
            Sign in to your Karakeep account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <p className="text-center text-sm">
          Don't have an account?{' '}
          <a href="/signup" className="text-primary hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </div>
  )
}
```

**`web/app/(auth)/signup/page.tsx`**:
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signUp } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await signUp.email({
        name,
        email,
        password,
      })

      toast.success('Account created successfully!')
      router.push('/dashboard')
    } catch (error) {
      toast.error('Failed to create account')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Create an account</h1>
          <p className="text-muted-foreground">
            Start managing your social bookmarks
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            <p className="text-xs text-muted-foreground">
              Must be at least 8 characters
            </p>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Creating account...' : 'Create account'}
          </Button>
        </form>

        <p className="text-center text-sm">
          Already have an account?{' '}
          <a href="/login" className="text-primary hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  )
}
```

## Protected Routes

### 1. Create Auth Guard

**`web/components/auth/auth-guard.tsx`**:
```typescript
'use client'

import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/auth-client'
import { useEffect } from 'react'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { data: session, isPending } = useSession()

  useEffect(() => {
    if (!isPending && !session) {
      router.push('/login')
    }
  }, [session, isPending, router])

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return <>{children}</>
}
```

### 2. Protect Dashboard Layout

**`web/app/(dashboard)/layout.tsx`**:
```typescript
import { AuthGuard } from '@/components/auth/auth-guard'
import { Sidebar } from '@/components/layout/sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </AuthGuard>
  )
}
```

### 3. Use Session in Components

**`web/app/(dashboard)/page.tsx`**:
```typescript
'use client'

import { useUser } from '@/lib/auth-client'
import { useAccounts } from '@/lib/hooks/use-accounts'

export default function DashboardPage() {
  const { data: user } = useUser()
  const { data: accounts } = useAccounts()

  return (
    <div>
      <h1 className="text-2xl font-bold">
        Welcome, {user?.name}!
      </h1>

      <div className="mt-8">
        <h2 className="text-xl">Your Accounts</h2>
        <p className="text-muted-foreground">
          {accounts?.accounts.length || 0} connected
        </p>
      </div>
    </div>
  )
}
```

## Session Management

### Check Session Status

```typescript
import { useSession } from '@/lib/auth-client'

function MyComponent() {
  const { data: session, isPending } = useSession()

  if (isPending) return <div>Loading...</div>
  if (!session) return <div>Not logged in</div>

  return <div>Logged in as {session.user.email}</div>
}
```

### Sign Out

```typescript
import { signOut } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'

function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    await signOut()
    router.push('/login')
  }

  return <button onClick={handleLogout}>Sign out</button>
}
```

## User Management

### Get Current User

**Frontend**:
```typescript
const { data: user } = useUser()
console.log(user?.email, user?.name)
```

**Backend**:
```typescript
app.get('/api/me', async (c) => {
  const user = c.get('user')
  return c.json({ user })
})
```

### Update User Profile

```typescript
app.patch('/api/user', async (c) => {
  const user = c.get('user')
  const { name } = await c.req.json()

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { name },
  })

  return c.json({ user: updated })
})
```

## Security Best Practices

### 1. Environment Variables

```env
# .env
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=<generate-random-secret>
BETTER_AUTH_URL=https://your-app.vercel.app
FRONTEND_URL=https://your-app.vercel.app
```

### 2. Rate Limiting

Add to Hono middleware:
```typescript
import { rateLimiter } from 'hono-rate-limiter'

app.use('/api/auth/*', rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
}))
```

### 3. CSRF Protection

Better Auth has built-in CSRF protection. Ensure cookies are set correctly:
```typescript
{
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
}
```

## Future Enhancements

### OAuth Providers

Add Google, GitHub, Twitter:

```typescript
export const auth = betterAuth({
  // ... existing config

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
})
```

### Email Verification

```typescript
emailAndPassword: {
  enabled: true,
  requireEmailVerification: true,
  sendVerificationEmail: async ({ user, token }) => {
    // Send verification email
    await sendEmail({
      to: user.email,
      subject: 'Verify your email',
      html: `<a href="${process.env.APP_URL}/verify-email?token=${token}">Verify</a>`,
    })
  },
}
```

### Two-Factor Authentication

```typescript
import { twoFactor } from 'better-auth/plugins'

export const auth = betterAuth({
  // ... existing config
  plugins: [twoFactor()],
})
```

## Related Documentation

- [Hono RPC Integration](./hono-rpc-integration.md)
- [Web Dashboard Plan](./web-dashboard-plan.md)
- [Database Schema](../architecture/database-schema.md)

## Resources

- [Better Auth Documentation](https://www.better-auth.com/)
- [Better Auth + Hono Guide](https://www.better-auth.com/docs/integrations/hono)
- [Better Auth + Next.js Guide](https://www.better-auth.com/docs/integrations/next)

---

**Ready to implement?** Start with database migrations, then set up Better Auth! 🔐
