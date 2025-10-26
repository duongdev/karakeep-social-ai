# Video/Audio Transcription Guide

This document explains how to implement automatic transcription for video and audio content in Karakeep using **Cobalt API** (instead of yt-dlp) and **OpenAI Whisper API**.

## Why Cobalt over yt-dlp?

✅ **Better Platform Support**: YouTube, TikTok, Instagram, Twitter, Reddit, SoundCloud, Vimeo, VK
✅ **Simple API**: No system dependencies, just HTTP requests
✅ **No Installation**: Use public API (cobalt.tools) or self-host
✅ **Serverless Friendly**: Works on Vercel without system binaries
✅ **Active Maintenance**: Regular updates for platform changes
✅ **Audio-only Download**: Direct audio extraction support

## Table of Contents

- [Overview](#overview)
- [Why Transcription?](#why-transcription)
- [Architecture](#architecture)
- [Implementation](#implementation)
- [Supported Platforms](#supported-platforms)
- [Cost Analysis](#cost-analysis)
- [Optimization Strategies](#optimization-strategies)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

## Overview

Transcription converts video/audio content into searchable text, enabling:

- **Better Summarization**: Claude can analyze actual spoken content
- **Improved Search**: Find videos by what was said, not just titles
- **Full-Text Q&A**: Answer questions about video content
- **Accessibility**: Make video content text-searchable
- **Language Detection**: Identify video language automatically

## Why Transcription?

### Before Transcription
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

### After Transcription
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

## Architecture

### Flow Diagram

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
    │   Download Audio      │
    │    (using yt-dlp)     │
    └──────────┬────────────┘
               │
               ▼
    ┌──────────────────────┐
    │  Check File Size      │
    │    (< 25MB?)          │
    └──────────┬────────────┘
               │
               ▼
    ┌──────────────────────┐
    │  Transcribe with      │
    │  OpenAI Whisper API   │
    └──────────┬────────────┘
               │
               ▼
    ┌──────────────────────┐
    │  Store Transcript     │
    │  in ai_analysis       │
    └──────────┬────────────┘
               │
               ▼
    ┌──────────────────────┐
    │  Claude Analysis      │
    │  (with transcript)    │
    └──────────┬────────────┘
               │
               ▼
    ┌──────────────────────┐
    │  Cleanup Audio File   │
    └───────────────────────┘
```

## Implementation

### 1. Setup

#### Install Dependencies

```bash
# Install OpenAI SDK for Whisper
npm install openai

# Install axios for HTTP requests to Cobalt
npm install axios

# Optional: For self-hosted Cobalt instance
# Docker: docker run -p 9000:9000 ghcr.io/imputnet/cobalt
```

#### Environment Variables

```env
# Required
OPENAI_API_KEY=sk-proj-xxx

# Cobalt API configuration
COBALT_API_URL=https://api.cobalt.tools  # Or your self-hosted instance
COBALT_API_KEY=  # Optional, only if self-hosting with auth

# Storage
TRANSCRIPTION_DIR=/tmp/karakeep/audio  # Temporary storage
MAX_VIDEO_DURATION=3600  # Max 1 hour
MAX_FILE_SIZE=26214400  # 25MB (Whisper limit)
```

### 2. Media Detection Service

Create `src/services/media-detector.ts`:

```typescript
export class MediaDetector {
  /**
   * Check if URL contains video/audio content
   */
  static isMediaContent(url: string, platform: string): boolean {
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

    const patterns = mediaPatterns[platform] || []
    return patterns.some(pattern => pattern.test(url))
  }

  /**
   * Detect media type from metadata
   */
  static getMediaType(metadata: any): 'video' | 'audio' | 'none' {
    if (!metadata) return 'none'

    // Check metadata fields
    if (metadata.mediaUrls && metadata.mediaUrls.length > 0) {
      const url = metadata.mediaUrls[0]
      if (url.includes('video') || url.includes('.mp4') || url.includes('.webm')) {
        return 'video'
      }
      if (url.includes('audio') || url.includes('.mp3') || url.includes('.m4a')) {
        return 'audio'
      }
    }

    return 'none'
  }

  /**
   * Estimate video duration from metadata
   */
  static estimateDuration(metadata: any): number | null {
    // Try to extract duration from various metadata formats
    if (metadata.duration) return metadata.duration
    if (metadata.lengthSeconds) return parseInt(metadata.lengthSeconds)
    if (metadata.video_duration) return metadata.video_duration

    return null
  }
}
```

### 3. Cobalt Audio Download Service

Create `src/services/cobalt-downloader.ts`:

```typescript
import axios from 'axios'
import path from 'path'
import fs from 'fs/promises'
import { createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'

export interface CobaltResponse {
  status: 'tunnel' | 'redirect' | 'picker' | 'error'
  url?: string
  pickerType?: string
  picker?: Array<{
    type: string
    url: string
    thumb?: string
  }>
  audio?: string
  error?: string
}

export class CobaltDownloader {
  private apiUrl: string
  private tempDir: string

  constructor(
    apiUrl: string = 'https://api.cobalt.tools',
    tempDir: string = '/tmp/karakeep/audio'
  ) {
    this.apiUrl = apiUrl
    this.tempDir = tempDir
  }

  /**
   * Download audio from video URL using Cobalt API
   */
  async downloadAudio(url: string): Promise<{
    filePath: string
    duration: number
    fileSize: number
  }> {
    // Ensure temp directory exists
    await fs.mkdir(this.tempDir, { recursive: true })

    try {
      // Request audio-only download from Cobalt
      const response = await axios.post<CobaltResponse>(
        this.apiUrl,
        {
          url,
          downloadMode: 'audio',  // Audio only
          audioFormat: 'mp3',
          filenameStyle: 'basic',
        },
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          timeout: 30000,  // 30 second timeout
        }
      )

      const data = response.data

      // Handle errors
      if (data.status === 'error') {
        throw new Error(`Cobalt error: ${data.error}`)
      }

      // Get download URL
      let downloadUrl: string

      if (data.status === 'tunnel') {
        // Cobalt is proxying/processing the file
        downloadUrl = data.url!
      } else if (data.status === 'redirect') {
        // Direct link to audio file
        downloadUrl = data.url!
      } else if (data.status === 'picker') {
        // Multiple options, pick first audio
        const audioOption = data.picker?.find(p => p.type === 'audio')
        if (!audioOption) {
          throw new Error('No audio option available')
        }
        downloadUrl = audioOption.url
      } else {
        throw new Error(`Unexpected Cobalt response status: ${data.status}`)
      }

      // Download the audio file
      const outputPath = path.join(
        this.tempDir,
        `audio_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`
      )

      await this.downloadFile(downloadUrl, outputPath)

      // Get file info
      const stats = await fs.stat(outputPath)

      // Check size limit (25MB for Whisper)
      if (stats.size > 25 * 1024 * 1024) {
        await fs.unlink(outputPath)
        throw new Error(`Audio file too large: ${(stats.size / 1024 / 1024).toFixed(2)}MB (max 25MB)`)
      }

      return {
        filePath: outputPath,
        duration: 0,  // Duration will be provided by Whisper
        fileSize: stats.size
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          throw new Error('Cobalt rate limit exceeded. Please try again later.')
        }
        throw new Error(`Cobalt API error: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Download file from URL to local path
   */
  private async downloadFile(url: string, outputPath: string): Promise<void> {
    const response = await axios({
      method: 'GET',
      url,
      responseType: 'stream',
      timeout: 5 * 60 * 1000,  // 5 minute timeout
    })

    const writer = createWriteStream(outputPath)

    await pipeline(response.data, writer)
  }

  /**
   * Cleanup downloaded file
   */
  async cleanup(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath)
    } catch (error) {
      console.error('Failed to cleanup audio file:', error)
    }
  }

  /**
   * Cleanup old files (run periodically)
   */
  async cleanupOldFiles(maxAgeHours: number = 24): Promise<void> {
    try {
      const files = await fs.readdir(this.tempDir)
      const now = Date.now()

      for (const file of files) {
        const filePath = path.join(this.tempDir, file)
        const stats = await fs.stat(filePath)
        const ageHours = (now - stats.mtimeMs) / (1000 * 60 * 60)

        if (ageHours > maxAgeHours) {
          await fs.unlink(filePath)
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old files:', error)
    }
  }

  /**
   * Check if Cobalt API is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(this.apiUrl, {
        timeout: 5000
      })
      return response.status === 200
    } catch {
      return false
    }
  }
}
```

### 4. Transcription Service

Create `src/services/transcription.ts`:

```typescript
import OpenAI from 'openai'
import fs from 'fs'
import { CobaltDownloader } from './cobalt-downloader'
import { MediaDetector } from './media-detector'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface Transcript {
  text: string
  duration: number
  language: string
  segments?: Array<{
    text: string
    start: number
    end: number
  }>
}

export class TranscriptionService {
  private downloader: CobaltDownloader

  constructor(cobaltApiUrl?: string) {
    this.downloader = new CobaltDownloader(
      cobaltApiUrl || process.env.COBALT_API_URL || 'https://api.cobalt.tools'
    )
  }

  /**
   * Transcribe video/audio from URL
   */
  async transcribeFromUrl(url: string, platform: string): Promise<Transcript | null> {
    // Check if URL has media content
    if (!MediaDetector.isMediaContent(url, platform)) {
      return null
    }

    let audioPath: string | null = null

    try {
      // Download audio
      const { filePath, duration, fileSize } = await this.downloader.downloadAudio(url)
      audioPath = filePath

      // Check file size (Whisper limit: 25MB)
      if (fileSize > 25 * 1024 * 1024) {
        throw new Error(`Audio file too large: ${(fileSize / 1024 / 1024).toFixed(2)}MB (max 25MB)`)
      }

      // Transcribe
      const transcript = await this.transcribe(filePath)

      return {
        ...transcript,
        duration
      }
    } finally {
      // Always cleanup
      if (audioPath) {
        await this.downloader.cleanup(audioPath)
      }
    }
  }

  /**
   * Transcribe audio file using Whisper API
   */
  private async transcribe(filePath: string): Promise<Transcript> {
    const fileStream = fs.createReadStream(filePath)

    const response = await openai.audio.transcriptions.create({
      file: fileStream,
      model: 'whisper-1',
      language: undefined,  // Auto-detect
      response_format: 'verbose_json',  // Includes timestamps
      timestamp_granularities: ['segment'],
    })

    return {
      text: response.text,
      duration: response.duration || 0,
      language: response.language,
      segments: response.segments?.map(seg => ({
        text: seg.text,
        start: seg.start,
        end: seg.end
      }))
    }
  }

  /**
   * Transcribe with retry logic
   */
  async transcribeWithRetry(
    url: string,
    platform: string,
    maxRetries: number = 3
  ): Promise<Transcript | null> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.transcribeFromUrl(url, platform)
      } catch (error) {
        console.error(`Transcription attempt ${i + 1} failed:`, error)

        if (i === maxRetries - 1) {
          throw error
        }

        // Exponential backoff
        await new Promise(resolve =>
          setTimeout(resolve, Math.pow(2, i) * 1000)
        )
      }
    }

    return null
  }
}
```

### 5. Integration with AI Processor

Update `src/services/ai-processor.ts`:

```typescript
import { TranscriptionService } from './transcription'

export class AIProcessor {
  private transcriptionService: TranscriptionService

  constructor() {
    this.transcriptionService = new TranscriptionService()
  }

  /**
   * Analyze bookmark with transcription support
   */
  async analyzeBookmark(bookmarkId: string) {
    const bookmark = await prisma.bookmark.findUnique({
      where: { id: bookmarkId },
      include: { account: true }
    })

    if (!bookmark) {
      throw new Error('Bookmark not found')
    }

    let transcript: Transcript | null = null

    // Try to transcribe if media content
    try {
      transcript = await this.transcriptionService.transcribeFromUrl(
        bookmark.url,
        bookmark.platform
      )
    } catch (error) {
      console.error('Transcription failed:', error)
      // Continue without transcript
    }

    // Prepare content for Claude
    const content = this.prepareContent(bookmark, transcript)

    // Analyze with Claude
    const analysis = await this.callClaude(content)

    // Store analysis with transcript
    await prisma.aIAnalysis.create({
      data: {
        bookmarkId: bookmark.id,
        summary: analysis.summary,
        keyPoints: analysis.keyPoints,
        topics: analysis.topics,
        sentiment: analysis.sentiment,
        language: analysis.language,
        transcript: transcript?.text,
        duration: transcript?.duration,
        modelUsed: CLAUDE_CONFIG.model,
      }
    })

    // Auto-tag
    if (analysis.tags && analysis.tags.length > 0) {
      await this.assignTags(bookmarkId, analysis.tags)
    }

    return analysis
  }

  /**
   * Prepare content for Claude (with transcript)
   */
  private prepareContent(bookmark: any, transcript: Transcript | null): string {
    const parts = [
      `Platform: ${bookmark.platform}`,
      `Title: ${bookmark.title || 'N/A'}`,
      `Author: ${bookmark.authorName || 'Unknown'}`,
    ]

    if (transcript) {
      parts.push(`Transcript (${transcript.duration}s, ${transcript.language}):`)
      parts.push(transcript.text)
    } else if (bookmark.content) {
      parts.push(`Content: ${bookmark.content}`)
    }

    parts.push(`URL: ${bookmark.url}`)

    return parts.join('\n')
  }
}
```

### 6. API Endpoints

Add transcription endpoint to `src/routes/ai.ts`:

```typescript
// Re-transcribe a bookmark
app.post('/transcribe/:id', async (c) => {
  const bookmarkId = c.req.param('id')

  try {
    const bookmark = await prisma.bookmark.findUnique({
      where: { id: bookmarkId }
    })

    if (!bookmark) {
      return c.json({ error: 'Bookmark not found' }, 404)
    }

    const transcriptionService = new TranscriptionService()
    const transcript = await transcriptionService.transcribeFromUrl(
      bookmark.url,
      bookmark.platform
    )

    if (!transcript) {
      return c.json({ error: 'No media content found' }, 400)
    }

    // Update or create AI analysis with transcript
    await prisma.aIAnalysis.upsert({
      where: { bookmarkId },
      create: {
        bookmarkId,
        transcript: transcript.text,
        duration: transcript.duration,
        language: transcript.language,
      },
      update: {
        transcript: transcript.text,
        duration: transcript.duration,
        language: transcript.language,
      }
    })

    return c.json({
      success: true,
      transcript: transcript.text,
      duration: transcript.duration,
      language: transcript.language
    })
  } catch (error) {
    return c.json({ error: error.message }, 500)
  }
})

// Get transcript for a bookmark
app.get('/transcript/:id', async (c) => {
  const bookmarkId = c.req.param('id')

  const analysis = await prisma.aIAnalysis.findUnique({
    where: { bookmarkId },
    select: {
      transcript: true,
      duration: true,
      language: true
    }
  })

  if (!analysis || !analysis.transcript) {
    return c.json({ error: 'No transcript found' }, 404)
  }

  return c.json(analysis)
})
```

## Supported Platforms

### YouTube
- ✅ Regular videos (`youtube.com/watch?v=...`)
- ✅ Shorts (`youtube.com/shorts/...`)
- ✅ Embedded videos (`youtu.be/...`)
- ⚠️ Private videos (requires authentication)
- ⚠️ Age-restricted videos (may require cookies)

### TikTok
- ✅ Public videos (`tiktok.com/@user/video/123`)
- ✅ Short links (`vm.tiktok.com/...`)
- ❌ Private accounts

### Twitter/X
- ✅ Video tweets
- ⚠️ May require authentication for some videos

### Instagram
- ✅ Reels (`instagram.com/reel/...`)
- ✅ Video posts
- ⚠️ Requires cookies for private accounts

### Reddit
- ✅ v.redd.it videos
- ✅ Video posts
- ✅ Most third-party video hosts

## Cost Analysis

### OpenAI Whisper API Pricing

**$0.006 per minute** of audio

### Monthly Cost Examples

| Scenario | Videos/Month | Avg Duration | Cost/Month |
|----------|-------------|--------------|------------|
| Light | 50 | 5 min | $1.50 |
| Medium | 100 | 8 min | $4.80 |
| Heavy | 200 | 10 min | $12.00 |
| Power User | 500 | 15 min | $45.00 |

### Combined AI Costs

For 100 bookmarks/month (50% videos, 50% text):

- **Transcription**: 50 videos × 8 min × $0.006 = $2.40
- **Claude Analysis**: 100 × $0.002 = $0.20
- **Total**: ~$2.60/month

## Optimization Strategies

### 1. Selective Transcription

Don't transcribe everything:

```typescript
async function shouldTranscribe(bookmark: Bookmark): Promise<boolean> {
  // Skip short videos (< 30 seconds)
  if (bookmark.metadata?.duration < 30) {
    return false
  }

  // Skip very long videos (> 1 hour) - too expensive
  if (bookmark.metadata?.duration > 3600) {
    return false
  }

  // Skip if transcript already exists
  const existing = await prisma.aIAnalysis.findUnique({
    where: { bookmarkId: bookmark.id },
    select: { transcript: true }
  })

  return !existing?.transcript
}
```

### 2. Lazy Transcription

Transcribe on-demand when user accesses bookmark:

```typescript
// Queue for background transcription
app.get('/bookmarks/:id', async (c) => {
  const bookmark = await prisma.bookmark.findUnique({
    where: { id: c.req.param('id') },
    include: { aiAnalysis: true }
  })

  // If no transcript and is media, queue transcription
  if (!bookmark.aiAnalysis?.transcript && isMediaContent(bookmark)) {
    // Queue async job
    transcriptionQueue.add({ bookmarkId: bookmark.id })
  }

  return c.json(bookmark)
})
```

### 3. Audio Quality Settings

Use lower quality for longer videos:

```typescript
function getAudioQuality(duration: number): string {
  if (duration < 300) return '0'  // Best quality < 5 min
  if (duration < 900) return '5'  // Medium quality < 15 min
  return '9'  // Lowest quality for long videos
}

const command = [
  'yt-dlp',
  '--extract-audio',
  '--audio-format mp3',
  `--audio-quality ${getAudioQuality(duration)}`,
  // ...
].join(' ')
```

### 4. Caching

Cache transcripts to avoid re-transcribing:

```typescript
// Check if video has been transcribed before (by URL hash)
const urlHash = crypto.createHash('sha256').update(url).digest('hex')

const cached = await prisma.transcriptCache.findUnique({
  where: { urlHash }
})

if (cached) {
  return cached.transcript
}

// Transcribe and cache
const transcript = await transcribe(url)

await prisma.transcriptCache.create({
  data: {
    urlHash,
    url,
    transcript: transcript.text,
    duration: transcript.duration
  }
})
```

### 5. Batch Processing

Process multiple videos in parallel:

```typescript
async function batchTranscribe(bookmarkIds: string[]): Promise<void> {
  const CONCURRENT_LIMIT = 3  // Process 3 at a time

  const chunks = chunkArray(bookmarkIds, CONCURRENT_LIMIT)

  for (const chunk of chunks) {
    await Promise.all(
      chunk.map(id => transcribeBookmark(id))
    )
  }
}
```

## Error Handling

### Common Errors & Solutions

#### 1. yt-dlp Download Failed

```typescript
try {
  await downloader.downloadAudio(url)
} catch (error) {
  if (error.message.includes('Video unavailable')) {
    // Mark as unavailable
    await prisma.bookmark.update({
      where: { id: bookmarkId },
      data: { metadata: { status: 'unavailable' } }
    })
  } else if (error.message.includes('Sign in to confirm your age')) {
    // Age-restricted content
    console.warn('Age-restricted video, skipping:', url)
  } else {
    throw error
  }
}
```

#### 2. File Too Large

```typescript
if (fileSize > 25 * 1024 * 1024) {
  // Try to compress or split
  const compressed = await compressAudio(filePath, targetSize: 24MB)
  return compressed
}
```

#### 3. Whisper API Timeout

```typescript
const timeout = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Transcription timeout')), 5 * 60 * 1000)
)

const transcription = await Promise.race([
  openai.audio.transcriptions.create({...}),
  timeout
])
```

#### 4. Invalid Audio Format

```typescript
// Convert to MP3 if needed
async function ensureMP3(filePath: string): Promise<string> {
  if (filePath.endsWith('.mp3')) return filePath

  const mp3Path = filePath.replace(/\.\w+$/, '.mp3')

  await execAsync(
    `ffmpeg -i "${filePath}" -acodec libmp3lame "${mp3Path}"`
  )

  await fs.unlink(filePath)  // Remove original
  return mp3Path
}
```

## Best Practices

### 1. Queue-Based Processing

Use a job queue for transcription:

```typescript
import Queue from 'bull'

const transcriptionQueue = new Queue('transcription', {
  redis: process.env.REDIS_URL
})

transcriptionQueue.process(async (job) => {
  const { bookmarkId } = job.data

  try {
    await transcribeBookmark(bookmarkId)
    return { success: true }
  } catch (error) {
    console.error('Transcription job failed:', error)
    throw error
  }
})

// Add to queue
transcriptionQueue.add(
  { bookmarkId },
  {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 }
  }
)
```

### 2. Progress Tracking

Track transcription status:

```typescript
enum TranscriptionStatus {
  PENDING = 'pending',
  DOWNLOADING = 'downloading',
  TRANSCRIBING = 'transcribing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

await prisma.aIAnalysis.update({
  where: { bookmarkId },
  data: {
    transcriptionStatus: TranscriptionStatus.DOWNLOADING,
    transcriptionProgress: 25
  }
})
```

### 3. Resource Cleanup

Schedule periodic cleanup:

```typescript
// Run every hour
cron.schedule('0 * * * *', async () => {
  const downloader = new AudioDownloader()
  await downloader.cleanupOldFiles(maxAgeHours: 2)
})
```

### 4. Monitoring

Log transcription metrics:

```typescript
await prisma.transcriptionMetrics.create({
  data: {
    bookmarkId,
    duration: transcript.duration,
    fileSize: audioFileSize,
    processingTime: endTime - startTime,
    cost: transcript.duration * 0.006 / 60,
    success: true
  }
})
```

### 5. Fallback Strategy

If transcription fails, continue without it:

```typescript
let transcript = null

try {
  transcript = await transcriptionService.transcribeFromUrl(url, platform)
} catch (error) {
  console.error('Transcription failed, continuing without:', error)
  // Still analyze with title/description only
}

const analysis = await claudeAnalyze(bookmark, transcript)
```

## Testing

### Unit Tests

```typescript
describe('TranscriptionService', () => {
  it('should transcribe YouTube video', async () => {
    const service = new TranscriptionService()
    const transcript = await service.transcribeFromUrl(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'youtube'
    )

    expect(transcript).not.toBeNull()
    expect(transcript.text).toContain('Never gonna give you up')
    expect(transcript.duration).toBeGreaterThan(0)
    expect(transcript.language).toBe('en')
  })

  it('should handle non-media content', async () => {
    const service = new TranscriptionService()
    const transcript = await service.transcribeFromUrl(
      'https://example.com/article',
      'web'
    )

    expect(transcript).toBeNull()
  })
})
```

## Docker Configuration

If deploying with Docker:

```dockerfile
FROM node:20-alpine

# Install Python and yt-dlp
RUN apk add --no-cache python3 py3-pip ffmpeg

# Install yt-dlp
RUN pip3 install yt-dlp

# Copy application
COPY . /app
WORKDIR /app

RUN npm install
RUN npm run build

CMD ["npm", "start"]
```

## Vercel Limitations & Solutions

⚠️ **CRITICAL**: Vercel serverless functions have strict limitations that **WILL BREAK** long video transcription:

### Vercel Limits

| Plan | Max Execution Time | Issue |
|------|-------------------|-------|
| Hobby | **10 seconds** | ❌ Can't download OR transcribe |
| Pro | **60 seconds** | ❌ Only very short videos work |
| Enterprise | **900 seconds** | ⚠️ May work for some videos |

### Why This Breaks

```
Typical Flow for 5-minute video:
1. Cobalt download: 10-30 seconds
2. Whisper transcription: 30-60 seconds
Total: 40-90 seconds ❌ TIMEOUT on Pro!

Long video (15 minutes):
1. Cobalt download: 30-90 seconds
2. Whisper transcription: 90-180 seconds
Total: 120-270 seconds ❌ ALWAYS TIMEOUT!
```

### 🎯 Solution: Background Job Queue

Use a **queue-based architecture** with external workers:

#### Architecture

```
┌─────────────────────────────────────────────┐
│         Vercel Serverless Function           │
│  (Just queues the job - returns immediately) │
└────────────┬────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────┐
│         Redis Queue (Upstash/Railway)        │
│         Stores pending jobs                  │
└────────────┬────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────┐
│     Background Worker (Docker/Railway)       │
│  - Downloads video with Cobalt               │
│  - Transcribes with Whisper                  │
│  - Stores result in database                 │
│  - No timeout limits!                        │
└─────────────────────────────────────────────┘
```

#### Implementation

**1. Install Queue Dependencies**

```bash
npm install bullmq ioredis
```

**2. Setup Redis Queue**

Create `src/lib/queue.ts`:

```typescript
import { Queue, Worker, Job } from 'bullmq'
import Redis from 'ioredis'

const connection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
})

export const transcriptionQueue = new Queue('transcription', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep for 24 hours
      count: 100,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failures for 7 days
    },
  },
})

export interface TranscriptionJob {
  bookmarkId: string
  url: string
  platform: string
  accountId: string
}
```

**3. Vercel API Endpoint (Just Queues)**

Create `src/routes/transcription.ts`:

```typescript
import { Hono } from 'hono'
import { transcriptionQueue } from '@/lib/queue'
import { prisma } from '@/lib/db'

const app = new Hono()

// Queue transcription (returns immediately)
app.post('/transcribe/:id', async (c) => {
  const bookmarkId = c.req.param('id')

  const bookmark = await prisma.bookmark.findUnique({
    where: { id: bookmarkId },
    select: {
      id: true,
      url: true,
      platform: true,
      accountId: true,
    }
  })

  if (!bookmark) {
    return c.json({ error: 'Bookmark not found' }, 404)
  }

  // Add to queue (this is fast - returns in <1s)
  const job = await transcriptionQueue.add('transcribe', {
    bookmarkId: bookmark.id,
    url: bookmark.url,
    platform: bookmark.platform,
    accountId: bookmark.accountId,
  })

  // Mark as pending
  await prisma.aIAnalysis.upsert({
    where: { bookmarkId },
    create: {
      bookmarkId,
      transcript: null,
      transcriptionStatus: 'PENDING',
      transcriptionJobId: job.id,
    },
    update: {
      transcriptionStatus: 'PENDING',
      transcriptionJobId: job.id,
    }
  })

  return c.json({
    success: true,
    jobId: job.id,
    status: 'queued',
    message: 'Transcription queued. Check status endpoint for progress.'
  })
})

// Check transcription status
app.get('/transcribe/status/:jobId', async (c) => {
  const jobId = c.req.param('jobId')

  const job = await transcriptionQueue.getJob(jobId)

  if (!job) {
    return c.json({ error: 'Job not found' }, 404)
  }

  const state = await job.getState()
  const progress = job.progress

  return c.json({
    jobId,
    state, // 'waiting', 'active', 'completed', 'failed'
    progress,
    failedReason: job.failedReason,
    finishedOn: job.finishedOn,
  })
})

export default app
```

**4. Background Worker (Separate Process)**

Create `src/worker.ts`:

```typescript
import { Worker, Job } from 'bullmq'
import Redis from 'ioredis'
import { TranscriptionService } from './services/transcription'
import { AIProcessor } from './services/ai-processor'
import { prisma } from './lib/db'
import { TranscriptionJob } from './lib/queue'

const connection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
})

const transcriptionService = new TranscriptionService()
const aiProcessor = new AIProcessor()

// Worker processes jobs from queue
const worker = new Worker<TranscriptionJob>(
  'transcription',
  async (job: Job<TranscriptionJob>) => {
    const { bookmarkId, url, platform, accountId } = job.data

    console.log(`[Worker] Processing transcription for bookmark ${bookmarkId}`)

    try {
      // Update status to PROCESSING
      await prisma.aIAnalysis.upsert({
        where: { bookmarkId },
        create: {
          bookmarkId,
          transcriptionStatus: 'PROCESSING',
        },
        update: {
          transcriptionStatus: 'PROCESSING',
        }
      })

      // Step 1: Download & transcribe (can take minutes - no timeout!)
      await job.updateProgress(10)
      console.log(`[Worker] Downloading audio from ${url}`)

      const transcript = await transcriptionService.transcribeFromUrl(url, platform)

      if (!transcript) {
        throw new Error('No media content found or transcription failed')
      }

      await job.updateProgress(60)
      console.log(`[Worker] Transcription complete: ${transcript.text.length} chars`)

      // Step 2: Store transcript
      await prisma.aIAnalysis.upsert({
        where: { bookmarkId },
        create: {
          bookmarkId,
          transcript: transcript.text,
          duration: transcript.duration,
          language: transcript.language,
          transcriptionStatus: 'COMPLETED',
        },
        update: {
          transcript: transcript.text,
          duration: transcript.duration,
          language: transcript.language,
          transcriptionStatus: 'COMPLETED',
        }
      })

      await job.updateProgress(80)

      // Step 3: Trigger AI analysis (optional)
      console.log(`[Worker] Triggering AI analysis`)
      await aiProcessor.analyzeBookmark(bookmarkId)

      await job.updateProgress(100)

      return {
        success: true,
        transcriptLength: transcript.text.length,
        duration: transcript.duration,
      }
    } catch (error) {
      console.error(`[Worker] Transcription failed for ${bookmarkId}:`, error)

      // Update status to FAILED
      await prisma.aIAnalysis.upsert({
        where: { bookmarkId },
        create: {
          bookmarkId,
          transcriptionStatus: 'FAILED',
          transcriptionError: error.message,
        },
        update: {
          transcriptionStatus: 'FAILED',
          transcriptionError: error.message,
        }
      })

      throw error
    }
  },
  {
    connection,
    concurrency: 2, // Process 2 videos at a time
    limiter: {
      max: 10, // Max 10 jobs per interval
      duration: 60000, // 1 minute
    },
  }
)

// Event handlers
worker.on('completed', (job) => {
  console.log(`[Worker] ✅ Job ${job.id} completed`)
})

worker.on('failed', (job, err) => {
  console.error(`[Worker] ❌ Job ${job?.id} failed:`, err.message)
})

worker.on('error', (err) => {
  console.error('[Worker] Error:', err)
})

console.log('[Worker] 🚀 Transcription worker started')

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Worker] Shutting down...')
  await worker.close()
  process.exit(0)
})
```

**5. Update Prisma Schema**

Add status tracking to AIAnalysis:

```prisma
enum TranscriptionStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

model AIAnalysis {
  // ... existing fields
  transcript  String?
  duration    Int?

  // Add these fields
  transcriptionStatus  TranscriptionStatus?
  transcriptionJobId   String?
  transcriptionError   String?

  // ... rest of schema
}
```

**6. Deploy Worker Separately**

**Option A: Railway (Recommended - Free Tier)**

```yaml
# railway.json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm run build"
  },
  "deploy": {
    "startCommand": "node dist/worker.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Option B: Render.com (Free Tier)**

```yaml
# render.yaml
services:
  - type: worker
    name: karakeep-worker
    env: node
    buildCommand: npm install && npm run build
    startCommand: node dist/worker.js
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: REDIS_URL
        sync: false
      - key: OPENAI_API_KEY
        sync: false
```

**Option C: Docker on VPS**

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .
RUN npm run build

# Run worker only
CMD ["node", "dist/worker.js"]
```

**Option D: Fly.io (Free Tier)**

```toml
# fly.toml
app = "karakeep-worker"

[build]
  builder = "heroku/buildpacks:20"

[[services]]
  internal_port = 3000
  protocol = "tcp"

  [processes]
    worker = "node dist/worker.js"
```

**7. Environment Variables**

```env
# Vercel (API only)
DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=sk-ant-...
REDIS_URL=redis://default:xxx@redis.railway.app:6379

# Worker (Railway/Render/Docker)
DATABASE_URL=postgresql://...  # Same database
REDIS_URL=redis://...           # Same Redis
OPENAI_API_KEY=sk-proj-...
COBALT_API_URL=https://api.cobalt.tools
```

### 📊 Cost for Background Workers

| Service | Free Tier | Cost (Paid) |
|---------|-----------|-------------|
| Railway | 500 hours/month | $5/month |
| Render | 750 hours/month | $7/month |
| Fly.io | 3 VMs free | $1.94/month per VM |
| Upstash Redis | 10K requests/day | $0.20/100K requests |

**Recommended Stack**:
- Vercel (API): Free
- Railway (Worker): Free tier
- Upstash (Redis): Free tier
- **Total: $0/month** for moderate usage! 🎉

### 🚀 Deployment Flow

1. **Deploy Vercel** (API only - queues jobs)
   ```bash
   vercel --prod
   ```

2. **Setup Upstash Redis**
   ```bash
   # Create free Redis at upstash.com
   # Copy REDIS_URL
   ```

3. **Deploy Worker to Railway**
   ```bash
   # Connect GitHub repo to Railway
   # Set environment variables
   # Worker starts automatically
   ```

4. **Test**
   ```bash
   # Queue a transcription
   curl -X POST https://your-app.vercel.app/api/transcribe/bookmark-id

   # Check status
   curl https://your-app.vercel.app/api/transcribe/status/job-id
   ```

### ✅ Benefits of This Architecture

1. **No Timeouts** - Worker can process videos of any length
2. **Scalable** - Add more workers for parallel processing
3. **Resilient** - Auto-retry on failures
4. **Observable** - Track job progress in real-time
5. **Free Tier Friendly** - Railway + Upstash free tiers
6. **Better UX** - Immediate response, background processing

### 🎯 Automatic Transcription on Sync

Queue transcription automatically when syncing:

```typescript
// In sync service
async syncBookmarks() {
  for (const post of posts) {
    const bookmark = await createBookmark(post)

    // Auto-queue transcription for videos
    if (isMediaContent(post.url)) {
      await transcriptionQueue.add('transcribe', {
        bookmarkId: bookmark.id,
        url: post.url,
        platform: post.platform,
        accountId: post.accountId,
      })
    }
  }
}
```

## References

- [yt-dlp Documentation](https://github.com/yt-dlp/yt-dlp)
- [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [PLAN.md](./PLAN.md) - Main project plan
- [CLAUDE.md](./CLAUDE.md) - Claude AI integration

---

**Next Steps**: Implement transcription service and test with real YouTube/TikTok videos!
