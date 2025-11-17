export type MoodType = 'happy' | 'sad' | 'anxious' | 'calm' | 'stressed' | 'neutral';

export interface Entry {
  id: string;
  user_id: string;
  content: string;
  mood: MoodType | null;
  created_at: string;
  updated_at: string;
}

export interface CreateEntryDto {
  content: string;
  mood?: MoodType;
}

export interface UpdateEntryDto {
  content?: string;
  mood?: MoodType;
}
