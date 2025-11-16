# Phase 5: Search & Filtering Capabilities - Detailed Implementation Plan

## Overview
Implement full-text search and advanced filtering capabilities to help users find past journal entries quickly. Users can search by keywords, filter by date ranges, and combine search with mood filters. Search results highlight matched keywords for easy scanning.

## Goals
- Users can search entries by keyword with full-text search
- Search supports partial matches and handles special characters
- Users can filter entries by date ranges (last 7 days, 30 days, custom range)
- Search results highlight matched keywords
- Recent searches are saved for quick access
- Search performance is optimized with database indexes
- Search can be combined with mood filters

---

## Database Schema

### Full-Text Search Setup

```sql
-- Add tsvector column for full-text search
ALTER TABLE entries
ADD COLUMN content_search tsvector;

-- Create function to update search vector
CREATE OR REPLACE FUNCTION entries_search_update() RETURNS trigger AS $$
BEGIN
  NEW.content_search :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update search vector
CREATE TRIGGER entries_search_update_trigger
  BEFORE INSERT OR UPDATE OF title, content
  ON entries
  FOR EACH ROW
  EXECUTE FUNCTION entries_search_update();

-- Create GIN index for full-text search
CREATE INDEX idx_entries_content_search ON entries USING GIN(content_search);

-- Update existing entries with search vectors
UPDATE entries
SET content_search =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(content, '')), 'B');

-- Add comment
COMMENT ON COLUMN entries.content_search IS 'Full-text search vector for title and content';
```

### Recent Searches Table

```sql
-- Create recent searches table
CREATE TABLE recent_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT query_not_empty CHECK (LENGTH(TRIM(query)) > 0)
);

-- Enable Row Level Security
ALTER TABLE recent_searches ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own searches
CREATE POLICY "Users can read own searches"
  ON recent_searches
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own searches
CREATE POLICY "Users can insert own searches"
  ON recent_searches
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own searches
CREATE POLICY "Users can delete own searches"
  ON recent_searches
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_recent_searches_user_id ON recent_searches(user_id);
CREATE INDEX idx_recent_searches_created_at ON recent_searches(created_at DESC);

-- Add unique constraint to prevent duplicate searches
CREATE UNIQUE INDEX idx_recent_searches_user_query
  ON recent_searches(user_id, query);

-- Add comment
COMMENT ON TABLE recent_searches IS 'User search history for quick access';
```

### Migration File
Create: `database/migrations/005_add_search_capabilities.sql`

---

## Backend Implementation

### 1. Update TypeScript Types

**File:** `backend/src/types/entry.types.ts` (add search types)
```typescript
export interface SearchQuery {
  query?: string;
  startDate?: string;
  endDate?: string;
  mood?: MoodType;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  entry: Entry;
  highlights: {
    title?: string;
    content?: string;
  };
  rank: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  query: string;
}

export interface RecentSearch {
  id: string;
  user_id: string;
  query: string;
  created_at: string;
}
```

### 2. Validation Schemas

**File:** `backend/src/middleware/validation.middleware.ts` (add search schemas)
```typescript
export const searchSchemas = {
  search: z.object({
    query: z.string().min(1).max(500).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    mood: moodEnum.optional(),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    offset: z.coerce.number().int().min(0).optional().default(0),
  }).refine(
    data => data.query || data.startDate || data.endDate || data.mood,
    'At least one search parameter is required'
  ),

  saveSearch: z.object({
    query: z.string().min(1).max(500),
  }),
};
```

### 3. Search Service

