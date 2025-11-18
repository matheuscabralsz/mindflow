// Core User Types
export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserWithProfile extends User {
  profile: UserProfile | null;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  reminder_enabled: boolean;
  reminder_time: string;
  theme: 'light' | 'dark';
  created_at: string;
  updated_at: string;
}

// Authentication Types
export interface AuthCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials extends AuthCredentials {
  displayName?: string;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: User;
}

export interface AuthState {
  user: UserWithProfile | null;
  session: AuthSession | null;
  loading: boolean;
  initialized: boolean;
}

// Profile Update Types
export interface UpdateProfileData {
  display_name?: string;
  avatar_url?: string;
}
