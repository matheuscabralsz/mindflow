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
  IonIcon,
} from '@ionic/react';
import { arrowBack } from 'ionicons/icons';
import { useAuthStore } from '../../store/authStore';

export const ForgotPasswordPage: React.FC = () => {
  const history = useHistory();
  const { resetPassword, loading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err) {
      // Error is handled by the store
      console.error('Password reset error:', err);
    }
  };

  const isValid = email.length > 0 && email.includes('@');

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
              <div style={{ marginBottom: '10px' }}>
                <IonButton
                  fill="clear"
                  size="small"
                  onClick={() => history.goBack()}
                >
                  <IonIcon slot="start" icon={arrowBack} />
                  Back
                </IonButton>
              </div>
              <IonCardTitle style={{ textAlign: 'center', fontSize: '28px' }}>
                Reset Password
              </IonCardTitle>
            </IonCardHeader>

            <IonCardContent>
              {success ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <IonText color="success">
                    <h3>Check your email!</h3>
                    <p>
                      We've sent you a password reset link. Please check your
                      inbox and follow the instructions.
                    </p>
                  </IonText>

                  <IonButton
                    expand="block"
                    onClick={() => history.push('/login')}
                    style={{ marginTop: '20px' }}
                  >
                    Back to Login
                  </IonButton>
                </div>
              ) : (
                <form onSubmit={handleResetPassword}>
                  <IonText color="medium">
                    <p>
                      Enter your email address and we'll send you a link to
                      reset your password.
                    </p>
                  </IonText>

                  <IonItem>
                    <IonLabel position="stacked">Email</IonLabel>
                    <IonInput
                      type="email"
                      value={email}
                      onIonInput={(e) => setEmail(e.detail.value || '')}
                      placeholder="your@email.com"
                      required
                    />
                  </IonItem>

                  <IonButton
                    expand="block"
                    type="submit"
                    disabled={!isValid || loading}
                    style={{ marginTop: '20px' }}
                  >
                    {loading ? <IonSpinner name="crescent" /> : 'Send Reset Link'}
                  </IonButton>

                  <div style={{ marginTop: '20px', textAlign: 'center' }}>
                    <IonText color="medium">
                      Remember your password?{' '}
                      <IonRouterLink routerLink="/login">
                        <IonText color="primary">
                          <strong>Login</strong>
                        </IonText>
                      </IonRouterLink>
                    </IonText>
                  </div>
                </form>
              )}
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
