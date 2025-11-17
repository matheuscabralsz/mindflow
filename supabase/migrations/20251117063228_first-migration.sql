-- Migration: Initial Schema
-- Description: Creates entries, user_preferences, and ai_insights tables
-- Source: Phase 1 – Step 4.5

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Moods enum
DO $$ BEGIN
    CREATE TYPE mood_type AS ENUM ('happy', 'sad', 'anxious', 'calm', 'stressed', 'neutral');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Journal entries table
CREATE TABLE IF NOT EXISTS entries (
                                       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    mood mood_type,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT entries_content_length CHECK (char_length(content) <= 50000)
    );

CREATE INDEX IF NOT EXISTS idx_entries_user_id ON entries(user_id);
CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_entries_mood ON entries(mood);
CREATE INDEX IF NOT EXISTS idx_entries_search ON entries USING GIN(to_tsvector('english', content));

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS update_entries_updated_at
  BEFORE UPDATE ON entries
                               FOR EACH ROW
                               EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view their own entries"
  ON entries FOR SELECT
                            USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own entries"
  ON entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own entries"
  ON entries FOR UPDATE
                                   USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete their own entries"
  ON entries FOR DELETE
USING (auth.uid() = user_id);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
                                                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    reminder_enabled BOOLEAN DEFAULT true,
    reminder_time TIME DEFAULT '20:00:00',
    theme VARCHAR(10) DEFAULT 'light',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view their own preferences"
  ON user_preferences FOR SELECT
                                     USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own preferences"
  ON user_preferences FOR UPDATE
                                            USING (auth.uid() = user_id);

-- AI insights cache table
CREATE TABLE IF NOT EXISTS ai_insights (
                                           id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    insight_type VARCHAR(50) NOT NULL,
    entry_id UUID REFERENCES entries(id) ON DELETE CASCADE,
    content JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
                                                        );

CREATE INDEX IF NOT EXISTS idx_ai_insights_user_id ON ai_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_entry_id ON ai_insights(entry_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_type ON ai_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_ai_insights_expires_at ON ai_insights(expires_at);

ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view their own insights"
  ON ai_insights FOR SELECT
                                USING (auth.uid() = user_id);
