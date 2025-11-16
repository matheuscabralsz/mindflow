// User types
export interface User {
  id: string;
  email: string;
  createdAt: string;
}

// Entry types
export interface Entry {
  id: string;
  userId: string;
  content: string;
  mood?: Mood;
  createdAt: string;
  updatedAt: string;
}

export type Mood = 'happy' | 'sad' | 'anxious' | 'calm' | 'stressed' | 'neutral';

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

// Entry creation/update DTOs
export interface CreateEntryDto {
  content: string;
  mood?: Mood;
}

export interface UpdateEntryDto {
  content?: string;
  mood?: Mood;
}

// Pagination types
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
