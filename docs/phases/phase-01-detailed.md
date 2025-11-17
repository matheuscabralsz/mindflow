# Phase 1: Ionic + React Mobile App Setup - Detailed Implementation Guide

## Overview

**Goal:** Set up an Ionic + React mobile app with TypeScript, Capacitor for native capabilities, and full web/mobile support.

**Time Estimate:** 45-60 minutes

**Prerequisites:**
- Node.js 22+ (LTS) installed
- Code editor (VS Code recommended)
- iOS Simulator (Mac) and/or Android Studio (for native testing)
- Chrome browser (for web testing)

**What You'll Have At The End:**
- Ionic + React app running in browser
- TypeScript configured
- Capacitor configured for iOS and Android
- Theme and routing set up
- Environment configuration
- Code quality tools ready

---

## Step 1: Initialize Ionic Project (10 minutes)

### 1.1 Create Ionic App

```bash
# Navigate to mobile directory
cd mobile

# Create Ionic app with React and TypeScript
npm create @ionic/app -- . -- --type=react --template=blank --capacitor --package-id=com.mindflow.app

# If prompted:
# - App name: MindFlow
# - Type: react
# - Template: blank
# - Capacitor: Yes
```

**Alternative (explicit install):**

```bash
# Install Ionic CLI globally
npm install -g @ionic/cli

# Create app interactively
ionic start . blank --type=react --capacitor --package-id=com.mindflow.app
```

### 1.2 Install Latest Dependencies

```bash
# Core dependencies
npm install

# Latest Ionic packages
npm install @ionic/react@latest @ionic/react-router@latest ionic-react@latest

# Capacitor for native functionality
npm install @capacitor/core@latest @capacitor/cli@latest @capacitor/ios@latest @capacitor/android@latest

# State management
npm install zustand

# API client
npm install axios

# Supabase client
npm install @supabase/supabase-js@latest

# Date handling
npm install date-fns

# Form handling
npm install react-hook-form zod @hookform/resolvers
```

### 1.3 Install Development Dependencies

```bash
npm install --save-dev \
  @types/react@latest \
  @types/react-dom@latest \
  @types/node@latest \
  typescript@latest \
  vite@latest \
  eslint@latest \
  prettier@latest \
  eslint-config-prettier@latest \
  eslint-plugin-react@latest \
  eslint-plugin-react-hooks@latest \
  @typescript-eslint/eslint-plugin@latest \
  @typescript-eslint/parser@latest \
  @vitejs/plugin-react@latest
```

---

## Step 2: Configure TypeScript (5 minutes)

### 2.1 Update tsconfig.json

```bash
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
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

    /* Path mapping */
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@pages/*": ["src/pages/*"],
      "@services/*": ["src/services/*"],
      "@store/*": ["src/store/*"],
      "@utils/*": ["src/utils/*"],
      "@theme/*": ["src/theme/*"],
      "@types/*": ["src/types/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
EOF
```

### 2.2 Create tsconfig.node.json

```bash
cat > tsconfig.node.json << 'EOF'
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts", "capacitor.config.ts"]
}
EOF
```

---

## Step 3: Create Project Structure (5 minutes)

### 3.1 Create Folder Structure

```bash
# Remove default structure
rm -rf src/pages src/components 2>/dev/null

# Create new structure
mkdir -p src/pages/auth
mkdir -p src/pages/entries
mkdir -p src/pages/insights
mkdir -p src/pages/settings
mkdir -p src/pages/onboarding
mkdir -p src/components/common
mkdir -p src/components/entries
mkdir -p src/components/insights
mkdir -p src/components/layout
mkdir -p src/services
mkdir -p src/store
mkdir -p src/utils
mkdir -p src/hooks
mkdir -p src/types
mkdir -p src/theme
mkdir -p public/assets
```

---

## Step 4: Configure Vite (5 minutes)

### 4.1 Update vite.config.ts

