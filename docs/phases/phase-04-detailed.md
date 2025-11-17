# Phase 4: Mood Tracking Integration - Detailed Implementation Plan

## Overview
Add mood tracking functionality to journal entries, allowing users to tag entries with their emotional state. Users can select from predefined moods when creating or editing entries, filter entries by mood, and view basic mood analytics over time.

## Goals
- Users can select a mood when creating/editing entries
- Moods are stored with entries and displayed in lists/details
- Users can filter entries by mood
- Basic mood analytics show distribution over time
- Mood selection is intuitive and visually appealing
- Mood data enables future AI pattern recognition

---

## Database Schema

### Update Entries Table

```sql
-- Create mood enum type
CREATE TYPE mood_type AS ENUM (
  'happy',
  'sad',
  'anxious',
  'calm',
  'stressed',
  'excited',
  'angry',
  'neutral'
);

-- Add mood column to entries table
ALTER TABLE entries
ADD COLUMN mood mood_type;

-- Create index for mood filtering
CREATE INDEX idx_entries_mood ON entries(mood);
CREATE INDEX idx_entries_user_mood ON entries(user_id, mood);

-- Add comment
COMMENT ON COLUMN entries.mood IS 'User emotional state when writing entry';
```

### Create Mood Stats View (Optional)

```sql
-- Create view for mood statistics
CREATE OR REPLACE VIEW user_mood_stats AS
SELECT
  user_id,
  mood,
  COUNT(*) as count,
  DATE_TRUNC('week', created_at) as week,
  DATE_TRUNC('month', created_at) as month
FROM entries
WHERE mood IS NOT NULL
GROUP BY user_id, mood, week, month;

-- Add comment
COMMENT ON VIEW user_mood_stats IS 'Aggregated mood statistics by user, week, and month';
```

### Migration File
Create using Supabase CLI:
```bash
npx supabase migration new add_mood_tracking
# This creates: supabase/migrations/YYYYMMDDHHMMSS_add_mood_tracking.sql
```

---

## Backend Implementation

### 1. Update TypeScript Types

**File:** `backend/src/types/entry.types.ts` (update existing)
```typescript
export type MoodType =
  | 'happy'
  | 'sad'
  | 'anxious'
  | 'calm'
  | 'stressed'
  | 'excited'
  | 'angry'
  | 'neutral';

export interface Entry {
  id: string;
  user_id: string;
  content: string;
  title?: string;
  mood?: MoodType; // Add mood field
  created_at: string;
  updated_at: string;
}

export interface CreateEntryDto {
  content: string;
  title?: string;
  mood?: MoodType; // Add mood field
}

export interface UpdateEntryDto {
  content?: string;
  title?: string;
  mood?: MoodType; // Add mood field
}

export interface EntryListQuery {
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
  mood?: MoodType; // Add mood filter
}

export interface MoodStats {
  mood: MoodType;
  count: number;
  percentage: number;
}

export interface MoodAnalytics {
  totalEntries: number;
  entriesWithMood: number;
  moodDistribution: MoodStats[];
  mostFrequentMood: MoodType | null;
  recentMoods: Array<{
    date: string;
    mood: MoodType;
  }>;
}
```

### 2. Update Validation Schemas

**File:** `backend/src/middleware/validation.middleware.ts` (update existing)
```typescript
const moodEnum = z.enum([
  'happy',
  'sad',
  'anxious',
  'calm',
  'stressed',
  'excited',
  'angry',
  'neutral',
]);

export const entrySchemas = {
  create: z.object({
    content: z.string()
      .min(1, 'Content cannot be empty')
      .max(100000, 'Content too long (max 100,000 characters)')
      .refine(val => val.trim().length > 0, 'Content cannot be only whitespace'),
    title: z.string()
      .max(200, 'Title too long (max 200 characters)')
      .optional(),
    mood: moodEnum.optional(), // Add mood validation
  }),

  update: z.object({
    content: z.string()
      .min(1, 'Content cannot be empty')
      .max(100000, 'Content too long (max 100,000 characters)')
      .refine(val => val.trim().length > 0, 'Content cannot be only whitespace')
      .optional(),
    title: z.string()
      .max(200, 'Title too long (max 200 characters)')
      .optional(),
    mood: moodEnum.optional(), // Add mood validation
  }).refine(
    data => data.content !== undefined || data.title !== undefined || data.mood !== undefined,
    'At least one field must be provided for update'
  ),

  list: z.object({
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    offset: z.coerce.number().int().min(0).optional().default(0),
    sortBy: z.enum(['created_at', 'updated_at']).optional().default('created_at'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    mood: moodEnum.optional(), // Add mood filter
  }),
};
```

