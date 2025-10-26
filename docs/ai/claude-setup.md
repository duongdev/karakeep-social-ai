# Claude API Setup

> Complete guide to setting up and configuring Claude AI for Karakeep

[← Back to Documentation Index](../README.md) | [AI Features](./features.md) →

## Contents

- [Overview](#overview)
- [Getting API Key](#getting-api-key)
- [Installation](#installation)
- [Configuration](#configuration)
- [Client Setup](#client-setup)
- [Environment Variables](#environment-variables)
- [Testing Connection](#testing-connection)

## Overview

Karakeep uses **Claude 3.5 Sonnet** (Anthropic) for:
- Content summarization
- Key points extraction
- Auto-tagging
- Sentiment analysis
- Semantic search
- Q&A about your bookmarks

## Getting API Key

### 1. Sign Up

Visit [Anthropic Console](https://console.anthropic.com/)

### 2. Create API Key

1. Navigate to **API Keys** section
2. Click **"Create Key"**
3. Give it a descriptive name (e.g., "Karakeep Production")
4. Copy the key (starts with `sk-ant-`)

⚠️ **Important**: Store this key securely. You won't be able to see it again!

### 3. Verify Key

Test your key:

```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: YOUR_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## Installation

### Install Anthropic SDK

```bash
npm install @anthropic-ai/sdk
```

### TypeScript Support

TypeScript types are included. No additional installation needed.

## Configuration

### Environment Variables

Create or update `.env`:

```env
# Required
ANTHROPIC_API_KEY=sk-ant-api03-xxx

# Optional (defaults shown)
CLAUDE_MODEL=claude-3-5-sonnet-20241022
CLAUDE_MAX_TOKENS=4096
CLAUDE_TEMPERATURE=0.7
```

### Variable Explanations

- **ANTHROPIC_API_KEY**: Your API key from Anthropic Console
- **CLAUDE_MODEL**: Which Claude model to use
  - `claude-3-5-sonnet-20241022` (recommended)
  - `claude-3-haiku-20240307` (faster, cheaper)
  - `claude-3-opus-20240229` (most capable, expensive)
- **CLAUDE_MAX_TOKENS**: Maximum output length (1 - 4096)
- **CLAUDE_TEMPERATURE**: Creativity (0.0 = deterministic, 1.0 = creative)

## Client Setup

### Create Claude Client

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
  temperature: parseFloat(process.env.CLAUDE_TEMPERATURE || '0.7'),
}
```

### Basic Usage

```typescript
import { claude, CLAUDE_CONFIG } from '@/lib/claude'

async function analyzeText(text: string) {
  const message = await claude.messages.create({
    model: CLAUDE_CONFIG.model,
    max_tokens: CLAUDE_CONFIG.max_tokens,
    messages: [
      {
        role: 'user',
        content: `Analyze this text: ${text}`
      }
    ]
  })

  const response = message.content[0]
  if (response.type === 'text') {
    return response.text
  }
}
```

## Testing Connection

### Create Test Script

Create `scripts/test-claude.ts`:

```typescript
import { claude, CLAUDE_CONFIG } from '../src/lib/claude'

async function testClaude() {
  console.log('Testing Claude API connection...')
  console.log('Model:', CLAUDE_CONFIG.model)

  try {
    const message = await claude.messages.create({
      model: CLAUDE_CONFIG.model,
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: 'Say "Hello from Karakeep!" and nothing else.'
        }
      ]
    })

    const response = message.content[0]
    if (response.type === 'text') {
      console.log('✅ Success!')
      console.log('Response:', response.text)
      console.log('Usage:', {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens
      })
    }
  } catch (error) {
    console.error('❌ Failed!')
    if (error instanceof Anthropic.APIError) {
      console.error('Status:', error.status)
      console.error('Message:', error.message)
    } else {
      console.error('Error:', error)
    }
  }
}

testClaude()
```

### Run Test

```bash
npx tsx scripts/test-claude.ts
```

Expected output:
```
Testing Claude API connection...
Model: claude-3-5-sonnet-20241022
✅ Success!
Response: Hello from Karakeep!
Usage: { inputTokens: 15, outputTokens: 6 }
```

## Pricing

### Claude 3.5 Sonnet (Recommended)

| Type | Cost | 1M Tokens |
|------|------|-----------|
| Input | $3 | 1,000,000 |
| Output | $15 | 1,000,000 |

### Example Costs

| Operation | Input Tokens | Output Tokens | Cost |
|-----------|--------------|---------------|------|
| Summarize post | 500 | 150 | $0.0019 |
| Auto-tag | 400 | 30 | $0.0013 |
| Semantic search | 2000 | 300 | $0.0070 |

**100 bookmarks/month**: ~$0.20

## Rate Limits

### Tier 1 (Default)

- **Requests**: 50 per minute
- **Tokens**: 40,000 per minute

### Handling Rate Limits

```typescript
import { Anthropic } from '@anthropic-ai/sdk'

async function callClaudeWithRetry(fn: () => Promise<any>, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        if (error.status === 429) {
          // Rate limit - wait and retry
          const delay = Math.pow(2, i) * 1000
          console.log(`Rate limited. Waiting ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
      }
      throw error
    }
  }
  throw new Error('Max retries exceeded')
}
```

## Error Handling

### Common Errors

```typescript
import { Anthropic } from '@anthropic-ai/sdk'

try {
  const response = await claude.messages.create({...})
} catch (error) {
  if (error instanceof Anthropic.APIError) {
    switch (error.status) {
      case 401:
        console.error('Invalid API key')
        break
      case 429:
        console.error('Rate limit exceeded')
        break
      case 500:
        console.error('Claude API error')
        break
      default:
        console.error('API error:', error.message)
    }
  } else {
    console.error('Unexpected error:', error)
  }
}
```

## Best Practices

### 1. Use Environment Variables

Never hardcode API keys:

```typescript
// ❌ Bad
const client = new Anthropic({ apiKey: 'sk-ant-...' })

// ✅ Good
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
```

### 2. Set Reasonable Limits

```typescript
const CLAUDE_CONFIG = {
  max_tokens: 4096,     // Don't request more than needed
  temperature: 0.5,     // Lower for consistent results
}
```

### 3. Log Usage

Track token consumption:

```typescript
const response = await claude.messages.create({...})

console.log('Usage:', {
  input: response.usage.input_tokens,
  output: response.usage.output_tokens,
  cost: calculateCost(response.usage)
})

function calculateCost(usage: { input_tokens: number; output_tokens: number }) {
  const inputCost = usage.input_tokens * (3 / 1_000_000)
  const outputCost = usage.output_tokens * (15 / 1_000_000)
  return inputCost + outputCost
}
```

### 4. Implement Caching

Don't re-analyze the same content:

```typescript
const existing = await prisma.aIAnalysis.findUnique({
  where: { bookmarkId }
})

if (existing) {
  return existing // Use cached result
}

// Only call Claude if not cached
const analysis = await analyzeWithClaude(content)
```

## Vercel Deployment

### Add Environment Variable

1. Go to Vercel Dashboard
2. Select your project
3. Settings → Environment Variables
4. Add:
   - Name: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-...`
   - Environment: Production, Preview, Development

### Verify in Production

```bash
vercel env pull .env.local
```

## Related Documentation

- [AI Features](./features.md) - What Claude can do
- [Prompt Engineering](./prompt-engineering.md) - How to write effective prompts
- [Semantic Search](./semantic-search.md) - Using Claude for search
- [Environment Variables](../deployment/environment.md) - All environment variables

---

[← Back to Index](../README.md) | [Next: AI Features →](./features.md)

**Last Updated**: 2025-10-26
