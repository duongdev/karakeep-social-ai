# Getting Started with Karakeep Social AI

Quick guide to get Karakeep up and running on your local machine.

## Prerequisites

- **Node.js** 20+ ([Download](https://nodejs.org/))
- **Docker Desktop** ([Download](https://www.docker.com/products/docker-desktop/))
- **Git** ([Download](https://git-scm.com/))

## Quick Start (5 minutes)

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/karakeep-social-ai.git
cd karakeep-social-ai
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Database Services

```bash
# Start PostgreSQL and Redis with Docker
docker compose up -d

# Check containers are running
docker compose ps
```

### 4. Setup Database

```bash
# Run database migrations
npm run db:migrate

# (Optional) Open Prisma Studio to explore the database
npm run db:studio
```

### 5. Start Development Server

```bash
npm run dev
```

The server will start at **http://localhost:3000**

### 6. Test the API

Open your browser or use curl:

```bash
# Root endpoint
curl http://localhost:3000

# Health check
curl http://localhost:3000/health

# Database health
curl http://localhost:3000/health/db

# API endpoints
curl http://localhost:3000/api
```

## What's Next?

✅ **Phase 1 Complete!** You now have:
- ✅ TypeScript + Hono API running
- ✅ PostgreSQL database with Prisma ORM
- ✅ Redis for job queues
- ✅ Health check endpoints
- ✅ Docker development environment

### Continue with Phase 2: Platform Adapters

Next steps according to the [roadmap](docs/planning/roadmap.md):

1. **Build Platform Adapters** (Week 3-4)
   - Implement Twitter/X adapter
   - Implement Reddit adapter
   - Implement GitHub adapter

2. **Setup Sync Engine** (Week 5)
   - Create sync orchestrator
   - Setup cron jobs
   - Implement manual sync triggers

3. **Add AI Features** (Week 6-7)
   - Integrate Claude API
   - Add video transcription
   - Implement auto-analysis

## Project Structure

```
karakeep-social-ai/
├── src/
│   ├── index.ts              # Main application entry
│   ├── lib/
│   │   ├── db.ts             # Prisma client
│   │   └── env.ts            # Environment config
│   ├── routes/
│   │   └── health.ts         # Health check routes
│   ├── services/             # Business logic (coming soon)
│   ├── middleware/           # Custom middleware (coming soon)
│   └── types/                # TypeScript types
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── migrations/           # Database migrations
├── docs/                     # Comprehensive documentation
├── docker-compose.yml        # Docker services
├── .env                      # Environment variables (local)
├── .env.example              # Environment template
└── package.json              # Dependencies
```

## Available Scripts

```bash
# Development
npm run dev              # Start dev server with hot reload
npm run build            # Build for production
npm start                # Run production build

# Database
npm run db:generate      # Generate Prisma Client
npm run db:migrate       # Create and run migrations
npm run db:studio        # Open Prisma Studio GUI
npm run db:push          # Push schema without migration
npm run db:reset         # Reset database (dev only)

# Docker
docker compose up -d     # Start services
docker compose down      # Stop services
docker compose ps        # Check status
docker compose logs -f   # View logs
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Core (Required)
DATABASE_URL="postgresql://karakeep:karakeep_dev_password@localhost:5432/karakeep_dev"
REDIS_URL="redis://:karakeep_redis_password@localhost:6379"
PORT=3000
NODE_ENV=development

# AI Services (Optional - add when needed)
# ANTHROPIC_API_KEY=sk-ant-api03-xxx
# OPENAI_API_KEY=sk-xxx

# Platform APIs (Optional - add when integrating)
# GITHUB_TOKEN=ghp_xxx
# TWITTER_BEARER_TOKEN=xxx
```

## Development Tools

### Prisma Studio

Visual database browser:

```bash
npm run db:studio
```

Opens at http://localhost:5555

### pgAdmin (Optional)

Start with Docker:

```bash
docker compose --profile tools up -d
```

- **URL**: http://localhost:5050
- **Email**: admin@karakeep.local
- **Password**: admin

### Redis Commander (Optional)

Start with Docker:

```bash
docker compose --profile tools up -d
```

- **URL**: http://localhost:8081

## Troubleshooting

### Port Already in Use

If port 3000, 5432, or 6379 are in use:

**Option 1**: Change ports in `.env` and `docker-compose.yml`

**Option 2**: Kill processes using the ports:
```bash
# macOS/Linux
lsof -ti:3000 | xargs kill -9
```

### Database Connection Failed

```bash
# Check Docker containers
docker compose ps

# Restart containers
docker compose restart postgres

# View logs
docker compose logs postgres
```

### Environment Variables Not Loading

Make sure you have `.env` file in the project root (not just `.env.example`).

```bash
# Copy example if needed
cp .env.example .env
```

## Documentation

- 📖 [Full Documentation](docs/README.md)
- 🏗️ [System Architecture](docs/architecture/system-design.md)
- 🗄️ [Database Schema](docs/architecture/database-schema.md)
- 🚀 [Development Roadmap](docs/planning/roadmap.md)
- 🐳 [Docker Guide](DOCKER.md)

## Need Help?

- 📝 Check the [documentation](docs/README.md)
- 🐛 Open an [issue](https://github.com/yourusername/karakeep-social-ai/issues)
- 💬 Read the [CLAUDE.md](CLAUDE.md) for AI assistant instructions

## What You Built

Congratulations! You've completed **Phase 1, Week 1** of the roadmap:

- ✅ Node.js + TypeScript project initialized
- ✅ Hono API framework configured
- ✅ Prisma ORM with PostgreSQL
- ✅ Docker development environment
- ✅ Health check endpoints
- ✅ Complete database schema
- ✅ Environment configuration
- ✅ Project structure established

**Ready for Phase 2?** Start building platform adapters! 🚀

---

**Happy Coding!** 🎉
