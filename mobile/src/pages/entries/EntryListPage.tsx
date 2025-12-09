/**
 * EntryList Page
 * Displays all journal entries with improved styling
 */

import React, { useEffect } from 'react';
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
  useIonAlert,
} from '@ionic/react';
import { add, search, sparklesOutline, journalOutline, trashOutline } from 'ionicons/icons';
import { AISummaryCard } from '../../components/entries/AISummaryCard';
import {
  format,
  isToday,
  isYesterday,
  startOfWeek,
  endOfWeek,
  isThisWeek,
  isSameWeek,
  isSameMonth,
} from 'date-fns';
import { useEntriesStore } from '../../store/entriesStore';
import { getMoodEmoji, getMoodColor } from '../../utils/moods';

export const EntryListPage: React.FC = () => {
  const history = useHistory();
  const [presentAlert] = useIonAlert();
  const { entries, loading, error, fetchEntries, deleteEntry } = useEntriesStore();

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

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

  const handleSummariesClick = () => {
    history.push('/summaries');
  };

  const handleDeleteEntry = (e: React.MouseEvent, entryId: string, entryDate: string) => {
    e.stopPropagation();
    presentAlert({
      header: 'Delete Entry',
      message: `Are you sure you want to delete the entry from ${formatEntryDate(entryDate)}?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            deleteEntry(entryId);
          },
        },
      ],
    });
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

  const shouldShowMonthHeader = (entry: typeof entries[0], index: number) => {
    if (index === 0) return true;
    const currentDate = new Date(entry.entry_date + 'T00:00:00');
    const prevDate = new Date(entries[index - 1].entry_date + 'T00:00:00');
    return !isSameMonth(currentDate, prevDate);
  };

  const shouldShowWeekHeader = (entry: typeof entries[0], index: number) => {
    if (index === 0) return true;
    const currentDate = new Date(entry.entry_date + 'T00:00:00');
    const prevDate = new Date(entries[index - 1].entry_date + 'T00:00:00');
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
            <IonButton onClick={handleSummariesClick} aria-label="AI summaries">
              <IonIcon slot="icon-only" icon={sparklesOutline} />
            </IonButton>
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

        {entries.length > 0 && (
          <div style={{ padding: '12px 16px 100px 16px' }}>
            {entries.map((entry, index) => {
              const entryDate = new Date(entry.entry_date + 'T00:00:00');
              const showMonth = shouldShowMonthHeader(entry, index);
              const showWeek = shouldShowWeekHeader(entry, index);

              return (
                <React.Fragment key={entry.id}>
                  {/* Month Header */}
                  {showMonth && (
                    <>
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
                      {/* Monthly AI Summary Card */}
                      <AISummaryCard
                        type="month"
                        period={formatMonthHeader(entryDate)}
                      />
                    </>
                  )}

                  {/* Week Header */}
                  {showWeek && (
                    <>
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
                      {/* Weekly AI Summary Card */}
                      <AISummaryCard
                        type="week"
                        period={formatWeekHeader(entryDate)}
                      />
                    </>
                  )}

                  {/* Entry Card */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '10px',
                    }}
                  >
                <button
                  onClick={() => handleEntryClick(entry.entry_date)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                    padding: '16px',
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

                {/* Delete button */}
                <button
                  onClick={(e) => handleDeleteEntry(e, entry.id, entry.entry_date)}
                  aria-label="Delete entry"
                  style={{
                    width: '44px',
                    height: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    color: 'var(--ion-color-medium)',
                    flexShrink: 0,
                  }}
                >
                  <IonIcon icon={trashOutline} style={{ fontSize: '20px' }} />
                </button>
                  </div>
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
