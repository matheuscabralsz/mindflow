# Phase 3: Core Journal CRUD Operations - Detailed Implementation Guide

## Overview

**Goal:** Implement complete Create, Read, Update, Delete (CRUD) operations for journal entries with Ionic + React UI, backend API, and Row-Level Security.

**Time Estimate:** 4-5 hours

**Prerequisites:**
- Phase 1 complete (Foundation & Infrastructure)
- Phase 2 complete (User Authentication)
- User can log in and access protected routes
- Supabase `entries` table already exists (from Phase 1 schema)

**What You'll Have At The End:**
- Entry list screen with infinite scroll
- Entry creation screen with rich text editor
- Entry detail view screen
- Entry editing functionality
- Entry deletion with confirmation
- Backend CRUD API endpoints
- Row-Level Security preventing cross-user access
- Pull-to-refresh and optimistic UI updates
- Critical path tests

---

## Step 1: Verify Database Schema (5 minutes)

### 1.1 Confirm Entries Table Exists

```bash
# Check supabase/schemas/01_entries.sql exists
cat supabase/schemas/01_entries.sql

# Should have:
# - entries table with id, user_id, content, mood, created_at, updated_at
# - RLS policies for SELECT, INSERT, UPDATE, DELETE
# - Full-text search index
# - Auto-update trigger for updated_at

# If schema changes were made in Phase 1 but not yet applied:
cd /home/mack/my_workspace/mindflow

# Generate migration from Phase 1 schema files
npx supabase db diff --schema public -f initial_schema

# Apply migrations
npx supabase db push

# Note: If you completed Phase 1 properly, this should already be done
```

### 1.2 Verify RLS Policies

```sql
-- In Supabase Dashboard → SQL Editor, verify policies:

SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'entries';

-- Should show 4 policies:
-- 1. Users can view their own entries
-- 2. Users can insert their own entries
-- 3. Users can update their own entries
-- 4. Users can delete their own entries
```

---

## Step 2: TypeScript Types for Entries (10 minutes)

### 2.1 Update Entry Types

```bash
# mobile/src/types/entry.types.ts already exists, update it:
cat > mobile/src/types/entry.types.ts << 'EOF'
export type MoodType = 'happy' | 'sad' | 'anxious' | 'calm' | 'stressed' | 'neutral';

export interface Entry {
  id: string;
  user_id: string;
  content: string;
  mood: MoodType | null;
  created_at: string;
  updated_at: string;
}

export interface CreateEntryInput {
  content: string;
  mood?: MoodType | null;
}

export interface UpdateEntryInput {
  content?: string;
  mood?: MoodType | null;
}

export interface EntryFilters {
  mood?: MoodType;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface EntriesResponse {
  entries: Entry[];
  total: number;
  hasMore: boolean;
}
EOF
```

### 2.2 Update API Types

```bash
# mobile/src/types/api.types.ts
cat > mobile/src/types/api.types.ts << 'EOF'
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}
EOF
```

---

## Step 3: Entries Service Layer (20 minutes)

### 3.1 Create Entries Service

**Important Notes:**
- This service uses Supabase client directly (no backend API needed)
- Row-Level Security (RLS) automatically filters entries by authenticated user
- No need to manually set `user_id` - RLS policies handle this via `auth.uid()`
- All operations are secured at the database level

```bash
# mobile/src/services/entries.service.ts
cat > mobile/src/services/entries.service.ts << 'EOF'
import { supabase } from './supabase';
import type {
  Entry,
  CreateEntryInput,
  UpdateEntryInput,
  EntryFilters,
} from '../types';

const ENTRIES_PER_PAGE = 20;

export const entriesService = {
  /**
   * Get paginated entries for the current user
   */
  async getEntries(
    page: number = 0,
    limit: number = ENTRIES_PER_PAGE,
    filters?: EntryFilters
  ) {
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

    if (filters?.search) {
      query = query.textSearch('content', filters.search);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      entries: data as Entry[],
      total: count || 0,
      hasMore: (page + 1) * limit < (count || 0),
    };
  },

  /**
   * Get a single entry by ID
   */
  async getEntry(id: string): Promise<Entry> {
    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Entry;
  },

  /**
   * Create a new entry
   */
  async createEntry(input: CreateEntryInput): Promise<Entry> {
    const { data, error } = await supabase
      .from('entries')
      .insert([
        {
          content: input.content,
          mood: input.mood || null,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data as Entry;
  },

  /**
   * Update an existing entry
   */
  async updateEntry(id: string, input: UpdateEntryInput): Promise<Entry> {
    const { data, error } = await supabase
      .from('entries')
      .update({
        content: input.content,
        mood: input.mood,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Entry;
  },

  /**
   * Delete an entry
   */
  async deleteEntry(id: string): Promise<void> {
    const { error } = await supabase
      .from('entries')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Get entry count for the current user
   */
  async getEntryCount(): Promise<number> {
    const { count, error } = await supabase
      .from('entries')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;
    return count || 0;
  },

  /**
   * Get entries for a specific date
   */
  async getEntriesByDate(date: Date): Promise<Entry[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Entry[];
  },
};
EOF
```

