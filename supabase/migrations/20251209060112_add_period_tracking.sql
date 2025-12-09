-- Add period tracking columns for week/month identification
ALTER TABLE ai_insights ADD COLUMN IF NOT EXISTS period_start DATE;
ALTER TABLE ai_insights ADD COLUMN IF NOT EXISTS period_end DATE;

-- Create composite index for efficient period lookups
CREATE INDEX IF NOT EXISTS idx_ai_insights_period
ON ai_insights(user_id, insight_type, period_start);
