/**
 * EntryList Page
 * Displays all journal entries with improved styling
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import {
  IonContent,
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonBackButton,
  IonIcon,
  IonFab,
  IonFabButton,
  IonSpinner,
  IonText,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/react';
import { add, search, sparklesOutline, journalOutline, filterOutline } from 'ionicons/icons';
import { AISummaryCard } from '../../components/entries/AISummaryCard';
import {
  format,
  isToday,
  isYesterday,
  startOfWeek,
  startOfMonth,
  endOfWeek,
  isThisWeek,
  isThisMonth,
  isSameWeek,
  isSameMonth,
} from 'date-fns';
import { getSummariesForPeriods, PeriodSummary } from '../../services/summaryService';
import { useEntriesStore } from '../../store/entriesStore';
import { getMoodEmoji, getMoodColor, MOODS } from '../../utils/moods';
import type { MoodType } from '../../types';

type ContentFilter = 'all' | 'summaries' | 'entries';

export const EntryListPage: React.FC = () => {
  const history = useHistory();
  const entries = useEntriesStore((state) => state.entries);
  const loading = useEntriesStore((state) => state.loading);
  const error = useEntriesStore((state) => state.error);
  const fetchEntries = useEntriesStore((state) => state.fetchEntries);
  const [weeklySummaries, setWeeklySummaries] = useState<Map<string, PeriodSummary>>(new Map());
  const [monthlySummaries, setMonthlySummaries] = useState<Map<string, PeriodSummary>>(new Map());

  // Filter state
  const [contentFilter, setContentFilter] = useState<ContentFilter>('all');
  const [moodFilter, setMoodFilter] = useState<MoodType | null>(null);
  const [showMoodFilters, setShowMoodFilters] = useState(false);

  // Calculate unique periods from entries
  const { weekStarts, monthStarts } = useMemo(() => {
    const weeks = new Set<string>();
    const months = new Set<string>();

    entries.forEach(entry => {
      const date = new Date(entry.entry_date + 'T00:00:00');
      weeks.add(format(startOfWeek(date, { weekStartsOn: 0 }), 'yyyy-MM-dd'));
      months.add(format(startOfMonth(date), 'yyyy-MM-dd'));
    });

    return {
      weekStarts: Array.from(weeks),
      monthStarts: Array.from(months),
    };
  }, [entries]);

  useEffect(() => {
    fetchEntries();
  }, []);

  // Fetch summaries when periods change
  useEffect(() => {
    if (weekStarts.length > 0 || monthStarts.length > 0) {
      getSummariesForPeriods(weekStarts, monthStarts).then(({ weekly, monthly }) => {
        setWeeklySummaries(weekly);
        setMonthlySummaries(monthly);
      });
    }
  }, [weekStarts, monthStarts]);

  // Helper to get week key for a date
  const getWeekKey = (date: Date) => format(startOfWeek(date, { weekStartsOn: 0 }), 'yyyy-MM-dd');
  const getMonthKey = (date: Date) => format(startOfMonth(date), 'yyyy-MM-dd');

  // Filter entries based on mood
  const filteredEntries = useMemo(() => {
    if (!moodFilter) return entries;
    return entries.filter(entry => entry.mood === moodFilter);
  }, [entries, moodFilter]);

  // Determine what to show based on content filter
  const showSummaries = contentFilter === 'all' || contentFilter === 'summaries';
  const showEntries = contentFilter === 'all' || contentFilter === 'entries';

  const handleRefresh = async (event: CustomEvent) => {
    await fetchEntries();
    event.detail.complete();
  };

  const handleEntryClick = (entryDate: string) => {
    history.push(`/entries/edit/${entryDate}`);
  };

  const handleNewEntry = () => {
    history.push('/entries/edit');
  };

  const handleSearchClick = () => {
    history.push('/search');
  };

  const formatEntryDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEEE, MMM d');
  };

  const stripMarkdown = (text: string) => {
    return text
      .replace(/#{1,6}\s?/g, '') // Remove headings
      .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.+?)\*/g, '$1') // Remove italic
      .replace(/__(.+?)__/g, '$1') // Remove bold (alt)
      .replace(/_(.+?)_/g, '$1') // Remove italic (alt)
      .replace(/~~(.+?)~~/g, '$1') // Remove strikethrough
      .replace(/`(.+?)`/g, '$1') // Remove inline code
      .replace(/^\s*[-*+]\s+/gm, '') // Remove list markers
      .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered list markers
      .replace(/^\s*>/gm, '') // Remove blockquotes
      .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links, keep text
      .replace(/---/g, '') // Remove horizontal rules
      .replace(/<[^>]+>/g, '') // Remove HTML tags
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .trim();
  };

  const formatMonthHeader = (date: Date) => {
    return format(date, 'MMMM yyyy');
  };

  const formatWeekHeader = (date: Date) => {
    const now = new Date();
    if (isThisWeek(date, { weekStartsOn: 0 })) {
      return 'This Week';
    }
    if (isSameWeek(date, new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), { weekStartsOn: 0 })) {
      return 'Last Week';
    }
    const weekStart = startOfWeek(date, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(date, { weekStartsOn: 0 });
    return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`;
  };

  const shouldShowMonthHeader = (entry: typeof entries[0], index: number, list: typeof entries) => {
    if (index === 0) return true;
    const currentDate = new Date(entry.entry_date + 'T00:00:00');
    const prevDate = new Date(list[index - 1].entry_date + 'T00:00:00');
    return !isSameMonth(currentDate, prevDate);
  };

  const shouldShowWeekHeader = (entry: typeof entries[0], index: number, list: typeof entries) => {
    if (index === 0) return true;
    const currentDate = new Date(entry.entry_date + 'T00:00:00');
    const prevDate = new Date(list[index - 1].entry_date + 'T00:00:00');
    return !isSameWeek(currentDate, prevDate, { weekStartsOn: 0 });
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>
          <IonTitle>My Journal</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleSearchClick} aria-label="search">
              <IonIcon slot="icon-only" icon={search} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        {/* Filter Section */}
        {entries.length > 0 && (
          <div style={{ padding: '12px 16px 0 16px' }}>
            {/* Content Type Filters */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setContentFilter('all')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '16px',
                  border: '1px solid',
                  borderColor: contentFilter === 'all' ? 'var(--ion-color-primary)' : 'var(--ion-color-light-shade)',
                  background: contentFilter === 'all' ? 'var(--ion-color-primary)' : 'transparent',
                  color: contentFilter === 'all' ? '#fff' : 'var(--ion-color-medium)',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                }}
              >
                All
              </button>
              <button
                onClick={() => setContentFilter('summaries')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '16px',
                  border: '1px solid',
                  borderColor: contentFilter === 'summaries' ? 'var(--ion-color-primary)' : 'var(--ion-color-light-shade)',
                  background: contentFilter === 'summaries' ? 'var(--ion-color-primary)' : 'transparent',
                  color: contentFilter === 'summaries' ? '#fff' : 'var(--ion-color-medium)',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <IonIcon icon={sparklesOutline} style={{ fontSize: '14px' }} />
                Summaries
              </button>
              <button
                onClick={() => setContentFilter('entries')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '16px',
                  border: '1px solid',
                  borderColor: contentFilter === 'entries' ? 'var(--ion-color-primary)' : 'var(--ion-color-light-shade)',
                  background: contentFilter === 'entries' ? 'var(--ion-color-primary)' : 'transparent',
                  color: contentFilter === 'entries' ? '#fff' : 'var(--ion-color-medium)',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <IonIcon icon={journalOutline} style={{ fontSize: '14px' }} />
                Entries
              </button>

              {/* Mood Filter Toggle */}
              <button
                onClick={() => setShowMoodFilters(!showMoodFilters)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '16px',
                  border: moodFilter ? 'none' : '1px solid var(--ion-color-light-shade)',
                  background: moodFilter ? getMoodColor(moodFilter) : 'transparent',
                  color: moodFilter ? '#fff' : 'var(--ion-color-medium)',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <IonIcon icon={filterOutline} style={{ fontSize: '14px' }} />
                {moodFilter ? getMoodEmoji(moodFilter) : 'Mood'}
              </button>
            </div>

            {/* Mood Filter Options */}
            {showMoodFilters && (
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  marginBottom: '8px',
                  flexWrap: 'wrap',
                  padding: '8px',
                  background: 'var(--ion-color-light)',
                  borderRadius: '12px',
                }}
              >
                <button
                  onClick={() => { setMoodFilter(null); setShowMoodFilters(false); }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    border: !moodFilter ? '2px solid var(--ion-color-primary)' : '1px solid var(--ion-color-medium-tint)',
                    background: !moodFilter ? 'var(--ion-color-primary-tint)' : 'var(--ion-background-color)',
                    color: 'var(--ion-text-color)',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  All
                </button>
                {MOODS.map((mood) => (
                  <button
                    key={mood.value}
                    onClick={() => { setMoodFilter(mood.value); setShowMoodFilters(false); }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      border: moodFilter === mood.value ? `2px solid ${mood.color}` : '1px solid var(--ion-color-medium-tint)',
                      background: moodFilter === mood.value ? `${mood.color}20` : 'var(--ion-background-color)',
                      color: 'var(--ion-text-color)',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>{mood.emoji}</span>
                    {mood.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {loading && entries.length === 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '60vh',
            }}
          >
            <IonSpinner name="crescent" />
          </div>
        )}

        {error && (
          <div
            style={{
              margin: '20px',
              padding: '16px',
              background: 'var(--ion-color-danger-tint)',
              borderRadius: '12px',
              color: 'var(--ion-color-danger-shade)',
            }}
          >
            <IonText>{error}</IonText>
          </div>
        )}

        {!loading && entries.length === 0 && !error && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '60vh',
              textAlign: 'center',
              padding: '32px',
            }}
          >
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'var(--ion-color-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24px',
              }}
            >
              <IonIcon
                icon={journalOutline}
                style={{ fontSize: '40px', color: 'var(--ion-color-medium)' }}
              />
            </div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '600' }}>
              No entries yet
            </h2>
            <IonText color="medium">
              <p style={{ margin: '0 0 24px 0', lineHeight: '1.5' }}>
                Start your journaling journey by<br />creating your first entry
              </p>
            </IonText>
            <IonButton onClick={handleNewEntry} shape="round">
              <IonIcon slot="start" icon={add} />
              Write First Entry
            </IonButton>
          </div>
        )}

        {/* Empty state for filtered results */}
        {entries.length > 0 && filteredEntries.length === 0 && moodFilter && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '48px 32px',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: '48px', marginBottom: '16px' }}>{getMoodEmoji(moodFilter)}</span>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>
              No {MOODS.find(m => m.value === moodFilter)?.label.toLowerCase()} entries
            </h3>
            <IonText color="medium">
              <p style={{ margin: 0 }}>Try selecting a different mood filter</p>
            </IonText>
            <IonButton
              fill="clear"
              onClick={() => setMoodFilter(null)}
              style={{ marginTop: '16px' }}
            >
              Clear filter
            </IonButton>
          </div>
        )}

        {filteredEntries.length > 0 && (
          <div style={{ padding: '12px 16px 100px 16px' }}>
            {filteredEntries.map((entry, index) => {
              const entryDate = new Date(entry.entry_date + 'T00:00:00');
              const showMonth = shouldShowMonthHeader(entry, index, filteredEntries);
              const showWeek = shouldShowWeekHeader(entry, index, filteredEntries);

              return (
                <React.Fragment key={entry.id}>
                  {/* Month Header */}
                  {showMonth && showEntries && (
                    <div
                      style={{
                        marginTop: index === 0 ? '0' : '24px',
                        marginBottom: '8px',
                        paddingBottom: '8px',
                        borderBottom: '2px solid var(--ion-color-primary)',
                      }}
                    >
                      <h2
                        style={{
                          margin: 0,
                          fontSize: '18px',
                          fontWeight: '700',
                          color: 'var(--ion-color-primary)',
                        }}
                      >
                        {formatMonthHeader(entryDate)}
                      </h2>
                    </div>
                  )}

                  {/* Monthly AI Summary Card - only show for completed months */}
                  {showMonth && showSummaries && !isThisMonth(entryDate) && (
                    <AISummaryCard
                      type="month"
                      period={formatMonthHeader(entryDate)}
                      summary={monthlySummaries.get(getMonthKey(entryDate))?.summary}
                      monthKey={format(entryDate, 'yyyy-MM')}
                    />
                  )}

                  {/* Week Header */}
                  {showWeek && showEntries && (
                    <div
                      style={{
                        marginTop: showMonth ? '4px' : '16px',
                        marginBottom: '10px',
                        paddingLeft: '4px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          color: 'var(--ion-color-medium)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        {formatWeekHeader(entryDate)}
                      </span>
                    </div>
                  )}

                  {/* Weekly AI Summary Card - only show for completed weeks */}
                  {showWeek && showSummaries && !isThisWeek(entryDate, { weekStartsOn: 0 }) && (
                    <AISummaryCard
                      type="week"
                      period={formatWeekHeader(entryDate)}
                      summary={weeklySummaries.get(getWeekKey(entryDate))?.summary}
                      weekStart={startOfWeek(entryDate, { weekStartsOn: 0 })}
                      weekEnd={endOfWeek(entryDate, { weekStartsOn: 0 })}
                    />
                  )}

                  {/* Entry Card */}
                  {showEntries && (
                    <button
                      onClick={() => handleEntryClick(entry.entry_date)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '14px',
                        padding: '16px',
                        marginBottom: '10px',
                        background: 'var(--ion-background-color, #fff)',
                        border: '1px solid var(--ion-color-light)',
                        borderRadius: '14px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'transform 0.1s ease',
                      }}
                    >
                      {/* Mood indicator */}
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '12px',
                          background: entry.mood
                            ? `${getMoodColor(entry.mood)}15`
                            : 'var(--ion-color-light)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {entry.mood ? (
                          <span style={{ fontSize: '24px' }}>{getMoodEmoji(entry.mood)}</span>
                        ) : (
                          <IonIcon
                            icon={journalOutline}
                            style={{ fontSize: '20px', color: 'var(--ion-color-medium)' }}
                          />
                        )}
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
                          <span style={{ fontWeight: '600', fontSize: '15px' }}>
                            {formatEntryDate(entry.entry_date)}
                          </span>
                          <IonText color="medium">
                            <span style={{ fontSize: '12px' }}>
                              {format(new Date(entry.entry_date + 'T00:00:00'), 'MMM d')}
                            </span>
                          </IonText>
                        </div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: '14px',
                            lineHeight: '1.5',
                            color: 'var(--ion-color-medium-shade)',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {entry.content ? stripMarkdown(entry.content) : 'No content yet...'}
                        </p>
                      </div>
                    </button>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}

        <IonFab vertical="bottom" horizontal="end" slot="fixed" style={{ marginBottom: '16px', marginRight: '16px' }}>
          <IonFabButton onClick={handleNewEntry}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>
      </IonContent>
    </IonPage>
  );
};
