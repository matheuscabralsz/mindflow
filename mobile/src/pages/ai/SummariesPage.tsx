import React, { useState } from 'react';
import {
  IonContent,
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonSpinner,
  IonIcon,
  IonText,
  IonList,
  IonItem,
  IonChip,
  useIonToast,
} from '@ionic/react';
import { sparklesOutline, refreshOutline, timeOutline } from 'ionicons/icons';
import { format } from 'date-fns';
import { generateDailySummary, generateWeeklySummary } from '../../services/ai.service';
import type { Summary } from '../../types/ai.types';
import './SummariesPage.css';

type SummaryType = 'daily' | 'weekly';

const SummariesPage: React.FC = () => {
  const [summaryType, setSummaryType] = useState<SummaryType>('daily');
  const [dailySummary, setDailySummary] = useState<Summary | null>(null);
  const [weeklySummary, setWeeklySummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [present] = useIonToast();

  const currentSummary = summaryType === 'daily' ? dailySummary : weeklySummary;

  const handleGenerateSummary = async () => {
    setLoading(true);

    try {
      if (summaryType === 'daily') {
        const summary = await generateDailySummary();
        setDailySummary(summary);
      } else {
        const summary = await generateWeeklySummary();
        setWeeklySummary(summary);
      }

      present({
        message: 'Summary generated successfully!',
        duration: 2000,
        color: 'success',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate summary';
      present({
        message,
        duration: 3000,
        color: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderEmptyState = () => (
    <div className="summaries-empty">
      <IonIcon icon={sparklesOutline} className="summaries-empty__icon" />
      <IonText color="medium">
        <h2>No Summary Yet</h2>
        <p>Generate a {summaryType} summary to see AI insights about your journal entries</p>
      </IonText>
      <IonButton onClick={handleGenerateSummary} disabled={loading}>
        {loading ? <IonSpinner name="crescent" /> : 'Generate Summary'}
      </IonButton>
    </div>
  );

  const renderSummary = (summary: Summary) => (
    <div className="summaries-content">
      <div className="summaries-header">
        <div>
          <h2>{summaryType === 'daily' ? 'Daily Summary' : 'Weekly Summary'}</h2>
          {summary.cached && summary.cachedAt && (
            <IonText color="medium" className="summaries-cached">
              <IonIcon icon={timeOutline} />
              <span>Cached {format(new Date(summary.cachedAt), 'MMM d, h:mm a')}</span>
            </IonText>
          )}
        </div>
        <IonButton fill="clear" onClick={handleGenerateSummary} disabled={loading}>
          {loading ? <IonSpinner name="crescent" /> : <IonIcon slot="icon-only" icon={refreshOutline} />}
        </IonButton>
      </div>

      <IonCard>
        <IonCardHeader>
          <IonCardTitle>Overview</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <p className="summaries-text">{summary.summary}</p>
          <IonText color="medium" className="summaries-meta">
            Based on {summary.entryCount} {summary.entryCount === 1 ? 'entry' : 'entries'}
          </IonText>
        </IonCardContent>
      </IonCard>

      <IonCard>
        <IonCardHeader>
          <IonCardTitle>Overall Mood</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <IonChip color="primary">
            <IonLabel>{summary.overallMood}</IonLabel>
          </IonChip>
        </IonCardContent>
      </IonCard>

      {summary.keyThemes?.length > 0 && (
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Key Themes</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <div className="summaries-themes">
              {summary.keyThemes.map((theme, index) => (
                <IonChip key={index} outline>
                  <IonLabel>{theme}</IonLabel>
                </IonChip>
              ))}
            </div>
          </IonCardContent>
        </IonCard>
      )}

      {summary.insights?.length > 0 && (
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Insights</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonList lines="none">
              {summary.insights.map((insight, index) => (
                <IonItem key={index}>
                  <IonLabel className="ion-text-wrap">
                    <p>{insight}</p>
                  </IonLabel>
                </IonItem>
              ))}
            </IonList>
          </IonCardContent>
        </IonCard>
      )}
    </div>
  );

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/entries" />
          </IonButtons>
          <IonTitle>AI Summaries</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div className="summaries-page">
          <IonSegment
            value={summaryType}
            onIonChange={(e) => setSummaryType(e.detail.value as SummaryType)}
          >
            <IonSegmentButton value="daily">
              <IonLabel>Daily</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="weekly">
              <IonLabel>Weekly</IonLabel>
            </IonSegmentButton>
          </IonSegment>

          {currentSummary ? renderSummary(currentSummary) : renderEmptyState()}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default SummariesPage;