---

## Step 4: Entries State Management (20 minutes)

### 4.1 Create Entries Store

```bash
# mobile/src/store/entriesStore.ts
cat > mobile/src/store/entriesStore.ts << 'EOF'
import { create } from 'zustand';
import { entriesService } from '../services/entries.service';
import type { Entry, CreateEntryInput, UpdateEntryInput, EntryFilters } from '../types';

interface EntriesStore {
  // State
  entries: Entry[];
  selectedEntry: Entry | null;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
  total: number;
  filters: EntryFilters;

  // Actions
  fetchEntries: (reset?: boolean) => Promise<void>;
  fetchEntry: (id: string) => Promise<void>;
  createEntry: (input: CreateEntryInput) => Promise<Entry>;
  updateEntry: (id: string, input: UpdateEntryInput) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  setSelectedEntry: (entry: Entry | null) => void;
  setFilters: (filters: EntryFilters) => void;
  clearFilters: () => void;
  reset: () => void;
}

export const useEntriesStore = create<EntriesStore>((set, get) => ({
  // Initial state
  entries: [],
  selectedEntry: null,
  loading: false,
  error: null,
  hasMore: true,
  page: 0,
  total: 0,
  filters: {},

  // Fetch entries with pagination
  fetchEntries: async (reset = false) => {
    const { page, entries: currentEntries, filters } = get();
    const nextPage = reset ? 0 : page;

    set({ loading: true, error: null });

    try {
      const { entries: newEntries, total, hasMore } = await entriesService.getEntries(
        nextPage,
        20,
        filters
      );

      set({
        entries: reset ? newEntries : [...currentEntries, ...newEntries],
        page: nextPage + 1,
        total,
        hasMore,
        loading: false,
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  // Fetch a single entry
  fetchEntry: async (id: string) => {
    set({ loading: true, error: null });

    try {
      const entry = await entriesService.getEntry(id);
      set({ selectedEntry: entry, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  // Create a new entry
  createEntry: async (input: CreateEntryInput) => {
    set({ loading: true, error: null });

    try {
      const newEntry = await entriesService.createEntry(input);

      // Add to the beginning of the list
      set((state) => ({
        entries: [newEntry, ...state.entries],
        total: state.total + 1,
        loading: false,
      }));

      return newEntry;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Update an existing entry
  updateEntry: async (id: string, input: UpdateEntryInput) => {
    set({ loading: true, error: null });

    try {
      const updatedEntry = await entriesService.updateEntry(id, input);

      // Update in the list
      set((state) => ({
        entries: state.entries.map((e) => (e.id === id ? updatedEntry : e)),
        selectedEntry: state.selectedEntry?.id === id ? updatedEntry : state.selectedEntry,
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Delete an entry
  deleteEntry: async (id: string) => {
    set({ loading: true, error: null });

    try {
      await entriesService.deleteEntry(id);

      // Remove from the list
      set((state) => ({
        entries: state.entries.filter((e) => e.id !== id),
        total: state.total - 1,
        selectedEntry: state.selectedEntry?.id === id ? null : state.selectedEntry,
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Setters
  setSelectedEntry: (entry) => set({ selectedEntry: entry }),
  setFilters: (filters) => set({ filters, page: 0 }),
  clearFilters: () => set({ filters: {}, page: 0 }),
  reset: () => set({
    entries: [],
    selectedEntry: null,
    loading: false,
    error: null,
    hasMore: true,
    page: 0,
    total: 0,
    filters: {},
  }),
}));
EOF
```

---

## Step 5: Entry List Page (30 minutes)

### 5.1 Create Entry Card Component

