# Phase 4: Mood Tracking Integration - Detailed Implementation Guide

## Overview

**Goal:** Add mood selection and tracking to journal entries, with mood-based filtering and simple analytics.

**Time Estimate:** 2-3 hours

**Prerequisites:**
- Phase 1 complete (Foundation & Infrastructure)
- Phase 2 complete (User Authentication)
- Phase 3 complete (Core Journal CRUD)
- Database schema already includes `mood` column and `mood_type` enum

**What You'll Have At The End:**
- Mood picker component for entry creation/editing
- Mood display badges on entry cards and detail views
- Mood filtering on entry list
- Simple mood analytics (most frequent mood, mood distribution)
- Mood history visualization
- Critical path tests

---

## Step 1: Verify Mood Database Schema (5 minutes)

### 1.1 Confirm Mood Type Exists

```bash
# Check supabase/schemas/00_types.sql
cat supabase/schemas/00_types.sql

# Should contain:
# CREATE TYPE mood_type AS ENUM ('happy', 'sad', 'anxious', 'calm', 'stressed');

# Verify entries table has mood column
cat supabase/schemas/01_entries.sql

# Should have:
# mood mood_type,
# CREATE INDEX IF NOT EXISTS idx_entries_mood ON entries(mood);
```

### 1.2 Verify Mood Index Exists

```sql
-- In Supabase Dashboard → SQL Editor:
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'entries' AND indexname = 'idx_entries_mood';

-- Should return the mood index
```

---

## Step 2: Mood Constants and Utilities (10 minutes)

### 2.1 Create Mood Constants

```bash
# mobile/src/utils/moods.ts
cat > mobile/src/utils/moods.ts << 'EOF'
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
    color: '#FFD700',
    description: 'Feeling joyful and content',
  },
  {
    value: 'calm',
    label: 'Calm',
    emoji: '😌',
    color: '#87CEEB',
    description: 'Feeling peaceful and relaxed',
  },
  {
    value: 'sad',
    label: 'Sad',
    emoji: '😢',
    color: '#4682B4',
    description: 'Feeling down or melancholic',
  },
  {
    value: 'anxious',
    label: 'Anxious',
    emoji: '😰',
    color: '#FF6B6B',
    description: 'Feeling worried or uneasy',
  },
  {
    value: 'stressed',
    label: 'Stressed',
    emoji: '😫',
    color: '#FF4500',
    description: 'Feeling overwhelmed or pressured',
  },
];

export const getMoodConfig = (mood: MoodType | null): MoodConfig | null => {
  if (!mood) return null;
  return MOODS.find((m) => m.value === mood) || null;
};

export const getMoodEmoji = (mood: MoodType | null): string => {
  const config = getMoodConfig(mood);
  return config?.emoji || '';
};

export const getMoodColor = (mood: MoodType | null): string => {
  const config = getMoodConfig(mood);
  return config?.color || '#gray';
};

export const getMoodLabel = (mood: MoodType | null): string => {
  const config = getMoodConfig(mood);
  return config?.label || '';
};
EOF
```

---

## Step 3: Mood Picker Component (25 minutes)

### 3.1 Create Mood Picker Component

