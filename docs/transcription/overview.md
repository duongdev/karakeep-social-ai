# Video Transcription Overview

> Architecture and workflow for automatic video/audio transcription in Karakeep

[← Back to Documentation Index](../README.md) | [Cobalt Setup](./cobalt-setup.md) →

## Contents

- [Why Transcription?](#why-transcription)
- [Architecture](#architecture)
- [Workflow](#workflow)
- [Supported Platforms](#supported-platforms)
- [Technology Stack](#technology-stack)
- [Cost Analysis](#cost-analysis)

## Why Transcription?

### The Problem

Videos contain valuable content but are not text-searchable:

**Before Transcription**:
```json
{
  "title": "Amazing Design Tips",
  "platform": "youtube",
  "content": null  // Just video, no text
}
```
❌ Claude can only analyze the title
❌ Cannot search video content
❌ Limited understanding

**After Transcription**:
```json
{
  "title": "Amazing Design Tips",
  "platform": "youtube",
  "transcript": "In this video, I'll show you 5 essential design principles...",
  "duration": 632,
  "keyPoints": [
    "Use whitespace effectively",
    "Maintain visual hierarchy",
    ...
  ]
}
```
✅ Full content analysis
✅ Searchable by spoken words
✅ Rich summaries and insights

### Benefits

1. **Better Summarization**: Claude analyzes actual spoken content
2. **Improved Search**: Find videos by what was said, not just titles
3. **Full-Text Q&A**: Answer questions about video content
4. **Accessibility**: Make video content text-searchable
5. **Language Detection**: Identify video language automatically

## Architecture

### Component Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    Bookmark Saved                             │
│         (YouTube, TikTok, Instagram, etc.)                   │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
           ┌─────────────────┐
           │ Is Media Content? │
           └────┬────────┬────┘
               Yes      No
                │        │
                │        └──────► Skip transcription
                │
                ▼
    ┌──────────────────────┐
    │   Queue Job          │
    │   (Redis)            │
    └──────────┬────────────┘
               │
               ▼
    ┌──────────────────────┐
    │  Background Worker   │
    │  (Railway/Render)    │
    └──────────┬────────────┘
               │
               ├──► Download Audio (Cobalt API)
               ├──► Transcribe (Whisper API)
               ├──► Store Transcript (PostgreSQL)
               ├──► Analyze with Claude
               └──► Cleanup Files
```

### Key Components

1. **Cobalt API**: Downloads audio from videos
2. **Whisper API**: Transcribes audio to text
3. **Redis Queue**: Manages background jobs
4. **Background Worker**: Processes videos (no timeout)
5. **Claude AI**: Analyzes transcripts

## Workflow

### Step-by-Step Process

**Step 1: Media Detection**
```typescript
if (isMediaContent(bookmark.url, bookmark.platform)) {
  // Queue for transcription
  await transcriptionQueue.add({
    bookmarkId: bookmark.id,
    url: bookmark.url,
    platform: bookmark.platform
  })
}
```

**Step 2: Download Audio (Cobalt)**
```typescript
// Cobalt downloads audio-only (saves bandwidth)
const audioFile = await cobaltDownloader.downloadAudio(url)
// Returns: MP3 file, typically 1-5 MB for a 5-minute video
```

**Step 3: Check File Size**
```typescript
const stats = await fs.stat(audioFile)
if (stats.size > 25 * 1024 * 1024) {
  throw new Error('File too large for Whisper (>25MB)')
}
```

**Step 4: Transcribe (Whisper)**
```typescript
const transcript = await openai.audio.transcriptions.create({
  file: fs.createReadStream(audioFile),
  model: 'whisper-1',
  response_format: 'verbose_json'
})
// Returns: Full transcript with timestamps
```

**Step 5: Store Results**
```typescript
await prisma.aIAnalysis.upsert({
  where: { bookmarkId },
  create: {
    bookmarkId,
    transcript: transcript.text,
    duration: transcript.duration,
    language: transcript.language
  },
  update: {...}
})
```

**Step 6: AI Analysis**
```typescript
// Claude analyzes transcript + title
await aiProcessor.analyzeBookmark(bookmarkId)
// Generates: summary, tags, key points, sentiment
```

**Step 7: Cleanup**
```typescript
await fs.unlink(audioFile)
```

## Supported Platforms

### Full Support

| Platform | Video Types | Notes |
|----------|-------------|-------|
| **YouTube** | Regular videos, Shorts | ✅ Reliable |
| **TikTok** | Public videos | ✅ Works well |
| **Twitter/X** | Video tweets | ✅ Supported |
| **Instagram** | Reels, video posts | ⚠️ May require cookies |
| **Reddit** | v.redd.it videos | ✅ Supported |

### Detection Patterns

```typescript
const mediaPatterns = {
  youtube: [
    /youtube\.com\/watch\?v=/,
    /youtu\.be\//,
    /youtube\.com\/shorts\//,
  ],
  tiktok: [
    /tiktok\.com\/@[\w.-]+\/video\/\d+/,
    /vm\.tiktok\.com\//,
  ],
  twitter: [
    /twitter\.com\/\w+\/status\/\d+\/video/,
    /x\.com\/\w+\/status\/\d+\/video/,
  ],
  instagram: [
    /instagram\.com\/reel\//,
    /instagram\.com\/p\/[\w-]+\/(video|tv)/,
  ],
  reddit: [
    /reddit\.com\/r\/[\w-]+\/comments\/[\w-]+\/[\w-]+/,
    /v\.redd\.it\//,
  ],
}
```

## Technology Stack

### Why These Tools?

**Cobalt API** (vs yt-dlp):
- ✅ No system dependencies (works on Vercel)
- ✅ Better platform support
- ✅ Active maintenance
- ✅ Simple HTTP API
- ✅ Free public API or self-hostable

**Whisper API** (vs local Whisper):
- ✅ No GPU required
- ✅ Fast processing
- ✅ High accuracy
- ✅ Supports 99+ languages
- ✅ Simple API, pay-per-use

**Redis Queue** (vs direct processing):
- ✅ No Vercel timeout limits
- ✅ Reliable retry logic
- ✅ Progress tracking
- ✅ Scalable

## Cost Analysis

### OpenAI Whisper Pricing

**$0.006 per minute** of audio

### Monthly Examples

| Scenario | Videos/Month | Avg Duration | Cost/Month |
|----------|-------------|--------------|------------|
| Light | 50 | 5 min | **$1.50** |
| Medium | 100 | 8 min | **$4.80** |
| Heavy | 200 | 10 min | **$12.00** |
| Power User | 500 | 15 min | **$45.00** |

### Combined with AI Analysis

For 100 bookmarks/month (50% videos, 50% text):

- **Transcription**: 50 videos × 8 min × $0.006 = **$2.40**
- **Claude Analysis**: 100 × $0.002 = **$0.20**
- **Total AI Cost**: ~**$2.60/month**

### Infrastructure Costs

All can use free tiers:

| Service | Free Tier | Usage |
|---------|-----------|-------|
| Vercel | ✅ Yes | API hosting |
| Railway/Render | 500-750h | Worker |
| Upstash Redis | 10K req/day | Queue |
| Neon PostgreSQL | ✅ Yes | Database |

**Total Infrastructure**: **$0/month** 🎉

## Performance

### Typical Processing Times

| Video Length | Download | Transcribe | Total |
|--------------|----------|------------|-------|
| 3 minutes | 5-10s | 15-25s | 20-35s |
| 5 minutes | 10-20s | 30-45s | 40-65s |
| 10 minutes | 20-40s | 60-90s | 80-130s |
| 30 minutes | 60-120s | 180-240s | 240-360s |

### Limitations

**Whisper API**:
- Maximum file size: 25 MB
- Typical video: 5-10 minutes fits easily
- Very long videos (>1 hour) may need splitting

**Cobalt API**:
- Rate limits on public API
- Consider self-hosting for heavy use

## Next Steps

1. [Setup Cobalt API](./cobalt-setup.md) - Configure video downloading
2. [Setup Whisper API](./whisper-setup.md) - Configure transcription
3. [Queue Processing](./queue-processing.md) - Background worker setup

## Related Documentation

- [Queue System](../architecture/queue-system.md) - How background jobs work
- [AI Features](../ai/features.md) - What happens after transcription
- [Deployment Workers](../deployment/workers.md) - Deploying the worker

---

[← Back to Index](../README.md) | [Next: Cobalt Setup →](./cobalt-setup.md)

**Last Updated**: 2025-10-26
