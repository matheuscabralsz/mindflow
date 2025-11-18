import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import {
  IonContent,
  IonPage,
  IonInput,
  IonButton,
  IonText,
  IonItem,
  IonLabel,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonToast,
  IonSpinner,
  IonRouterLink,
} from '@ionic/react';
import { useAuthStore } from '../../store/authStore';
import type { AuthCredentials } from '../../types/user.types';

export const LoginPage: React.FC = () => {
  const history = useHistory();
  const { user, login, loading, error, clearError } = useAuthStore();

  // Redirect to home if already authenticated
  useEffect(() => {
    if (user) {
      history.replace('/home');
    }
  }, [user, history]);

  const [credentials, setCredentials] = useState<AuthCredentials>({
    email: '',
    password: '',
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await login(credentials);
      history.push('/home');
    } catch (err) {
      // Error is handled by the store
      console.error('Login error:', err);
    }
  };

  const isValid = credentials.email.length > 0 && credentials.password.length > 0;

  return (
    <IonPage>
      <IonContent className="ion-padding">
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100%',
            padding: '20px',
          }}
        >
          <IonCard style={{ width: '100%', maxWidth: '500px' }}>
            <IonCardHeader>
              <IonCardTitle style={{ textAlign: 'center', fontSize: '28px' }}>
                Welcome to MindFlow
              </IonCardTitle>
            </IonCardHeader>

            <IonCardContent>
              <form onSubmit={handleLogin}>
                <IonItem>
                  <IonLabel position="stacked">Email</IonLabel>
                  <IonInput
                    type="email"
                    value={credentials.email}
                    onIonInput={(e) =>
                      setCredentials({
                        ...credentials,
                        email: e.detail.value || '',
                      })
                    }
                    placeholder="your@email.com"
                    required
                  />
                </IonItem>

                <IonItem>
                  <IonLabel position="stacked">Password</IonLabel>
                  <IonInput
                    type="password"
                    value={credentials.password}
                    onIonInput={(e) =>
                      setCredentials({
                        ...credentials,
                        password: e.detail.value || '',
                      })
                    }
                    placeholder="Enter your password"
                    required
                  />
                </IonItem>

                <div style={{ marginTop: '10px', textAlign: 'right' }}>
                  <IonRouterLink routerLink="/forgot-password">
                    <IonText color="primary">
                      <small>Forgot password?</small>
                    </IonText>
                  </IonRouterLink>
                </div>

                <IonButton
                  expand="block"
                  type="submit"
                  disabled={!isValid || loading}
                  style={{ marginTop: '20px' }}
                >
                  {loading ? <IonSpinner name="crescent" /> : 'Login'}
                </IonButton>
              </form>

              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <IonText color="medium">
                  Don't have an account?{' '}
                  <IonRouterLink routerLink="/signup">
                    <IonText color="primary">
                      <strong>Sign up</strong>
                    </IonText>
                  </IonRouterLink>
                </IonText>
              </div>
            </IonCardContent>
          </IonCard>
        </div>

        <IonToast
          isOpen={!!error}
          message={error || ''}
          duration={3000}
          color="danger"
          onDidDismiss={clearError}
        />
      </IonContent>
    </IonPage>
  );
};