```bash
# mobile/src/components/entries/MoodPicker.tsx
cat > mobile/src/components/entries/MoodPicker.tsx << 'EOF'
import React from 'react';
import { IonGrid, IonRow, IonCol, IonText } from '@ionic/react';
import type { MoodType } from '../../types';
import { MOODS } from '../../utils/moods';
import './MoodPicker.css';

interface MoodPickerProps {
  selectedMood: MoodType | null;
  onMoodSelect: (mood: MoodType | null) => void;
  compact?: boolean;
}

export const MoodPicker: React.FC<MoodPickerProps> = ({
  selectedMood,
  onMoodSelect,
  compact = false,
}) => {
  const handleMoodClick = (mood: MoodType) => {
    // Toggle: if same mood clicked, deselect
    if (selectedMood === mood) {
      onMoodSelect(null);
    } else {
      onMoodSelect(mood);
    }
  };

  if (compact) {
    return (
      <div className="mood-picker-compact">
        {MOODS.map((mood) => {
          const isSelected = selectedMood === mood.value;
          return (
            <button
              key={mood.value}
              type="button"
              className={`mood-button-compact ${isSelected ? 'selected' : ''}`}
              onClick={() => handleMoodClick(mood.value)}
              aria-label={`Select ${mood.label} mood`}
            >
              <span className="mood-emoji">{mood.emoji}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="mood-picker">
      <div className="mood-picker-header">
        <IonText>
          <h3>How are you feeling?</h3>
        </IonText>
        {selectedMood && (
          <IonText color="medium">
            <small>Tap again to deselect</small>
          </IonText>
        )}
      </div>

      <IonGrid>
        <IonRow>
          {MOODS.map((mood) => {
            const isSelected = selectedMood === mood.value;
            return (
              <IonCol size="4" sizeMd="2.4" key={mood.value}>
                <button
                  type="button"
                  className={`mood-button ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleMoodClick(mood.value)}
                  style={{
                    borderColor: isSelected ? mood.color : 'transparent',
                  }}
                  aria-label={`Select ${mood.label} mood`}
                >
                  <div className="mood-emoji-large">{mood.emoji}</div>
                  <div className="mood-label">{mood.label}</div>
                </button>
              </IonCol>
            );
          })}
        </IonRow>
      </IonGrid>

      {selectedMood && (
        <div className="mood-description">
          <IonText color="medium">
            <p>{MOODS.find((m) => m.value === selectedMood)?.description}</p>
          </IonText>
        </div>
      )}
    </div>
  );
};
EOF
```

### 3.2 Create Mood Picker CSS

```bash
# mobile/src/components/entries/MoodPicker.css
cat > mobile/src/components/entries/MoodPicker.css << 'EOF'
.mood-picker {
  padding: 16px;
}

.mood-picker-header {
  margin-bottom: 16px;
  text-align: center;
}

.mood-picker-header h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
}

.mood-button {
  width: 100%;
  padding: 16px 8px;
  background: var(--ion-color-light);
  border: 3px solid transparent;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.mood-button:hover {
  background: var(--ion-color-light-shade);
  transform: scale(1.05);
}

.mood-button.selected {
  background: var(--ion-color-light-tint);
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.mood-emoji-large {
  font-size: 48px;
  line-height: 1;
}

.mood-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--ion-color-step-600);
}

.mood-description {
  margin-top: 16px;
  text-align: center;
}

.mood-description p {
  font-size: 14px;
  font-style: italic;
}

/* Compact Mode */
.mood-picker-compact {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
  padding: 8px 0;
}

