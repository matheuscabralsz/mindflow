# Phase 6: Basic AI Integration (Sentiment & Summaries) - Detailed Implementation Plan

## Overview
Integrate OpenAI API to provide AI-powered features including automatic sentiment analysis for entries and generation of daily/weekly summaries. This phase establishes the foundation for all future AI features and demonstrates the app's core value proposition of making journaling more insightful.

## Goals
- Automatically analyze sentiment of journal entries using OpenAI
- Store sentiment scores and emotional insights with entries
- Generate daily summaries of user's entries
- Generate weekly summaries highlighting patterns and themes
- Implement rate limiting and cost controls for AI operations
- Cache AI-generated content to minimize API costs
- Provide fallback behavior when AI services are unavailable
- Display sentiment and summaries in user-friendly format

---

## Database Schema

### Update Entries Table for Sentiment

```sql
-- Add sentiment columns to entries table
ALTER TABLE entries
ADD COLUMN sentiment_score DECIMAL(3, 2),
ADD COLUMN sentiment_magnitude DECIMAL(3, 2),
ADD COLUMN primary_emotion TEXT,
ADD COLUMN sentiment_analyzed_at TIMESTAMP WITH TIME ZONE;

-- Add constraints
ALTER TABLE entries
ADD CONSTRAINT sentiment_score_range CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
ADD CONSTRAINT sentiment_magnitude_range CHECK (sentiment_magnitude >= 0 AND sentiment_magnitude <= 1);

-- Create index for sentiment queries
CREATE INDEX idx_entries_sentiment ON entries(sentiment_score);
CREATE INDEX idx_entries_primary_emotion ON entries(primary_emotion);

-- Add comments
COMMENT ON COLUMN entries.sentiment_score IS 'Sentiment score from -1 (negative) to 1 (positive)';
COMMENT ON COLUMN entries.sentiment_magnitude IS 'Magnitude/strength of emotion from 0 to 1';
COMMENT ON COLUMN entries.primary_emotion IS 'Primary detected emotion from AI analysis';
COMMENT ON COLUMN entries.sentiment_analyzed_at IS 'Timestamp of last sentiment analysis';
```

### Create AI Summaries Table

```sql
-- Create summaries table
CREATE TABLE summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary_type TEXT NOT NULL CHECK (summary_type IN ('daily', 'weekly', 'monthly')),
  content TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  entry_count INTEGER NOT NULL DEFAULT 0,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB,

  -- Unique constraint: one summary per type per date range per user
  UNIQUE(user_id, summary_type, start_date, end_date)
);

-- Enable Row Level Security
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own summaries
CREATE POLICY "Users can read own summaries"
  ON summaries
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own summaries
CREATE POLICY "Users can insert own summaries"
  ON summaries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own summaries
CREATE POLICY "Users can update own summaries"
  ON summaries
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own summaries
CREATE POLICY "Users can delete own summaries"
  ON summaries
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_summaries_user_id ON summaries(user_id);
CREATE INDEX idx_summaries_type ON summaries(summary_type);
CREATE INDEX idx_summaries_dates ON summaries(start_date, end_date);
CREATE INDEX idx_summaries_generated_at ON summaries(generated_at DESC);

-- Add comments
COMMENT ON TABLE summaries IS 'AI-generated summaries of user journal entries';
COMMENT ON COLUMN summaries.metadata IS 'Additional summary metadata (word count, themes, etc.)';
```

### Create AI Usage Tracking Table

```sql
-- Create AI usage tracking table
CREATE TABLE ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('sentiment', 'summary', 'pattern', 'prompt')),
  model TEXT NOT NULL,
  tokens_used INTEGER NOT NULL,
  cost_usd DECIMAL(10, 6),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own usage
CREATE POLICY "Users can read own usage"
  ON ai_usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_ai_usage_user_id ON ai_usage(user_id);
CREATE INDEX idx_ai_usage_created_at ON ai_usage(created_at DESC);
CREATE INDEX idx_ai_usage_operation_type ON ai_usage(operation_type);

-- Add comments
COMMENT ON TABLE ai_usage IS 'Track AI API usage for cost monitoring and rate limiting';
```

