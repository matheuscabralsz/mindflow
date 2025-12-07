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

/**
 * Get cached summary from database
 * @param type - 'daily' or 'weekly'
 * @returns Cached summary if found and not expired, null otherwise
 */
export async function getCachedSummary(type: 'daily' | 'weekly'): Promise<Summary | null> {
  const insightType = type === 'daily' ? 'daily_summary' : 'weekly_summary';

  // Calculate start date based on type
  const now = new Date();
  let startDate: Date;

  if (type === 'weekly') {
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 7);
    startDate.setHours(0, 0, 0, 0);
  } else {
    startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);
  }

  const { data, error } = await supabase
    .from('ai_insights')
    .select('content, created_at')
    .eq('insight_type', insightType)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  // Check if cache is less than 6 hours old
  const cacheAge = Date.now() - new Date(data.created_at).getTime();
  const sixHours = 6 * 60 * 60 * 1000;

  if (cacheAge >= sixHours) {
    return null;
  }

  return {
    ...(data.content as Summary),
    cached: true,
    cachedAt: data.created_at,
  };
}
