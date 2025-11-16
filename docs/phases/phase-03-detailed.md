# Phase 3: Core Journal CRUD Operations - Detailed Implementation Plan

## Overview
Implement complete Create, Read, Update, and Delete (CRUD) operations for journal entries. Users will be able to write new entries, view their entry history, edit existing entries, and delete entries they no longer want. All operations will be secured with row-level security to ensure users can only access their own data.

## Goals
- Users can create new journal entries with rich text content
- Users can view all their entries in reverse chronological order
- Users can edit existing entries
- Users can delete entries with confirmation
- All entries are associated with the authenticated user
- Row-level security prevents unauthorized data access
- Optimistic UI updates provide smooth user experience
- Pagination supports large numbers of entries

---

## Database Schema

### Entries Table

```sql
-- Create entries table
CREATE TABLE entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT content_not_empty CHECK (LENGTH(TRIM(content)) > 0),
  CONSTRAINT content_max_length CHECK (LENGTH(content) <= 100000)
);

-- Enable Row Level Security
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own entries
CREATE POLICY "Users can read own entries"
  ON entries
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own entries
CREATE POLICY "Users can insert own entries"
  ON entries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own entries
CREATE POLICY "Users can update own entries"
  ON entries
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own entries
CREATE POLICY "Users can delete own entries"
  ON entries
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_entries_user_id ON entries(user_id);
CREATE INDEX idx_entries_created_at ON entries(created_at DESC);
CREATE INDEX idx_entries_user_created ON entries(user_id, created_at DESC);

-- Create updated_at trigger
CREATE TRIGGER update_entries_updated_at
  BEFORE UPDATE ON entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE entries IS 'User journal entries with rich text content';
COMMENT ON COLUMN entries.content IS 'Main entry content (max 100,000 characters)';
COMMENT ON COLUMN entries.title IS 'Optional entry title extracted from first line';
```

### Migration File
Create: `database/migrations/003_create_entries_table.sql`

---

## Backend Implementation

### 1. TypeScript Types

**File:** `backend/src/types/entry.types.ts`
```typescript
export interface Entry {
  id: string;
  user_id: string;
  content: string;
  title?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEntryDto {
  content: string;
  title?: string;
}

export interface UpdateEntryDto {
  content?: string;
  title?: string;
}

export interface EntryListQuery {
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedEntries {
  entries: Entry[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
```

### 2. Validation Schemas

**File:** `backend/src/middleware/validation.middleware.ts` (add to existing)
```typescript
export const entrySchemas = {
  create: z.object({
    content: z.string()
      .min(1, 'Content cannot be empty')
      .max(100000, 'Content too long (max 100,000 characters)')
      .refine(val => val.trim().length > 0, 'Content cannot be only whitespace'),
    title: z.string()
      .max(200, 'Title too long (max 200 characters)')
      .optional(),
  }),

  update: z.object({
    content: z.string()
      .min(1, 'Content cannot be empty')
      .max(100000, 'Content too long (max 100,000 characters)')
      .refine(val => val.trim().length > 0, 'Content cannot be only whitespace')
      .optional(),
    title: z.string()
      .max(200, 'Title too long (max 200 characters)')
      .optional(),
  }).refine(
    data => data.content !== undefined || data.title !== undefined,
    'At least one field must be provided for update'
  ),

  list: z.object({
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    offset: z.coerce.number().int().min(0).optional().default(0),
    sortBy: z.enum(['created_at', 'updated_at']).optional().default('created_at'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
};
```

### 3. Entry Service

