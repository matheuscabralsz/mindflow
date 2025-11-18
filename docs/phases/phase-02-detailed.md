# Phase 2: User Authentication System - Detailed Implementation Guide

## Overview

**Goal:** Implement a complete user authentication system using Supabase Auth with Ionic + React frontend, including signup, login, password reset, session management, and protected routes.

**Time Estimate:** 3-4 hours

**Prerequisites:**
- Phase 1 complete (Ionic + React app, Supabase configured, backend running)
- Supabase project with Auth enabled
- Environment variables configured

**What You'll Have At The End:**
- Working signup, login, and password reset flows
- Persistent user sessions across app restarts
- Protected routes that require authentication
- Auth state management with Zustand
- Backend authentication middleware
- Basic profile screen
- Critical path tests for auth flows

---

## Step 1: Database Setup (10 minutes)

### 1.1 Verify Supabase Auth is Enabled

```bash
# In Supabase Dashboard:
# 1. Go to Authentication → Providers
# 2. Ensure "Email" provider is enabled
# 3. Disable email confirmations for development:
#    Settings → Auth → Email Auth → "Enable email confirmations" = OFF
#    (Re-enable for production!)
```

### 1.2 Create User Preferences Table

This table will extend the auth.users table with app-specific user data.

```bash
# Create file: supabase/schemas/04_auth_extensions.sql
cat > supabase/schemas/04_auth_extensions.sql << 'EOF'
-- User profiles extending auth.users
-- Links to Supabase Auth users and stores app-specific preferences

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (id, display_name)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile"
    ON user_profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = id);
EOF
```

### 1.3 Generate and Apply Database Migration

```bash
# IMPORTANT: Proper Supabase migration workflow

# Option 1: Using Supabase CLI locally (Recommended)
cd /home/mack/my_workspace/mindflow

# Step 1: Generate migration from schema changes
npx supabase db diff --schema public -f create_user_profiles_table

# This creates: supabase/migrations/YYYYMMDDHHMMSS_create_user_profiles_table.sql

# Step 2: Review the generated migration
cat supabase/migrations/*_create_user_profiles_table.sql

# Step 3: Apply the migration to your Supabase project
npx supabase db push

# Option 2: Using Supabase Dashboard (Alternative)
# 1. Copy contents of supabase/schemas/04_auth_extensions.sql
# 2. Go to SQL Editor in Supabase Dashboard
# 3. Paste and run the SQL
# 4. Note: This won't create a migration file, so track changes manually
```

**Note on Migration Workflow:**
- `supabase/schemas/*.sql` files are your "source of truth" schema definitions
- `npx supabase db diff` compares your local schema with remote and generates migration files
- `supabase/migrations/*.sql` files are version-controlled migration history
- `npx supabase db push` applies migrations to your Supabase project

---

## Step 2: TypeScript Types (10 minutes)

### 2.1 Create Auth Types

```bash
# mobile/src/types/auth.types.ts
cat > mobile/src/types/auth.types.ts << 'EOF'
import { User, Session } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
  displayName?: string;
}

export interface ResetPasswordCredentials {
  email: string;
}

export interface UpdatePasswordCredentials {
  newPassword: string;
}

export interface AuthError {
  message: string;
  code?: string;
}
EOF
```

### 2.2 Update Main Types Index

```bash
# Add to mobile/src/types/index.ts
cat >> mobile/src/types/index.ts << 'EOF'

// Auth types
export type {
  UserProfile,
  AuthState,
  LoginCredentials,
  SignupCredentials,
  ResetPasswordCredentials,
  UpdatePasswordCredentials,
  AuthError,
} from './auth.types';
EOF
```

---

## Step 3: Capacitor Storage Setup (5 minutes)

### 3.1 Install Capacitor Preferences

```bash
cd mobile
npm install @capacitor/preferences
```

### 3.2 Create Storage Utility

```bash
# mobile/src/utils/storage.ts
cat > mobile/src/utils/storage.ts << 'EOF'
import { Preferences } from '@capacitor/preferences';

const STORAGE_KEYS = {
  AUTH_SESSION: 'mindflow_auth_session',
  USER_PREFERENCES: 'mindflow_user_preferences',
} as const;

export const storage = {
  // Get item from storage
  async getItem<T>(key: string): Promise<T | null> {
    try {
      const { value } = await Preferences.get({ key });
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Error getting ${key} from storage:`, error);
      return null;
    }
  },

  // Set item in storage
  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      await Preferences.set({
        key,
        value: JSON.stringify(value),
      });
    } catch (error) {
      console.error(`Error setting ${key} in storage:`, error);
    }
  },

  // Remove item from storage
  async removeItem(key: string): Promise<void> {
    try {
      await Preferences.remove({ key });
    } catch (error) {
      console.error(`Error removing ${key} from storage:`, error);
    }
  },

  // Clear all storage
  async clear(): Promise<void> {
    try {
      await Preferences.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  },
};

