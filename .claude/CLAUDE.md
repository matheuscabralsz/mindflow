# MindFlow - Project Implementation Guide

## Repository Purpose

**MindFlow** is an AI-powered journaling application that helps users write daily journal entries, track moods, and receive AI-generated insights about their writing patterns. The app solves the problem of journaling without reflection by surfacing patterns users would never notice manually.

### Main Goals
- Enable users to create and manage journal entries with mood tracking
- Provide AI-generated sentiment analysis and insights on journal content
- Offer search and filtering capabilities to find past entries
- Deliver a mobile-first, secure, and user-friendly experience
- Help users understand their emotional patterns over time

---

## Project Structure

This is a monorepo containing both the mobile frontend and backend API.

```
mindflow/
├── .claude/                   # Claude Code project guidance
│   └── CLAUDE.md              # This file
├── docs/                      # Project documentation
│   ├── initial-idea.md        # Original project concept
│   ├── planning.md            # High-level implementation plan
│   └── PROGRESS.md            # Current implementation progress
├── mobile/                    # React Native mobile app (Expo)
│   ├── app/                   # Expo Router screens
│   ├── components/            # Reusable UI components
│   ├── store/                 # Zustand state management
│   ├── services/              # API client and external services
│   ├── utils/                 # Helpers, constants, theme
│   ├── assets/                # Images, fonts, icons
│   ├── app.json               # Expo configuration
│   ├── package.json           # Frontend dependencies
│   └── .env.example           # Environment variables template
├── backend/                   # Node.js API server
│   ├── src/
│   │   ├── routes/            # API endpoint definitions
│   │   ├── controllers/       # Request handlers and business logic
│   │   ├── middleware/        # Auth, validation, error handling
│   │   ├── services/          # External service integrations
│   │   │   ├── supabase.service.js
│   │   │   └── openai.service.js
│   │   ├── utils/            # Helper functions
│   │   └── server.js         # Express/Fastify app entry point
│   ├── migrations/           # Database migration scripts
│   ├── tests/                # Unit and integration tests
│   ├── package.json          # Backend dependencies
│   └── .env.example          # Environment variables template
├── .gitignore
├── README.md                 # Project setup and overview
└── package.json              # Root package.json (monorepo scripts)
```

---

## Technology Stack

### Frontend (Mobile)
- **Framework:** React Native with Expo SDK 50+
- **Language:** JavaScript/TypeScript (TypeScript preferred for type safety)
- **State Management:** Zustand (lightweight, simple API)
- **Navigation:** React Navigation v6 (stack and tab navigators)
- **HTTP Client:** Axios (with interceptors for auth)
- **Storage:** Expo SecureStore (for JWT tokens) and AsyncStorage (for drafts)
- **UI Components:** React Native core components + custom components
- **Styling:** StyleSheet API with centralized theme
- **Build/Deployment:** Expo EAS (build service)

### Backend (API)
- **Runtime:** Node.js 18+ LTS
- **Framework:** Express.js or Fastify (Fastify preferred for performance)
- **Language:** JavaScript (ES6+) or TypeScript
- **Authentication:** JWT tokens via Supabase Auth
- **Validation:** Joi or Zod for request validation
- **Logging:** Winston or Pino (structured logging)
- **Testing:** Jest (unit tests) + Supertest (integration tests)
- **Deployment:** Railway

### Database & Services
- **Primary Database:** PostgreSQL 15+ (via Supabase)
- **Authentication:** Supabase Auth (email/password)
- **Storage:** Supabase Storage (future: images, voice notes)
- **AI Processing:** OpenAI API (GPT-4 or GPT-3.5-turbo)
- **Row-Level Security:** PostgreSQL RLS policies via Supabase

### Development Tools
- **Version Control:** Git + GitHub
- **Package Manager:** npm or yarn
- **Code Formatting:** Prettier
- **Linting:** ESLint (Airbnb or Standard style)
- **API Testing:** Postman or Insomnia
- **Environment Variables:** dotenv (.env files)

