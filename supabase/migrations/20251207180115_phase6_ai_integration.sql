-- Phase 6: AI Integration Migration
-- This migration adds sentiment analysis columns to entries and creates AI rate limiting

-- 1. Add sentiment columns to entries table
ALTER TABLE entries
ADD COLUMN IF NOT EXISTS sentiment_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS sentiment_label TEXT;

-- Add constraints for sentiment columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'entries_sentiment_score_range'
    ) THEN
        ALTER TABLE entries
        ADD CONSTRAINT entries_sentiment_score_range
        CHECK (sentiment_score IS NULL OR (sentiment_score >= -1 AND sentiment_score <= 1));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'entries_sentiment_label_valid'
    ) THEN
        ALTER TABLE entries
        ADD CONSTRAINT entries_sentiment_label_valid
        CHECK (sentiment_label IS NULL OR sentiment_label IN ('positive', 'neutral', 'negative'));
    END IF;
END $$;

-- Add indexes for sentiment queries
CREATE INDEX IF NOT EXISTS idx_entries_sentiment_score ON entries(sentiment_score);
CREATE INDEX IF NOT EXISTS idx_entries_sentiment_label ON entries(sentiment_label);

-- Add comments for documentation
COMMENT ON COLUMN entries.sentiment_score IS 'AI sentiment score from -1 (very negative) to 1 (very positive)';
COMMENT ON COLUMN entries.sentiment_label IS 'AI sentiment label: positive, neutral, or negative';

-- 2. Create AI rate limits table
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

-- RLS for rate limits
ALTER TABLE ai_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only allow service role to manage rate limits
DROP POLICY IF EXISTS "Service role manages rate limits" ON ai_rate_limits;
CREATE POLICY "Service role manages rate limits"
ON ai_rate_limits FOR ALL
USING (false)
WITH CHECK (false);

-- 3. Add insert/delete policies to ai_insights for caching
DROP POLICY IF EXISTS "Users can insert their own insights" ON ai_insights;
CREATE POLICY "Users can insert their own insights"
    ON ai_insights FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own insights" ON ai_insights;
CREATE POLICY "Users can delete their own insights"
    ON ai_insights FOR DELETE
    USING (auth.uid() = user_id);
