import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import {
  IonContent,
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
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
  IonAvatar,
} from '@ionic/react';
import { useAuthStore } from '../../store/authStore';
import type { UpdateProfileData } from '../../types/user.types';

export const ProfilePage: React.FC = () => {
  const history = useHistory();
  const { user, updateProfile, logout, loading, error, clearError } =
    useAuthStore();

  const [profileData, setProfileData] = useState<UpdateProfileData>({
    display_name: '',
  });
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (user?.profile) {
      setProfileData({
        display_name: user.profile.display_name || '',
      });
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateProfile(profileData);
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Profile update error:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      history.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>
          <IonTitle>Profile</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonCard>
          <IonCardHeader>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '20px',
              }}
            >
              <IonAvatar style={{ width: '100px', height: '100px' }}>
                {user.profile?.avatar_url ? (
                  <img
                    src={user.profile.avatar_url}
                    alt={user.profile.display_name || 'User'}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      background: 'var(--ion-color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '40px',
                      color: 'white',
                    }}
                  >
                    {(user.profile?.display_name?.[0] || user.email[0]).toUpperCase()}
                  </div>
                )}
              </IonAvatar>
              <IonCardTitle style={{ marginTop: '10px', textAlign: 'center' }}>
                {user.profile?.display_name || 'User'}
              </IonCardTitle>
              <IonText color="medium">
                <small>{user.email}</small>
              </IonText>
            </div>
          </IonCardHeader>

          <IonCardContent>
            <form onSubmit={handleUpdateProfile}>
              <IonItem>
                <IonLabel position="stacked">Display Name</IonLabel>
                <IonInput
                  type="text"
                  value={profileData.display_name}
                  onIonInput={(e) =>
                    setProfileData({
                      ...profileData,
                      display_name: e.detail.value || '',
                    })
                  }
                  placeholder="Your name"
                />
              </IonItem>

              <IonButton
                expand="block"
                type="submit"
                disabled={loading}
                style={{ marginTop: '20px' }}
              >
                {loading ? <IonSpinner name="crescent" /> : 'Update Profile'}
              </IonButton>
            </form>
          </IonCardContent>
        </IonCard>

        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Account Information</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonItem lines="none">
              <IonLabel>
                <p>Email</p>
                <h3>{user.email}</h3>
              </IonLabel>
            </IonItem>
            <IonItem lines="none">
              <IonLabel>
                <p>Member Since</p>
                <h3>{new Date(user.created_at).toLocaleDateString()}</h3>
              </IonLabel>
            </IonItem>
          </IonCardContent>
        </IonCard>

        <IonButton
          expand="block"
          color="danger"
          onClick={handleLogout}
          disabled={loading}
          style={{ marginTop: '20px' }}
        >
          {loading ? <IonSpinner name="crescent" /> : 'Logout'}
        </IonButton>

        <IonToast
          isOpen={!!successMessage}
          message={successMessage}
          duration={3000}
          color="success"
        />

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