### 3. Update Entry Service

**File:** `backend/src/services/entries.service.ts` (update existing)
```typescript
import { supabase } from '../config/supabase';
import {
  Entry,
  CreateEntryDto,
  UpdateEntryDto,
  EntryListQuery,
  PaginatedEntries,
  MoodAnalytics,
  MoodStats,
  MoodType,
} from '../types/entry.types';

export class EntriesService {
  // Update createEntry to include mood
  async createEntry(userId: string, data: CreateEntryDto): Promise<Entry> {
    const { content, title, mood } = data;

    const finalTitle = title || this.extractTitle(content);

    const { data: entry, error } = await supabase
      .from('entries')
      .insert([
        {
          user_id: userId,
          content: content.trim(),
          title: finalTitle,
          mood: mood || null, // Add mood
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Create entry error:', error);
      throw new Error('Failed to create entry');
    }

    return entry;
  }

  // Update getUserEntries to support mood filtering
  async getUserEntries(
    userId: string,
    query: EntryListQuery
  ): Promise<PaginatedEntries> {
    const {
      limit = 20,
      offset = 0,
      sortBy = 'created_at',
      sortOrder = 'desc',
      mood,
    } = query;

    // Build query
    let countQuery = supabase
      .from('entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    let dataQuery = supabase
      .from('entries')
      .select('*')
      .eq('user_id', userId);

    // Apply mood filter if provided
    if (mood) {
      countQuery = countQuery.eq('mood', mood);
      dataQuery = dataQuery.eq('mood', mood);
    }

    // Get total count
    const { count } = await countQuery;

    // Get paginated entries
    const { data: entries, error } = await dataQuery
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Get entries error:', error);
      throw new Error('Failed to fetch entries');
    }

    const total = count || 0;
    const hasMore = offset + limit < total;

    return {
      entries: entries || [],
      total,
      limit,
      offset,
      hasMore,
    };
  }

  // Update updateEntry to include mood
  async updateEntry(
    userId: string,
    entryId: string,
    updates: UpdateEntryDto
  ): Promise<Entry> {
    const updateData: any = {};

    if (updates.content !== undefined) {
      updateData.content = updates.content.trim();
    }

    if (updates.title !== undefined) {
      updateData.title = updates.title;
    }

    if (updates.mood !== undefined) {
      updateData.mood = updates.mood;
    }

    // Auto-generate title if content changed but title not provided
    if (updates.content && updates.title === undefined) {
      updateData.title = this.extractTitle(updates.content);
    }

    const { data: entry, error } = await supabase
      .from('entries')
      .update(updateData)
      .eq('id', entryId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Entry not found');
      }
      console.error('Update entry error:', error);
      throw new Error('Failed to update entry');
    }

    return entry;
  }

  // New: Get mood analytics
  async getMoodAnalytics(
    userId: string,
    days: number = 30
  ): Promise<MoodAnalytics> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all entries with moods in date range
    const { data: entries, error } = await supabase
      .from('entries')
      .select('mood, created_at')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get mood analytics error:', error);
      throw new Error('Failed to fetch mood analytics');
    }

    const totalEntries = entries?.length || 0;
    const entriesWithMood = entries?.filter((e) => e.mood !== null).length || 0;

    // Calculate mood distribution
    const moodCounts: { [key: string]: number } = {};
    entries?.forEach((entry) => {
      if (entry.mood) {
        moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
      }
    });

    const moodDistribution: MoodStats[] = Object.entries(moodCounts)
      .map(([mood, count]) => ({
        mood: mood as MoodType,
        count,
        percentage: (count / entriesWithMood) * 100,
      }))
      .sort((a, b) => b.count - a.count);

    const mostFrequentMood =
      moodDistribution.length > 0 ? moodDistribution[0].mood : null;

    // Get recent moods (last 7 days)
    const recentMoods = entries
      ?.filter((e) => e.mood !== null)
      .slice(0, 7)
      .map((e) => ({
        date: e.created_at,
        mood: e.mood as MoodType,
      })) || [];

    return {
      totalEntries,
      entriesWithMood,
      moodDistribution,
      mostFrequentMood,
      recentMoods,
    };
  }

  // New: Get mood counts by mood type
  async getMoodCounts(userId: string): Promise<MoodStats[]> {
    const { data: entries, error } = await supabase
      .from('entries')
      .select('mood')
      .eq('user_id', userId)
      .not('mood', 'is', null);

    if (error) {
      console.error('Get mood counts error:', error);
      return [];
    }

    const moodCounts: { [key: string]: number } = {};
    entries?.forEach((entry) => {
      if (entry.mood) {
        moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
      }
    });

    const total = entries?.length || 0;

    return Object.entries(moodCounts)
      .map(([mood, count]) => ({
        mood: mood as MoodType,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }

  // Existing methods remain unchanged...
  private extractTitle(content: string): string {
    const firstLine = content.split('\n')[0].trim();
    return firstLine.length > 200
      ? firstLine.substring(0, 197) + '...'
      : firstLine;
  }
}

export const entriesService = new EntriesService();
```

