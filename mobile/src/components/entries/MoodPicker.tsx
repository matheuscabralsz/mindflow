/**
 * MoodPicker Component
 * Allows users to select their current mood with emoji buttons
 */

import React from 'react';
import { IonButton, IonButtons } from '@ionic/react';
import type { MoodType } from '../../types';
import { MOODS } from '../../utils/moods';

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
      <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
        How are you feeling?
      </div>
      <IonButtons style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {MOODS.map((mood) => (
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
