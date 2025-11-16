export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface Entry {
  id: string;
  userId: string;
  content: string;
  mood?: Mood;
  createdAt: string;
  updatedAt: string;
}

export type Mood = 'happy' | 'sad' | 'anxious' | 'calm' | 'stressed' | 'neutral';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