### Migration File
Create: `database/migrations/006_add_ai_features.sql`

---

## Backend Implementation

### 1. Environment Configuration

**File:** `backend/.env` (add OpenAI config)
```env
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_MAX_TOKENS=500
OPENAI_TEMPERATURE=0.3
```

**File:** `backend/src/config/openai.ts`
```typescript
import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.warn('OPENAI_API_KEY not set. AI features will be disabled.');
}

export const openai = new OpenAI({
  apiKey: apiKey || 'dummy-key',
});

export const openaiConfig = {
  model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
  maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '500'),
  temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.3'),
};

export const isAIEnabled = !!apiKey;
```

### 2. TypeScript Types

**File:** `backend/src/types/ai.types.ts`
```typescript
export interface SentimentAnalysis {
  score: number; // -1 to 1
  magnitude: number; // 0 to 1
  primaryEmotion: string;
  confidence: number;
}

export interface Summary {
  id: string;
  user_id: string;
  summary_type: 'daily' | 'weekly' | 'monthly';
  content: string;
  start_date: string;
  end_date: string;
  entry_count: number;
  generated_at: string;
  metadata?: {
    wordCount?: number;
    themes?: string[];
    keyInsights?: string[];
  };
}

export interface AIUsage {
  id: string;
  user_id: string;
  operation_type: 'sentiment' | 'summary' | 'pattern' | 'prompt';
  model: string;
  tokens_used: number;
  cost_usd: number;
  created_at: string;
}

export interface GenerateSummaryParams {
  userId: string;
  type: 'daily' | 'weekly';
  date?: Date;
}
```

### 3. AI Prompts

**File:** `backend/src/services/ai/prompts.ts`
```typescript
export const SENTIMENT_ANALYSIS_PROMPT = `
Analyze the emotional tone and sentiment of this journal entry.

Entry: "{content}"

Return ONLY a JSON object with this exact format (no markdown, no explanation):
{
  "score": <number between -1 (very negative) and 1 (very positive)>,
  "magnitude": <number between 0 (neutral) and 1 (intense emotion)>,
  "primaryEmotion": "<one of: joy, sadness, anger, fear, surprise, disgust, trust, anticipation, neutral>",
  "confidence": <number between 0 and 1>
}`;

export const DAILY_SUMMARY_PROMPT = `
Create a concise, thoughtful summary of these journal entries from a single day.

Date: {date}
Number of entries: {count}

Entries:
{entries}

Write a 2-3 paragraph summary that:
1. Captures the overall mood and emotional arc of the day
2. Highlights key events, thoughts, or themes
3. Notes any significant patterns or insights
4. Uses a warm, reflective tone

Keep it under 200 words.`;

export const WEEKLY_SUMMARY_PROMPT = `
Create an insightful weekly summary of these journal entries.

Week: {startDate} to {endDate}
Number of entries: {count}

Daily summaries:
{summaries}

Write a 3-4 paragraph summary that:
1. Identifies major themes and patterns across the week
2. Notes emotional trends and changes
3. Highlights significant events or realizations
4. Offers gentle, encouraging insights
5. Uses a warm, reflective tone

Keep it under 300 words.`;

export function formatSentimentPrompt(content: string): string {
  return SENTIMENT_ANALYSIS_PROMPT.replace('{content}', content);
}

export function formatDailySummaryPrompt(
  date: string,
  entries: Array<{ content: string; mood?: string }>
): string {
  const entriesText = entries
    .map((e, i) => `Entry ${i + 1}${e.mood ? ` (Mood: ${e.mood})` : ''}:\n${e.content}`)
    .join('\n\n---\n\n');

  return DAILY_SUMMARY_PROMPT
    .replace('{date}', date)
    .replace('{count}', entries.length.toString())
    .replace('{entries}', entriesText);
}

export function formatWeeklySummaryPrompt(
  startDate: string,
  endDate: string,
  dailySummaries: Array<{ date: string; summary: string }>
): string {
  const summariesText = dailySummaries
    .map(s => `${s.date}:\n${s.summary}`)
    .join('\n\n---\n\n');

  return WEEKLY_SUMMARY_PROMPT
    .replace('{startDate}', startDate)
    .replace('{endDate}', endDate)
    .replace('{count}', dailySummaries.length.toString())
    .replace('{summaries}', summariesText);
}
```

