# Phase 2: User Authentication System - Detailed Implementation Plan

## Overview
Implement a complete user authentication system using Supabase Auth, including sign up, login, password reset, token management, and protected route navigation. Users will be able to create accounts, securely log in, and access authenticated features.

## Goals
- Users can register new accounts with email/password
- Users can log in with credentials and receive JWT tokens
- Users can reset forgotten passwords
- Backend API routes are protected with authentication middleware
- Frontend navigation guards prevent unauthorized access
- Tokens refresh automatically before expiration
- User session persists across app restarts

---

## Database Schema

### Users Table
Supabase Auth automatically manages the `auth.users` table. We need to create a `public.users` table for additional user data:

```sql
-- Create public users table
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY "Users can read own data"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own data
CREATE POLICY "Users can update own data"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Policy: Users can insert their own data
CREATE POLICY "Users can insert own data"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index on email for faster lookups
CREATE INDEX idx_users_email ON public.users(email);
```

### Migration File
Create using Supabase CLI:
```bash
npx supabase migration new create_users_table
# This creates: supabase/migrations/YYYYMMDDHHMMSS_create_users_table.sql
```

---

## Backend Implementation

### 1. Environment Configuration

**File:** `backend/src/config/supabase.ts`
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
```

**File:** `backend/src/config/env.ts`
```typescript
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  supabase: {
    url: process.env.SUPABASE_URL!,
    serviceKey: process.env.SUPABASE_SERVICE_KEY!,
    anonKey: process.env.SUPABASE_ANON_KEY!,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
  },
};
```

### 2. Authentication Middleware

**File:** `backend/src/middleware/auth.middleware.ts`
```typescript
import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role?: string;
      };
    }
  }
}

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract token from Authorization header
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

    // Attach user to request object
    req.user = {
      id: user.id,
      email: user.email!,
      role: user.role,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
    });
  }
};

// Optional auth - doesn't fail if no token, but attaches user if valid
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
        req.user = {
          id: user.id,
          email: user.email!,
          role: user.role,
        };
      }
    }

    next();
  } catch (error) {
    // Don't fail, just continue without user
    next();
  }
};
```

### 3. Validation Middleware

**File:** `backend/src/middleware/validation.middleware.ts`
```typescript
import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      next(error);
    }
  };
};

// Validation schemas
export const authSchemas = {
  signUp: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    fullName: z.string().min(2, 'Full name must be at least 2 characters').optional(),
  }),

  signIn: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),

  resetPassword: z.object({
    email: z.string().email('Invalid email address'),
  }),

  updatePassword: z.object({
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
  }),

  updateProfile: z.object({
    fullName: z.string().min(2).optional(),
    avatarUrl: z.string().url().optional(),
  }),
};
```

### 4. Authentication Controller

**File:** `backend/src/controllers/auth.controller.ts`
```typescript
import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export const authController = {
  // Sign up new user
  signUp: async (req: Request, res: Response) => {
    try {
      const { email, password, fullName } = req.body;

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (authError) {
        return res.status(400).json({
          success: false,
          error: authError.message,
        });
      }

      if (!authData.user) {
        return res.status(400).json({
          success: false,
          error: 'Failed to create user',
        });
      }

      // Create user profile in public.users table
      const { error: profileError } = await supabase
        .from('users')
        .insert([{
          id: authData.user.id,
          email: authData.user.email,
          full_name: fullName,
        }]);

      if (profileError) {
        console.error('Failed to create user profile:', profileError);
        // User is created in auth, but profile failed
        // Could implement cleanup here or let it be created on first login
      }

      return res.status(201).json({
        success: true,
        data: {
          user: {
            id: authData.user.id,
            email: authData.user.email,
            fullName: fullName,
          },
          session: authData.session,
        },
        message: 'User created successfully. Please check your email to verify your account.',
      });
    } catch (error) {
      console.error('Sign up error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to sign up',
      });
    }
  },

  // Sign in existing user
  signIn: async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
      }

      if (!data.user || !data.session) {
        return res.status(401).json({
          success: false,
          error: 'Authentication failed',
        });
      }

      // Fetch user profile
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      return res.status(200).json({
        success: true,
        data: {
          user: {
            id: data.user.id,
            email: data.user.email,
            fullName: profile?.full_name,
            avatarUrl: profile?.avatar_url,
            onboardingCompleted: profile?.onboarding_completed,
          },
          session: data.session,
        },
      });
    } catch (error) {
      console.error('Sign in error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to sign in',
      });
    }
  },

  // Sign out user
  signOut: async (req: Request, res: Response) => {
    try {
      // Supabase handles token invalidation
      return res.status(200).json({
        success: true,
        message: 'Signed out successfully',
      });
    } catch (error) {
      console.error('Sign out error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to sign out',
      });
    }
  },

  // Request password reset
  resetPassword: async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.APP_URL}/reset-password`,
      });

      if (error) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }

      // Always return success to prevent email enumeration
      return res.status(200).json({
        success: true,
        message: 'Password reset email sent. Please check your inbox.',
      });
    } catch (error) {
      console.error('Reset password error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to send reset email',
      });
    }
  },

  // Update password (requires auth)
  updatePassword: async (req: Request, res: Response) => {
    try {
      const { password } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
      }

      const { error } = await supabase.auth.admin.updateUserById(userId, {
        password,
      });

      if (error) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Password updated successfully',
      });
    } catch (error) {
      console.error('Update password error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update password',
      });
    }
  },

  // Get current user profile
  getProfile: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
      }

      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        return res.status(404).json({
          success: false,
          error: 'Profile not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          id: profile.id,
          email: profile.email,
          fullName: profile.full_name,
          avatarUrl: profile.avatar_url,
          onboardingCompleted: profile.onboarding_completed,
          createdAt: profile.created_at,
        },
      });
    } catch (error) {
      console.error('Get profile error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch profile',
      });
    }
  },

  // Update user profile
  updateProfile: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { fullName, avatarUrl } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
      }

      const updates: any = {};
      if (fullName !== undefined) updates.full_name = fullName;
      if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          id: data.id,
          email: data.email,
          fullName: data.full_name,
          avatarUrl: data.avatar_url,
          onboardingCompleted: data.onboarding_completed,
        },
      });
    } catch (error) {
      console.error('Update profile error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update profile',
      });
    }
  },

  // Refresh access token
  refreshToken: async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: 'Refresh token required',
        });
      }

      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error || !data.session) {
        return res.status(401).json({
          success: false,
          error: 'Invalid refresh token',
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          session: data.session,
        },
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to refresh token',
      });
    }
  },
};
```

