-- Storage Bucket and Policies for Entry Images
-- Note: Run this after creating the bucket in Supabase Dashboard or via CLI

-- Create storage bucket for entry images (if not exists)
-- This needs to be run via Supabase Dashboard or CLI:
-- supabase storage create entry-images --public

-- Storage RLS Policies
-- These policies control access to files in the entry-images bucket

-- Allow users to upload images to their own folder
-- Path pattern: {user_id}/{entry_id}/{filename}
CREATE POLICY "Users can upload their own entry images"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'entry-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view their own images
CREATE POLICY "Users can view their own entry images"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'entry-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own images
CREATE POLICY "Users can update their own entry images"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'entry-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own images
CREATE POLICY "Users can delete their own entry images"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'entry-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
);