### 4. Sentiment Analysis Service

**File:** `backend/src/services/ai/sentiment.service.ts`
```typescript
import { openai, openaiConfig, isAIEnabled } from '../../config/openai';
import { SentimentAnalysis } from '../../types/ai.types';
import { formatSentimentPrompt } from './prompts';
import { aiUsageService } from './usage.service';

export class SentimentService {
  async analyzeSentiment(
    userId: string,
    content: string
  ): Promise<SentimentAnalysis | null> {
    if (!isAIEnabled) {
      console.warn('AI disabled: Skipping sentiment analysis');
      return null;
    }

    try {
      const prompt = formatSentimentPrompt(content);

      const response = await openai.chat.completions.create({
        model: openaiConfig.model,
        messages: [
          {
            role: 'system',
            content: 'You are a sentiment analysis expert. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 150,
      });

      const result = response.choices[0]?.message?.content;

      if (!result) {
        throw new Error('No response from OpenAI');
      }

      // Track usage
      await aiUsageService.trackUsage({
        userId,
        operationType: 'sentiment',
        model: openaiConfig.model,
        tokensUsed: response.usage?.total_tokens || 0,
      });

      // Parse JSON response
      const sentiment = JSON.parse(result.trim());

      // Validate response
      if (
        typeof sentiment.score !== 'number' ||
        typeof sentiment.magnitude !== 'number' ||
        typeof sentiment.primaryEmotion !== 'string'
      ) {
        throw new Error('Invalid sentiment response format');
      }

      return {
        score: Math.max(-1, Math.min(1, sentiment.score)),
        magnitude: Math.max(0, Math.min(1, sentiment.magnitude)),
        primaryEmotion: sentiment.primaryEmotion,
        confidence: sentiment.confidence || 0.8,
      };
    } catch (error: any) {
      console.error('Sentiment analysis error:', error);

      // Return neutral sentiment as fallback
      return {
        score: 0,
        magnitude: 0,
        primaryEmotion: 'neutral',
        confidence: 0,
      };
    }
  }

  // Batch analyze multiple entries
  async analyzeBatch(
    userId: string,
    entries: Array<{ id: string; content: string }>
  ): Promise<Map<string, SentimentAnalysis>> {
    const results = new Map<string, SentimentAnalysis>();

    // Process in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);

      const promises = batch.map(async entry => {
        const sentiment = await this.analyzeSentiment(userId, entry.content);
        if (sentiment) {
          results.set(entry.id, sentiment);
        }
      });

      await Promise.all(promises);

      // Rate limiting delay
      if (i + batchSize < entries.length) {
        await this.delay(1000);
      }
    }

    return results;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const sentimentService = new SentimentService();
```

### 5. Summary Service