```bash
# mobile/src/components/entries/EntryCard.tsx
mkdir -p mobile/src/components/entries
cat > mobile/src/components/entries/EntryCard.tsx << 'EOF'
import React from 'react';
import { IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonText } from '@ionic/react';
import { format } from 'date-fns';
import type { Entry } from '../../types';
import './EntryCard.css';

interface EntryCardProps {
  entry: Entry;
  onClick: () => void;
}

export const EntryCard: React.FC<EntryCardProps> = ({ entry, onClick }) => {
  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <IonCard button onClick={onClick} className="entry-card">
      <IonCardHeader>
        <div className="entry-card-header">
          <IonCardTitle className="entry-date">
            {format(new Date(entry.created_at), 'EEEE, MMMM d, yyyy')}
          </IonCardTitle>
          <IonText color="medium" className="entry-time">
            {format(new Date(entry.created_at), 'h:mm a')}
          </IonText>
        </div>
      </IonCardHeader>

      <IonCardContent>
        <p className="entry-preview">{truncateContent(entry.content)}</p>
        {entry.mood && (
          <div className="entry-mood-badge">
            <IonText color="primary">{entry.mood}</IonText>
          </div>
        )}
      </IonCardContent>
    </IonCard>
  );
};
EOF
```

### 5.2 Create Entry Card CSS

```bash
# mobile/src/components/entries/EntryCard.css
cat > mobile/src/components/entries/EntryCard.css << 'EOF'
.entry-card {
  margin: 12px 16px;
}

.entry-card-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.entry-date {
  font-size: 18px;
  font-weight: 600;
}

.entry-time {
  font-size: 12px;
}

.entry-preview {
  margin: 0;
  color: var(--ion-color-step-600);
  line-height: 1.5;
  white-space: pre-wrap;
}

.entry-mood-badge {
  margin-top: 12px;
  padding: 4px 12px;
  background: var(--ion-color-primary-tint);
  border-radius: 12px;
  display: inline-block;
  font-size: 12px;
  font-weight: 500;
  text-transform: capitalize;
}
EOF
```

### 5.3 Create Entries List Page

```bash
# mobile/src/pages/entries/EntriesListPage.tsx
mkdir -p mobile/src/pages/entries
cat > mobile/src/pages/entries/EntriesListPage.tsx << 'EOF'
import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import {
  IonContent,
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonFab,
  IonFabButton,
  IonRefresher,
  IonRefresherContent,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonSpinner,
  IonText,
} from '@ionic/react';
import { add, personCircleOutline } from 'ionicons/icons';
import { useEntriesStore } from '../../store/entriesStore';
import { EntryCard } from '../../components/entries/EntryCard';
import './EntriesListPage.css';

const EntriesListPage: React.FC = () => {
  const history = useHistory();
  const { entries, loading, hasMore, fetchEntries } = useEntriesStore();

  useEffect(() => {
    // Fetch entries on mount
    if (entries.length === 0) {
      fetchEntries(true);
    }
  }, []);

  const handleRefresh = async (event: CustomEvent) => {
    await fetchEntries(true);
    event.detail.complete();
  };

  const handleLoadMore = async (event: CustomEvent) => {
    if (hasMore) {
      await fetchEntries(false);
    }
    (event.target as HTMLIonInfiniteScrollElement).complete();
  };

  const handleEntryClick = (id: string) => {
    history.push(`/entries/${id}`);
  };

  const handleNewEntry = () => {
    history.push('/entries/new');
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>My Journal</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => history.push('/profile')}>
              <IonIcon slot="icon-only" icon={personCircleOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">My Journal</IonTitle>
          </IonToolbar>
        </IonHeader>

        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        {loading && entries.length === 0 && (
          <div className="entries-loading">
            <IonSpinner name="crescent" />
          </div>
        )}

        {!loading && entries.length === 0 && (
          <div className="entries-empty">
            <IonText color="medium">
              <h2>No entries yet</h2>
              <p>Start journaling by tapping the + button</p>
            </IonText>
          </div>
        )}

        <div className="entries-list">
          {entries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onClick={() => handleEntryClick(entry.id)}
            />
          ))}
        </div>

        <IonInfiniteScroll
          onIonInfinite={handleLoadMore}
          threshold="100px"
          disabled={!hasMore}
        >
          <IonInfiniteScrollContent loadingText="Loading more entries..." />
        </IonInfiniteScroll>

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={handleNewEntry}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>
      </IonContent>
    </IonPage>
  );
};

export default EntriesListPage;
EOF
```

### 5.4 Create Entries List CSS

```bash
# mobile/src/pages/entries/EntriesListPage.css
cat > mobile/src/pages/entries/EntriesListPage.css << 'EOF'
.entries-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 50vh;
}

.entries-empty {
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  height: 50vh;
  padding: 20px;
}

.entries-empty h2 {
  font-size: 24px;
  margin-bottom: 8px;
}

.entries-empty p {
  font-size: 16px;
}

.entries-list {
  padding-bottom: 80px;
}
EOF
```

---

## Step 6: Entry Editor Page (35 minutes)

### 6.1 Create Entry Editor Component