export { STORAGE_KEYS };
EOF
```

---

## Step 4: Auth Service Layer (15 minutes)

### 4.1 Create Auth Service

```bash
# mobile/src/services/auth.service.ts
cat > mobile/src/services/auth.service.ts << 'EOF'
import { supabase } from './supabase';
import type {
  LoginCredentials,
  SignupCredentials,
  ResetPasswordCredentials,
  UpdatePasswordCredentials,
  UserProfile,
} from '../types';

export const authService = {
  /**
   * Sign up a new user
   */
  async signup({ email, password, displayName }: SignupCredentials) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || email.split('@')[0],
        },
      },
    });

    if (error) throw error;
    return data;
  },

  /**
   * Sign in an existing user
   */
  async login({ email, password }: LoginCredentials) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  /**
   * Sign out the current user
   */
  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Send password reset email
   */
  async resetPassword({ email }: ResetPasswordCredentials) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
  },

  /**
   * Update user password
   */
  async updatePassword({ newPassword }: UpdatePasswordCredentials) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
  },

  /**
   * Get current user session
   */
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  /**
   * Get current user
   */
  async getUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  },

  /**
   * Get user profile from user_profiles table
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return data;
  },

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, updates: Partial<UserProfile>) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Refresh the current session
   */
  async refreshSession() {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw error;
    return data.session;
  },
};
EOF
```

---

## Step 5: Auth State Management with Zustand (20 minutes)

### 5.1 Create Auth Store

```bash
# mobile/src/store/authStore.ts
cat > mobile/src/store/authStore.ts << 'EOF'
import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { authService } from '../services/auth.service';
import { storage, STORAGE_KEYS } from '../utils/storage';
import type { AuthState, UserProfile } from '../types';
import type { User, Session } from '@supabase/supabase-js';

interface AuthStore extends AuthState {
  // Actions
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setSession: (session: Session | null) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  // Initial state
  user: null,
  profile: null,
  session: null,
  loading: false,
  initialized: false,

