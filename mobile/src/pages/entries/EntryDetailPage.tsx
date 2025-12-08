/**
 * EntryDetail Page
 * View full entry with edit and delete options
 * Route: /entries/view/:date (YYYY-MM-DD)
 */

import React, { useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import {
  IonContent,
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonSpinner,
  IonText,
  IonAlert,
  IonToast,
} from '@ionic/react';
import { createOutline, trashOutline, calendarOutline, documentTextOutline, imageOutline } from 'ionicons/icons';
import { format, isToday, isYesterday } from 'date-fns';
import { useEntriesStore } from '../../store/entriesStore';
import { getMoodEmoji, getMoodLabel, getMoodColor } from '../../utils/moods';
import { getEntryImages } from '../../services/images.service';
import type { EntryImage } from '../../types';

export const EntryDetailPage: React.FC = () => {
  const history = useHistory();
  const { date } = useParams<{ date: string }>();

  const { selectedEntry, loading, error, fetchEntryByDate, deleteEntryByDate } = useEntriesStore();

  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [images, setImages] = useState<EntryImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (date) {
      fetchEntryByDate(date);
    }
  }, [date, fetchEntryByDate]);

  // Load images when entry is available
  useEffect(() => {
    const loadImages = async () => {
      if (selectedEntry?.id) {
        try {
          const entryImages = await getEntryImages(selectedEntry.id);
          setImages(entryImages);
        } catch (err) {
          console.error('Failed to load images:', err);
        }
      }
    };
    loadImages();
  }, [selectedEntry?.id]);

  const handleEdit = () => {
    history.push(`/entries/edit/${date}`);
  };

  const handleDelete = async () => {
    try {
      await deleteEntryByDate(date);
      setDeleteSuccess(true);
      setTimeout(() => {
        history.replace('/entries');
      }, 1000);
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Format date for display
  const formatDisplayDate = () => {
    if (!date) return '';
    const dateObj = new Date(date + 'T00:00:00');
    if (isToday(dateObj)) return 'Today';
    if (isYesterday(dateObj)) return 'Yesterday';
    return format(dateObj, 'EEEE, MMM d');
  };

  const fullDate = date ? format(new Date(date + 'T00:00:00'), 'MMMM d, yyyy') : '';

  if (loading && !selectedEntry) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/entries" text="" />
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
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
        </IonContent>
      </IonPage>
    );
  }

  if (!selectedEntry) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/entries" text="" />
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
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
                icon={documentTextOutline}
                style={{ fontSize: '40px', color: 'var(--ion-color-medium)' }}
              />
            </div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '600' }}>
              Entry not found
            </h2>
            <IonText color="medium">
              <p style={{ margin: 0, lineHeight: '1.5' }}>
                {error || 'No entry exists for this date.'}
              </p>
            </IonText>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const moodColor = selectedEntry.mood ? getMoodColor(selectedEntry.mood) : null;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/entries" text="" />
          </IonButtons>
          <IonButtons slot="end">
            <IonButton onClick={handleEdit}>
              <IonIcon slot="icon-only" icon={createOutline} />
            </IonButton>
            <IonButton onClick={() => setShowDeleteAlert(true)} color="danger">
              <IonIcon slot="icon-only" icon={trashOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div style={{ padding: '20px' }}>
          {/* Date Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'var(--ion-color-primary-tint)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IonIcon
                icon={calendarOutline}
                style={{ fontSize: '24px', color: 'var(--ion-color-primary)' }}
              />
            </div>
            <div>
              <div style={{ fontWeight: '600', fontSize: '20px' }}>{formatDisplayDate()}</div>
              <IonText color="medium">
                <span style={{ fontSize: '14px' }}>{fullDate}</span>
              </IonText>
            </div>
          </div>

          {/* Mood Display */}
          {selectedEntry.mood && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 16px',
                background: `${moodColor}10`,
                border: `1px solid ${moodColor}30`,
                borderRadius: '14px',
                marginBottom: '20px',
              }}
            >
              <span style={{ fontSize: '32px' }}>{getMoodEmoji(selectedEntry.mood)}</span>
              <div>
                <div style={{ fontWeight: '600', fontSize: '15px', color: moodColor || undefined }}>
                  Feeling {getMoodLabel(selectedEntry.mood)}
                </div>
              </div>
            </div>
          )}

          {/* Entry Content */}
          <div
            style={{
              padding: '20px',
              background: 'var(--ion-background-color, #fff)',
              border: '1px solid var(--ion-color-light)',
              borderRadius: '16px',
              marginBottom: '20px',
            }}
          >
            {selectedEntry.content ? (
              <div
                className="entry-content-rendered"
                style={{
                  fontSize: '16px',
                  lineHeight: '1.8',
                  wordBreak: 'break-word',
                }}
                dangerouslySetInnerHTML={{ __html: selectedEntry.content }}
              />
            ) : (
              <IonText color="medium">
                <div style={{ fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                  No content written yet
                </div>
              </IonText>
            )}
          </div>

          {/* Images Section */}
          {images.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px',
                  fontSize: '15px',
                  fontWeight: '600',
                }}
              >
                <IonIcon icon={imageOutline} style={{ color: 'var(--ion-color-primary)' }} />
                <span>Photos ({images.length})</span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                }}
              >
                {images.map((img) => (
                  <div
                    key={img.id}
                    style={{
                      aspectRatio: '1',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                    }}
                    onClick={() => setSelectedImage(img.url || null)}
                  >
                    <img
                      src={img.url}
                      alt={img.file_name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata Footer */}
          {selectedEntry.updated_at !== selectedEntry.created_at && (
            <IonText color="medium">
              <div style={{ fontSize: '12px', textAlign: 'center' }}>
                Last edited {format(new Date(selectedEntry.updated_at), 'MMM d, yyyy \'at\' h:mm a')}
              </div>
            </IonText>
          )}
        </div>

        {/* Image Lightbox */}
        {selectedImage && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.9)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
            onClick={() => setSelectedImage(null)}
          >
            <img
              src={selectedImage}
              alt="Full size"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                borderRadius: '8px',
              }}
            />
          </div>
        )}

        {/* Delete Confirmation Alert */}
        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header="Delete Entry"
          message="Are you sure you want to delete this entry? This action cannot be undone."
          buttons={[
            {
              text: 'Cancel',
              role: 'cancel',
            },
            {
              text: 'Delete',
              role: 'destructive',
              handler: handleDelete,
            },
          ]}
        />

        {/* Success Toast */}
        <IonToast
          isOpen={deleteSuccess}
          message="Entry deleted"
          duration={1500}
          color="success"
          position="top"
        />

        {/* Error Toast */}
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