**File:** `backend/src/services/search.service.ts`
```typescript
import { supabase } from '../config/supabase';
import {
  SearchQuery,
  SearchResult,
  SearchResponse,
  RecentSearch,
} from '../types/entry.types';

export class SearchService {
  // Perform full-text search on entries
  async searchEntries(
    userId: string,
    searchQuery: SearchQuery
  ): Promise<SearchResponse> {
    const {
      query,
      startDate,
      endDate,
      mood,
      limit = 20,
      offset = 0,
    } = searchQuery;

    let queryBuilder = supabase
      .from('entries')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    // Apply full-text search
    if (query) {
      const searchTerm = this.prepareSearchQuery(query);
      queryBuilder = queryBuilder.textSearch('content_search', searchTerm);
    }

    // Apply date range filter
    if (startDate) {
      queryBuilder = queryBuilder.gte('created_at', startDate);
    }
    if (endDate) {
      queryBuilder = queryBuilder.lte('created_at', endDate);
    }

    // Apply mood filter
    if (mood) {
      queryBuilder = queryBuilder.eq('mood', mood);
    }

    // Get total count
    const { count } = await queryBuilder;

    // Get paginated results with ranking
    const { data: entries, error } = await queryBuilder
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Search entries error:', error);
      throw new Error('Failed to search entries');
    }

    const total = count || 0;
    const hasMore = offset + limit < total;

    // Generate highlights for search results
    const results: SearchResult[] = (entries || []).map((entry, index) => ({
      entry,
      highlights: query ? this.generateHighlights(entry, query) : {},
      rank: offset + index + 1,
    }));

    return {
      results,
      total,
      limit,
      offset,
      hasMore,
      query: query || '',
    };
  }

  // Get recent searches for user
  async getRecentSearches(
    userId: string,
    limit: number = 10
  ): Promise<RecentSearch[]> {
    const { data: searches, error } = await supabase
      .from('recent_searches')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Get recent searches error:', error);
      return [];
    }

    return searches || [];
  }

  // Save search query to history
  async saveSearch(userId: string, query: string): Promise<void> {
    try {
      // Try to insert, ignore if duplicate
      await supabase
        .from('recent_searches')
        .upsert([
          {
            user_id: userId,
            query: query.trim(),
            created_at: new Date().toISOString(),
          },
        ], {
          onConflict: 'user_id,query',
          ignoreDuplicates: false,
        });

      // Keep only last 20 searches per user
      const { data: searches } = await supabase
        .from('recent_searches')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(20, 100);

      if (searches && searches.length > 0) {
        const idsToDelete = searches.map(s => s.id);
        await supabase
          .from('recent_searches')
          .delete()
          .in('id', idsToDelete);
      }
    } catch (error) {
      console.error('Save search error:', error);
      // Don't throw - saving search history is not critical
    }
  }

  // Delete a recent search
  async deleteSearch(userId: string, searchId: string): Promise<void> {
    const { error } = await supabase
      .from('recent_searches')
      .delete()
      .eq('id', searchId)
      .eq('user_id', userId);

    if (error) {
      console.error('Delete search error:', error);
      throw new Error('Failed to delete search');
    }
  }

  // Clear all recent searches
  async clearSearchHistory(userId: string): Promise<void> {
    const { error } = await supabase
      .from('recent_searches')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Clear search history error:', error);
      throw new Error('Failed to clear search history');
    }
  }

  // Prepare search query for PostgreSQL full-text search
  private prepareSearchQuery(query: string): string {
    // Split into words and join with & for AND search
    // Use :* for prefix matching
    const words = query
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0)
      .map(word => `${word}:*`);

    return words.join(' & ');
  }

  // Generate highlights for search results
  private generateHighlights(
    entry: any,
    query: string
  ): { title?: string; content?: string } {
    const highlights: { title?: string; content?: string } = {};

    const queryWords = query.toLowerCase().split(/\s+/);

    // Highlight title
    if (entry.title) {
      highlights.title = this.highlightText(entry.title, queryWords);
    }

    // Highlight content (show excerpt around match)
    if (entry.content) {
      highlights.content = this.highlightText(
        this.extractExcerpt(entry.content, queryWords),
        queryWords
      );
    }

    return highlights;
  }

  // Extract excerpt around matched keywords
  private extractExcerpt(text: string, keywords: string[]): string {
    const maxLength = 200;
    const lowerText = text.toLowerCase();

    // Find first match
    let matchIndex = -1;
    for (const keyword of keywords) {
      matchIndex = lowerText.indexOf(keyword.toLowerCase());
      if (matchIndex !== -1) break;
    }

    if (matchIndex === -1) {
      // No match found, return beginning
      return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '');
    }

    // Extract text around match
    const startOffset = 50;
    const start = Math.max(0, matchIndex - startOffset);
    const end = Math.min(text.length, start + maxLength);

    let excerpt = text.substring(start, end);

    if (start > 0) excerpt = '...' + excerpt;
    if (end < text.length) excerpt = excerpt + '...';

    return excerpt;
  }

  // Add highlight markers to text
  private highlightText(text: string, keywords: string[]): string {
    let highlighted = text;

    for (const keyword of keywords) {
      const regex = new RegExp(`(${keyword})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    }

    return highlighted;
  }
}