```bash
cat > vite.config.ts << 'EOF'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@services': path.resolve(__dirname, './src/services'),
      '@store': path.resolve(__dirname, './src/store'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@theme': path.resolve(__dirname, './src/theme'),
      '@types': path.resolve(__dirname, './src/types'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
EOF
```

---

## Step 5: Configure ESLint & Prettier (5 minutes)

### 5.1 Create ESLint Config

```bash
cat > .eslintrc.cjs << 'EOF'
module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['react', '@typescript-eslint', 'react-hooks'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
};
EOF
```

### 5.2 Create Prettier Config

```bash
cat > .prettierrc << 'EOF'
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always",
  "endOfLine": "lf"
}
EOF
```

---

## Step 6: Create Theme (10 minutes)

### 6.1 Create Custom Theme Colors

```bash
cat > src/theme/colors.ts << 'EOF'
export const colors = {
  primary: '#6366F1',
  primaryShade: '#4F46E5',
  primaryTint: '#818CF8',

  secondary: '#8B5CF6',
  secondaryShade: '#7C3AED',
  secondaryTint: '#A78BFA',

  tertiary: '#06B6D4',
  tertiaryShade: '#0891B2',
  tertiaryTint: '#22D3EE',

  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',

  light: '#F9FAFB',
  medium: '#9CA3AF',
  dark: '#1F2937',

  // Custom app colors
  background: '#FFFFFF',
  surface: '#F3F4F6',
  text: '#1F2937',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
};

export const darkColors = {
  primary: '#818CF8',
  primaryShade: '#6366F1',
  primaryTint: '#A5B4FC',

  secondary: '#A78BFA',
  secondaryShade: '#8B5CF6',
  secondaryTint: '#C4B5FD',

  tertiary: '#22D3EE',
  tertiaryShade: '#06B6D4',
  tertiaryTint: '#67E8F9',

  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',

  light: '#1F2937',
  medium: '#6B7280',
  dark: '#F9FAFB',

  background: '#111827',
  surface: '#1F2937',
  text: '#F9FAFB',
  textSecondary: '#D1D5DB',
  border: '#374151',
};
EOF
```

### 6.2 Create Ionic Theme Variables

```bash
cat > src/theme/variables.css << 'EOF'
:root {
  /* Primary */
  --ion-color-primary: #6366F1;
  --ion-color-primary-rgb: 99, 102, 241;
  --ion-color-primary-contrast: #ffffff;
  --ion-color-primary-contrast-rgb: 255, 255, 255;
  --ion-color-primary-shade: #4F46E5;
  --ion-color-primary-tint: #818CF8;

  /* Secondary */
  --ion-color-secondary: #8B5CF6;
  --ion-color-secondary-rgb: 139, 92, 246;
  --ion-color-secondary-contrast: #ffffff;
  --ion-color-secondary-contrast-rgb: 255, 255, 255;
  --ion-color-secondary-shade: #7C3AED;
  --ion-color-secondary-tint: #A78BFA;

  /* Success */
  --ion-color-success: #10B981;
  --ion-color-success-rgb: 16, 185, 129;
  --ion-color-success-contrast: #ffffff;
  --ion-color-success-contrast-rgb: 255, 255, 255;
  --ion-color-success-shade: #059669;
  --ion-color-success-tint: #34D399;

  /* Warning */
  --ion-color-warning: #F59E0B;
  --ion-color-warning-rgb: 245, 158, 11;
  --ion-color-warning-contrast: #000000;
  --ion-color-warning-contrast-rgb: 0, 0, 0;
  --ion-color-warning-shade: #D97706;
  --ion-color-warning-tint: #FBBF24;

  /* Danger */
  --ion-color-danger: #EF4444;
  --ion-color-danger-rgb: 239, 68, 68;
  --ion-color-danger-contrast: #ffffff;
  --ion-color-danger-contrast-rgb: 255, 255, 255;
  --ion-color-danger-shade: #DC2626;
  --ion-color-danger-tint: #F87171;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  :root {
    --ion-color-primary: #818CF8;
    --ion-color-primary-shade: #6366F1;
    --ion-color-primary-tint: #A5B4FC;

    --ion-background-color: #111827;
    --ion-background-color-rgb: 17, 24, 39;
    --ion-text-color: #F9FAFB;
    --ion-text-color-rgb: 249, 250, 251;
  }
}
EOF
```

