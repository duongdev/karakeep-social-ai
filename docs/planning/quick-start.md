# Quick Start Guide

**Last Updated:** 2025-10-26

Get Karakeep up and running in under 10 minutes.

## Navigation

- [Roadmap](./roadmap.md)
- [Cost Analysis](./cost-analysis.md)
- [System Design](../architecture/system-design.md)
- [Deployment Guide](../deployment/vercel.md)

---

## Prerequisites

- Node.js 20+ installed
- PostgreSQL database (or use cloud provider)
- GitHub account (for deployment)
- API keys:
  - Anthropic (Claude AI)
  - OpenAI (for Whisper transcription)

## Installation

### 1. Clone and Install

```bash
# Clone repository
git clone https://github.com/yourusername/karakeep-social-ai.git
cd karakeep-social-ai

# Install dependencies
npm install
```

### 2. Setup Environment Variables

Create `.env` file:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/karakeep

# AI Services
ANTHROPIC_API_KEY=sk-ant-xxx
CLAUDE_MODEL=claude-3-5-sonnet-20241022
CLAUDE_MAX_TOKENS=4096

# Transcription (optional for video/audio)
OPENAI_API_KEY=sk-proj-xxx
COBALT_API_URL=https://api.cobalt.tools

# Queue (optional for background workers)
REDIS_URL=redis://localhost:6379

# API Security
API_KEY=your-secret-api-key

# Optional
SENTRY_DSN=https://...
```

### 3. Setup Database with Prisma

```bash
# Initialize Prisma
npx prisma init

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Open Prisma Studio (optional - database GUI)
npx prisma studio
```

### 4. Run Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## Quick Test

### 1. Add a Platform Account

```bash
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "platform": "twitter",
    "username": "yourusername",
    "authType": "token",
    "credentials": {
      "token": "your-twitter-token"
    }
  }'
```

### 2. Trigger Manual Sync

```bash
curl -X POST http://localhost:3000/api/sync/trigger \
  -H "Authorization: Bearer your-api-key"
```

### 3. List Bookmarks

```bash
curl http://localhost:3000/api/bookmarks \
  -H "Authorization: Bearer your-api-key"
```

### 4. Test AI Analysis

```bash
# Analyze a bookmark
curl -X POST http://localhost:3000/api/ai/analyze/BOOKMARK_ID \
  -H "Authorization: Bearer your-api-key"
```

### 5. Semantic Search

```bash
curl -X POST http://localhost:3000/api/ai/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "query": "design systems",
    "limit": 10
  }'
```

## Database Management

### Prisma Studio (GUI)

```bash
# Launch database GUI
npx prisma studio
```

Navigate to `http://localhost:5555` to view and edit data.

### Common Prisma Commands

```bash
# Generate Prisma Client after schema changes
npx prisma generate

# Create a new migration
npx prisma migrate dev --name <migration-name>

# Apply migrations in production
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset

# Pull database schema into Prisma schema
npx prisma db pull

# Push schema changes without creating migrations (dev only)
npx prisma db push

# Seed database
npx prisma db seed
```

## Cloud Database Setup

### Option 1: Neon (Recommended - Free Tier)

