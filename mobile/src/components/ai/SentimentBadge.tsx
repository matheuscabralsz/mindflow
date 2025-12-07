import React from 'react';
import { IonBadge, IonIcon } from '@ionic/react';
import { happyOutline, sadOutline, removeOutline } from 'ionicons/icons';
import type { SentimentAnalysis } from '../../types/ai.types';
import './SentimentBadge.css';

interface SentimentBadgeProps {
  sentiment: Pick<SentimentAnalysis, 'score' | 'label'>;
  showScore?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const SentimentBadge: React.FC<SentimentBadgeProps> = ({
  sentiment,
  showScore = true,
  size = 'medium',
}) => {
  const { score, label } = sentiment;

  const getIcon = () => {
    switch (label) {
      case 'positive': return happyOutline;
      case 'negative': return sadOutline;
      default: return removeOutline;
    }
  };

  const getColor = () => {
    switch (label) {
      case 'positive': return 'success';
      case 'negative': return 'danger';
      default: return 'medium';
    }
  };

  const formatScore = (s: number) => {
    return s > 0 ? `+${s.toFixed(2)}` : s.toFixed(2);
  };

  return (
    <IonBadge color={getColor()} className={`sentiment-badge sentiment-badge--${size}`}>
      <IonIcon icon={getIcon()} />
      <span className="sentiment-badge__label">{label}</span>
      {showScore && <span className="sentiment-badge__score">({formatScore(score)})</span>}
    </IonBadge>
  );
};