### 5. Authentication Routes

**File:** `backend/src/routes/auth.routes.ts`
```typescript
import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validate, authSchemas } from '../middleware/validation.middleware';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.post('/signup', validate(authSchemas.signUp), authController.signUp);
router.post('/signin', validate(authSchemas.signIn), authController.signIn);
router.post('/signout', authController.signOut);
router.post('/reset-password', validate(authSchemas.resetPassword), authController.resetPassword);
router.post('/refresh', authController.refreshToken);

// Protected routes
router.get('/profile', requireAuth, authController.getProfile);
router.put('/profile', requireAuth, validate(authSchemas.updateProfile), authController.updateProfile);
router.put('/password', requireAuth, validate(authSchemas.updatePassword), authController.updatePassword);

export default router;
```

### 6. Update Main Server File

**File:** `backend/src/server.ts`
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env';
import authRoutes from './routes/auth.routes';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);
});

export default app;
```

---

## Frontend Implementation

### 1. TypeScript Types

**File:** `mobile/src/types/auth.types.ts`
```typescript
export interface User {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  onboardingCompleted?: boolean;
  createdAt?: string;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  token_type: string;
  user: User;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
}

export interface SignUpData {
  email: string;
  password: string;
  fullName?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface UpdateProfileData {
  fullName?: string;
  avatarUrl?: string;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user: User;
    session: Session;
  };
  error?: string;
  message?: string;
}
```

### 2. API Service

**File:** `mobile/src/services/api.ts`
```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_URL}/api`,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const { session } = useAuthStore.getState();
        if (session?.access_token) {
          config.headers.Authorization = `Bearer ${session.access_token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // If 401 and not already retried, try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const { session } = useAuthStore.getState();
            if (session?.refresh_token) {
              const response = await this.client.post('/auth/refresh', {
                refreshToken: session.refresh_token,
              });

              if (response.data.success) {
                const newSession = response.data.data.session;
                useAuthStore.getState().setSession(newSession);

                // Retry original request with new token
                originalRequest.headers.Authorization = `Bearer ${newSession.access_token}`;
                return this.client(originalRequest);
              }
            }
          } catch (refreshError) {
            // Refresh failed, sign out user
            useAuthStore.getState().signOut();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  getClient() {
    return this.client;
  }
}

