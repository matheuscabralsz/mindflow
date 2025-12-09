/**
 * MonthlySummaryPage
 * Displays detailed view of a monthly AI summary
 */

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  IonContent,
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonIcon,
  IonButton,
  IonSpinner,
} from '@ionic/react';
import { sparkles, bulbOutline, starOutline, alertCircleOutline } from 'ionicons/icons';
import { format, parse } from 'date-fns';
import {
  fetchMonthlySummary,
  generateMonthlySummary,
  PeriodSummary,
} from '../../services/summaryService';

export const MonthlySummaryPage: React.FC = () => {
  const { month } = useParams<{ month: string }>();

  const [summary, setSummary] = useState<PeriodSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef<string | null>(null);

  const formatMonth = () => {
    if (!month) return 'Monthly Summary';
    try {
      const date = parse(month, 'yyyy-MM', new Date());
      return format(date, 'MMMM yyyy');
    } catch {
      return 'Monthly Summary';
    }
  };

  useEffect(() => {
    const loadSummary = async () => {
      if (!month) return;

      // Prevent duplicate fetches (e.g., from StrictMode)
      if (fetchedRef.current === month) return;
      fetchedRef.current = month;

      setLoading(true);
      setError(null);

      const data = await fetchMonthlySummary(month);
      setSummary(data);
      setLoading(false);
    };

    loadSummary();
  }, [month]);

  const handleGenerate = async () => {
    if (!month) return;

    setGenerating(true);
    setError(null);

    const result = await generateMonthlySummary(month);

    if (result.success && result.data) {
      setSummary(result.data);
    } else {
      setError(result.error || 'Failed to generate summary');
    }

    setGenerating(false);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/entries" />
          </IonButtons>
          <IonTitle>Monthly Summary</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, var(--ion-color-primary) 0%, var(--ion-color-secondary) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
              }}
            >
              <IonIcon icon={sparkles} style={{ fontSize: '32px', color: '#fff' }} />
            </div>
            <h1 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: '700' }}>
              {formatMonth()}
            </h1>
            <span
              style={{
                fontSize: '12px',
                padding: '4px 12px',
                borderRadius: '12px',
                background: 'var(--ion-color-primary)',
                color: '#fff',
              }}
            >
              AI Generated
            </span>
          </div>

          {/* Loading State */}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
              <IonSpinner name="crescent" />
            </div>
          )}

          {/* No Summary State */}
          {!loading && !summary && (
            <div
              style={{
                textAlign: 'center',
                padding: '48px 24px',
                background: 'var(--ion-color-light)',
                borderRadius: '16px',
              }}
            >
              <IonIcon
                icon={sparkles}
                style={{
                  fontSize: '48px',
                  color: 'var(--ion-color-medium)',
                  marginBottom: '16px',
                }}
              />
              <h2 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '600' }}>
                No Summary Yet
              </h2>
              <p
                style={{
                  margin: '0 0 24px',
                  fontSize: '14px',
                  color: 'var(--ion-color-medium)',
                  lineHeight: '1.5',
                }}
              >
                Generate an AI-powered summary of your journal entries from this month.
              </p>

              {error && (
                <p
                  style={{
                    margin: '0 0 16px',
                    fontSize: '14px',
                    color: 'var(--ion-color-danger)',
                  }}
                >
                  {error}
                </p>
              )}

              <IonButton
                onClick={handleGenerate}
                disabled={generating}
                shape="round"
              >
                {generating ? (
                  <IonSpinner name="crescent" style={{ marginRight: '8px' }} />
                ) : (
                  <IonIcon icon={sparkles} slot="start" />
                )}
                {generating ? 'Generating...' : 'Generate Summary'}
              </IonButton>
            </div>
          )}

          {/* Summary Content */}
          {!loading && summary && (
            <>
              {/* Summary Section */}
              <section style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--ion-color-dark)' }}>
                  Summary
                </h2>
                <div
                  style={{
                    padding: '16px',
                    background: 'var(--ion-color-light)',
                    borderRadius: '12px',
                    lineHeight: '1.6',
                    fontSize: '15px',
                    color: 'var(--ion-color-dark-shade)',
                  }}
                >
                  {summary.summary}
                </div>
              </section>

              {/* Key Themes Section */}
              {summary.keyThemes && summary.keyThemes.length > 0 && (
                <section style={{ marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--ion-color-dark)' }}>
                    Key Themes
                  </h2>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {summary.keyThemes.map((theme, index) => (
                      <span
                        key={index}
                        style={{
                          padding: '8px 16px',
                          background: 'rgba(var(--ion-color-primary-rgb), 0.1)',
                          borderRadius: '20px',
                          fontSize: '14px',
                          color: 'var(--ion-color-primary)',
                          fontWeight: '500',
                        }}
                      >
                        {theme}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Overall Mood Section */}
              {summary.overallMood && (
                <section style={{ marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--ion-color-dark)' }}>
                    Overall Mood
                  </h2>
                  <div
                    style={{
                      padding: '16px',
                      background: 'var(--ion-color-light)',
                      borderRadius: '12px',
                      fontSize: '15px',
                      color: 'var(--ion-color-dark-shade)',
                      lineHeight: '1.5',
                    }}
                  >
                    {summary.overallMood}
                  </div>
                </section>
              )}

              {/* Insights Section */}
              {summary.insights && summary.insights.length > 0 && (
                <section style={{ marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--ion-color-dark)' }}>
                    Insights
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {summary.insights.map((insight, index) => (
                      <div
                        key={index}
                        style={{
                          padding: '14px 16px',
                          background: 'var(--ion-color-light)',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                        }}
                      >
                        <IonIcon
                          icon={bulbOutline}
                          style={{
                            fontSize: '20px',
                            color: 'var(--ion-color-warning)',
                            flexShrink: 0,
                            marginTop: '2px',
                          }}
                        />
                        <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5', color: 'var(--ion-color-dark-shade)' }}>
                          {insight}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Highlights Section */}
              {summary.highlights && summary.highlights.length > 0 && (
                <section style={{ marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--ion-color-dark)' }}>
                    Highlights
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {summary.highlights.map((highlight, index) => (
                      <div
                        key={index}
                        style={{
                          padding: '14px 16px',
                          background: 'rgba(var(--ion-color-success-rgb), 0.1)',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                        }}
                      >
                        <IonIcon
                          icon={starOutline}
                          style={{
                            fontSize: '20px',
                            color: 'var(--ion-color-success)',
                            flexShrink: 0,
                            marginTop: '2px',
                          }}
                        />
                        <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5', color: 'var(--ion-color-dark-shade)' }}>
                          {highlight}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Challenges Section */}
              {summary.challenges && summary.challenges.length > 0 && (
                <section style={{ marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--ion-color-dark)' }}>
                    Challenges
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {summary.challenges.map((challenge, index) => (
                      <div
                        key={index}
                        style={{
                          padding: '14px 16px',
                          background: 'rgba(var(--ion-color-danger-rgb), 0.1)',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                        }}
                      >
                        <IonIcon
                          icon={alertCircleOutline}
                          style={{
                            fontSize: '20px',
                            color: 'var(--ion-color-danger)',
                            flexShrink: 0,
                            marginTop: '2px',
                          }}
                        />
                        <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5', color: 'var(--ion-color-dark-shade)' }}>
                          {challenge}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Entry Count */}
              {summary.entryCount > 0 && (
                <p
                  style={{
                    textAlign: 'center',
                    fontSize: '13px',
                    color: 'var(--ion-color-medium)',
                    marginTop: '24px',
                    marginBottom: '32px',
                  }}
                >
                  Based on {summary.entryCount} journal {summary.entryCount === 1 ? 'entry' : 'entries'}
                </p>
              )}
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};