### 4. Update Entry Controller

**File:** `backend/src/controllers/entries.controller.ts` (add new methods)
```typescript
export const entriesController = {
  // Existing methods remain unchanged...

  // New: Get mood analytics
  getMoodAnalytics: async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const days = parseInt(req.query.days as string) || 30;

      const analytics = await entriesService.getMoodAnalytics(userId, days);

      return res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error: any) {
      console.error('Get mood analytics error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch mood analytics',
      });
    }
  },

  // New: Get mood counts
  getMoodCounts: async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      const counts = await entriesService.getMoodCounts(userId);

      return res.status(200).json({
        success: true,
        data: counts,
      });
    } catch (error: any) {
      console.error('Get mood counts error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch mood counts',
      });
    }
  },
};
```

### 5. Update Entry Routes

**File:** `backend/src/routes/entries.routes.ts` (add new routes)
```typescript
// Add new routes before the :id routes
router.get('/analytics/mood', entriesController.getMoodAnalytics);
router.get('/mood/counts', entriesController.getMoodCounts);
```

---

## Frontend Implementation

### 1. Update TypeScript Types

**File:** `mobile/src/types/entry.types.ts` (update existing)
```typescript
export type MoodType =
  | 'happy'
  | 'sad'
  | 'anxious'
  | 'calm'
  | 'stressed'
  | 'excited'
  | 'angry'
  | 'neutral';

export interface Entry {
  id: string;
  user_id: string;
  content: string;
  title?: string;
  mood?: MoodType; // Add mood
  created_at: string;
  updated_at: string;
}

export interface CreateEntryData {
  content: string;
  title?: string;
  mood?: MoodType; // Add mood
}

export interface UpdateEntryData {
  content?: string;
  title?: string;
  mood?: MoodType; // Add mood
}

export interface EntryListParams {
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
  mood?: MoodType; // Add mood filter
}

export interface MoodStats {
  mood: MoodType;
  count: number;
  percentage: number;
}

export interface MoodAnalytics {
  totalEntries: number;
  entriesWithMood: number;
  moodDistribution: MoodStats[];
  mostFrequentMood: MoodType | null;
  recentMoods: Array<{
    date: string;
    mood: MoodType;
  }>;
}
```

### 2. Mood Configuration