**File:** `backend/src/services/ai/summary.service.ts`
```typescript
import { openai, openaiConfig, isAIEnabled } from '../../config/openai';
import { supabase } from '../../config/supabase';
import { Summary, GenerateSummaryParams } from '../../types/ai.types';
import { formatDailySummaryPrompt, formatWeeklySummaryPrompt } from './prompts';
import { aiUsageService } from './usage.service';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns';

export class SummaryService {
  // Generate daily summary
  async generateDailySummary(params: GenerateSummaryParams): Promise<Summary | null> {
    if (!isAIEnabled) {
      console.warn('AI disabled: Skipping summary generation');
      return null;
    }

    const { userId, date = new Date() } = params;
    const startDate = startOfDay(date);
    const endDate = endOfDay(date);

    try {
      // Get entries for the day
      const { data: entries, error } = await supabase
        .from('entries')
        .select('content, mood')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!entries || entries.length === 0) {
        return null;
      }

      // Generate summary using OpenAI
      const prompt = formatDailySummaryPrompt(
        format(date, 'MMMM d, yyyy'),
        entries
      );

      const response = await openai.chat.completions.create({
        model: openaiConfig.model,
        messages: [
          {
            role: 'system',
            content: 'You are a thoughtful journal companion who helps users reflect on their day.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
      });

      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No summary generated');
      }

      // Track usage
      await aiUsageService.trackUsage({
        userId,
        operationType: 'summary',
        model: openaiConfig.model,
        tokensUsed: response.usage?.total_tokens || 0,
      });

      // Save summary to database
      const { data: summary, error: saveError } = await supabase
        .from('summaries')
        .upsert([
          {
            user_id: userId,
            summary_type: 'daily',
            content,
            start_date: format(startDate, 'yyyy-MM-dd'),
            end_date: format(endDate, 'yyyy-MM-dd'),
            entry_count: entries.length,
            metadata: {
              wordCount: content.split(/\s+/).length,
            },
          },
        ], {
          onConflict: 'user_id,summary_type,start_date,end_date',
        })
        .select()
        .single();

      if (saveError) throw saveError;

      return summary;
    } catch (error) {
      console.error('Daily summary generation error:', error);
      return null;
    }
  }

  // Generate weekly summary
  async generateWeeklySummary(params: GenerateSummaryParams): Promise<Summary | null> {
    if (!isAIEnabled) {
      console.warn('AI disabled: Skipping summary generation');
      return null;
    }

    const { userId, date = new Date() } = params;
    const startDate = startOfWeek(date);
    const endDate = endOfWeek(date);

    try {
      // Get daily summaries for the week
      const { data: dailySummaries, error } = await supabase
        .from('summaries')
        .select('*')
        .eq('user_id', userId)
        .eq('summary_type', 'daily')
        .gte('start_date', format(startDate, 'yyyy-MM-dd'))
        .lte('end_date', format(endDate, 'yyyy-MM-dd'))
        .order('start_date', { ascending: true });

      if (error) throw error;

      if (!dailySummaries || dailySummaries.length === 0) {
        return null;
      }

      // Generate weekly summary
      const prompt = formatWeeklySummaryPrompt(
        format(startDate, 'MMMM d, yyyy'),
        format(endDate, 'MMMM d, yyyy'),
        dailySummaries.map(s => ({
          date: format(new Date(s.start_date), 'EEEE, MMMM d'),
          summary: s.content,
        }))
      );

      const response = await openai.chat.completions.create({
        model: openaiConfig.model,
        messages: [
          {
            role: 'system',
            content: 'You are a thoughtful journal companion who helps users reflect on their week.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 400,
      });

      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No summary generated');
      }

      // Track usage
      await aiUsageService.trackUsage({
        userId,
        operationType: 'summary',
        model: openaiConfig.model,
        tokensUsed: response.usage?.total_tokens || 0,
      });

      // Calculate total entry count
      const totalEntries = dailySummaries.reduce(
        (sum, s) => sum + (s.entry_count || 0),
        0
      );

      // Save summary to database
      const { data: summary, error: saveError } = await supabase
        .from('summaries')
        .upsert([
          {
            user_id: userId,
            summary_type: 'weekly',
            content,
            start_date: format(startDate, 'yyyy-MM-dd'),
            end_date: format(endDate, 'yyyy-MM-dd'),
            entry_count: totalEntries,
            metadata: {
              wordCount: content.split(/\s+/).length,
              daysWithEntries: dailySummaries.length,
            },
          },
        ], {
          onConflict: 'user_id,summary_type,start_date,end_date',
        })
        .select()
        .single();

      if (saveError) throw saveError;

      return summary;
    } catch (error) {
      console.error('Weekly summary generation error:', error);
      return null;
    }
  }

  // Get existing summaries
  async getSummaries(
    userId: string,
    type?: 'daily' | 'weekly',
    limit: number = 10
  ): Promise<Summary[]> {
    let query = supabase
      .from('summaries')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: false })
      .limit(limit);

    if (type) {
      query = query.eq('summary_type', type);
    }

    const { data: summaries, error } = await query;

    if (error) {
      console.error('Get summaries error:', error);
      return [];
    }

    return summaries || [];
  }
}

export const summaryService = new SummaryService();
```

