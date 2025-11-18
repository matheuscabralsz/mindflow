# Phase 6: Basic AI Integration (Sentiment & Summaries) - Detailed Implementation Guide

## Overview

**Goal:** Integrate OpenAI API for sentiment analysis on journal entries and generation of daily/weekly summaries with proper rate limiting, caching, and cost control.

**Time Estimate:** 5-6 hours

**Prerequisites:**
- Phase 1 complete (Foundation & Infrastructure)
- Phase 2 complete (User Authentication)
- Phase 3 complete (Core Journal CRUD)
- OpenAI API key available
- `ai_insights` table exists in database

**What You'll Have At The End:**
- Automatic sentiment analysis on new entries
- Manual and scheduled summary generation
- Daily and weekly summary views
- Sentiment display on entries
- Rate limiting to control API costs
- Response caching to avoid redundant calls
- Error handling for AI failures
- Critical path tests

---

## Step 1: OpenAI Setup (10 minutes)

### 1.1 Install OpenAI SDK

```bash
# Backend
cd backend
npm install openai

# Frontend (for types)
cd ../mobile
npm install openai --save-dev
```

### 1.2 Add OpenAI API Key to Backend .env

```bash
# backend/.env
cat >> backend/.env << 'EOF'

# OpenAI Configuration
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_MAX_TOKENS=500
OPENAI_TEMPERATURE=0.3
EOF
```

### 1.3 Update Backend env.ts

```bash
# backend/src/config/env.ts
cat >> backend/src/config/env.ts << 'EOF'

export const OPENAI_CONFIG = {
  apiKey: process.env.OPENAI_API_KEY || '',
  model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
  maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '500', 10),
  temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.3'),
};

if (!OPENAI_CONFIG.apiKey) {
  console.warn('Warning: OPENAI_API_KEY not set. AI features will be disabled.');
}
EOF
```

---

## Step 2: Database Schema for AI Insights (10 minutes)

### 2.1 Verify AI Insights Table

```bash
# Check supabase/schemas/03_ai_insights.sql
cat supabase/schemas/03_ai_insights.sql

# Should have ai_insights table with:
# - id, entry_id, user_id
# - sentiment_score, sentiment_label
# - summary, key_themes
# - created_at
```

### 2.2 Add Sentiment to Entries Table

First, create a schema file for the sentiment columns:

```bash
# Create schema file for sentiment columns
cat > supabase/schemas/05_sentiment_columns.sql << 'EOF'
-- Add sentiment analysis columns to entries table

ALTER TABLE entries
ADD COLUMN IF NOT EXISTS sentiment_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS sentiment_label TEXT;

-- Create index for sentiment queries
CREATE INDEX IF NOT EXISTS idx_entries_sentiment ON entries(sentiment_score);

COMMENT ON COLUMN entries.sentiment_score IS 'AI sentiment score from -1 (negative) to 1 (positive)';
COMMENT ON COLUMN entries.sentiment_label IS 'AI sentiment label: positive, neutral, or negative';
EOF
```

Then generate and apply the migration:

```bash
# Generate migration from schema changes
cd /home/mack/my_workspace/mindflow
npx supabase db diff --schema public -f add_sentiment_columns_to_entries

# Review the generated migration
cat supabase/migrations/*_add_sentiment_columns_to_entries.sql

# Apply the migration
npx supabase db push

# Alternative: Run directly in Supabase Dashboard SQL Editor
# (Copy the SQL from supabase/schemas/05_sentiment_columns.sql)
```

---

## Step 3: Backend AI Services (45 minutes)

### 3.1 Create OpenAI Client

