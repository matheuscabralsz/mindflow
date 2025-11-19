/**
 * MoodPicker Component
 * Allows users to select their current mood with emoji buttons
 */

import React from 'react';
import { IonButton, IonButtons } from '@ionic/react';
import type { MoodType } from '../../types';

interface MoodPickerProps {
  selectedMood: MoodType | null;
  onMoodSelect: (mood: MoodType | null) => void;
  disabled?: boolean;
}

interface MoodOption {
  value: MoodType;
  emoji: string;
  label: string;
  color: string;
}

const MOOD_OPTIONS: MoodOption[] = [
  { value: 'happy', emoji: '😊', label: 'Happy', color: '#10B981' },
  { value: 'sad', emoji: '😢', label: 'Sad', color: '#3B82F6' },
  { value: 'anxious', emoji: '😰', label: 'Anxious', color: '#F59E0B' },
  { value: 'calm', emoji: '😌', label: 'Calm', color: '#8B5CF6' },
  { value: 'stressed', emoji: '😫', label: 'Stressed', color: '#EF4444' },
  { value: 'neutral', emoji: '😐', label: 'Neutral', color: '#6B7280' },
];

export const MoodPicker: React.FC<MoodPickerProps> = ({
  selectedMood,
  onMoodSelect,
  disabled = false,
}) => {
  return (
    <div>
      <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
        How are you feeling?
      </div>
      <IonButtons style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {MOOD_OPTIONS.map((mood) => (
          <IonButton
            key={mood.value}
            data-mood={mood.value}
            fill={selectedMood === mood.value ? 'solid' : 'outline'}
            color={selectedMood === mood.value ? 'primary' : 'medium'}
            onClick={() => onMoodSelect(mood.value)}
            disabled={disabled}
            style={{
              fontSize: '24px',
              minWidth: '60px',
              height: '60px',
              margin: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>{mood.emoji}</span>
              <span style={{ fontSize: '10px' }}>{mood.label}</span>
            </div>
          </IonButton>
        ))}
      </IonButtons>

      {selectedMood && (
        <IonButton
          fill="clear"
          size="small"
          onClick={() => onMoodSelect(null)}
          disabled={disabled}
          style={{ marginTop: '8px' }}
        >
          Clear mood
        </IonButton>
      )}
    </div>
  );
};
