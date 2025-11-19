/**
 * MoodFilter Component
 * Compact mood filter for search functionality
 */

import React from 'react';
import { IonChip, IonIcon } from '@ionic/react';
import { closeCircle } from 'ionicons/icons';
import type { MoodType } from '../../types';
import { MOODS } from '../../utils/moods';
import './MoodFilter.css';

interface MoodFilterProps {
  selectedMood: MoodType | null;
  onMoodSelect: (mood: MoodType | null) => void;
}

export const MoodFilter: React.FC<MoodFilterProps> = ({
  selectedMood,
  onMoodSelect,
}) => {
  return (
    <div className="mood-filter">
      {MOODS.map((mood) => (
        <IonChip
          key={mood.value}
          color={selectedMood === mood.value ? 'primary' : 'medium'}
          outline={selectedMood !== mood.value}
          onClick={() => onMoodSelect(selectedMood === mood.value ? null : mood.value)}
        >
          <span>{mood.emoji}</span>
          <span style={{ marginLeft: '4px' }}>{mood.label}</span>
          {selectedMood === mood.value && <IonIcon icon={closeCircle} />}
        </IonChip>
      ))}
    </div>
  );
};
