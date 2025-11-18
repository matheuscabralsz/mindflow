/**
 * Entries Service
 * Handles all CRUD operations for journal entries
 *
 * Important Notes:
 * - This service uses Supabase client directly (no backend API needed)
 * - Row-Level Security (RLS) automatically filters entries by authenticated user
 * - No need to manually set `user_id` - RLS policies handle this via `auth.uid()`
 * - All operations are secured at the database level
 */

import { supabase } from './supabase';
import type { Entry, CreateEntryData, UpdateEntryData } from '../types';

/**
 * Fetch all entries for the authenticated user
 * Sorted by created_at DESC (newest first)
 */
export async function getAllEntries(): Promise<Entry[]> {
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching entries:', error);
    throw new Error('Failed to fetch entries');
  }

  return data || [];
}

/**
 * Fetch a single entry by ID
 * @param id - Entry UUID
 */
export async function getEntryById(id: string): Promise<Entry> {
    console.log('Fetching entry with ID:', id);
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching entry:', error);
    throw new Error('Failed to fetch entry');
  }

  if (!data) {
    throw new Error('Entry not found');
  }

  return data;
}

/**
 * Create a new entry
 * @param entryData - Content and optional mood
 */
export async function createEntry(entryData: CreateEntryData): Promise<Entry> {
  const { data, error } = await supabase
    .from('entries')
    .insert([entryData])
    .select()
    .single();

  if (error) {
    console.error('Error creating entry:', error);
    throw new Error('Failed to create entry');
  }

  if (!data) {
    throw new Error('No data returned after creating entry');
  }

  return data;
}

/**
 * Update an existing entry
 * @param id - Entry UUID
 * @param updates - Fields to update
 */
export async function updateEntry(
  id: string,
  updates: UpdateEntryData
): Promise<Entry> {
  const { data, error } = await supabase
    .from('entries')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating entry:', error);
    throw new Error('Failed to update entry');
  }

  if (!data) {
    throw new Error('No data returned after updating entry');
  }

  return data;
}

/**
 * Delete an entry by ID
 * @param id - Entry UUID
 */
export async function deleteEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from('entries')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting entry:', error);
    throw new Error('Failed to delete entry');
  }
}

/**
 * Search entries by content (case-insensitive)
 * @param searchTerm - Text to search for
 */
export async function searchEntries(searchTerm: string): Promise<Entry[]> {
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .ilike('content', `%${searchTerm}%`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error searching entries:', error);
    throw new Error('Failed to search entries');
  }

  return data || [];
}

/**
 * Filter entries by mood
 * @param mood - Mood type to filter by
 */
export async function getEntriesByMood(mood: string): Promise<Entry[]> {
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('mood', mood)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error filtering entries by mood:', error);
    throw new Error('Failed to filter entries');
  }

  return data || [];
}