export const apiClient = new ApiClient().getClient();
```

**File:** `mobile/src/services/auth.service.ts`
```typescript
import { apiClient } from './api';
import { SignUpData, SignInData, UpdateProfileData, AuthResponse, User } from '../types/auth.types';

export const authService = {
  // Sign up new user
  signUp: async (data: SignUpData): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/signup', data);
    return response.data;
  },

  // Sign in existing user
  signIn: async (data: SignInData): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/signin', data);
    return response.data;
  },

  // Sign out
  signOut: async (): Promise<void> => {
    await apiClient.post('/auth/signout');
  },

  // Request password reset
  resetPassword: async (email: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post('/auth/reset-password', { email });
    return response.data;
  },

  // Update password
  updatePassword: async (password: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.put('/auth/password', { password });
    return response.data;
  },

  // Get user profile
  getProfile: async (): Promise<{ success: boolean; data: User }> => {
    const response = await apiClient.get('/auth/profile');
    return response.data;
  },

  // Update user profile
  updateProfile: async (data: UpdateProfileData): Promise<{ success: boolean; data: User }> => {
    const response = await apiClient.put('/auth/profile', data);
    return response.data;
  },
};
```

### 3. Zustand Auth Store

**File:** `mobile/src/store/authStore.ts`
```typescript
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Session } from '../types/auth.types';
import { authService } from '../services/auth.service';

interface AuthStore {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: { fullName?: string; avatarUrl?: string }) => Promise<void>;
  initialize: () => Promise<void>;
}

const STORAGE_KEY = '@mindflow:auth';

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  session: null,
  loading: false,
  initialized: false,

  setUser: (user) => set({ user }),

  setSession: async (session) => {
    set({ session });
    if (session) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  },

  setLoading: (loading) => set({ loading }),

  signIn: async (email, password) => {
    try {
      set({ loading: true });
      const response = await authService.signIn({ email, password });

      if (response.success && response.data) {
        set({
          user: response.data.user,
          session: response.data.session,
        });
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(response.data.session));
      } else {
        throw new Error(response.error || 'Sign in failed');
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  signUp: async (email, password, fullName) => {
    try {
      set({ loading: true });
      const response = await authService.signUp({ email, password, fullName });

      if (response.success && response.data) {
        set({
          user: response.data.user,
          session: response.data.session,
        });
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(response.data.session));
      } else {
        throw new Error(response.error || 'Sign up failed');
      }
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    try {
      await authService.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      set({ user: null, session: null });
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  },

  updateProfile: async (data) => {
    try {
      set({ loading: true });
      const response = await authService.updateProfile(data);

      if (response.success) {
        set({ user: response.data });
      }
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  initialize: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);

      if (stored) {
        const session: Session = JSON.parse(stored);

        // Check if token is expired
        const now = Date.now() / 1000;
        if (session.expires_at > now) {
          set({ session, user: session.user });

          // Fetch fresh user data
          try {
            const response = await authService.getProfile();
            if (response.success) {
              set({ user: response.data });
            }
          } catch (error) {
            console.error('Failed to fetch profile:', error);
          }
        } else {
          // Token expired, clear storage
          await AsyncStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error('Initialize error:', error);
    } finally {
      set({ initialized: true });
    }
  },
}));
```

### 4. Utility Functions

**File:** `mobile/src/utils/validation.ts`
```typescript
export const validateEmail = (email: string): string | null => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) return 'Email is required';
  if (!emailRegex.test(email)) return 'Invalid email address';
  return null;
};

export const validatePassword = (password: string): string | null => {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  return null;
};

export const validateFullName = (name: string): string | null => {
  if (!name) return null; // Optional field
  if (name.length < 2) return 'Name must be at least 2 characters';
  return null;
};
```

### 5. Sign Up Screen

**File:** `mobile/src/screens/auth/SignUpScreen.tsx`
```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { validateEmail, validatePassword, validateFullName } from '../../utils/validation';

