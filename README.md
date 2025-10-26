# Karakeep Social AI

> 🔖 Your AI-powered bookmark manager for social media content

Automatically sync, transcribe, summarize, and search your saved posts from multiple platforms using Claude AI and OpenAI Whisper.

[![Tests](https://img.shields.io/badge/tests-36%2F36%20passing-brightgreen)]() [![Coverage](https://img.shields.io/badge/coverage-~85%25-green)]() [![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)]() [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## 📑 Table of Contents

- [Quick Start](#-quick-start)
- [Features](#-features)
- [Tech Stack](#️-tech-stack)
- [Project Status](#-project-status)
- [Documentation](#-documentation)
- [Development](#-development)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Cost Estimates](#-cost-estimates)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+
- **Docker Desktop** (for PostgreSQL & Redis)
- **Git**

### Installation (5 minutes)

```bash
# 1. Clone and install
git clone https://github.com/yourusername/karakeep-social-ai.git
cd karakeep-social-ai
npm install

# 2. Start database services
docker compose up -d

# 3. Run database migrations
npm run db:migrate

# 4. Start development server
npm run dev
```

✨ **Server running at http://localhost:3000**

📖 **Next steps**:
- [Quick Start Guide](guides/GETTING_STARTED.md) - Full setup
- [Platform Setup](docs/platforms/getting-started.md) - Start syncing Twitter/Reddit 🆕

---

## ✨ Features

### 📱 Multi-Platform Support

**Currently Available:**
- ✅ **Twitter/X** - Bookmarks and saved tweets ([Setup Guide](docs/platforms/getting-started.md#twitterx-setup))
- ✅ **Reddit** - Saved posts and comments ([Setup Guide](docs/platforms/getting-started.md#reddit-setup))

**Coming Soon:**
- 🚧 **GitHub** - ⭐ Starred repositories with README content
- 📋 **YouTube** - Liked videos with full transcription
- 📋 **TikTok** - Favorite videos with transcription
- 📋 **Instagram** - Saved posts and reels with transcription
- 📋 **Dribbble** - Liked shots
- 📋 **Facebook** - Saved posts

### 🤖 AI-Powered Features

- **Auto-Summarization** - 2-3 sentence summaries of all content
- **Key Points Extraction** - Main takeaways from posts
- **Auto-Tagging** - AI-suggested tags with confidence scores
- **Smart Categorization** - Automatic assignment to lists
- **Sentiment Analysis** - Detect positive/negative/neutral tone
- **Video Transcription** - Convert videos to searchable text
- **Semantic Search** - Find content using natural language
- **Q&A System** - Ask questions about your bookmarks

### 🎥 Video/Audio Transcription

- **Automatic Transcription** - YouTube, TikTok, Instagram, Twitter videos
- **Powered by Whisper** - OpenAI's speech-to-text API
- **Cobalt Integration** - Fast, reliable video downloads
- **Full-Text Search** - Search within video transcripts
- **No Dependencies** - Works on Vercel serverless

---

## 🏗️ Tech Stack

### Backend
- **[Hono](https://hono.dev/)** - Fast, lightweight web framework
- **[Prisma](https://www.prisma.io/)** - Type-safe ORM with PostgreSQL
- **[Claude 3.5 Sonnet](https://www.anthropic.com/)** - AI analysis and Q&A
- **[OpenAI Whisper](https://platform.openai.com/docs/guides/speech-to-text)** - Audio transcription
- **[Cobalt API](https://github.com/imputnet/cobalt)** - Video/audio downloads
- **[BullMQ](https://docs.bullmq.io/)** - Background job processing

### Infrastructure
- **PostgreSQL 16** - Primary database
- **Redis 7** - Cache and job queue
- **Docker** - Local development environment
- **Vercel** - Serverless deployment (production)

### Testing & Quality
- **Jest** - Test framework (36/36 tests passing)
- **TypeScript** - Type safety and developer experience
- **ESLint & Prettier** - Code quality and formatting
- **GitHub Actions** - CI/CD pipeline

---

## 📊 Project Status

### ✅ Phase 1: Foundation (COMPLETED)

**Week 1-2** - All core infrastructure is in place:

- ✅ TypeScript + Hono project setup
- ✅ Prisma ORM with PostgreSQL
- ✅ Complete database schema (8 tables, 2 enums)
- ✅ Docker development environment
- ✅ Health check endpoints
- ✅ Environment configuration
- ✅ **Testing infrastructure (36 tests, ~85% coverage)**
- ✅ CI/CD with GitHub Actions

**API Endpoints**:
- `GET /` - Project info
- `GET /health` - Health check + database status
- `GET /health/db` - Database connectivity
- `GET /api` - API endpoint listing

### 🚧 Phase 2: Platform Adapters (Next)

**Week 3-4** - Building platform integrations:

- [ ] Adapter architecture framework
- [ ] GitHub adapter (⭐ starred repos)
- [ ] Twitter/X adapter (bookmarks)
- [ ] Reddit adapter (saved posts)

### 📋 Upcoming Phases

- **Phase 3** (Week 5) - Sync Engine
- **Phase 4** (Week 6-7) - AI Integration
- **Phase 5** (Week 8) - Search & Q&A
- **Phase 6** (Week 9) - Deployment & Monitoring

📅 **Full roadmap**: [docs/planning/roadmap.md](docs/planning/roadmap.md)

---

## 📖 Documentation

### 🎯 Essential Guides

| Guide | Description |
|-------|-------------|
| **[Getting Started](guides/GETTING_STARTED.md)** | Complete setup in 5 minutes |
| **[Docker Setup](guides/DOCKER.md)** | PostgreSQL + Redis configuration |
| **[Testing Guide](guides/TESTING.md)** | Writing and running tests |
| **[Setup Progress](guides/SETUP_COMPLETE.md)** | Phase 1 completion summary |
| **[Test Progress](guides/TEST_SETUP_COMPLETE.md)** | Testing infrastructure summary |

### 📚 Comprehensive Documentation

The `docs/` folder contains detailed documentation organized by topic:

```
docs/
├── planning/          # Project planning and roadmap
│   ├── overview.md
│   ├── quick-start.md
│   ├── roadmap.md
│   └── cost-analysis.md
├── architecture/      # System design and architecture
│   ├── system-design.md
│   ├── database-schema.md
│   └── queue-system.md
├── ai/               # AI integration guides
│   ├── claude-setup.md
│   ├── features.md
│   ├── semantic-search.md
│   └── prompt-engineering.md
├── transcription/    # Video transcription
│   ├── overview.md
│   ├── cobalt-setup.md
│   ├── whisper-setup.md
│   └── queue-processing.md
├── platforms/        # Platform adapters
│   ├── adapter-architecture.md
│   ├── github.md
│   └── adding-platforms.md
└── deployment/       # Deployment guides
    ├── vercel.md
    ├── workers.md
    ├── docker.md
    └── environment.md
```

**Start here**: [docs/README.md](docs/README.md)

### 📝 Additional Files

- **[CLAUDE.md](CLAUDE.md)** - Instructions for Claude Code AI assistant
- **[LICENSE](LICENSE)** - MIT License
- **[guides/archive/](guides/archive/)** - Deprecated documentation (reference only)

---

## 💻 Development

### Project Structure

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
│   ├── types/                # TypeScript types
│   └── __tests__/            # Test files
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── migrations/           # Database migrations
├── docs/                     # Comprehensive documentation
├── guides/                   # Quick guides and tutorials
├── .github/workflows/        # CI/CD configuration
└── docker-compose.yml        # Docker services
```

### Available Scripts

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

# Testing
npm test                 # Run all tests
npm run test:unit        # Run unit tests
npm run test:integration # Run integration tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report

# Code Quality
npm run lint             # Run ESLint
npm run format           # Format code with Prettier

# Docker
docker compose up -d            # Start services
docker compose down             # Stop services
docker compose ps               # Check status
docker compose logs -f postgres # View logs
```

### Environment Variables

The `.env` file is automatically created with Docker defaults:

```env
# Database (Docker)
DATABASE_URL=postgresql://karakeep:karakeep_dev_password@localhost:5432/karakeep_dev

# Redis (Docker)
REDIS_URL=redis://:karakeep_redis_password@localhost:6379

# Server
PORT=3000
NODE_ENV=development

# AI Services (add when ready)
ANTHROPIC_API_KEY=sk-ant-xxx    # Claude AI
OPENAI_API_KEY=sk-xxx           # Whisper transcription

# Platform APIs (add as needed)
GITHUB_TOKEN=ghp_xxx
TWITTER_BEARER_TOKEN=xxx
REDDIT_CLIENT_ID=xxx
REDDIT_CLIENT_SECRET=xxx
```

See [guides/DOCKER.md](guides/DOCKER.md) for Docker configuration details.

---

## 🧪 Testing

### Test Status

```
✅ 36/36 tests passing
📊 ~85% code coverage
⚡ ~1.7s total runtime
```

### Test Structure

```
src/__tests__/
├── setup.ts              # Global test configuration
├── helpers/
│   ├── test-db.ts       # Database test utilities
│   └── test-server.ts   # HTTP endpoint utilities
├── unit/                # Unit tests (16 tests)
│   ├── env.test.ts      # Environment config
│   └── db.test.ts       # Database client
└── integration/         # Integration tests (20 tests)
    ├── health.test.ts   # API endpoints
    └── models.test.ts   # Prisma models
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration

# Watch mode (auto-rerun on changes)
npm run test:watch

# Generate coverage report
npm run test:coverage
```

**Full testing guide**: [guides/TESTING.md](guides/TESTING.md)

---

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Configure environment variables in Vercel dashboard.

### Docker

```bash
# Build image
docker build -t karakeep .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  -e REDIS_URL=redis://... \
  karakeep
```

**Deployment guides**:
- [Vercel Deployment](docs/deployment/vercel.md)
- [Docker Deployment](docs/deployment/docker.md)
- [Background Workers](docs/deployment/workers.md)

---

## 💰 Cost Estimates

**For 100 bookmarks/month** (50 text, 30 videos, 20 GitHub repos):

| Service | Usage | Monthly Cost |
|---------|-------|--------------|
| **Vercel** | Hobby plan | $0.00 |
| **PostgreSQL** | Neon free tier | $0.00 |
| **Redis** | Upstash free tier | $0.00 |
| **Claude AI** | 100 analyses | $0.20 |
| **Whisper API** | 30 videos × 8 min | $2.40 |
| **Cobalt API** | Video downloads | $0.00 |
| **GitHub API** | Repository data | $0.00 |
| **Total** | | **~$2.60/mo** 🎉 |

**Detailed cost analysis**: [docs/planning/cost-analysis.md](docs/planning/cost-analysis.md)

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes** and add tests
4. **Run tests** (`npm test`)
5. **Commit your changes** (`git commit -m 'Add amazing feature'`)
6. **Push to branch** (`git push origin feature/amazing-feature`)
7. **Open a Pull Request**

### Development Guidelines

- Write tests for new features
- Follow TypeScript strict mode
- Use Prisma for database access
- Update documentation
- Follow existing code style
- Keep tests passing (36/36 ✅)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **[Anthropic](https://www.anthropic.com/)** - Claude AI
- **[OpenAI](https://openai.com/)** - Whisper API
- **[Cobalt](https://github.com/imputnet/cobalt)** - Video download API
- **[Prisma](https://www.prisma.io/)** - Database ORM
- **[Hono](https://hono.dev/)** - Web framework

---

## 📞 Support

- 📖 **Documentation**: [docs/README.md](docs/README.md)
- 🐛 **Issues**: [GitHub Issues](https://github.com/yourusername/karakeep-social-ai/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/yourusername/karakeep-social-ai/discussions)

---

<div align="center">

**Built with ❤️ using TypeScript, Hono, Prisma, and Claude AI**

[⬆ Back to top](#karakeep-social-ai)

</div>
