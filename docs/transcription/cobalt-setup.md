# Cobalt API Setup Guide

[← Back to Documentation Index](../README.md)

Complete guide for setting up Cobalt API for video/audio downloads in Karakeep.

## Table of Contents

- [Why Cobalt?](#why-cobalt)
- [Installation](#installation)
- [Configuration](#configuration)
- [Implementation](#implementation)
- [API Reference](#api-reference)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [Self-Hosting](#self-hosting)
- [Troubleshooting](#troubleshooting)

## Why Cobalt?

Cobalt API is superior to yt-dlp for serverless environments like Vercel:

### Advantages

✅ **No System Dependencies** - Pure HTTP API, no binaries required
✅ **Serverless Friendly** - Works on Vercel without modification
✅ **Better Platform Support** - YouTube, TikTok, Instagram, Twitter, Reddit, SoundCloud, Vimeo, VK
✅ **Simple API** - Just HTTP POST requests
✅ **Active Maintenance** - Regular updates for platform changes
✅ **Audio-only Mode** - Direct audio extraction support
✅ **Free Public API** - Use cobalt.tools or self-host

### vs yt-dlp

| Feature | Cobalt | yt-dlp |
|---------|--------|--------|
| System dependencies | None ✅ | Python + ffmpeg ❌ |
| Vercel compatible | Yes ✅ | No ❌ |
| API-first design | Yes ✅ | CLI-first ⚠️ |
| Deployment complexity | Low ✅ | High ❌ |
| Platform updates | Automatic ✅ | Manual ⚠️ |

## Installation

### Using Public API

No installation needed! Just use `https://api.cobalt.tools`

### Using NPM Package

```bash
npm install axios  # For HTTP requests
```

That's it! No other dependencies required.

## Configuration

### Environment Variables

Add to your `.env` file:

```env
# Cobalt API Configuration
COBALT_API_URL=https://api.cobalt.tools  # Or your self-hosted instance
COBALT_API_KEY=  # Optional, only if self-hosting with auth

# Storage
TRANSCRIPTION_DIR=/tmp/karakeep/audio
MAX_FILE_SIZE=26214400  # 25MB (Whisper API limit)
```

### Supported Platforms

Cobalt supports:
- YouTube (videos, shorts, music)
- TikTok
- Twitter/X
- Instagram (posts, reels, stories)
- Reddit
- SoundCloud
- Vimeo
- VK
- And more...

## Implementation

### 1. Cobalt Downloader Service

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

### 2. Usage Example

```typescript
import { CobaltDownloader } from '@/services/cobalt-downloader'

const downloader = new CobaltDownloader()

// Download audio from YouTube
const result = await downloader.downloadAudio('https://www.youtube.com/watch?v=dQw4w9WgXcQ')

console.log('Downloaded:', result.filePath)
console.log('Size:', (result.fileSize / 1024 / 1024).toFixed(2), 'MB')

// Use the audio file
await processAudio(result.filePath)

// Cleanup
await downloader.cleanup(result.filePath)
```

## API Reference

### Request Format

```typescript
POST https://api.cobalt.tools

{
  "url": "https://www.youtube.com/watch?v=...",
  "downloadMode": "audio",  // 'auto' | 'audio' | 'mute'
  "audioFormat": "mp3",     // 'mp3' | 'ogg' | 'wav' | 'opus'
  "filenameStyle": "basic"  // 'classic' | 'basic' | 'pretty' | 'nerdy'
}
```

### Response Types

#### Success: Redirect

```json
{
  "status": "redirect",
  "url": "https://direct-download-link.com/audio.mp3"
}
```

#### Success: Tunnel (Proxied)

```json
{
  "status": "tunnel",
  "url": "https://api.cobalt.tools/tunnel?id=..."
}
```

#### Success: Picker (Multiple Options)

```json
{
  "status": "picker",
  "pickerType": "various",
  "picker": [
    {
      "type": "audio",
      "url": "https://...",
      "thumb": "https://..."
    }
  ]
}
```

#### Error

```json
{
  "status": "error",
  "error": "Error message here"
}
```

### Audio Format Options

- `mp3` - Most compatible (default)
- `ogg` - Open format, smaller size
- `wav` - Uncompressed, large files
- `opus` - Best quality-to-size ratio

## Error Handling

### Common Errors

```typescript
try {
  const result = await downloader.downloadAudio(url)
} catch (error) {
  if (error.message.includes('rate limit')) {
    // Rate limited - wait and retry
    await sleep(60000) // Wait 1 minute
    return retry()
  }

  if (error.message.includes('too large')) {
    // File exceeds 25MB limit
    console.error('Video too long or high quality')
    return null
  }

  if (error.message.includes('No audio option')) {
    // Video has no audio track
    console.error('Video has no audio')
    return null
  }

  // Other errors
  console.error('Cobalt download failed:', error)
  throw error
}
```

### Retry Logic

```typescript
async function downloadWithRetry(url: string, maxRetries = 3): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await downloader.downloadAudio(url)
    } catch (error) {
      if (i === maxRetries - 1) throw error

      // Exponential backoff
      const delay = Math.pow(2, i) * 1000
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}
```

## Best Practices

### 1. Always Cleanup

```typescript
let filePath: string | null = null

try {
  const result = await downloader.downloadAudio(url)
  filePath = result.filePath

  // Process the file
  await transcribe(filePath)
} finally {
  // Always cleanup, even on error
  if (filePath) {
    await downloader.cleanup(filePath)
  }
}
```

### 2. Periodic Cleanup

```typescript
import cron from 'node-cron'

// Cleanup old files every hour
cron.schedule('0 * * * *', async () => {
  const downloader = new CobaltDownloader()
  await downloader.cleanupOldFiles(2) // Delete files older than 2 hours
})
```

### 3. Health Checks

```typescript
// Before processing, check if Cobalt is available
const downloader = new CobaltDownloader()
const isHealthy = await downloader.healthCheck()

if (!isHealthy) {
  throw new Error('Cobalt API is unavailable')
}
```

### 4. Rate Limiting

```typescript
// Implement client-side rate limiting
class RateLimitedDownloader {
  private lastRequest = 0
  private minInterval = 1000 // 1 second between requests

  async download(url: string) {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequest

    if (timeSinceLastRequest < this.minInterval) {
      await sleep(this.minInterval - timeSinceLastRequest)
    }

    this.lastRequest = Date.now()
    return await downloader.downloadAudio(url)
  }
}
```

## Self-Hosting

### Using Docker

```bash
# Pull and run Cobalt
docker run -p 9000:9000 ghcr.io/imputnet/cobalt

# Or with custom port
docker run -p 3000:9000 ghcr.io/imputnet/cobalt

# Then use in your app
COBALT_API_URL=http://localhost:9000
```

### Docker Compose

```yaml
version: '3.8'

services:
  cobalt:
    image: ghcr.io/imputnet/cobalt
    ports:
      - "9000:9000"
    environment:
      - API_URL=http://localhost:9000
    restart: unless-stopped
```

### Custom Configuration

```typescript
// Use self-hosted instance
const downloader = new CobaltDownloader('http://localhost:9000')

// Or with authentication
const downloader = new CobaltDownloader(
  'https://your-cobalt-instance.com',
  '/tmp/audio'
)
```

## Troubleshooting

### Problem: Cobalt API returns error

**Check**:
- Is the URL valid and accessible?
- Is the video platform supported?
- Is the video public or private?

**Solution**:
```typescript
// Validate URL before sending to Cobalt
function isValidVideoUrl(url: string): boolean {
  const patterns = [
    /youtube\.com\/watch/,
    /youtu\.be\//,
    /tiktok\.com\//,
    /instagram\.com\//,
    // Add more patterns
  ]

  return patterns.some(pattern => pattern.test(url))
}
```

### Problem: Downloaded file is too large

**Solution**:
```typescript
// Request lower quality audio
const response = await axios.post(this.apiUrl, {
  url,
  downloadMode: 'audio',
  audioFormat: 'opus',  // Better compression
  audioQuality: 'low',   // Lower bitrate
})
```

### Problem: Rate limiting

**Solution**:
- Implement exponential backoff
- Use your own Cobalt instance
- Cache results for duplicate URLs

### Problem: Timeout on long videos

**Solution**:
```typescript
// Increase timeout for long videos
const response = await axios.post(
  this.apiUrl,
  { url, downloadMode: 'audio' },
  { timeout: 10 * 60 * 1000 }  // 10 minutes
)
```

## Related Documentation

- [Whisper Setup](./whisper-setup.md) - Audio transcription
- [Queue Processing](./queue-processing.md) - Background job processing
- [Transcription Overview](./overview.md) - Complete transcription guide

## References

- [Cobalt Official Website](https://cobalt.tools/)
- [Cobalt GitHub](https://github.com/imputnet/cobalt)
- [Cobalt API Documentation](https://github.com/imputnet/cobalt/blob/main/docs/api.md)

---

**Last Updated**: 2025-10-26
