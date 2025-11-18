/**
 * EntryEditor Page
 * Create new entries or edit existing ones
 */

import React, { useState, useEffect } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import {
  IonContent,
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonButton,
  IonTextarea,
  IonSpinner,
  IonToast,
  IonText,
} from '@ionic/react';
import { MoodPicker } from '../../components/entries/MoodPicker';
import { useEntriesStore } from '../../store/entriesStore';
import type { MoodType } from '../../types';

export const EntryEditorPage: React.FC = () => {
  const history = useHistory();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = Boolean(id && id !== 'new');

  const { selectedEntry, loading, error, fetchEntry, createEntry, updateEntry } =
    useEntriesStore();

  const [content, setContent] = useState('');
  const [mood, setMood] = useState<MoodType | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize content only once when editing
  useEffect(() => {
    if (isEditMode && id && !isInitialized) {
      if (selectedEntry?.id !== id) {
        fetchEntry(id);
      } else if (selectedEntry) {
        setContent(selectedEntry.content);
        setMood(selectedEntry.mood);
        setIsInitialized(true);
      }
    }
  }, [id, isEditMode, selectedEntry, fetchEntry, isInitialized]);

  // Update content when selected entry loads (only if not already initialized)
  useEffect(() => {
    if (isEditMode && selectedEntry && selectedEntry.id === id && !isInitialized) {
      setContent(selectedEntry.content);
      setMood(selectedEntry.mood);
      setIsInitialized(true);
    }
  }, [selectedEntry, id, isEditMode, isInitialized]);

  const handleSave = async () => {
    if (!content.trim()) {
      return;
    }

    try {
      if (isEditMode && id) {
        await updateEntry(id, { content: content.trim(), mood });
        setSuccessMessage('Entry updated successfully!');
      } else {
        await createEntry({ content: content.trim(), mood });
        setSuccessMessage('Entry created successfully!');
      }

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

  const isContentEmpty = !content.trim();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/entries" />
          </IonButtons>
          <IonTitle>{isEditMode ? 'Edit Entry' : 'New Entry'}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleCancel} color="medium">
              Cancel
            </IonButton>
            <IonButton onClick={handleSave} disabled={isContentEmpty || loading} strong>
              {loading ? <IonSpinner name="crescent" /> : 'Save'}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {loading && isEditMode && !isInitialized && (
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

        {(!loading || isInitialized || !isEditMode) && (
          <>
            <div style={{ marginBottom: '20px' }}>
              <MoodPicker selectedMood={mood} onMoodSelect={setMood} disabled={loading} />
            </div>

            <IonTextarea
              placeholder="What's on your mind?"
              value={content}
              onIonInput={(e) => setContent(e.detail.value || '')}
              rows={15}
              autoGrow
              disabled={loading}
              style={{
                border: '1px solid var(--ion-color-medium)',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '16px',
                lineHeight: '1.6',
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
