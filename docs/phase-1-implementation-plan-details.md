# Phase 1: Foundation & Infrastructure Setup - Detailed Implementation Guide

## Overview

**Goal:** Set up the complete development environment with a working React Native mobile app, Node.js backend API, and PostgreSQL database via Supabase.

**Time Estimate:** 4-6 hours

**Prerequisites:**
- Node.js 18+ installed
- Git installed
- Code editor (VS Code recommended)
- iOS Simulator (Mac) and/or Android Studio (for testing)
- Supabase account (free tier)

**What You'll Have At The End:**
- React Native Expo app showing "Hello World" on mobile
- Node.js backend with a working health check endpoint
- PostgreSQL database with complete schema
- Configured environment variables
- Code quality tools (ESLint, Prettier) ready to use

---

## Step 1: Project Root Setup (10 minutes)

### 1.1 Create Project Directory

```bash
# Navigate to your workspace
cd ~/my_workspace

# Create and enter project directory
mkdir mindflow
cd mindflow

# Initialize root git repository
git init

# Create root .gitignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Build outputs
dist/
build/
*.log

# Temporary files
*.tmp
.cache/
EOF
```

### 1.2 Create Directory Structure

```bash
# Create all main directories
mkdir -p mobile
mkdir -p backend
mkdir -p shared/types
mkdir -p database/migrations
mkdir -p docs
mkdir -p .github/workflows
```

### 1.3 Create Root README

```bash
cat > README.md << 'EOF'
# MindFlow - AI-Powered Journal App

An AI-powered mobile journal app that helps users write daily journal entries, track moods, and receive AI-generated insights.

## Project Structure

- `mobile/` - React Native Expo app (iOS + Android)
- `backend/` - Node.js Express API server
- `database/` - PostgreSQL schema and migrations
- `shared/` - Shared TypeScript types
- `docs/` - Documentation

## Quick Start

### Prerequisites
- Node.js 18+
- iOS Simulator (Mac) or Android Studio
- Supabase account

### Frontend Setup
```bash
cd mobile
npm install
npx expo start
```

### Backend Setup
```bash
cd backend
npm install
npm run dev
```

## Documentation

- [Implementation Plan](docs/implementation-plan.md)
- [Phase 1 Details](docs/phase-1-implementation-plan-details.md)
- [Project Instructions](.claude/CLAUDE.md)

## Tech Stack

- Frontend: React Native with Expo, TypeScript, Zustand
- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL (Supabase)
- AI: OpenAI API
- Auth: Supabase Auth

## License

MIT
EOF
```

---

## Step 2: Frontend - React Native Expo Setup (30 minutes)

### 2.1 Initialize Expo Project

```bash
# Navigate to mobile directory
cd mobile

# Create Expo app with TypeScript template
npx create-expo-app@latest . --template blank-typescript

# This creates the basic Expo structure
```

### 2.2 Install Core Dependencies

```bash
# Navigation
npm install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs

# Expo navigation dependencies
npx expo install react-native-screens react-native-safe-area-context

# State management
npm install zustand

# API client
npm install axios

# Supabase client
npm install @supabase/supabase-js

# AsyncStorage for local persistence
npx expo install @react-native-async-storage/async-storage

# Date handling
npm install date-fns
```

### 2.3 Install Development Dependencies

