import { useHistory } from 'react-router-dom';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonButtons,
} from '@ionic/react';
import { checkmarkCircle, personCircle, journalOutline, addCircleOutline } from 'ionicons/icons';

const Home: React.FC = () => {
  const history = useHistory();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>MindFlow</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => history.push('/profile')}>
              <IonIcon slot="icon-only" icon={personCircle} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Welcome to MindFlow</IonCardTitle>
            <IonCardSubtitle>AI-Powered Journal App</IonCardSubtitle>
          </IonCardHeader>
          <IonCardContent>
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <IonIcon
                icon={checkmarkCircle}
                style={{ fontSize: '64px', color: '#10B981' }}
              />
              <h2>Start Journaling!</h2>
              <p>Track your thoughts, moods, and daily experiences.</p>
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <IonButton
                  expand="block"
                  color="primary"
                  onClick={() => history.push('/entries/new')}
                  style={{ flex: 1 }}
                >
                  <IonIcon slot="start" icon={addCircleOutline} />
                  New Entry
                </IonButton>
                <IonButton
                  expand="block"
                  fill="outline"
                  color="primary"
                  onClick={() => history.push('/entries')}
                  style={{ flex: 1 }}
                >
                  <IonIcon slot="start" icon={journalOutline} />
                  My Entries
                </IonButton>
              </div>
            </div>
          </IonCardContent>
        </IonCard>

        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Tech Stack</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <ul style={{ lineHeight: '1.8' }}>
              <li>⚛️ React 19</li>
              <li>⚡ Ionic 8</li>
              <li>📱 Capacitor 7</li>
              <li>🎨 TypeScript</li>
              <li>🔥 Vite</li>
              <li>🐻 Zustand</li>
            </ul>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default Home;
