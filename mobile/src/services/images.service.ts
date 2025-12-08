/**
 * Image Service
 * Handles uploading, fetching, and deleting images for journal entries
 */

import { supabase } from './supabase';
import type { EntryImage } from '../types';

const BUCKET_NAME = 'entry-images';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
];

export interface UploadImageResult {
  image: EntryImage;
  url: string;
}

/**
 * Generate a unique file path for storage
 */
function generateStoragePath(userId: string, entryId: string, fileName: string): string {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${userId}/${entryId}/${timestamp}_${sanitizedFileName}`;
}

/**
 * Validate file before upload
 */
function validateFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  return { valid: true };
}

/**
 * Upload an image to Supabase Storage and create database record
 */
export async function uploadEntryImage(
  file: File,
  entryId: string,
  userId: string,
  displayOrder: number = 0
): Promise<UploadImageResult> {
  // Validate file
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const storagePath = generateStoragePath(userId, entryId, file.name);

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload image: ${uploadError.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);

  // Create database record
  const { data: imageRecord, error: dbError } = await supabase
    .from('entry_images')
    .insert({
      entry_id: entryId,
      user_id: userId,
      storage_path: storagePath,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      display_order: displayOrder,
    })
    .select()
    .single();

  if (dbError) {
    // Rollback: delete uploaded file
    await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
    throw new Error(`Failed to save image record: ${dbError.message}`);
  }

  return {
    image: imageRecord as EntryImage,
    url: urlData.publicUrl,
  };
}

/**
 * Get all images for an entry with signed URLs
 */
export async function getEntryImages(entryId: string): Promise<EntryImage[]> {
  const { data, error } = await supabase
    .from('entry_images')
    .select('*')
    .eq('entry_id', entryId)
    .order('display_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch images: ${error.message}`);
  }

  // Add public URLs to each image
  return (data || []).map((image) => ({
    ...image,
    url: supabase.storage.from(BUCKET_NAME).getPublicUrl(image.storage_path).data.publicUrl,
  }));
}

/**
 * Delete an image from storage and database
 */
export async function deleteEntryImage(imageId: string): Promise<void> {
  // First get the image record to get storage path
  const { data: image, error: fetchError } = await supabase
    .from('entry_images')
    .select('storage_path')
    .eq('id', imageId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to find image: ${fetchError.message}`);
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([image.storage_path]);

  if (storageError) {
    console.warn(`Failed to delete from storage: ${storageError.message}`);
  }

  // Delete database record
  const { error: dbError } = await supabase
    .from('entry_images')
    .delete()
    .eq('id', imageId);

  if (dbError) {
    throw new Error(`Failed to delete image record: ${dbError.message}`);
  }
}

/**
 * Delete all images for an entry
 */
export async function deleteAllEntryImages(entryId: string): Promise<void> {
  // Get all images for the entry
  const { data: images, error: fetchError } = await supabase
    .from('entry_images')
    .select('storage_path')
    .eq('entry_id', entryId);

  if (fetchError) {
    throw new Error(`Failed to fetch images: ${fetchError.message}`);
  }

  if (images && images.length > 0) {
    // Delete from storage
    const paths = images.map((img) => img.storage_path);
    await supabase.storage.from(BUCKET_NAME).remove(paths);

    // Delete database records
    const { error: dbError } = await supabase
      .from('entry_images')
      .delete()
      .eq('entry_id', entryId);

    if (dbError) {
      throw new Error(`Failed to delete image records: ${dbError.message}`);
    }
  }
}

/**
 * Update display order of images
 */
export async function updateImageOrder(
  imageIds: string[]
): Promise<void> {
  const updates = imageIds.map((id, index) => ({
    id,
    display_order: index,
  }));

  for (const update of updates) {
    const { error } = await supabase
      .from('entry_images')
      .update({ display_order: update.display_order })
      .eq('id', update.id);

    if (error) {
      throw new Error(`Failed to update image order: ${error.message}`);
    }
  }
}
