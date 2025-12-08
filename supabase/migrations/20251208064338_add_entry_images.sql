-- Entry Images Table
CREATE TABLE IF NOT EXISTS entry_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT entry_images_file_size_positive CHECK (file_size > 0),
    CONSTRAINT entry_images_mime_type_valid CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_entry_images_entry_id ON entry_images(entry_id);
CREATE INDEX IF NOT EXISTS idx_entry_images_user_id ON entry_images(user_id);
CREATE INDEX IF NOT EXISTS idx_entry_images_display_order ON entry_images(entry_id, display_order);

-- Row Level Security
ALTER TABLE entry_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own entry images"
    ON entry_images FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own entry images"
    ON entry_images FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own entry images"
    ON entry_images FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own entry images"
    ON entry_images FOR DELETE
    USING (auth.uid() = user_id);

-- Storage bucket policies (assumes bucket 'entry-images' exists)
-- Run via Supabase Dashboard: Storage > Create bucket 'entry-images' (public)

CREATE POLICY "Users can upload their own entry images"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'entry-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own entry images"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'entry-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own entry images"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'entry-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own entry images"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'entry-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
);