### 6.3 Create Typography

```bash
cat > src/theme/typography.ts << 'EOF'
export const typography = {
  h1: {
    fontSize: '32px',
    fontWeight: '700',
    lineHeight: '40px',
  },
  h2: {
    fontSize: '24px',
    fontWeight: '600',
    lineHeight: '32px',
  },
  h3: {
    fontSize: '20px',
    fontWeight: '600',
    lineHeight: '28px',
  },
  h4: {
    fontSize: '18px',
    fontWeight: '600',
    lineHeight: '26px',
  },
  body: {
    fontSize: '16px',
    fontWeight: '400',
    lineHeight: '24px',
  },
  caption: {
    fontSize: '14px',
    fontWeight: '400',
    lineHeight: '20px',
  },
  small: {
    fontSize: '12px',
    fontWeight: '400',
    lineHeight: '16px',
  },
};
EOF
```

### 6.4 Create Theme Index

```bash
cat > src/theme/index.ts << 'EOF'
export * from './colors';
export * from './typography';

import './variables.css';
EOF
```

---

## Step 7: Create Types (5 minutes)

### 7.1 Create Base Types

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
  code?: string;
}

export interface CreateEntryDto {
  content: string;
  mood?: Mood;
}

export interface UpdateEntryDto {
  content?: string;
  mood?: Mood;
}
EOF
```

---

## Step 8: Environment Configuration (5 minutes)

### 8.1 Create Environment Files

```bash
cat > .env.example << 'EOF'
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
EOF

# Copy to actual .env
cp .env.example .env
```

### 8.2 Create Environment Config Module

```bash
cat > src/config/env.ts << 'EOF'
export const env = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  },
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};
EOF
```

---

## Step 9: Create App Structure (10 minutes)

### 9.1 Create Home Page

```bash
cat > src/pages/Home.tsx << 'EOF'
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonButton,
  IonIcon,
} from '@ionic/react';
import { checkmarkCircle } from 'ionicons/icons';

const Home: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>MindFlow</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Welcome to MindFlow</IonCardTitle>
            <IonCardSubtitle>AI-Powered Journal App</IonCardSubtitle>
          </IonCardHeader>
          <IonCardContent>
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <IonIcon
                icon={checkmarkCircle}
                style={{ fontSize: '64px', color: '#10B981' }}
              />
              <h2>Ionic + React Setup Complete!</h2>
              <p>Your mobile app is ready to build.</p>
              <IonButton expand="block" color="primary" style={{ marginTop: '20px' }}>
                Get Started
              </IonButton>
            </div>
          </IonCardContent>
        </IonCard>

        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Tech Stack</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <ul style={{ lineHeight: '1.8' }}>
              <li>⚛️ React 18</li>
              <li>⚡ Ionic 8</li>
              <li>📱 Capacitor 6</li>
              <li>🎨 TypeScript</li>
              <li>🔥 Vite</li>
              <li>🐻 Zustand</li>
            </ul>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default Home;
EOF
```

### 9.2 Update App Component

```bash
cat > src/App.tsx << 'EOF'
import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';

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

/* Theme */
import './theme';

/* Pages */
import Home from './pages/Home';

setupIonicReact();

const App: React.FC = () => (
  <IonApp>
    <IonReactRouter>
      <IonRouterOutlet>
        <Route exact path="/home">
          <Home />
        </Route>
        <Route exact path="/">
          <Redirect to="/home" />
        </Route>
      </IonRouterOutlet>
    </IonReactRouter>
  </IonApp>
);