```bash
# backend/src/services/ai/openai.client.ts
mkdir -p backend/src/services/ai
cat > backend/src/services/ai/openai.client.ts << 'EOF'
import OpenAI from 'openai';
import { OPENAI_CONFIG } from '../../config/env';

// Initialize OpenAI client
export const openai = OPENAI_CONFIG.apiKey
  ? new OpenAI({ apiKey: OPENAI_CONFIG.apiKey })
  : null;

/**
 * Check if OpenAI is configured
 */
export function isOpenAIConfigured(): boolean {
  return openai !== null;
}

/**
 * Call OpenAI with rate limiting and error handling
 */
export async function callOpenAI(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  if (!openai) {
    throw new Error('OpenAI is not configured');
  }

  try {
    const completion = await openai.chat.completions.create({
      model: options?.model || OPENAI_CONFIG.model,
      messages,
      temperature: options?.temperature || OPENAI_CONFIG.temperature,
      max_tokens: options?.maxTokens || OPENAI_CONFIG.maxTokens,
    });

    return completion.choices[0]?.message?.content || '';
  } catch (error: any) {
    console.error('OpenAI API error:', error);

    if (error.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    if (error.status === 401) {
      throw new Error('Invalid OpenAI API key');
    }

    throw new Error(`OpenAI API error: ${error.message}`);
  }
}
EOF
```

### 3.2 Create Sentiment Analysis Service

```bash
# backend/src/services/ai/sentiment.service.ts
cat > backend/src/services/ai/sentiment.service.ts << 'EOF'
import { callOpenAI, isOpenAIConfigured } from './openai.client';

export interface SentimentResult {
  score: number; // -1 to 1
  label: 'positive' | 'neutral' | 'negative';
  confidence: number; // 0 to 1
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

/**
 * Analyze sentiment of a journal entry
 */
export async function analyzeSentiment(content: string): Promise<SentimentResult> {
  if (!isOpenAIConfigured()) {
    throw new Error('OpenAI is not configured');
  }

  if (!content || content.trim().length === 0) {
    throw new Error('Content cannot be empty');
  }

  // Truncate very long entries
  const truncatedContent = content.substring(0, 2000);

  const response = await callOpenAI([
    {
      role: 'system',
      content: 'You are a sentiment analysis expert. Return ONLY valid JSON, no markdown formatting.',
    },
    {
      role: 'user',
      content: SENTIMENT_PROMPT + truncatedContent,
    },
  ], {
    temperature: 0.2, // Low temperature for consistent results
    maxTokens: 200,
  });

  try {
    // Remove markdown code blocks if present
    const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(cleanedResponse);

    // Validate response
    if (
      typeof result.score !== 'number' ||
      result.score < -1 ||
      result.score > 1 ||
      !['positive', 'neutral', 'negative'].includes(result.label) ||
      !Array.isArray(result.emotions)
    ) {
      throw new Error('Invalid sentiment analysis response');
    }

    return result;
  } catch (error) {
    console.error('Failed to parse sentiment response:', response);
    throw new Error('Failed to parse sentiment analysis result');
  }
}

/**
 * Get sentiment label from score
 */
export function getSentimentLabel(score: number): 'positive' | 'neutral' | 'negative' {
  if (score >= 0.3) return 'positive';
  if (score <= -0.3) return 'negative';
  return 'neutral';
}
EOF
```

### 3.3 Create Summary Generation Service

```bash
# backend/src/services/ai/summary.service.ts
cat > backend/src/services/ai/summary.service.ts << 'EOF'
import { callOpenAI, isOpenAIConfigured } from './openai.client';
import { supabase } from '../../database/supabase';

export interface SummaryResult {
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
  "insights": ["<insight1>", "<insight2>"],
  "entryCount": <number>
}

Entries:
`;

const WEEKLY_SUMMARY_PROMPT = `Analyze these journal entries from the past week and provide insights.

Return ONLY a JSON object (no markdown formatting):
{
  "summary": "<3-4 sentence overview of the week>",
  "keyThemes": ["<theme1>", "<theme2>", "<theme3>"],
  "overallMood": "<overall emotional trajectory>",
  "insights": ["<pattern1>", "<pattern2>", "<growth observation>"],
  "entryCount": <number>
}

Entries:
`;

/**
 * Generate daily summary for a user
 */
