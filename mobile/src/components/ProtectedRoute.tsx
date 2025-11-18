import React from 'react';
import { Redirect } from 'react-router-dom';
import { IonSpinner } from '@ionic/react';
import { useAuthStore } from '../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute Component
 * Ensures user is authenticated before rendering children
 * Redirects to login if not authenticated
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading, initialized } = useAuthStore();

  // Show loading spinner while initializing auth
  if (!initialized || loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <IonSpinner name="crescent" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Redirect to="/login" />;
  }

  // Render children if authenticated
  return <>{children}</>;
};
