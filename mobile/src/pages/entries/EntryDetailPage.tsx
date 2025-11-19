/**
 * EntryDetail Page
 * View full entry with edit and delete options
 */

import React, { useEffect } from 'react';
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
  IonIcon,
  IonCard,
  IonCardContent,
  IonSpinner,
  IonText,
  IonAlert,
  IonToast,
} from '@ionic/react';
import { createOutline, trashOutline } from 'ionicons/icons';
import { format } from 'date-fns';
import { useEntriesStore } from '../../store/entriesStore';
import { getMoodEmoji, getMoodLabel } from '../../utils/moods';

export const EntryDetailPage: React.FC = () => {
  const history = useHistory();
  const { id } = useParams<{ id: string }>();

  const { selectedEntry, loading, error, fetchEntry, deleteEntry } = useEntriesStore();

  const [showDeleteAlert, setShowDeleteAlert] = React.useState(false);
  const [deleteSuccess, setDeleteSuccess] = React.useState(false);

  useEffect(() => {
    if (id) {
      fetchEntry(id);
    }
  }, [id, fetchEntry]);

  const handleEdit = () => {
    history.push(`/entries/edit/${id}`);
  };

  const handleDelete = async () => {
    try {
      await deleteEntry(id);
      setDeleteSuccess(true);
      setTimeout(() => {
        history.replace('/entries');
      }, 1000);
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  if (loading && !selectedEntry) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/entries" />
            </IonButtons>
            <IonTitle>Entry</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
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
              <IonBackButton defaultHref="/entries" />
            </IonButtons>
            <IonTitle>Entry</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <IonText color="danger">
            <h2>Entry not found</h2>
            <p>{error || 'The entry you are looking for does not exist.'}</p>
          </IonText>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/entries" />
          </IonButtons>
          <IonTitle>Entry</IonTitle>
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

      <IonContent className="ion-padding">
        <IonCard>
          <IonCardContent>
            {/* Date and Mood Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                paddingBottom: '12px',
                borderBottom: '1px solid var(--ion-color-light)',
              }}
            >
              <div>
                <IonText>
                  <h2 style={{ margin: 0 }}>
                    {format(new Date(selectedEntry.created_at), 'PPP')}
                  </h2>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--ion-color-medium)' }}>
                    {format(new Date(selectedEntry.created_at), 'p')}
                  </p>
                </IonText>
              </div>
              {selectedEntry.mood && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '36px' }}>{getMoodEmoji(selectedEntry.mood)}</div>
                  <IonText color="medium">
                    <small>{getMoodLabel(selectedEntry.mood)}</small>
                  </IonText>
                </div>
              )}
            </div>

            {/* Entry Content */}
            <IonText>
              <div
                style={{
                  fontSize: '16px',
                  lineHeight: '1.8',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {selectedEntry.content}
              </div>
            </IonText>

            {/* Metadata Footer */}
            <div
              style={{
                marginTop: '24px',
                paddingTop: '12px',
                borderTop: '1px solid var(--ion-color-light)',
              }}
            >
              <IonText color="medium">
                <small>
                  {selectedEntry.updated_at !== selectedEntry.created_at && (
                    <>Last edited {format(new Date(selectedEntry.updated_at), 'PPp')}</>
                  )}
                </small>
              </IonText>
            </div>
          </IonCardContent>
        </IonCard>

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
          message="Entry deleted successfully"
          duration={2000}
          color="success"
        />

        {/* Error Toast */}
        <IonToast isOpen={!!error} message={error || ''} duration={3000} color="danger" />
      </IonContent>
    </IonPage>
  );
};
