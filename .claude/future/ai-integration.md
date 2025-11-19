# AI Integration Guide (Phase 6+)

**Status:** Implement during Phase 6 (Basic AI) and Phase 7 (Advanced AI).

## OpenAI Best Practices

### Cost Control

- Use GPT-3.5-turbo for most tasks (cheaper)
- Reserve GPT-4 for complex pattern recognition only
- Cache results aggressively
- Implement rate limiting per user
- Monitor costs with usage tracking

### Prompt Engineering

```typescript
const SENTIMENT_PROMPT = `
Analyze the emotional tone of this journal entry and return a sentiment score.

Entry: "{content}"

Return ONLY a JSON object with this format:
{
  "score": <number between -1 (very negative) and 1 (very positive)>,
  "primary_emotion": "<happy|sad|anxious|calm|stressed|neutral>",
  "confidence": <number between 0 and 1>
}
`;
```

### Error Handling

```typescript
try {
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3, // Lower for consistent results
    max_tokens: 500,
  });

  return JSON.parse(response.choices[0].message.content);
} catch (error) {
  if (error.status === 429) {
    // Rate limited - implement exponential backoff
    await sleep(1000);
    return retry();
  }

  // Return fallback sentiment
  return { score: 0, primary_emotion: 'neutral', confidence: 0 };
}
```

### Caching Strategy

```typescript
// Cache sentiment analysis for 30 days (entries rarely edited)
const cacheKey = `sentiment:${entryId}`;
const cached = await redis.get(cacheKey);

if (cached) return JSON.parse(cached);

const sentiment = await analyzeSentiment(content);
await redis.setex(cacheKey, 30 * 24 * 60 * 60, JSON.stringify(sentiment));

return sentiment;
```

### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: 'Too many AI requests, please try again later',
});

router.post('/insights/summary', aiRateLimiter, getSummary);
```

## Vector Search with Pinecone (Phase 12)

**Status:** Not needed until Phase 12.

### Embedding Generation

```typescript
const embedding = await openai.embeddings.create({
  model: 'text-embedding-3-small', // Most cost-effective
  input: entry.content,
});

const vector = embedding.data[0].embedding;

// Store in Pinecone
await pinecone.upsert({
  vectors: [{
    id: entry.id,
    values: vector,
    metadata: { userId: entry.userId, createdAt: entry.createdAt },
  }],
});
```

### Similarity Search

```typescript
const results = await pinecone.query({
  vector: queryEmbedding,
  topK: 5,
  filter: { userId: currentUserId }, // Only search user's entries
  includeMetadata: true,
});
```

## Environment Variables

```bash
OPENAI_API_KEY=sk-xxx
PINECONE_API_KEY=xxx
PINECONE_ENVIRONMENT=xxx
```

---

**TODO:** Expand this guide during Phase 6 implementation.
