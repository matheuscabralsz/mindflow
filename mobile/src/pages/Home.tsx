import { useHistory } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButton,
  IonIcon,
  IonButtons,
  IonText,
} from '@ionic/react';
import {
  personCircle,
  journalOutline,
  sparklesOutline,
  sunnyOutline,
  moonOutline,
  cloudyOutline,
  calendarOutline,
} from 'ionicons/icons';
import { format } from 'date-fns';
import { useAuthStore } from '../store/authStore';
import { useEntriesStore } from '../store/entriesStore';
import { Calendar } from '../components/calendar/Calendar';

const Home: React.FC = () => {
  const history = useHistory();
  const { user } = useAuthStore();
  const { entries, fetchEntries } = useEntriesStore();
  const [greeting, setGreeting] = useState('');
  const [greetingIcon, setGreetingIcon] = useState(sunnyOutline);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting('Good morning');
      setGreetingIcon(sunnyOutline);
    } else if (hour >= 12 && hour < 17) {
      setGreeting('Good afternoon');
      setGreetingIcon(cloudyOutline);
    } else {
      setGreeting('Good evening');
      setGreetingIcon(moonOutline);
    }
  }, []);

  const firstName = user?.profile?.display_name?.split(' ')[0] || 'there';
  const todayFormatted = format(new Date(), 'EEEE, MMMM d');
  const entriesThisWeek = entries.filter((entry) => {
    const entryDate = new Date(entry.entry_date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return entryDate >= weekAgo;
  }).length;

  // Extract dates that have entries for the calendar
  const entryDates = useMemo(
    () => entries.map((entry) => entry.entry_date),
    [entries]
  );

  // Handle date selection from calendar
  const handleDateSelect = (date: string) => {
    history.push(`/entries/edit/${date}`);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>MindFlow</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => history.push('/profile')}>
              <IonIcon slot="icon-only" icon={personCircle} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {/* Hero Section */}
        <div
          style={{
            background: 'linear-gradient(135deg, var(--ion-color-primary) 0%, var(--ion-color-secondary) 100%)',
            padding: '32px 24px',
            color: 'white',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <IonIcon icon={greetingIcon} style={{ fontSize: '20px' }} />
            <span style={{ fontSize: '14px', opacity: 0.9 }}>{todayFormatted}</span>
          </div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '600' }}>
            {greeting}, {firstName}
          </h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '15px' }}>
            How are you feeling today?
          </p>
        </div>

        <div style={{ padding: '20px' }}>
          {/* Calendar Section */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <IonIcon icon={calendarOutline} style={{ fontSize: '20px', color: 'var(--ion-color-primary)' }} />
              <span style={{ fontWeight: '600', fontSize: '16px' }}>Select a Date</span>
            </div>
            <Calendar
              entryDates={entryDates}
              onDateSelect={handleDateSelect}
            />
          </div>

          {/* Quick Action */}
          <button
            onClick={() => history.push('/entries')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '16px',
              background: 'var(--ion-background-color, #fff)',
              color: 'var(--ion-text-color)',
              border: '2px solid var(--ion-color-light)',
              borderRadius: '16px',
              cursor: 'pointer',
              marginBottom: '20px',
            }}
          >
            <IonIcon icon={journalOutline} style={{ fontSize: '24px', color: 'var(--ion-color-primary)' }} />
            <span style={{ fontSize: '15px', fontWeight: '500' }}>View All Entries</span>
          </button>

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

          {/* AI Insights Button */}
          <button
            onClick={() => history.push('/summaries')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              background: 'linear-gradient(135deg, var(--ion-color-secondary) 0%, var(--ion-color-primary) 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '16px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <IonIcon icon={sparklesOutline} style={{ fontSize: '24px' }} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: '600', fontSize: '15px' }}>AI Insights</div>
                <div style={{ fontSize: '13px', opacity: 0.9 }}>View patterns & summaries</div>
              </div>
            </div>
            <IonIcon icon="chevron-forward-outline" style={{ fontSize: '20px' }} />
          </button>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Home;
