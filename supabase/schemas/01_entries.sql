-- Journal Entries Table
-- Stores user journal entries with mood tracking

CREATE TABLE IF NOT EXISTS entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    mood mood_type,
    sentiment_score DECIMAL(3,2),
    sentiment_label TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT entries_content_length CHECK (char_length(content) <= 50000),
    CONSTRAINT entries_sentiment_score_range CHECK (sentiment_score IS NULL OR (sentiment_score >= -1 AND sentiment_score <= 1)),
    CONSTRAINT entries_sentiment_label_valid CHECK (sentiment_label IS NULL OR sentiment_label IN ('positive', 'neutral', 'negative'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_entries_user_id ON entries(user_id);
CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_entries_mood ON entries(mood);
CREATE INDEX IF NOT EXISTS idx_entries_search ON entries USING GIN(to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS idx_entries_sentiment_score ON entries(sentiment_score);
CREATE INDEX IF NOT EXISTS idx_entries_sentiment_label ON entries(sentiment_label);

-- Comments for documentation
COMMENT ON COLUMN entries.sentiment_score IS 'AI sentiment score from -1 (very negative) to 1 (very positive)';
COMMENT ON COLUMN entries.sentiment_label IS 'AI sentiment label: positive, neutral, or negative';

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_entries_updated_at ON entries;
CREATE TRIGGER update_entries_updated_at
    BEFORE UPDATE ON entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own entries" ON entries;
CREATE POLICY "Users can view their own entries"
    ON entries FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own entries" ON entries;
CREATE POLICY "Users can insert their own entries"
    ON entries FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own entries" ON entries;
CREATE POLICY "Users can update their own entries"
    ON entries FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own entries" ON entries;
CREATE POLICY "Users can delete their own entries"
    ON entries FOR DELETE
    USING (auth.uid() = user_id);