1. Go to [neon.tech](https://neon.tech)
2. Create new project
3. Copy connection string
4. Update `DATABASE_URL` in `.env`

```env
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/karakeep?sslmode=require
```

### Option 2: Supabase (Free Tier)

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Go to Settings → Database
4. Copy connection string (use "Session pooler" for better performance)
5. Update `DATABASE_URL` in `.env`

```env
DATABASE_URL=postgresql://postgres.xxx:pass@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

### Option 3: Vercel Postgres (Free Tier)

```bash
# Install Vercel CLI
npm install -g vercel

# Link to project
vercel link

# Create Postgres database
vercel postgres create

# Copy connection string to .env
```

## API Keys Setup

### Claude API (Anthropic)

1. Visit [console.anthropic.com](https://console.anthropic.com/)
2. Sign up / Log in
3. Navigate to API Keys
4. Create new API key
5. Copy key to `.env` as `ANTHROPIC_API_KEY`

**Free Tier**: No free tier, but very affordable
**Cost**: $3 per million input tokens, $15 per million output tokens
**Estimate**: ~$0.20 for 100 bookmark analyses

### OpenAI API (for Whisper)

1. Visit [platform.openai.com](https://platform.openai.com/)
2. Sign up / Log in
3. Navigate to API Keys
4. Create new API key
5. Copy key to `.env` as `OPENAI_API_KEY`

**Free Tier**: $5 free credits for new accounts
**Cost**: $0.006 per minute of audio
**Estimate**: ~$2.40 for 30 videos (8 min average)

## Project Structure

```
karakeep-social-ai/
├── src/
│   ├── adapters/          # Platform adapters
│   │   ├── base.ts
│   │   ├── twitter/
│   │   ├── reddit/
│   │   └── github/
│   ├── lib/               # Core utilities
│   │   ├── db.ts          # Prisma client
│   │   ├── claude.ts      # Claude client
│   │   └── queue.ts       # Job queue
│   ├── services/          # Business logic
│   │   ├── ai-processor.ts
│   │   ├── transcription.ts
│   │   ├── search.ts
│   │   └── qa.ts
│   ├── routes/            # API endpoints
│   │   ├── accounts.ts
│   │   ├── bookmarks.ts
│   │   ├── sync.ts
│   │   └── ai.ts
│   └── index.ts           # App entry
├── prisma/
│   └── schema.prisma      # Database schema
├── docs/                  # Documentation
├── .env                   # Environment variables
└── package.json
```

## Development Workflow

### 1. Make Schema Changes

```bash
# Edit prisma/schema.prisma
# Then generate and migrate:
npx prisma generate
npx prisma migrate dev --name your-change-name
```

### 2. Create Platform Adapter

```bash
# Create new adapter folder
mkdir -p src/adapters/platform-name

# Create adapter files
touch src/adapters/platform-name/adapter.ts
touch src/adapters/platform-name/types.ts
```

See [Platform Adapter Guide](../platforms/adapter-architecture.md) for details.

### 3. Test Locally

```bash
# Run dev server
npm run dev

# In another terminal, test endpoints
curl http://localhost:3000/api/bookmarks
```

### 4. Deploy to Vercel

```bash
# Login to Vercel
vercel login

# Deploy
vercel --prod
```

See [Vercel Deployment Guide](../deployment/vercel.md) for details.

## Troubleshooting

### Database Connection Issues

```bash
# Test connection
npx prisma db pull

# Check connection string format
# Should be: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

### Prisma Client Errors

```bash
# Regenerate Prisma Client
npx prisma generate

# Clear node_modules and reinstall
rm -rf node_modules
npm install
```

### API Key Issues

```bash
# Verify .env is loaded
echo $ANTHROPIC_API_KEY

# Test Claude API
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-3-5-sonnet-20241022","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}'
```

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 PID

# Or use different port
PORT=3001 npm run dev
```

## Next Steps

1. **Add Platform Accounts**: Set up your social media accounts
2. **Configure Sync**: Set up cron jobs or manual sync
3. **Enable AI Features**: Configure Claude for analysis
4. **Deploy**: Push to Vercel or Docker

## Related Documentation

- [Implementation Roadmap](./roadmap.md) - 10-week development plan
- [Cost Analysis](./cost-analysis.md) - Detailed cost breakdown
- [System Architecture](../architecture/system-design.md) - Technical overview
- [Database Schema](../architecture/database-schema.md) - Complete schema reference
- [Claude Integration](../ai/claude-setup.md) - AI setup guide
- [Deployment to Vercel](../deployment/vercel.md) - Production deployment

---

**Questions?** Check the [main README](/README.md) or open an issue on GitHub.
