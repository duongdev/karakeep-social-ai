# Whisper API Setup Guide

[← Back to Documentation Index](../README.md)

Complete guide for setting up OpenAI Whisper API for audio transcription in Karakeep.

## Table of Contents

- [Overview](#overview)
- [Setup](#setup)
- [Implementation](#implementation)
- [Configuration](#configuration)
- [Best Practices](#best-practices)
- [Cost Optimization](#cost-optimization)
- [Error Handling](#error-handling)
- [Troubleshooting](#troubleshooting)

## Overview

OpenAI Whisper API provides automatic speech recognition (ASR) for audio transcription:

### Features

✅ **Multi-language Support** - 97+ languages supported
✅ **High Accuracy** - State-of-the-art speech recognition
✅ **Speaker Diarization** - Identify different speakers (via segments)
✅ **Timestamps** - Word and segment-level timing
✅ **Automatic Language Detection** - No need to specify language
✅ **Simple API** - Just upload audio file

### Limitations

- Max file size: **25MB**
- Max duration: No hard limit (but affects cost)
- Supported formats: MP3, MP4, MPEG, MPGA, M4A, WAV, WEBM

## Setup

### 1. Get API Key

1. Sign up at [OpenAI Platform](https://platform.openai.com/)
2. Navigate to API Keys section
3. Create a new API key
4. Copy the key (starts with `sk-proj-`)

### 2. Install SDK

```bash
npm install openai
```

### 3. Configure Environment

Add to your `.env` file:

```env
# OpenAI API
OPENAI_API_KEY=sk-proj-xxx

# Transcription Settings
MAX_AUDIO_FILE_SIZE=26214400  # 25MB
MAX_VIDEO_DURATION=3600        # 1 hour
```

## Implementation

### 1. Transcription Service

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

### 2. Media Detection

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

### 3. Integration with AI Processor

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

## Configuration

### Response Formats

Whisper API supports multiple response formats:

```typescript
// 1. Text only (simple)
const response = await openai.audio.transcriptions.create({
  file: fileStream,
  model: 'whisper-1',
  response_format: 'text'
})
// Returns: string

// 2. JSON (basic metadata)
const response = await openai.audio.transcriptions.create({
  file: fileStream,
  model: 'whisper-1',
  response_format: 'json'
})
// Returns: { text: string }

// 3. Verbose JSON (with timestamps)
const response = await openai.audio.transcriptions.create({
  file: fileStream,
  model: 'whisper-1',
  response_format: 'verbose_json',
  timestamp_granularities: ['segment']
})
// Returns: { text, duration, language, segments }

// 4. VTT (subtitle format)
const response = await openai.audio.transcriptions.create({
  file: fileStream,
  model: 'whisper-1',
  response_format: 'vtt'
})
// Returns: VTT format string

// 5. SRT (subtitle format)
const response = await openai.audio.transcriptions.create({
  file: fileStream,
  model: 'whisper-1',
  response_format: 'srt'
})
// Returns: SRT format string
```

### Language Options

```typescript
// Auto-detect (recommended)
const response = await openai.audio.transcriptions.create({
  file: fileStream,
  model: 'whisper-1',
  language: undefined
})

// Specify language (improves accuracy if known)
const response = await openai.audio.transcriptions.create({
  file: fileStream,
  model: 'whisper-1',
  language: 'en'  // ISO-639-1 code
})

// Supported languages
const languages = [
  'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh',
  'ar', 'hi', 'tr', 'nl', 'sv', 'pl', 'uk', 'vi', 'th', 'id',
  // ... 97+ languages total
]
```

### Timestamp Granularities

```typescript
// Segment-level timestamps (default)
const response = await openai.audio.transcriptions.create({
  file: fileStream,
  model: 'whisper-1',
  response_format: 'verbose_json',
  timestamp_granularities: ['segment']
})

// Word-level timestamps (more precise)
const response = await openai.audio.transcriptions.create({
  file: fileStream,
  model: 'whisper-1',
  response_format: 'verbose_json',
  timestamp_granularities: ['word']
})

// Both segment and word timestamps
const response = await openai.audio.transcriptions.create({
  file: fileStream,
  model: 'whisper-1',
  response_format: 'verbose_json',
  timestamp_granularities: ['segment', 'word']
})
```

## Best Practices

### 1. File Size Management

```typescript
async function ensureFileSizeLimit(filePath: string): Promise<void> {
  const stats = await fs.stat(filePath)
  const sizeMB = stats.size / 1024 / 1024

  if (sizeMB > 25) {
    throw new Error(`File too large: ${sizeMB.toFixed(2)}MB (max 25MB)`)
  }
}
```

### 2. Audio Format Conversion

```typescript
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

async function convertToMP3(inputPath: string): Promise<string> {
  const outputPath = inputPath.replace(/\.\w+$/, '.mp3')

  await execAsync(
    `ffmpeg -i "${inputPath}" -acodec libmp3lame -b:a 128k "${outputPath}"`
  )

  return outputPath
}
```

### 3. Progress Tracking

```typescript
async function transcribeWithProgress(
  filePath: string,
  onProgress: (status: string) => void
): Promise<Transcript> {
  onProgress('Uploading audio file...')

  const fileStream = fs.createReadStream(filePath)

  onProgress('Transcribing...')

  const response = await openai.audio.transcriptions.create({
    file: fileStream,
    model: 'whisper-1',
    response_format: 'verbose_json'
  })

  onProgress('Complete!')

  return {
    text: response.text,
    duration: response.duration || 0,
    language: response.language,
    segments: response.segments
  }
}
```

### 4. Caching Transcripts

```typescript
import crypto from 'crypto'

async function transcribeWithCache(url: string): Promise<Transcript> {
  // Generate URL hash
  const urlHash = crypto.createHash('sha256').update(url).digest('hex')

  // Check cache
  const cached = await prisma.transcriptCache.findUnique({
    where: { urlHash }
  })

  if (cached) {
    return JSON.parse(cached.transcript)
  }

  // Transcribe
  const transcript = await transcriptionService.transcribeFromUrl(url, platform)

  // Store in cache
  await prisma.transcriptCache.create({
    data: {
      urlHash,
      url,
      transcript: JSON.stringify(transcript)
    }
  })

  return transcript
}
```

## Cost Optimization

### Pricing

**$0.006 per minute** of audio

### Cost Examples

| Duration | Cost |
|----------|------|
| 30 seconds | $0.003 |
| 1 minute | $0.006 |
| 5 minutes | $0.030 |
| 10 minutes | $0.060 |
| 30 minutes | $0.180 |
| 1 hour | $0.360 |

### Monthly Cost Estimates

| Scenario | Videos/Month | Avg Duration | Cost/Month |
|----------|-------------|--------------|------------|
| Light | 50 | 5 min | $1.50 |
| Medium | 100 | 8 min | $4.80 |
| Heavy | 200 | 10 min | $12.00 |
| Power User | 500 | 15 min | $45.00 |

### Optimization Strategies

#### 1. Selective Transcription

```typescript
async function shouldTranscribe(bookmark: Bookmark): Promise<boolean> {
  // Skip very short videos (< 30 seconds)
  if (bookmark.metadata?.duration < 30) {
    return false
  }

  // Skip very long videos (> 1 hour)
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

#### 2. Lazy Transcription

```typescript
// Don't transcribe immediately - wait until user accesses
app.get('/bookmarks/:id', async (c) => {
  const bookmark = await getBookmark(id)

  // Queue transcription in background
  if (!bookmark.aiAnalysis?.transcript && isMediaContent(bookmark)) {
    transcriptionQueue.add({ bookmarkId: bookmark.id })
  }

  return c.json(bookmark)
})
```

#### 3. Lower Audio Quality

```typescript
// Download lower quality audio for longer videos
function getAudioQuality(duration: number): string {
  if (duration < 300) return '0'   // Best quality < 5 min
  if (duration < 900) return '5'   // Medium < 15 min
  return '9'                        // Lowest for long videos
}
```

## Error Handling

### Common Errors

```typescript
try {
  const transcript = await transcribe(filePath)
} catch (error) {
  if (error.status === 400) {
    // Invalid file format or size
    console.error('Invalid audio file:', error.message)
  } else if (error.status === 401) {
    // Invalid API key
    console.error('Invalid OpenAI API key')
  } else if (error.status === 429) {
    // Rate limit exceeded
    console.error('Rate limit exceeded, waiting...')
    await sleep(60000) // Wait 1 minute
    return retry()
  } else if (error.status === 500) {
    // Server error
    console.error('OpenAI server error, retrying...')
    return retry()
  } else {
    throw error
  }
}
```

### Retry with Backoff

```typescript
async function transcribeWithRetry(
  filePath: string,
  maxRetries = 3
): Promise<Transcript> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await transcribe(filePath)
    } catch (error) {
      if (i === maxRetries - 1) throw error

      const delay = Math.pow(2, i) * 1000
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`)
      await sleep(delay)
    }
  }
}
```

### Timeout Handling

```typescript
async function transcribeWithTimeout(
  filePath: string,
  timeoutMs = 5 * 60 * 1000  // 5 minutes
): Promise<Transcript> {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Transcription timeout')), timeoutMs)
  )

  const transcription = openai.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: 'whisper-1'
  })

  return await Promise.race([transcription, timeout])
}
```

## Troubleshooting

### Problem: File too large

**Solution**: Compress audio or split into chunks

```typescript
async function compressAudio(inputPath: string): Promise<string> {
  const outputPath = inputPath.replace('.mp3', '_compressed.mp3')

  await execAsync(
    `ffmpeg -i "${inputPath}" -b:a 64k "${outputPath}"`
  )

  return outputPath
}
```

### Problem: Unsupported format

**Solution**: Convert to MP3

```typescript
async function convertToSupportedFormat(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase()
  const supported = ['.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm']

  if (supported.includes(ext)) {
    return filePath
  }

  // Convert to MP3
  return await convertToMP3(filePath)
}
```

### Problem: Poor transcription quality

**Solutions**:
1. Specify language explicitly
2. Use higher quality audio
3. Pre-process audio (noise reduction)

```typescript
// Specify language
const response = await openai.audio.transcriptions.create({
  file: fileStream,
  model: 'whisper-1',
  language: 'en',  // Improves accuracy
  prompt: 'This is a technical discussion about software development.'  // Context hint
})
```

## Related Documentation

- [Cobalt Setup](./cobalt-setup.md) - Audio download service
- [Queue Processing](./queue-processing.md) - Background job processing
- [Transcription Overview](./overview.md) - Complete transcription guide

## References

- [OpenAI Whisper API Documentation](https://platform.openai.com/docs/guides/speech-to-text)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference/audio)
- [Whisper Model Card](https://github.com/openai/whisper/blob/main/model-card.md)

---

**Last Updated**: 2025-10-26
