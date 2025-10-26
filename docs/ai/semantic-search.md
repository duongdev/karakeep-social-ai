# Semantic Search & Q&A

> AI-powered search and question answering for your bookmarks using Claude

[← Back to Documentation Index](../README.md) | [Prompt Engineering](./prompt-engineering.md) →

## Contents

- [Overview](#overview)
- [Semantic Search](#semantic-search)
- [Q&A System (RAG)](#qa-system-rag)
- [Implementation](#implementation)
- [Use Cases](#use-cases)
- [Performance](#performance)

## Overview

Karakeep provides two AI-powered search capabilities:

1. **Semantic Search**: Find bookmarks by meaning, not just keywords
2. **Q&A (RAG)**: Ask questions about your bookmark collection

Both use Claude to understand context and provide intelligent results.

## Semantic Search

### What It Does

Traditional search: Match exact keywords
Semantic search: Understand intent and context

**Example**:

Query: "react hooks tutorial"

**Keyword search** finds:
- Posts with exact words "react", "hooks", "tutorial"

**Semantic search** finds:
- React hooks tutorials
- Posts explaining useState and useEffect
- Videos about functional components
- Articles comparing hooks vs class components

### How It Works

```
1. User enters query
2. Claude analyzes query intent
3. Compares against bookmark summaries
4. Ranks by relevance
5. Returns results with explanations
```

### Implementation

```typescript
// src/services/search.ts
import { claude, CLAUDE_CONFIG } from '@/lib/claude'
import { prisma } from '@/lib/db'

export class SearchService {
  async search(query: string, limit: number = 10) {
    // Get recent bookmarks with analysis
    const bookmarks = await prisma.bookmark.findMany({
      take: 100,
      orderBy: { savedAt: 'desc' },
      include: {
        aiAnalysis: true,
        tags: { include: { tag: true } }
      }
    })

    // Prepare context for Claude
    const bookmarkContext = bookmarks.map((b, idx) => {
      return `[${idx}] ${b.title || 'Untitled'}
Platform: ${b.platform}
Summary: ${b.aiAnalysis?.summary || b.content?.substring(0, 200)}
Topics: ${b.aiAnalysis?.topics || []}
Tags: ${b.tags.map(t => t.tag.name).join(', ')}
---`
    }).join('\n\n')

    const message = await claude.messages.create({
      model: CLAUDE_CONFIG.model,
      max_tokens: 2000,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: `I have these bookmarks:

${bookmarkContext}

User query: "${query}"

Return the indices of the most relevant bookmarks (max ${limit}) in order of relevance.

Format as JSON:
{
  "results": [
    {"index": 0, "relevance": "high", "reason": "explanation"},
    {"index": 5, "relevance": "medium", "reason": "explanation"}
  ]
}`
      }]
    })

    const responseText = message.content[0].text
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null

    return parsed.results.map(r => ({
      bookmark: bookmarks[r.index],
      relevance: r.relevance,
      reason: r.reason
    }))
  }
}
```

### Usage

```typescript
const searchService = new SearchService()

// Search
const results = await searchService.search('typescript design patterns')

// Display results
results.forEach(result => {
  console.log(`${result.bookmark.title}`)
  console.log(`Relevance: ${result.relevance}`)
  console.log(`Why: ${result.reason}`)
  console.log('---')
})
```

### Example Output

```json
{
  "results": [
    {
      "bookmark": {
        "title": "Advanced TypeScript Patterns",
        "url": "https://..."
      },
      "relevance": "high",
      "reason": "Directly covers TypeScript design patterns with practical examples"
    },
    {
      "bookmark": {
        "title": "Clean Code in TypeScript",
        "url": "https://..."
      },
      "relevance": "medium",
      "reason": "Discusses design principles applicable to TypeScript, including some patterns"
    }
  ]
}
```

## Q&A System (RAG)

### What It Does

RAG = Retrieval Augmented Generation

Ask natural language questions about your bookmarks and get comprehensive answers with sources.

**Example Questions**:
- "What are the best React state management libraries I've saved?"
- "Show me videos about Docker deployment"
- "What design principles did I bookmark this month?"
- "Which GitHub repos did I star for API development?"

### How It Works

```
1. User asks question
2. Retrieve relevant bookmarks (filtering)
3. Build context from bookmark content
4. Send to Claude with question
5. Claude answers using bookmark data
6. Return answer with source citations
```

### Implementation

```typescript
// src/services/qa.ts
export class QAService {
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
              tag: { name: { in: filters.tags } }
            }
          }
        })
      },
      take: 50,
      orderBy: { savedAt: 'desc' },
      include: {
        aiAnalysis: true,
        tags: { include: { tag: true } }
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
      messages: [{
        role: 'user',
        content: `You are a helpful assistant answering questions about a user's bookmarked content.

Here are the relevant bookmarks:

${context}

User question: ${question}

Provide a comprehensive answer based on the bookmarks above. If the bookmarks don't contain enough information, say so. Always cite specific bookmarks by including their URLs.`
      }]
    })

    const answer = message.content[0].text

    // Extract cited URLs
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

### Usage

```typescript
const qaService = new QAService()

// Ask a question
const response = await qaService.ask(
  "What are the main benefits of using TypeScript?",
  {
    tags: ['typescript'],
    dateRange: {
      start: new Date('2024-01-01'),
      end: new Date()
    }
  }
)

console.log(response.answer)
console.log('Sources:', response.sources)
```

### Example Output

```
Answer:
Based on your saved content, the main benefits of TypeScript are:

1. Type Safety: Multiple bookmarks emphasize how TypeScript catches errors
   at compile time rather than runtime (https://github.com/user/ts-guide).

2. Better IDE Support: Enhanced autocomplete, refactoring tools, and
   inline documentation (https://youtube.com/watch?v=typescript-tips).

3. Improved Code Quality: Type annotations serve as living documentation
   and make code more maintainable (https://twitter.com/user/status/123).

4. Gradual Adoption: You can introduce TypeScript incrementally without
   rewriting your entire codebase (https://dev.to/typescript-migration).

Sources:
- TypeScript Deep Dive (https://github.com/user/ts-guide)
- TypeScript Tips & Tricks (https://youtube.com/watch?v=...)
- Why TypeScript? (https://twitter.com/user/status/123)
- Migrating to TypeScript (https://dev.to/typescript-migration)
```

## Use Cases

### Semantic Search

✅ Find content by concept, not keywords
✅ Discover related bookmarks you forgot about
✅ Search across multiple platforms at once
✅ Get relevance explanations

### Q&A System

✅ Research topics from your bookmarks
✅ Create study guides
✅ Find expert opinions you've saved
✅ Compile resources for projects
✅ Generate summaries of learning paths

## Performance

### Search Performance

| Bookmarks | Search Time | Cost |
|-----------|-------------|------|
| 100 | 3-5s | $0.007 |
| 500 | 4-6s | $0.010 |
| 1000 | 5-8s | $0.015 |

### Q&A Performance

| Context Size | Response Time | Cost |
|--------------|---------------|------|
| 10 bookmarks | 4-6s | $0.008 |
| 50 bookmarks | 6-10s | $0.012 |
| 100 bookmarks | 10-15s | $0.020 |

### Optimization

**1. Limit Context Size**

Don't send all bookmarks to Claude:

```typescript
// Only send recent/relevant bookmarks
const bookmarks = await prisma.bookmark.findMany({
  take: 50, // Limit to 50
  orderBy: { savedAt: 'desc' }
})
```

**2. Pre-filter Bookmarks**

Use filters to narrow results before AI search:

```typescript
// Filter by platform, tags, date range first
const filtered = await filterBookmarks({
  platforms: ['github'],
  tags: ['typescript']
})

// Then AI search within filtered set
const results = await searchService.search(query, filtered)
```

**3. Cache Common Queries**

Store popular search results:

```typescript
const cacheKey = `search:${query}`
const cached = await redis.get(cacheKey)

if (cached) {
  return JSON.parse(cached)
}

const results = await searchService.search(query)
await redis.set(cacheKey, JSON.stringify(results), 'EX', 3600) // 1 hour
```

## API Endpoints

```typescript
// src/routes/ai.ts

// Semantic search
app.post('/api/search', async (c) => {
  const { query, limit } = await c.req.json()

  const searchService = new SearchService()
  const results = await searchService.search(query, limit || 10)

  return c.json({ results })
})

// Q&A
app.post('/api/chat', async (c) => {
  const { question, filters } = await c.req.json()

  const qaService = new QAService()
  const response = await qaService.ask(question, filters)

  return c.json(response)
})
```

## Related Documentation

- [AI Features](./features.md) - Other AI capabilities
- [Prompt Engineering](./prompt-engineering.md) - Writing better prompts
- [Claude Setup](./claude-setup.md) - Configuration
- [API Endpoints](../api/endpoints.md) - Full API reference

---

[← Back to Index](../README.md) | [Next: Prompt Engineering →](./prompt-engineering.md)

**Last Updated**: 2025-10-26
