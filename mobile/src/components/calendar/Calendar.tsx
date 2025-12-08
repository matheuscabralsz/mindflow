/**
 * Calendar Component
 * Monthly calendar view for selecting dates to add/edit entries
 */

import React, { useState, useMemo } from 'react';
import { IonIcon } from '@ionic/react';
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isToday,
  isFuture,
} from 'date-fns';

interface CalendarProps {
  /** Dates that have entries (YYYY-MM-DD format) */
  entryDates?: string[];
  /** Callback when a date is selected */
  onDateSelect: (date: string) => void;
  /** Initially selected date */
  selectedDate?: string;
}

export const Calendar: React.FC<CalendarProps> = ({
  entryDates = [],
  onDateSelect,
  selectedDate,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Convert entry dates to Set for O(1) lookup
  const entryDateSet = useMemo(
    () => new Set(entryDates),
    [entryDates]
  );

  // Generate calendar days for the current month view
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days: Date[] = [];
    let day = startDate;

    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    return days;
  }, [currentMonth]);

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDateClick = (date: Date) => {
    if (isFuture(date) && !isToday(date)) {
      return; // Don't allow future dates
    }
    const dateStr = format(date, 'yyyy-MM-dd');
    onDateSelect(dateStr);
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div
      style={{
        background: 'var(--ion-background-color, #fff)',
        border: '1px solid var(--ion-color-light)',
        borderRadius: '16px',
        padding: '16px',
      }}
    >
      {/* Month Navigation Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <button
          onClick={handlePrevMonth}
          style={{
            background: 'none',
            border: 'none',
            padding: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            color: 'var(--ion-color-primary)',
          }}
          aria-label="Previous month"
        >
          <IonIcon icon={chevronBackOutline} style={{ fontSize: '20px' }} />
        </button>
        <span style={{ fontWeight: '600', fontSize: '16px' }}>
          {format(currentMonth, 'MMMM yyyy')}
        </span>
        <button
          onClick={handleNextMonth}
          style={{
            background: 'none',
            border: 'none',
            padding: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            color: 'var(--ion-color-primary)',
          }}
          aria-label="Next month"
        >
          <IonIcon icon={chevronForwardOutline} style={{ fontSize: '20px' }} />
        </button>
      </div>

      {/* Weekday Headers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '4px',
          marginBottom: '8px',
        }}
      >
        {weekDays.map((day) => (
          <div
            key={day}
            style={{
              textAlign: 'center',
              fontSize: '12px',
              fontWeight: '500',
              color: 'var(--ion-color-medium)',
              padding: '4px 0',
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '4px',
        }}
      >
        {calendarDays.map((day, index) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isDayToday = isToday(day);
          const isSelected = selectedDate === dateStr;
          const hasEntry = entryDateSet.has(dateStr);
          const isFutureDate = isFuture(day) && !isDayToday;

          return (
            <button
              key={index}
              onClick={() => handleDateClick(day)}
              disabled={isFutureDate}
              style={{
                position: 'relative',
                aspectRatio: '1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                borderRadius: '10px',
                cursor: isFutureDate ? 'not-allowed' : 'pointer',
                background: isSelected
                  ? 'var(--ion-color-primary)'
                  : isDayToday
                    ? 'var(--ion-color-primary-tint)'
                    : 'transparent',
                color: isSelected
                  ? 'white'
                  : !isCurrentMonth || isFutureDate
                    ? 'var(--ion-color-light-shade)'
                    : 'var(--ion-text-color)',
                fontWeight: isDayToday || isSelected ? '600' : '400',
                fontSize: '14px',
                transition: 'all 0.15s ease',
              }}
            >
              {format(day, 'd')}
              {/* Entry indicator dot */}
              {hasEntry && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '4px',
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    background: isSelected
                      ? 'white'
                      : 'var(--ion-color-success)',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid var(--ion-color-light)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              background: 'var(--ion-color-success)',
            }}
          />
          <span style={{ fontSize: '11px', color: 'var(--ion-color-medium)' }}>
            Has entry
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '4px',
              background: 'var(--ion-color-primary-tint)',
            }}
          />
          <span style={{ fontSize: '11px', color: 'var(--ion-color-medium)' }}>
            Today
          </span>
        </div>
      </div>
    </div>
  );
};