export const SignUpScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const { signUp, loading } = useAuthStore();

  const handleSignUp = async () => {
    // Validate inputs
    const validationErrors: { [key: string]: string } = {};

    const emailError = validateEmail(email);
    if (emailError) validationErrors.email = emailError;

    const passwordError = validatePassword(password);
    if (passwordError) validationErrors.password = passwordError;

    const nameError = validateFullName(fullName);
    if (nameError) validationErrors.fullName = nameError;

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});

    try {
      await signUp(email.trim(), password, fullName.trim() || undefined);
      Alert.alert(
        'Success',
        'Account created successfully! Please check your email to verify your account.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert(
        'Sign Up Failed',
        error.response?.data?.error || error.message || 'An error occurred during sign up',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Start your journaling journey</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Full Name (Optional)</Text>
            <TextInput
              style={[styles.input, errors.fullName && styles.inputError]}
              placeholder="John Doe"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              editable={!loading}
            />
            {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!loading}
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[styles.input, errors.password && styles.inputError]}
              placeholder="Min. 8 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
            />
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            <Text style={styles.helperText}>
              Must contain uppercase, lowercase, and number
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
              <Text style={styles.linkText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  inputError: {
    borderColor: '#ff3b30',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 12,
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
  },
  linkText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
});
```

### 6. Sign In Screen

**File:** `mobile/src/screens/auth/SignInScreen.tsx`
```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { validateEmail } from '../../utils/validation';

export const SignInScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const { signIn, loading } = useAuthStore();

  const handleSignIn = async () => {
    // Validate inputs
    const validationErrors: { [key: string]: string } = {};

    const emailError = validateEmail(email);
    if (emailError) validationErrors.email = emailError;

    if (!password) validationErrors.password = 'Password is required';

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});

    try {
      await signIn(email.trim(), password);
    } catch (error: any) {
      Alert.alert(
        'Sign In Failed',
        error.response?.data?.error || error.message || 'Invalid email or password',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue journaling</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!loading}
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[styles.input, errors.password && styles.inputError]}
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
            />
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotPassword}
          >
            <Text style={styles.linkText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.linkText}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  inputError: {
    borderColor: '#ff3b30',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 12,
    marginTop: 4,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
  },
  linkText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
});
```

### 7. Forgot Password Screen

**File:** `mobile/src/screens/auth/ForgotPasswordScreen.tsx`
```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { authService } from '../../services/auth.service';
import { validateEmail } from '../../utils/validation';

export const ForgotPasswordScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleResetPassword = async () => {
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await authService.resetPassword(email.trim());

      if (response.success) {
        Alert.alert(
          'Email Sent',
          'Password reset instructions have been sent to your email.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to send reset email',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          Enter your email address and we'll send you instructions to reset your password.
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, error && styles.inputError]}
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            editable={!loading}
          />
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleResetPassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Send Reset Link</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.linkText}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    lineHeight: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  inputError: {
    borderColor: '#ff3b30',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 12,
    marginTop: 4,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    alignSelf: 'center',
    marginTop: 24,
  },
  linkText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
});
```

### 8. Settings/Profile Screen

**File:** `mobile/src/screens/settings/SettingsScreen.tsx`
```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { validateFullName } from '../../utils/validation';

export const SettingsScreen = () => {
  const { user, signOut, updateProfile, loading } = useAuthStore();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');

  const handleSaveProfile = async () => {
    const nameError = validateFullName(fullName);
    if (nameError) {
      setError(nameError);
      return;
    }

    try {
      await updateProfile({ fullName: fullName.trim() });
      setIsEditing(false);
      setError('');
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => signOut(),
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email}</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Full Name</Text>
          {isEditing ? (
            <>
              <TextInput
                style={[styles.input, error && styles.inputError]}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your name"
              />
              {error && <Text style={styles.errorText}>{error}</Text>}
            </>
          ) : (
            <Text style={styles.value}>{user?.fullName || 'Not set'}</Text>
          )}
        </View>

        {isEditing ? (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => {
                setIsEditing(false);
                setFullName(user?.fullName || '');
                setError('');
              }}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleSaveProfile}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => setIsEditing(true)}
          >
            <Text style={styles.secondaryButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {/* Navigate to change password */}}
        >
          <Text style={styles.menuItemText}>Change Password</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, styles.dangerItem]}
          onPress={handleSignOut}
        >
          <Text style={styles.dangerText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Account created {new Date(user?.createdAt || '').toLocaleDateString()}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#1a1a1a',
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  inputError: {
    borderColor: '#ff3b30',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 12,
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  menuItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  dangerItem: {
    borderBottomWidth: 0,
  },
  dangerText: {
    fontSize: 16,
    color: '#ff3b30',
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});
```

### 9. Navigation Setup

**File:** `mobile/src/navigation/AuthNavigator.tsx`
```typescript
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SignUpScreen } from '../screens/auth/SignUpScreen';
import { SignInScreen } from '../screens/auth/SignInScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';

const Stack = createNativeStackNavigator();