export async function generateDailySummary(
  userId: string,
  date: Date = new Date()
): Promise<SummaryResult> {
  if (!isOpenAIConfigured()) {
    throw new Error('OpenAI is not configured');
  }

  // Get entries for the specified day
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const { data: entries, error } = await supabase
    .from('entries')
    .select('content, created_at, mood')
    .eq('user_id', userId)
    .gte('created_at', startOfDay.toISOString())
    .lte('created_at', endOfDay.toISOString())
    .order('created_at', { ascending: true });

  if (error) throw error;

  if (!entries || entries.length === 0) {
    throw new Error('No entries found for this date');
  }

  // Format entries for prompt
  const formattedEntries = entries
    .map((entry, index) => {
      const time = new Date(entry.created_at).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
      const mood = entry.mood ? ` [Mood: ${entry.mood}]` : '';
      return `Entry ${index + 1} (${time})${mood}:\n${entry.content}`;
    })
    .join('\n\n---\n\n');

  const response = await callOpenAI([
    {
      role: 'system',
      content: 'You are a thoughtful journal analysis assistant. Return ONLY valid JSON.',
    },
    {
      role: 'user',
      content: DAILY_SUMMARY_PROMPT + formattedEntries,
    },
  ], {
    temperature: 0.5,
    maxTokens: 500,
  });

  try {
    const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(cleanedResponse);

    return {
      ...result,
      entryCount: entries.length,
    };
  } catch (error) {
    console.error('Failed to parse summary response:', response);
    throw new Error('Failed to parse summary result');
  }
}

/**
 * Generate weekly summary for a user
 */
export async function generateWeeklySummary(
  userId: string,
  endDate: Date = new Date()
): Promise<SummaryResult> {
  if (!isOpenAIConfigured()) {
    throw new Error('OpenAI is not configured');
  }

  // Get entries for the past 7 days
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 7);

  const { data: entries, error } = await supabase
    .from('entries')
    .select('content, created_at, mood, sentiment_score')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: true });

  if (error) throw error;

  if (!entries || entries.length === 0) {
    throw new Error('No entries found for this week');
  }

  // Format entries by day
  const entriesByDay: { [key: string]: typeof entries } = {};
  entries.forEach((entry) => {
    const day = new Date(entry.created_at).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
    if (!entriesByDay[day]) {
      entriesByDay[day] = [];
    }
    entriesByDay[day].push(entry);
  });

  const formattedEntries = Object.entries(entriesByDay)
    .map(([day, dayEntries]) => {
      const dayContent = dayEntries.map((e, i) => {
        const mood = e.mood ? ` [Mood: ${e.mood}]` : '';
        const sentiment = e.sentiment_score ? ` [Sentiment: ${e.sentiment_score.toFixed(2)}]` : '';
        return `  ${i + 1}. ${e.content.substring(0, 200)}${mood}${sentiment}`;
      }).join('\n');

      return `${day} (${dayEntries.length} ${dayEntries.length === 1 ? 'entry' : 'entries'}):\n${dayContent}`;
    })
    .join('\n\n---\n\n');

  const response = await callOpenAI([
    {
      role: 'system',
      content: 'You are a thoughtful journal analysis assistant. Return ONLY valid JSON.',
    },
    {
      role: 'user',
      content: WEEKLY_SUMMARY_PROMPT + formattedEntries,
    },
  ], {
    temperature: 0.5,
    maxTokens: 600,
  });

  try {
    const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(cleanedResponse);

    return {
      ...result,
      entryCount: entries.length,
    };
  } catch (error) {
    console.error('Failed to parse summary response:', response);
    throw new Error('Failed to parse summary result');
  }
}
EOF
```

---

## Step 4: Backend AI Controllers and Routes (30 minutes)

### 4.1 Create AI Controller

```bash
# backend/src/controllers/ai.controller.ts
cat > backend/src/controllers/ai.controller.ts << 'EOF'
import { Request, Response } from 'express';
import { analyzeSentiment } from '../services/ai/sentiment.service';
import { generateDailySummary, generateWeeklySummary } from '../services/ai/summary.service';
import { supabase } from '../database/supabase';

/**
 * POST /ai/analyze-sentiment
 * Analyze sentiment for an entry
 */