**File:** `backend/src/services/entries.service.ts`
```typescript
import { supabase } from '../config/supabase';
import {
  Entry,
  CreateEntryDto,
  UpdateEntryDto,
  EntryListQuery,
  PaginatedEntries,
} from '../types/entry.types';

export class EntriesService {
  // Create new entry
  async createEntry(userId: string, data: CreateEntryDto): Promise<Entry> {
    const { content, title } = data;

    // Auto-generate title from first line if not provided
    const finalTitle = title || this.extractTitle(content);

    const { data: entry, error } = await supabase
      .from('entries')
      .insert([
        {
          user_id: userId,
          content: content.trim(),
          title: finalTitle,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Create entry error:', error);
      throw new Error('Failed to create entry');
    }

    return entry;
  }

  // Get all entries for user with pagination
  async getUserEntries(
    userId: string,
    query: EntryListQuery
  ): Promise<PaginatedEntries> {
    const {
      limit = 20,
      offset = 0,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = query;

    // Get total count
    const { count } = await supabase
      .from('entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get paginated entries
    const { data: entries, error } = await supabase
      .from('entries')
      .select('*')
      .eq('user_id', userId)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Get entries error:', error);
      throw new Error('Failed to fetch entries');
    }

    const total = count || 0;
    const hasMore = offset + limit < total;

    return {
      entries: entries || [],
      total,
      limit,
      offset,
      hasMore,
    };
  }

  // Get single entry by ID
  async getEntryById(userId: string, entryId: string): Promise<Entry> {
    const { data: entry, error } = await supabase
      .from('entries')
      .select('*')
      .eq('id', entryId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Entry not found');
      }
      console.error('Get entry error:', error);
      throw new Error('Failed to fetch entry');
    }

    return entry;
  }

  // Update entry
  async updateEntry(
    userId: string,
    entryId: string,
    updates: UpdateEntryDto
  ): Promise<Entry> {
    const updateData: any = {};

    if (updates.content !== undefined) {
      updateData.content = updates.content.trim();
    }

    if (updates.title !== undefined) {
      updateData.title = updates.title;
    }

    // Auto-generate title if content changed but title not provided
    if (updates.content && !updates.title) {
      updateData.title = this.extractTitle(updates.content);
    }

    const { data: entry, error } = await supabase
      .from('entries')
      .update(updateData)
      .eq('id', entryId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Entry not found');
      }
      console.error('Update entry error:', error);
      throw new Error('Failed to update entry');
    }

    return entry;
  }

  // Delete entry
  async deleteEntry(userId: string, entryId: string): Promise<void> {
    const { error } = await supabase
      .from('entries')
      .delete()
      .eq('id', entryId)
      .eq('user_id', userId);

    if (error) {
      console.error('Delete entry error:', error);
      throw new Error('Failed to delete entry');
    }
  }

  // Get entry count for user
  async getEntryCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      console.error('Get entry count error:', error);
      return 0;
    }

    return count || 0;
  }

  // Extract title from content (first line, max 200 chars)
  private extractTitle(content: string): string {
    const firstLine = content.split('\n')[0].trim();
    return firstLine.length > 200
      ? firstLine.substring(0, 197) + '...'
      : firstLine;
  }
}

export const entriesService = new EntriesService();
```

### 4. Entry Controller

**File:** `backend/src/controllers/entries.controller.ts`
```typescript
import { Request, Response } from 'express';
import { entriesService } from '../services/entries.service';

export const entriesController = {
  // Create new entry
  createEntry: async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { content, title } = req.body;

      const entry = await entriesService.createEntry(userId, {
        content,
        title,
      });

      return res.status(201).json({
        success: true,
        data: entry,
      });
    } catch (error: any) {
      console.error('Create entry error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to create entry',
      });
    }
  },

  // Get all entries for user
  getEntries: async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const query = req.query;

      const result = await entriesService.getUserEntries(userId, query);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Get entries error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch entries',
      });
    }
  },

  // Get single entry
  getEntry: async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const entry = await entriesService.getEntryById(userId, id);

      return res.status(200).json({
        success: true,
        data: entry,
      });
    } catch (error: any) {
      console.error('Get entry error:', error);

      if (error.message === 'Entry not found') {
        return res.status(404).json({
          success: false,
          error: 'Entry not found',
        });
      }

      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch entry',
      });
    }
  },

  // Update entry
  updateEntry: async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const updates = req.body;

      const entry = await entriesService.updateEntry(userId, id, updates);

      return res.status(200).json({
        success: true,
        data: entry,
      });
    } catch (error: any) {
      console.error('Update entry error:', error);

      if (error.message === 'Entry not found') {
        return res.status(404).json({
          success: false,
          error: 'Entry not found',
        });
      }

      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to update entry',
      });
    }
  },

  // Delete entry
  deleteEntry: async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      await entriesService.deleteEntry(userId, id);

      return res.status(200).json({
        success: true,
        message: 'Entry deleted successfully',
      });
    } catch (error: any) {
      console.error('Delete entry error:', error);

      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete entry',
      });
    }
  },

  // Get entry stats
  getStats: async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      const totalEntries = await entriesService.getEntryCount(userId);

      return res.status(200).json({
        success: true,
        data: {
          totalEntries,
        },
      });
    } catch (error: any) {
      console.error('Get stats error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch statistics',
      });
    }
  },
};
```

