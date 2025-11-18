import { supabase } from './supabase';
import type {
  AuthCredentials,
  SignupCredentials,
  UserWithProfile,
  UserProfile,
  UpdateProfileData,
} from '../types/user.types';

/**
 * Authentication Service
 * Handles all auth-related operations using Supabase Auth
 */
export const authService = {
  /**
   * Sign up a new user
   */
  async signup(credentials: SignupCredentials): Promise<UserWithProfile> {
    const { email, password, displayName } = credentials;

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Failed to create user');

    // Create user profile
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .insert([
        {
          id: authData.user.id,
          display_name: displayName || null,
          avatar_url: null,
        },
      ])
      .select()
      .single();

    if (profileError) {
      console.error('Failed to create profile:', profileError);
    }

    return {
      id: authData.user.id,
      email: authData.user.email!,
      created_at: authData.user.created_at,
      profile: profileData || null,
    };
  },

  /**
   * Sign in an existing user
   */
  async login(credentials: AuthCredentials): Promise<UserWithProfile> {
    const { email, password } = credentials;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error('Failed to login');

    // Fetch user profile
    const profile = await this.getUserProfile(data.user.id);

    return {
      id: data.user.id,
      email: data.user.email!,
      created_at: data.user.created_at,
      profile,
    };
  },

  /**
   * Sign out the current user
   */
  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Get the current session
   */
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  /**
   * Get the current user with profile
   */
  async getCurrentUser(): Promise<UserWithProfile | null> {
    const { data, error } = await supabase.auth.getUser();

    // If there's no session, return null instead of throwing
    if (error) {
      if (error.message.includes('session_missing')) {
        return null;
      }
      throw error;
    }
    if (!data.user) return null;

    const profile = await this.getUserProfile(data.user.id);

    return {
      id: data.user.id,
      email: data.user.email!,
      created_at: data.user.created_at,
      profile,
    };
  },

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Failed to fetch profile:', error);
      return null;
    }

    return data;
  },

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updates: UpdateProfileData
  ): Promise<UserProfile> {
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
   * Send password reset email
   */
  async resetPassword(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
  },

  /**
   * Update user password
   */
  async updatePassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
  },

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(
    callback: (event: string, session: unknown) => void
  ): { data: { subscription: unknown } } {
    return supabase.auth.onAuthStateChange(callback);
  },
};
