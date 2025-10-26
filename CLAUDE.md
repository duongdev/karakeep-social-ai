# Claude AI Integration Guide

This document explains how Claude AI is integrated into Karakeep for bookmark analysis, categorization, and intelligent search.

## Table of Contents

- [Overview](#overview)
- [Setup](#setup)
- [Core Features](#core-features)
- [Implementation](#implementation)
- [Prompt Engineering](#prompt-engineering)
- [Cost Optimization](#cost-optimization)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

Karakeep uses Claude API (Anthropic) for:

1. **Summarization**: Generate concise summaries of bookmarked posts
2. **Key Points Extraction**: Extract main takeaways from content
3. **Auto-tagging**: Suggest relevant tags based on content
4. **Categorization**: Automatically assign posts to appropriate lists
5. **Sentiment Analysis**: Detect tone and sentiment
6. **Semantic Search**: Find relevant bookmarks using natural language
7. **Q&A System**: Answer questions about your bookmark collection

## Setup

### 1. Get API Key

1. Sign up at [Anthropic Console](https://console.anthropic.com/)
2. Navigate to API Keys section
3. Create a new API key
4. Copy the key (starts with `sk-ant-`)

### 2. Configure Environment

Add to your `.env` file:

```env
ANTHROPIC_API_KEY=sk-ant-api03-xxx
CLAUDE_MODEL=claude-3-5-sonnet-20241022
CLAUDE_MAX_TOKENS=4096
```

### 3. Install SDK

```bash
npm install @anthropic-ai/sdk
```

## Core Features

### Feature Matrix

| Feature | Model | Input Tokens (avg) | Output Tokens (avg) | Cost per Request |
|---------|-------|-------------------|---------------------|------------------|
| Summarization | Claude 3.5 Sonnet | 500 | 150 | $0.0019 |
| Auto-tagging | Claude 3.5 Sonnet | 400 | 30 | $0.0013 |
| Categorization | Claude 3.5 Sonnet | 600 | 50 | $0.0020 |
| Semantic Search | Claude 3.5 Sonnet | 2000 | 300 | $0.0070 |
| Q&A | Claude 3.5 Sonnet | 3000 | 500 | $0.0115 |

*Costs based on Claude 3.5 Sonnet pricing: $3/million input tokens, $15/million output tokens*

## Implementation

### 1. Claude Client Setup

Create `src/lib/claude.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const claude = anthropic

// Default configuration
export const CLAUDE_CONFIG = {
  model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
  max_tokens: parseInt(process.env.CLAUDE_MAX_TOKENS || '4096'),
  temperature: 0.7,
}
```

### 2. AI Processor Service

Create `src/services/ai-processor.ts`:

```typescript
import { claude, CLAUDE_CONFIG } from '@/lib/claude'
import { prisma } from '@/lib/db'

export class AIProcessor {
  /**
   * Analyze a bookmark and extract insights
   */
  async analyzeBookmark(bookmarkId: string) {
    const bookmark = await prisma.bookmark.findUnique({
      where: { id: bookmarkId },
      include: { account: true }
    })

    if (!bookmark) {
      throw new Error('Bookmark not found')
    }

    const content = this.prepareContent(bookmark)
    const analysis = await this.callClaude(content)

    // Store analysis in database
    await prisma.aIAnalysis.create({
      data: {
        bookmarkId: bookmark.id,
        summary: analysis.summary,
        keyPoints: analysis.keyPoints,
        topics: analysis.topics,
        sentiment: analysis.sentiment,
        language: analysis.language,
        modelUsed: CLAUDE_CONFIG.model,
      }
    })

    // Auto-create and assign tags
    if (analysis.tags && analysis.tags.length > 0) {
      await this.assignTags(bookmarkId, analysis.tags)
    }

    return analysis
  }

  /**
   * Prepare bookmark content for Claude
   */
  private prepareContent(bookmark: any): string {
    const parts = [
      `Platform: ${bookmark.platform}`,
      `Title: ${bookmark.title || 'N/A'}`,
      `Author: ${bookmark.authorName || 'Unknown'}`,
      `Content: ${bookmark.content || ''}`,
      `URL: ${bookmark.url}`,
    ]

    return parts.filter(p => p).join('\n')
  }

  /**
   * Call Claude API for analysis
   */
  private async callClaude(content: string) {
    const message = await claude.messages.create({
      model: CLAUDE_CONFIG.model,
      max_tokens: CLAUDE_CONFIG.max_tokens,
      temperature: 0.5, // Lower temperature for more consistent analysis
      messages: [
        {
          role: 'user',
          content: `Analyze this social media post and provide a structured response:

${content}

Please provide:
1. A concise 2-3 sentence summary
2. 3-5 key points or takeaways (as array)
3. Primary topics/themes (as array, max 5)
4. Sentiment (positive/negative/neutral/mixed)
5. Language code (e.g., en, es, fr)
6. 3-5 relevant tags for categorization

Format your response as JSON:
{
  "summary": "...",
  "keyPoints": ["...", "..."],
  "topics": ["...", "..."],
  "sentiment": "positive",
  "language": "en",
  "tags": ["...", "..."]
}`
        }
      ]
    })

    // Parse Claude's response
    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : ''

    try {
      // Extract JSON from response (Claude might wrap it in markdown)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      throw new Error('Could not parse JSON from Claude response')
    } catch (error) {
      console.error('Failed to parse Claude response:', responseText)
      throw error
    }
  }

  /**
   * Assign tags to bookmark
   */
  private async assignTags(bookmarkId: string, tagNames: string[]) {
    for (const tagName of tagNames) {
      // Find or create tag
      let tag = await prisma.tag.findUnique({
        where: { name: tagName.toLowerCase() }
      })

      if (!tag) {
        tag = await prisma.tag.create({
          data: { name: tagName.toLowerCase() }
        })
      }

      // Create bookmark-tag relationship
      await prisma.bookmarkTag.upsert({
        where: {
          bookmarkId_tagId: {
            bookmarkId,
            tagId: tag.id
          }
        },
        create: {
          bookmarkId,
          tagId: tag.id,
          confidence: 0.8 // Default AI confidence
        },
        update: {}
      })
    }
  }

  /**
   * Batch process multiple bookmarks
   */
  async batchProcess(bookmarkIds: string[]) {
    const results = []

    for (const bookmarkId of bookmarkIds) {
      try {
        const analysis = await this.analyzeBookmark(bookmarkId)
        results.push({ bookmarkId, success: true, analysis })

        // Rate limiting: wait 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        results.push({
          bookmarkId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return results
  }

  /**
   * Categorize bookmark into lists
   */
  async categorizeToLists(bookmarkId: string) {
    const bookmark = await prisma.bookmark.findUnique({
      where: { id: bookmarkId },
      include: {
        aiAnalysis: true,
        tags: { include: { tag: true } }
      }
    })

    if (!bookmark) {
      throw new Error('Bookmark not found')
    }

    const lists = await prisma.list.findMany()

    const message = await claude.messages.create({
      model: CLAUDE_CONFIG.model,
      max_tokens: 500,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: `Given this bookmark:
Title: ${bookmark.title}
Content: ${bookmark.content?.substring(0, 500)}
Topics: ${bookmark.aiAnalysis?.topics || []}
Tags: ${bookmark.tags.map(t => t.tag.name).join(', ')}

And these available lists:
${lists.map(l => `- ${l.name}: ${l.description || 'No description'}`).join('\n')}

Which list(s) should this bookmark belong to? Respond with only the list names as a JSON array.
Example: ["Design", "Tutorials"]`
        }
      ]
    })

    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : ''

    try {
      const listNames = JSON.parse(responseText)

      for (const listName of listNames) {
        const list = lists.find(l =>
          l.name.toLowerCase() === listName.toLowerCase()
        )

        if (list) {
          await prisma.bookmarkList.upsert({
            where: {
              bookmarkId_listId: {
                bookmarkId: bookmark.id,
                listId: list.id
              }
            },
            create: {
              bookmarkId: bookmark.id,
              listId: list.id
            },
            update: {}
          })
        }
      }

      return listNames
    } catch (error) {
      console.error('Failed to parse list categorization:', responseText)
      return []
    }
  }
}
```

### 3. Semantic Search

Create `src/services/search.ts`:

```typescript
import { claude, CLAUDE_CONFIG } from '@/lib/claude'
import { prisma } from '@/lib/db'

export class SearchService {
  /**
   * Semantic search using Claude
   */
  async search(query: string, limit: number = 10) {
    // Get recent bookmarks with their analysis
    const bookmarks = await prisma.bookmark.findMany({
      take: 100, // Search within recent 100 bookmarks
      orderBy: { savedAt: 'desc' },
      include: {
        aiAnalysis: true,
        tags: { include: { tag: true } },
        account: true
      }
    })

    // Prepare context for Claude
    const bookmarkContext = bookmarks.map((b, idx) => {
      return `[${idx}] ${b.title || 'Untitled'}
Platform: ${b.platform}
Author: ${b.authorName}
Summary: ${b.aiAnalysis?.summary || b.content?.substring(0, 200)}
Topics: ${b.aiAnalysis?.topics || []}
Tags: ${b.tags.map(t => t.tag.name).join(', ')}
URL: ${b.url}
---`
    }).join('\n\n')

    const message = await claude.messages.create({
      model: CLAUDE_CONFIG.model,
      max_tokens: 2000,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: `I have these bookmarks:

${bookmarkContext}

User query: "${query}"

Based on the query, return the indices of the most relevant bookmarks (maximum ${limit}) in order of relevance.
Also provide a brief explanation of why each is relevant.

Format as JSON:
{
  "results": [
    {"index": 0, "relevance": "high", "reason": "..."},
    {"index": 5, "relevance": "medium", "reason": "..."}
  ]
}`
        }
      ]
    })

    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : ''

    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Could not parse JSON from response')
      }

      const parsed = JSON.parse(jsonMatch[0])

      const results = parsed.results.map((r: any) => ({
        bookmark: bookmarks[r.index],
        relevance: r.relevance,
        reason: r.reason
      }))

      return results
    } catch (error) {
      console.error('Failed to parse search results:', responseText)
      return []
    }
  }
}
```

### 4. Q&A System (RAG)

Create `src/services/qa.ts`:

```typescript
import { claude, CLAUDE_CONFIG } from '@/lib/claude'
import { prisma } from '@/lib/db'

export class QAService {
  /**
   * Answer questions about bookmarks using RAG
   */
  async ask(question: string, filters?: {
    platforms?: string[]
    tags?: string[]
    dateRange?: { start: Date; end: Date }
  }) {
    // Retrieve relevant bookmarks
    const bookmarks = await prisma.bookmark.findMany({
      where: {
        ...(filters?.platforms && { platform: { in: filters.platforms } }),
        ...(filters?.dateRange && {
          savedAt: {
            gte: filters.dateRange.start,
            lte: filters.dateRange.end
          }
        }),
        ...(filters?.tags && {
          tags: {
            some: {
              tag: {
                name: { in: filters.tags }
              }
            }
          }
        })
      },
      take: 50,
      orderBy: { savedAt: 'desc' },
      include: {
        aiAnalysis: true,
        tags: { include: { tag: true } },
        account: true
      }
    })

    // Prepare context
    const context = bookmarks.map(b => {
      return `Title: ${b.title || 'Untitled'}
Author: ${b.authorName}
Platform: ${b.platform}
Content: ${b.aiAnalysis?.summary || b.content?.substring(0, 300)}
Key Points: ${JSON.stringify(b.aiAnalysis?.keyPoints || [])}
Topics: ${JSON.stringify(b.aiAnalysis?.topics || [])}
URL: ${b.url}
---`
    }).join('\n\n')

    const message = await claude.messages.create({
      model: CLAUDE_CONFIG.model,
      max_tokens: 4096,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: `You are a helpful assistant that answers questions about a user's bookmarked content.

Here are the relevant bookmarks from the user's collection:

${context}

User question: ${question}

Please provide a comprehensive answer based on the bookmarks above. If the bookmarks don't contain enough information to answer the question, say so. Always cite the specific bookmarks you reference by including their URLs.`
        }
      ]
    })

    const answer = message.content[0].type === 'text'
      ? message.content[0].text
      : ''

    // Extract cited URLs from the answer
    const citedUrls = bookmarks
      .filter(b => answer.includes(b.url))
      .map(b => ({
        id: b.id,
        title: b.title,
        url: b.url
      }))

    return {
      answer,
      sources: citedUrls,
      totalBookmarksSearched: bookmarks.length
    }
  }
}
```

### 5. API Endpoints

Create `src/routes/ai.ts`:

```typescript
import { Hono } from 'hono'
import { AIProcessor } from '@/services/ai-processor'
import { SearchService } from '@/services/search'
import { QAService } from '@/services/qa'

const app = new Hono()
const aiProcessor = new AIProcessor()
const searchService = new SearchService()
const qaService = new QAService()

// Analyze a single bookmark
app.post('/analyze/:id', async (c) => {
  const bookmarkId = c.req.param('id')

  try {
    const analysis = await aiProcessor.analyzeBookmark(bookmarkId)
    return c.json(analysis)
  } catch (error) {
    return c.json({ error: error.message }, 500)
  }
})

// Batch analyze bookmarks
app.post('/analyze/batch', async (c) => {
  const { bookmarkIds } = await c.req.json()

  const results = await aiProcessor.batchProcess(bookmarkIds)
  return c.json(results)
})

// Categorize to lists
app.post('/categorize/:id', async (c) => {
  const bookmarkId = c.req.param('id')

  try {
    const lists = await aiProcessor.categorizeToLists(bookmarkId)
    return c.json({ lists })
  } catch (error) {
    return c.json({ error: error.message }, 500)
  }
})

// Semantic search
app.post('/search', async (c) => {
  const { query, limit } = await c.req.json()

  const results = await searchService.search(query, limit || 10)
  return c.json({ results })
})

// Q&A
app.post('/chat', async (c) => {
  const { question, filters } = await c.req.json()

  const response = await qaService.ask(question, filters)
  return c.json(response)
})

export default app
```

## Prompt Engineering

### Best Practices

1. **Be Specific**: Clearly define the task and expected output format
2. **Use Examples**: Provide examples of desired output
3. **Structure Output**: Request JSON for easy parsing
4. **Set Context**: Give Claude relevant background information
5. **Temperature Control**: Lower for consistent tasks, higher for creative ones

### Example Prompts

#### Summarization

```typescript
const prompt = `Analyze this post and provide a summary:

${content}

Format as JSON:
{
  "summary": "2-3 sentence summary",
  "keyPoints": ["point 1", "point 2"],
  "sentiment": "positive/negative/neutral"
}`
```

#### Categorization

```typescript
const prompt = `Given this content about "${topic}",
which category best fits?

Available categories: ${categories.join(', ')}

Respond with only the category name.`
```

#### Search

```typescript
const prompt = `User is searching for: "${query}"

Review these bookmarks and rank them by relevance:
${bookmarkList}

Return top ${limit} as JSON with relevance scores.`
```

## Cost Optimization

### Strategies

1. **Cache Analysis Results**
   ```typescript
   // Check if already analyzed
   const existing = await prisma.aIAnalysis.findUnique({
     where: { bookmarkId }
   })
   if (existing) return existing
   ```

2. **Batch Processing**
   ```typescript
   // Process in batches to reduce API calls
   const BATCH_SIZE = 10
   for (let i = 0; i < bookmarks.length; i += BATCH_SIZE) {
     const batch = bookmarks.slice(i, i + BATCH_SIZE)
     await processBatch(batch)
   }
   ```

3. **Rate Limiting**
   ```typescript
   // Prevent excessive API usage
   const RATE_LIMIT = 50 // requests per minute
   await rateLimit(RATE_LIMIT)
   ```

4. **Content Truncation**
   ```typescript
   // Limit content length to reduce tokens
   const MAX_CONTENT_LENGTH = 2000
   const content = bookmark.content?.substring(0, MAX_CONTENT_LENGTH)
   ```

5. **Lazy Analysis**
   ```typescript
   // Only analyze when needed (e.g., user views bookmark)
   // Don't analyze all bookmarks immediately
   ```

6. **Use Cheaper Models for Simple Tasks**
   ```typescript
   // Consider Claude Haiku for simple categorization
   const model = task === 'simple'
     ? 'claude-3-haiku-20240307'
     : 'claude-3-5-sonnet-20241022'
   ```

### Cost Monitoring

```typescript
// Track API usage
interface UsageMetrics {
  inputTokens: number
  outputTokens: number
  totalCost: number
  requestCount: number
}

async function trackUsage(message: Anthropic.Messages.Message) {
  const usage = message.usage

  await prisma.apiUsage.create({
    data: {
      model: CLAUDE_CONFIG.model,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      cost: calculateCost(usage),
      timestamp: new Date()
    }
  })
}

function calculateCost(usage: { input_tokens: number; output_tokens: number }) {
  const INPUT_COST = 3 / 1_000_000  // $3 per million
  const OUTPUT_COST = 15 / 1_000_000 // $15 per million

  return (usage.input_tokens * INPUT_COST) + (usage.output_tokens * OUTPUT_COST)
}
```

## Best Practices

### 1. Error Handling

```typescript
try {
  const analysis = await claude.messages.create({...})
} catch (error) {
  if (error instanceof Anthropic.APIError) {
    if (error.status === 429) {
      // Rate limit - implement backoff
      await exponentialBackoff()
      return retry()
    }
    if (error.status === 500) {
      // Server error - log and notify
      logger.error('Claude API error', error)
    }
  }
  throw error
}
```

### 2. Response Validation

```typescript
import { z } from 'zod'

const AnalysisSchema = z.object({
  summary: z.string(),
  keyPoints: z.array(z.string()),
  topics: z.array(z.string()),
  sentiment: z.enum(['positive', 'negative', 'neutral', 'mixed']),
  language: z.string(),
  tags: z.array(z.string())
})

function validateAnalysis(response: unknown) {
  return AnalysisSchema.parse(response)
}
```

### 3. Retry Logic

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxRetries - 1) throw error

      const delay = Math.pow(2, i) * 1000 // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw new Error('Max retries exceeded')
}
```

### 4. Streaming Responses (for Chat)

```typescript
app.post('/chat/stream', async (c) => {
  const { question } = await c.req.json()

  const stream = await claude.messages.stream({
    model: CLAUDE_CONFIG.model,
    max_tokens: 4096,
    messages: [{ role: 'user', content: question }]
  })

  // Set up SSE
  c.header('Content-Type', 'text/event-stream')
  c.header('Cache-Control', 'no-cache')
  c.header('Connection', 'keep-alive')

  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta') {
          const text = chunk.delta.type === 'text_delta'
            ? chunk.delta.text
            : ''
          controller.enqueue(encoder.encode(`data: ${text}\n\n`))
        }
      }
      controller.close()
    }
  })

  return new Response(readable)
})
```

## Troubleshooting

### Common Issues

#### 1. Rate Limits

**Problem**: Getting 429 errors

**Solution**:
```typescript
// Implement rate limiting
import { RateLimiter } from '@/lib/rate-limiter'

const limiter = new RateLimiter({
  maxRequests: 50,
  windowMs: 60000 // 1 minute
})

await limiter.checkLimit('claude-api')
```

#### 2. Parsing Errors

**Problem**: Claude returns invalid JSON

**Solution**:
```typescript
// Extract JSON more robustly
function extractJSON(text: string) {
  // Try to find JSON in markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/)
  if (codeBlockMatch) {
    return JSON.parse(codeBlockMatch[1])
  }

  // Try to find JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0])
  }

  throw new Error('No JSON found in response')
}
```

#### 3. Token Limits

**Problem**: Content too long for context window

**Solution**:
```typescript
// Truncate intelligently
function truncateContent(content: string, maxTokens: number) {
  // Rough estimate: 1 token ≈ 4 characters
  const maxChars = maxTokens * 4

  if (content.length <= maxChars) {
    return content
  }

  // Truncate at sentence boundary
  const truncated = content.substring(0, maxChars)
  const lastPeriod = truncated.lastIndexOf('.')

  return lastPeriod > 0
    ? truncated.substring(0, lastPeriod + 1)
    : truncated + '...'
}
```

#### 4. Timeout Issues

**Problem**: Requests timing out on Vercel

**Solution**:
```typescript
// Process async with job queue
import { Queue } from '@/lib/queue'

const analysisQueue = new Queue('ai-analysis')

// Endpoint just queues the job
app.post('/analyze/:id', async (c) => {
  const bookmarkId = c.req.param('id')

  await analysisQueue.add({
    bookmarkId,
    type: 'analyze'
  })

  return c.json({
    status: 'queued',
    message: 'Analysis started'
  })
})

// Worker processes the queue
analysisQueue.process(async (job) => {
  await aiProcessor.analyzeBookmark(job.data.bookmarkId)
})
```

## Monitoring & Logging

### Usage Dashboard

```typescript
// Get usage statistics
app.get('/api/ai/stats', async (c) => {
  const stats = await prisma.apiUsage.aggregate({
    _sum: {
      inputTokens: true,
      outputTokens: true,
      cost: true
    },
    _count: {
      id: true
    },
    where: {
      timestamp: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      }
    }
  })

  return c.json({
    totalRequests: stats._count.id,
    totalInputTokens: stats._sum.inputTokens,
    totalOutputTokens: stats._sum.outputTokens,
    totalCost: stats._sum.cost,
    period: 'Last 30 days'
  })
})
```

### Request Logging

```typescript
async function logRequest(
  operation: string,
  input: any,
  output: any,
  usage: any
) {
  await prisma.aiLog.create({
    data: {
      operation,
      input: JSON.stringify(input),
      output: JSON.stringify(output),
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      model: CLAUDE_CONFIG.model,
      timestamp: new Date()
    }
  })
}
```

## Future Enhancements

1. **Multi-model Support**: Add support for GPT-4, Gemini, or local models
2. **Custom Prompts**: Allow users to customize analysis prompts
3. **Fine-tuning**: Train custom models on user's bookmark patterns
4. **Embeddings**: Use embeddings for faster semantic search
5. **Conversation Memory**: Multi-turn conversations with context
6. **Auto-list Creation**: Automatically create lists based on content clusters
7. **Duplicate Detection**: Find similar bookmarks using AI
8. **Content Recommendations**: Suggest related bookmarks

## References

- [Anthropic Documentation](https://docs.anthropic.com/)
- [Claude API Reference](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
- [Prompt Engineering Guide](https://docs.anthropic.com/claude/docs/prompt-engineering)
- [Rate Limits](https://docs.anthropic.com/claude/reference/rate-limits)
- [Best Practices](https://docs.anthropic.com/claude/docs/best-practices)

---

**Questions or Issues?**

Open an issue on GitHub or refer to the main [PLAN.md](./PLAN.md) for overall architecture.