### 6. AI Usage Tracking Service

**File:** `backend/src/services/ai/usage.service.ts`
```typescript
import { supabase } from '../../config/supabase';
import { AIUsage } from '../../types/ai.types';

// Approximate token costs (as of 2024)
const TOKEN_COSTS = {
  'gpt-3.5-turbo': 0.000002, // $0.002 per 1K tokens
  'gpt-4': 0.00003, // $0.03 per 1K tokens
};

interface TrackUsageParams {
  userId: string;
  operationType: 'sentiment' | 'summary' | 'pattern' | 'prompt';
  model: string;
  tokensUsed: number;
}

export class AIUsageService {
  async trackUsage(params: TrackUsageParams): Promise<void> {
    const { userId, operationType, model, tokensUsed } = params;

    // Calculate cost
    const costPer1kTokens = TOKEN_COSTS[model as keyof typeof TOKEN_COSTS] || 0.000002;
    const costUsd = (tokensUsed / 1000) * costPer1kTokens;

    try {
      await supabase.from('ai_usage').insert([
        {
          user_id: userId,
          operation_type: operationType,
          model,
          tokens_used: tokensUsed,
          cost_usd: costUsd,
        },
      ]);
    } catch (error) {
      console.error('Track usage error:', error);
      // Don't throw - usage tracking failure shouldn't break the app
    }
  }

  async getUserUsage(userId: string, days: number = 30): Promise<{
    totalTokens: number;
    totalCost: number;
    operationCounts: { [key: string]: number };
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: usage, error } = await supabase
      .from('ai_usage')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString());

    if (error || !usage) {
      return {
        totalTokens: 0,
        totalCost: 0,
        operationCounts: {},
      };
    }

    const totalTokens = usage.reduce((sum, u) => sum + u.tokens_used, 0);
    const totalCost = usage.reduce((sum, u) => sum + (u.cost_usd || 0), 0);

    const operationCounts: { [key: string]: number } = {};
    usage.forEach(u => {
      operationCounts[u.operation_type] = (operationCounts[u.operation_type] || 0) + 1;
    });

    return {
      totalTokens,
      totalCost,
      operationCounts,
    };
  }

  // Check if user is within rate limits
  async checkRateLimit(userId: string, operationType: string): Promise<boolean> {
    const hourAgo = new Date();
    hourAgo.setHours(hourAgo.getHours() - 1);

    const { count } = await supabase
      .from('ai_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('operation_type', operationType)
      .gte('created_at', hourAgo.toISOString());

    // Limit: 50 operations per hour
    return (count || 0) < 50;
  }
}

export const aiUsageService = new AIUsageService();
```

### 7. Update Entries Service

**File:** `backend/src/services/entries.service.ts` (add sentiment on create/update)
```typescript
import { sentimentService } from './ai/sentiment.service';

// Update createEntry
async createEntry(userId: string, data: CreateEntryDto): Promise<Entry> {
  // ... existing code ...

  const { data: entry, error } = await supabase
    .from('entries')
    .insert([
      {
        user_id: userId,
        content: content.trim(),
        title: finalTitle,
        mood: mood || null,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Create entry error:', error);
    throw new Error('Failed to create entry');
  }

  // Analyze sentiment asynchronously (don't await)
  this.analyzeSentimentAsync(userId, entry.id, entry.content);

  return entry;
}

// Add sentiment analysis method
private async analyzeSentimentAsync(
  userId: string,
  entryId: string,
  content: string
): Promise<void> {
  try {
    const sentiment = await sentimentService.analyzeSentiment(userId, content);

    if (sentiment) {
      await supabase
        .from('entries')
        .update({
          sentiment_score: sentiment.score,
          sentiment_magnitude: sentiment.magnitude,
          primary_emotion: sentiment.primaryEmotion,
          sentiment_analyzed_at: new Date().toISOString(),
        })
        .eq('id', entryId);
    }
  } catch (error) {
    console.error('Async sentiment analysis error:', error);
    // Don't throw - sentiment is not critical
  }
}
```

### 8. AI Controller