  // Initialize auth state on app start
  initialize: async () => {
    set({ loading: true });

    try {
      // Get current session
      const session = await authService.getSession();

      if (session?.user) {
        // Fetch user profile
        const profile = await authService.getUserProfile(session.user.id);

        set({
          user: session.user,
          session,
          profile,
          initialized: true,
          loading: false,
        });

        // Store session
        await storage.setItem(STORAGE_KEYS.AUTH_SESSION, session);
      } else {
        set({ initialized: true, loading: false });
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event);

        if (session?.user) {
          const profile = await authService.getUserProfile(session.user.id);
          set({ user: session.user, session, profile });
          await storage.setItem(STORAGE_KEYS.AUTH_SESSION, session);
        } else {
          set({ user: null, session: null, profile: null });
          await storage.removeItem(STORAGE_KEYS.AUTH_SESSION);
        }
      });
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ initialized: true, loading: false });
    }
  },

  // Login
  login: async (email: string, password: string) => {
    set({ loading: true });

    try {
      const { user, session } = await authService.login({ email, password });
      const profile = user ? await authService.getUserProfile(user.id) : null;

      set({ user, session, profile, loading: false });
      await storage.setItem(STORAGE_KEYS.AUTH_SESSION, session);
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  // Signup
  signup: async (email: string, password: string, displayName?: string) => {
    set({ loading: true });

    try {
      const { user, session } = await authService.signup({
        email,
        password,
        displayName,
      });

      const profile = user ? await authService.getUserProfile(user.id) : null;

      set({ user, session, profile, loading: false });

      if (session) {
        await storage.setItem(STORAGE_KEYS.AUTH_SESSION, session);
      }
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  // Logout
  logout: async () => {
    set({ loading: true });

    try {
      await authService.logout();
      set({ user: null, session: null, profile: null, loading: false });
      await storage.removeItem(STORAGE_KEYS.AUTH_SESSION);
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  // Reset password
  resetPassword: async (email: string) => {
    set({ loading: true });

    try {
      await authService.resetPassword({ email });
      set({ loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  // Update password
  updatePassword: async (newPassword: string) => {
    set({ loading: true });

    try {
      await authService.updatePassword({ newPassword });
      set({ loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  // Update profile
  updateProfile: async (updates: Partial<UserProfile>) => {
    const { user } = get();
    if (!user) throw new Error('No authenticated user');

    set({ loading: true });

    try {
      const updatedProfile = await authService.updateUserProfile(user.id, updates);
      set({ profile: updatedProfile, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  // Setters
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setSession: (session) => set({ session }),
}));
EOF
```

---

## Step 6: Protected Route Component (10 minutes)

### 6.1 Create Protected Route Wrapper

```bash
# mobile/src/components/auth/ProtectedRoute.tsx
mkdir -p mobile/src/components/auth
cat > mobile/src/components/auth/ProtectedRoute.tsx << 'EOF'
import React, { useEffect } from 'react';
import { Redirect } from 'react-router-dom';
import { IonSpinner } from '@ionic/react';
import { useAuthStore } from '../../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading, initialized, initialize } = useAuthStore();

  useEffect(() => {
    if (!initialized) {
      initialize();
    }
  }, [initialized, initialize]);

  // Show loading spinner while checking auth
  if (!initialized || loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
      }}>
        <IonSpinner name="crescent" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Redirect to="/login" />;
  }

  // Render protected content
  return <>{children}</>;
};
EOF
```

---

## Step 7: Auth Pages (45 minutes)

### 7.1 Create Login Page

```bash
# mobile/src/pages/auth/LoginPage.tsx
mkdir -p mobile/src/pages/auth
cat > mobile/src/pages/auth/LoginPage.tsx << 'EOF'
import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  IonContent,
  IonPage,
  IonInput,
  IonButton,
  IonText,
  IonSpinner,
  IonToast,
  IonItem,
  IonLabel,
  IonHeader,
  IonToolbar,
  IonTitle,
} from '@ionic/react';
import { useAuthStore } from '../../store/authStore';
import './AuthPages.css';

const LoginPage: React.FC = () => {
  const history = useHistory();
  const { login, loading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showToast, setShowToast] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!email || !password) {
      setError('Please enter email and password');
      setShowToast(true);
      return;
    }

    try {
      await login(email, password);
      history.replace('/home');
    } catch (err: any) {
      setError(err.message || 'Failed to login');
      setShowToast(true);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Login to MindFlow</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <div className="auth-container">
          <div className="auth-header">
            <h1>Welcome Back</h1>
            <p>Sign in to continue journaling</p>
          </div>

          <form onSubmit={handleLogin} className="auth-form">
            <IonItem>
              <IonLabel position="stacked">Email</IonLabel>
              <IonInput
                type="email"
                value={email}
                onIonInput={(e) => setEmail(e.detail.value!)}
                placeholder="your@email.com"
                required
              />
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Password</IonLabel>
              <IonInput
                type="password"
                value={password}
                onIonInput={(e) => setPassword(e.detail.value!)}
                placeholder="••••••••"
                required
              />
            </IonItem>

            <IonButton
              expand="block"
              type="submit"
              disabled={loading}
              className="auth-submit-button"
            >
              {loading ? <IonSpinner name="crescent" /> : 'Login'}
            </IonButton>

            <div className="auth-links">
              <IonText
                color="primary"
                onClick={() => history.push('/forgot-password')}
                style={{ cursor: 'pointer' }}
              >
                Forgot Password?
              </IonText>
            </div>

            <div className="auth-footer">
              <IonText>Don't have an account? </IonText>
              <IonText
                color="primary"
                onClick={() => history.push('/signup')}
                style={{ cursor: 'pointer', marginLeft: '4px' }}
              >
                Sign Up
              </IonText>
            </div>
          </form>
        </div>

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={error}
          duration={3000}
          color="danger"
        />
      </IonContent>
    </IonPage>
  );
};

export default LoginPage;
EOF
```

### 7.2 Create Signup Page

```bash
# mobile/src/pages/auth/SignupPage.tsx
cat > mobile/src/pages/auth/SignupPage.tsx << 'EOF'
import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  IonContent,
  IonPage,
  IonInput,
  IonButton,
  IonText,
  IonSpinner,
  IonToast,
  IonItem,
  IonLabel,
  IonHeader,
  IonToolbar,
  IonTitle,
} from '@ionic/react';
import { useAuthStore } from '../../store/authStore';
import './AuthPages.css';

const SignupPage: React.FC = () => {
  const history = useHistory();
  const { signup, loading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [showToast, setShowToast] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      setShowToast(true);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setShowToast(true);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setShowToast(true);
      return;
    }

    try {
      await signup(email, password, displayName || undefined);
      history.replace('/home');
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
      setShowToast(true);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Sign Up for MindFlow</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <div className="auth-container">
          <div className="auth-header">
            <h1>Create Account</h1>
            <p>Start your journaling journey</p>
          </div>

          <form onSubmit={handleSignup} className="auth-form">
            <IonItem>
              <IonLabel position="stacked">Display Name (Optional)</IonLabel>
              <IonInput
                type="text"
                value={displayName}
                onIonInput={(e) => setDisplayName(e.detail.value!)}
                placeholder="How should we call you?"
              />
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Email</IonLabel>
              <IonInput
                type="email"
                value={email}
                onIonInput={(e) => setEmail(e.detail.value!)}
                placeholder="your@email.com"
                required
              />
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Password</IonLabel>
              <IonInput
                type="password"
                value={password}
                onIonInput={(e) => setPassword(e.detail.value!)}
                placeholder="At least 6 characters"
                required
              />
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Confirm Password</IonLabel>
              <IonInput
                type="password"
                value={confirmPassword}
                onIonInput={(e) => setConfirmPassword(e.detail.value!)}
                placeholder="Re-enter password"
                required
              />
            </IonItem>

            <IonButton
              expand="block"
              type="submit"
              disabled={loading}
              className="auth-submit-button"
            >
              {loading ? <IonSpinner name="crescent" /> : 'Create Account'}
            </IonButton>

            <div className="auth-footer">
              <IonText>Already have an account? </IonText>
              <IonText
                color="primary"
                onClick={() => history.push('/login')}
                style={{ cursor: 'pointer', marginLeft: '4px' }}
              >
                Login
              </IonText>
            </div>
          </form>
        </div>

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={error}
          duration={3000}
          color="danger"
        />
      </IonContent>
    </IonPage>
  );
};

export default SignupPage;
EOF
```

### 7.3 Create Forgot Password Page

```bash
# mobile/src/pages/auth/ForgotPasswordPage.tsx
cat > mobile/src/pages/auth/ForgotPasswordPage.tsx << 'EOF'
import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  IonContent,
  IonPage,
  IonInput,
  IonButton,
  IonText,
  IonSpinner,
  IonToast,
  IonItem,
  IonLabel,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
} from '@ionic/react';
import { useAuthStore } from '../../store/authStore';
import './AuthPages.css';

const ForgotPasswordPage: React.FC = () => {
  const history = useHistory();
  const { resetPassword, loading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showToast, setShowToast] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email) {
      setError('Please enter your email');
      setShowToast(true);
      return;
    }

    try {
      await resetPassword(email);
      setSuccess('Password reset email sent! Check your inbox.');
      setShowToast(true);

      // Navigate back to login after 2 seconds
      setTimeout(() => {
        history.push('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
      setShowToast(true);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/login" />
          </IonButtons>
          <IonTitle>Reset Password</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <div className="auth-container">
          <div className="auth-header">
            <h1>Forgot Password?</h1>
            <p>Enter your email to receive a password reset link</p>
          </div>

          <form onSubmit={handleResetPassword} className="auth-form">
            <IonItem>
              <IonLabel position="stacked">Email</IonLabel>
              <IonInput
                type="email"
                value={email}
                onIonInput={(e) => setEmail(e.detail.value!)}
                placeholder="your@email.com"
                required
              />
            </IonItem>

            <IonButton
              expand="block"
              type="submit"
              disabled={loading}
              className="auth-submit-button"
            >
              {loading ? <IonSpinner name="crescent" /> : 'Send Reset Link'}
            </IonButton>

            <div className="auth-footer">
              <IonText
                color="primary"
                onClick={() => history.push('/login')}
                style={{ cursor: 'pointer' }}
              >
                Back to Login
              </IonText>
            </div>
          </form>
        </div>

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={error || success}
          duration={3000}
          color={error ? 'danger' : 'success'}
        />
      </IonContent>
    </IonPage>
  );
};

export default ForgotPasswordPage;
EOF
```

### 7.4 Create Auth Pages CSS

```bash
# mobile/src/pages/auth/AuthPages.css
cat > mobile/src/pages/auth/AuthPages.css << 'EOF'
.auth-container {
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
}

.auth-header {
  text-align: center;
  margin-bottom: 32px;
}

.auth-header h1 {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--ion-text-color);
}

.auth-header p {
  font-size: 16px;
  color: var(--ion-color-medium);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.auth-form ion-item {
  --padding-start: 0;
  --inner-padding-end: 0;
}

.auth-submit-button {
  margin-top: 16px;
  height: 48px;
  font-weight: 600;
}

.auth-links {
  text-align: center;
  margin-top: 12px;
}

.auth-footer {
  text-align: center;
  margin-top: 24px;
  font-size: 14px;
}
EOF
```

### 7.5 Create Profile Page

```bash
# mobile/src/pages/ProfilePage.tsx
cat > mobile/src/pages/ProfilePage.tsx << 'EOF'
import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  IonContent,
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonToast,
  IonText,
} from '@ionic/react';
import { useAuthStore } from '../store/authStore';

const ProfilePage: React.FC = () => {
  const history = useHistory();
  const { user, profile, logout, updateProfile } = useAuthStore();

  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleUpdateProfile = async () => {
    try {
      await updateProfile({ display_name: displayName });
      setToastMessage('Profile updated successfully!');
      setShowToast(true);
    } catch (error: any) {
      setToastMessage(error.message || 'Failed to update profile');
      setShowToast(true);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      history.replace('/login');
    } catch (error: any) {
      setToastMessage(error.message || 'Failed to logout');
      setShowToast(true);
    }
  };

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
        <IonList>
          <IonItem>
            <IonLabel position="stacked">Email</IonLabel>
            <IonInput value={user?.email} disabled />
          </IonItem>

          <IonItem>
            <IonLabel position="stacked">Display Name</IonLabel>
            <IonInput
              value={displayName}
              onIonInput={(e) => setDisplayName(e.detail.value!)}
              placeholder="Your name"
            />
          </IonItem>

          <IonButton expand="block" onClick={handleUpdateProfile}>
            Update Profile
          </IonButton>
        </IonList>

        <div style={{ marginTop: '40px' }}>
          <IonText color="medium">
            <p style={{ textAlign: 'center', marginBottom: '16px' }}>
              Account created: {new Date(profile?.created_at || '').toLocaleDateString()}
            </p>
          </IonText>

          <IonButton expand="block" color="danger" onClick={handleLogout}>
            Logout
          </IonButton>
        </div>

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={2000}
        />
      </IonContent>
    </IonPage>
  );
};

export default ProfilePage;
EOF
```

---

## Step 8: Update App Routing (15 minutes)

### 8.1 Update App.tsx with Auth Routes

```bash
# Update mobile/src/App.tsx
cat > mobile/src/App.tsx << 'EOF'
import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { useEffect } from 'react';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* Dark Mode */
import '@ionic/react/css/palettes/dark.system.css';

/* Theme */
import './theme';

/* Pages */
import Home from './pages/Home';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ProfilePage from './pages/ProfilePage';

/* Components */
import { ProtectedRoute } from './components/auth/ProtectedRoute';

/* Store */
import { useAuthStore } from './store/authStore';

setupIonicReact();

const App: React.FC = () => {
  const { initialize, initialized } = useAuthStore();

  useEffect(() => {
    if (!initialized) {
      initialize();
    }
  }, [initialized, initialize]);

  return (
    <IonApp>
      <IonReactRouter>
        <IonRouterOutlet>
          {/* Public Routes */}
          <Route exact path="/login" component={LoginPage} />
          <Route exact path="/signup" component={SignupPage} />
          <Route exact path="/forgot-password" component={ForgotPasswordPage} />

          {/* Protected Routes */}
          <Route exact path="/home">
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          </Route>

          <Route exact path="/profile">
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          </Route>

          {/* Default Redirect */}
          <Route exact path="/">
            <Redirect to="/home" />
          </Route>
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  );
};

export default App;
EOF
```

### 8.2 Update Home Page to Show User Info

```bash
# Update mobile/src/pages/Home.tsx
cat > mobile/src/pages/Home.tsx << 'EOF'
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
} from '@ionic/react';
import { personCircleOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import ExploreContainer from '../components/ExploreContainer';
import './Home.css';

const Home: React.FC = () => {
  const history = useHistory();
  const { user, profile } = useAuthStore();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>MindFlow</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => history.push('/profile')}>
              <IonIcon slot="icon-only" icon={personCircleOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">MindFlow</IonTitle>
          </IonToolbar>
        </IonHeader>

        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>Welcome, {profile?.display_name || user?.email}!</h2>
          <p>Phase 2: Authentication Complete ✓</p>
          <p>Ready for Phase 3: Journal Entries</p>
        </div>

        <ExploreContainer />
      </IonContent>
    </IonPage>
  );
};

export default Home;
EOF
```

---

## Step 9: Backend Authentication Middleware (20 minutes)

### 9.1 Create Auth Middleware

```bash
# backend/src/middleware/auth.middleware.ts
cat > backend/src/middleware/auth.middleware.ts << 'EOF'
import { Request, Response, NextFunction } from 'express';
import { supabase } from '../database/supabase';
import type { User } from '@supabase/supabase-js';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/**
 * Middleware to verify JWT token and attach user to request
 */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No authorization token provided',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during authentication',
    });
  }
};

/**
 * Optional auth - doesn't fail if no token, but attaches user if valid token
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user } } = await supabase.auth.getUser(token);

      if (user) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Continue without auth if optional
    next();
  }
};
EOF
```

### 9.2 Create Protected Test Route

```bash
# backend/src/routes/auth.routes.ts
mkdir -p backend/src/routes
cat > backend/src/routes/auth.routes.ts << 'EOF'
import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /auth/me
 * Get current authenticated user
 */
router.get('/me', requireAuth, (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      user: req.user,
    },
  });
});