### 5. Entry Routes

**File:** `backend/src/routes/entries.routes.ts`
```typescript
import { Router } from 'express';
import { entriesController } from '../controllers/entries.controller';
import { validate, entrySchemas } from '../middleware/validation.middleware';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Create new entry
router.post('/', validate(entrySchemas.create), entriesController.createEntry);

// Get all entries (with pagination)
router.get('/', entriesController.getEntries);

// Get entry statistics
router.get('/stats', entriesController.getStats);

// Get single entry
router.get('/:id', entriesController.getEntry);

// Update entry
router.put('/:id', validate(entrySchemas.update), entriesController.updateEntry);

// Delete entry
router.delete('/:id', entriesController.deleteEntry);

export default router;
```

### 6. Update Server

**File:** `backend/src/server.ts` (add entry routes)
```typescript
import entryRoutes from './routes/entries.routes';

// ... existing code ...

app.use('/api/entries', entryRoutes);
```

---

## Frontend Implementation

### 1. TypeScript Types

**File:** `mobile/src/types/entry.types.ts`
```typescript
export interface Entry {
  id: string;
  user_id: string;
  content: string;
  title?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEntryData {
  content: string;
  title?: string;
}

export interface UpdateEntryData {
  content?: string;
  title?: string;
}

export interface EntryListParams {
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedEntries {
  entries: Entry[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
```

### 2. API Service

**File:** `mobile/src/services/entries.service.ts`
```typescript
import { apiClient } from './api';
import {
  Entry,
  CreateEntryData,
  UpdateEntryData,
  EntryListParams,
  PaginatedEntries,
} from '../types/entry.types';

export const entriesService = {
  // Create new entry
  create: async (data: CreateEntryData): Promise<Entry> => {
    const response = await apiClient.post<{ success: boolean; data: Entry }>(
      '/entries',
      data
    );
    return response.data.data;
  },

  // Get all entries with pagination
  getAll: async (params?: EntryListParams): Promise<PaginatedEntries> => {
    const response = await apiClient.get<{
      success: boolean;
      data: PaginatedEntries;
    }>('/entries', { params });
    return response.data.data;
  },

  // Get single entry
  getById: async (id: string): Promise<Entry> => {
    const response = await apiClient.get<{ success: boolean; data: Entry }>(
      `/entries/${id}`
    );
    return response.data.data;
  },

  // Update entry
  update: async (id: string, data: UpdateEntryData): Promise<Entry> => {
    const response = await apiClient.put<{ success: boolean; data: Entry }>(
      `/entries/${id}`,
      data
    );
    return response.data.data;
  },

  // Delete entry
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/entries/${id}`);
  },

  // Get stats
  getStats: async (): Promise<{ totalEntries: number }> => {
    const response = await apiClient.get<{
      success: boolean;
      data: { totalEntries: number };
    }>('/entries/stats');
    return response.data.data;
  },
};
```

### 3. Zustand Store

**File:** `mobile/src/store/entriesStore.ts`
```typescript
import { create } from 'zustand';
import { Entry, CreateEntryData, UpdateEntryData } from '../types/entry.types';
import { entriesService } from '../services/entries.service';

interface EntriesStore {
  entries: Entry[];
  selectedEntry: Entry | null;
  loading: boolean;
  hasMore: boolean;
  total: number;
  offset: number;