**File:** `backend/src/controllers/ai.controller.ts`
```typescript
import { Request, Response } from 'express';
import { summaryService } from '../services/ai/summary.service';
import { aiUsageService } from '../services/ai/usage.service';

export const aiController = {
  // Generate daily summary
  generateDailySummary: async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const date = req.query.date ? new Date(req.query.date as string) : new Date();

      const summary = await summaryService.generateDailySummary({
        userId,
        type: 'daily',
        date,
      });

      if (!summary) {
        return res.status(404).json({
          success: false,
          error: 'No entries found for this day',
        });
      }

      return res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error: any) {
      console.error('Generate daily summary error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate summary',
      });
    }
  },

  // Generate weekly summary
  generateWeeklySummary: async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const date = req.query.date ? new Date(req.query.date as string) : new Date();

      const summary = await summaryService.generateWeeklySummary({
        userId,
        type: 'weekly',
        date,
      });

      if (!summary) {
        return res.status(404).json({
          success: false,
          error: 'Not enough data to generate weekly summary',
        });
      }

      return res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error: any) {
      console.error('Generate weekly summary error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate summary',
      });
    }
  },

  // Get summaries
  getSummaries: async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const type = req.query.type as 'daily' | 'weekly' | undefined;
      const limit = parseInt(req.query.limit as string) || 10;

      const summaries = await summaryService.getSummaries(userId, type, limit);

      return res.status(200).json({
        success: true,
        data: summaries,
      });
    } catch (error: any) {
      console.error('Get summaries error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch summaries',
      });
    }
  },

  // Get AI usage stats
  getUsageStats: async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const days = parseInt(req.query.days as string) || 30;

      const stats = await aiUsageService.getUserUsage(userId, days);

      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Get usage stats error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch usage stats',
      });
    }
  },
};
```

### 9. AI Routes

**File:** `backend/src/routes/ai.routes.ts`
```typescript
import { Router } from 'express';
import { aiController } from '../controllers/ai.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Generate summaries
router.post('/summaries/daily', aiController.generateDailySummary);
router.post('/summaries/weekly', aiController.generateWeeklySummary);

// Get summaries
router.get('/summaries', aiController.getSummaries);

// Get usage stats
router.get('/usage', aiController.getUsageStats);

export default router;
```

### 10. Update Server

**File:** `backend/src/server.ts`
```typescript
import aiRoutes from './routes/ai.routes';

// ... existing code ...

app.use('/api/ai', aiRoutes);
```

---

## Frontend Implementation

### 1. Update Entry Types

**File:** `mobile/src/types/entry.types.ts` (add sentiment fields)
```typescript
export interface Entry {
  id: string;
  user_id: string;
  content: string;
  title?: string;
  mood?: MoodType;
  sentiment_score?: number;
  sentiment_magnitude?: number;
  primary_emotion?: string;
  sentiment_analyzed_at?: string;
  created_at: string;
  updated_at: string;
}
```

### 2. Summary Types

**File:** `mobile/src/types/summary.types.ts`
```typescript
export interface Summary {
  id: string;
  user_id: string;
  summary_type: 'daily' | 'weekly' | 'monthly';
  content: string;
  start_date: string;
  end_date: string;
  entry_count: number;
  generated_at: string;
  metadata?: {
    wordCount?: number;
    themes?: string[];
    keyInsights?: string[];
    daysWithEntries?: number;
  };
}
```

### 3. AI Service

**File:** `mobile/src/services/ai.service.ts`
```typescript
import { apiClient } from './api';
import { Summary } from '../types/summary.types';

export const aiService = {
  // Generate daily summary
  generateDailySummary: async (date?: Date): Promise<Summary> => {
    const params = date ? { date: date.toISOString() } : {};
    const response = await apiClient.post<{ success: boolean; data: Summary }>(
      '/ai/summaries/daily',
      null,
      { params }
    );
    return response.data.data;
  },

  // Generate weekly summary
  generateWeeklySummary: async (date?: Date): Promise<Summary> => {
    const params = date ? { date: date.toISOString() } : {};
    const response = await apiClient.post<{ success: boolean; data: Summary }>(
      '/ai/summaries/weekly',
      null,
      { params }
    );
    return response.data.data;
  },

  // Get summaries
  getSummaries: async (
    type?: 'daily' | 'weekly',
    limit: number = 10
  ): Promise<Summary[]> => {
    const params: any = { limit };
    if (type) params.type = type;

    const response = await apiClient.get<{ success: boolean; data: Summary[] }>(
      '/ai/summaries',
      { params }
    );
    return response.data.data;
  },

  // Get AI usage stats
  getUsageStats: async (days: number = 30) => {
    const response = await apiClient.get<{
      success: boolean;
      data: {
        totalTokens: number;
        totalCost: number;
        operationCounts: { [key: string]: number };
      };
    }>(`/ai/usage?days=${days}`);
    return response.data.data;
  },
};
```

