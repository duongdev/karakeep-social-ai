# AI Features

> Complete overview of AI-powered features in Karakeep using Claude

[← Back to Documentation Index](../README.md) | [Prompt Engineering](./prompt-engineering.md) →

## Contents

- [Overview](#overview)
- [Feature Matrix](#feature-matrix)
- [Summarization](#summarization)
- [Auto-Tagging](#auto-tagging)
- [Categorization](#categorization)
- [Sentiment Analysis](#sentiment-analysis)
- [Key Points Extraction](#key-points-extraction)
- [Language Detection](#language-detection)

## Overview

Karakeep uses Claude 3.5 Sonnet for intelligent analysis of your bookmarked content. All features work across platforms (Twitter, GitHub, YouTube, etc.) and content types (text, video transcripts, READMEs).

## Feature Matrix

| Feature | Model | Avg Input Tokens | Avg Output Tokens | Cost/Request | Speed |
|---------|-------|------------------|-------------------|--------------|-------|
| Summarization | Sonnet 3.5 | 500 | 150 | $0.0019 | 2-3s |
| Auto-tagging | Sonnet 3.5 | 400 | 30 | $0.0013 | 1-2s |
| Categorization | Sonnet 3.5 | 600 | 50 | $0.0020 | 2s |
| Sentiment | Sonnet 3.5 | 400 | 10 | $0.0012 | 1s |
| Key Points | Sonnet 3.5 | 500 | 100 | $0.0016 | 2s |
| Semantic Search | Sonnet 3.5 | 2000 | 300 | $0.0070 | 3-5s |
| Q&A | Sonnet 3.5 | 3000 | 500 | $0.0115 | 4-6s |

*Costs based on Claude 3.5 Sonnet pricing: $3/M input, $15/M output tokens*

## Summarization

### What It Does

Generates concise 2-3 sentence summaries of any content:
- Social media posts
- Video transcripts
- GitHub README files
- Blog articles

### Example

**Input** (YouTube video transcript):
```
"In this video I'll show you how to build a React component library
from scratch. We'll cover setup, component architecture, styling with
Tailwind, documentation with Storybook, and publishing to npm..."
(5000 more words)
```

**Output**:
```json
{
  "summary": "A comprehensive guide to building a React component library
  covering project setup, component architecture, Tailwind CSS integration,
  Storybook documentation, and npm publishing workflow."
}
```

### Implementation

```typescript
async function summarize(content: string): Promise<string> {
  const message = await claude.messages.create({
    model: CLAUDE_CONFIG.model,
    max_tokens: 300,
    temperature: 0.5,
    messages: [{
      role: 'user',
      content: `Summarize this content in 2-3 sentences:

${content}

Provide only the summary, no other text.`
    }]
  })

  return message.content[0].text
}
```

### Use Cases

- ✅ Quickly understand video content without watching
- ✅ Scan long GitHub READMEs at a glance
- ✅ Review tweet threads efficiently
- ✅ Search by content, not just titles

## Auto-Tagging

### What It Does

Automatically suggests 3-5 relevant tags based on content analysis.

### Example

**Input** (GitHub repo):
```
Title: shadcn/ui
Description: Beautifully designed components built with Radix UI and Tailwind CSS
Language: TypeScript
Topics: [react, components, ui]
```

**Output**:
```json
{
  "tags": ["react", "ui-components", "tailwind", "typescript", "design-system"]
}
```

### Implementation

```typescript
async function suggestTags(content: string): Promise<string[]> {
  const message = await claude.messages.create({
    model: CLAUDE_CONFIG.model,
    max_tokens: 100,
    temperature: 0.3,
    messages: [{
      role: 'user',
      content: `Suggest 3-5 relevant tags for this content:

${content}

Return only a JSON array of lowercase tags:
["tag1", "tag2", "tag3"]`
    }]
  })

  const text = message.content[0].text
  const jsonMatch = text.match(/\[.*\]/)
  return jsonMatch ? JSON.parse(jsonMatch[0]) : []
}
```

### Tag Confidence

AI-suggested tags include confidence scores:

```typescript
await prisma.bookmarkTag.create({
  data: {
    bookmarkId,
    tagId: tag.id,
    confidence: 0.85 // Claude's confidence in this tag
  }
})
```

### Use Cases

- ✅ Organize bookmarks automatically
- ✅ Discover patterns in saved content
- ✅ Filter by topic efficiently
- ✅ Build personal knowledge graph

## Categorization

### What It Does

Assigns bookmarks to user-created lists based on content.

### Example

**User's Lists**:
- "Design Inspiration"
- "React Tutorials"
- "DevOps Tools"
- "Research Papers"

**Input** (bookmark):
```
Title: "Building a Design System with Figma and React"
Content: "Learn how to create a cohesive design system..."
```

**Output**:
```json
{
  "lists": ["Design Inspiration", "React Tutorials"]
}
```

### Implementation

```typescript
async function categorizeToLists(
  bookmark: Bookmark,
  lists: List[]
): Promise<string[]> {
  const message = await claude.messages.create({
    model: CLAUDE_CONFIG.model,
    max_tokens: 200,
    temperature: 0.3,
    messages: [{
      role: 'user',
      content: `Given this bookmark:
Title: ${bookmark.title}
Content: ${bookmark.content?.substring(0, 500)}

And these available lists:
${lists.map(l => `- ${l.name}: ${l.description || ''}`).join('\n')}

Which list(s) should this bookmark belong to?
Return only a JSON array of list names:
["List 1", "List 2"]`
    }]
  })

  const text = message.content[0].text
  const jsonMatch = text.match(/\[.*\]/)
  return jsonMatch ? JSON.parse(jsonMatch[0]) : []
}
```

### Use Cases

- ✅ Auto-organize new bookmarks
- ✅ Multi-list assignment
- ✅ Smart collections
- ✅ Content discovery

## Sentiment Analysis

### What It Does

Detects the emotional tone and sentiment of content.

### Sentiment Types

- **positive**: Optimistic, encouraging, celebratory
- **negative**: Critical, warning, concerning
- **neutral**: Informative, factual, balanced
- **mixed**: Contains both positive and negative elements

### Example

**Input**: "This new framework is revolutionary but the documentation is terrible"

**Output**:
```json
{
  "sentiment": "mixed"
}
```

### Implementation

```typescript
async function analyzeSentiment(content: string): Promise<string> {
  const message = await claude.messages.create({
    model: CLAUDE_CONFIG.model,
    max_tokens: 50,
    temperature: 0.3,
    messages: [{
      role: 'user',
      content: `Analyze the sentiment of this text:

${content}

Respond with only one word: positive, negative, neutral, or mixed`
    }]
  })

  return message.content[0].text.trim().toLowerCase()
}
```

### Use Cases

- ✅ Filter controversial content
- ✅ Find positive recommendations
- ✅ Identify critical reviews
- ✅ Balance content consumption

## Key Points Extraction

### What It Does

Extracts 3-5 main takeaways or insights from content.

### Example

**Input** (blog post):
```
"In this article, we explore the performance implications of Server
Components in Next.js 13. We measured load times, bundle sizes, and
server costs across different rendering strategies..."
```

**Output**:
```json
{
  "keyPoints": [
    "Server Components reduce client bundle size by 30-40%",
    "Initial page load improved by 2-3 seconds on average",
    "Server costs increased slightly due to more server rendering",
    "Best suited for content-heavy pages with minimal interactivity",
    "Consider hybrid approach mixing server and client components"
  ]
}
```

### Implementation

```typescript
async function extractKeyPoints(content: string): Promise<string[]> {
  const message = await claude.messages.create({
    model: CLAUDE_CONFIG.model,
    max_tokens: 500,
    temperature: 0.5,
    messages: [{
      role: 'user',
      content: `Extract 3-5 key points from this content:

${content}

Return as JSON array:
["point 1", "point 2", ...]`
    }]
  })

  const text = message.content[0].text
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  return jsonMatch ? JSON.parse(jsonMatch[0]) : []
}
```

### Use Cases

- ✅ Quick review of long content
- ✅ Study notes generation
- ✅ Highlight important insights
- ✅ Share key takeaways

## Language Detection

### What It Does

Automatically detects the language of content.

### Supported Languages

Claude can detect 100+ languages including:
- en (English)
- es (Spanish)
- fr (French)
- de (German)
- ja (Japanese)
- zh (Chinese)
- ko (Korean)
- ru (Russian)
- ar (Arabic)
- pt (Portuguese)

### Example

**Input**: "Cómo construir aplicaciones web modernas con React y TypeScript"

**Output**:
```json
{
  "language": "es"
}
```

### Implementation

```typescript
async function detectLanguage(content: string): Promise<string> {
  const message = await claude.messages.create({
    model: CLAUDE_CONFIG.model,
    max_tokens: 10,
    temperature: 0.1,
    messages: [{
      role: 'user',
      content: `What language is this text in? Respond with only the ISO 639-1 code (2 letters):

${content.substring(0, 200)}`
    }]
  })

  return message.content[0].text.trim().toLowerCase()
}
```

### Use Cases

- ✅ Filter content by language
- ✅ Organize multilingual bookmarks
- ✅ Translation workflow
- ✅ Language learning

## Combined Analysis

### Full Bookmark Analysis

All features run together for comprehensive analysis:

```typescript
async function analyzeBookmark(bookmarkId: string) {
  const bookmark = await prisma.bookmark.findUnique({
    where: { id: bookmarkId }
  })

  const message = await claude.messages.create({
    model: CLAUDE_CONFIG.model,
    max_tokens: 1000,
    temperature: 0.5,
    messages: [{
      role: 'user',
      content: `Analyze this content:

Platform: ${bookmark.platform}
Title: ${bookmark.title}
Content: ${bookmark.content}

Provide:
1. A concise 2-3 sentence summary
2. 3-5 key points (array)
3. 3-5 relevant tags (array)
4. Primary topics/themes (array, max 5)
5. Sentiment (positive/negative/neutral/mixed)
6. Language code (ISO 639-1)

Format as JSON:
{
  "summary": "...",
  "keyPoints": ["...", "..."],
  "tags": ["...", "..."],
  "topics": ["...", "..."],
  "sentiment": "positive",
  "language": "en"
}`
    }]
  })

  const text = message.content[0].text
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null

  // Store in database
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

  // Create tags
  for (const tagName of analysis.tags) {
    const tag = await findOrCreateTag(tagName)
    await assignTag(bookmark.id, tag.id, confidence: 0.8)
  }

  return analysis
}
```

## Performance

### Typical Response Times

| Operation | Time | Notes |
|-----------|------|-------|
| Single analysis | 2-4s | For ~500 word post |
| Batch (10 items) | 20-40s | Sequential processing |
| Long content | 5-8s | 5000+ words |
| Video transcript | 3-6s | After transcription |

### Optimization Tips

1. **Batch processing**: Process multiple items in one request when possible
2. **Content truncation**: Limit input to first 2000 chars for tagging
3. **Caching**: Store results, don't re-analyze unchanged content
4. **Lazy loading**: Analyze on-demand when user views bookmark
5. **Background jobs**: Queue heavy analysis tasks

## Related Documentation

- [Claude Setup](./claude-setup.md) - Getting started
- [Prompt Engineering](./prompt-engineering.md) - Writing better prompts
- [Semantic Search](./semantic-search.md) - Search using AI
- [Cost Analysis](../planning/cost-analysis.md) - Pricing details

---

[← Back to Index](../README.md) | [Next: Semantic Search →](./semantic-search.md)

**Last Updated**: 2025-10-26