/**
 * GET /auth/status
 * Check if user is authenticated
 */
router.get('/status', requireAuth, (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      authenticated: true,
      userId: req.user?.id,
      email: req.user?.email,
    },
  });
});

export default router;
EOF
```

### 9.3 Update Routes Index

```bash
# Update backend/src/routes/index.ts
cat > backend/src/routes/index.ts << 'EOF'
import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);

export default router;
EOF
```

---

## Step 10: Testing (30 minutes)

### 10.1 Create Auth Service Tests

```bash
# mobile/src/services/__tests__/auth.service.test.ts
mkdir -p mobile/src/services/__tests__
cat > mobile/src/services/__tests__/auth.service.test.ts << 'EOF'
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '../auth.service';
import { supabase } from '../supabase';

// Mock Supabase
vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
      getSession: vi.fn(),
      getUser: vi.fn(),
      refreshSession: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
    })),
  },
}));

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signup', () => {
    it('should sign up a new user', async () => {
      const mockData = {
        user: { id: '123', email: 'test@example.com' },
        session: { access_token: 'token' },
      };

      (supabase.auth.signUp as any).mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await authService.signup({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toEqual(mockData);
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            display_name: 'test',
          },
        },
      });
    });

    it('should throw error on signup failure', async () => {
      (supabase.auth.signUp as any).mockResolvedValue({
        data: null,
        error: { message: 'Email already exists' },
      });

      await expect(
        authService.signup({
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toThrow();
    });
  });

  describe('login', () => {
    it('should login an existing user', async () => {
      const mockData = {
        user: { id: '123', email: 'test@example.com' },
        session: { access_token: 'token' },
      };

      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toEqual(mockData);
    });
  });

  describe('logout', () => {
    it('should logout the user', async () => {
      (supabase.auth.signOut as any).mockResolvedValue({
        error: null,
      });

      await authService.logout();

      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should send password reset email', async () => {
      (supabase.auth.resetPasswordForEmail as any).mockResolvedValue({
        error: null,
      });

      await authService.resetPassword({ email: 'test@example.com' });

      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          redirectTo: expect.stringContaining('/reset-password'),
        })
      );
    });
  });
});
EOF
```

### 10.2 Create Auth Store Tests

```bash
# mobile/src/store/__tests__/authStore.test.ts
mkdir -p mobile/src/store/__tests__
cat > mobile/src/store/__tests__/authStore.test.ts << 'EOF'
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '../authStore';
import { authService } from '../../services/auth.service';

