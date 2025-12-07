# Phase 6: Basic AI Integration (Sentiment & Summaries) - Detailed Implementation Guide

## Overview

**Goal:** Integrate OpenAI API for sentiment analysis on journal entries and generation of daily/weekly summaries using Supabase Edge Functions with proper rate limiting, caching, and cost control.

**Time Estimate:** 4-5 hours

**Prerequisites:**
- Phase 1 complete (Foundation & Infrastructure)
- Phase 2 complete (User Authentication)
- Phase 3 complete (Core Journal CRUD)
- OpenAI API key available
- Supabase CLI installed (`npm install -g supabase`)

**What You'll Have At The End:**
- Automatic sentiment analysis on new entries
- Manual and scheduled summary generation
- Daily and weekly summary views
- Sentiment display on entries
- Rate limiting to control API costs
- Response caching via `ai_insights` table
- Error handling for AI failures
- Critical path tests

---

## Architecture Overview

This phase uses **Supabase Edge Functions** (Deno-based serverless functions) for AI integration, maintaining the MVP architecture of "Direct Supabase integration (no backend server needed)".

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────┐
│  Mobile App     │────▶│  Supabase Edge Fn    │────▶│  OpenAI API │
│  (Ionic/React)  │     │  (Deno Runtime)      │     │             │
└─────────────────┘     └──────────────────────┘     └─────────────┘
        │                         │
        │                         ▼
        │               ┌──────────────────────┐
        └──────────────▶│  Supabase Database   │
                        │  (entries, ai_insights)│
                        └──────────────────────┘
```

**Why Edge Functions:**
- OpenAI API key stays server-side (secure)
- No separate backend server to deploy/manage
- Automatic scaling and HTTPS
- Direct database access with service role
- Built-in CORS handling

---

## Step 1: Environment Setup (10 minutes)

### 1.1 Install Supabase CLI (if not installed)

```bash
npm install -g supabase
```

### 1.2 Initialize Supabase Functions

```bash
cd /home/mack/my_workspace/mindflow
supabase functions new analyze-sentiment
supabase functions new generate-summary
```

This creates:
```
supabase/
└── functions/
    ├── analyze-sentiment/
    │   └── index.ts
    └── generate-summary/
        └── index.ts
```

### 1.3 Set OpenAI API Key as Secret

```bash
# Set the secret (you'll be prompted for the value)
supabase secrets set OPENAI_API_KEY=sk-your-key-here

# Verify it's set
supabase secrets list
```

**Note:** Never commit API keys. Use Supabase Secrets for all sensitive values.

---

## Step 2: Database Schema Updates (15 minutes)

### 2.1 Add Sentiment Columns to Entries

Create a new migration file:

```bash
# Generate timestamp-based migration
cat > supabase/migrations/$(date +%Y%m%d%H%M%S)_add_sentiment_to_entries.sql << 'EOF'
-- Add sentiment analysis columns to entries table
ALTER TABLE entries
ADD COLUMN IF NOT EXISTS sentiment_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS sentiment_label TEXT;

-- Create index for sentiment queries
CREATE INDEX IF NOT EXISTS idx_entries_sentiment_score ON entries(sentiment_score);
CREATE INDEX IF NOT EXISTS idx_entries_sentiment_label ON entries(sentiment_label);

-- Add constraints
ALTER TABLE entries
ADD CONSTRAINT entries_sentiment_score_range
  CHECK (sentiment_score IS NULL OR (sentiment_score >= -1 AND sentiment_score <= 1));

ALTER TABLE entries
ADD CONSTRAINT entries_sentiment_label_valid
  CHECK (sentiment_label IS NULL OR sentiment_label IN ('positive', 'neutral', 'negative'));

COMMENT ON COLUMN entries.sentiment_score IS 'AI sentiment score from -1 (very negative) to 1 (very positive)';
COMMENT ON COLUMN entries.sentiment_label IS 'AI sentiment label: positive, neutral, or negative';
EOF
```

### 2.2 Create Rate Limiting Table

```bash
cat > supabase/migrations/$(date +%Y%m%d%H%M%S)_create_ai_rate_limits.sql << 'EOF'
-- Rate limiting table for AI requests
CREATE TABLE IF NOT EXISTS ai_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_ai_rate_limits_user_endpoint
ON ai_rate_limits(user_id, endpoint, window_start);