.mood-button-compact {
  width: 48px;
  height: 48px;
  padding: 8px;
  background: var(--ion-color-light);
  border: 2px solid transparent;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mood-button-compact:hover {
  background: var(--ion-color-light-shade);
  transform: scale(1.1);
}

.mood-button-compact.selected {
  background: var(--ion-color-primary-tint);
  border-color: var(--ion-color-primary);
  transform: scale(1.15);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.mood-emoji {
  font-size: 24px;
  line-height: 1;
}
EOF
```

---

## Step 4: Mood Badge Component (15 minutes)

### 4.1 Create Mood Badge Component

```bash
# mobile/src/components/entries/MoodBadge.tsx
cat > mobile/src/components/entries/MoodBadge.tsx << 'EOF'
import React from 'react';
import { IonBadge } from '@ionic/react';
import type { MoodType } from '../../types';
import { getMoodEmoji, getMoodLabel, getMoodColor } from '../../utils/moods';
import './MoodBadge.css';

interface MoodBadgeProps {
  mood: MoodType | null;
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const MoodBadge: React.FC<MoodBadgeProps> = ({
  mood,
  showLabel = true,
  size = 'medium',
}) => {
  if (!mood) return null;

  const emoji = getMoodEmoji(mood);
  const label = getMoodLabel(mood);
  const color = getMoodColor(mood);

  return (
    <IonBadge
      className={`mood-badge mood-badge-${size}`}
      style={{
        '--background': color,
        '--color': '#fff',
      }}
    >
      <span className="mood-badge-emoji">{emoji}</span>
      {showLabel && <span className="mood-badge-label">{label}</span>}
    </IonBadge>
  );
};
EOF
```

### 4.2 Create Mood Badge CSS

```bash
# mobile/src/components/entries/MoodBadge.css
cat > mobile/src/components/entries/MoodBadge.css << 'EOF'
.mood-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 16px;
  font-weight: 500;
}

.mood-badge-small {
  font-size: 12px;
  padding: 4px 8px;
}

.mood-badge-small .mood-badge-emoji {
  font-size: 14px;
}

.mood-badge-medium {
  font-size: 14px;
  padding: 6px 12px;
}

.mood-badge-medium .mood-badge-emoji {
  font-size: 16px;
}

.mood-badge-large {
  font-size: 16px;
  padding: 8px 16px;
}

.mood-badge-large .mood-badge-emoji {
  font-size: 20px;
}

.mood-badge-emoji {
  line-height: 1;
}

.mood-badge-label {
  text-transform: capitalize;
}
EOF
```

---

## Step 5: Update Entry Editor with Mood Picker (15 minutes)

### 5.1 Update Entry Editor Page

```bash
# Update mobile/src/pages/entries/EntryEditorPage.tsx
cat > mobile/src/pages/entries/EntryEditorPage.tsx << 'EOF'
import React, { useState, useEffect } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import {
  IonContent,
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonBackButton,
  IonTextarea,
  IonToast,
  IonSpinner,
} from '@ionic/react';
import { useEntriesStore } from '../../store/entriesStore';
import { MoodPicker } from '../../components/entries/MoodPicker';
import type { MoodType } from '../../types';
import './EntryEditorPage.css';

const EntryEditorPage: React.FC = () => {
  const history = useHistory();
  const { id } = useParams<{ id: string }>();
  const isEditMode = id !== 'new';

  const { createEntry, updateEntry, fetchEntry, selectedEntry, loading } = useEntriesStore();

  const [content, setContent] = useState('');
  const [mood, setMood] = useState<MoodType | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      if (selectedEntry?.id !== id) {
        fetchEntry(id);
      } else {
        setContent(selectedEntry.content);
        setMood(selectedEntry.mood || null);
      }
    }
  }, [id, isEditMode, selectedEntry, fetchEntry]);

  useEffect(() => {
    if (isEditMode && selectedEntry?.id === id) {
      setContent(selectedEntry.content);
      setMood(selectedEntry.mood || null);
    }
  }, [selectedEntry, id, isEditMode]);

  const handleSave = async () => {
    if (!content.trim()) {
      setToastMessage('Entry cannot be empty');
      setShowToast(true);
      return;
    }

    setIsSaving(true);

    try {
      if (isEditMode) {
        await updateEntry(id, { content, mood });
        setToastMessage('Entry updated!');
      } else {
        await createEntry({ content, mood });
        setToastMessage('Entry created!');
      }

      setShowToast(true);

      setTimeout(() => {
        history.goBack();
      }, 500);
    } catch (error: any) {
      setToastMessage(error.message || 'Failed to save entry');
      setShowToast(true);
    } finally {
      setIsSaving(false);
    }
  };

  const canSave = content.trim().length > 0 && !isSaving;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/entries" />
          </IonButtons>
          <IonTitle>{isEditMode ? 'Edit Entry' : 'New Entry'}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleSave} disabled={!canSave}>
              {isSaving ? <IonSpinner name="crescent" /> : 'Save'}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {loading && isEditMode && (
          <div className="entry-editor-loading">
            <IonSpinner name="crescent" />
          </div>
        )}

        {(!loading || !isEditMode) && (
          <>
            <div className="entry-editor-mood-section">
              <MoodPicker selectedMood={mood} onMoodSelect={setMood} />
            </div>

            <div className="entry-editor-content-section">
              <IonTextarea
                value={content}
                onIonInput={(e) => setContent(e.detail.value!)}
                placeholder="What's on your mind?"
                autoGrow
                rows={10}
                className="entry-editor-textarea"
                autofocus
              />
            </div>
          </>
        )}

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={2000}
        />
      </IonContent>
    </IonPage>
  );
};

export default EntryEditorPage;
EOF
```

### 5.2 Update Entry Editor CSS

```bash
# Update mobile/src/pages/entries/EntryEditorPage.css
cat > mobile/src/pages/entries/EntryEditorPage.css << 'EOF'
.entry-editor-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 50vh;
}

.entry-editor-mood-section {
  border-bottom: 1px solid var(--ion-color-light);
  margin-bottom: 16px;
}

.entry-editor-content-section {
  padding: 0 16px;
}

.entry-editor-textarea {
  font-size: 16px;
  line-height: 1.6;
  min-height: 40vh;
  --padding-start: 0;
  --padding-end: 0;
}

