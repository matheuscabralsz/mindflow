-- Entry Images Table
-- Stores references to images uploaded for journal entries

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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_entry_images_entry_id ON entry_images(entry_id);
CREATE INDEX IF NOT EXISTS idx_entry_images_user_id ON entry_images(user_id);
CREATE INDEX IF NOT EXISTS idx_entry_images_display_order ON entry_images(entry_id, display_order);

-- Comments for documentation
COMMENT ON TABLE entry_images IS 'Stores metadata for images attached to journal entries';
COMMENT ON COLUMN entry_images.storage_path IS 'Path to the image file in Supabase Storage';
COMMENT ON COLUMN entry_images.display_order IS 'Order in which images appear in the gallery';

-- Row Level Security
ALTER TABLE entry_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own entry images" ON entry_images;
CREATE POLICY "Users can view their own entry images"
    ON entry_images FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own entry images" ON entry_images;
CREATE POLICY "Users can insert their own entry images"
    ON entry_images FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own entry images" ON entry_images;
CREATE POLICY "Users can update their own entry images"
    ON entry_images FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own entry images" ON entry_images;
CREATE POLICY "Users can delete their own entry images"
    ON entry_images FOR DELETE
    USING (auth.uid() = user_id);