export const searchService = new SearchService();
```

### 4. Search Controller

**File:** `backend/src/controllers/search.controller.ts`
```typescript
import { Request, Response } from 'express';
import { searchService } from '../services/search.service';

export const searchController = {
  // Search entries
  searchEntries: async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const searchQuery = req.query;

      const results = await searchService.searchEntries(userId, searchQuery);

      // Save search query if provided
      if (searchQuery.query) {
        await searchService.saveSearch(userId, searchQuery.query as string);
      }

      return res.status(200).json({
        success: true,
        data: results,
      });
    } catch (error: any) {
      console.error('Search entries error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to search entries',
      });
    }
  },

  // Get recent searches
  getRecentSearches: async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 10;

      const searches = await searchService.getRecentSearches(userId, limit);

      return res.status(200).json({
        success: true,
        data: searches,
      });
    } catch (error: any) {
      console.error('Get recent searches error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch recent searches',
      });
    }
  },

  // Delete recent search
  deleteSearch: async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      await searchService.deleteSearch(userId, id);

      return res.status(200).json({
        success: true,
        message: 'Search deleted successfully',
      });
    } catch (error: any) {
      console.error('Delete search error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete search',
      });
    }
  },

  // Clear search history
  clearSearchHistory: async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      await searchService.clearSearchHistory(userId);

      return res.status(200).json({
        success: true,
        message: 'Search history cleared successfully',
      });
    } catch (error: any) {
      console.error('Clear search history error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to clear search history',
      });
    }
  },
};
```

### 5. Search Routes

**File:** `backend/src/routes/search.routes.ts`
```typescript
import { Router } from 'express';
import { searchController } from '../controllers/search.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Search entries
router.get('/entries', searchController.searchEntries);

// Recent searches
router.get('/recent', searchController.getRecentSearches);
router.delete('/recent/:id', searchController.deleteSearch);
router.delete('/recent', searchController.clearSearchHistory);

export default router;
```

### 6. Update Server

**File:** `backend/src/server.ts` (add search routes)
```typescript
import searchRoutes from './routes/search.routes';

// ... existing code ...

app.use('/api/search', searchRoutes);
```

---

## Frontend Implementation

### 1. Update TypeScript Types

**File:** `mobile/src/types/search.types.ts`
```typescript
import { Entry, MoodType } from './entry.types';

export interface SearchParams {
  query?: string;
  startDate?: string;
  endDate?: string;
  mood?: MoodType;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  entry: Entry;
  highlights: {
    title?: string;
    content?: string;
  };
  rank: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  query: string;
}

export interface RecentSearch {
  id: string;
  user_id: string;
  query: string;
  created_at: string;
}

export interface DateRangePreset {
  label: string;
  value: string;
  getRange: () => { startDate: string; endDate: string };
}
```

### 2. Date Range Utilities

**File:** `mobile/src/utils/dateRanges.ts`
```typescript
import { DateRangePreset } from '../types/search.types';

export const DATE_RANGE_PRESETS: DateRangePreset[] = [
  {
    label: 'Last 7 days',
    value: 'week',
    getRange: () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      return {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };
    },
  },
  {
    label: 'Last 30 days',
    value: 'month',
    getRange: () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      return {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };
    },
  },
  {
    label: 'Last 90 days',
    value: 'quarter',
    getRange: () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);
      return {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };
    },
  },
  {
    label: 'This year',
    value: 'year',
    getRange: () => {
      const endDate = new Date();
      const startDate = new Date(endDate.getFullYear(), 0, 1);
      return {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };
    },
  },
];
```

### 3. Search Service

**File:** `mobile/src/services/search.service.ts`
```typescript
import { apiClient } from './api';
import {
  SearchParams,
  SearchResponse,
  RecentSearch,
} from '../types/search.types';