```bash
# mobile/src/pages/entries/EntryEditorPage.tsx
cat > mobile/src/pages/entries/EntryEditorPage.tsx << 'EOF'
import React, { useState, useEffect } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import {
  IonContent,
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonBackButton,
  IonTextarea,
  IonToast,
  IonSpinner,
} from '@ionic/react';
import { useEntriesStore } from '../../store/entriesStore';
import './EntryEditorPage.css';

const EntryEditorPage: React.FC = () => {
  const history = useHistory();
  const { id } = useParams<{ id: string }>();
  const isEditMode = id !== 'new';

  const { createEntry, updateEntry, fetchEntry, selectedEntry, loading } = useEntriesStore();

  const [content, setContent] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize content only once when editing
  useEffect(() => {
    if (isEditMode && !isInitialized) {
      if (selectedEntry?.id !== id) {
        fetchEntry(id);
      } else {
        setContent(selectedEntry.content);
        setIsInitialized(true);
      }
    }
  }, [id, isEditMode, selectedEntry, fetchEntry, isInitialized]);

  // Update content when selected entry loads (only if not already initialized)
  useEffect(() => {
    if (isEditMode && selectedEntry?.id === id && !isInitialized) {
      setContent(selectedEntry.content);
      setIsInitialized(true);
    }
  }, [selectedEntry, id, isEditMode, isInitialized]);

  const handleSave = async () => {
    if (!content.trim()) {
      setToastMessage('Entry cannot be empty');
      setShowToast(true);
      return;
    }

    setIsSaving(true);

    try {
      if (isEditMode) {
        await updateEntry(id, { content });
        setToastMessage('Entry updated!');
      } else {
        await createEntry({ content });
        setToastMessage('Entry created!');
      }

      setShowToast(true);

      // Navigate back after short delay
      setTimeout(() => {
        history.goBack();
      }, 500);
    } catch (error: any) {
      setToastMessage(error.message || 'Failed to save entry');
      setShowToast(true);
    } finally {
      setIsSaving(false);
    }
  };

  const canSave = content.trim().length > 0 && !isSaving;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/entries" />
          </IonButtons>
          <IonTitle>{isEditMode ? 'Edit Entry' : 'New Entry'}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleSave} disabled={!canSave}>
              {isSaving ? <IonSpinner name="crescent" /> : 'Save'}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {loading && isEditMode && (
          <div className="entry-editor-loading">
            <IonSpinner name="crescent" />
          </div>
        )}

        {(!loading || !isEditMode) && (
          <IonTextarea
            value={content}
            onIonInput={(e) => setContent(e.detail.value!)}
            placeholder="What's on your mind?"
            autoGrow
            rows={10}
            className="entry-editor-textarea"
            autofocus
          />
        )}

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={2000}
        />
      </IonContent>
    </IonPage>
  );
};

export default EntryEditorPage;
EOF
```

### 6.2 Create Entry Editor CSS

```bash
# mobile/src/pages/entries/EntryEditorPage.css
cat > mobile/src/pages/entries/EntryEditorPage.css << 'EOF'
.entry-editor-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 50vh;
}

.entry-editor-textarea {
  font-size: 16px;
  line-height: 1.6;
  min-height: 60vh;
  --padding-start: 0;
  --padding-end: 0;
}

.entry-editor-textarea textarea {
  font-family: inherit;
}
EOF
```

---

## Step 7: Entry Detail Page (25 minutes)

### 7.1 Create Entry Detail Page

