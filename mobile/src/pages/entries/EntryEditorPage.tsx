/**
 * EntryEditor Page
 * Create or edit entries by date
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
  IonTitle,
  IonButtons,
  IonBackButton,
  IonButton,
  IonSpinner,
  IonToast,
  IonText,
} from '@ionic/react';
import { format } from 'date-fns';
import { MoodPicker } from '../../components/entries/MoodPicker';
import { useEntriesStore } from '../../store/entriesStore';
import type { MoodType } from '../../types';

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
  const { selectedEntry, loading, error, fetchOrCreateEntryByDate, updateEntry } =
    useEntriesStore();

  const [content, setContent] = useState('');
  const [mood, setMood] = useState<MoodType | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  // Track which date we've fetched to prevent double fetches
  const fetchedDateRef = useRef<string | null>(null);

  // Determine the effective entry date
  const entryDate = date && isValidDateFormat(date) ? date : null;

  // Redirect to today's date if no valid date in URL
  useEffect(() => {
    if (!entryDate) {
      const today = getTodayDate();
      history.replace(`/entries/edit/${today}`);
    }
  }, [entryDate, history]);

  // Fetch or create entry when date changes
  useEffect(() => {
    if (entryDate && user?.id && fetchedDateRef.current !== entryDate) {
      // Reset state for new date
      setIsInitialized(false);
      setContent('');
      setMood(null);
      fetchedDateRef.current = entryDate;
      fetchOrCreateEntryByDate(entryDate, user.id);
    }
  }, [entryDate, user?.id, fetchOrCreateEntryByDate]);

  // Update content when entry is loaded
  useEffect(() => {
    if (selectedEntry && selectedEntry.entry_date === entryDate && !isInitialized) {
      setContent(selectedEntry.content);
      setMood(selectedEntry.mood);
      setIsInitialized(true);
    }
  }, [selectedEntry, entryDate, isInitialized]);

  const handleSave = async () => {
    if (!selectedEntry?.id) {
      return;
    }

    try {
      await updateEntry(selectedEntry.id, { content: content.trim(), mood });
      setSuccessMessage('Entry saved successfully!');

      setTimeout(() => {
        history.push('/entries');
      }, 1000);
    } catch (err) {
      console.error('Save error:', err);
    }
  };

  const handleCancel = () => {
    history.goBack();
  };

  // Format date for display
  const displayDate = entryDate
    ? format(new Date(entryDate + 'T00:00:00'), 'EEEE, MMMM d, yyyy')
    : '';

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/entries" />
          </IonButtons>
          <IonTitle>{displayDate}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleCancel} color="medium">
              Cancel
            </IonButton>
            <IonButton onClick={handleSave} disabled={loading} strong>
              {loading ? <IonSpinner name="crescent" /> : 'Save'}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {loading && !isInitialized && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '50vh',
            }}
          >
            <IonSpinner name="crescent" />
          </div>
        )}

        {isInitialized && (
          <>
            <div style={{ marginBottom: '20px' }}>
              <MoodPicker selectedMood={mood} onMoodSelect={setMood} disabled={loading} />
            </div>

            <textarea
              data-testid="entry-content"
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value || '')}
              rows={15}
              disabled={loading}
              style={{
                border: '1px solid var(--ion-color-medium)',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '16px',
                lineHeight: '1.6',
                width: '100%',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />

            <div
              style={{
                marginTop: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <IonText color="medium">
                <small>{content.length} characters</small>
              </IonText>
              {content.length > 10000 && (
                <IonText color="danger">
                  <small>Max 50,000 characters</small>
                </IonText>
              )}
            </div>
          </>
        )}

        <IonToast
          isOpen={!!successMessage}
          message={successMessage}
          duration={2000}
          color="success"
        />

        <IonToast
          isOpen={!!error}
          message={error || ''}
          duration={3000}
          color="danger"
        />
      </IonContent>
    </IonPage>
  );
};