---

## Development Workflow

### Initial Setup (Phase 1)

1. **Install Development Tools:**
   ```bash
   # Install Node.js 18+ LTS
   node --version  # Verify installation

   # Install Expo CLI globally
   npm install -g expo-cli
   expo --version  # Verify installation

   # Install EAS CLI for builds
   npm install -g eas-cli
   ```

2. **Create Third-Party Accounts:**
   - Supabase: https://supabase.com (create project)
   - OpenAI: https://platform.openai.com (get API key)
   - Railway: https://railway.app (for backend deployment)
   - Expo: https://expo.dev (for app builds)

3. **Clone Repository and Install Dependencies:**
   ```bash
   cd mindflow

   # Backend setup
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your API keys

   # Frontend setup
   cd ../mobile
   npm install
   cp .env.example .env
   # Edit .env with backend API URL
   ```

### Running the Project

**Backend (API Server):**
```bash
cd backend
npm run dev          # Development mode with hot reload
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
npm run lint         # Run ESLint
npm run build        # Build for production (if using TypeScript)
npm start            # Start production server
```

**Frontend (Mobile App):**
```bash
cd mobile
expo start           # Start development server
expo start --ios     # Open iOS simulator
expo start --android # Open Android emulator
npm test             # Run component tests
npm run lint         # Run ESLint
```

### Testing Approach

**Backend Testing:**
- **Unit Tests:** Test individual functions and services (controllers, OpenAI service, etc.)
- **Integration Tests:** Test API endpoints end-to-end with test database
- **Coverage Target:** 70%+ code coverage
- **Test Structure:**
  ```
  backend/tests/
  ├── unit/
  │   ├── controllers/
  │   └── services/
  └── integration/
      └── api/
  ```

**Frontend Testing:**
- **Component Tests:** Test React components with React Testing Library
- **Navigation Tests:** Verify screen transitions and route protection
- **State Management Tests:** Test Zustand stores
- **E2E Tests (Optional):** Detox or Maestro for full user flows

**Test Example (Backend):**
```javascript
// backend/tests/integration/api/entries.test.js
describe('POST /api/entries', () => {
  it('should create a new journal entry', async () => {
    const response = await request(app)
      .post('/api/entries')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ content: 'Test entry', mood: 'happy' });

    expect(response.status).toBe(201);
    expect(response.body.content).toBe('Test entry');
  });
});
```

### Quality Gates (Before Moving to Next Phase)

Every phase must pass these quality gates:

1. **Tests Pass:**
   - All unit tests passing
   - All integration tests passing (if applicable)
   - No failing assertions

2. **Build Succeeds:**
   - Backend: `npm run build` (if TypeScript) or `npm start` runs without errors
   - Frontend: `expo start` runs without errors
   - No compilation or runtime errors

3. **Code Quality:**
   - ESLint passing with no errors
   - Prettier formatting applied
   - No console warnings in production builds

4. **Functionality:**
   - All deliverables from the phase completed
   - Manual testing confirms features work as expected
   - Edge cases handled (empty states, errors, loading)

5. **Security (where applicable):**
   - Authentication working correctly
   - RLS policies enforced
   - No API keys or secrets in code
   - Input validation in place

---

## Implementation Phases

Refer to `docs/planning.md` for the complete 12-phase implementation plan. Track progress in `docs/PROGRESS.md`.

### Phase Order and Dependencies

**Start Immediately:**
- Phase 1: Development Environment Setup
- Phase 5: Mobile Frontend Foundation (after Phase 1)

**Critical Path:**
Phase 1 → 2 → 3 → 6 → 7 → 11 → 12

**Parallel Work Opportunities:**
- Phases 2-4 (Backend/Database/AI) can be developed while Phase 5 (Frontend Foundation) is in progress
- Phase 5 only depends on Phase 1, so frontend work can start early

