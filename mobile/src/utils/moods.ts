/**
 * Centralized mood configuration and utilities
 * Prevents code duplication across components
 */

import type { MoodType } from '../types';

export interface MoodConfig {
  value: MoodType;
  label: string;
  emoji: string;
  color: string;
  description: string;
}

export const MOODS: MoodConfig[] = [
  {
    value: 'happy',
    label: 'Happy',
    emoji: '😊',
    color: '#10B981',
    description: 'Feeling joyful and content',
  },
  {
    value: 'sad',
    label: 'Sad',
    emoji: '😢',
    color: '#3B82F6',
    description: 'Feeling down or melancholic',
  },
  {
    value: 'anxious',
    label: 'Anxious',
    emoji: '😰',
    color: '#F59E0B',
    description: 'Feeling worried or uneasy',
  },
  {
    value: 'calm',
    label: 'Calm',
    emoji: '😌',
    color: '#8B5CF6',
    description: 'Feeling peaceful and relaxed',
  },
  {
    value: 'stressed',
    label: 'Stressed',
    emoji: '😫',
    color: '#EF4444',
    description: 'Feeling overwhelmed or pressured',
  },
  {
    value: 'neutral',
    label: 'Neutral',
    emoji: '😐',
    color: '#6B7280',
    description: 'Feeling neither positive nor negative',
  },
];

/**
 * Get full mood configuration by mood value
 */
export const getMoodConfig = (mood: MoodType | null): MoodConfig | null => {
  if (!mood) return null;
  return MOODS.find((m) => m.value === mood) || null;
};

/**
 * Get mood emoji
 */
export const getMoodEmoji = (mood: MoodType | null): string => {
  const config = getMoodConfig(mood);
  return config?.emoji || '';
};

/**
 * Get mood color
 */
export const getMoodColor = (mood: MoodType | null): string => {
  const config = getMoodConfig(mood);
  return config?.color || '#6B7280';
};

/**
 * Get mood label
 */
export const getMoodLabel = (mood: MoodType | null): string => {
  const config = getMoodConfig(mood);
  return config?.label || '';
};

/**
 * Get mood description
 */
export const getMoodDescription = (mood: MoodType | null): string => {
  const config = getMoodConfig(mood);
  return config?.description || '';
};