  // Actions
  setEntries: (entries: Entry[]) => void;
  setSelectedEntry: (entry: Entry | null) => void;
  addEntry: (entry: Entry) => void;
  updateEntryInStore: (id: string, updates: Partial<Entry>) => void;
  removeEntry: (id: string) => void;
  fetchEntries: (loadMore?: boolean) => Promise<void>;
  fetchEntryById: (id: string) => Promise<void>;
  createEntry: (data: CreateEntryData) => Promise<Entry>;
  updateEntry: (id: string, data: UpdateEntryData) => Promise<Entry>;
  deleteEntry: (id: string) => Promise<void>;
  clearEntries: () => void;
}

export const useEntriesStore = create<EntriesStore>((set, get) => ({
  entries: [],
  selectedEntry: null,
  loading: false,
  hasMore: true,
  total: 0,
  offset: 0,

  setEntries: (entries) => set({ entries }),

  setSelectedEntry: (entry) => set({ selectedEntry: entry }),

  addEntry: (entry) =>
    set((state) => ({
      entries: [entry, ...state.entries],
      total: state.total + 1,
    })),

  updateEntryInStore: (id, updates) =>
    set((state) => ({
      entries: state.entries.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      ),
      selectedEntry:
        state.selectedEntry?.id === id
          ? { ...state.selectedEntry, ...updates }
          : state.selectedEntry,
    })),

  removeEntry: (id) =>
    set((state) => ({
      entries: state.entries.filter((e) => e.id !== id),
      total: state.total - 1,
      selectedEntry: state.selectedEntry?.id === id ? null : state.selectedEntry,
    })),

  fetchEntries: async (loadMore = false) => {
    try {
      set({ loading: true });

      const currentOffset = loadMore ? get().offset : 0;

      const result = await entriesService.getAll({
        limit: 20,
        offset: currentOffset,
        sortBy: 'created_at',
        sortOrder: 'desc',
      });

      if (loadMore) {
        set((state) => ({
          entries: [...state.entries, ...result.entries],
          hasMore: result.hasMore,
          total: result.total,
          offset: result.offset + result.limit,
        }));
      } else {
        set({
          entries: result.entries,
          hasMore: result.hasMore,
          total: result.total,
          offset: result.limit,
        });
      }
    } catch (error) {
      console.error('Fetch entries error:', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  fetchEntryById: async (id) => {
    try {
      set({ loading: true });
      const entry = await entriesService.getById(id);
      set({ selectedEntry: entry });
    } catch (error) {
      console.error('Fetch entry error:', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  createEntry: async (data) => {
    try {
      set({ loading: true });
      const entry = await entriesService.create(data);
      get().addEntry(entry);
      return entry;
    } catch (error) {
      console.error('Create entry error:', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateEntry: async (id, data) => {
    try {
      set({ loading: true });
      const entry = await entriesService.update(id, data);
      get().updateEntryInStore(id, entry);
      return entry;
    } catch (error) {
      console.error('Update entry error:', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  deleteEntry: async (id) => {
    try {
      set({ loading: true });
      await entriesService.delete(id);
      get().removeEntry(id);
    } catch (error) {
      console.error('Delete entry error:', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  clearEntries: () =>
    set({
      entries: [],
      selectedEntry: null,
      hasMore: true,
      total: 0,
      offset: 0,
    }),
}));
```

### 4. Utility Functions

**File:** `mobile/src/utils/date.ts`
```typescript
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';

export const formatEntryDate = (dateString: string): string => {
  const date = new Date(dateString);

  if (isToday(date)) {
    return `Today at ${format(date, 'h:mm a')}`;
  }

  if (isYesterday(date)) {
    return `Yesterday at ${format(date, 'h:mm a')}`;
  }

  return format(date, 'MMM d, yyyy');
};

export const formatRelativeTime = (dateString: string): string => {
  return formatDistanceToNow(new Date(dateString), { addSuffix: true });
};

export const formatFullDate = (dateString: string): string => {
  return format(new Date(dateString), 'EEEE, MMMM d, yyyy \'at\' h:mm a');
};
```

### 5. Entry List Screen

**File:** `mobile/src/screens/entries/EntryListScreen.tsx`
```typescript
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useEntriesStore } from '../../store/entriesStore';
import { useAuthStore } from '../../store/authStore';
import { formatEntryDate } from '../../utils/date';
import { Entry } from '../../types/entry.types';

export const EntryListScreen = ({ navigation }: any) => {
  const { entries, loading, hasMore, fetchEntries } = useEntriesStore();
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      await fetchEntries();
    } catch (error) {
      console.error('Failed to load entries:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchEntries();
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLoadMore = async () => {
    if (!loading && hasMore) {
      try {
        await fetchEntries(true);
      } catch (error) {
        console.error('Failed to load more:', error);
      }
    }
  };

  const renderEntry = ({ item }: { item: Entry }) => (
    <TouchableOpacity
      style={styles.entryCard}
      onPress={() => navigation.navigate('EntryDetail', { id: item.id })}
    >
      <View style={styles.entryHeader}>
        <Text style={styles.entryTitle} numberOfLines={1}>
          {item.title || 'Untitled'}
        </Text>
        <Text style={styles.entryDate}>{formatEntryDate(item.created_at)}</Text>
      </View>
      <Text style={styles.entryContent} numberOfLines={3}>
        {item.content}
      </Text>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No Entries Yet</Text>
      <Text style={styles.emptyText}>
        Start journaling by tapping the + button below
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator color="#007AFF" />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Journal</Text>
        <Text style={styles.headerSubtitle}>
          {user?.fullName || user?.email}
        </Text>
      </View>

      <FlatList
        data={entries}
        renderItem={renderEntry}
        keyExtractor={(item) => item.id}
        contentContainerStyle={entries.length === 0 && styles.emptyContainer}
        ListEmptyComponent={!loading ? renderEmpty : null}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('EntryEditor')}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  entryCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  entryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  entryDate: {
    fontSize: 12,
    color: '#999',
  },
  entryContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '300',
  },
});
```

### 6. Entry Editor Screen

**File:** `mobile/src/screens/entries/EntryEditorScreen.tsx`
```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useEntriesStore } from '../../store/entriesStore';

interface Props {
  navigation: any;
  route: any;
}

export const EntryEditorScreen = ({ navigation, route }: Props) => {
  const entryId = route.params?.id;
  const isEditing = !!entryId;

  const { createEntry, updateEntry, fetchEntryById, selectedEntry, loading } =
    useEntriesStore();

  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isEditing) {
      loadEntry();
    }
  }, [entryId]);

  const loadEntry = async () => {
    try {
      await fetchEntryById(entryId);
    } catch (error) {
      Alert.alert('Error', 'Failed to load entry');
      navigation.goBack();
    }
  };

  useEffect(() => {
    if (selectedEntry && isEditing) {
      setContent(selectedEntry.content);
    }
  }, [selectedEntry]);

  const handleSave = async () => {
    if (!content.trim()) {
      Alert.alert('Empty Entry', 'Please write something before saving');
      return;
    }

    setIsSaving(true);

    try {
      if (isEditing) {
        await updateEntry(entryId, { content: content.trim() });
        Alert.alert('Success', 'Entry updated successfully');
      } else {
        const newEntry = await createEntry({ content: content.trim() });
        navigation.replace('EntryDetail', { id: newEntry.id });
        return;
      }
      navigation.goBack();
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to save entry'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (content.trim() && content !== selectedEntry?.content) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to discard them?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  if (loading && isEditing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel}>
          <Text style={styles.cancelButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Edit Entry' : 'New Entry'}
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving || !content.trim()}
        >
          {isSaving ? (
            <ActivityIndicator color="#007AFF" />
          ) : (
            <Text
              style={[
                styles.saveButton,
                !content.trim() && styles.saveButtonDisabled,
              ]}
            >
              Save
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.editorContainer}
        keyboardDismissMode="interactive"
      >
        <TextInput
          style={styles.textInput}
          value={content}
          onChangeText={setContent}
          placeholder="Start writing..."
          placeholderTextColor="#999"
          multiline
          autoFocus
          textAlignVertical="top"
        />
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.charCount}>
          {content.length.toLocaleString()} characters
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cancelButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  saveButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  saveButtonDisabled: {
    opacity: 0.3,
  },
  editorContainer: {
    flex: 1,
    padding: 16,
  },
  textInput: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1a1a1a',
    minHeight: 300,
  },
  footer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
  },
});
```

### 7. Entry Detail Screen

**File:** `mobile/src/screens/entries/EntryDetailScreen.tsx`
```typescript
import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useEntriesStore } from '../../store/entriesStore';
import { formatFullDate } from '../../utils/date';

interface Props {
  navigation: any;
  route: any;
}

export const EntryDetailScreen = ({ navigation, route }: Props) => {
  const { id } = route.params;
  const { selectedEntry, fetchEntryById, deleteEntry, loading } =
    useEntriesStore();

  useEffect(() => {
    loadEntry();
  }, [id]);

  const loadEntry = async () => {
    try {
      await fetchEntryById(id);
    } catch (error) {
      Alert.alert('Error', 'Failed to load entry');
      navigation.goBack();
    }
  };

  const handleEdit = () => {
    navigation.navigate('EntryEditor', { id });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this entry? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEntry(id);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete entry');
            }
          },
        },
      ]
    );
  };

  if (loading || !selectedEntry) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleEdit} style={styles.iconButton}>
            <Text style={styles.iconButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.iconButton}>
            <Text style={[styles.iconButtonText, styles.deleteText]}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.title}>{selectedEntry.title || 'Untitled'}</Text>
        <Text style={styles.date}>
          {formatFullDate(selectedEntry.created_at)}
        </Text>
        {selectedEntry.updated_at !== selectedEntry.created_at && (
          <Text style={styles.updatedText}>
            Last edited {formatFullDate(selectedEntry.updated_at)}
          </Text>
        )}
        <Text style={styles.entryContent}>{selectedEntry.content}</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  iconButton: {
    padding: 4,
  },
  iconButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  deleteText: {
    color: '#ff3b30',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  date: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  updatedText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 24,
  },
  entryContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1a1a1a',
  },
});
```

### 8. Navigation Setup

**File:** `mobile/src/navigation/MainNavigator.tsx`
```typescript
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { EntryListScreen } from '../screens/entries/EntryListScreen';
import { EntryDetailScreen } from '../screens/entries/EntryDetailScreen';
import { EntryEditorScreen } from '../screens/entries/EntryEditorScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';

