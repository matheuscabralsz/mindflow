/**
 * EntryEditor Page
 * Create or edit entries by date with beautiful UI
 * Route: /entries/edit/:date (YYYY-MM-DD) or /entries/edit (defaults to today)
 */

import React, { useState, useEffect, useRef } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  IonContent,
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonButton,
  IonSpinner,
  IonToast,
  IonText,
  IonIcon,
  IonTextarea,
} from '@ionic/react';
import { format, isToday, isYesterday } from 'date-fns';
import { calendarOutline, checkmarkOutline } from 'ionicons/icons';
import { MoodPicker } from '../../components/entries/MoodPicker';
import { useEntriesStore } from '../../store/entriesStore';
import type { MoodType, Entry } from '../../types';

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Validate date string is in YYYY-MM-DD format
 */
function isValidDateFormat(dateStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !isNaN(Date.parse(dateStr));
}

export const EntryEditorPage: React.FC = () => {
  const history = useHistory();
  const { date } = useParams<{ date?: string }>();
  const { user } = useAuthStore();
  const { selectedEntry, loading, error, fetchEntryByDate, createEntry, updateEntry, setSelectedEntry } =
    useEntriesStore();

  const [content, setContent] = useState('');
  const [mood, setMood] = useState<MoodType | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [saving, setSaving] = useState(false);

  // Track which date we've fetched to prevent double fetches
  const fetchedDateRef = useRef<string | null>(null);
  // Track the existing entry for this date (if any)
  const existingEntryRef = useRef<Entry | null>(null);

  // Determine the effective entry date
  const entryDate = date && isValidDateFormat(date) ? date : null;

  // Redirect to today's date if no valid date in URL
  useEffect(() => {
    if (!entryDate) {
      const today = getTodayDate();
      history.replace(`/entries/edit/${today}`);
    }
  }, [entryDate, history]);

  // Fetch existing entry when date changes (don't create)
  useEffect(() => {
    if (entryDate && user?.id && fetchedDateRef.current !== entryDate) {
      // Reset state for new date
      setIsInitialized(false);
      setContent('');
      setMood(null);
      existingEntryRef.current = null;
      fetchedDateRef.current = entryDate;

      // Only fetch, don't create
      fetchEntryByDate(entryDate).then((entry) => {
        existingEntryRef.current = entry;
        if (entry) {
          setContent(entry.content);
          setMood(entry.mood);
        }
        setIsInitialized(true);
      });
    }
  }, [entryDate, user?.id, fetchEntryByDate]);

  // Sync with selectedEntry if it matches our date
  useEffect(() => {
    if (selectedEntry && selectedEntry.entry_date === entryDate && !isInitialized) {
      existingEntryRef.current = selectedEntry;
      setContent(selectedEntry.content);
      setMood(selectedEntry.mood);
      setIsInitialized(true);
    }
  }, [selectedEntry, entryDate, isInitialized]);

  const handleSave = async () => {
    if (!entryDate || !user?.id) {
      return;
    }

    setSaving(true);
    try {
      const existingEntry = existingEntryRef.current;

      if (existingEntry?.id) {
        // Update existing entry
        await updateEntry(existingEntry.id, { content: content.trim(), mood });
      } else {
        // Create new entry
        const newEntry = await createEntry({
          content: content.trim(),
          mood,
          entry_date: entryDate,
          user_id: user.id,
        });
        existingEntryRef.current = newEntry;
        setSelectedEntry(newEntry);
      }

      setSuccessMessage('Entry saved!');

      setTimeout(() => {
        history.push('/entries');
      }, 800);
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  // Format date for display
  const formatDisplayDate = () => {
    if (!entryDate) return '';
    const dateObj = new Date(entryDate + 'T00:00:00');
    if (isToday(dateObj)) return 'Today';
    if (isYesterday(dateObj)) return 'Yesterday';
    return format(dateObj, 'EEEE, MMM d');
  };

  const fullDate = entryDate ? format(new Date(entryDate + 'T00:00:00'), 'MMMM d, yyyy') : '';

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/entries" text="" />
          </IonButtons>
          <IonButtons slot="end">
            <IonButton
              onClick={handleSave}
              disabled={saving || !isInitialized}
              strong
              color="primary"
            >
              {saving ? (
                <IonSpinner name="crescent" style={{ width: '20px', height: '20px' }} />
              ) : (
                <>
                  <IonIcon slot="start" icon={checkmarkOutline} />
                  Save
                </>
              )}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {loading && !isInitialized && (
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

        {isInitialized && (
          <div style={{ padding: '20px' }}>
            {/* Date Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '24px',
                paddingBottom: '16px',
                borderBottom: '1px solid var(--ion-color-light)',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'var(--ion-color-primary-tint)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IonIcon
                  icon={calendarOutline}
                  style={{ fontSize: '22px', color: 'var(--ion-color-primary)' }}
                />
              </div>
              <div>
                <div style={{ fontWeight: '600', fontSize: '18px' }}>{formatDisplayDate()}</div>
                <IonText color="medium">
                  <span style={{ fontSize: '13px' }}>{fullDate}</span>
                </IonText>
              </div>
            </div>

            {/* Mood Picker */}
            <div
              style={{
                marginBottom: '24px',
                padding: '16px',
                background: 'var(--ion-background-color, #fff)',
                border: '1px solid var(--ion-color-light)',
                borderRadius: '16px',
              }}
            >
              <MoodPicker selectedMood={mood} onMoodSelect={setMood} disabled={loading} />
            </div>

            {/* Content Editor */}
            <div
              style={{
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  marginBottom: '10px',
                  fontSize: '15px',
                  fontWeight: '600',
                }}
              >
                What's on your mind?
              </div>
              <IonTextarea
                data-testid="entry-content"
                placeholder="Write your thoughts here..."
                value={content}
                onIonInput={(e) => setContent(e.detail.value || '')}
                autoGrow
                rows={10}
                disabled={loading}
                style={{
                  '--background': 'var(--ion-background-color, #fff)',
                  '--border-radius': '14px',
                  '--padding-start': '16px',
                  '--padding-end': '16px',
                  '--padding-top': '14px',
                  '--padding-bottom': '14px',
                  border: '1px solid var(--ion-color-light)',
                  borderRadius: '14px',
                  fontSize: '16px',
                  lineHeight: '1.6',
                } as React.CSSProperties}
              />
            </div>

            {/* Character count */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <IonText color="medium">
                <span style={{ fontSize: '12px' }}>{content.length.toLocaleString()} characters</span>
              </IonText>
              {content.length > 45000 && (
                <IonText color="warning">
                  <span style={{ fontSize: '12px' }}>
                    {(50000 - content.length).toLocaleString()} remaining
                  </span>
                </IonText>
              )}
            </div>
          </div>
        )}

        <IonToast
          isOpen={!!successMessage}
          message={successMessage}
          duration={1500}
          color="success"
          position="top"
        />

        <IonToast
          isOpen={!!error}
          message={error || ''}
          duration={3000}
          color="danger"
          position="top"
        />
      </IonContent>
    </IonPage>
  );
};
