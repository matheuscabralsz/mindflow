-- User Profiles Table
-- Extends Supabase auth.users with additional profile information
-- Created: Phase 2 - User Authentication

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles

-- Policy: Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON user_profiles
FOR SELECT
USING (auth.uid() = id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
ON user_profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON user_profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy: Users can delete their own profile
CREATE POLICY "Users can delete their own profile"
ON user_profiles
FOR DELETE
USING (auth.uid() = id);

-- Trigger: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_user_profiles_updated_at();

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON user_profiles(created_at DESC);

-- Comments for documentation
COMMENT ON TABLE user_profiles IS 'Extended user profile information beyond Supabase auth.users';
COMMENT ON COLUMN user_profiles.id IS 'References auth.users(id), CASCADE deletes when user is deleted';
COMMENT ON COLUMN user_profiles.display_name IS 'User-chosen display name for the app';
COMMENT ON COLUMN user_profiles.avatar_url IS 'URL to user avatar image (stored in Supabase Storage)';