-- RLS
ALTER TABLE ai_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only allow service role to manage rate limits
CREATE POLICY "Service role manages rate limits"
ON ai_rate_limits FOR ALL
USING (false)
WITH CHECK (false);
EOF
```

### 2.3 Update ai_insights Table Policies

```bash
cat > supabase/migrations/$(date +%Y%m%d%H%M%S)_update_ai_insights_policies.sql << 'EOF'
-- Allow users to insert their own insights (for caching)
DROP POLICY IF EXISTS "Users can insert their own insights" ON ai_insights;
CREATE POLICY "Users can insert their own insights"
    ON ai_insights FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own insights
DROP POLICY IF EXISTS "Users can delete their own insights" ON ai_insights;
CREATE POLICY "Users can delete their own insights"
    ON ai_insights FOR DELETE
    USING (auth.uid() = user_id);
EOF
```

### 2.4 Apply Migrations

```bash
npx supabase db push
```

---

## Step 3: Sentiment Analysis Edge Function (45 minutes)

### 3.1 Create Shared Utilities

```bash
mkdir -p supabase/functions/_shared
cat > supabase/functions/_shared/cors.ts << 'EOF'
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
EOF
```

```bash
cat > supabase/functions/_shared/supabase.ts << 'EOF'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export function createSupabaseClient(authHeader: string) {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: authHeader },
      },
    }
  );
}

export function createSupabaseServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}
EOF
```

```bash
cat > supabase/functions/_shared/rate-limit.ts << 'EOF'
import { createSupabaseServiceClient } from './supabase.ts';

interface RateLimitConfig {
  maxRequests: number;
  windowMinutes: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  'analyze-sentiment': { maxRequests: 20, windowMinutes: 60 },
  'generate-summary': { maxRequests: 10, windowMinutes: 60 },
};