**File:** `mobile/src/utils/mood.ts`
```typescript
import { MoodType } from '../types/entry.types';

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
    color: '#FFD700',
    description: 'Feeling joyful and content',
  },
  {
    value: 'excited',
    label: 'Excited',
    emoji: '🤩',
    color: '#FF6B6B',
    description: 'Full of energy and enthusiasm',
  },
  {
    value: 'calm',
    label: 'Calm',
    emoji: '😌',
    color: '#4ECDC4',
    description: 'Peaceful and relaxed',
  },
  {
    value: 'sad',
    label: 'Sad',
    emoji: '😢',
    color: '#95A5A6',
    description: 'Feeling down or melancholy',
  },
  {
    value: 'anxious',
    label: 'Anxious',
    emoji: '😰',
    color: '#9B59B6',
    description: 'Worried or uneasy',
  },
  {
    value: 'stressed',
    label: 'Stressed',
    emoji: '😫',
    color: '#E74C3C',
    description: 'Overwhelmed or pressured',
  },
  {
    value: 'angry',
    label: 'Angry',
    emoji: '😠',
    color: '#C0392B',
    description: 'Frustrated or irritated',
  },
  {
    value: 'neutral',
    label: 'Neutral',
    emoji: '😐',
    color: '#BDC3C7',
    description: 'Neither good nor bad',
  },
];

export const getMoodConfig = (mood: MoodType): MoodConfig => {
  return MOODS.find((m) => m.value === mood) || MOODS[7]; // Default to neutral
};

export const getMoodEmoji = (mood?: MoodType): string => {
  if (!mood) return '';
  return getMoodConfig(mood).emoji;
};

export const getMoodColor = (mood?: MoodType): string => {
  if (!mood) return '#BDC3C7';
  return getMoodConfig(mood).color;
};

export const getMoodLabel = (mood?: MoodType): string => {
  if (!mood) return 'No mood';
  return getMoodConfig(mood).label;
};
```

### 3. Update Entries Service

**File:** `mobile/src/services/entries.service.ts` (add new methods)
```typescript
import { MoodAnalytics, MoodStats } from '../types/entry.types';

export const entriesService = {
  // Existing methods remain unchanged...

  // New: Get mood analytics
  getMoodAnalytics: async (days: number = 30): Promise<MoodAnalytics> => {
    const response = await apiClient.get<{
      success: boolean;
      data: MoodAnalytics;
    }>(`/entries/analytics/mood?days=${days}`);
    return response.data.data;
  },

  // New: Get mood counts
  getMoodCounts: async (): Promise<MoodStats[]> => {
    const response = await apiClient.get<{
      success: boolean;
      data: MoodStats[];
    }>('/entries/mood/counts');
    return response.data.data;
  },
};
```

### 4. Mood Picker Component

**File:** `mobile/src/components/mood/MoodPicker.tsx`
```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MoodType } from '../../types/entry.types';
import { MOODS, getMoodConfig } from '../../utils/mood';

interface Props {
  selectedMood?: MoodType;
  onSelectMood: (mood: MoodType | undefined) => void;
  compact?: boolean;
}

export const MoodPicker = ({ selectedMood, onSelectMood, compact = false }: Props) => {
  const handleMoodPress = (mood: MoodType) => {
    // If already selected, unselect
    if (selectedMood === mood) {
      onSelectMood(undefined);
    } else {
      onSelectMood(mood);
    }
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        {MOODS.map((mood) => (
          <TouchableOpacity
            key={mood.value}
            style={[
              styles.compactMoodButton,
              selectedMood === mood.value && styles.compactMoodButtonSelected,
              { borderColor: mood.color },
            ]}
            onPress={() => handleMoodPress(mood.value)}
          >
            <Text style={styles.moodEmoji}>{mood.emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>How are you feeling?</Text>
      <View style={styles.moodGrid}>
        {MOODS.map((mood) => {
          const isSelected = selectedMood === mood.value;
          return (
            <TouchableOpacity
              key={mood.value}
              style={[
                styles.moodButton,
                isSelected && styles.moodButtonSelected,
                { borderColor: mood.color },
              ]}
              onPress={() => handleMoodPress(mood.value)}
            >
              <Text style={styles.moodEmoji}>{mood.emoji}</Text>
              <Text style={[styles.moodLabel, isSelected && styles.moodLabelSelected]}>
                {mood.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {selectedMood && (
        <Text style={styles.description}>
          {getMoodConfig(selectedMood).description}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#1a1a1a',
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  moodButton: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  moodButtonSelected: {
    backgroundColor: '#f0f8ff',
    borderWidth: 3,
  },
  moodEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  moodLabelSelected: {
    fontWeight: '600',
    color: '#1a1a1a',
  },
  description: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  compactContainer: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
  },
  compactMoodButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactMoodButtonSelected: {
    backgroundColor: '#f0f8ff',
    borderWidth: 3,
  },
});
```