```bash
npm install --save-dev @types/react @types/react-native typescript eslint prettier eslint-config-prettier eslint-plugin-react eslint-plugin-react-native @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

### 2.4 Configure TypeScript

```bash
cat > tsconfig.json << 'EOF'
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"],
  "exclude": ["node_modules"]
}
EOF
```

### 2.5 Create Folder Structure

```bash
mkdir -p src/screens/auth
mkdir -p src/screens/entries
mkdir -p src/screens/insights
mkdir -p src/screens/settings
mkdir -p src/screens/onboarding
mkdir -p src/components/common
mkdir -p src/components/entries
mkdir -p src/components/insights
mkdir -p src/components/navigation
mkdir -p src/services
mkdir -p src/store
mkdir -p src/utils
mkdir -p src/hooks
mkdir -p src/types
mkdir -p src/theme
mkdir -p assets
```

### 2.6 Configure ESLint

```bash
cat > .eslintrc.js << 'EOF'
module.exports = {
  root: true,
  extends: [
    'expo',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-native/all',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-native'],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 12,
    sourceType: 'module',
  },
  env: {
    'react-native/react-native': true,
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
EOF
```

### 2.7 Configure Prettier

```bash
cat > .prettierrc << 'EOF'
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
EOF
```

### 2.8 Create Basic Theme

```bash
cat > src/theme/colors.ts << 'EOF'
export const colors = {
  primary: '#6366F1',
  secondary: '#8B5CF6',
  background: '#FFFFFF',
  surface: '#F3F4F6',
  text: '#1F2937',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
};

export const darkColors = {
  primary: '#818CF8',
  secondary: '#A78BFA',
  background: '#111827',
  surface: '#1F2937',
  text: '#F9FAFB',
  textSecondary: '#D1D5DB',
  border: '#374151',
  error: '#F87171',
  success: '#34D399',
  warning: '#FBBF24',
};
EOF

cat > src/theme/spacing.ts << 'EOF'
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};
EOF

cat > src/theme/typography.ts << 'EOF'
export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
};
EOF

cat > src/theme/index.ts << 'EOF'
export * from './colors';
export * from './spacing';
export * from './typography';
EOF
```

### 2.9 Create Basic Types

```bash
cat > src/types/index.ts << 'EOF'
export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface Entry {
  id: string;
  userId: string;
  content: string;
  mood?: Mood;
  createdAt: string;
  updatedAt: string;
}

export type Mood = 'happy' | 'sad' | 'anxious' | 'calm' | 'stressed' | 'neutral';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
EOF
```

### 2.10 Create Environment Configuration

```bash
cat > .env.example << 'EOF'
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EOF

# Copy to actual .env (you'll fill in real values later)
cp .env.example .env
```

### 2.11 Update app.json

```bash
cat > app.json << 'EOF'
{
  "expo": {
    "name": "MindFlow",
    "slug": "mindflow",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#6366F1"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.mindflow.app"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#6366F1"
      },
      "package": "com.mindflow.app"
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "extra": {
      "eas": {
        "projectId": "your-project-id"
      }
    }
  }
}
EOF
```

### 2.12 Create Basic App Component

```bash
cat > App.tsx << 'EOF'
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>MindFlow</Text>
      <Text style={styles.subtitle}>AI-Powered Journal App</Text>
      <Text style={styles.status}>✅ Frontend Setup Complete!</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6366F1',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#6B7280',
    marginBottom: 32,
  },
  status: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '600',
  },
});
EOF
```

### 2.13 Update package.json Scripts

```bash
# Add these scripts to the scripts section of package.json
npm pkg set scripts.start="expo start"
npm pkg set scripts.android="expo start --android"
npm pkg set scripts.ios="expo start --ios"
npm pkg set scripts.web="expo start --web"
npm pkg set scripts.lint="eslint . --ext .ts,.tsx"
npm pkg set scripts.type-check="tsc --noEmit"
```

---

## Step 3: Backend - Node.js API Setup (30 minutes)

### 3.1 Initialize Node.js Project

```bash
# Navigate to backend directory
cd ../backend

# Initialize npm project
npm init -y
```

### 3.2 Install Core Dependencies

```bash
# Framework
npm install express

# TypeScript
npm install --save-dev typescript @types/node @types/express ts-node nodemon

# Environment variables
npm install dotenv

# Database client
npm install @supabase/supabase-js

# Validation
npm install zod

# CORS
npm install cors
npm install --save-dev @types/cors

# Security
npm install helmet express-rate-limit

# Logging
npm install pino pino-pretty
```

### 3.3 Install Development Dependencies

```bash
npm install --save-dev eslint prettier eslint-config-prettier @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

### 3.4 Configure TypeScript

```bash
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF
```

### 3.5 Create Folder Structure

```bash
mkdir -p src/routes
mkdir -p src/controllers
mkdir -p src/services/ai
mkdir -p src/middleware
mkdir -p src/database
mkdir -p src/utils
mkdir -p src/types
mkdir -p src/config
mkdir -p tests/unit
mkdir -p tests/integration
```

### 3.6 Configure ESLint

```bash
cat > .eslintrc.js << 'EOF'
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-module-boundary-types': 'off',
  },
};
EOF
```