```bash
# mobile/src/pages/entries/EntryDetailPage.tsx
cat > mobile/src/pages/entries/EntryDetailPage.tsx << 'EOF'
import React, { useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import {
  IonContent,
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonBackButton,
  IonIcon,
  IonActionSheet,
  IonSpinner,
  IonText,
  IonAlert,
} from '@ionic/react';
import { ellipsisVertical, create, trash } from 'ionicons/icons';
import { format } from 'date-fns';
import { useEntriesStore } from '../../store/entriesStore';
import './EntryDetailPage.css';

const EntryDetailPage: React.FC = () => {
  const history = useHistory();
  const { id } = useParams<{ id: string }>();

  const { fetchEntry, deleteEntry, selectedEntry, loading } = useEntriesStore();

  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  useEffect(() => {
    // Fetch entry if not already loaded or different entry
    if (!selectedEntry || selectedEntry.id !== id) {
      fetchEntry(id);
    }
  }, [id, selectedEntry, fetchEntry]);

  const handleEdit = () => {
    history.push(`/entries/edit/${id}`);
  };

  const handleDelete = async () => {
    try {
      await deleteEntry(id);
      history.replace('/entries');
    } catch (error) {
      console.error('Failed to delete entry:', error);
    }
  };

  if (loading && !selectedEntry) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/entries" />
            </IonButtons>
            <IonTitle>Loading...</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div className="entry-detail-loading">
            <IonSpinner name="crescent" />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!selectedEntry) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/entries" />
            </IonButtons>
            <IonTitle>Entry Not Found</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div className="entry-detail-error">
            <IonText color="danger">
              <h2>Entry not found</h2>
            </IonText>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/entries" />
          </IonButtons>
          <IonTitle>Entry</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowActionSheet(true)}>
              <IonIcon slot="icon-only" icon={ellipsisVertical} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <div className="entry-detail-header">
          <h1 className="entry-detail-date">
            {format(new Date(selectedEntry.created_at), 'EEEE, MMMM d, yyyy')}
          </h1>
          <IonText color="medium" className="entry-detail-time">
            {format(new Date(selectedEntry.created_at), 'h:mm a')}
          </IonText>
          {selectedEntry.mood && (
            <div className="entry-detail-mood">
              <IonText color="primary">Mood: {selectedEntry.mood}</IonText>
            </div>
          )}
        </div>

        <div className="entry-detail-content">
          <p>{selectedEntry.content}</p>
        </div>

        <div className="entry-detail-footer">
          <IonText color="medium">
            <small>
              Last updated: {format(new Date(selectedEntry.updated_at), 'MMM d, yyyy h:mm a')}
            </small>
          </IonText>
        </div>

        <IonActionSheet
          isOpen={showActionSheet}
          onDidDismiss={() => setShowActionSheet(false)}
          buttons={[
            {
              text: 'Edit',
              icon: create,
              handler: handleEdit,
            },
            {
              text: 'Delete',
              role: 'destructive',
              icon: trash,
              handler: () => setShowDeleteAlert(true),
            },
            {
              text: 'Cancel',
              role: 'cancel',
            },
          ]}
        />

        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header="Delete Entry?"
          message="This action cannot be undone."
          buttons={[
            {
              text: 'Cancel',
              role: 'cancel',
            },
            {
              text: 'Delete',
              role: 'destructive',
              handler: handleDelete,
            },
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default EntryDetailPage;
EOF
```

### 7.2 Create Entry Detail CSS

```bash
# mobile/src/pages/entries/EntryDetailPage.css
cat > mobile/src/pages/entries/EntryDetailPage.css << 'EOF'
.entry-detail-loading,
.entry-detail-error {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 50vh;
}

.entry-detail-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--ion-color-light);
}

.entry-detail-date {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 4px;
}

.entry-detail-time {
  font-size: 14px;
  display: block;
  margin-bottom: 12px;
}

.entry-detail-mood {
  margin-top: 8px;
  padding: 6px 16px;
  background: var(--ion-color-primary-tint);
  border-radius: 16px;
  display: inline-block;
  font-size: 14px;
  font-weight: 500;
  text-transform: capitalize;
}

.entry-detail-content {
  margin: 24px 0;
  line-height: 1.7;
  font-size: 16px;
}

.entry-detail-content p {
  white-space: pre-wrap;
  word-wrap: break-word;
}

.entry-detail-footer {
  margin-top: 32px;
  padding-top: 16px;
  border-top: 1px solid var(--ion-color-light);
  text-align: center;
}
EOF
```

---

## Step 8: Update App Routing (10 minutes)

### 8.1 Update App.tsx with Entry Routes

```bash
# Update mobile/src/App.tsx to add entry routes
cat > mobile/src/App.tsx << 'EOF'
import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { useEffect } from 'react';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import '@ionic/react/css/palettes/dark.system.css';

/* Theme */
import './theme';

/* Pages */
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ProfilePage } from './pages/settings/ProfilePage';
import EntriesListPage from './pages/entries/EntriesListPage';
import EntryDetailPage from './pages/entries/EntryDetailPage';
import EntryEditorPage from './pages/entries/EntryEditorPage';

/* Components */
import { ProtectedRoute } from './components/ProtectedRoute';

/* Store */
import { useAuthStore } from './store/authStore';

setupIonicReact();

const App: React.FC = () => {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <IonApp>
      <IonReactRouter>
        <IonRouterOutlet>
          {/* Public Routes */}
          <Route exact path="/login">
            <LoginPage />
          </Route>
          <Route exact path="/signup">
            <SignupPage />
          </Route>
          <Route exact path="/forgot-password">
            <ForgotPasswordPage />
          </Route>

          {/* Protected Routes */}
          <Route exact path="/entries">
            <ProtectedRoute>
              <EntriesListPage />
            </ProtectedRoute>
          </Route>

          <Route exact path="/entries/new">
            <ProtectedRoute>
              <EntryEditorPage />
            </ProtectedRoute>
          </Route>

          <Route exact path="/entries/edit/:id">
            <ProtectedRoute>
              <EntryEditorPage />
            </ProtectedRoute>
          </Route>

          <Route exact path="/entries/:id">
            <ProtectedRoute>
              <EntryDetailPage />
            </ProtectedRoute>
          </Route>

          <Route exact path="/profile">
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          </Route>

          {/* Default Redirect */}
          <Route exact path="/">
            <Redirect to="/entries" />
          </Route>
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  );
};

export default App;
EOF
```