**Key Milestones:**
1. Phase 2 complete = Database ready
2. Phase 3 complete = API ready for frontend integration
3. Phase 6 complete = Users can authenticate
4. Phase 7 complete = Core journaling features work
5. Phase 9 complete = AI features active
6. Phase 12 complete = MVP deployed to production

---

## Coding Conventions

### General Principles
- **KISS:** Keep It Simple, Stupid - prefer simple solutions
- **DRY:** Don't Repeat Yourself - extract reusable logic
- **YAGNI:** You Aren't Gonna Need It - don't over-engineer
- **Test-Driven Development:** Write tests for critical functionality
- **Security First:** Never trust user input, always validate

### JavaScript/TypeScript Style

**Naming Conventions:**
- Files: `camelCase.js` or `kebab-case.js` (be consistent)
- Components: `PascalCase.jsx` (e.g., `EntryListScreen.jsx`)
- Functions/variables: `camelCase` (e.g., `getUserEntries`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `API_BASE_URL`)
- Private functions: prefix with `_` (e.g., `_formatDate`)

**Code Structure:**
```javascript
// 1. Imports (grouped: external, internal, relative)
import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { fetchEntries } from '../services/api';
import { Button } from '../components';
import styles from './styles';

// 2. Constants
const MAX_ENTRIES_PER_PAGE = 20;

// 3. Component definition
const EntryListScreen = () => {
  // 3a. Hooks
  const navigation = useNavigation();
  const [entries, setEntries] = useState([]);

  // 3b. Effects
  useEffect(() => {
    loadEntries();
  }, []);

  // 3c. Functions
  const loadEntries = async () => {
    // Implementation
  };

  // 3d. Render
  return (
    <View style={styles.container}>
      {/* JSX */}
    </View>
  );
};

// 4. Exports
export default EntryListScreen;
```

**Async/Await (Preferred over Promises):**
```javascript
// Good
const createEntry = async (content) => {
  try {
    const response = await api.post('/entries', { content });
    return response.data;
  } catch (error) {
    console.error('Failed to create entry:', error);
    throw error;
  }
};

// Avoid (unless chaining multiple operations)
const createEntry = (content) => {
  return api.post('/entries', { content })
    .then(response => response.data)
    .catch(error => {
      console.error('Failed to create entry:', error);
      throw error;
    });
};
```

**Error Handling:**
```javascript
// Backend (Express/Fastify)
app.post('/api/entries', async (req, res, next) => {
  try {
    const entry = await createEntry(req.body);
    res.status(201).json(entry);
  } catch (error) {
    next(error); // Pass to error handling middleware
  }
});

// Frontend (React Native)
const handleCreateEntry = async () => {
  setLoading(true);
  try {
    const entry = await api.createEntry(content);
    navigation.navigate('EntryList');
  } catch (error) {
    Alert.alert('Error', 'Failed to create entry. Please try again.');
  } finally {
    setLoading(false);
  }
};
```

### React Native Best Practices

**Component Organization:**
- Prefer functional components with hooks over class components
- Keep components small and focused (single responsibility)
- Extract reusable logic into custom hooks
- Use `memo()` for expensive components that don't need frequent re-renders

**State Management (Zustand):**
```javascript
// store/authStore.js
import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  token: null,

  setAuth: (user, token) => set({ user, token }),
  logout: () => set({ user: null, token: null }),
}));

// Usage in component
import { useAuthStore } from '../store/authStore';

const MyComponent = () => {
  const { user, logout } = useAuthStore();
  // ...
};
```

**Styling:**
- Use StyleSheet.create for performance
- Centralize theme values (colors, fonts, spacing)
- Prefer Flexbox for layouts
- Use Platform-specific styles when needed

```javascript
// utils/theme.js
export const colors = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  background: '#ffffff',
  text: '#1f2937',
  error: '#ef4444',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

// components/MyComponent.jsx
import { StyleSheet } from 'react-native';
import { colors, spacing } from '../utils/theme';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: colors.background,
  },
});
```