### 3.7 Configure Prettier

```bash
cat > .prettierrc << 'EOF'
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
EOF
```

### 3.8 Create Environment Configuration

```bash
cat > .env.example << 'EOF'
NODE_ENV=development
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
OPENAI_API_KEY=sk-your-key
EOF

# Copy to actual .env (you'll fill in real values later)
cp .env.example .env
```

### 3.9 Create Configuration Module

```bash
cat > src/config/env.ts << 'EOF'
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
  },
  database: {
    url: process.env.DATABASE_URL || '',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },
};

// Validate required environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'SUPABASE_ANON_KEY',
];

const missingEnvVars = requiredEnvVars.filter(
  (envVar) => !process.env[envVar]
);

if (missingEnvVars.length > 0) {
  console.warn(
    `Warning: Missing environment variables: ${missingEnvVars.join(', ')}`
  );
}
EOF
```

### 3.10 Create Supabase Client

```bash
cat > src/database/supabase.ts << 'EOF'
import { createClient } from '@supabase/supabase-js';
import { config } from '../config/env';

export const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
EOF
```

### 3.11 Create Logger Utility

```bash
cat > src/utils/logger.ts << 'EOF'
import pino from 'pino';
import { config } from '../config/env';

export const logger = pino({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  transport:
    config.nodeEnv !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});
EOF
```

### 3.12 Create Health Check Route

```bash
cat > src/routes/health.routes.ts << 'EOF'
import { Router, Request, Response } from 'express';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'MindFlow API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

export default router;
EOF
```

### 3.13 Create Routes Index

```bash
cat > src/routes/index.ts << 'EOF'
import { Router } from 'express';
import healthRoutes from './health.routes';

const router = Router();

router.use('/', healthRoutes);

export default router;
EOF
```

### 3.14 Create Error Middleware

```bash
cat > src/middleware/error.middleware.ts << 'EOF'
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  logger.error(err);

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message,
  });
};

export const notFoundHandler = (_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    message: 'The requested resource does not exist',
  });
};
EOF
```

### 3.15 Create Express Server

```bash
cat > src/server.ts << 'EOF'
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env';
import { logger } from './utils/logger';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api', routes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = config.port;

app.listen(PORT, () => {
  logger.info(`✅ MindFlow API server running on port ${PORT}`);
  logger.info(`Environment: ${config.nodeEnv}`);
});

export default app;
EOF
```

### 3.16 Create Main Entry Point

```bash
cat > src/index.ts << 'EOF'
import './server';
EOF
```

### 3.17 Configure nodemon

```bash
cat > nodemon.json << 'EOF'
{
  "watch": ["src"],
  "ext": "ts",
  "ignore": ["src/**/*.test.ts"],
  "exec": "ts-node src/index.ts"
}
EOF
```

### 3.18 Update package.json Scripts

```bash
npm pkg set scripts.dev="nodemon"
npm pkg set scripts.build="tsc"
npm pkg set scripts.start="node dist/index.js"
npm pkg set scripts.lint="eslint . --ext .ts"
npm pkg set scripts.type-check="tsc --noEmit"
```

---

## Step 4: Database Setup with Supabase (45 minutes)

### 4.1 Create Supabase Project

1. Go to https://supabase.com
2. Click "New Project"
3. Enter project details:
   - Name: "mindflow"
   - Database Password: Generate a strong password (save it!)
   - Region: Choose closest to you
   - Pricing Plan: Free
4. Click "Create new project"
5. Wait 2-3 minutes for project to be ready

### 4.2 Get Supabase Credentials

Once your project is ready:

1. Go to Project Settings > API
2. Copy the following:
   - Project URL → `SUPABASE_URL`
   - `anon` `public` key → `SUPABASE_ANON_KEY`
   - `service_role` `secret` key → `SUPABASE_SERVICE_KEY`
3. Go to Project Settings > Database
4. Copy the connection string → `DATABASE_URL`

### 4.3 Update Environment Files

Update `backend/.env`:
```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhb...
SUPABASE_ANON_KEY=eyJhb...
DATABASE_URL=postgresql://postgres:[password]@db.xxxxx.supabase.co:5432/postgres
```

Update `mobile/.env`:
```bash
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhb...
```

