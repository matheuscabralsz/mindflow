-- AI Rate Limits Table
-- Tracks API usage for rate limiting AI requests per user

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

-- Row Level Security
ALTER TABLE ai_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only allow service role to manage rate limits (deny all for regular users)
-- Service role bypasses RLS, so this effectively blocks all client-side access
DROP POLICY IF EXISTS "Service role manages rate limits" ON ai_rate_limits;
CREATE POLICY "Service role manages rate limits"
ON ai_rate_limits FOR ALL
USING (false)
WITH CHECK (false);
