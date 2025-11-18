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

  // Actions
  fetchEntries: () => Promise<void>;
  fetchEntry: (id: string) => Promise<void>;
  createEntry: (data: CreateEntryData) => Promise<Entry>;
  updateEntry: (id: string, data: UpdateEntryData) => Promise<Entry>;
  deleteEntry: (id: string) => Promise<void>;
  setSelectedEntry: (entry: Entry | null) => void;
  clearError: () => void;
  clearEntries: () => void;
}

export const useEntriesStore = create<EntriesState>((set) => ({
  // Initial state
  entries: [],
  selectedEntry: null,
  loading: false,
  error: null,

  // Fetch all entries
  fetchEntries: async () => {
    set({ loading: true, error: null });
    try {
      const entries = await entriesService.getAllEntries();
      set({ entries, loading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch entries';
      set({ error: errorMessage, loading: false });
      throw error;
    }
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
    set({ entries: [], selectedEntry: null, error: null });
  },
}));
