# Karakeep Social AI

> Your AI-powered bookmark manager for social media content

Automatically sync, transcribe, summarize, and search your saved posts from multiple platforms using Claude AI and OpenAI Whisper.

## ✨ Features

### 📱 Multi-Platform Support (8 Platforms)

- **Twitter/X** - Bookmarks and saved tweets
- **Reddit** - Saved posts and comments
- **YouTube** - Liked videos with full transcription
- **TikTok** - Favorite videos with transcription
- **Instagram** - Saved posts and reels with transcription
- **Dribbble** - Liked shots
- **Facebook** - Saved posts
- **GitHub** - ⭐ Starred repositories with README content

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

## 🏗️ Tech Stack

### Backend

- **Hono** - Fast, lightweight web framework
- **Prisma** - Type-safe ORM with PostgreSQL
- **Claude 3.5 Sonnet** - AI analysis and Q&A
- **OpenAI Whisper** - Audio transcription
- **Cobalt API** - Video/audio downloads
- **Vercel Cron** - Scheduled syncs

### Infrastructure

- **Vercel** - Serverless deployment (primary)
- **Docker** - Alternative deployment option
- **PostgreSQL** - Database (Neon/Supabase/Vercel)
- **Redis** - Optional caching (Upstash)

## 📊 Cost Estimates

**For 100 bookmarks/month** (50 text, 30 videos, 20 GitHub repos):

| Service | Usage | Cost |
|---------|-------|------|
| Claude AI | 100 analyses | $0.20 |
| Whisper API | 30 videos × 8 min | $2.40 |
| Cobalt API | Free | $0.00 |
| GitHub API | Free | $0.00 |
| **Total** | | **~$2.60/mo** 🎉 |

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Anthropic API key
- OpenAI API key

### Installation

```bash
# Clone the repo
git clone https://github.com/yourusername/karakeep-social-ai.git
cd karakeep-social-ai

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your API keys

# Initialize Prisma
npx prisma generate
npx prisma migrate dev --name init

# Start development server
npm run dev
```

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/karakeep

# AI APIs
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-proj-xxx

# Cobalt (optional, defaults to public API)
COBALT_API_URL=https://api.cobalt.tools

# App
API_KEY=your-secret-api-key
NODE_ENV=development
```

## 📖 Documentation

Comprehensive guides for implementation:

- **[PLAN.md](./PLAN.md)** - Complete implementation roadmap
- **[CLAUDE.md](./CLAUDE.md)** - Claude AI integration guide
- **[TRANSCRIPTION.md](./TRANSCRIPTION.md)** - Video transcription setup
- **[GITHUB_ADAPTER.md](./GITHUB_ADAPTER.md)** - GitHub stars sync

## 🎯 Project Structure

```
karakeep-social-ai/
├── src/
│   ├── adapters/           # Platform adapters
│   │   ├── twitter/
│   │   ├── reddit/
│   │   ├── youtube/
│   │   ├── github/
│   │   └── ...
│   ├── services/           # Core services
│   │   ├── ai-processor.ts
│   │   ├── transcription.ts
│   │   ├── cobalt-downloader.ts
│   │   └── search.ts
│   ├── routes/             # API routes
│   │   ├── bookmarks.ts
│   │   ├── ai.ts
│   │   ├── sync.ts
│   │   └── github.ts
│   ├── lib/                # Utilities
│   │   ├── db.ts          # Prisma client
│   │   ├── claude.ts      # Claude client
│   │   └── github.ts      # GitHub client
│   └── index.ts           # Main entry point
├── prisma/
│   └── schema.prisma      # Database schema
├── docs/
│   ├── PLAN.md
│   ├── CLAUDE.md
│   ├── TRANSCRIPTION.md
│   └── GITHUB_ADAPTER.md
└── package.json
```

## 🔌 API Endpoints

### Bookmarks

```
GET    /api/bookmarks              # List all bookmarks
GET    /api/bookmarks/:id          # Get single bookmark
POST   /api/bookmarks              # Create bookmark
DELETE /api/bookmarks/:id          # Delete bookmark
PUT    /api/bookmarks/:id/lists    # Add to lists
PUT    /api/bookmarks/:id/tags     # Add tags
```

### Sync

```
POST   /api/sync/trigger           # Manual sync
GET    /api/sync/status            # Sync status
GET    /api/sync/history           # Sync history
```

### AI Features

```
POST   /api/ai/analyze/:id         # Analyze bookmark
POST   /api/ai/analyze/batch       # Batch analyze
POST   /api/ai/search              # Semantic search
POST   /api/ai/chat                # Q&A
POST   /api/ai/transcribe/:id      # Transcribe video
GET    /api/ai/transcript/:id      # Get transcript
```

### GitHub

```
POST   /api/github/sync/:accountId        # Sync stars
POST   /api/github/sync-readmes/:accountId # Sync READMEs
POST   /api/github/check-updates/:accountId # Check updates
POST   /api/github/webhook                 # Webhook endpoint
```

## 🎨 Key Features by Platform

### YouTube
✅ Sync liked videos
✅ Full video transcription
✅ Search by spoken content
✅ Auto-categorize by topic

### GitHub
✅ Sync starred repos
✅ Extract README content
✅ Track repo updates
✅ Categorize by language
✅ Real-time webhooks

### Twitter/X
✅ Sync bookmarks
✅ Transcribe video tweets
✅ Thread detection
✅ Author tracking

### TikTok
✅ Sync favorites
✅ Full transcription
✅ Trend detection
✅ Audio extraction

## 🔧 Development

### Run Prisma Studio

```bash
npx prisma studio
```

### Generate Prisma Client

```bash
npx prisma generate
```

### Create Migration

```bash
npx prisma migrate dev --name <migration-name>
```

### Run Tests

```bash
npm test
```

## 🚢 Deployment

### Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables
vercel env add DATABASE_URL
vercel env add ANTHROPIC_API_KEY
vercel env add OPENAI_API_KEY
```

### Docker

```bash
# Build image
docker build -t karakeep .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  -e OPENAI_API_KEY=sk-proj-... \
  karakeep
```

## 🗺️ Roadmap

### Phase 1: Foundation ✅
- [x] Project setup
- [x] Prisma schema
- [x] Core API endpoints
- [x] Authentication

### Phase 2: Platform Adapters 🚧
- [ ] Twitter/X adapter
- [ ] Reddit adapter
- [ ] YouTube adapter
- [ ] GitHub adapter

### Phase 3: AI Integration 🚧
- [ ] Claude integration
- [ ] Auto-summarization
- [ ] Auto-tagging
- [ ] Categorization

### Phase 4: Transcription 🚧
- [ ] Cobalt integration
- [ ] Whisper API setup
- [ ] Video processing pipeline

### Phase 5: Search & Q&A 📋
- [ ] Semantic search
- [ ] RAG implementation
- [ ] Q&A system

### Phase 6: Web UI 📋
- [ ] Next.js dashboard
- [ ] Bookmark grid/list view
- [ ] Search interface
- [ ] Chat interface

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines first.

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- [Anthropic Claude](https://www.anthropic.com/) - AI analysis
- [OpenAI Whisper](https://openai.com/research/whisper) - Transcription
- [Cobalt](https://github.com/imputnet/cobalt) - Media downloads
- [Hono](https://hono.dev/) - Web framework
- [Prisma](https://www.prisma.io/) - Database ORM

## 📞 Support

- Documentation: See `/docs` folder
- Issues: [GitHub Issues](https://github.com/yourusername/karakeep-social-ai/issues)

---

**Made with ❤️ for better bookmark management**
