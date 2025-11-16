import { Mood } from './types';

export const MOODS: Mood[] = ['happy', 'sad', 'anxious', 'calm', 'stressed', 'neutral'];

export const MOOD_LABELS: Record<Mood, string> = {
  happy: 'Happy',
  sad: 'Sad',
  anxious: 'Anxious',
  calm: 'Calm',
  stressed: 'Stressed',
  neutral: 'Neutral',
};

export const MOOD_EMOJIS: Record<Mood, string> = {
  happy: '😊',
  sad: '😢',
  anxious: '😰',
  calm: '😌',
  stressed: '😫',
  neutral: '😐',
};

export const API_ENDPOINTS = {
  AUTH: {
    SIGNUP: '/auth/signup',
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    RESET_PASSWORD: '/auth/reset-password',
  },
  ENTRIES: {
    LIST: '/entries',
    CREATE: '/entries',
    GET: (id: string) => `/entries/${id}`,
    UPDATE: (id: string) => `/entries/${id}`,
    DELETE: (id: string) => `/entries/${id}`,
  },
};