// Mock auth service
vi.mock('../../services/auth.service');
vi.mock('../../services/supabase');

describe('authStore', () => {
  beforeEach(() => {
    // Reset store
    useAuthStore.setState({
      user: null,
      profile: null,
      session: null,
      loading: false,
      initialized: false,
    });
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const state = useAuthStore.getState();

    expect(state.user).toBeNull();
    expect(state.profile).toBeNull();
    expect(state.session).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.initialized).toBe(false);
  });

  it('should handle login successfully', async () => {
    const mockUser = { id: '123', email: 'test@example.com' };
    const mockSession = { access_token: 'token' };
    const mockProfile = { id: '123', display_name: 'Test User' };

    (authService.login as any).mockResolvedValue({
      user: mockUser,
      session: mockSession,
    });

    (authService.getUserProfile as any).mockResolvedValue(mockProfile);

    await useAuthStore.getState().login('test@example.com', 'password123');

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.session).toEqual(mockSession);
    expect(state.profile).toEqual(mockProfile);
    expect(state.loading).toBe(false);
  });

  it('should handle signup successfully', async () => {
    const mockUser = { id: '123', email: 'test@example.com' };
    const mockSession = { access_token: 'token' };
    const mockProfile = { id: '123', display_name: 'Test User' };

    (authService.signup as any).mockResolvedValue({
      user: mockUser,
      session: mockSession,
    });

    (authService.getUserProfile as any).mockResolvedValue(mockProfile);

    await useAuthStore.getState().signup('test@example.com', 'password123', 'Test User');

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
  });

  it('should handle logout', async () => {
    // Set initial authenticated state
    useAuthStore.setState({
      user: { id: '123' } as any,
      session: { access_token: 'token' } as any,
      profile: { id: '123', display_name: 'Test' } as any,
    });

    (authService.logout as any).mockResolvedValue(undefined);

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.session).toBeNull();
    expect(state.profile).toBeNull();
  });
});
EOF
```

### 10.3 Create E2E Auth Flow Test

```bash
# mobile/cypress/e2e/auth.cy.ts
mkdir -p mobile/cypress/e2e
cat > mobile/cypress/e2e/auth.cy.ts << 'EOF'
describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should redirect to login when not authenticated', () => {
    cy.url().should('include', '/login');
  });

  it('should display login form', () => {
    cy.visit('/login');
    cy.contains('Welcome Back');
    cy.get('input[type="email"]').should('exist');
    cy.get('input[type="password"]').should('exist');
    cy.contains('Login').should('exist');
  });

  it('should navigate to signup page', () => {
    cy.visit('/login');
    cy.contains('Sign Up').click();
    cy.url().should('include', '/signup');
    cy.contains('Create Account');
  });

  it('should navigate to forgot password page', () => {
    cy.visit('/login');
    cy.contains('Forgot Password?').click();
    cy.url().should('include', '/forgot-password');
    cy.contains('Reset Password');
  });

  it('should show validation errors for empty fields', () => {
    cy.visit('/login');
    cy.contains('button', 'Login').click();
    cy.contains('Please enter email and password').should('be.visible');
  });

  it('should show error for invalid credentials', () => {
    cy.visit('/login');
    cy.get('input[type="email"]').type('wrong@example.com');
    cy.get('input[type="password"]').type('wrongpassword');
    cy.contains('button', 'Login').click();

    // This will fail if user doesn't exist - expected behavior
    cy.contains('Failed to login', { timeout: 5000 }).should('be.visible');
  });

  // Note: Full signup/login test requires actual Supabase credentials
  // or mocked backend. For development, test manually with real credentials.
});
EOF
```

### 10.4 Update Package.json Test Scripts

```bash
# Add test scripts to mobile/package.json
cd mobile
npm pkg set scripts.test="vitest"
npm pkg set scripts.test:ui="vitest --ui"
npm pkg set scripts.test:coverage="vitest --coverage"
```

### 10.5 Install Testing Dependencies

```bash
cd mobile
npm install --save-dev @vitest/ui @vitest/coverage-v8
```

---

## Step 11: Manual Testing Checklist (20 minutes)

### 11.1 Test Signup Flow

```bash
# 1. Start the app
npm run dev