### Backend (Express/Fastify) Best Practices

**Project Structure:**
```
backend/src/
├── routes/
│   ├── index.js           # Route aggregator
│   ├── auth.routes.js     # Authentication routes
│   └── entries.routes.js  # Journal entry routes
├── controllers/
│   ├── auth.controller.js
│   └── entries.controller.js
├── middleware/
│   ├── auth.middleware.js      # JWT verification
│   ├── validate.middleware.js  # Request validation
│   └── error.middleware.js     # Global error handler
├── services/
│   ├── supabase.service.js
│   └── openai.service.js
└── server.js
```

**Controller Pattern:**
```javascript
// controllers/entries.controller.js
const { supabaseClient } = require('../services/supabase.service');

const createEntry = async (req, res, next) => {
  try {
    const { content, mood } = req.body;
    const userId = req.user.id; // From auth middleware

    const { data, error } = await supabaseClient
      .from('entries')
      .insert({ user_id: userId, content, mood })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

module.exports = { createEntry };
```

**Middleware Pattern:**
```javascript
// middleware/auth.middleware.js
const { verifyToken } = require('../services/supabase.service');

const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing token' });
    }

    const token = authHeader.substring(7);
    const user = await verifyToken(token);
    req.user = user; // Attach user to request
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = { authenticateUser };
```

**Route Definition:**
```javascript
// routes/entries.routes.js
const express = require('express');
const { authenticateUser } = require('../middleware/auth.middleware');
const { createEntry, getEntries } = require('../controllers/entries.controller');

const router = express.Router();

router.use(authenticateUser); // Protect all routes

router.post('/', createEntry);
router.get('/', getEntries);

module.exports = router;
```

### Database (Supabase/PostgreSQL)

**Migration Structure:**
```sql
-- migrations/001_create_entries_table.sql
CREATE TABLE entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_entries_user_id ON entries(user_id);
CREATE INDEX idx_entries_created_at ON entries(created_at DESC);

-- Full-text search index
CREATE INDEX idx_entries_content_fts ON entries USING GIN(to_tsvector('english', content));

-- Row-level security
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own entries
CREATE POLICY entries_select_policy ON entries
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can only insert their own entries
CREATE POLICY entries_insert_policy ON entries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own entries
CREATE POLICY entries_update_policy ON entries
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can only delete their own entries
CREATE POLICY entries_delete_policy ON entries
  FOR DELETE
  USING (auth.uid() = user_id);
```

**Naming Conventions:**
- Tables: `snake_case`, plural (e.g., `entries`, `moods`)
- Columns: `snake_case` (e.g., `user_id`, `created_at`)
- Indexes: `idx_{table}_{column(s)}` (e.g., `idx_entries_user_id`)
- Policies: `{table}_{operation}_policy` (e.g., `entries_select_policy`)

---

## File Organization

### Where to Put Files

**Mobile App:**
- **Screens:** `mobile/app/` (Expo Router) or `mobile/screens/`
  - One file per screen (e.g., `LoginScreen.jsx`, `EntryListScreen.jsx`)
- **Reusable Components:** `mobile/components/`
  - Group by feature (e.g., `components/entry/EntryCard.jsx`)
  - Or by type (e.g., `components/buttons/PrimaryButton.jsx`)
- **State Stores:** `mobile/store/`
  - One file per store (e.g., `authStore.js`, `entriesStore.js`)
- **API Client:** `mobile/services/`
  - `api.js` (main API client with Axios)
  - Feature-specific services (e.g., `entriesService.js`)
- **Utilities:** `mobile/utils/`
  - Theme, constants, helpers, formatters
- **Assets:** `mobile/assets/`
  - Images, fonts, icons

**Backend API:**
- **Routes:** `backend/src/routes/`
  - One file per resource (e.g., `entries.routes.js`)
- **Controllers:** `backend/src/controllers/`
  - One file per resource (e.g., `entries.controller.js`)