export const searchService = {
  // Search entries
  search: async (params: SearchParams): Promise<SearchResponse> => {
    const response = await apiClient.get<{
      success: boolean;
      data: SearchResponse;
    }>('/search/entries', { params });
    return response.data.data;
  },

  // Get recent searches
  getRecentSearches: async (limit: number = 10): Promise<RecentSearch[]> => {
    const response = await apiClient.get<{
      success: boolean;
      data: RecentSearch[];
    }>(`/search/recent?limit=${limit}`);
    return response.data.data;
  },

  // Delete recent search
  deleteSearch: async (id: string): Promise<void> => {
    await apiClient.delete(`/search/recent/${id}`);
  },

  // Clear search history
  clearHistory: async (): Promise<void> => {
    await apiClient.delete('/search/recent');
  },
};
```

### 4. Search Store

**File:** `mobile/src/store/searchStore.ts`
```typescript
import { create } from 'zustand';
import {
  SearchParams,
  SearchResult,
  RecentSearch,
} from '../types/search.types';
import { searchService } from '../services/search.service';

interface SearchStore {
  results: SearchResult[];
  recentSearches: RecentSearch[];
  loading: boolean;
  hasMore: boolean;
  total: number;
  offset: number;
  currentQuery: string;

  // Actions
  search: (params: SearchParams) => Promise<void>;
  loadMore: () => Promise<void>;
  clearResults: () => void;
  fetchRecentSearches: () => Promise<void>;
  deleteRecentSearch: (id: string) => Promise<void>;
  clearSearchHistory: () => Promise<void>;
}

