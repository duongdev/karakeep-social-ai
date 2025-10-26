# Karakeep Social AI - Documentation

Complete documentation for building and deploying Karakeep Social AI, your AI-powered bookmark manager.

## 📚 Documentation Index

### Getting Started
- [Project Overview](./planning/overview.md) - Project goals, features, and architecture
- [Quick Start Guide](./planning/quick-start.md) - Get up and running in 5 minutes
- [Development Roadmap](./planning/roadmap.md) - 10-week implementation plan

### Planning & Architecture
- [System Architecture](./architecture/system-design.md) - Complete system design and components
- [Database Schema](./architecture/database-schema.md) - Prisma schema and data models
- [Queue Architecture](./architecture/queue-system.md) - Handling Vercel timeouts with background workers
- [Cost Analysis](./planning/cost-analysis.md) - Infrastructure and API costs breakdown

### AI Integration
- [Claude Setup](./ai/claude-setup.md) - Getting started with Claude AI
- [AI Features](./ai/features.md) - Summarization, tagging, categorization, Q&A
- [Semantic Search](./ai/semantic-search.md) - Natural language search implementation
- [Prompt Engineering](./ai/prompt-engineering.md) - Effective prompts and best practices

### Video Transcription
- [Transcription Overview](./transcription/overview.md) - Video/audio transcription workflow
- [Cobalt Integration](./transcription/cobalt-setup.md) - Video download service setup
- [Whisper API](./transcription/whisper-setup.md) - OpenAI Whisper configuration
- [Queue Processing](./transcription/queue-processing.md) - Background processing for long videos

### Platform Adapters
- [Adapter Architecture](./platforms/adapter-architecture.md) - Base interface and patterns
- [GitHub Integration](./platforms/github.md) - Starred repositories sync
- [Twitter/X Integration](./platforms/twitter.md) - Bookmarks sync (planned)
- [Reddit Integration](./platforms/reddit.md) - Saved posts sync (planned)
- [YouTube Integration](./platforms/youtube.md) - Liked videos sync (planned)
- [Adding New Platforms](./platforms/adding-platforms.md) - Guide for extensibility

### Deployment
- [Vercel Deployment](./deployment/vercel.md) - Serverless API deployment
- [Background Workers](./deployment/workers.md) - Railway/Render worker setup
- [Docker Deployment](./deployment/docker.md) - Alternative container deployment
- [Environment Variables](./deployment/environment.md) - Configuration guide

### API Reference
- [API Endpoints](./api/endpoints.md) - Complete API documentation
- [Authentication](./api/authentication.md) - API key setup and security
- [Error Handling](./api/error-handling.md) - Error codes and responses

### Development
- [Local Development](./development/local-setup.md) - Development environment setup
- [Prisma Guide](./development/prisma.md) - Working with Prisma ORM
- [Testing](./development/testing.md) - Testing strategies and tools
- [Contributing](./development/contributing.md) - Contribution guidelines

## 🎯 Quick Navigation by Task

### I want to...
- **Get started quickly** → [Quick Start Guide](./planning/quick-start.md)
- **Understand the architecture** → [System Architecture](./architecture/system-design.md)
- **Set up AI features** → [Claude Setup](./ai/claude-setup.md)
- **Add video transcription** → [Transcription Overview](./transcription/overview.md)
- **Deploy to production** → [Vercel Deployment](./deployment/vercel.md)
- **Add a new platform** → [Adding New Platforms](./platforms/adding-platforms.md)
- **Understand costs** → [Cost Analysis](./planning/cost-analysis.md)
- **Fix Vercel timeouts** → [Queue Architecture](./architecture/queue-system.md)

## 📖 Reading Paths

### For First-Time Readers
1. [Project Overview](./planning/overview.md)
2. [System Architecture](./architecture/system-design.md)
3. [Quick Start Guide](./planning/quick-start.md)
4. [Development Roadmap](./planning/roadmap.md)

### For Developers
1. [Local Development](./development/local-setup.md)
2. [Database Schema](./architecture/database-schema.md)
3. [Adapter Architecture](./platforms/adapter-architecture.md)
4. [API Endpoints](./api/endpoints.md)

### For DevOps/Deployment
1. [System Architecture](./architecture/system-design.md)
2. [Queue Architecture](./architecture/queue-system.md)
3. [Vercel Deployment](./deployment/vercel.md)
4. [Background Workers](./deployment/workers.md)

## 🔗 External Resources

- [Main Project README](../README.md)
- [Hono Documentation](https://hono.dev/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Claude API Documentation](https://docs.anthropic.com/)
- [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text)
- [Cobalt API](https://github.com/imputnet/cobalt)

## 📝 Documentation Status

| Section | Status | Last Updated |
|---------|--------|--------------|
| Planning & Architecture | ✅ Complete | 2025-10-26 |
| AI Integration | ✅ Complete | 2025-10-26 |
| Transcription | ✅ Complete | 2025-10-26 |
| Platform Adapters | 🚧 In Progress | 2025-10-26 |
| Deployment | ✅ Complete | 2025-10-26 |
| API Reference | 📋 Planned | - |
| Development | 🚧 In Progress | 2025-10-26 |

## 🤝 Contributing to Documentation

Found an issue or want to improve the docs? See [Contributing Guide](./development/contributing.md).

---

**Last Updated**: 2025-10-26
**Version**: 1.0.0