export async function checkRateLimit(
  userId: string,
  endpoint: string
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const config = RATE_LIMITS[endpoint] || { maxRequests: 10, windowMinutes: 60 };
  const supabase = createSupabaseServiceClient();

  const windowStart = new Date();
  windowStart.setMinutes(windowStart.getMinutes() - config.windowMinutes);

  // Count requests in current window
  const { count, error } = await supabase
    .from('ai_rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
    .gte('window_start', windowStart.toISOString());

  if (error) {
    console.error('Rate limit check failed:', error);
    // Allow request if rate limit check fails (fail open)
    return { allowed: true, remaining: config.maxRequests, resetAt: new Date() };
  }

  const currentCount = count || 0;
  const allowed = currentCount < config.maxRequests;

  if (allowed) {
    // Log this request
    await supabase.from('ai_rate_limits').insert({
      user_id: userId,
      endpoint,
      window_start: new Date().toISOString(),
    });
  }

  const resetAt = new Date();
  resetAt.setMinutes(resetAt.getMinutes() + config.windowMinutes);

  return {
    allowed,
    remaining: Math.max(0, config.maxRequests - currentCount - 1),
    resetAt,
  };
}
EOF
```

### 3.2 Create Sentiment Analysis Function

```bash
cat > supabase/functions/analyze-sentiment/index.ts << 'EOF'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';
import { checkRateLimit } from '../_shared/rate-limit.ts';

interface SentimentResult {
  score: number;
  label: 'positive' | 'neutral' | 'negative';
  confidence: number;
  emotions: string[];
}

const SENTIMENT_PROMPT = `Analyze the emotional tone of this journal entry and return ONLY a JSON object with this exact format (no markdown, no explanation):

{
  "score": <number between -1 (very negative) and 1 (very positive)>,
  "label": "<positive|neutral|negative>",
  "confidence": <number between 0 and 1>,
  "emotions": ["<emotion1>", "<emotion2>"]
}

Journal entry:
`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user context
    const supabase = createSupabaseClient(authHeader);

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(user.id, 'analyze-sentiment');
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          resetAt: rateLimit.resetAt,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetAt.toISOString(),
          }
        }
      );
    }

    // Get request body
    const { entryId } = await req.json();
    if (!entryId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Entry ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch entry (RLS ensures user can only access their own)
    const { data: entry, error: entryError } = await supabase
      .from('entries')
      .select('id, content, sentiment_score, sentiment_label')
      .eq('id', entryId)
      .single();

    if (entryError || !entry) {
      return new Response(
        JSON.stringify({ success: false, error: 'Entry not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return cached result if exists
    if (entry.sentiment_score !== null && entry.sentiment_label !== null) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            score: entry.sentiment_score,
            label: entry.sentiment_label,
            cached: true,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call OpenAI
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Truncate long content
    const truncatedContent = entry.content.substring(0, 2000);

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a sentiment analysis expert. Return ONLY valid JSON, no markdown formatting.',
          },
          {
            role: 'user',
            content: SENTIMENT_PROMPT + truncatedContent,
          },
        ],
        temperature: 0.2,
        max_tokens: 200,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error('OpenAI error:', errorData);

      if (openaiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI service rate limited. Please try again later.' }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: 'AI analysis failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiData = await openaiResponse.json();
    const responseText = openaiData.choices[0]?.message?.content || '';

    // Parse response
    let sentiment: SentimentResult;
    try {
      const cleanedResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      sentiment = JSON.parse(cleanedResponse);

      // Validate response
      if (
        typeof sentiment.score !== 'number' ||
        sentiment.score < -1 ||
        sentiment.score > 1 ||
        !['positive', 'neutral', 'negative'].includes(sentiment.label)
      ) {
        throw new Error('Invalid sentiment response format');
      }
    } catch (parseError) {
      console.error('Failed to parse sentiment response:', responseText);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update entry with sentiment
    const { error: updateError } = await supabase
      .from('entries')
      .update({
        sentiment_score: sentiment.score,
        sentiment_label: sentiment.label,
      })
      .eq('id', entryId);

    if (updateError) {
      console.error('Failed to update entry:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          score: sentiment.score,
          label: sentiment.label,
          confidence: sentiment.confidence,
          emotions: sentiment.emotions,
          cached: false,
        },
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        }
      }
    );
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
EOF
```

---

## Step 4: Summary Generation Edge Function (45 minutes)

### 4.1 Create Summary Function

```bash
cat > supabase/functions/generate-summary/index.ts << 'EOF'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';
import { checkRateLimit } from '../_shared/rate-limit.ts';

interface SummaryResult {
  summary: string;
  keyThemes: string[];
  overallMood: string;
  insights: string[];
  entryCount: number;
}

const DAILY_SUMMARY_PROMPT = `Analyze these journal entries from today and provide a thoughtful summary.

Return ONLY a JSON object (no markdown formatting):
{
  "summary": "<2-3 sentence overview of the day>",
  "keyThemes": ["<theme1>", "<theme2>", "<theme3>"],
  "overallMood": "<overall emotional tone>",
  "insights": ["<insight1>", "<insight2>"]
}

Entries:
`;

const WEEKLY_SUMMARY_PROMPT = `Analyze these journal entries from the past week and provide insights.

Return ONLY a JSON object (no markdown formatting):
{
  "summary": "<3-4 sentence overview of the week>",
  "keyThemes": ["<theme1>", "<theme2>", "<theme3>"],
  "overallMood": "<overall emotional trajectory>",
  "insights": ["<pattern1>", "<pattern2>", "<growth observation>"]
}

Entries:
`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user context
    const supabase = createSupabaseClient(authHeader);

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(user.id, 'generate-summary');
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          resetAt: rateLimit.resetAt,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetAt.toISOString(),
          }
        }
      );
    }

    // Get request body
    const { type = 'daily', date } = await req.json();
    const targetDate = date ? new Date(date) : new Date();

    // Calculate date range
    let startDate: Date;
    let endDate: Date;
    let insightType: string;
    let prompt: string;

    if (type === 'weekly') {
      startDate = new Date(targetDate);
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(targetDate);
      endDate.setHours(23, 59, 59, 999);
      insightType = 'weekly_summary';
      prompt = WEEKLY_SUMMARY_PROMPT;
    } else {
      startDate = new Date(targetDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(targetDate);
      endDate.setHours(23, 59, 59, 999);
      insightType = 'daily_summary';
      prompt = DAILY_SUMMARY_PROMPT;
    }

    // Check cache first
    const { data: cachedInsight } = await supabase
      .from('ai_insights')
      .select('content, created_at')
      .eq('user_id', user.id)
      .eq('insight_type', insightType)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Return cached result if less than 6 hours old
    if (cachedInsight) {
      const cacheAge = Date.now() - new Date(cachedInsight.created_at).getTime();
      const sixHours = 6 * 60 * 60 * 1000;

      if (cacheAge < sixHours) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              ...cachedInsight.content,
              cached: true,
              cachedAt: cachedInsight.created_at,
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch entries for date range
    const { data: entries, error: entriesError } = await supabase
      .from('entries')
      .select('content, created_at, mood, sentiment_score')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true });

    if (entriesError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch entries' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!entries || entries.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: `No entries found for this ${type === 'weekly' ? 'week' : 'day'}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format entries for prompt
    let formattedEntries: string;

    if (type === 'weekly') {
      // Group by day for weekly
      const entriesByDay: Record<string, typeof entries> = {};
      entries.forEach((entry) => {
        const day = new Date(entry.created_at).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        });
        if (!entriesByDay[day]) entriesByDay[day] = [];
        entriesByDay[day].push(entry);
      });

      formattedEntries = Object.entries(entriesByDay)
        .map(([day, dayEntries]) => {
          const dayContent = dayEntries.map((e, i) => {
            const mood = e.mood ? ` [Mood: ${e.mood}]` : '';
            const sentiment = e.sentiment_score ? ` [Sentiment: ${e.sentiment_score.toFixed(2)}]` : '';
            return `  ${i + 1}. ${e.content.substring(0, 200)}${mood}${sentiment}`;
          }).join('\n');
          return `${day} (${dayEntries.length} ${dayEntries.length === 1 ? 'entry' : 'entries'}):\n${dayContent}`;
        })
        .join('\n\n---\n\n');
    } else {
      // Simple list for daily
      formattedEntries = entries
        .map((entry, index) => {
          const time = new Date(entry.created_at).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          });
          const mood = entry.mood ? ` [Mood: ${entry.mood}]` : '';
          return `Entry ${index + 1} (${time})${mood}:\n${entry.content}`;
        })
        .join('\n\n---\n\n');
    }

    // Call OpenAI
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a thoughtful journal analysis assistant. Return ONLY valid JSON.',
          },
          {
            role: 'user',
            content: prompt + formattedEntries,
          },
        ],
        temperature: 0.5,
        max_tokens: type === 'weekly' ? 600 : 500,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error('OpenAI error:', errorData);
      return new Response(
        JSON.stringify({ success: false, error: 'AI analysis failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiData = await openaiResponse.json();
    const responseText = openaiData.choices[0]?.message?.content || '';

    // Parse response
    let summary: SummaryResult;
    try {
      const cleanedResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      summary = JSON.parse(cleanedResponse);
      summary.entryCount = entries.length;
    } catch (parseError) {
      console.error('Failed to parse summary response:', responseText);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cache the result
    await supabase.from('ai_insights').insert({
      user_id: user.id,
      insight_type: insightType,
      content: summary,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...summary,
          cached: false,
        },
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        }
      }
    );
  } catch (error) {
    console.error('Summary generation error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
EOF
```

### 4.2 Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy analyze-sentiment
supabase functions deploy generate-summary

# Or deploy all at once
supabase functions deploy
```

---

## Step 5: Frontend Types and Service (30 minutes)

### 5.1 Create AI Types

```bash
cat > mobile/src/types/ai.types.ts << 'EOF'
export interface SentimentAnalysis {
  score: number;
  label: 'positive' | 'neutral' | 'negative';
  confidence?: number;
  emotions?: string[];
  cached?: boolean;
}

export interface Summary {
  summary: string;
  keyThemes: string[];
  overallMood: string;
  insights: string[];
  entryCount: number;
  cached?: boolean;
  cachedAt?: string;
}

export interface AIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  resetAt?: string;
}
EOF
```

### 5.2 Create AI Service

```bash
cat > mobile/src/services/ai.service.ts << 'EOF'
/**
 * AI Service
 * Handles calls to Supabase Edge Functions for AI features
 *
 * Important Notes:
 * - Uses supabase.functions.invoke() for secure Edge Function calls
 * - Auth token is automatically included
 * - Rate limiting is handled server-side
 */

import { supabase } from './supabase';
import type { SentimentAnalysis, Summary, AIResponse } from '../types/ai.types';

/**
 * Analyze sentiment for a journal entry
 * @param entryId - The entry UUID to analyze
 */
export async function analyzeSentiment(entryId: string): Promise<SentimentAnalysis> {
  const { data, error } = await supabase.functions.invoke<AIResponse<SentimentAnalysis>>(
    'analyze-sentiment',
    {
      body: { entryId },
    }
  );

  if (error) {
    console.error('Sentiment analysis error:', error);
    throw new Error(error.message || 'Failed to analyze sentiment');
  }

  if (!data?.success || !data.data) {
    throw new Error(data?.error || 'Failed to analyze sentiment');
  }

  return data.data;
}

/**
 * Generate daily summary
 * @param date - Optional date for the summary (defaults to today)
 */
export async function generateDailySummary(date?: Date): Promise<Summary> {
  const { data, error } = await supabase.functions.invoke<AIResponse<Summary>>(
    'generate-summary',
    {
      body: {
        type: 'daily',
        date: date?.toISOString(),
      },
    }
  );

  if (error) {
    console.error('Daily summary error:', error);
    throw new Error(error.message || 'Failed to generate daily summary');
  }

  if (!data?.success || !data.data) {
    throw new Error(data?.error || 'Failed to generate daily summary');
  }

  return data.data;
}

/**
 * Generate weekly summary
 * @param endDate - Optional end date for the week (defaults to today)
 */
export async function generateWeeklySummary(endDate?: Date): Promise<Summary> {
  const { data, error } = await supabase.functions.invoke<AIResponse<Summary>>(
    'generate-summary',
    {
      body: {
        type: 'weekly',
        date: endDate?.toISOString(),
      },
    }
  );

  if (error) {
    console.error('Weekly summary error:', error);
    throw new Error(error.message || 'Failed to generate weekly summary');
  }

  if (!data?.success || !data.data) {
    throw new Error(data?.error || 'Failed to generate weekly summary');
  }

  return data.data;
}
EOF
```

### 5.3 Export Types

```bash
# Add to mobile/src/types/index.ts
echo "export * from './ai.types';" >> mobile/src/types/index.ts
```

---

## Step 6: Sentiment Badge Component (15 minutes)

### 6.1 Create Component

```bash
mkdir -p mobile/src/components/ai
cat > mobile/src/components/ai/SentimentBadge.tsx << 'EOF'
import React from 'react';
import { IonBadge, IonIcon } from '@ionic/react';
import { happyOutline, sadOutline, removeOutline } from 'ionicons/icons';
import type { SentimentAnalysis } from '../../types/ai.types';
import './SentimentBadge.css';

interface SentimentBadgeProps {
  sentiment: Pick<SentimentAnalysis, 'score' | 'label'>;
  showScore?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const SentimentBadge: React.FC<SentimentBadgeProps> = ({
  sentiment,
  showScore = true,
  size = 'medium',
}) => {
  const { score, label } = sentiment;

  const getIcon = () => {
    switch (label) {
      case 'positive': return happyOutline;
      case 'negative': return sadOutline;
      default: return removeOutline;
    }
  };

  const getColor = () => {
    switch (label) {
      case 'positive': return 'success';
      case 'negative': return 'danger';
      default: return 'medium';
    }
  };

  const formatScore = (s: number) => {
    return s > 0 ? `+${s.toFixed(2)}` : s.toFixed(2);
  };

  return (
    <IonBadge color={getColor()} className={`sentiment-badge sentiment-badge--${size}`}>
      <IonIcon icon={getIcon()} />
      <span className="sentiment-badge__label">{label}</span>
      {showScore && <span className="sentiment-badge__score">({formatScore(score)})</span>}
    </IonBadge>
  );
};
EOF
```

### 6.2 Create Styles

```bash
cat > mobile/src/components/ai/SentimentBadge.css << 'EOF'
.sentiment-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 12px;
  font-weight: 500;
  text-transform: capitalize;
}

.sentiment-badge--small {
  font-size: 11px;
  padding: 3px 8px;
}

.sentiment-badge--medium {
  font-size: 13px;
  padding: 4px 10px;
}

.sentiment-badge--large {
  font-size: 15px;
  padding: 6px 12px;
}

.sentiment-badge__label {
  margin-left: 2px;
}

.sentiment-badge__score {
  opacity: 0.8;
  font-size: 0.9em;
}
EOF
```

---

## Step 7: AI Summaries Page (30 minutes)

### 7.1 Create Page

```bash
mkdir -p mobile/src/pages/ai
cat > mobile/src/pages/ai/SummariesPage.tsx << 'EOF'
import React, { useState } from 'react';
import {
  IonContent,
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonSpinner,
  IonIcon,
  IonText,
  IonList,
  IonItem,
  IonChip,
  useIonToast,
} from '@ionic/react';
import { sparklesOutline, refreshOutline, timeOutline } from 'ionicons/icons';
import { format } from 'date-fns';
import { generateDailySummary, generateWeeklySummary } from '../../services/ai.service';
import type { Summary } from '../../types/ai.types';
import './SummariesPage.css';

type SummaryType = 'daily' | 'weekly';

const SummariesPage: React.FC = () => {
  const [summaryType, setSummaryType] = useState<SummaryType>('daily');
  const [dailySummary, setDailySummary] = useState<Summary | null>(null);
  const [weeklySummary, setWeeklySummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [present] = useIonToast();

  const currentSummary = summaryType === 'daily' ? dailySummary : weeklySummary;

  const handleGenerateSummary = async () => {
    setLoading(true);

    try {
      if (summaryType === 'daily') {
        const summary = await generateDailySummary();
        setDailySummary(summary);
      } else {
        const summary = await generateWeeklySummary();
        setWeeklySummary(summary);
      }

      present({
        message: 'Summary generated successfully!',
        duration: 2000,
        color: 'success',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate summary';
      present({
        message,
        duration: 3000,
        color: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderEmptyState = () => (
    <div className="summaries-empty">
      <IonIcon icon={sparklesOutline} className="summaries-empty__icon" />
      <IonText color="medium">
        <h2>No Summary Yet</h2>
        <p>Generate a {summaryType} summary to see AI insights about your journal entries</p>
      </IonText>
      <IonButton onClick={handleGenerateSummary} disabled={loading}>
        {loading ? <IonSpinner name="crescent" /> : 'Generate Summary'}
      </IonButton>
    </div>
  );

  const renderSummary = (summary: Summary) => (
    <div className="summaries-content">
      <div className="summaries-header">
        <div>
          <h2>{summaryType === 'daily' ? 'Daily Summary' : 'Weekly Summary'}</h2>
          {summary.cached && summary.cachedAt && (
            <IonText color="medium" className="summaries-cached">
              <IonIcon icon={timeOutline} />
              <span>Cached {format(new Date(summary.cachedAt), 'MMM d, h:mm a')}</span>
            </IonText>
          )}
        </div>
        <IonButton fill="clear" onClick={handleGenerateSummary} disabled={loading}>
          {loading ? <IonSpinner name="crescent" /> : <IonIcon slot="icon-only" icon={refreshOutline} />}
        </IonButton>
      </div>

      <IonCard>
        <IonCardHeader>
          <IonCardTitle>Overview</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <p className="summaries-text">{summary.summary}</p>
          <IonText color="medium" className="summaries-meta">
            Based on {summary.entryCount} {summary.entryCount === 1 ? 'entry' : 'entries'}
          </IonText>
        </IonCardContent>
      </IonCard>

      <IonCard>
        <IonCardHeader>
          <IonCardTitle>Overall Mood</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <IonChip color="primary">
            <IonLabel>{summary.overallMood}</IonLabel>
          </IonChip>
        </IonCardContent>
      </IonCard>

      {summary.keyThemes?.length > 0 && (
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Key Themes</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <div className="summaries-themes">
              {summary.keyThemes.map((theme, index) => (
                <IonChip key={index} outline>
                  <IonLabel>{theme}</IonLabel>
                </IonChip>
              ))}
            </div>
          </IonCardContent>
        </IonCard>
      )}

      {summary.insights?.length > 0 && (
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Insights</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonList lines="none">
              {summary.insights.map((insight, index) => (
                <IonItem key={index}>
                  <IonLabel className="ion-text-wrap">
                    <p>{insight}</p>
                  </IonLabel>
                </IonItem>
              ))}
            </IonList>
          </IonCardContent>
        </IonCard>
      )}
    </div>
  );

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/entries" />
          </IonButtons>
          <IonTitle>AI Summaries</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div className="summaries-page">
          <IonSegment
            value={summaryType}
            onIonChange={(e) => setSummaryType(e.detail.value as SummaryType)}
          >
            <IonSegmentButton value="daily">
              <IonLabel>Daily</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="weekly">
              <IonLabel>Weekly</IonLabel>
            </IonSegmentButton>
          </IonSegment>

          {currentSummary ? renderSummary(currentSummary) : renderEmptyState()}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default SummariesPage;
EOF
```

### 7.2 Create Styles

```bash
cat > mobile/src/pages/ai/SummariesPage.css << 'EOF'
.summaries-page {
  padding: 16px;
}

.summaries-page ion-segment {
  margin-bottom: 24px;
}

.summaries-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 20px;
  min-height: 50vh;
  gap: 16px;
}

.summaries-empty__icon {
  font-size: 64px;
  color: var(--ion-color-primary);
  margin-bottom: 16px;
}

.summaries-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summaries-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.summaries-header h2 {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
}

.summaries-cached {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  margin-top: 4px;
}

.summaries-text {
  line-height: 1.6;
  font-size: 16px;
  margin: 0;
}

.summaries-meta {
  display: block;
  margin-top: 12px;
  font-size: 13px;
}

.summaries-themes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
EOF
```

---

## Step 8: Update App Routing (10 minutes)

### 8.1 Add Route

Add to `mobile/src/App.tsx`:

```typescript
import SummariesPage from './pages/ai/SummariesPage';

// Inside your routes (within ProtectedRoute if using auth)
<Route exact path="/summaries">
  <SummariesPage />
</Route>
```

### 8.2 Add Navigation Link

Add a button to your entry list or profile page:

```typescript
import { sparklesOutline } from 'ionicons/icons';

<IonButton routerLink="/summaries" fill="clear">
  <IonIcon slot="start" icon={sparklesOutline} />
  AI Summaries
</IonButton>
```

---

## Step 9: Testing (30 minutes)

### 9.1 Unit Tests for AI Service

```bash
cat > mobile/src/services/__tests__/ai.service.test.ts << 'EOF'
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeSentiment, generateDailySummary, generateWeeklySummary } from '../ai.service';
import { supabase } from '../supabase';

vi.mock('../supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('AI Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('analyzeSentiment', () => {
    it('should return sentiment analysis for an entry', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            score: 0.8,
            label: 'positive',
            confidence: 0.9,
            emotions: ['happy', 'grateful'],
          },
        },
        error: null,
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue(mockResponse);

      const result = await analyzeSentiment('test-entry-id');

      expect(result.score).toBe(0.8);
      expect(result.label).toBe('positive');
      expect(supabase.functions.invoke).toHaveBeenCalledWith('analyze-sentiment', {
        body: { entryId: 'test-entry-id' },
      });
    });

    it('should throw error when API fails', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { success: false, error: 'Rate limit exceeded' },
        error: null,
      });

      await expect(analyzeSentiment('test-id')).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('generateDailySummary', () => {
    it('should return daily summary', async () => {
      const mockSummary = {
        summary: 'A productive day...',
        keyThemes: ['work', 'exercise'],
        overallMood: 'positive',
        insights: ['Great focus today'],
        entryCount: 3,
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { success: true, data: mockSummary },
        error: null,
      });

      const result = await generateDailySummary();

      expect(result.summary).toBe('A productive day...');
      expect(result.entryCount).toBe(3);
    });
  });

  describe('generateWeeklySummary', () => {
    it('should return weekly summary', async () => {
      const mockSummary = {
        summary: 'A week of growth...',
        keyThemes: ['progress', 'challenges'],
        overallMood: 'improving',
        insights: ['Consistent improvement'],
        entryCount: 15,
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { success: true, data: mockSummary },
        error: null,
      });

      const result = await generateWeeklySummary();

      expect(result.summary).toBe('A week of growth...');
      expect(result.entryCount).toBe(15);
    });
  });
});
EOF
```

### 9.2 E2E Tests

```bash
cat > mobile/cypress/e2e/ai-summaries.cy.ts << 'EOF'
describe('AI Summaries', () => {
  beforeEach(() => {
    // Login with test user
    cy.visit('/login');
    cy.get('input[type="email"]').type(Cypress.env('TEST_USER_EMAIL'));
    cy.get('input[type="password"]').type(Cypress.env('TEST_USER_PASSWORD'));
    cy.contains('button', 'Login').click();
    cy.url().should('include', '/entries');
  });

  it('should navigate to summaries page', () => {
    cy.visit('/summaries');
    cy.contains('AI Summaries').should('be.visible');
    cy.contains('No Summary Yet').should('be.visible');
  });

  it('should switch between daily and weekly tabs', () => {
    cy.visit('/summaries');

    // Default is daily
    cy.get('ion-segment-button[value="daily"]').should('have.class', 'segment-button-checked');

    // Switch to weekly
    cy.get('ion-segment-button[value="weekly"]').click();
    cy.get('ion-segment-button[value="weekly"]').should('have.class', 'segment-button-checked');
  });

  it('should show error when no entries exist', () => {
    cy.visit('/summaries');
    cy.contains('Generate Summary').click();

    // Should show error for no entries (or success if entries exist)
    cy.get('ion-toast', { timeout: 10000 }).should('be.visible');
  });
});
EOF
```

### 9.3 Run Tests

```bash
cd mobile

# Unit tests
npm run test.unit

# E2E tests (ensure app is running)
npm run test.e2e
```

---

## Step 10: Manual Testing Checklist (20 minutes)

### 10.1 Test Sentiment Analysis

1. Create a new entry with positive content
2. Open the entry detail page
3. Trigger sentiment analysis (add button or auto-analyze)
4. Verify sentiment badge appears with correct label
5. Create an entry with negative content
6. Verify negative sentiment is detected

### 10.2 Test Daily Summary

1. Create 2-3 entries today
2. Navigate to `/summaries`
3. Click "Generate Summary"
4. Verify summary generates in < 15 seconds
5. Verify key themes, mood, and insights display
6. Generate again - should return cached result

### 10.3 Test Weekly Summary

1. Have entries from past 7 days (or create test data)
2. Switch to "Weekly" tab
3. Generate weekly summary
4. Verify it includes multi-day insights
5. Verify entry count is correct

### 10.4 Test Rate Limiting

```bash
# In browser console or via curl, trigger many requests
# After 20 sentiment or 10 summary requests in 1 hour, should see rate limit error
```

### 10.5 Test Error Handling

1. Disconnect network and try to generate summary
2. Verify user-friendly error message appears
3. Reconnect and verify functionality resumes

---

## Step 11: Quality Gates Checklist

### Functional Requirements

- [ ] Sentiment analysis runs and returns valid scores
- [ ] Sentiment scores are stored in entries table
- [ ] Daily summaries generate correctly
- [ ] Weekly summaries generate correctly
- [ ] Results are cached (6 hours for summaries)
- [ ] Rate limiting prevents abuse
- [ ] UI displays AI insights clearly
- [ ] Errors show user-friendly messages

### Technical Requirements

- [ ] Edge Functions deploy successfully
- [ ] OpenAI API key stored securely in Supabase Secrets
- [ ] TypeScript compiles without errors (`npx tsc --noEmit`)
- [ ] ESLint passes (`npm run lint`)
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Build succeeds (`npm run build`)

### Security & Cost Requirements

- [ ] API keys are NOT exposed to frontend
- [ ] Rate limiting is enforced per user
- [ ] Users can only analyze their own entries (RLS)
- [ ] Long content is truncated (2000 chars)
- [ ] Response tokens are limited
- [ ] Caching reduces redundant API calls

---

## Troubleshooting

### Issue: Edge Function deployment fails

```bash
# Check Supabase CLI is logged in
supabase login

# Check function logs
supabase functions logs analyze-sentiment

# Verify secrets are set
supabase secrets list
```

### Issue: "AI service not configured" error

```bash
# Verify OPENAI_API_KEY is set
supabase secrets list

# Re-set the secret
supabase secrets set OPENAI_API_KEY=sk-your-key-here
```

### Issue: Rate limit errors during testing

```sql
-- Clear rate limits for testing (run in Supabase SQL Editor)
DELETE FROM ai_rate_limits WHERE user_id = 'your-user-id';
```

### Issue: Summaries are low quality

- Adjust temperature (lower = more focused)
- Improve prompts with more context
- Increase max_tokens for longer summaries
- Ensure entries have enough content

### Issue: CORS errors

```bash
# Verify CORS headers in Edge Function
# Check that corsHeaders are returned in all responses
```

---

## Cost Estimation

**GPT-3.5-turbo pricing (as of 2024):**
- Input: $0.0005 / 1K tokens
- Output: $0.0015 / 1K tokens

**Per-request estimates:**
- Sentiment analysis: ~$0.001-0.002
- Daily summary: ~$0.002-0.004
- Weekly summary: ~$0.003-0.006

**Monthly cost for active user (20 analyses, 10 summaries):**
- ~$0.05-0.10 per user per month

**Rate limits provide cost ceiling:**
- Max 20 sentiment + 10 summaries per hour per user
- Worst case: ~$0.08/hour/user

---

## Next Steps

**Phase 6 Complete! MVP DONE!**

You now have a complete MVP with:
- User authentication
- Journal CRUD operations
- Mood tracking
- Search & filtering
- **AI sentiment analysis**
- **AI-generated summaries**

**Ready for Production or Post-MVP Features:**
- Deploy to production (Supabase handles Edge Functions hosting)
- Add advanced AI insights (Phase 7)
- Implement offline mode (Phase 8)
- Add media support (Phase 9)

---

## Summary

**Time Estimate:** 4-5 hours
**Complexity:** Complex
**Prerequisites:** Phases 1-5 complete, OpenAI API key

**Deliverables:**
- Supabase Edge Functions for AI (analyze-sentiment, generate-summary)
- Database migrations for sentiment columns
- Frontend AI service using supabase.functions.invoke()
- Sentiment badge component
- AI Summaries page
- Rate limiting and caching
- Unit and E2E tests