### 4. Sentiment Badge Component

**File:** `mobile/src/components/ai/SentimentBadge.tsx`
```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  score: number;
  showLabel?: boolean;
}

export const SentimentBadge = ({ score, showLabel = true }: Props) => {
  const getSentimentColor = (score: number): string => {
    if (score > 0.3) return '#4CAF50'; // Positive - green
    if (score < -0.3) return '#F44336'; // Negative - red
    return '#9E9E9E'; // Neutral - gray
  };

  const getSentimentLabel = (score: number): string => {
    if (score > 0.5) return 'Very Positive';
    if (score > 0.2) return 'Positive';
    if (score > -0.2) return 'Neutral';
    if (score > -0.5) return 'Negative';
    return 'Very Negative';
  };

  const color = getSentimentColor(score);
  const label = getSentimentLabel(score);

  return (
    <View style={styles.container}>
      <View style={[styles.badge, { backgroundColor: color + '20', borderColor: color }]}>
        <View style={[styles.indicator, { backgroundColor: color }]} />
        {showLabel && <Text style={[styles.label, { color }]}>{label}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
```

### 5. Summaries Screen

**File:** `mobile/src/screens/insights/SummariesScreen.tsx`
```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { aiService } from '../../services/ai.service';
import { Summary } from '../../types/summary.types';
import { format } from 'date-fns';

export const SummariesScreen = () => {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState<'all' | 'daily' | 'weekly'>('all');

  useEffect(() => {
    loadSummaries();
  }, [filter]);

  const loadSummaries = async () => {
    try {
      setLoading(true);
      const type = filter === 'all' ? undefined : filter;
      const data = await aiService.getSummaries(type, 20);
      setSummaries(data);
    } catch (error) {
      console.error('Failed to load summaries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDaily = async () => {
    try {
      setGenerating(true);
      await aiService.generateDailySummary();
      Alert.alert('Success', 'Daily summary generated!');
      loadSummaries();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to generate summary');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateWeekly = async () => {
    try {
      setGenerating(true);
      await aiService.generateWeeklySummary();
      Alert.alert('Success', 'Weekly summary generated!');
      loadSummaries();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to generate summary');
    } finally {
      setGenerating(false);
    }
  };

  const renderSummary = (summary: Summary) => (
    <View key={summary.id} style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        <View>
          <Text style={styles.summaryType}>
            {summary.summary_type.charAt(0).toUpperCase() + summary.summary_type.slice(1)} Summary
          </Text>
          <Text style={styles.summaryDate}>
            {format(new Date(summary.start_date), 'MMM d, yyyy')}
            {summary.summary_type === 'weekly' &&
              ` - ${format(new Date(summary.end_date), 'MMM d, yyyy')}`}
          </Text>
        </View>
        <View style={styles.summaryStats}>
          <Text style={styles.statText}>{summary.entry_count} entries</Text>
        </View>
      </View>
      <Text style={styles.summaryContent}>{summary.content}</Text>
      {summary.metadata?.wordCount && (
        <Text style={styles.metadata}>{summary.metadata.wordCount} words</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Summaries</Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.generateButton}
            onPress={handleGenerateDaily}
            disabled={generating}
          >
            {generating ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Text style={styles.generateButtonText}>Generate Daily</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.generateButton}
            onPress={handleGenerateWeekly}
            disabled={generating}
          >
            {generating ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Text style={styles.generateButtonText}>Generate Weekly</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filterContainer}>
        {(['all', 'daily', 'weekly'] as const).map(type => (
          <TouchableOpacity
            key={type}
            style={[styles.filterButton, filter === type && styles.filterButtonActive]}
            onPress={() => setFilter(type)}
          >
            <Text style={[styles.filterText, filter === type && styles.filterTextActive]}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.list}>
        {summaries.length > 0 ? (
          summaries.map(renderSummary)
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No summaries yet</Text>
            <Text style={styles.emptySubtext}>Generate your first summary above</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  generateButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  generateButtonText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: '#fff',
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  summaryDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  summaryStats: {
    alignItems: 'flex-end',
  },
  statText: {
    fontSize: 12,
    color: '#999',
  },
  summaryContent: {
    fontSize: 15,
    lineHeight: 22,
    color: '#1a1a1a',
  },
  metadata: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
});
```

