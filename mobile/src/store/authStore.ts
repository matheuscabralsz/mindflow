import { create } from 'zustand';
import { authService } from '../services/auth.service';
import type {
  AuthCredentials,
  SignupCredentials,
  UserWithProfile,
  UpdateProfileData,
} from '../types/user.types';

interface AuthState {
  user: UserWithProfile | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (credentials: AuthCredentials) => Promise<void>;
  signup: (credentials: SignupCredentials) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: UpdateProfileData) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  initialized: false,
  error: null,

  /**
   * Initialize auth state on app startup
   * Checks for existing session and sets up auth state listener
   */
  initialize: async () => {
    try {
      set({ loading: true, error: null });

      // Get current session
      const session = await authService.getSession();
      const curUser = await authService.getCurrentUser();
        console.log('Current user:', curUser);

      if (session) {
        const user = await authService.getCurrentUser();
        set({ user, loading: false, initialized: true });
      } else {
        set({ user: null, loading: false, initialized: true });
      }

      // Listen to auth state changes
      authService.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed event:', event);
        console.log('Auth state changed session:', session);

        if (event === 'SIGNED_IN' && session) {
          const user = await authService.getCurrentUser();
          set({ user, loading: false });
        } else if (event === 'SIGNED_OUT') {
          set({ user: null, loading: false });
        } else if (event === 'TOKEN_REFRESHED' && session) {
          const user = await authService.getCurrentUser();
          set({ user });
        }
      });
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to initialize',
        loading: false,
        initialized: true,
      });
    }
  },

  /**
   * Sign in with email and password
   */
  login: async (credentials: AuthCredentials) => {
    try {
      set({ loading: true, error: null });
      const user = await authService.login(credentials);
      set({ user, loading: false });
    } catch (error) {
      console.error('Login failed:', error);
      set({
        error: error instanceof Error ? error.message : 'Login failed',
        loading: false,
      });
      throw error;
    }
  },

  /**
   * Sign up a new user
   */
  signup: async (credentials: SignupCredentials) => {
    try {
      set({ loading: true, error: null });
      const user = await authService.signup(credentials);
      set({ user, loading: false });
    } catch (error) {
      console.error('Signup failed:', error);
      set({
        error: error instanceof Error ? error.message : 'Signup failed',
        loading: false,
      });
      throw error;
    }
  },

  /**
   * Sign out the current user
   */
  logout: async () => {
    try {
      set({ loading: true, error: null });
      await authService.logout();
      set({ user: null, loading: false });
    } catch (error) {
      console.error('Logout failed:', error);
      set({
        error: error instanceof Error ? error.message : 'Logout failed',
        loading: false,
      });
      throw error;
    }
  },

  /**
   * Update user profile
   */
  updateProfile: async (updates: UpdateProfileData) => {
    try {
      const { user } = get();
      if (!user) throw new Error('No user logged in');

      set({ loading: true, error: null });
      const updatedProfile = await authService.updateProfile(user.id, updates);

      set({
        user: { ...user, profile: updatedProfile },
        loading: false,
      });
    } catch (error) {
      console.error('Profile update failed:', error);
      set({
        error: error instanceof Error ? error.message : 'Update failed',
        loading: false,
      });
      throw error;
    }
  },

  /**
   * Send password reset email
   */
  resetPassword: async (email: string) => {
    try {
      set({ loading: true, error: null });
      await authService.resetPassword(email);
      set({ loading: false });
    } catch (error) {
      console.error('Password reset failed:', error);
      set({
        error:
          error instanceof Error ? error.message : 'Password reset failed',
        loading: false,
      });
      throw error;
    }
  },

  /**
   * Clear error state
   */
  clearError: () => set({ error: null }),
}));