export const analyzeSentimentController = async (req: Request, res: Response) => {
  try {
    const { entryId } = req.body;
    const userId = req.user!.id;

    if (!entryId) {
      return res.status(400).json({
        success: false,
        error: 'Entry ID is required',
      });
    }

    // Fetch entry
    const { data: entry, error: fetchError } = await supabase
      .from('entries')
      .select('*')
      .eq('id', entryId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !entry) {
      return res.status(404).json({
        success: false,
        error: 'Entry not found',
      });
    }

    // Analyze sentiment
    const sentiment = await analyzeSentiment(entry.content);

    // Update entry with sentiment
    const { error: updateError } = await supabase
      .from('entries')
      .update({
        sentiment_score: sentiment.score,
        sentiment_label: sentiment.label,
      })
      .eq('id', entryId);

    if (updateError) throw updateError;

    res.json({
      success: true,
      data: sentiment,
    });
  } catch (error: any) {
    console.error('Sentiment analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze sentiment',
    });
  }
};

/**
 * POST /ai/daily-summary
 * Generate daily summary
 */
export const generateDailySummaryController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { date } = req.body;

    const targetDate = date ? new Date(date) : new Date();
    const summary = await generateDailySummary(userId, targetDate);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    console.error('Daily summary error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate daily summary',
    });
  }
};

/**
 * POST /ai/weekly-summary
 * Generate weekly summary
 */
export const generateWeeklySummaryController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { endDate } = req.body;

    const targetDate = endDate ? new Date(endDate) : new Date();
    const summary = await generateWeeklySummary(userId, targetDate);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    console.error('Weekly summary error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate weekly summary',
    });
  }
};
EOF
```

### 4.2 Create AI Routes

```bash
# backend/src/routes/ai.routes.ts
cat > backend/src/routes/ai.routes.ts << 'EOF'
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  analyzeSentimentController,
  generateDailySummaryController,
  generateWeeklySummaryController,
} from '../controllers/ai.controller';

const router = Router();

// All routes require authentication
router.use(requireAuth);

router.post('/analyze-sentiment', analyzeSentimentController);
router.post('/daily-summary', generateDailySummaryController);
router.post('/weekly-summary', generateWeeklySummaryController);

export default router;
EOF
```

### 4.3 Update Routes Index

```bash
# Add to backend/src/routes/index.ts
import aiRoutes from './ai.routes';

router.use('/ai', aiRoutes);
```

---

## Step 5: Rate Limiting Middleware (20 minutes)

### 5.1 Install Rate Limiter

```bash
cd backend
npm install express-rate-limit
```

### 5.2 Create Rate Limit Middleware

```bash
# backend/src/middleware/rateLimit.middleware.ts
cat > backend/src/middleware/rateLimit.middleware.ts << 'EOF'
import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for AI endpoints
 * Limits to 10 requests per 15 minutes per user
 */
export const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: {
    success: false,
    error: 'Too many AI requests. Please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use user ID as key
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
});

/**
 * Rate limiter for sentiment analysis
 * More generous since it's per-entry
 */
export const sentimentRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  message: {
    success: false,
    error: 'Too many sentiment analysis requests. Please slow down.',
  },
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
});
EOF
```

### 5.3 Apply Rate Limiting to AI Routes

```bash
# Update backend/src/routes/ai.routes.ts
import { aiRateLimiter, sentimentRateLimiter } from '../middleware/rateLimit.middleware';

router.post('/analyze-sentiment', sentimentRateLimiter, analyzeSentimentController);
router.post('/daily-summary', aiRateLimiter, generateDailySummaryController);
router.post('/weekly-summary', aiRateLimiter, generateWeeklySummaryController);
```

---

## Step 6: Frontend AI Service (25 minutes)

### 6.1 Create AI Types

```bash
# mobile/src/types/ai.types.ts
cat > mobile/src/types/ai.types.ts << 'EOF'
export interface SentimentAnalysis {
  score: number;
  label: 'positive' | 'neutral' | 'negative';
  confidence: number;
  emotions: string[];
}