export const useSearchStore = create<SearchStore>((set, get) => ({
  results: [],
  recentSearches: [],
  loading: false,
  hasMore: false,
  total: 0,
  offset: 0,
  currentQuery: '',

  search: async (params) => {
    try {
      set({ loading: true });

      const response = await searchService.search({
        ...params,
        offset: 0,
        limit: 20,
      });

      set({
        results: response.results,
        hasMore: response.hasMore,
        total: response.total,
        offset: response.limit,
        currentQuery: response.query,
      });

      // Refresh recent searches if query was provided
      if (params.query) {
        get().fetchRecentSearches();
      }
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  loadMore: async () => {
    const { hasMore, loading, offset, currentQuery } = get();

    if (!hasMore || loading) return;

    try {
      set({ loading: true });

      const response = await searchService.search({
        query: currentQuery,
        offset,
        limit: 20,
      });

      set((state) => ({
        results: [...state.results, ...response.results],
        hasMore: response.hasMore,
        offset: state.offset + response.limit,
      }));
    } catch (error) {
      console.error('Load more error:', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  clearResults: () =>
    set({
      results: [],
      hasMore: false,
      total: 0,
      offset: 0,
      currentQuery: '',
    }),

  fetchRecentSearches: async () => {
    try {
      const searches = await searchService.getRecentSearches(10);
      set({ recentSearches: searches });
    } catch (error) {
      console.error('Fetch recent searches error:', error);
    }
  },

  deleteRecentSearch: async (id) => {
    try {
      await searchService.deleteSearch(id);
      set((state) => ({
        recentSearches: state.recentSearches.filter((s) => s.id !== id),
      }));
    } catch (error) {
      console.error('Delete search error:', error);
      throw error;
    }
  },

  clearSearchHistory: async () => {
    try {
      await searchService.clearHistory();
      set({ recentSearches: [] });
    } catch (error) {
      console.error('Clear history error:', error);
      throw error;
    }
  },
}));
```

### 5. Search Screen

**File:** `mobile/src/screens/search/SearchScreen.tsx`
```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSearchStore } from '../../store/searchStore';
import { SearchResult } from '../../types/search.types';
import { formatEntryDate } from '../../utils/date';
import { MoodBadge } from '../../components/mood/MoodBadge';

export const SearchScreen = ({ navigation }: any) => {
  const {
    results,
    recentSearches,
    loading,
    hasMore,
    total,
    search,
    loadMore,
    clearResults,
    fetchRecentSearches,
    deleteRecentSearch,
  } = useSearchStore();

  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchRecentSearches();
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;

    try {
      await search({ query: query.trim() });
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleRecentSearchPress = async (searchQuery: string) => {
    setQuery(searchQuery);
    try {
      await search({ query: searchQuery });
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleClear = () => {
    setQuery('');
    clearResults();
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => {
    const { entry, highlights } = item;

    return (
      <TouchableOpacity
        style={styles.resultCard}
        onPress={() => navigation.navigate('EntryDetail', { id: entry.id })}
      >
        <View style={styles.resultHeader}>
          <View style={styles.resultTitleContainer}>
            {entry.mood && <MoodBadge mood={entry.mood} size="small" />}
            <Text style={styles.resultTitle} numberOfLines={1}>
              {entry.title || 'Untitled'}
            </Text>
          </View>
          <Text style={styles.resultDate}>
            {formatEntryDate(entry.created_at)}
          </Text>
        </View>
        {highlights.content && (
          <Text style={styles.resultExcerpt} numberOfLines={3}>
            {highlights.content.replace(/<mark>/g, '').replace(/<\/mark>/g, '')}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderRecentSearch = ({ item }: { item: any }) => (
    <View style={styles.recentItem}>
      <TouchableOpacity
        style={styles.recentText}
        onPress={() => handleRecentSearchPress(item.query)}
      >
        <Text style={styles.recentQuery}>{item.query}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => deleteRecentSearch(item.id)}
        style={styles.deleteButton}
      >
        <Text style={styles.deleteButtonText}>×</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmpty = () => {
    if (loading) return null;

    if (query && results.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No Results</Text>
          <Text style={styles.emptyText}>
            Try different keywords or filters
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.recentContainer}>
        <Text style={styles.recentTitle}>Recent Searches</Text>
        {recentSearches.length > 0 ? (
          <FlatList
            data={recentSearches}
            renderItem={renderRecentSearch}
            keyExtractor={(item) => item.id}
          />
        ) : (
          <Text style={styles.emptyText}>No recent searches</Text>
        )}
      </View>
    );
  };

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
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search entries..."
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>×</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearch}
          disabled={!query.trim()}
        >
          <Text
            style={[
              styles.searchButtonText,
              !query.trim() && styles.searchButtonTextDisabled,
            ]}
          >
            Search
          </Text>
        </TouchableOpacity>
      </View>

      {results.length > 0 ? (
        <>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsCount}>
              {total} {total === 1 ? 'result' : 'results'}
            </Text>
          </View>
          <FlatList
            data={results}
            renderItem={renderSearchResult}
            keyExtractor={(item) => item.entry.id}
            ListFooterComponent={renderFooter}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
          />
        </>
      ) : (
        renderEmpty()
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchBar: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  clearButton: {
    position: 'absolute',
    right: 100,
    top: 68,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 24,
    color: '#999',
  },
  searchButton: {
    paddingHorizontal: 16,
    height: 40,
    justifyContent: 'center',
  },
  searchButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  searchButtonTextDisabled: {
    opacity: 0.3,
  },
  resultsHeader: {
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  resultsCount: {
    fontSize: 14,
    color: '#666',
  },
  resultCard: {
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
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  resultDate: {
    fontSize: 12,
    color: '#999',
  },
  resultExcerpt: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
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
  recentContainer: {
    padding: 16,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#1a1a1a',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recentText: {
    flex: 1,
  },
  recentQuery: {
    fontSize: 16,
    color: '#007AFF',
  },
  deleteButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 24,
    color: '#999',
  },
});
```

### 6. Add Search to Navigation

**File:** `mobile/src/navigation/MainNavigator.tsx` (add search screen)
```typescript
import { SearchScreen } from '../screens/search/SearchScreen';

// Add to stack
<Stack.Screen name="Search" component={SearchScreen} />
```

**Update EntryListScreen** to add search button:
```typescript
// In header, add search icon
<TouchableOpacity onPress={() => navigation.navigate('Search')}>
  <Text style={styles.searchIcon}>🔍</Text>
</TouchableOpacity>
```

---

## Testing Implementation

### Backend Tests

**File:** `backend/src/__tests__/search.test.ts`
```typescript
import request from 'supertest';
import app from '../server';

describe('Search API', () => {
  let authToken: string;

  beforeAll(async () => {
    const response = await request(app)
      .post('/api/auth/signup')
      .send({
        email: `test${Date.now()}@example.com`,
        password: 'Test1234',
      });

    authToken = response.body.data.session.access_token;

    // Create test entries
    await request(app)
      .post('/api/entries')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ content: 'Today I went hiking in the mountains' });

    await request(app)
      .post('/api/entries')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ content: 'Feeling stressed about work deadlines', mood: 'stressed' });
  });

  it('should search entries by keyword', async () => {
    const response = await request(app)
      .get('/api/search/entries?query=hiking')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.results.length).toBeGreaterThan(0);
    expect(response.body.data.results[0].entry.content).toContain('hiking');
  });

  it('should filter by date range', async () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const response = await request(app)
      .get(`/api/search/entries?startDate=${startDate.toISOString()}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
  });

  it('should combine search with mood filter', async () => {
    const response = await request(app)
      .get('/api/search/entries?query=work&mood=stressed')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.results.every((r: any) => r.entry.mood === 'stressed')).toBe(true);
  });

  it('should get recent searches', async () => {
    const response = await request(app)
      .get('/api/search/recent')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});
```

---

## Step-by-Step Implementation

### Step 1: Database Setup
- Create migration with tsvector column and GIN index
- Create search update trigger
- Create recent_searches table
- Run migration and verify indexes

### Step 2: Backend Search Service
- Implement full-text search with PostgreSQL
- Add date range filtering
- Implement highlight generation
- Test search query preparation

### Step 3: Backend Recent Searches
- Implement recent search storage
- Add deduplication logic
- Implement search history limits
- Test search history operations

### Step 4: Backend Controller & Routes
- Create search controller methods
- Set up search routes
- Test all endpoints with Postman

### Step 5: Backend Testing
- Write tests for full-text search
- Test date range filtering
- Test search + mood combination
- Test recent searches CRUD

### Step 6: Frontend Search Service & Store
- Create search service
- Implement search store with Zustand
- Add pagination support
- Test store methods

### Step 7: Frontend Search Screen
- Build search UI with input and filters
- Implement recent searches display
- Add search results list
- Test search interactions

### Step 8: Integration Testing
- Test full search flow end-to-end
- Test pagination on search results
- Test recent searches save/delete
- Test search with various filters

### Step 9: Performance Testing
- Test search performance with 100+ entries
- Verify GIN index improves query speed
- Test pagination performance
- Optimize slow queries

### Step 10: Manual Testing
- Test on iOS and Android
- Test with special characters
- Test with long search queries
- Verify highlights display correctly

---

## Quality Gates

### Before Marking Phase Complete:
1. ✅ Full-text search returns relevant results
2. ✅ Search supports partial word matching
3. ✅ Can filter by date ranges
4. ✅ Can combine search with mood filters
5. ✅ Search results show highlights
6. ✅ Recent searches are saved
7. ✅ Can delete individual recent searches
8. ✅ Can clear all search history
9. ✅ Search pagination works correctly
10. ✅ Search performance is under 500ms
11. ✅ All backend tests pass
12. ✅ Tested on iOS and Android
13. ✅ No TypeScript errors
14. ✅ ESLint passes

---

## Dependencies to Install

### Backend
```bash
# No new dependencies needed (PostgreSQL full-text search is built-in)
```

### Frontend
```bash
# No new dependencies needed
```

---

## Next Steps
After completing Phase 5, you should move to **Phase 6: Basic AI Integration**, which is critical for the MVP and will enable sentiment analysis and entry summaries.