# 2. Test signup:
# - Navigate to /signup
# - Fill in email, password, confirm password
# - Click "Create Account"
# - Verify redirect to /home
# - Check Supabase Dashboard → Authentication → Users for new user

# 3. Verify session persistence:
# - Refresh the page
# - Should remain logged in
# - Check browser DevTools → Application → IndexedDB for session data
```

### 11.2 Test Login Flow

```bash
# 1. Logout first (click profile icon → Logout)
# 2. Navigate to /login
# 3. Enter credentials
# 4. Click "Login"
# 5. Verify redirect to /home
# 6. Verify user info displayed
```

### 11.3 Test Protected Routes

```bash
# 1. Logout
# 2. Try to navigate directly to /home
# 3. Should redirect to /login
# 4. Login
# 5. Should access /home successfully
```

### 11.4 Test Password Reset

```bash
# 1. Navigate to /forgot-password
# 2. Enter email
# 3. Click "Send Reset Link"
# 4. Check email inbox for reset link
# 5. Click link (should redirect to app)
# 6. Enter new password
# 7. Verify can login with new password
```

### 11.5 Test Backend Auth Middleware

```bash
# 1. Get access token from browser DevTools
# 2. Test protected endpoint:

curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Should return user data

# 3. Test without token:
curl -X GET http://localhost:3000/auth/me