### 5. Mood Badge Component

**File:** `mobile/src/components/mood/MoodBadge.tsx`
```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MoodType } from '../../types/entry.types';
import { getMoodEmoji, getMoodColor, getMoodLabel } from '../../utils/mood';

interface Props {
  mood?: MoodType;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

export const MoodBadge = ({ mood, size = 'medium', showLabel = false }: Props) => {
  if (!mood) return null;

  const emoji = getMoodEmoji(mood);
  const color = getMoodColor(mood);
  const label = getMoodLabel(mood);

  const sizeStyles = {
    small: { width: 24, height: 24, fontSize: 14 },
    medium: { width: 32, height: 32, fontSize: 18 },
    large: { width: 48, height: 48, fontSize: 28 },
  };

  const containerSize = sizeStyles[size];

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.badge,
          {
            width: containerSize.width,
            height: containerSize.height,
            backgroundColor: color + '20', // 20% opacity
            borderColor: color,
          },
        ]}
      >
        <Text style={{ fontSize: containerSize.fontSize }}>{emoji}</Text>
      </View>
      {showLabel && <Text style={styles.label}>{label}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 4,
  },
  badge: {
    borderRadius: 100,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    color: '#666',
  },
});
```

### 6. Update Entry Editor Screen

**File:** `mobile/src/screens/entries/EntryEditorScreen.tsx` (update to include mood)
```typescript
import { MoodPicker } from '../../components/mood/MoodPicker';
import { MoodType } from '../../types/entry.types';

// Add mood state
const [mood, setMood] = useState<MoodType | undefined>(undefined);

// Update useEffect to load mood
useEffect(() => {
  if (selectedEntry && isEditing) {
    setContent(selectedEntry.content);
    setMood(selectedEntry.mood);
  }
}, [selectedEntry]);

// Update handleSave to include mood
const handleSave = async () => {
  if (!content.trim()) {
    Alert.alert('Empty Entry', 'Please write something before saving');
    return;
  }

  setIsSaving(true);

  try {
    if (isEditing) {
      await updateEntry(entryId, {
        content: content.trim(),
        mood,
      });
      Alert.alert('Success', 'Entry updated successfully');
    } else {
      const newEntry = await createEntry({
        content: content.trim(),
        mood,
      });
      navigation.replace('EntryDetail', { id: newEntry.id });
      return;
    }
    navigation.goBack();
  } catch (error: any) {
    Alert.alert(
      'Error',
      error.response?.data?.error || 'Failed to save entry'
    );
  } finally {
    setIsSaving(false);
  }
};

// Add MoodPicker above the text input
return (
  <KeyboardAvoidingView
    style={styles.container}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  >
    {/* Header remains the same */}

    <MoodPicker selectedMood={mood} onSelectMood={setMood} />

    <ScrollView
      style={styles.editorContainer}
      keyboardDismissMode="interactive"
    >
      <TextInput
        // ... existing props
      />
    </ScrollView>

    {/* Footer remains the same */}
  </KeyboardAvoidingView>
);
```

### 7. Update Entry List Screen

**File:** `mobile/src/screens/entries/EntryListScreen.tsx` (add mood badge and filter)
```typescript
import { MoodBadge } from '../../components/mood/MoodBadge';
import { MoodType } from '../../types/entry.types';

// Add mood filter state
const [moodFilter, setMoodFilter] = useState<MoodType | undefined>(undefined);

// Update renderEntry to show mood
const renderEntry = ({ item }: { item: Entry }) => (
  <TouchableOpacity
    style={styles.entryCard}
    onPress={() => navigation.navigate('EntryDetail', { id: item.id })}
  >
    <View style={styles.entryHeader}>
      <View style={styles.entryTitleContainer}>
        {item.mood && <MoodBadge mood={item.mood} size="small" />}
        <Text style={styles.entryTitle} numberOfLines={1}>
          {item.title || 'Untitled'}
        </Text>
      </View>
      <Text style={styles.entryDate}>{formatEntryDate(item.created_at)}</Text>
    </View>
    <Text style={styles.entryContent} numberOfLines={3}>
      {item.content}
    </Text>
  </TouchableOpacity>
);

// Add styles for mood badge in list
const styles = StyleSheet.create({
  // ... existing styles
  entryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
});
```

