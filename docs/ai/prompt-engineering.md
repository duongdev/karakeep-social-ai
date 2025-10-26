# Prompt Engineering

> Best practices and examples for writing effective prompts for Claude AI

[← Back to Documentation Index](../README.md) | [AI Features](./features.md) →

## Contents

- [Principles](#principles)
- [Prompt Templates](#prompt-templates)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)
- [Response Parsing](#response-parsing)
- [Error Handling](#error-handling)

## Principles

### 1. Be Specific

❌ Bad: "Analyze this post"
✅ Good: "Summarize this post in 2-3 sentences and extract 3-5 key points"

### 2. Use Examples

❌ Bad: "Extract tags"
✅ Good:
```
Extract tags from this content.
Example: ["react", "typescript", "tutorial"]
```

### 3. Request Structured Output

❌ Bad: "Tell me about this"
✅ Good:
```
Format your response as JSON:
{
  "summary": "...",
  "tags": ["...", "..."]
}
```

### 4. Set Context

❌ Bad: "Categorize this"
✅ Good:
```
You are categorizing a GitHub repository.
Available categories: [Frontend, Backend, DevOps, ML]
Which category best fits?
```

### 5. Control Temperature

- **Low (0.1-0.3)**: Consistent, deterministic results (tagging, categorization)
- **Medium (0.5-0.7)**: Balanced creativity (summarization)
- **High (0.8-1.0)**: Creative, varied responses (content generation)

## Prompt Templates

### Summarization

```typescript
const SUMMARIZATION_PROMPT = `Analyze this social media post and provide a structured response:

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
```

### Categorization

```typescript
const CATEGORIZATION_PROMPT = `Given this bookmark:
Title: ${bookmark.title}
Content: ${bookmark.content?.substring(0, 500)}
Topics: ${bookmark.aiAnalysis?.topics || []}
Tags: ${bookmark.tags.map(t => t.tag.name).join(', ')}

And these available lists:
${lists.map(l => `- ${l.name}: ${l.description || 'No description'}`).join('\n')}

Which list(s) should this bookmark belong to? A bookmark can belong to multiple lists if relevant.

Respond with only the list names as a JSON array.
Example: ["Design", "Tutorials"]

Important: Only suggest lists from the available lists above.`
```

### Semantic Search

```typescript
const SEARCH_PROMPT = `I have these bookmarks:

${bookmarkContext}

User query: "${query}"

Based on the query, return the indices of the most relevant bookmarks (maximum ${limit}) in order of relevance.
Also provide a brief explanation of why each is relevant.

Format as JSON:
{
  "results": [
    {
      "index": 0,
      "relevance": "high",
      "reason": "Directly addresses the user's query about X"
    },
    {
      "index": 5,
      "relevance": "medium",
      "reason": "Contains related information about Y"
    }
  ]
}

Relevance levels: high, medium, low`
```

### Q&A (RAG)

```typescript
const QA_PROMPT = `You are a helpful assistant that answers questions about a user's bookmarked content.

Here are the relevant bookmarks from the user's collection:

${context}

User question: ${question}

Please provide a comprehensive answer based on the bookmarks above. If the bookmarks don't contain enough information to answer the question, say so clearly. Always cite the specific bookmarks you reference by including their URLs.

Format your answer in clear paragraphs with proper citations.`
```

### Tagging

```typescript
const TAGGING_PROMPT = `Given this content about ${title}:

${content}

Suggest 3-5 relevant tags for categorization.

Requirements:
- Use lowercase
- Be specific but not too niche
- Focus on technology, topics, and use cases
- Avoid generic tags like "interesting" or "cool"

Return only a JSON array:
["tag1", "tag2", "tag3"]

Example: ["react", "hooks", "state-management"]`
```

## Best Practices

### 1. Use System Context

Provide role and constraints:

```typescript
const systemMessage = {
  role: 'system',
  content: `You are an AI assistant helping organize and analyze bookmarks.
Your role is to provide concise, accurate analysis.
Always respond in valid JSON format when requested.
Be objective and factual in your analysis.`
}
```

### 2. Show Examples (Few-Shot)

```typescript
const prompt = `Extract tags from content.

Example 1:
Content: "Building a REST API with Node.js and Express"
Tags: ["nodejs", "express", "api", "backend"]

Example 2:
Content: "Understanding React Hooks and Context"
Tags: ["react", "hooks", "context", "frontend"]

Now extract tags from:
Content: "${content}"
Tags: `
```

### 3. Set Constraints

```typescript
const prompt = `Summarize this article.

Constraints:
- Maximum 3 sentences
- Focus on key insights only
- Use simple language
- No technical jargon unless necessary

Article: ${article}`
```

### 4. Request Structured Output

Always use JSON for machine-readable responses:

```typescript
const prompt = `Analyze this post.

Respond in this EXACT JSON format:
{
  "summary": "string",
  "tags": ["string", "string"],
  "sentiment": "positive" | "negative" | "neutral"
}

Post: ${content}`
```

## Common Patterns

### Pattern 1: Analysis Pipeline

```typescript
async function analyzeBookmark(content: string) {
  // Step 1: Initial analysis
  const analysis = await claude.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1000,
    temperature: 0.5,
    messages: [{
      role: 'user',
      content: `Analyze this content: ${content}`
    }]
  })

  // Step 2: Validate and parse
  const result = parseJSON(analysis.content[0].text)

  // Step 3: Enrich with additional analysis if needed
  if (result.topics.includes('code')) {
    result.tags.push('programming')
  }

  return result
}
```

### Pattern 2: Conditional Prompting

```typescript
function buildPrompt(bookmark: Bookmark) {
  let prompt = `Analyze this ${bookmark.platform} content:\n\n`

  // Add platform-specific context
  if (bookmark.platform === 'github') {
    prompt += `Repository: ${bookmark.title}\n`
    prompt += `Language: ${bookmark.metadata?.language}\n`
  } else if (bookmark.platform === 'youtube') {
    prompt += `Video: ${bookmark.title}\n`
    prompt += `Transcript: ${bookmark.aiAnalysis?.transcript}\n`
  } else {
    prompt += `Post: ${bookmark.content}\n`
  }

  prompt += `\nProvide summary and tags.`

  return prompt
}
```

### Pattern 3: Progressive Refinement

```typescript
// First pass: Quick analysis
const quickAnalysis = await analyzeQuick(content)

// Second pass: Detailed analysis only if needed
if (quickAnalysis.requiresDeepAnalysis) {
  const detailed = await analyzeDetailed(content, quickAnalysis)
  return detailed
}

return quickAnalysis
```

## Response Parsing

### Extract JSON from Response

Claude sometimes wraps JSON in markdown:

```typescript
function extractJSON(text: string): any {
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

  // Try to find JSON array
  const arrayMatch = text.match(/\[[\s\S]*\]/)
  if (arrayMatch) {
    return JSON.parse(arrayMatch[0])
  }

  throw new Error('No JSON found in response')
}
```

### Validate Response Schema

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
  try {
    return AnalysisSchema.parse(response)
  } catch (error) {
    console.error('Invalid analysis format:', error)
    throw new Error('AI returned invalid format')
  }
}
```

## Error Handling

### Retry with Backoff

```typescript
async function callClaudeWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxRetries - 1) throw error

      const delay = Math.pow(2, i) * 1000
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw new Error('Max retries exceeded')
}
```

### Fallback Prompts

```typescript
async function analyzeWithFallback(content: string) {
  try {
    // Try detailed prompt
    return await analyzeDetailed(content)
  } catch (error) {
    console.warn('Detailed analysis failed, trying simple prompt')

    // Fallback to simpler prompt
    return await analyzeSimple(content)
  }
}
```

### Handle Unexpected Responses

```typescript
async function safeAnalyze(content: string) {
  const response = await claude.messages.create({...})
  const text = response.content[0].text

  try {
    // Try to parse JSON
    const data = extractJSON(text)
    return validateAnalysis(data)
  } catch (error) {
    // Fallback: use text response as summary
    return {
      summary: text.substring(0, 500),
      tags: [],
      sentiment: 'neutral'
    }
  }
}
```

## Testing Prompts

### Prompt Testing Framework

```typescript
interface PromptTest {
  input: string
  expected: any
  prompt: string
}

const tests: PromptTest[] = [
  {
    input: 'React hooks tutorial video',
    expected: {
      tags: ['react', 'hooks', 'tutorial'],
      topics: ['react', 'javascript']
    },
    prompt: TAGGING_PROMPT
  }
]

async function testPrompts() {
  for (const test of tests) {
    const result = await callClaude(test.prompt, test.input)
    console.log('Input:', test.input)
    console.log('Expected:', test.expected)
    console.log('Got:', result)
    console.log('---')
  }
}
```

## Related Documentation

- [AI Features](./features.md) - What the AI can do
- [Claude Setup](./claude-setup.md) - Configuration
- [Semantic Search](./semantic-search.md) - Search implementation

---

[← Back to Index](../README.md) | [Next: Transcription Overview →](../transcription/overview.md)

**Last Updated**: 2025-10-26
