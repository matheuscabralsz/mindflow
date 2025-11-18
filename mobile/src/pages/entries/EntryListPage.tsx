/**
 * EntryList Page
 * Displays all journal entries with infinite scroll
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
  IonIcon,
  IonFab,
  IonFabButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonSpinner,
  IonText,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/react';
import { add, personCircle } from 'ionicons/icons';
import { format } from 'date-fns';
import { useEntriesStore } from '../../store/entriesStore';

const MOOD_EMOJI: Record<string, string> = {
  happy: '😊',
  sad: '😢',
  anxious: '😰',
  calm: '😌',
  stressed: '😫',
  neutral: '😐',
};

export const EntryListPage: React.FC = () => {
  const history = useHistory();
  const { entries, loading, error, fetchEntries } = useEntriesStore();

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleRefresh = async (event: CustomEvent) => {
    await fetchEntries();
    event.detail.complete();
  };

  const handleEntryClick = (id: string) => {
    history.push(`/entries/${id}`);
  };

  const handleNewEntry = () => {
    history.push('/entries/new');
  };

  const handleProfileClick = () => {
    history.push('/profile');
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>My Journal</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleProfileClick}>
              <IonIcon slot="icon-only" icon={personCircle} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        {loading && entries.length === 0 && (
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

        {error && (
          <IonCard color="danger">
            <IonCardContent>
              <IonText color="light">{error}</IonText>
            </IonCardContent>
          </IonCard>
        )}

        {!loading && entries.length === 0 && !error && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '50vh',
              textAlign: 'center',
              padding: '20px',
            }}
          >
            <IonText color="medium">
              <h2>No entries yet</h2>
              <p>Start your journaling journey by creating your first entry!</p>
            </IonText>
            <IonButton onClick={handleNewEntry} style={{ marginTop: '20px' }}>
              <IonIcon slot="start" icon={add} />
              Create Entry
            </IonButton>
          </div>
        )}

        {entries.map((entry) => (
          <IonCard key={entry.id} button onClick={() => handleEntryClick(entry.id)}>
            <IonCardHeader>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <IonCardTitle>{format(new Date(entry.created_at), 'PPP')}</IonCardTitle>
                {entry.mood && (
                  <span style={{ fontSize: '24px' }}>{MOOD_EMOJI[entry.mood]}</span>
                )}
              </div>
              <IonCardSubtitle>{format(new Date(entry.created_at), 'p')}</IonCardSubtitle>
            </IonCardHeader>
            <IonCardContent>
              <IonText>
                {entry.content.length > 150
                  ? `${entry.content.substring(0, 150)}...`
                  : entry.content}
              </IonText>
            </IonCardContent>
          </IonCard>
        ))}

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={handleNewEntry}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>
      </IonContent>
    </IonPage>
  );
};