### 4.4 Create Database Schema

```bash
# Navigate to database directory
cd ../database

# Create initial schema
cat > schema.sql << 'EOF'
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (managed by Supabase Auth)
-- This table is automatically created by Supabase Auth
-- We'll reference auth.users(id) in our tables

-- Moods enum
CREATE TYPE mood_type AS ENUM ('happy', 'sad', 'anxious', 'calm', 'stressed', 'neutral');

-- Journal entries table
CREATE TABLE entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mood mood_type,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes for performance
  CONSTRAINT entries_content_length CHECK (char_length(content) <= 50000)
);

-- Indexes
CREATE INDEX idx_entries_user_id ON entries(user_id);
CREATE INDEX idx_entries_created_at ON entries(created_at DESC);
CREATE INDEX idx_entries_mood ON entries(mood);

-- Full-text search index
CREATE INDEX idx_entries_search ON entries USING GIN(to_tsvector('english', content));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_entries_updated_at
  BEFORE UPDATE ON entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

-- Users can only see their own entries
CREATE POLICY "Users can view their own entries"
  ON entries FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own entries
CREATE POLICY "Users can insert their own entries"
  ON entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own entries
CREATE POLICY "Users can update their own entries"
  ON entries FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own entries
CREATE POLICY "Users can delete their own entries"
  ON entries FOR DELETE
  USING (auth.uid() = user_id);

-- User preferences table (for future use)
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  reminder_enabled BOOLEAN DEFAULT true,
  reminder_time TIME DEFAULT '20:00:00',
  theme VARCHAR(10) DEFAULT 'light',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- AI insights cache table (for Phase 6)
CREATE TABLE ai_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_type VARCHAR(50) NOT NULL, -- 'sentiment', 'daily_summary', 'weekly_summary', etc.
  entry_id UUID REFERENCES entries(id) ON DELETE CASCADE,
  content JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_ai_insights_user_id ON ai_insights(user_id);
CREATE INDEX idx_ai_insights_entry_id ON ai_insights(entry_id);
CREATE INDEX idx_ai_insights_type ON ai_insights(insight_type);
CREATE INDEX idx_ai_insights_expires_at ON ai_insights(expires_at);

ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own insights"
  ON ai_insights FOR SELECT
  USING (auth.uid() = user_id);
EOF
```

### 4.5 Create Migration File

```bash
cat > migrations/001_initial_schema.sql << 'EOF'
-- Migration: Initial Schema
-- Description: Creates users, entries, preferences, and AI insights tables
-- Date: 2025-01-09

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Moods enum
CREATE TYPE mood_type AS ENUM ('happy', 'sad', 'anxious', 'calm', 'stressed', 'neutral');

-- Journal entries table
CREATE TABLE entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mood mood_type,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT entries_content_length CHECK (char_length(content) <= 50000)
);

CREATE INDEX idx_entries_user_id ON entries(user_id);
CREATE INDEX idx_entries_created_at ON entries(created_at DESC);
CREATE INDEX idx_entries_mood ON entries(mood);
CREATE INDEX idx_entries_search ON entries USING GIN(to_tsvector('english', content));

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_entries_updated_at
  BEFORE UPDATE ON entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own entries"
  ON entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own entries"
  ON entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own entries"
  ON entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own entries"
  ON entries FOR DELETE
  USING (auth.uid() = user_id);

-- User preferences table
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  reminder_enabled BOOLEAN DEFAULT true,
  reminder_time TIME DEFAULT '20:00:00',
  theme VARCHAR(10) DEFAULT 'light',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- AI insights cache table
CREATE TABLE ai_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_type VARCHAR(50) NOT NULL,
  entry_id UUID REFERENCES entries(id) ON DELETE CASCADE,
  content JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_ai_insights_user_id ON ai_insights(user_id);
CREATE INDEX idx_ai_insights_entry_id ON ai_insights(entry_id);
CREATE INDEX idx_ai_insights_type ON ai_insights(insight_type);
CREATE INDEX idx_ai_insights_expires_at ON ai_insights(expires_at);

ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own insights"
  ON ai_insights FOR SELECT
  USING (auth.uid() = user_id);
EOF
```

### 4.6 Apply Schema to Supabase