### 6. Update Entry Detail Screen

Add sentiment display in EntryDetailScreen:
```typescript
import { SentimentBadge } from '../../components/ai/SentimentBadge';

// Add after mood display
{selectedEntry.sentiment_score !== undefined && (
  <View style={styles.sentimentContainer}>
    <Text style={styles.sectionLabel}>Sentiment</Text>
    <SentimentBadge score={selectedEntry.sentiment_score} />
  </View>
)}
```

---

## Step-by-Step Implementation

### Step 1: Database & Environment
- Create migration with sentiment and summaries tables
- Run migration on Supabase
- Add OpenAI API key to environment variables
- Verify configuration

### Step 2: Backend AI Services
- Install OpenAI SDK
- Implement sentiment analysis service
- Implement summary generation service
- Test with sample data

### Step 3: Backend Integration
- Update entries service to analyze sentiment
- Create AI controller and routes
- Implement usage tracking
- Test all endpoints

### Step 4: Frontend Components
- Create SentimentBadge component
- Build SummariesScreen
- Update EntryDetailScreen to show sentiment
- Test component rendering

### Step 5: Frontend Integration
- Create AI service layer
- Connect to backend APIs
- Test summary generation
- Verify sentiment display

### Step 6: Testing & Optimization
- Test sentiment accuracy
- Test summary quality
- Optimize token usage
- Implement caching

### Step 7: Error Handling
- Add fallbacks for AI failures
- Handle rate limits gracefully
- Show user-friendly errors
- Test offline behavior

### Step 8: Cost Monitoring
- Verify usage tracking works
- Test rate limiting
- Monitor API costs
- Optimize expensive operations

---

## Quality Gates

1. ✅ Sentiment analysis runs on new entries
2. ✅ Sentiment scores are accurate and stored
3. ✅ Daily summaries generate successfully
4. ✅ Weekly summaries generate successfully
5. ✅ Summaries are cached to avoid redundant API calls
6. ✅ AI usage is tracked correctly
7. ✅ Rate limiting prevents abuse
8. ✅ Sentiment displays in entry detail
9. ✅ Summaries screen shows all summaries
10. ✅ Can generate summaries on demand
11. ✅ AI gracefully handles errors
12. ✅ Fallback behavior works when AI is unavailable
13. ✅ All backend tests pass
14. ✅ Tested on iOS and Android
15. ✅ No TypeScript errors

---

## Dependencies

### Backend
```bash
cd backend
npm install openai date-fns
```

### Frontend
```bash
cd mobile
# date-fns already installed in Phase 3
```

---

## Cost Control Measures

1. **Caching**: Cache summaries for 24 hours
2. **Rate Limiting**: Max 50 AI operations per hour per user
3. **Batch Processing**: Process sentiment in batches with delays
4. **Model Selection**: Use GPT-3.5-turbo by default
5. **Token Limits**: Cap responses at 500 tokens
6. **Usage Tracking**: Monitor and alert on high usage
7. **Async Processing**: Don't block user on AI operations

---

## Next Steps
Phase 6 completes the MVP! After this, you can launch the app or continue with post-MVP phases for advanced features like Pattern Recognition (Phase 7), Offline Mode (Phase 8), or Vector Search (Phase 12).