export const AuthNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
};
```

**File:** `mobile/src/navigation/RootNavigator.tsx`
```typescript
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { AuthNavigator } from './AuthNavigator';
// Import MainNavigator when Phase 3 is complete
// import { MainNavigator } from './MainNavigator';

export const RootNavigator = () => {
  const { user, initialized, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  if (!initialized) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? (
        // Will show MainNavigator in Phase 3
        <View style={styles.placeholder}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
```

### 10. Update App Entry Point

**File:** `mobile/App.tsx`
```typescript
import React from 'react';
import { RootNavigator } from './src/navigation/RootNavigator';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <RootNavigator />
    </GestureHandlerRootView>
  );
}
```

---

## Testing Implementation

### 1. Backend Tests

**File:** `backend/src/__tests__/auth.test.ts`
```typescript
import request from 'supertest';
import app from '../server';
import { supabase } from '../config/supabase';

describe('Authentication API', () => {
  const testUser = {
    email: `test${Date.now()}@example.com`,
    password: 'Test1234',
    fullName: 'Test User',
  };

  let authToken: string;

  describe('POST /api/auth/signup', () => {
    it('should create a new user', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send(testUser);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.session).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      await request(app).post('/api/auth/signup').send(testUser);

      const response = await request(app)
        .post('/api/auth/signup')
        .send(testUser);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({ ...testUser, email: 'invalid-email' });

      expect(response.status).toBe(400);
      expect(response.body.details).toBeDefined();
    });

    it('should validate password strength', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({ ...testUser, password: 'weak' });

      expect(response.status).toBe(400);
      expect(response.body.details).toBeDefined();
    });
  });

  describe('POST /api/auth/signin', () => {
    beforeAll(async () => {
      await request(app).post('/api/auth/signup').send(testUser);
    });

    it('should sign in with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/signin')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.session).toBeDefined();
      authToken = response.body.data.session.access_token;
    });

    it('should reject incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/signin')
        .send({
          email: testUser.email,
          password: 'WrongPassword123',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/signin')
        .send({
          email: 'nonexistent@example.com',
          password: 'Test1234',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should get user profile when authenticated', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(testUser.email);
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app).get('/api/auth/profile');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/auth/profile', () => {
    it('should update user profile', async () => {
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ fullName: 'Updated Name' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.fullName).toBe('Updated Name');
    });
  });

  // Cleanup
  afterAll(async () => {
    // Delete test user
    try {
      const { data: users } = await supabase.auth.admin.listUsers();
      const testUserRecord = users.users.find(u => u.email === testUser.email);
      if (testUserRecord) {
        await supabase.auth.admin.deleteUser(testUserRecord.id);
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });
});
```

### 2. Frontend Tests

**File:** `mobile/src/__tests__/authStore.test.ts`
```typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useAuthStore } from '../store/authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('Auth Store', () => {
  beforeEach(() => {
    AsyncStorage.clear();
  });

  it('should initialize with no user', () => {
    const { result } = renderHook(() => useAuthStore());

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('should sign in user', async () => {
    const { result } = renderHook(() => useAuthStore());

    await act(async () => {
      await result.current.signIn('test@example.com', 'Test1234');
    });

    expect(result.current.user).toBeDefined();
    expect(result.current.session).toBeDefined();
  });

  it('should sign out user', async () => {
    const { result } = renderHook(() => useAuthStore());

    await act(async () => {
      await result.current.signIn('test@example.com', 'Test1234');
      await result.current.signOut();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it('should persist session to AsyncStorage', async () => {
    const { result } = renderHook(() => useAuthStore());

    await act(async () => {
      await result.current.signIn('test@example.com', 'Test1234');
    });

    const stored = await AsyncStorage.getItem('@mindflow:auth');
    expect(stored).toBeDefined();

    const session = JSON.parse(stored!);
    expect(session.access_token).toBeDefined();
  });
});
```

---

## Step-by-Step Implementation

### Step 1: Database Setup
- Create migration file `002_create_users_table.sql`
- Run migration on Supabase to create `public.users` table
- Verify RLS policies are enabled
- Test policies by attempting to query as different users

### Step 2: Backend Configuration
- Install dependencies: `@supabase/supabase-js`, `zod`, `express`, `cors`, `helmet`, `dotenv`
- Create config files for Supabase and environment variables
- Set up `.env` file with Supabase credentials
- Test Supabase connection

### Step 3: Backend Middleware
- Create authentication middleware with JWT verification
- Create validation middleware using Zod schemas
- Test middleware with mock requests
- Ensure error handling works correctly

### Step 4: Backend Controllers & Routes
- Implement auth controller with all methods (signup, signin, profile, etc.)
- Create auth routes file
- Connect routes to Express app
- Test each endpoint with Postman or Thunder Client

### Step 5: Backend Testing
- Set up Jest and Supertest
- Write integration tests for all auth endpoints
- Test authentication flows end-to-end
- Verify RLS policies block unauthorized access

### Step 6: Frontend Services
- Create TypeScript types for auth models
- Implement API client with Axios interceptors
- Create auth service with all API methods
- Test API calls against backend

### Step 7: Frontend State Management
- Create Zustand auth store
- Implement all store actions
- Add AsyncStorage persistence
- Test store with mock data

### Step 8: Frontend Validation
- Create validation utility functions
- Test validation with various inputs
- Ensure validation matches backend requirements

### Step 9: Frontend Screens
- Create SignUp screen with form validation
- Create SignIn screen with error handling
- Create ForgotPassword screen
- Create Settings screen for profile management
- Test all screens on iOS and Android simulators

### Step 10: Navigation Setup
- Install React Navigation dependencies
- Create AuthNavigator for auth screens
- Create RootNavigator with conditional rendering
- Initialize auth store on app launch
- Test navigation flow

### Step 11: Frontend Testing
- Set up React Native Testing Library
- Write tests for auth store
- Write component tests for auth screens
- Test navigation flows

### Step 12: End-to-End Testing
- Test complete signup flow (sign up → email verification → login)
- Test login flow with valid and invalid credentials
- Test password reset flow
- Test profile update flow
- Test token refresh mechanism
- Test session persistence across app restarts

### Step 13: Security Audit
- Verify all sensitive data is encrypted
- Check that passwords are never logged
- Ensure tokens are stored securely
- Test RLS policies thoroughly
- Verify rate limiting works (if implemented)

### Step 14: Performance Testing
- Test API response times under load
- Verify token refresh doesn't cause UI lag
- Check AsyncStorage read/write performance
- Optimize any slow operations

### Step 15: Manual Testing
- Test on real iOS device
- Test on real Android device
- Test with slow network connection
- Test with no network connection
- Test edge cases (special characters in email, etc.)

---

## Quality Gates

### Before Marking Phase Complete:
1. ✅ All backend tests pass (100% coverage on auth endpoints)
2. ✅ All frontend tests pass
3. ✅ Can sign up new user successfully
4. ✅ Can sign in with correct credentials
5. ✅ Invalid credentials are rejected
6. ✅ Password reset email sends successfully
7. ✅ Profile updates work correctly
8. ✅ Token refresh works automatically
9. ✅ Session persists across app restarts
10. ✅ RLS policies prevent unauthorized access
11. ✅ No TypeScript errors
12. ✅ ESLint passes with no errors
13. ✅ Tested on both iOS and Android
14. ✅ All API endpoints return proper error messages
15. ✅ UI displays loading states appropriately

---

## Dependencies to Install

### Backend
```bash
cd backend
npm install @supabase/supabase-js zod express cors helmet dotenv
npm install -D @types/express @types/cors jest supertest @types/jest @types/supertest ts-jest
```

### Frontend
```bash
cd mobile
npm install @react-navigation/native @react-navigation/native-stack react-native-screens react-native-safe-area-context zustand axios @react-native-async-storage/async-storage react-native-gesture-handler
npm install -D @testing-library/react-native @testing-library/react-hooks @types/jest
```

---

## Environment Variables

### Backend `.env`
```env
NODE_ENV=development
PORT=3000
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
SUPABASE_ANON_KEY=your-anon-key
JWT_SECRET=your-jwt-secret
APP_URL=mindflow://
```

### Frontend `.env`
```env
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Common Issues & Solutions

**Issue:** Token refresh infinite loop
- **Solution:** Add `_retry` flag to prevent multiple refresh attempts

**Issue:** AsyncStorage permissions error on Android
- **Solution:** Ensure AsyncStorage is properly linked in native modules

**Issue:** CORS errors during API calls
- **Solution:** Configure CORS middleware to allow requests from mobile app

**Issue:** Supabase RLS blocking legitimate requests
- **Solution:** Verify JWT is being sent in Authorization header

**Issue:** Navigation not updating after sign in
- **Solution:** Ensure Zustand store triggers re-render by updating state

---

## Next Steps
After completing Phase 2, you can move to **Phase 3: Core Journal CRUD Operations** which depends on the authentication system being in place.