.entry-editor-textarea textarea {
  font-family: inherit;
}
EOF
```

---

## Step 6: Update Entry Card with Mood Badge (10 minutes)

### 6.1 Update Entry Card Component

```bash
# Update mobile/src/components/entries/EntryCard.tsx
cat > mobile/src/components/entries/EntryCard.tsx << 'EOF'
import React from 'react';
import { IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonText } from '@ionic/react';
import { format } from 'date-fns';
import type { Entry } from '../../types';
import { MoodBadge } from './MoodBadge';
import './EntryCard.css';

interface EntryCardProps {
  entry: Entry;
  onClick: () => void;
}

export const EntryCard: React.FC<EntryCardProps> = ({ entry, onClick }) => {
  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <IonCard button onClick={onClick} className="entry-card">
      <IonCardHeader>
        <div className="entry-card-header">
          <div>
            <IonCardTitle className="entry-date">
              {format(new Date(entry.created_at), 'EEEE, MMMM d, yyyy')}
            </IonCardTitle>
            <IonText color="medium" className="entry-time">
              {format(new Date(entry.created_at), 'h:mm a')}
            </IonText>
          </div>
          {entry.mood && <MoodBadge mood={entry.mood} showLabel={false} size="small" />}
        </div>
      </IonCardHeader>

      <IonCardContent>
        <p className="entry-preview">{truncateContent(entry.content)}</p>
      </IonCardContent>
    </IonCard>
  );
};
EOF
```

---

## Step 7: Update Entry Detail with Mood Badge (10 minutes)

### 7.1 Update Entry Detail Page

Find the mood display section in EntryDetailPage.tsx and update it:

```typescript
// In mobile/src/pages/entries/EntryDetailPage.tsx
// Replace the mood display section:

import { MoodBadge } from '../../components/entries/MoodBadge';

// In the render, replace:
{selectedEntry.mood && (
  <div className="entry-detail-mood">
    <IonText color="primary">Mood: {selectedEntry.mood}</IonText>
  </div>
)}

// With:
{selectedEntry.mood && (
  <div className="entry-detail-mood">
    <MoodBadge mood={selectedEntry.mood} size="large" />
  </div>
)}
```

---

## Step 8: Mood Filtering on Entry List (20 minutes)

### 8.1 Create Mood Filter Component

```bash
# mobile/src/components/entries/MoodFilter.tsx
cat > mobile/src/components/entries/MoodFilter.tsx << 'EOF'
import React from 'react';
import { IonChip, IonIcon } from '@ionic/react';
import { closeCircle } from 'ionicons/icons';
import type { MoodType } from '../../types';
import { MOODS, getMoodEmoji } from '../../utils/moods';
import './MoodFilter.css';

interface MoodFilterProps {
  selectedMood: MoodType | null;
  onMoodSelect: (mood: MoodType | null) => void;
}

export const MoodFilter: React.FC<MoodFilterProps> = ({ selectedMood, onMoodSelect }) => {
  return (
    <div className="mood-filter">
      <IonChip
        className={!selectedMood ? 'selected' : ''}
        onClick={() => onMoodSelect(null)}
      >
        All Moods
      </IonChip>

      {MOODS.map((mood) => (
        <IonChip
          key={mood.value}
          className={selectedMood === mood.value ? 'selected' : ''}
          onClick={() => onMoodSelect(mood.value)}
        >
          <span className="mood-filter-emoji">{mood.emoji}</span>
          {mood.label}
          {selectedMood === mood.value && (
            <IonIcon icon={closeCircle} onClick={() => onMoodSelect(null)} />
          )}
        </IonChip>
      ))}
    </div>
  );
};
EOF
```

### 8.2 Create Mood Filter CSS

```bash
# mobile/src/components/entries/MoodFilter.css
cat > mobile/src/components/entries/MoodFilter.css << 'EOF'
.mood-filter {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  overflow-x: auto;
  white-space: nowrap;
  border-bottom: 1px solid var(--ion-color-light);
}

.mood-filter ion-chip {
  cursor: pointer;
}

.mood-filter ion-chip.selected {
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
}

.mood-filter-emoji {
  margin-right: 4px;
  font-size: 16px;
}
EOF
```

### 8.3 Update Entries List Page with Filter

```bash
# Add to mobile/src/pages/entries/EntriesListPage.tsx
# Import MoodFilter at the top:
import { MoodFilter } from '../../components/entries/MoodFilter';
import type { MoodType } from '../../types';

