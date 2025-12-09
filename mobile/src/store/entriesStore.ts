/**
 * Entries Store
 * Global state management for journal entries using Zustand
 */

import { create } from 'zustand';
import type { Entry, CreateEntryData, UpdateEntryData } from '../types';
import * as entriesService from '../services/entries.service';

interface EntriesState {
  // State
  entries: Entry[];
  selectedEntry: Entry | null;
  loading: boolean;
  error: string | null;
  lastFetchTime: number | null;

  // Actions
  fetchEntries: (force?: boolean) => Promise<void>;
  fetchEntry: (id: string) => Promise<void>;
  fetchEntryByDate: (entryDate: string) => Promise<Entry | null>;
  fetchOrCreateEntryByDate: (entryDate: string, userId: string) => Promise<Entry>;
  createEntry: (data: CreateEntryData) => Promise<Entry>;
  updateEntry: (id: string, data: UpdateEntryData) => Promise<Entry>;
  deleteEntry: (id: string) => Promise<void>;
  deleteEntryByDate: (entryDate: string) => Promise<void>;
  setSelectedEntry: (entry: Entry | null) => void;
  clearError: () => void;
  clearEntries: () => void;
}

// Track in-flight requests to prevent duplicates
let fetchEntriesPromise: Promise<void> | null = null;

// Cache duration in milliseconds (5 seconds - prevents rapid duplicate calls)
const CACHE_DURATION = 5000;

export const useEntriesStore = create<EntriesState>((set, get) => ({
  // Initial state
  entries: [],
  selectedEntry: null,
  loading: false,
  error: null,
  lastFetchTime: null,

  // Fetch all entries with deduplication
  fetchEntries: async (force = false) => {
    const state = get();
    const now = Date.now();

    // Skip if we have recent data (unless forced)
    if (!force && state.lastFetchTime && now - state.lastFetchTime < CACHE_DURATION) {
      return;
    }

    // If a fetch is already in progress, wait for it instead of starting a new one
    if (fetchEntriesPromise) {
      return fetchEntriesPromise;
    }

    set({ loading: true, error: null });

    fetchEntriesPromise = (async () => {
      try {
        const entries = await entriesService.getAllEntries();
        set({ entries, loading: false, lastFetchTime: Date.now() });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch entries';
        set({ error: errorMessage, loading: false });
        throw error;
      } finally {
        fetchEntriesPromise = null;
      }
    })();

    return fetchEntriesPromise;
  },

  // Fetch single entry by ID
  fetchEntry: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const entry = await entriesService.getEntryById(id);
      set({ selectedEntry: entry, loading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch entry';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Fetch entry by date (returns null if not found)
  fetchEntryByDate: async (entryDate: string) => {
    set({ loading: true, error: null });
    try {
      const entry = await entriesService.getEntryByDate(entryDate);
      set({ selectedEntry: entry, loading: false });
      return entry;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch entry';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Fetch or create entry by date
  fetchOrCreateEntryByDate: async (entryDate: string, userId: string) => {
    set({ loading: true, error: null });
    try {
      const entry = await entriesService.getOrCreateEntry(entryDate, userId);
      set({ selectedEntry: entry, loading: false });
      return entry;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch entry';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Create new entry
  createEntry: async (data: CreateEntryData) => {
    set({ loading: true, error: null });
    try {
      const newEntry = await entriesService.createEntry(data);

      // Add to entries list (prepend since we sort by newest first)
      set((state) => ({
        entries: [newEntry, ...state.entries],
        loading: false,
      }));

      return newEntry;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create entry';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Update existing entry
  updateEntry: async (id: string, data: UpdateEntryData) => {
    set({ loading: true, error: null });
    try {
      const updatedEntry = await entriesService.updateEntry(id, data);

      // Update in entries list
      set((state) => ({
        entries: state.entries.map((entry) =>
          entry.id === id ? updatedEntry : entry
        ),
        selectedEntry: state.selectedEntry?.id === id ? updatedEntry : state.selectedEntry,
        loading: false,
      }));

      return updatedEntry;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update entry';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Delete entry
  deleteEntry: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await entriesService.deleteEntry(id);

      // Remove from entries list
      set((state) => ({
        entries: state.entries.filter((entry) => entry.id !== id),
        selectedEntry: state.selectedEntry?.id === id ? null : state.selectedEntry,
        loading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete entry';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Delete entry by date
  deleteEntryByDate: async (entryDate: string) => {
    set({ loading: true, error: null });
    try {
      await entriesService.deleteEntryByDate(entryDate);

      // Remove from entries list
      set((state) => ({
        entries: state.entries.filter((entry) => entry.entry_date !== entryDate),
        selectedEntry: state.selectedEntry?.entry_date === entryDate ? null : state.selectedEntry,
        loading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete entry';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Set selected entry
  setSelectedEntry: (entry: Entry | null) => {
    set({ selectedEntry: entry });
  },

  // Clear error message
  clearError: () => {
    set({ error: null });
  },

  // Clear all entries (for logout)
  clearEntries: () => {
    set({ entries: [], selectedEntry: null, error: null, lastFetchTime: null });
  },
}));
