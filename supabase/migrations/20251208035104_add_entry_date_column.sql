-- Add entry_date column to entries table
-- This column stores the journal date (YYYY-MM-DD) and is unique per user

-- Add the entry_date column
ALTER TABLE entries ADD COLUMN IF NOT EXISTS entry_date DATE;

-- Backfill existing entries: set entry_date from created_at
UPDATE entries SET entry_date = DATE(created_at) WHERE entry_date IS NULL;

-- Make entry_date NOT NULL after backfill
ALTER TABLE entries ALTER COLUMN entry_date SET NOT NULL;

-- Add unique constraint for user_id + entry_date (one entry per day per user)
ALTER TABLE entries ADD CONSTRAINT entries_unique_user_date UNIQUE (user_id, entry_date);

-- Add index for entry_date queries
CREATE INDEX IF NOT EXISTS idx_entries_entry_date ON entries(entry_date DESC);