export default App;
EOF
```

### 9.3 Update Main Entry Point

```bash
cat > src/main.tsx << 'EOF'
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
EOF
```

---

## Step 10: Configure Capacitor (5 minutes)

### 10.1 Update capacitor.config.ts

```bash
cat > capacitor.config.ts << 'EOF'
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mindflow.app',
  appName: 'MindFlow',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#6366F1',
      showSpinner: false,
    },
  },
};

export default config;
EOF
```

---

## Step 11: Update package.json Scripts (5 minutes)

### 11.1 Add Scripts

```bash
npm pkg set scripts.dev="vite"
npm pkg set scripts.build="tsc && vite build"
npm pkg set scripts.preview="vite preview"
npm pkg set scripts.lint="eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0"
npm pkg set scripts.type-check="tsc --noEmit"
npm pkg set scripts.format="prettier --write \"src/**/*.{ts,tsx,css}\""

# Ionic/Capacitor scripts
npm pkg set scripts.ionic:serve="ionic serve"
npm pkg set scripts.ionic:build="ionic build"

# Capacitor scripts
npm pkg set scripts.cap:sync="cap sync"
npm pkg set scripts.cap:add:ios="cap add ios"
npm pkg set scripts.cap:add:android="cap add android"
npm pkg set scripts.cap:open:ios="cap open ios"
npm pkg set scripts.cap:open:android="cap open android"
npm pkg set scripts.cap:run:ios="cap run ios"
npm pkg set scripts.cap:run:android="cap run android"
```

---

## Step 12: Final Verification (5 minutes)

### 12.1 Install Dependencies

```bash
npm install
```

### 12.2 Type Check

```bash
npm run type-check
```

Expected: No TypeScript errors

### 12.3 Lint Check

```bash
npm run lint
```

Expected: No ESLint errors (or only warnings)

### 12.4 Start Development Server

```bash
npm run dev
```

Expected:
- Vite dev server starts
- Browser opens automatically at `http://localhost:3000`
- You see "MindFlow" app with setup completion message

### 12.5 Build Test

```bash
npm run build
```

Expected:
- Build completes successfully
- `dist/` directory created with production build

---

## Step 13: Add Native Platforms (Optional)

### 13.1 Add iOS (Mac only)

```bash
npm run cap:add:ios
npm run cap:sync
```

### 13.2 Add Android

```bash
npm run cap:add:android
npm run cap:sync
```

---

## Phase 1 Completion Checklist

### Quality Gates

- [ ] TypeScript compiles without errors (`npm run type-check`)
- [ ] ESLint passes (`npm run lint`)
- [ ] Development server starts (`npm run dev`)
- [ ] App displays correctly in browser
- [ ] Production build succeeds (`npm run build`)
- [ ] Environment variables configured
- [ ] Theme applied correctly
- [ ] Routing works

### Deliverables

- [ ] Ionic + React app initialized
- [ ] TypeScript configured with strict mode
- [ ] Vite build tool configured
- [ ] ESLint and Prettier set up
- [ ] Project structure created
- [ ] Theme and styling configured
- [ ] Environment configuration
- [ ] Home page working
- [ ] Capacitor configured

---

## Summary

**What You Built:**

1. **Mobile App Foundation**
   - Ionic 8 with React 18
   - TypeScript with strict mode
   - Vite for fast development
   - Capacitor 6 for native capabilities

2. **Development Tools**
   - ESLint for code quality
   - Prettier for formatting
   - Path aliases for imports
   - Environment configuration

3. **Project Structure**
   - Organized folder structure
   - Custom theme with dark mode
   - Type definitions
   - Routing configured

**Total Time:** ~45-60 minutes

**Next Steps:**
- Phase 2: Backend integration
- Phase 3: Supabase authentication
- Phase 4: Journal entry features

You now have a modern Ionic + React foundation ready to build MindFlow! 🚀
