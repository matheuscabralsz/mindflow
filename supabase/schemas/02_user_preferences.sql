-- User Preferences Table
-- Stores user-specific settings and preferences

CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    reminder_enabled BOOLEAN DEFAULT true,
    reminder_time TIME DEFAULT '20:00:00',
    theme VARCHAR(10) DEFAULT 'light',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Row Level Security
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own preferences" ON user_preferences;
CREATE POLICY "Users can view their own preferences"
    ON user_preferences FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own preferences" ON user_preferences;
CREATE POLICY "Users can insert their own preferences"
    ON user_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own preferences" ON user_preferences;
CREATE POLICY "Users can update their own preferences"
    ON user_preferences FOR UPDATE
    USING (auth.uid() = user_id);
