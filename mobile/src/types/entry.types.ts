export type MoodType = 'happy' | 'sad' | 'anxious' | 'calm' | 'stressed' | 'neutral';

export interface Entry {
  id: string;
  user_id: string;
  content: string;
  mood: MoodType | null;
  created_at: string;
  updated_at: string;
}

export interface CreateEntryData {
  content: string;
  user_id: string;
  mood?: MoodType | null;
}

export interface UpdateEntryData {
  content?: string;
  mood?: MoodType | null;
}

export interface EntryFilters {
  mood?: MoodType;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

export interface EntriesResponse {
  entries: Entry[];
  total: number;
  hasMore: boolean;
}

export interface SearchResult extends Entry {
  rank?: number;
  highlights?: string[];
}