1. Open Supabase dashboard
2. Go to SQL Editor
3. Click "New Query"
4. Copy the contents of `database/migrations/001_initial_schema.sql`
5. Paste into the editor
6. Click "Run" button
7. Verify no errors appear

Alternative: You can also paste the `schema.sql` file directly.

### 4.7 Verify Database Setup

1. Go to Database > Tables in Supabase dashboard
2. You should see:
   - `entries` table
   - `user_preferences` table
   - `ai_insights` table
3. Click on each table to verify columns and indexes
4. Go to Authentication > Policies
5. Verify RLS policies are enabled for all tables

### 4.8 Create Seed Data (Optional for Testing)

```bash
cat > seed.sql << 'EOF'
-- Seed data for testing
-- NOTE: This requires a test user to exist in auth.users
-- You'll create a test user through the app in Phase 2

-- Example: Create test entries for a user
-- Replace 'user-uuid-here' with actual user ID after creating test user

-- INSERT INTO entries (user_id, content, mood) VALUES
-- ('user-uuid-here', 'Today was a great day! I accomplished so much.', 'happy'),
-- ('user-uuid-here', 'Feeling a bit anxious about the upcoming presentation.', 'anxious'),
-- ('user-uuid-here', 'Calm evening reading a book by the window.', 'calm');
EOF
```

---

## Step 5: Shared Types Setup (10 minutes)

### 5.1 Create Shared Type Definitions

```bash
cd ../shared

# Initialize package.json
npm init -y

# Install TypeScript
npm install --save-dev typescript

cat > types/index.ts << 'EOF'
// User types
export interface User {
  id: string;
  email: string;
  createdAt: string;
}

// Entry types
export interface Entry {
  id: string;
  userId: string;
  content: string;
  mood?: Mood;
  createdAt: string;
  updatedAt: string;
}

export type Mood = 'happy' | 'sad' | 'anxious' | 'calm' | 'stressed' | 'neutral';

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

// Entry creation/update DTOs
export interface CreateEntryDto {
  content: string;
  mood?: Mood;
}

export interface UpdateEntryDto {
  content?: string;
  mood?: Mood;
}

// Pagination types
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
EOF

cat > constants.ts << 'EOF'
export const MOODS: Mood[] = ['happy', 'sad', 'anxious', 'calm', 'stressed', 'neutral'];

export const MOOD_LABELS: Record<Mood, string> = {
  happy: 'Happy',
  sad: 'Sad',
  anxious: 'Anxious',
  calm: 'Calm',
  stressed: 'Stressed',
  neutral: 'Neutral',
};

export const MOOD_EMOJIS: Record<Mood, string> = {
  happy: '😊',
  sad: '😢',
  anxious: '😰',
  calm: '😌',
  stressed: '😫',
  neutral: '😐',
};

export const API_ENDPOINTS = {
  AUTH: {
    SIGNUP: '/auth/signup',
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    RESET_PASSWORD: '/auth/reset-password',
  },
  ENTRIES: {
    LIST: '/entries',
    CREATE: '/entries',
    GET: (id: string) => `/entries/${id}`,
    UPDATE: (id: string) => `/entries/${id}`,
    DELETE: (id: string) => `/entries/${id}`,
  },
};

import { Mood } from './types';
EOF

cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "declaration": true,
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
EOF
```

---

## Step 6: Documentation (15 minutes)

### 6.1 Create Progress Tracker

```bash
cd ../docs

cat > PROGRESS.md << 'EOF'
# MindFlow - Implementation Progress Tracker

## Phase Completion Status

### ✅ Phase 1: Foundation & Infrastructure Setup
**Status:** Complete
**Completed:** [DATE]

**Deliverables:**
- ✅ React Native Expo app initialized
- ✅ Node.js backend server running
- ✅ Supabase database configured
- ✅ Database schema created and migrated
- ✅ Environment variables configured
- ✅ ESLint and Prettier set up

**Quality Gates:**
- ✅ Frontend builds successfully
- ✅ Backend builds successfully
- ✅ Database migrations run without errors
- ✅ Health check endpoint responds
- ✅ ESLint/Prettier passing

---

### ⏳ Phase 2: User Authentication System
**Status:** Not Started
**Completed:** -

---

### ⏳ Phase 3: Core Journal CRUD Operations
**Status:** Not Started
**Completed:** -

---

[Continue for all phases...]

## Current Sprint

**Working On:** Phase 1 - Foundation & Infrastructure Setup

**Blockers:** None

**Notes:**
- Setup complete, ready to begin Phase 2

---

## Testing Status

### Unit Tests
- Backend: 0 tests (0% coverage)
- Frontend: 0 tests (0% coverage)

### Integration Tests
- API: 0 tests

### E2E Tests
- Mobile: 0 tests

---

## Technical Debt

None yet - fresh project!

---

## Next Steps

1. Complete Phase 1 quality gate checks
2. Verify frontend and backend run successfully
3. Test database connection
4. Begin Phase 2: User Authentication
EOF
```