# Should return 401 Unauthorized
```

---

## Step 12: Quality Gates Checklist

### 12.1 Functional Requirements

- [ ] Users can sign up with email and password
- [ ] Users can log in with existing credentials
- [ ] Users can reset password via email
- [ ] Sessions persist across app restarts
- [ ] Protected routes redirect to login when not authenticated
- [ ] Users can view and edit basic profile
- [ ] Users can log out successfully

### 12.2 Technical Requirements

- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] ESLint passes (`npm run lint`)
- [ ] Unit tests pass (`npm test`)
- [ ] E2E tests pass (manual or `npm run test.e2e`)
- [ ] Backend auth middleware works correctly
- [ ] Supabase RLS policies prevent unauthorized access

### 12.3 Security Requirements

- [ ] Passwords are never stored in plain text
- [ ] JWT tokens are verified on backend
- [ ] Sessions expire and refresh automatically
- [ ] User data is isolated via RLS policies
- [ ] HTTPS enforced (production)

### 12.4 UX Requirements

- [ ] Loading states shown during auth operations
- [ ] Error messages are clear and helpful
- [ ] Success feedback provided
- [ ] Forms validate input
- [ ] Navigation is intuitive

---

## Step 13: Update Progress Tracker

```bash
# Update docs/PROGRESS.md