---

## Step 9: Backend CRUD API (Optional - using Supabase directly) (20 minutes)

**Note:** Since we're using Supabase client directly from the frontend with RLS, a backend API for CRUD is optional. However, for completeness, here's how to add backend endpoints:

### 9.1 Create Entries Controller

```bash
# backend/src/controllers/entries.controller.ts
mkdir -p backend/src/controllers
cat > backend/src/controllers/entries.controller.ts << 'EOF'
import { Request, Response } from 'express';
import { supabase } from '../database/supabase';

/**
 * GET /entries
 * Get all entries for the authenticated user
 */
export const getEntries = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { page = 0, limit = 20 } = req.query;

    const { data, error, count } = await supabase
      .from('entries')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(
        Number(page) * Number(limit),
        (Number(page) + 1) * Number(limit) - 1
      );

    if (error) throw error;

    res.json({
      success: true,
      data: {
        entries: data,
        total: count,
        page: Number(page),
        limit: Number(limit),
        hasMore: (Number(page) + 1) * Number(limit) < (count || 0),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * GET /entries/:id
 * Get a single entry by ID
 */
export const getEntry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Entry not found',
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * POST /entries
 * Create a new entry
 */
export const createEntry = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { content, mood } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Content is required',
      });
    }

    const { data, error } = await supabase
      .from('entries')
      .insert([{ user_id: userId, content, mood }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * PUT /entries/:id
 * Update an existing entry
 */
export const updateEntry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { content, mood } = req.body;

    const { data, error } = await supabase
      .from('entries')
      .update({ content, mood })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Entry not found',
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * DELETE /entries/:id
 * Delete an entry
 */
export const deleteEntry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const { error } = await supabase
      .from('entries')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Entry deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
EOF
```

### 9.2 Create Entries Routes

```bash
# backend/src/routes/entries.routes.ts
cat > backend/src/routes/entries.routes.ts << 'EOF'
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getEntries,
  getEntry,
  createEntry,
  updateEntry,
  deleteEntry,
} from '../controllers/entries.controller';

const router = Router();

// All routes require authentication
router.use(requireAuth);

router.get('/', getEntries);
router.get('/:id', getEntry);
router.post('/', createEntry);
router.put('/:id', updateEntry);
router.delete('/:id', deleteEntry);

export default router;
EOF
```

### 9.3 Update Routes Index

```bash
# Update backend/src/routes/index.ts
cat > backend/src/routes/index.ts << 'EOF'
import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import entriesRoutes from './entries.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/entries', entriesRoutes);

export default router;
EOF
```

---

## Step 10: Testing (30 minutes)

### 10.1 Create Entries Service Tests

```bash
# mobile/src/services/__tests__/entries.service.test.ts
cat > mobile/src/services/__tests__/entries.service.test.ts << 'EOF'
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { entriesService } from '../entries.service';
import { supabase } from '../supabase';

vi.mock('../supabase');

describe('entriesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getEntries', () => {
    it('should fetch paginated entries', async () => {
      const mockEntries = [
        { id: '1', content: 'Entry 1', created_at: new Date().toISOString() },
        { id: '2', content: 'Entry 2', created_at: new Date().toISOString() },
      ];

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: mockEntries,
              error: null,
              count: 10,
            }),
          }),
        }),
      });

      const result = await entriesService.getEntries(0, 20);

      expect(result.entries).toEqual(mockEntries);
      expect(result.total).toBe(10);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('createEntry', () => {
    it('should create a new entry', async () => {
      const mockEntry = { id: '1', content: 'New entry', created_at: new Date().toISOString() };

      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockEntry,
              error: null,
            }),
          }),
        }),
      });

      const result = await entriesService.createEntry({ content: 'New entry' });

      expect(result).toEqual(mockEntry);
    });
  });

  describe('deleteEntry', () => {
    it('should delete an entry', async () => {
      (supabase.from as any).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      await expect(entriesService.deleteEntry('123')).resolves.toBeUndefined();
    });
  });
});
EOF
```

### 10.2 Create E2E Entry Flow Test