const Stack = createNativeStackNavigator();

export const MainNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="EntryList" component={EntryListScreen} />
      <Stack.Screen name="EntryDetail" component={EntryDetailScreen} />
      <Stack.Screen name="EntryEditor" component={EntryEditorScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
};
```

**Update:** `mobile/src/navigation/RootNavigator.tsx`
```typescript
import { MainNavigator } from './MainNavigator';

// Replace placeholder with MainNavigator
{user ? <MainNavigator /> : <AuthNavigator />}
```

---

## Testing Implementation

### Backend Tests

**File:** `backend/src/__tests__/entries.test.ts`
```typescript
import request from 'supertest';
import app from '../server';

describe('Entries API', () => {
  let authToken: string;
  let entryId: string;

  // Sign up and get token before tests
  beforeAll(async () => {
    const response = await request(app)
      .post('/api/auth/signup')
      .send({
        email: `test${Date.now()}@example.com`,
        password: 'Test1234',
      });

    authToken = response.body.data.session.access_token;
  });

  describe('POST /api/entries', () => {
    it('should create new entry', async () => {
      const response = await request(app)
        .post('/api/entries')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'This is my first journal entry',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe('This is my first journal entry');
      entryId = response.body.data.id;
    });

    it('should reject empty content', async () => {
      const response = await request(app)
        .post('/api/entries')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: '' });

      expect(response.status).toBe(400);
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .post('/api/entries')
        .send({ content: 'Test entry' });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/entries', () => {
    it('should get user entries', async () => {
      const response = await request(app)
        .get('/api/entries')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.entries).toBeDefined();
      expect(Array.isArray(response.body.data.entries)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/entries?limit=5&offset=0')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.limit).toBe(5);
    });
  });

  describe('GET /api/entries/:id', () => {
    it('should get single entry', async () => {
      const response = await request(app)
        .get(`/api/entries/${entryId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(entryId);
    });

    it('should return 404 for non-existent entry', async () => {
      const response = await request(app)
        .get('/api/entries/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/entries/:id', () => {
    it('should update entry', async () => {
      const response = await request(app)
        .put(`/api/entries/${entryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Updated content' });

      expect(response.status).toBe(200);
      expect(response.body.data.content).toBe('Updated content');
    });
  });

  describe('DELETE /api/entries/:id', () => {
    it('should delete entry', async () => {
      const response = await request(app)
        .delete(`/api/entries/${entryId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      // Verify entry is deleted
      const getResponse = await request(app)
        .get(`/api/entries/${entryId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
    });
  });
});
```

---

## Step-by-Step Implementation

### Step 1: Database Setup
- Create migration file for entries table with RLS policies
- Run migration on Supabase
- Verify RLS policies work by testing queries
- Create indexes for performance

### Step 2: Backend Types & Validation
- Create TypeScript types for entries
- Add validation schemas for create/update operations
- Test validation with various inputs

### Step 3: Backend Service Layer
- Implement EntriesService with all CRUD methods
- Add title extraction logic
- Test service methods with mock data

### Step 4: Backend Controller & Routes
- Create controller methods for all operations
- Set up routes with authentication middleware
- Test all endpoints with Postman

### Step 5: Backend Integration Tests
- Write tests for all CRUD operations
- Test RLS policies prevent cross-user access
- Verify pagination works correctly
- Test error handling

### Step 6: Frontend Types & Services
- Create TypeScript types matching backend
- Implement entries API service
- Test API calls against backend

### Step 7: Frontend Store
- Create Zustand entries store
- Implement all store actions with optimistic updates
- Test store methods

### Step 8: Frontend Screens
- Build EntryListScreen with pagination and pull-to-refresh
- Build EntryEditorScreen for create/edit
- Build EntryDetailScreen with view/edit/delete
- Style all screens consistently

### Step 9: Frontend Navigation
- Set up MainNavigator with entry screens
- Update RootNavigator to show MainNavigator when authenticated
- Test navigation flows

### Step 10: End-to-End Testing
- Test complete create flow
- Test edit flow with optimistic updates
- Test delete flow with confirmation
- Test pagination by creating 25+ entries
- Test offline/error scenarios

### Step 11: Performance Optimization
- Verify API queries use indexes
- Test pagination with 100+ entries
- Optimize FlatList rendering
- Check memory usage

### Step 12: Manual Testing
- Test on iOS simulator and device
- Test on Android emulator and device
- Test edge cases (very long entries, special characters)
- Verify smooth scrolling and animations

---

## Quality Gates

### Before Marking Phase Complete:
1. ✅ All backend tests pass
2. ✅ Can create entries successfully
3. ✅ Entry list displays all user entries
4. ✅ Can edit entries and see updates immediately
5. ✅ Can delete entries with confirmation
6. ✅ Pagination loads more entries correctly
7. ✅ Pull-to-refresh updates entry list
8. ✅ RLS prevents users from seeing others' entries
9. ✅ Optimistic UI updates work smoothly
10. ✅ Entry detail screen shows full content
11. ✅ Character count displays correctly
12. ✅ Empty state shows helpful message
13. ✅ Loading states display appropriately
14. ✅ Error handling works for all operations
15. ✅ Tested on both iOS and Android
16. ✅ No TypeScript errors
17. ✅ ESLint passes

---

## Dependencies to Install

### Backend
```bash
cd backend
# Already installed: @supabase/supabase-js, express, zod
```

### Frontend
```bash
cd mobile
npm install date-fns
```

---

## Next Steps
After completing Phase 3, you can work on **Phase 4 (Mood Tracking)**, **Phase 5 (Search & Filtering)**, or **Phase 6 (Basic AI Integration)** in parallel, as they all depend on Phase 3 being complete.
