# Cost Analysis

**Last Updated:** 2025-10-26

Complete breakdown of costs for running Karakeep at various scales.

## Navigation

- [Quick Start](./quick-start.md)
- [Roadmap](./roadmap.md)
- [System Architecture](../architecture/system-design.md)
- [Deployment Guide](../deployment/vercel.md)

---

## TL;DR

**Monthly cost for typical usage (100 bookmarks: 50 text, 30 videos, 20 GitHub repos):**

| Component | Free Tier | Cost |
|-----------|-----------|------|
| Vercel (API) | ✅ Yes | **$0** |
| Railway/Render (Worker) | ✅ 500-750 hours/month | **$0** |
| Upstash Redis (Queue) | ✅ 10K requests/day | **$0** |
| Neon/Supabase (Database) | ✅ 3GB storage | **$0** |
| Claude API | ❌ Pay-per-use | **$0.20** |
| Whisper API | ❌ Pay-per-use | **$2.40** |
| Cobalt API | ✅ Free | **$0** |
| GitHub API | ✅ Free | **$0** |
| **Total** | | **~$2.60/month** 🎉 |

---

## Infrastructure Costs

### Vercel (API Hosting)

**Free Tier:**
- 100GB bandwidth/month
- 100 deployments/month
- Serverless functions
- Custom domains
- **Timeout**: 10 seconds (Hobby), 60 seconds (Pro)

**Paid Tier ($20/month Pro):**
- 1TB bandwidth
- 60-second function timeout
- Analytics
- Better performance

**Recommendation**: Start with free tier, upgrade only if needed for longer timeouts.

### Background Worker

#### Option 1: Railway (Recommended)

**Free Tier:**
- 500 hours/month
- 512MB RAM
- 1GB storage
- **Enough for**: Part-time worker (not 24/7)

**Paid Tier ($5/month):**
- Always-on worker
- 2GB RAM
- 10GB storage
- **Best for**: Continuous processing

#### Option 2: Render

**Free Tier:**
- 750 hours/month
- 512MB RAM
- **Enough for**: 24/7 worker! (720 hours/month)

**Paid Tier ($7/month):**
- Always-on guarantee
- 1GB RAM
- Auto-scaling

**Recommendation**: Use Render free tier for 24/7 worker, or Railway paid for better performance.

### Redis Queue (Upstash)

**Free Tier:**
- 10,000 requests/day
- 256MB storage
- Global replication
- **Enough for**: Most usage patterns

**Usage Estimate:**
- Queue job: 1 request
- Check status: 1 request
- Complete job: 2 requests
- **~100 videos/month** = ~400 requests/month (well under limit)

**Paid Tier ($0.20/100K requests):**
- Unlimited requests
- 1GB+ storage

**Recommendation**: Free tier is plenty for most users.

### PostgreSQL Database

#### Option 1: Neon (Recommended)

**Free Tier:**
- 3GB storage
- Compute: 191.9 hours/month
- Auto-pause after 5 min inactivity
- **Enough for**: 10,000+ bookmarks

**Paid Tier ($19/month):**
- 100GB storage
- No auto-pause
- Better performance

#### Option 2: Supabase

**Free Tier:**
- 500MB database
- 1GB file storage
- 2GB bandwidth
- **Enough for**: 5,000+ bookmarks

**Paid Tier ($25/month):**
- 8GB database
- 100GB file storage
- Better performance

#### Option 3: Vercel Postgres

**Pricing**: $0.28/hour of compute
**Storage**: $0.072/GB/month

**Estimate for moderate use**:
- ~10 hours compute/month: $2.80
- ~1GB storage: $0.07
- **Total**: ~$3/month

**Recommendation**: Start with Neon or Supabase free tier.

---

## AI Service Costs

### Claude API (Anthropic)

**Pricing** (Claude 3.5 Sonnet):
- Input: $3 per million tokens
- Output: $15 per million tokens

**Per-Bookmark Analysis:**

| Task | Input Tokens | Output Tokens | Cost |
|------|-------------|---------------|------|
| Summarization | 500 | 150 | $0.0019 |
| Auto-tagging | 400 | 30 | $0.0013 |
| Categorization | 600 | 50 | $0.0020 |

