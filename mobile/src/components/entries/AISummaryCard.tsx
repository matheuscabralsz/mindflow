/**
 * AISummaryCard Component
 * Displays AI-generated summary for a week or month period
 */

import React from 'react';
import { useHistory } from 'react-router-dom';
import { IonIcon } from '@ionic/react';
import { sparkles, chevronForward } from 'ionicons/icons';

interface AISummaryCardProps {
  type: 'week' | 'month';
  period: string;
  summary?: string;
  /** For weekly: start date of the week (Date object) */
  weekStart?: Date;
  /** For weekly: end date of the week (Date object) */
  weekEnd?: Date;
  /** For monthly: the month in YYYY-MM format */
  monthKey?: string;
}

export const AISummaryCard: React.FC<AISummaryCardProps> = ({
  type,
  period: _period,
  summary,
  weekStart,
  weekEnd,
  monthKey,
}) => {
  const history = useHistory();

  const handleClick = () => {
    if (type === 'week' && weekStart && weekEnd) {
      const startStr = weekStart.toISOString().split('T')[0];
      const endStr = weekEnd.toISOString().split('T')[0];
      history.push(`/summary/week/${startStr}/${endStr}`);
    } else if (type === 'month' && monthKey) {
      history.push(`/summary/monthly/${monthKey}`);
    }
  };
  const placeholderText = type === 'month'
    ? 'Monthly insights will appear here once generated...'
    : 'Weekly insights will appear here once generated...';

  const isClickable = (type === 'week' && weekStart && weekEnd) || (type === 'month' && monthKey);

  return (
    <button
      onClick={handleClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        padding: '16px',
        background: 'linear-gradient(135deg, rgba(var(--ion-color-primary-rgb), 0.08) 0%, rgba(var(--ion-color-secondary-rgb), 0.08) 100%)',
        border: '1.5px solid var(--ion-color-primary)',
        borderRadius: '14px',
        cursor: isClickable ? 'pointer' : 'default',
        textAlign: 'left',
        marginBottom: '12px',
        transition: 'transform 0.1s ease, box-shadow 0.1s ease',
      }}
    >
      {/* AI Icon indicator */}
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, var(--ion-color-primary) 0%, var(--ion-color-secondary) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <IonIcon
          icon={sparkles}
          style={{ fontSize: '24px', color: '#fff' }}
        />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '6px',
          }}
        >
          <span style={{ fontWeight: '600', fontSize: '15px', color: 'var(--ion-color-primary)' }}>
            {type === 'month' ? 'Monthly Summary' : 'Weekly Summary'}
          </span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: '500',
              padding: '2px 8px',
              borderRadius: '10px',
              background: 'var(--ion-color-primary)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <IonIcon icon={sparkles} style={{ fontSize: '10px' }} />
            AI
          </span>
        </div>
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            lineHeight: '1.5',
            color: summary ? 'var(--ion-color-medium-shade)' : 'var(--ion-color-medium)',
            fontStyle: summary ? 'normal' : 'italic',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {summary || placeholderText}
        </p>
      </div>

      {/* Chevron indicator */}
      {isClickable && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <IonIcon
            icon={chevronForward}
            style={{ fontSize: '20px', color: 'var(--ion-color-primary)' }}
          />
        </div>
      )}
    </button>
  );
};
