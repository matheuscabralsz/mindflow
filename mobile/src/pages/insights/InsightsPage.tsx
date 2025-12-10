import { useEffect } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonIcon,
  IonText,
} from '@ionic/react';
import { sparklesOutline } from 'ionicons/icons';
import { useEntriesStore } from '../../store/entriesStore';

const InsightsPage: React.FC = () => {
  const entries = useEntriesStore((state) => state.entries);
  const fetchEntries = useEntriesStore((state) => state.fetchEntries);

  useEffect(() => {
    fetchEntries();
  }, []);

  const entriesThisWeek = entries.filter((entry) => {
    const entryDate = new Date(entry.entry_date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return entryDate >= weekAgo;
  }).length;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Insights</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {/* Stats Card */}
        <div
          style={{
            background: 'var(--ion-background-color, #fff)',
            border: '1px solid var(--ion-color-light)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <IonIcon icon={sparklesOutline} style={{ fontSize: '20px', color: 'var(--ion-color-secondary)' }} />
            <span style={{ fontWeight: '600', fontSize: '16px' }}>Your Journey</span>
          </div>
          <div style={{ display: 'flex', gap: '24px' }}>
            <div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--ion-color-primary)' }}>
                {entries.length}
              </div>
              <IonText color="medium">
                <span style={{ fontSize: '13px' }}>Total entries</span>
              </IonText>
            </div>
            <div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--ion-color-success)' }}>
                {entriesThisWeek}
              </div>
              <IonText color="medium">
                <span style={{ fontSize: '13px' }}>This week</span>
              </IonText>
            </div>
          </div>
        </div>

        <p>More insights coming soon...</p>
      </IonContent>
    </IonPage>
  );
};

export default InsightsPage;