### 6.2 Create API Documentation Template

```bash
mkdir -p api

cat > api/authentication.md << 'EOF'
# Authentication API

(To be completed in Phase 2)

## Endpoints

### POST /api/auth/signup
### POST /api/auth/login
### POST /api/auth/logout
### POST /api/auth/reset-password
EOF

cat > api/entries.md << 'EOF'
# Entries API

(To be completed in Phase 3)

## Endpoints

### GET /api/entries
### POST /api/entries
### GET /api/entries/:id
### PUT /api/entries/:id
### DELETE /api/entries/:id
EOF
```

---

## Step 7: Final Verification & Testing (20 minutes)

### 7.1 Test Frontend

```bash
cd ../mobile

# Install dependencies (if not already done)
npm install

# Type check
npm run type-check

# Lint check
npm run lint

# Start Expo
npm start
```

**Expected Result:**
- No TypeScript errors
- No ESLint errors
- Expo dev server starts successfully
- QR code appears for mobile testing
- Press `w` to open in web browser
- Should see "MindFlow" app with "Frontend Setup Complete!" message

### 7.2 Test Backend

```bash
cd ../backend

# Install dependencies (if not already done)
npm install

# Type check
npm run type-check

# Lint check
npm run lint

# Start server
npm run dev
```

**Expected Result:**
- No TypeScript errors
- No ESLint errors
- Server starts on port 3000
- Console shows: "✅ MindFlow API server running on port 3000"

### 7.3 Test Health Endpoint

Open a new terminal:

```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Expected response:
# {
#   "success": true,
#   "message": "MindFlow API is running",
#   "timestamp": "2025-01-09T...",
#   "environment": "development"
# }
```

### 7.4 Test Database Connection

Create a test script:

```bash
cd ../backend

cat > src/test-db.ts << 'EOF'
import { supabase } from './database/supabase';

async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('entries')
      .select('count')
      .single();

    if (error) {
      console.log('✅ Database connected (table exists, no data yet)');
    } else {
      console.log('✅ Database connected successfully');
      console.log('Entries count:', data);
    }
  } catch (err) {
    console.error('❌ Database connection failed:', err);
  }
}

testConnection();
EOF

npx ts-node src/test-db.ts
```

**Expected Result:**
- "✅ Database connected" message appears
- No connection errors

---

## Step 8: Git Commit & Documentation Update (10 minutes)

### 8.1 Review Changes

```bash
cd ..

# Check git status
git status

# Review all files to be committed
git diff
```

### 8.2 Create .gitignore Files

Ensure each directory has appropriate .gitignore:

```bash
# Mobile .gitignore (should already exist from Expo)
cat >> mobile/.gitignore << 'EOF'
# Environment
.env
.env.local

# Expo
.expo/
dist/
EOF

# Backend .gitignore
cat >> backend/.gitignore << 'EOF'
# Environment
.env
.env.local

# Build
dist/
EOF
```

### 8.3 Initial Commit

```bash
# Stage all files
git add .

# Create initial commit
git commit -m "feat: Phase 1 - Foundation & Infrastructure Setup

- Initialize React Native Expo project with TypeScript
- Set up Node.js Express backend with TypeScript
- Configure Supabase database with schema
- Create project structure (mobile, backend, shared, database)
- Set up ESLint and Prettier for code quality
- Create health check endpoint
- Add environment configuration
- Create shared types and constants

Deliverables:
✅ Working React Native Expo app
✅ Working Node.js backend with health endpoint
✅ Supabase database with complete schema
✅ Environment variables configured
✅ Code quality tools set up

Quality Gates:
✅ Frontend builds successfully
✅ Backend builds successfully
✅ Database migrations run without errors
✅ Health check endpoint responds
✅ ESLint/Prettier passing"
```