**Average per bookmark**: ~$0.002

**Monthly Estimates:**

| Bookmarks/Month | Cost |
|-----------------|------|
| 50 | $0.10 |
| 100 | $0.20 |
| 500 | $1.00 |
| 1000 | $2.00 |

### Semantic Search

**Per Search:**
- Input: 2,000 tokens (context + query)
- Output: 300 tokens
- **Cost**: ~$0.007 per search

**Monthly Estimates:**

| Searches/Month | Cost |
|----------------|------|
| 50 | $0.35 |
| 100 | $0.70 |
| 500 | $3.50 |

### Q&A System

**Per Question:**
- Input: 3,000 tokens
- Output: 500 tokens
- **Cost**: ~$0.0115 per question

**Monthly Estimates:**

| Questions/Month | Cost |
|-----------------|------|
| 20 | $0.23 |
| 50 | $0.58 |
| 100 | $1.15 |

### Whisper API (OpenAI)

**Pricing**: $0.006 per minute of audio

**Per Video:**

| Video Length | Cost |
|--------------|------|
| 3 minutes | $0.018 |
| 5 minutes | $0.030 |
| 10 minutes | $0.060 |
| 30 minutes | $0.180 |

**Monthly Estimates:**

| Videos (8 min avg) | Cost |
|-------------------|------|
| 10 | $0.48 |
| 30 | $1.44 |
| 50 | $2.40 |
| 100 | $4.80 |

---

## Usage Scenarios

### Light User (Personal Use)

**Profile:**
- 50 bookmarks/month (35 text, 10 videos, 5 GitHub)
- 20 searches/month
- 10 Q&A queries/month

**Costs:**

| Service | Usage | Cost |
|---------|-------|------|
| Vercel | Free tier | $0 |
| Worker | Free tier (Render) | $0 |
| Redis | Free tier | $0 |
| Database | Free tier (Neon) | $0 |
| Claude | 35 analyses + 20 searches + 10 Q&A | $0.35 |
| Whisper | 10 videos × 8 min | $0.48 |
| **Total** | | **$0.83/month** |

### Medium User (Active Use)

**Profile:**
- 200 bookmarks/month (120 text, 50 videos, 30 GitHub)
- 100 searches/month
- 30 Q&A queries/month

**Costs:**

| Service | Usage | Cost |
|---------|-------|------|
| Vercel | Free tier | $0 |
| Worker | Paid (Railway) | $5 |
| Redis | Free tier | $0 |
| Database | Free tier (Neon) | $0 |
| Claude | 150 analyses + 100 searches + 30 Q&A | $2.05 |
| Whisper | 50 videos × 8 min | $2.40 |
| **Total** | | **$9.45/month** |

### Heavy User (Power Use)

**Profile:**
- 1000 bookmarks/month (600 text, 300 videos, 100 GitHub)
- 500 searches/month
- 100 Q&A queries/month

**Costs:**

| Service | Usage | Cost |
|---------|-------|------|
| Vercel | Pro ($20) + overages | $25 |
| Worker | Paid (Railway) | $5 |
| Redis | Paid | $2 |
| Database | Paid (Neon Pro) | $19 |
| Claude | 700 analyses + 500 searches + 100 Q&A | $6.55 |
| Whisper | 300 videos × 8 min | $14.40 |
| **Total** | | **$71.95/month** |

---

## Cost Optimization Strategies

### 1. Cache AI Results

```typescript
// Check if already analyzed
const existing = await prisma.aIAnalysis.findUnique({
  where: { bookmarkId }
})
if (existing) return existing
```

**Savings**: Avoid re-analyzing unchanged content
**Impact**: 50-80% reduction in Claude costs

### 2. Lazy Analysis

```typescript
// Only analyze when user views bookmark
if (!bookmark.aiAnalysis && userViewed) {
  queueAnalysis(bookmarkId)
}
```

**Savings**: Don't analyze bookmarks you never read
**Impact**: 30-60% reduction in AI costs

### 3. Selective Transcription

```typescript
// Skip very short or very long videos
if (duration < 30 || duration > 3600) {
  return null
}
```