# Change Phase 2 status from "Ready to Start" to "Complete"
# Update completion date
# Check off all deliverables
# Unlock Phase 3 (change from 🔒 to ⬜)
```

---

## Troubleshooting

### Issue: "Missing Supabase environment variables"

**Solution:**
```bash
# Check mobile/.env file exists
cat mobile/.env

# Should contain:
# VITE_SUPABASE_URL=https://xxx.supabase.co
# VITE_SUPABASE_ANON_KEY=xxx
```

### Issue: "User not found" after signup

**Solution:**
- Check Supabase Dashboard → Authentication → Users
- Verify email confirmation is disabled for development
- Check for email verification link if enabled

### Issue: Session not persisting

**Solution:**
```bash
# Check Capacitor Preferences is installed
npm list @capacitor/preferences

# Verify storage.ts is being used in authStore.ts
# Check browser DevTools → Application → IndexedDB
```

### Issue: CORS errors on backend

**Solution:**
```bash
# Ensure backend has CORS enabled for frontend URL
# Update backend/src/app.ts with:
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));
```

### Issue: Tests failing

**Solution:**
```bash
# Install all test dependencies
npm install --save-dev vitest @vitest/ui jsdom @testing-library/react

# Verify vitest.config.ts exists
# Run tests with verbose output
npm test -- --reporter=verbose
```

---

## Next Steps

**Phase 2 Complete!** 🎉

You now have:
- ✅ Full authentication system
- ✅ Protected routes
- ✅ User profile management
- ✅ Backend auth middleware
- ✅ Basic test coverage

**Ready for Phase 3: Core Journal CRUD Operations**

Phase 3 will build on this authentication foundation to create, read, update, and delete journal entries with proper user association and security.

---

## Reference Commands

```bash
# Development
npm run dev                    # Start Ionic dev server
npm run ionic:serve            # Alternative Ionic serve

# Testing
npm test                       # Run unit tests
npm run test:ui                # Run tests with UI
npm run test:coverage          # Generate coverage report
npm run test.e2e               # Run Cypress E2E tests

# Backend
cd backend && npm run dev      # Start backend server

# Database
cd supabase
npx supabase db push           # Apply migrations

# Build
npm run build                  # Production build
npm run cap:sync               # Sync with Capacitor
```

---

**Estimated Total Time:** 3-4 hours
**Complexity:** Moderate
**Prerequisites:** Phase 1 complete

**Deliverables:**
✅ Working signup, login, password reset screens
✅ Backend authentication middleware
✅ User session management
✅ Basic user profile screen
✅ Protected routes
✅ Critical path tests