# Add state for mood filter:
const [moodFilter, setMoodFilter] = useState<MoodType | null>(null);

# Update fetchEntries to use filter:
const { entries, loading, hasMore, fetchEntries, setFilters } = useEntriesStore();

# Add filter handler:
const handleMoodFilterChange = (mood: MoodType | null) => {
  setMoodFilter(mood);
  setFilters({ mood: mood || undefined });
  fetchEntries(true);
};

# Add MoodFilter component after the header:
<IonHeader collapse="condense">
  <IonToolbar>
    <IonTitle size="large">My Journal</IonTitle>
  </IonToolbar>
</IonHeader>

<MoodFilter selectedMood={moodFilter} onMoodSelect={handleMoodFilterChange} />

<IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
```

---

## Step 9: Mood Analytics (Optional - 30 minutes)

### 9.1 Create Mood Analytics Service

```bash
# mobile/src/services/mood-analytics.service.ts
cat > mobile/src/services/mood-analytics.service.ts << 'EOF'
import { supabase } from './supabase';
import type { MoodType } from '../types';

export interface MoodStats {
  mood: MoodType;
  count: number;
  percentage: number;
}

export interface MoodAnalytics {
  totalEntries: number;
  moodDistribution: MoodStats[];
  mostFrequentMood: MoodType | null;
  moodStreak: number;
  currentMood: MoodType | null;
}

export const moodAnalyticsService = {
  /**
   * Get mood distribution for the current user
   */
  async getMoodAnalytics(): Promise<MoodAnalytics> {
    // Get all entries with moods
    const { data: entries, error } = await supabase
      .from('entries')
      .select('mood, created_at')
      .not('mood', 'is', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!entries || entries.length === 0) {
      return {
        totalEntries: 0,
        moodDistribution: [],
        mostFrequentMood: null,
        moodStreak: 0,
        currentMood: null,
      };
    }

    // Calculate mood distribution
    const moodCounts: Record<string, number> = {};
    entries.forEach((entry) => {
      const mood = entry.mood as MoodType;
      moodCounts[mood] = (moodCounts[mood] || 0) + 1;
    });

    const totalEntries = entries.length;
    const moodDistribution: MoodStats[] = Object.entries(moodCounts).map(
      ([mood, count]) => ({
        mood: mood as MoodType,
        count,
        percentage: (count / totalEntries) * 100,
      })
    );

    // Sort by count descending
    moodDistribution.sort((a, b) => b.count - a.count);

    // Most frequent mood
    const mostFrequentMood = moodDistribution[0]?.mood || null;

    // Current mood (latest entry)
    const currentMood = (entries[0]?.mood as MoodType) || null;

    // Calculate mood streak (consecutive days with same mood)
    let moodStreak = 0;
    if (currentMood) {
      for (const entry of entries) {
        if (entry.mood === currentMood) {
          moodStreak++;
        } else {
          break;
        }
      }
    }

    return {
      totalEntries,
      moodDistribution,
      mostFrequentMood,
      moodStreak,
      currentMood,
    };
  },

  /**
   * Get mood history for the last N days
   */
  async getMoodHistory(days: number = 30): Promise<{ date: string; mood: MoodType | null }[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: entries, error } = await supabase
      .from('entries')
      .select('mood, created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (entries || []).map((entry) => ({
      date: entry.created_at,
      mood: entry.mood as MoodType | null,
    }));
  },
};
EOF
```

### 9.2 Create Mood Analytics Page

```bash
# mobile/src/pages/MoodAnalyticsPage.tsx
cat > mobile/src/pages/MoodAnalyticsPage.tsx << 'EOF'
import React, { useEffect, useState } from 'react';
import {
  IonContent,
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonSpinner,
  IonText,
} from '@ionic/react';
import { moodAnalyticsService, type MoodAnalytics } from '../services/mood-analytics.service';
import { getMoodEmoji, getMoodLabel } from '../utils/moods';
import './MoodAnalyticsPage.css';

const MoodAnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<MoodAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const data = await moodAnalyticsService.getMoodAnalytics();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load mood analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/entries" />
            </IonButtons>
            <IonTitle>Mood Analytics</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div className="mood-analytics-loading">
            <IonSpinner name="crescent" />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!analytics || analytics.totalEntries === 0) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/entries" />
            </IonButtons>
            <IonTitle>Mood Analytics</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div className="mood-analytics-empty">
            <IonText color="medium">
              <h2>No mood data yet</h2>
              <p>Start adding moods to your entries to see analytics</p>
            </IonText>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/entries" />
          </IonButtons>
          <IonTitle>Mood Analytics</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Overview</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <div className="mood-stat">
              <span>Total Entries with Mood:</span>
              <strong>{analytics.totalEntries}</strong>
            </div>
            {analytics.mostFrequentMood && (
              <div className="mood-stat">
                <span>Most Frequent Mood:</span>
                <strong>
                  {getMoodEmoji(analytics.mostFrequentMood)}{' '}
                  {getMoodLabel(analytics.mostFrequentMood)}
                </strong>
              </div>
            )}
            {analytics.currentMood && analytics.moodStreak > 1 && (
              <div className="mood-stat">
                <span>Current Mood Streak:</span>
                <strong>{analytics.moodStreak} entries</strong>
              </div>
            )}
          </IonCardContent>
        </IonCard>

        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Mood Distribution</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            {analytics.moodDistribution.map((stat) => (
              <div key={stat.mood} className="mood-distribution-item">
                <div className="mood-distribution-label">
                  <span className="mood-emoji">{getMoodEmoji(stat.mood)}</span>
                  <span>{getMoodLabel(stat.mood)}</span>
                </div>
                <div className="mood-distribution-bar">
                  <div
                    className="mood-distribution-fill"
                    style={{ width: `${stat.percentage}%` }}
                  />
                </div>
                <div className="mood-distribution-value">
                  {stat.count} ({stat.percentage.toFixed(1)}%)
                </div>
              </div>
            ))}
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default MoodAnalyticsPage;
EOF
```

### 9.3 Create Mood Analytics CSS

```bash
# mobile/src/pages/MoodAnalyticsPage.css
cat > mobile/src/pages/MoodAnalyticsPage.css << 'EOF'
.mood-analytics-loading,
.mood-analytics-empty {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 50vh;
  text-align: center;
}

.mood-stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--ion-color-light);
}

.mood-stat:last-child {
  border-bottom: none;
}

.mood-distribution-item {
  display: grid;
  grid-template-columns: 120px 1fr 100px;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}

.mood-distribution-label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mood-distribution-label .mood-emoji {
  font-size: 20px;
}

.mood-distribution-bar {
  height: 24px;
  background: var(--ion-color-light);
  border-radius: 12px;
  overflow: hidden;
}

.mood-distribution-fill {
  height: 100%;
  background: var(--ion-color-primary);
  border-radius: 12px;
  transition: width 0.3s ease;
}

.mood-distribution-value {
  text-align: right;
  font-size: 14px;
  font-weight: 500;
}
EOF
```

---

## Step 10: Testing (20 minutes)

### 10.1 Create Mood Tests

```bash
# mobile/src/utils/__tests__/moods.test.ts
mkdir -p mobile/src/utils/__tests__
cat > mobile/src/utils/__tests__/moods.test.ts << 'EOF'
import { describe, it, expect } from 'vitest';
import { MOODS, getMoodConfig, getMoodEmoji, getMoodLabel, getMoodColor } from '../moods';