```bash
# mobile/cypress/e2e/entries.cy.ts
cat > mobile/cypress/e2e/entries.cy.ts << 'EOF'
describe('Journal Entries Flow', () => {
  beforeEach(() => {
    // Login first (assumes auth works from Phase 2)
    cy.visit('/login');
    cy.get('input[type="email"]').type('test@example.com');
    cy.get('input[type="password"]').type('password123');
    cy.contains('button', 'Login').click();
    cy.url().should('include', '/entries');
  });

  it('should display entries list', () => {
    cy.contains('My Journal').should('be.visible');
  });

  it('should create a new entry', () => {
    // Click FAB button
    cy.get('ion-fab-button').click();
    cy.url().should('include', '/entries/new');

    // Type entry content
    cy.get('ion-textarea').type('This is a test entry from Cypress');

    // Save entry
    cy.contains('button', 'Save').click();

    // Should redirect back to list
    cy.url().should('match', /\/entries$/);

    // Should see the new entry
    cy.contains('This is a test entry from Cypress').should('be.visible');
  });

  it('should view entry details', () => {
    // Click on first entry card
    cy.get('.entry-card').first().click();

    // Should navigate to detail page
    cy.url().should('match', /\/entries\/[a-f0-9-]+$/);
    cy.contains('Entry').should('be.visible');
  });

  it('should edit an entry', () => {
    // Navigate to first entry
    cy.get('.entry-card').first().click();

    // Open action sheet
    cy.get('ion-button[aria-label="more"]').click();

    // Click edit
    cy.contains('Edit').click();

    // Should navigate to edit page
    cy.url().should('include', '/edit/');

    // Modify content
    cy.get('ion-textarea').clear().type('Updated entry content');

    // Save
    cy.contains('button', 'Save').click();

    // Should see updated content
    cy.contains('Updated entry content').should('be.visible');
  });

  it('should delete an entry', () => {
    const entryText = 'Entry to be deleted';

    // Create entry to delete
    cy.get('ion-fab-button').click();
    cy.get('ion-textarea').type(entryText);
    cy.contains('button', 'Save').click();

    // Find and click the entry
    cy.contains(entryText).click();

    // Open action sheet
    cy.get('ion-button[aria-label="more"]').click();

    // Click delete
    cy.contains('Delete').click();

    // Confirm deletion in alert
    cy.contains('button', 'Delete').click();

    // Should navigate back to list
    cy.url().should('match', /\/entries$/);

    // Entry should be gone
    cy.contains(entryText).should('not.exist');
  });
});
EOF
```

---

## Step 11: Manual Testing Checklist (20 minutes)

### 11.1 Test Entry Creation

```bash
# 1. Login to the app
# 2. Navigate to /entries
# 3. Click FAB (+) button
# 4. Type entry content
# 5. Click Save
# 6. Verify redirect to list
# 7. Verify entry appears in list
# 8. Check Supabase Dashboard → Table Editor → entries
#    - Verify entry exists with correct user_id
```

### 11.2 Test Entry List

```bash
# 1. Create multiple entries (5-10)
# 2. Verify they appear in reverse chronological order
# 3. Test pull-to-refresh
# 4. Test infinite scroll (create 30+ entries)
# 5. Verify performance with many entries
```

### 11.3 Test Entry Detail

```bash
# 1. Click on an entry from the list
# 2. Verify all content displays correctly
# 3. Verify date/time formatting
# 4. Test back button navigation
```

### 11.4 Test Entry Editing

```bash
# 1. Open an entry
# 2. Click menu (three dots)
# 3. Click Edit
# 4. Modify content
# 5. Click Save
# 6. Verify changes persist
# 7. Verify updated_at timestamp changes
```

### 11.5 Test Entry Deletion

```bash
# 1. Open an entry
# 2. Click menu (three dots)
# 3. Click Delete
# 4. Verify confirmation alert appears
# 5. Click Delete
# 6. Verify entry removed from list
# 7. Verify entry removed from database
```

### 11.6 Test RLS Security

```bash
# 1. Create entries as User A
# 2. Logout
# 3. Login as User B
# 4. Verify User B cannot see User A's entries
# 5. Try to access User A's entry by direct URL
# 6. Should fail (404 or empty)
```

---

## Step 12: Quality Gates Checklist

### 12.1 Functional Requirements

- [ ] Users can create new journal entries
- [ ] Entries are saved to database with correct user association
- [ ] Users can view all their entries in chronological order
- [ ] Users can view entry details
- [ ] Users can edit existing entries
- [ ] Users can delete entries with confirmation
- [ ] Infinite scroll loads more entries
- [ ] Pull-to-refresh updates entry list

### 12.2 Technical Requirements

- [ ] TypeScript compiles without errors
- [ ] ESLint passes
- [ ] Unit tests pass (npm test)
- [ ] E2E tests pass (manual or automated)
- [ ] Entry list performance is good (< 1s load)
- [ ] No console errors