### 8. Update Entry Detail Screen

**File:** `mobile/src/screens/entries/EntryDetailScreen.tsx` (show mood)
```typescript
import { MoodBadge } from '../../components/mood/MoodBadge';

// Add mood display after date
<ScrollView style={styles.content}>
  <Text style={styles.title}>{selectedEntry.title || 'Untitled'}</Text>
  <Text style={styles.date}>
    {formatFullDate(selectedEntry.created_at)}
  </Text>
  {selectedEntry.updated_at !== selectedEntry.created_at && (
    <Text style={styles.updatedText}>
      Last edited {formatFullDate(selectedEntry.updated_at)}
    </Text>
  )}
  {selectedEntry.mood && (
    <View style={styles.moodContainer}>
      <MoodBadge mood={selectedEntry.mood} size="medium" showLabel />
    </View>
  )}
  <Text style={styles.entryContent}>{selectedEntry.content}</Text>
</ScrollView>

// Add style
const styles = StyleSheet.create({
  // ... existing styles
  moodContainer: {
    alignItems: 'flex-start',
    marginBottom: 16,
  },
});
```

### 9. Mood Analytics Screen

**File:** `mobile/src/screens/insights/MoodAnalyticsScreen.tsx`
```typescript
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { entriesService } from '../../services/entries.service';
import { MoodAnalytics } from '../../types/entry.types';
import { MoodBadge } from '../../components/mood/MoodBadge';
import { getMoodConfig } from '../../utils/mood';

export const MoodAnalyticsScreen = () => {
  const [analytics, setAnalytics] = useState<MoodAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const data = await entriesService.getMoodAnalytics(30);
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!analytics) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No mood data available</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mood Analytics</Text>
        <Text style={styles.subtitle}>Last 30 days</Text>
      </View>

      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{analytics.totalEntries}</Text>
          <Text style={styles.statLabel}>Total Entries</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{analytics.entriesWithMood}</Text>
          <Text style={styles.statLabel}>With Mood</Text>
        </View>
        {analytics.mostFrequentMood && (
          <View style={styles.statItem}>
            <MoodBadge mood={analytics.mostFrequentMood} size="large" />
            <Text style={styles.statLabel}>Most Frequent</Text>
          </View>
        )}
      </View>

      {analytics.moodDistribution.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mood Distribution</Text>
          {analytics.moodDistribution.map((stat) => {
            const config = getMoodConfig(stat.mood);
            return (
              <View key={stat.mood} style={styles.moodRow}>
                <View style={styles.moodInfo}>
                  <Text style={styles.moodEmoji}>{config.emoji}</Text>
                  <Text style={styles.moodName}>{config.label}</Text>
                </View>
                <View style={styles.moodStats}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${stat.percentage}%`,
                        backgroundColor: config.color,
                      },
                    ]}
                  />
                  <Text style={styles.moodCount}>
                    {stat.count} ({stat.percentage.toFixed(1)}%)
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {analytics.recentMoods.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Moods</Text>
          <View style={styles.recentMoods}>
            {analytics.recentMoods.map((item, index) => (
              <MoodBadge
                key={index}
                mood={item.mood}
                size="medium"
                showLabel
              />
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statsCard: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    padding: 20,
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#1a1a1a',
  },
  moodRow: {
    marginBottom: 16,
  },
  moodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  moodEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  moodName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  moodStats: {
    position: 'relative',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  moodCount: {
    fontSize: 12,
    color: '#666',
  },
  recentMoods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
});
```

---

## Testing Implementation

### Backend Tests

**File:** `backend/src/__tests__/mood.test.ts`
```typescript
import request from 'supertest';
import app from '../server';

describe('Mood Tracking', () => {
  let authToken: string;
  let entryId: string;

  beforeAll(async () => {
    const response = await request(app)
      .post('/api/auth/signup')
      .send({
        email: `test${Date.now()}@example.com`,
        password: 'Test1234',
      });

    authToken = response.body.data.session.access_token;
  });

  it('should create entry with mood', async () => {
    const response = await request(app)
      .post('/api/entries')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        content: 'Feeling great today!',
        mood: 'happy',
      });

    expect(response.status).toBe(201);
    expect(response.body.data.mood).toBe('happy');
    entryId = response.body.data.id;
  });

  it('should filter entries by mood', async () => {
    await request(app)
      .post('/api/entries')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ content: 'Stressed about work', mood: 'stressed' });

    const response = await request(app)
      .get('/api/entries?mood=happy')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.entries.every((e: any) => e.mood === 'happy')).toBe(true);
  });

  it('should get mood analytics', async () => {
    const response = await request(app)
      .get('/api/entries/analytics/mood')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.moodDistribution).toBeDefined();
  });

  it('should reject invalid mood', async () => {
    const response = await request(app)
      .post('/api/entries')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        content: 'Test',
        mood: 'invalid_mood',
      });

    expect(response.status).toBe(400);
  });
});
```

---

## Step-by-Step Implementation

### Step 1: Database Updates
- Create migration to add mood column and enum type
- Run migration on Supabase
- Verify mood values are constrained to enum
- Create indexes for mood filtering

### Step 2: Backend Types & Validation
- Update Entry type to include mood
- Add mood to validation schemas
- Test validation with various mood values

### Step 3: Backend Service Updates
- Update create/update methods to handle mood
- Add mood filtering to getUserEntries
- Implement mood analytics methods
- Test all service methods

### Step 4: Backend Controller & Routes
- Add mood analytics endpoints
- Update existing endpoints to support mood
- Test all endpoints with Postman

### Step 5: Backend Testing
- Write tests for mood CRUD operations
- Test mood filtering
- Test mood analytics
- Verify invalid moods are rejected

### Step 6: Frontend Configuration
- Create mood configuration with emojis and colors
- Create helper functions for mood display
- Test mood utilities

### Step 7: Frontend Components
- Build MoodPicker component (full and compact)
- Build MoodBadge component
- Test components in isolation

### Step 8: Update Entry Screens
- Add MoodPicker to EntryEditorScreen
- Add MoodBadge to EntryListScreen
- Add MoodBadge to EntryDetailScreen
- Test mood selection and display

### Step 9: Mood Analytics Screen
- Build MoodAnalyticsScreen with charts
- Add navigation to analytics screen
- Test analytics calculations

### Step 10: End-to-End Testing
- Test creating entries with various moods
- Test editing mood on existing entries
- Test mood filtering
- Test mood analytics display
- Test removing mood from entry

### Step 11: Manual Testing
- Test on iOS and Android
- Verify mood emojis display correctly
- Test mood picker usability
- Verify analytics are accurate

---

## Quality Gates

### Before Marking Phase Complete:
1. ✅ Can select mood when creating entry
2. ✅ Can update mood on existing entry
3. ✅ Can remove mood from entry
4. ✅ Mood displays correctly in entry list
5. ✅ Mood displays correctly in entry detail
6. ✅ Can filter entries by mood
7. ✅ Mood analytics calculate correctly
8. ✅ Mood analytics display properly
9. ✅ Invalid moods are rejected
10. ✅ Mood picker is intuitive to use
11. ✅ All backend tests pass
12. ✅ Tested on iOS and Android
13. ✅ No TypeScript errors
14. ✅ ESLint passes

---

## Dependencies to Install

### Backend
```bash
# No new dependencies needed
```

### Frontend
```bash
# No new dependencies needed
```

---

## Next Steps
After completing Phase 4, you can work on **Phase 5 (Search & Filtering)** or **Phase 6 (Basic AI Integration)** next, as they both depend only on Phase 3.
