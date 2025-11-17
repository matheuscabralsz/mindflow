-- Custom Types
-- This file contains custom PostgreSQL types used across the schema

-- Moods enum
DO $$ BEGIN
    CREATE TYPE mood_type AS ENUM ('happy', 'sad', 'anxious', 'calm', 'stressed', 'neutral');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