describe('Mood Utils', () => {
  it('should have 5 mood configurations', () => {
    expect(MOODS).toHaveLength(5);
  });

  it('should get mood config by value', () => {
    const config = getMoodConfig('happy');
    expect(config).toBeDefined();
    expect(config?.value).toBe('happy');
    expect(config?.emoji).toBe('😊');
  });

  it('should return null for invalid mood', () => {
    const config = getMoodConfig('invalid' as any);
    expect(config).toBeNull();
  });

  it('should get mood emoji', () => {
    expect(getMoodEmoji('happy')).toBe('😊');
    expect(getMoodEmoji('sad')).toBe('😢');
    expect(getMoodEmoji(null)).toBe('');
  });

  it('should get mood label', () => {
    expect(getMoodLabel('happy')).toBe('Happy');
    expect(getMoodLabel('anxious')).toBe('Anxious');
    expect(getMoodLabel(null)).toBe('');
  });

  it('should get mood color', () => {
    expect(getMoodColor('happy')).toBe('#FFD700');
    expect(getMoodColor(null)).toBe('#gray');
  });
});
EOF
```

### 10.2 Create E2E Mood Test

```bash
# mobile/cypress/e2e/mood-tracking.cy.ts
cat > mobile/cypress/e2e/mood-tracking.cy.ts << 'EOF'
describe('Mood Tracking', () => {
  beforeEach(() => {
    // Login first
    cy.visit('/login');
    cy.get('input[type="email"]').type('test@example.com');
    cy.get('input[type="password"]').type('password123');
    cy.contains('button', 'Login').click();
    cy.url().should('include', '/entries');
  });

  it('should create entry with mood', () => {
    // Create new entry
    cy.get('ion-fab-button').click();

    // Select mood
    cy.contains('Happy').click();

    // Type content
    cy.get('ion-textarea').type('Feeling great today!');

    // Save
    cy.contains('button', 'Save').click();

    // Should see mood badge on entry card
    cy.get('.mood-badge').should('exist');
  });

  it('should filter entries by mood', () => {
    // Click mood filter chip
    cy.contains('ion-chip', 'Happy').click();

    // Should only show happy entries
    // (This test assumes you have entries with different moods)
  });

  it('should change mood when editing', () => {
    // Open first entry
    cy.get('.entry-card').first().click();

    // Edit
    cy.get('ion-button[aria-label="more"]').click();
    cy.contains('Edit').click();

    // Change mood
    cy.contains('Calm').click();

    // Save
    cy.contains('button', 'Save').click();

    // Should see updated mood
    cy.contains('Calm').should('be.visible');
  });
});
EOF
```

---

## Step 11: Manual Testing Checklist (15 minutes)

### 11.1 Test Mood Selection

```bash
# 1. Create new entry
# 2. Click different mood buttons
# 3. Verify selected mood highlights
# 4. Click same mood again to deselect
# 5. Save entry with mood
# 6. Verify mood badge appears on entry card
```

### 11.2 Test Mood Filtering

```bash
# 1. Create entries with different moods
# 2. Click mood filter chips
# 3. Verify only entries with selected mood appear
# 4. Click "All Moods" to clear filter
# 5. Verify all entries appear again
```

### 11.3 Test Mood Analytics

```bash
# 1. Navigate to /mood-analytics
# 2. Verify mood distribution displays correctly
# 3. Verify percentages add up to 100%
# 4. Verify most frequent mood is correct
# 5. Create new entry with different mood
# 6. Refresh analytics
# 7. Verify stats update
```

---

## Step 12: Quality Gates Checklist

### 12.1 Functional Requirements

- [ ] Users can select mood when creating entries
- [ ] Users can update mood on existing entries
- [ ] Mood displays on entry cards
- [ ] Mood displays on entry detail view
- [ ] Users can filter entries by mood
- [ ] Mood analytics display correctly
- [ ] Users can deselect mood

### 12.2 Technical Requirements

- [ ] TypeScript compiles without errors
- [ ] ESLint passes
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Mood index improves query performance

### 12.3 UX Requirements

- [ ] Mood picker is intuitive and easy to use
- [ ] Mood badges are visually distinct
- [ ] Mood colors are accessible (good contrast)
- [ ] Mood filter is easy to understand
- [ ] Analytics are easy to interpret

---

## Step 13: Update Progress Tracker

```bash
# Update docs/PROGRESS.md
# - Change Phase 4 status to "Complete"
# - Update completion date
# - Check off all deliverables
```

---

## Troubleshooting

### Issue: Mood not saving

**Solution:**
```typescript
// Ensure mood is included in createEntry/updateEntry calls
await createEntry({ content, mood });
await updateEntry(id, { content, mood });
```

### Issue: Mood filter not working

**Solution:**
```typescript
// Verify setFilters updates the store correctly
setFilters({ mood: mood || undefined });
// Then fetch with filters
fetchEntries(true);
```

---

## Next Steps

**Phase 4 Complete!** 🎉

You now have:
- ✅ Mood selection and tracking
- ✅ Mood display badges
- ✅ Mood filtering
- ✅ Mood analytics

**Ready for Phases 5 and 6:**
- Phase 5: Search & Filtering (Moderate)
- Phase 6: Basic AI Integration (Complex)

---

**Estimated Total Time:** 2-3 hours
**Complexity:** Simple
**Prerequisites:** Phases 1, 2, 3 complete

**Deliverables:**
✅ Mood picker component
✅ Mood filtering functionality
✅ Basic mood analytics display
✅ Updated entry CRUD with mood support