### 12.3 Security Requirements

- [ ] Row-Level Security prevents cross-user data access
- [ ] Users can only access their own entries
- [ ] Supabase auth token is validated on all requests
- [ ] Entry mutations require authentication

### 12.4 UX Requirements

- [ ] Loading states shown during operations
- [ ] Empty state shown when no entries
- [ ] Success feedback after create/update/delete
- [ ] Error messages are clear and helpful
- [ ] Optimistic UI updates feel instant
- [ ] Deletion requires confirmation
- [ ] Mobile-responsive design works on all screen sizes

---

## Step 13: Update Progress Tracker

```bash
# Update docs/PROGRESS.md

# Change Phase 3 status from "Blocked" to "Complete"
# Update completion date
# Check off all deliverables
# Unlock Phase 4, 5, 6 (change from 🔒 to ⬜)
```

---

## Troubleshooting

### Issue: "Cannot read properties of null (reading 'id')"

**Solution:**
```typescript
// Add null checks in components
if (!selectedEntry) {
  return <div>Loading...</div>;
}
```

### Issue: Entries not appearing after creation

**Solution:**
```bash
# Check Supabase RLS policies
# Ensure auth.uid() matches user_id
# Verify user is authenticated
# Check browser console for errors
```

### Issue: Infinite scroll not working

**Solution:**
```typescript
// Verify hasMore flag is calculated correctly
hasMore: (page + 1) * limit < (count || 0)

// Check IonInfiniteScroll threshold
<IonInfiniteScroll threshold="100px" disabled={!hasMore}>
```

### Issue: Entry editor autofocus not working

**Solution:**
```typescript
// Use autofocus prop and ensure no loading state blocks it
<IonTextarea autofocus />
```

### Issue: Component re-renders/flashes during updates

**Problem:** When updating an entry, the component unmounts and remounts, causing visual "flash"

**Root Cause:**
1. `loading` state in store changes during update
2. Parent component (ProtectedRoute or useEffect) responds to loading changes
3. Component unmounts/remounts

**Solution:**
```typescript
// In components, use isInitialized flag to prevent re-initialization
const [isInitialized, setIsInitialized] = useState(false);

useEffect(() => {
  if (isEditMode && !isInitialized) {
    if (selectedEntry?.id !== id) {
      fetchEntry(id);
    } else {
      setContent(selectedEntry.content);
      setIsInitialized(true);
    }
  }
}, [id, isEditMode, selectedEntry, fetchEntry, isInitialized]);

// In ProtectedRoute, only check initialized, not loading
if (!initialized) {
  return <IonSpinner />;
}
```

### Issue: TypeScript error - MoodType doesn't include 'neutral'

**Problem:** Database has 6 mood values but TypeScript type only has 5

**Solution:**
```typescript
// Include all moods from database enum (00_types.sql)
export type MoodType = 'happy' | 'sad' | 'anxious' | 'calm' | 'stressed' | 'neutral';
```

### Issue: Import errors in App.tsx

**Problem:** Auth page components use named exports, not default exports

**Solution:**
```typescript
// Use named imports for auth pages
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ProfilePage } from './pages/settings/ProfilePage';

// ProtectedRoute is in components/, not components/auth/
import { ProtectedRoute } from './components/ProtectedRoute';
```

---

## Next Steps

**Phase 3 Complete!** 🎉

You now have:
- ✅ Full CRUD operations for journal entries
- ✅ Entry list with infinite scroll
- ✅ Entry creation and editing
- ✅ Entry detail view with delete
- ✅ Row-Level Security protecting user data
- ✅ Optimistic UI updates

**Ready for Parallel Phases 4, 5, and 6:**
- Phase 4: Mood Tracking (Simple - can start now)
- Phase 5: Search & Filtering (Moderate - can start now)
- Phase 6: Basic AI Integration (Complex - can start now)

All three phases can be developed in parallel as they all depend only on Phase 3.

---

## Reference Commands

```bash
# Development
npm run dev                    # Start Ionic dev server
cd backend && npm run dev      # Start backend server

# Testing
npm test                       # Run unit tests
npm run test.e2e               # Run E2E tests

# Database
npx supabase db push           # Apply schema changes

# Build
npm run build                  # Production build
```

---

**Estimated Total Time:** 4-5 hours
**Complexity:** Moderate
**Prerequisites:** Phase 1 & 2 complete

**Deliverables:**
✅ Entry list screen with infinite scroll
✅ Entry creation/editing screen
✅ Entry detail view screen
✅ Backend API with full CRUD operations (optional)
✅ Database RLS policies
✅ Critical path tests
