export interface SentimentAnalysis {
  score: number;
  label: 'positive' | 'neutral' | 'negative';
  confidence?: number;
  emotions?: string[];
  cached?: boolean;
}

export interface Summary {
  summary: string;
  keyThemes: string[];
  overallMood: string;
  insights: string[];
  entryCount: number;
  cached?: boolean;
  cachedAt?: string;
}

export interface AIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  resetAt?: string;
}
