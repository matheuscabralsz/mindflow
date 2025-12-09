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

// Track in-flight initialization to prevent duplicate calls (e.g., from StrictMode)
let initializePromise: Promise<void> | null = null;

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
    // If already initialized, skip
    if (get().initialized) {
      return;
    }

    // If initialization is in progress, wait for it
    if (initializePromise) {
      return initializePromise;
    }

    initializePromise = (async () => {
      try {
        set({ loading: true, error: null });

        // Get current session and user in one call
        const session = await authService.getSession();

        if (session) {
          const user = await authService.getCurrentUser();
          set({ user, loading: false, initialized: true });
        } else {
          set({ user: null, loading: false, initialized: true });
        }

        // Listen to auth state changes
        // Note: We skip fetching on SIGNED_IN during initial load since we already have the user
        let isInitialEvent = true;
        authService.onAuthStateChange(async (event, session) => {
          // Skip the initial SIGNED_IN event - we already fetched the user above
          if (isInitialEvent && event === 'SIGNED_IN') {
            isInitialEvent = false;
            return;
          }
          isInitialEvent = false;

          if (event === 'SIGNED_IN' && session) {
            const user = await authService.getCurrentUser();
            set({ user, loading: false });
          } else if (event === 'SIGNED_OUT') {
            set({ user: null, loading: false });
          } else if (event === 'TOKEN_REFRESHED' && session) {
            // On token refresh, we can reuse existing user data unless profile changed
            const currentUser = get().user;
            if (currentUser) {
              // Just keep the existing user, token refresh doesn't change user data
              set({ user: currentUser });
            }
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
    })();

    return initializePromise;
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