export interface Summary {
  summary: string;
  keyThemes: string[];
  overallMood: string;
  insights: string[];
  entryCount: number;
  date?: string;
}

export interface AISummaryState {
  dailySummary: Summary | null;
  weeklySummary: Summary | null;
  loading: boolean;
  error: string | null;
}
EOF
```

### 6.2 Create AI Service

```bash
# mobile/src/services/ai.service.ts
cat > mobile/src/services/ai.service.ts << 'EOF'
import axios from 'axios';
import type { SentimentAnalysis, Summary } from '../types/ai.types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Create axios instance with auth
const createAuthAxios = () => {
  const instance = axios.create({
    baseURL: `${API_URL}/ai`,
  });

  // Add auth token to requests
  instance.interceptors.request.use((config) => {
    // Get token from Supabase session
    const session = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
    const token = session?.currentSession?.access_token;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  });

  return instance;
};

export const aiService = {
  /**
   * Analyze sentiment for an entry
   */
  async analyzeSentiment(entryId: string): Promise<SentimentAnalysis> {
    const api = createAuthAxios();
    const { data } = await api.post('/analyze-sentiment', { entryId });

    if (!data.success) {
      throw new Error(data.error || 'Failed to analyze sentiment');
    }

    return data.data;
  },

  /**
   * Generate daily summary
   */
  async generateDailySummary(date?: Date): Promise<Summary> {
    const api = createAuthAxios();
    const { data } = await api.post('/daily-summary', {
      date: date?.toISOString(),
    });

    if (!data.success) {
      throw new Error(data.error || 'Failed to generate daily summary');
    }

    return data.data;
  },

  /**
   * Generate weekly summary
   */
  async generateWeeklySummary(endDate?: Date): Promise<Summary> {
    const api = createAuthAxios();
    const { data } = await api.post('/weekly-summary', {
      endDate: endDate?.toISOString(),
    });

    if (!data.success) {
      throw new Error(data.error || 'Failed to generate weekly summary');
    }

    return data.data;
  },
};
EOF
```

---

## Step 7: Sentiment Display Components (20 minutes)

### 7.1 Create Sentiment Badge Component

```bash
# mobile/src/components/ai/SentimentBadge.tsx
mkdir -p mobile/src/components/ai
cat > mobile/src/components/ai/SentimentBadge.tsx << 'EOF'
import React from 'react';
import { IonBadge, IonIcon } from '@ionic/react';
import { happyOutline, sadOutline, removeOutline } from 'ionicons/icons';
import './SentimentBadge.css';

interface SentimentBadgeProps {
  score: number;
  label: 'positive' | 'neutral' | 'negative';
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const SentimentBadge: React.FC<SentimentBadgeProps> = ({
  score,
  label,
  showLabel = true,
  size = 'medium',
}) => {
  const getIcon = () => {
    if (label === 'positive') return happyOutline;
    if (label === 'negative') return sadOutline;
    return removeOutline;
  };

  const getColor = () => {
    if (label === 'positive') return 'success';
    if (label === 'negative') return 'danger';
    return 'medium';
  };

  return (
    <IonBadge color={getColor()} className={`sentiment-badge sentiment-badge-${size}`}>
      <IonIcon icon={getIcon()} />
      {showLabel && (
        <span className="sentiment-badge-label">
          {label} ({(score > 0 ? '+' : '') + score.toFixed(2)})
        </span>
      )}
    </IonBadge>
  );
};
EOF
```

### 7.2 Create Sentiment Badge CSS

```bash
# mobile/src/components/ai/SentimentBadge.css
cat > mobile/src/components/ai/SentimentBadge.css << 'EOF'
.sentiment-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 12px;
}

.sentiment-badge-small {
  font-size: 11px;
  padding: 3px 8px;
}

.sentiment-badge-medium {
  font-size: 13px;
  padding: 4px 10px;
}

.sentiment-badge-large {
  font-size: 15px;
  padding: 6px 12px;
}

