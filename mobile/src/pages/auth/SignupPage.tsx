import React, { useState } from 'react';
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
import type { SignupCredentials } from '../../types/user.types';

export const SignupPage: React.FC = () => {
  const history = useHistory();
  const { signup, loading, error, clearError } = useAuthStore();

  const [credentials, setCredentials] = useState<SignupCredentials>({
    email: '',
    password: '',
    displayName: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (credentials.password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (credentials.password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    try {
      await signup(credentials);
      history.push('/home');
    } catch (err) {
      // Error is handled by the store
      console.error('Signup error:', err);
    }
  };

  const isValid =
    credentials.email.length > 0 &&
    credentials.password.length >= 6 &&
    confirmPassword.length > 0 &&
    credentials.password === confirmPassword;

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
                Create Account
              </IonCardTitle>
            </IonCardHeader>

            <IonCardContent>
              <form onSubmit={handleSignup}>
                <IonItem>
                  <IonLabel position="stacked">Display Name (Optional)</IonLabel>
                  <IonInput
                    type="text"
                    value={credentials.displayName}
                    onIonInput={(e) =>
                      setCredentials({
                        ...credentials,
                        displayName: e.detail.value || '',
                      })
                    }
                    placeholder="Your name"
                  />
                </IonItem>

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
                    placeholder="At least 6 characters"
                    required
                  />
                </IonItem>

                <IonItem>
                  <IonLabel position="stacked">Confirm Password</IonLabel>
                  <IonInput
                    type="password"
                    value={confirmPassword}
                    onIonInput={(e) => setConfirmPassword(e.detail.value || '')}
                    placeholder="Re-enter your password"
                    required
                  />
                </IonItem>

                {credentials.password !== confirmPassword &&
                  confirmPassword.length > 0 && (
                    <div style={{ marginTop: '10px' }}>
                      <IonText color="danger">
                        <small>Passwords do not match</small>
                      </IonText>
                    </div>
                  )}

                <IonButton
                  expand="block"
                  type="submit"
                  disabled={!isValid || loading}
                  style={{ marginTop: '20px' }}
                >
                  {loading ? <IonSpinner name="crescent" /> : 'Sign Up'}
                </IonButton>
              </form>

              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <IonText color="medium">
                  Already have an account?{' '}
                  <IonRouterLink routerLink="/login">
                    <IonText color="primary">
                      <strong>Login</strong>
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
