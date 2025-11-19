/**
 * MoodBadge Component
 * Displays mood as a styled badge with emoji and optional label
 */

import React from 'react';
import { IonBadge } from '@ionic/react';
import type { MoodType } from '../../types';
import { getMoodEmoji, getMoodLabel, getMoodColor } from '../../utils/moods';

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

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          fontSize: '12px',
          padding: '4px 8px',
          emojiSize: '14px',
        };
      case 'large':
        return {
          fontSize: '16px',
          padding: '8px 16px',
          emojiSize: '20px',
        };
      default: // medium
        return {
          fontSize: '14px',
          padding: '6px 12px',
          emojiSize: '16px',
        };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <IonBadge
      style={{
        '--background': color,
        '--color': '#fff',
        fontSize: sizeStyles.fontSize,
        padding: sizeStyles.padding,
        borderRadius: '16px',
        fontWeight: '500',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
      } as React.CSSProperties}
    >
      <span style={{ fontSize: sizeStyles.emojiSize, lineHeight: 1 }}>{emoji}</span>
      {showLabel && <span style={{ textTransform: 'capitalize' }}>{label}</span>}
    </IonBadge>
  );
};