.sentiment-badge-label {
  text-transform: capitalize;
  font-weight: 500;
}
EOF
```

---

## Step 8: Summaries Page (35 minutes)

### 8.1 Create Summaries Page

```bash
# mobile/src/pages/ai/SummariesPage.tsx
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
  IonToast,
} from '@ionic/react';
import { sparklesOutline, refreshOutline } from 'ionicons/icons';
import { format } from 'date-fns';
import { aiService } from '../../services/ai.service';
import type { Summary } from '../../types/ai.types';
import './SummariesPage.css';

type SummaryType = 'daily' | 'weekly';

const SummariesPage: React.FC = () => {
  const [summaryType, setSummaryType] = useState<SummaryType>('daily');
  const [dailySummary, setDailySummary] = useState<Summary | null>(null);
  const [weeklySummary, setWeeklySummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showToast, setShowToast] = useState(false);

  const handleGenerateSummary = async () => {
    setLoading(true);
    setError('');

    try {
      if (summaryType === 'daily') {
        const summary = await aiService.generateDailySummary();
        setDailySummary({ ...summary, date: new Date().toISOString() });
      } else {
        const summary = await aiService.generateWeeklySummary();
        setWeeklySummary({ ...summary, date: new Date().toISOString() });
      }

      setShowToast(true);
    } catch (err: any) {
      setError(err.message || 'Failed to generate summary');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  const renderSummary = (summary: Summary | null) => {
    if (!summary) {
      return (
        <div className="summary-empty">
          <IonIcon icon={sparklesOutline} className="summary-empty-icon" />
          <IonText color="medium">
            <h2>No Summary Yet</h2>
            <p>Generate a {summaryType} summary to see AI insights</p>
          </IonText>
          <IonButton onClick={handleGenerateSummary} disabled={loading}>
            {loading ? <IonSpinner name="crescent" /> : 'Generate Summary'}
          </IonButton>
        </div>
      );
    }

    return (
      <div className="summary-content">
        <div className="summary-header">
          <div>
            <h2>{summaryType === 'daily' ? 'Daily Summary' : 'Weekly Summary'}</h2>
            {summary.date && (
              <IonText color="medium">
                <p>Generated {format(new Date(summary.date), 'MMM d, yyyy h:mm a')}</p>
              </IonText>
            )}
          </div>
          <IonButton fill="clear" onClick={handleGenerateSummary} disabled={loading}>
            <IonIcon slot="icon-only" icon={refreshOutline} />
          </IonButton>
        </div>

        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Overview</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <p className="summary-text">{summary.summary}</p>
            <div className="summary-meta">
              <IonText color="medium">
                <small>Based on {summary.entryCount} {summary.entryCount === 1 ? 'entry' : 'entries'}</small>
              </IonText>
            </div>
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

        {summary.keyThemes && summary.keyThemes.length > 0 && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Key Themes</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div className="themes-container">
                {summary.keyThemes.map((theme, index) => (
                  <IonChip key={index} outline>
                    <IonLabel>{theme}</IonLabel>
                  </IonChip>
                ))}
              </div>
            </IonCardContent>
          </IonCard>
        )}

        {summary.insights && summary.insights.length > 0 && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Insights</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonList>
                {summary.insights.map((insight, index) => (
                  <IonItem key={index} lines="none">
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
  };

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

          {summaryType === 'daily' && renderSummary(dailySummary)}
          {summaryType === 'weekly' && renderSummary(weeklySummary)}
        </div>

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={error || 'Summary generated successfully!'}
          duration={3000}
          color={error ? 'danger' : 'success'}
        />
      </IonContent>
    </IonPage>
  );
};

export default SummariesPage;
EOF
```

### 8.2 Create Summaries Page CSS

```bash
# mobile/src/pages/ai/SummariesPage.css
cat > mobile/src/pages/ai/SummariesPage.css << 'EOF'
.summaries-page {
  padding: 16px;
}

.summaries-page ion-segment {
  margin-bottom: 24px;
}

.summary-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 20px;
  min-height: 50vh;
  gap: 16px;
}

.summary-empty-icon {
  font-size: 64px;
  color: var(--ion-color-primary);
  margin-bottom: 16px;
}

.summary-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 8px;
}

.summary-header h2 {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
}

.summary-text {
  line-height: 1.6;
  font-size: 16px;
  margin: 0;
}

.summary-meta {
  margin-top: 12px;
}

.themes-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
EOF
```

---

## Step 9: Update App Routing (10 minutes)

### 9.1 Add AI Routes

```bash
# Add to mobile/src/App.tsx
import SummariesPage from './pages/ai/SummariesPage';

<Route exact path="/summaries">
  <ProtectedRoute>
    <SummariesPage />
  </ProtectedRoute>
</Route>
```

### 9.2 Add Summaries Link to Home

```bash
# Add button to navigate to summaries in EntriesListPage or ProfilePage
<IonButton routerLink="/summaries">
  <IonIcon slot="start" icon={sparklesOutline} />
  AI Summaries
</IonButton>
```

---

## Step 10: Testing (30 minutes)

### 10.1 Create AI Service Tests

```bash
# backend/src/services/ai/__tests__/sentiment.service.test.ts
mkdir -p backend/src/services/ai/__tests__
cat > backend/src/services/ai/__tests__/sentiment.service.test.ts << 'EOF'
import { describe, it, expect, vi } from 'vitest';
import { analyzeSentiment, getSentimentLabel } from '../sentiment.service';
import * as openaiClient from '../openai.client';

vi.mock('../openai.client');

describe('Sentiment Service', () => {
  describe('getSentimentLabel', () => {
    it('should return positive for score >= 0.3', () => {
      expect(getSentimentLabel(0.5)).toBe('positive');
      expect(getSentimentLabel(0.3)).toBe('positive');
    });

    it('should return negative for score <= -0.3', () => {
      expect(getSentimentLabel(-0.5)).toBe('negative');
      expect(getSentimentLabel(-0.3)).toBe('negative');
    });

    it('should return neutral for scores between -0.3 and 0.3', () => {
      expect(getSentimentLabel(0)).toBe('neutral');
      expect(getSentimentLabel(0.2)).toBe('neutral');
      expect(getSentimentLabel(-0.2)).toBe('neutral');
    });
  });

  describe('analyzeSentiment', () => {
    it('should analyze positive sentiment', async () => {
      vi.mocked(openaiClient.isOpenAIConfigured).mockReturnValue(true);
      vi.mocked(openaiClient.callOpenAI).mockResolvedValue(
        JSON.stringify({
          score: 0.8,
          label: 'positive',
          confidence: 0.9,
          emotions: ['happy', 'grateful'],
        })
      );

      const result = await analyzeSentiment('I had a wonderful day!');

      expect(result.score).toBe(0.8);
      expect(result.label).toBe('positive');
      expect(result.emotions).toContain('happy');
    });

    it('should throw error for empty content', async () => {
      await expect(analyzeSentiment('')).rejects.toThrow('Content cannot be empty');
    });
  });
});
EOF
```

### 10.2 Create E2E AI Test

```bash
# mobile/cypress/e2e/ai-summaries.cy.ts
cat > mobile/cypress/e2e/ai-summaries.cy.ts << 'EOF'
describe('AI Summaries', () => {
  beforeEach(() => {
    // Login
    cy.visit('/login');
    cy.get('input[type="email"]').type('test@example.com');
    cy.get('input[type="password"]').type('password123');
    cy.contains('button', 'Login').click();
    cy.url().should('include', '/entries');

    // Create test entries
    for (let i = 0; i < 3; i++) {
      cy.get('ion-fab-button').click();
      cy.get('ion-textarea').type(`Test entry ${i + 1} for summary generation`);
      cy.contains('button', 'Save').click();
      cy.wait(1000);
    }
  });

  it('should navigate to summaries page', () => {
    cy.visit('/summaries');
    cy.contains('AI Summaries').should('be.visible');
  });

  it('should generate daily summary', () => {
    cy.visit('/summaries');

    // Generate summary
    cy.contains('Generate Summary').click();

    // Wait for generation (may take a few seconds)
    cy.contains('Overview', { timeout: 15000 }).should('be.visible');
    cy.contains('Key Themes').should('be.visible');
    cy.contains('Insights').should('be.visible');
  });

  it('should switch between daily and weekly summaries', () => {
    cy.visit('/summaries');

    // Switch to weekly
    cy.contains('ion-segment-button', 'Weekly').click();
    cy.contains('No Summary Yet').should('be.visible');

    // Generate weekly summary
    cy.contains('Generate Summary').click();
    cy.contains('Overview', { timeout: 15000 }).should('be.visible');
  });
});
EOF
```

---

## Step 11: Manual Testing Checklist (20 minutes)

### 11.1 Test Sentiment Analysis

```bash
# 1. Create a new entry with positive content
# 2. Call analyzeSentiment API
# 3. Verify sentiment_score and sentiment_label are saved
# 4. Create entry with negative content
# 5. Verify negative sentiment is detected
```

### 11.2 Test Daily Summary

```bash
# 1. Create 3-5 entries today
# 2. Navigate to /summaries
# 3. Click "Generate Summary"
# 4. Verify summary is generated in < 10 seconds
# 5. Verify key themes, mood, and insights are displayed
# 6. Refresh summary and verify it updates
```

### 11.3 Test Weekly Summary

```bash
# 1. Have entries spanning past 7 days
# 2. Navigate to /summaries
# 3. Switch to "Weekly" tab
# 4. Generate weekly summary
# 5. Verify it includes insights across the week
# 6. Verify entry count is correct
```

### 11.4 Test Rate Limiting

```bash
# Test sentiment analysis rate limit
for i in {1..10}; do
  curl -X POST http://localhost:3000/ai/analyze-sentiment \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"entryId\": \"$ENTRY_ID\"}"
done

# 6th request should return rate limit error
```

---

## Step 12: Quality Gates Checklist

### 12.1 Functional Requirements

- [ ] Sentiment analysis runs successfully
- [ ] Sentiment scores are accurate and stored
- [ ] Daily summaries generate correctly
- [ ] Weekly summaries generate correctly
- [ ] AI responses handle errors gracefully
- [ ] Rate limiting prevents abuse
- [ ] UI displays AI insights clearly

### 12.2 Technical Requirements

- [ ] OpenAI API calls succeed
- [ ] Response parsing handles edge cases
- [ ] TypeScript compiles without errors
- [ ] ESLint passes
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] API costs are controlled

### 12.3 Security & Cost Requirements

- [ ] API keys are not exposed to frontend
- [ ] Rate limiting is enforced
- [ ] User can only analyze their own entries
- [ ] Long content is truncated
- [ ] Response tokens are limited
- [ ] Caching reduces redundant calls

---

## Troubleshooting

### Issue: OpenAI API errors

**Solution:**
```bash
# Verify API key
echo $OPENAI_API_KEY

# Check backend logs
tail -f backend/logs/error.log

# Test API key directly
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Issue: Rate limit exceeded

**Solution:**
- Implement caching for sentiment results
- Increase rate limit window or reduce max requests
- Queue requests instead of failing immediately

### Issue: Summaries are low quality

**Solution:**
- Adjust temperature (lower = more focused)
- Improve prompts with more context
- Increase max_tokens for longer summaries
- Provide more examples in system prompt

---

## Next Steps

**Phase 6 Complete! MVP DONE!** 🎉

You now have a complete MVP with:
- ✅ User authentication
- ✅ Journal CRUD operations
- ✅ Mood tracking
- ✅ Search & filtering
- ✅ **AI sentiment analysis**
- ✅ **AI-generated summaries**

**Ready for Production or Post-MVP Features:**
- Deploy to production
- Add advanced AI insights (Phase 7)
- Implement offline mode (Phase 8)
- Add media support (Phase 9)

---

**Estimated Total Time:** 5-6 hours
**Complexity:** Complex
**Prerequisites:** Phases 1-5 complete, OpenAI API key

**Deliverables:**
✅ Sentiment analysis service
✅ Daily/weekly summary generation
✅ Summaries view screen
✅ Sentiment display on entries
✅ Rate limiting and cost controls
✅ Critical path tests
