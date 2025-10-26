# Project Overview

> Your AI-powered bookmark manager for social media content

[← Back to Documentation Index](../README.md)

## What is Karakeep?

Karakeep Social AI is a personal bookmark manager that automatically syncs, transcribes, summarizes, and organizes your saved posts from multiple social platforms using AI.

## Core Features

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

## Core Requirements

### User Model
- **Single User** - Designed for personal use
- **Multiple Accounts** - Support for multiple accounts per platform
- **Privacy First** - All your data, fully controlled

### Sync Methods
1. **Scheduled Cron Jobs** - Automatic syncs every 6 hours
2. **Manual Triggers** - On-demand sync via API
3. **Real-time Webhooks** - Instant sync where platform supports it (GitHub)

### AI Foundation
- **Primary**: Claude 3.5 Sonnet (Anthropic)
- **Extensible**: Easy to swap or add other models (GPT, Gemini, etc.)
- **Cost-Optimized**: Smart batching and caching

### Database
- **PostgreSQL** - Reliable, powerful, well-supported
- **Prisma ORM** - Type-safe database access
- **Cloud Options** - Neon, Supabase, or Vercel Postgres

### Backend
- **Hono API** - Fast, lightweight TypeScript framework
- **Type-Safe** - Full TypeScript support throughout

### Deployment Options
1. **Vercel** (Primary) - Serverless, easy deployment
2. **Docker** (Alternative) - Full control, self-hosted

## Key Design Principles

### 1. Extensibility
- **Easy Platform Addition** - Add new platforms in < 4 hours
- **Adapter Pattern** - Standardized interface for all platforms
- **Plugin Architecture** - Modular components

### 2. Reliability
- **Queue-Based Processing** - No timeout issues
- **Error Recovery** - Automatic retries with exponential backoff
- **Sync Job Tracking** - Full visibility into sync status

### 3. Cost Optimization
- **Free Infrastructure** - All services have free tiers
- **Pay-as-you-go AI** - Only pay for what you use
- **Smart Caching** - Reduce duplicate API calls
- **Target**: ~$2.60/month for 100 bookmarks

### 4. Developer Experience
- **Type Safety** - TypeScript + Prisma
- **Clear Structure** - Logical file organization
- **Good Documentation** - Comprehensive guides
- **Easy Setup** - Quick start in minutes

## Success Metrics

- **Sync Reliability**: 99% success rate
- **AI Processing**: < 5 seconds per bookmark
- **Search Latency**: < 2 seconds
- **Platform Coverage**: 8+ platforms
- **Time to Add Platform**: < 4 hours
- **Monthly Cost**: < $5 for typical usage

## Target Users

### Primary: Personal Knowledge Managers
- Save content from multiple platforms
- Need better organization and search
- Want AI-powered insights
- Value privacy and control

### Secondary: Content Curators
- Collect inspiration and references
- Build themed collections
- Share curated lists
- Track trends and topics

## What Makes Karakeep Different?

### vs. Traditional Bookmark Managers
✅ Multi-platform sync (not just web links)
✅ AI-powered analysis and search
✅ Video transcription
✅ Natural language Q&A

### vs. Read-it-Later Apps
✅ Works with social media
✅ Preserves platform context
✅ Auto-categorization
✅ Semantic search

### vs. Manual Saving
✅ Centralized access
✅ Automatic organization
✅ Searchable transcripts
✅ AI insights

## Next Steps

- **New Users**: Start with the [Quick Start Guide](./quick-start.md)
- **Developers**: Check out the [Development Roadmap](./roadmap.md)
- **Architecture**: See [System Architecture](../architecture/system-design.md)
- **Deployment**: Read [Deployment Guides](../deployment/vercel.md)

## Related Documentation

- [System Architecture](../architecture/system-design.md) - Technical design
- [Cost Analysis](./cost-analysis.md) - Detailed cost breakdown
- [Development Roadmap](./roadmap.md) - Implementation timeline

---

[← Back to Documentation Index](../README.md) | [Next: Quick Start →](./quick-start.md)
