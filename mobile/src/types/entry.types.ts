export type MoodType = 'happy' | 'sad' | 'anxious' | 'calm' | 'stressed' | 'neutral';

export type SentimentLabel = 'positive' | 'neutral' | 'negative';

export interface EntryImage {
  id: string;
  entry_id: string;
  user_id: string;
  storage_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  display_order: number;
  created_at: string;
  url?: string; // Signed URL for display
}

export interface Entry {
  id: string;
  user_id: string;
  entry_date: string; // YYYY-MM-DD format
  content: string;
  mood: MoodType | null;
  sentiment_score: number | null;
  sentiment_label: SentimentLabel | null;
  created_at: string;
  updated_at: string;
  images?: EntryImage[];
}

export interface CreateEntryData {
  content: string;
  user_id: string;
  entry_date: string; // YYYY-MM-DD format
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