- **Middleware:** `backend/src/middleware/`
  - Named by purpose (e.g., `auth.middleware.js`, `validate.middleware.js`)
- **Services:** `backend/src/services/`
  - External integrations (e.g., `openai.service.js`, `supabase.service.js`)
- **Database Migrations:** `backend/migrations/`
  - Numbered and dated (e.g., `001_create_entries_table.sql`)
- **Tests:** `backend/tests/`
  - Mirror src/ structure (e.g., `tests/unit/controllers/entries.controller.test.js`)

**Documentation:**
- **Project Docs:** `docs/`
  - Planning, architecture, API docs
- **README:** Root `README.md` (setup instructions, overview)
- **This File:** `.claude/CLAUDE.md` (guidance for Claude Code)

---

## Important Principles

### Security
1. **Never commit secrets:** Use .env files and add them to .gitignore
2. **Validate all input:** Never trust user input (SQL injection, XSS)
3. **Use HTTPS:** Always use HTTPS in production (Railway provides this)
4. **Row-Level Security:** Enforce RLS policies on all Supabase tables
5. **Rate limiting:** Prevent API abuse with rate limits
6. **Secure token storage:** Use Expo SecureStore for JWT tokens, never AsyncStorage
7. **No sensitive data in logs:** Don't log tokens, passwords, or personal information

### Performance
1. **Lazy loading:** Load data as needed, not all at once
2. **Pagination:** Paginate large lists (entries list)
3. **Debouncing:** Debounce search inputs to reduce API calls
4. **Caching:** Cache AI analysis results to avoid redundant OpenAI calls
5. **Optimistic updates:** Update UI immediately, sync with server in background
6. **Image optimization:** Compress images before upload (future feature)

### User Experience
1. **Loading states:** Always show loading indicators for async operations
2. **Error messages:** Provide helpful, user-friendly error messages
3. **Offline support:** Save drafts locally, sync when online
4. **Empty states:** Design for empty screens ("No entries yet, start writing!")
5. **Confirmation dialogs:** Confirm destructive actions (delete entry)
6. **Accessibility:** Use proper labels, contrast, and touch targets

### AI Integration
1. **Server-side processing:** AI analysis happens in the backend, not on the client
2. **Cost awareness:** OpenAI API costs money; cache results and use rate limiting
3. **Graceful degradation:** App should work even if OpenAI API is down (show cached results or skip AI features)
4. **Privacy:** Inform users that entries are processed by OpenAI (in privacy policy)
5. **Prompt engineering:** Carefully design prompts for consistent, helpful outputs

### Code Quality
1. **Write tests:** Aim for 70%+ coverage on critical paths
2. **Code reviews:** Review your own code before committing
3. **Consistent formatting:** Use Prettier and ESLint
4. **Meaningful names:** Use descriptive variable and function names
5. **Comments:** Comment complex logic, but prefer self-documenting code
6. **Git commits:** Use clear, descriptive commit messages (e.g., "Add entry deletion with confirmation dialog")

---

## Next Steps

1. **Review Planning:** Read `docs/planning.md` to understand all 12 phases
2. **Start Phase 1:** Set up development environment (tools, accounts, API keys)
3. **Track Progress:** Update `docs/PROGRESS.md` as you complete tasks
4. **Follow Quality Gates:** Don't skip to the next phase until current phase passes all quality gates
5. **Test Frequently:** Run tests after every significant change
6. **Ask for Help:** If blocked, review docs or ask for clarification

---

## References

- **Expo Docs:** https://docs.expo.dev
- **React Navigation:** https://reactnavigation.org
- **Zustand:** https://docs.pmnd.rs/zustand
- **Supabase Docs:** https://supabase.com/docs
- **OpenAI API:** https://platform.openai.com/docs
- **Fastify Docs:** https://www.fastify.io/docs
- **Railway Docs:** https://docs.railway.app

---

**Last Updated:** 2025-11-02
