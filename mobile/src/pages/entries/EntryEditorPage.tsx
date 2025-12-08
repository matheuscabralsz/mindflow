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
} from '@ionic/react';
import { format, isToday, isYesterday } from 'date-fns';
import { calendarOutline, checkmarkOutline } from 'ionicons/icons';
import { MoodPicker } from '../../components/entries/MoodPicker';
import { RichTextEditor } from '../../components/entries/RichTextEditor';
import { ImageGallery } from '../../components/entries/ImageGallery';
import { useEntriesStore } from '../../store/entriesStore';
import {
  uploadEntryImage,
  getEntryImages,
  deleteEntryImage,
} from '../../services/images.service';
import type { MoodType, Entry, EntryImage } from '../../types';

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

/**
 * Get plain text length from HTML content
 */
function getPlainTextLength(html: string): number {
  // Create a temporary div to parse HTML and extract text
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || div.innerText || '').length;
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
  const [images, setImages] = useState<EntryImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);

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
      setImages([]);
      existingEntryRef.current = null;
      fetchedDateRef.current = entryDate;

      // Only fetch, don't create
      fetchEntryByDate(entryDate).then(async (entry) => {
        existingEntryRef.current = entry;
        if (entry) {
          setContent(entry.content);
          setMood(entry.mood);
          // Load images for existing entry
          try {
            const entryImages = await getEntryImages(entry.id);
            setImages(entryImages);
          } catch (err) {
            console.error('Failed to load images:', err);
          }
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

  /**
   * Ensure entry exists before uploading images
   * Creates entry if it doesn't exist yet
   */
  const ensureEntryExists = async (): Promise<Entry | null> => {
    if (!entryDate || !user?.id) return null;

    let entry = existingEntryRef.current;
    if (entry?.id) return entry;

    // Create new entry first
    try {
      entry = await createEntry({
        content: content.trim() || '',
        mood,
        entry_date: entryDate,
        user_id: user.id,
      });
      existingEntryRef.current = entry;
      setSelectedEntry(entry);
      return entry;
    } catch (err) {
      console.error('Failed to create entry for image upload:', err);
      return null;
    }
  };

  const handleImageUpload = async (files: File[]) => {
    if (!user?.id) return;

    setImagesLoading(true);
    try {
      const entry = await ensureEntryExists();
      if (!entry) {
        throw new Error('Could not create entry for images');
      }

      const currentOrder = images.length;
      const uploadPromises = files.map((file, index) =>
        uploadEntryImage(file, entry.id, user.id, currentOrder + index)
      );

      const results = await Promise.all(uploadPromises);
      const newImages = results.map((r) => ({ ...r.image, url: r.url }));
      setImages((prev) => [...prev, ...newImages]);
    } catch (err) {
      console.error('Upload error:', err);
      throw err;
    } finally {
      setImagesLoading(false);
    }
  };

  const handleImageDelete = async (imageId: string) => {
    try {
      await deleteEntryImage(imageId);
      setImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch (err) {
      console.error('Delete error:', err);
      throw err;
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
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder="Write your thoughts here..."
                disabled={loading}
              />
            </div>

            {/* Character count */}
            {(() => {
              const charCount = getPlainTextLength(content);
              return (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '24px',
                  }}
                >
                  <IonText color="medium">
                    <span style={{ fontSize: '12px' }}>{charCount.toLocaleString()} characters</span>
                  </IonText>
                  {charCount > 45000 && (
                    <IonText color="warning">
                      <span style={{ fontSize: '12px' }}>
                        {(50000 - charCount).toLocaleString()} remaining
                      </span>
                    </IonText>
                  )}
                </div>
              );
            })()}

            {/* Image Gallery */}
            <ImageGallery
              images={images}
              onUpload={handleImageUpload}
              onDelete={handleImageDelete}
              disabled={loading || saving}
              loading={imagesLoading}
            />
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