**Savings**: Skip transcribing noise
**Impact**: 20-40% reduction in Whisper costs

### 4. Batch Processing

```typescript
// Process in batches to reduce overhead
const BATCH_SIZE = 10
for (let i = 0; i < bookmarks.length; i += BATCH_SIZE) {
  await processBatch(bookmarks.slice(i, i + BATCH_SIZE))
}
```

**Savings**: Better rate limiting, fewer errors
**Impact**: 10-20% cost reduction

### 5. Content Truncation

```typescript
// Limit content length
const MAX_CONTENT = 2000
const content = bookmark.content?.substring(0, MAX_CONTENT)
```

**Savings**: Reduce token usage
**Impact**: 20-30% reduction in Claude costs

### 6. Use Cheaper Models

```typescript
// Use Haiku for simple tasks
const model = task === 'simple'
  ? 'claude-3-haiku-20240307'  // $0.25/$1.25 per million
  : 'claude-3-5-sonnet-20241022'  // $3/$15 per million
```

**Savings**: 10x cheaper for categorization
**Impact**: 40-60% reduction for simple tasks

### 7. Free Tier Infrastructure

**Use all free tiers:**
- Vercel (Free)
- Render (Free - 750 hours)
- Upstash (Free - 10K requests)
- Neon (Free - 3GB)

**Savings**: $0 infrastructure
**Impact**: Only pay for AI usage

---

## Cost Monitoring

### Track API Usage

```typescript
interface UsageMetrics {
  inputTokens: number
  outputTokens: number
  totalCost: number
  requestCount: number
}

async function trackUsage(message: Message) {
  const cost = calculateCost(message.usage)

  await prisma.apiUsage.create({
    data: {
      model: CLAUDE_CONFIG.model,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      cost,
      timestamp: new Date()
    }
  })
}
```

### Usage Dashboard

```typescript
// Get monthly costs
app.get('/api/stats/costs', async (c) => {
  const stats = await prisma.apiUsage.aggregate({
    _sum: {
      inputTokens: true,
      outputTokens: true,
      cost: true
    },
    where: {
      timestamp: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }
    }
  })

  return c.json({
    totalCost: stats._sum.cost,
    period: 'Last 30 days'
  })
})
```

### Set Spending Alerts

```typescript
// Check if over budget
const MONTHLY_BUDGET = 10.00  // $10/month

const monthlySpend = await getMonthlySpend()

if (monthlySpend > MONTHLY_BUDGET) {
  await sendAlert('Budget exceeded!')
  // Pause AI processing
  await pauseAIProcessing()
}
```

---

## Scaling Costs

### At 1,000 Bookmarks

**Storage**: ~100MB (text) + ~200MB (metadata) = 300MB
**Database**: Still on free tier ✅

### At 10,000 Bookmarks

**Storage**: ~1GB (text) + ~2GB (metadata) = 3GB
**Database**: Neon free tier limit ✅ (just barely)

### At 100,000 Bookmarks

**Storage**: ~10GB (text) + ~20GB (metadata) = 30GB
**Database**: Need paid tier ($19/month Neon Pro)

**Recommendation**: Archive old bookmarks, use compression

---

## Cost Comparison

### DIY vs Alternatives

| Solution | Cost/Month | Features |
|----------|-----------|----------|
| **Karakeep (DIY)** | **$2.60** | Full control, AI-powered, unlimited |
| Pocket Premium | $4.99 | Basic, limited AI |
| Raindrop.io Pro | $3.00 | No AI, basic search |
| Notion | $10.00 | Manual organization |
| Instapaper Premium | $2.99 | Reading only |

**Value Proposition**: Same price or cheaper, with AI superpowers!

---

## Related Documentation

- [Quick Start](./quick-start.md) - Get started
- [Roadmap](./roadmap.md) - Implementation timeline
- [Vercel Deployment](../deployment/vercel.md) - Free tier setup
- [Worker Deployment](../deployment/workers.md) - Background processing
- [Claude Setup](../ai/claude-setup.md) - AI configuration

---

**Keep costs low by using free tiers and implementing optimization strategies!**
