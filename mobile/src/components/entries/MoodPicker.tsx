/**
 * MoodPicker Component
 * Beautiful mood selection with emoji buttons
 */

import React from 'react';
import { IonText } from '@ionic/react';
import type { MoodType } from '../../types';
import { MOODS, getMoodColor } from '../../utils/moods';

interface MoodPickerProps {
  selectedMood: MoodType | null;
  onMoodSelect: (mood: MoodType | null) => void;
  disabled?: boolean;
}

export const MoodPicker: React.FC<MoodPickerProps> = ({
  selectedMood,
  onMoodSelect,
  disabled = false,
}) => {
  return (
    <div>
      <div
        style={{
          marginBottom: '12px',
          fontSize: '15px',
          fontWeight: '600',
          color: 'var(--ion-text-color)',
        }}
      >
        How are you feeling?
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
        }}
      >
        {MOODS.map((mood) => {
          const isSelected = selectedMood === mood.value;
          const moodColor = getMoodColor(mood.value);

          return (
            <button
              key={mood.value}
              data-mood={mood.value}
              onClick={() => onMoodSelect(isSelected ? null : mood.value)}
              disabled={disabled}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '14px 8px',
                background: isSelected ? `${moodColor}15` : 'var(--ion-background-color, #fff)',
                border: isSelected ? `2px solid ${moodColor}` : '2px solid var(--ion-color-light)',
                borderRadius: '14px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.6 : 1,
                transition: 'all 0.15s ease',
              }}
            >
              <span
                style={{
                  fontSize: '28px',
                  transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                  transition: 'transform 0.15s ease',
                }}
              >
                {mood.emoji}
              </span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: isSelected ? '600' : '500',
                  color: isSelected ? moodColor : 'var(--ion-color-medium)',
                }}
              >
                {mood.label}
              </span>
            </button>
          );
        })}
      </div>

      {selectedMood && (
        <div style={{ marginTop: '12px', textAlign: 'center' }}>
          <IonText color="medium">
            <button
              onClick={() => onMoodSelect(null)}
              disabled={disabled}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--ion-color-medium)',
                fontSize: '13px',
                cursor: 'pointer',
                textDecoration: 'underline',
                opacity: disabled ? 0.6 : 1,
              }}
            >
              Clear selection
            </button>
          </IonText>
        </div>
      )}
    </div>
  );
};