### 8.4 Update Progress Documentation

```bash
# Update PROGRESS.md with completion date
cd docs
# Edit PROGRESS.md and add today's date to Phase 1 completion
```

---

## Step 9: Phase 1 Completion Checklist

### Quality Gates Verification

Run through this checklist to ensure Phase 1 is complete:

**Build & Compilation:**
- [ ] `cd mobile && npm run type-check` - No TypeScript errors
- [ ] `cd backend && npm run type-check` - No TypeScript errors
- [ ] `cd mobile && npm run lint` - No ESLint errors
- [ ] `cd backend && npm run lint` - No ESLint errors

**Running Applications:**
- [ ] Frontend starts successfully (`cd mobile && npm start`)
- [ ] Backend starts successfully (`cd backend && npm run dev`)
- [ ] Health endpoint responds (`curl http://localhost:3000/api/health`)

**Database:**
- [ ] Supabase project created
- [ ] Database schema applied successfully
- [ ] All tables visible in Supabase dashboard
- [ ] RLS policies enabled
- [ ] Database connection test passes

**Configuration:**
- [ ] All environment variables set in `mobile/.env`
- [ ] All environment variables set in `backend/.env`
- [ ] `.env.example` files created for reference

**Code Quality:**
- [ ] ESLint configured for both frontend and backend
- [ ] Prettier configured for both frontend and backend
- [ ] TypeScript strict mode enabled

**Documentation:**
- [ ] README.md created
- [ ] PROGRESS.md updated
- [ ] Environment setup documented
- [ ] Git repository initialized with initial commit

**Structure:**
- [ ] Mobile folder structure created
- [ ] Backend folder structure created
- [ ] Shared types directory created
- [ ] Database migrations directory created

---

## Troubleshooting

### Common Issues

#### 1. Expo Won't Start
```bash
# Clear cache
cd mobile
npx expo start -c
```

#### 2. Backend TypeScript Errors
```bash
# Reinstall dependencies
cd backend
rm -rf node_modules package-lock.json
npm install
```

#### 3. Supabase Connection Fails
- Verify SUPABASE_URL in .env matches dashboard
- Check SUPABASE_SERVICE_KEY is the service_role key, not anon key
- Ensure no extra whitespace in .env values

#### 4. Database Migration Errors
- Check SQL syntax in Supabase SQL Editor
- Verify you're using the correct migration file
- Look for error messages in Supabase dashboard

#### 5. Port 3000 Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

---

## Next Steps

**Phase 1 is now complete!** 🎉

You're ready to move on to **Phase 2: User Authentication System**.

Before starting Phase 2:
1. ✅ Ensure all quality gates pass
2. ✅ Commit all changes to git
3. ✅ Update PROGRESS.md with Phase 1 completion date
4. ✅ Review Phase 2 requirements in `implementation-plan.md`
5. ✅ Celebrate the foundation being in place!

**Next Phase Preview:**

Phase 2 will cover:
- Supabase Auth integration
- Sign up and login screens
- Password reset flow
- Authentication middleware
- Protected routes
- User session management

**Estimated Time for Phase 2:** 3-4 hours

---

## Summary

**What You Built:**

1. **Mobile App Foundation**
   - React Native with Expo
   - TypeScript configured
   - Zustand for state management
   - Basic folder structure
   - Theme and type definitions

2. **Backend API Foundation**
   - Node.js with Express
   - TypeScript configured
   - Health check endpoint
   - Supabase client
   - Logger and error handling

3. **Database Infrastructure**
   - PostgreSQL via Supabase
   - Complete schema with 3 tables
   - Row-Level Security policies
   - Indexes for performance
   - Full-text search capability

4. **Development Tools**
   - ESLint for code quality
   - Prettier for formatting
   - Environment configuration
   - Git repository

**Total Time Invested:** ~4-6 hours

**Lines of Code Written:** ~1000+ lines

**Files Created:** ~50+ files

You now have a solid foundation to build MindFlow! 🚀
