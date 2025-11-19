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
import type { Entry, CreateEntryData, UpdateEntryData, EntryFilters, EntriesResponse } from '../types';

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
 * Search entries using full-text search with optional filters
 * @param searchQuery - Search query string
 * @param page - Page number (0-indexed)
 * @param limit - Number of results per page
 * @param filters - Optional filters (mood, date range)
 */
export async function searchEntries(
  searchQuery: string,
  page: number = 0,
  limit: number = 20,
  filters?: EntryFilters
): Promise<EntriesResponse> {
  // If no search query, use regular filtering
  if (!searchQuery.trim()) {
    let query = supabase
      .from('entries')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);

    // Apply filters
    if (filters?.mood) {
      query = query.eq('mood', filters.mood);
    }

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate.toISOString());
    }

    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate.toISOString());
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching entries:', error);
      throw new Error('Failed to fetch entries');
    }

    return {
      entries: data || [],
      total: count || 0,
      hasMore: (page + 1) * limit < (count || 0),
    };
  }

  // Build the full-text search query
  // PostgreSQL to_tsquery requires special format
  const tsQuery = searchQuery
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0)
    .join(' & ');

  let query = supabase
    .from('entries')
    .select('*', { count: 'exact' })
    .textSearch('content', tsQuery, {
      type: 'websearch',
      config: 'english',
    })
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  // Apply additional filters
  if (filters?.mood) {
    query = query.eq('mood', filters.mood);
  }

  if (filters?.startDate) {
    query = query.gte('created_at', filters.startDate.toISOString());
  }

  if (filters?.endDate) {
    query = query.lte('created_at', filters.endDate.toISOString());
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error searching entries:', error);
    throw new Error('Failed to search entries');
  }

  return {
    entries: data || [],
    total: count || 0,
    hasMore: (page + 1) * limit < (count || 0),
  };
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
