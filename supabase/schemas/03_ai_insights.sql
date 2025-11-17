-- AI Insights Cache Table
-- Stores AI-generated insights with expiration for caching

CREATE TABLE IF NOT EXISTS ai_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    insight_type VARCHAR(50) NOT NULL,
    entry_id UUID REFERENCES entries(id) ON DELETE CASCADE,
    content JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_insights_user_id ON ai_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_entry_id ON ai_insights(entry_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_type ON ai_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_ai_insights_expires_at ON ai_insights(expires_at);

-- Row Level Security
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own insights" ON ai_insights;
CREATE POLICY "Users can view their own insights"
    ON ai_insights FOR SELECT
    USING (auth.uid() = user_id);
