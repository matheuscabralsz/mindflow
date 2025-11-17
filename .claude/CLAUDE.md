# MindFlow - AI-Powered Journal App

## Repository Purpose

MindFlow is an AI-powered mobile journal app that helps users write daily journal entries, track moods, and receive AI-generated insights about their writing patterns.

**Core Problems Solved:**
1. **Making Past Entries Useful:** Traditional journaling means writing 365 entries per year but never looking back. MindFlow uses AI to surface patterns like "Show me how I've changed this year" or "When did I last feel this way?"
2. **Overcoming Writer's Block:** Smart prompts, writing reminders, and motivation based on past entries help users overcome blank page syndrome
3. **Affordable Self-Reflection:** Provides a $5-10/month alternative to $100-200 therapy sessions for mood tracking, trigger identification, and emotional awareness

**Target Users:** People who want to write better, more productive, and more creative journal entries.

**Success Criteria:**
- Users can create, edit, and view journal entries on mobile devices
- Mood tracking captures emotional state for each entry
- AI provides meaningful sentiment analysis and summaries
- Search functionality helps users find past entries
- App is secure, performant, and mobile-responsive

---

## Technology Stack

### Frontend
- **Framework:** Ionic 8 + React 19 + Vite (TypeScript)
  - Cross-platform mobile (iOS + Android) via Capacitor 7
  - Web-first with native capabilities
  - Fast development with Vite HMR
  - Responsive UI with Ionic components
- **State Management:** Zustand
- **Navigation:** React Router (via @ionic/react-router)
- **UI Components:** Ionic Framework (@ionic/react)
- **Build Tool:** Vite 5
- **Form Handling:** React Hook Form + Zod

### Backend
- **Runtime:** Node.js
- **Framework:** Express or Fastify
- **Language:** TypeScript
- **API Style:** RESTful JSON API

### Database & Infrastructure
- **Primary Database:** PostgreSQL via Supabase
  - Structured data (users, entries, moods)
  - Full-text search with tsvector
  - Row-level security (RLS)
- **Vector Database:** Pinecone (for semantic search - Phase 12)
- **Authentication:** Supabase Auth
- **Storage:** Supabase Storage (images, voice notes)

### AI/ML Services
- **OpenAI API:**
  - Sentiment analysis
  - Daily/weekly summaries
  - Pattern recognition
  - Smart prompt generation
  - Text embeddings for vector search

### Deployment
- **Frontend:** Capacitor (iOS and Android native builds)
  - Web: Static hosting (Vercel, Netlify, or similar)
  - iOS: App Store via Xcode
  - Android: Play Store via Android Studio
- **Backend:** Railway
- **Database:** Supabase (managed PostgreSQL)

---

## Project Structure

```
mindflow/
├── mobile/                          # Ionic + React + Vite app
│   ├── src/
│   │   ├── pages/                   # Page components (Ionic pages)
│   │   │   ├── auth/                # Login, signup, password reset
│   │   │   ├── entries/             # Entry list, detail, editor
│   │   │   ├── insights/            # AI summaries, patterns
│   │   │   ├── settings/            # User profile, preferences
│   │   │   ├── onboarding/          # New user onboarding
│   │   │   └── Home.tsx             # Home/landing page
│   │   ├── components/              # Reusable UI components
│   │   │   ├── common/              # Buttons, inputs, cards
│   │   │   ├── entries/             # Entry cards, mood picker
│   │   │   ├── insights/            # Charts, summaries
│   │   │   └── layout/              # Layout components, headers
│   │   ├── services/                # API clients and services
│   │   │   ├── supabase.ts          # Supabase client config
│   │   │   ├── auth.service.ts      # Authentication
│   │   │   ├── entries.service.ts   # Journal CRUD
│   │   │   └── insights.service.ts  # AI insights
│   │   ├── store/                   # Zustand state management
│   │   │   ├── authStore.ts         # Auth state
│   │   │   ├── entriesStore.ts      # Entries state
│   │   │   └── settingsStore.ts     # User settings
│   │   ├── utils/                   # Utility functions
│   │   │   ├── validation.ts        # Form validation (Zod schemas)
│   │   │   ├── date.ts              # Date formatting (date-fns)
│   │   │   └── constants.ts         # App constants
│   │   ├── hooks/                   # Custom React hooks
│   │   │   ├── useAuth.ts           # Auth hook
│   │   │   └── useEntries.ts        # Entries hook
│   │   ├── types/                   # TypeScript types
│   │   │   ├── entry.types.ts
│   │   │   ├── user.types.ts
│   │   │   └── api.types.ts
│   │   └── theme/                   # Theming and styles
│   │       ├── colors.ts            # Color palette
│   │       ├── typography.ts        # Font styles
│   │       ├── spacing.ts           # Spacing constants
│   │       ├── variables.css        # Ionic CSS variables
│   │       └── index.ts             # Theme exports
│   ├── public/                      # Static assets
│   │   └── assets/                  # Images, fonts, icons
│   ├── capacitor.config.ts          # Capacitor configuration
│   ├── ionic.config.json            # Ionic CLI configuration
│   ├── vite.config.ts               # Vite configuration
│   ├── package.json
│   ├── tsconfig.json
│   ├── .eslintrc.cjs                # ESLint configuration
│   └── .prettierrc                  # Prettier configuration
│
├── backend/                         # Node.js API server
│   ├── src/
│   │   ├── routes/                  # API route definitions
│   │   │   ├── auth.routes.ts       # Auth endpoints
│   │   │   ├── entries.routes.ts    # Entry CRUD
│   │   │   ├── insights.routes.ts   # AI insights
│   │   │   ├── search.routes.ts     # Search endpoints
│   │   │   └── index.ts             # Route aggregator
│   │   ├── controllers/             # Request handlers
│   │   │   ├── auth.controller.ts
│   │   │   ├── entries.controller.ts
│   │   │   ├── insights.controller.ts
│   │   │   └── search.controller.ts
│   │   ├── services/                # Business logic
│   │   │   ├── ai/
│   │   │   │   ├── sentiment.service.ts
│   │   │   │   ├── summary.service.ts
│   │   │   │   ├── patterns.service.ts
│   │   │   │   └── embeddings.service.ts
│   │   │   ├── entries.service.ts
│   │   │   ├── search.service.ts
│   │   │   └── notifications.service.ts
│   │   ├── middleware/              # Express middleware
│   │   │   ├── auth.middleware.ts   # JWT verification
│   │   │   ├── validation.middleware.ts
│   │   │   ├── rateLimit.middleware.ts
│   │   │   └── error.middleware.ts
│   │   ├── models/                  # Data models (if using ORM)
│   │   │   ├── User.ts
│   │   │   ├── Entry.ts
│   │   │   └── Mood.ts
│   │   ├── database/                # Database utilities
│   │   │   ├── supabase.ts          # Supabase client
│   │   │   └── seeds/               # Seed data scripts
│   │   ├── utils/                   # Helper functions
│   │   │   ├── logger.ts            # Logging
│   │   │   ├── cache.ts             # Caching utilities
│   │   │   └── validation.ts        # Input validation
│   │   ├── types/                   # TypeScript types
│   │   │   ├── express.d.ts         # Express extensions
│   │   │   └── index.ts             # Shared types
│   │   ├── config/                  # Configuration
│   │   │   ├── env.ts               # Environment variables
│   │   │   ├── openai.ts            # OpenAI config
│   │   │   └── supabase.ts          # Supabase config
│   │   └── server.ts                # Express app setup
│   ├── tests/                       # Backend tests
│   │   ├── unit/
│   │   ├── integration/
│   │   └── fixtures/
│   ├── package.json
│   └── tsconfig.json
│
├── shared/                          # Shared types between mobile and backend
│   ├── types/
│   │   ├── entry.types.ts
│   │   ├── user.types.ts
│   │   └── api.types.ts
│   └── constants.ts
│
├── supabase/                        # Supabase local development
│   ├── migrations/                  # Database migration files
│   │   └── YYYYMMDDHHMMSS_*.sql    # Timestamped migrations
│   ├── config.toml                  # Supabase CLI config (optional)
│   └── seed.sql                     # Seed data (optional)
│
├── docs/                            # Documentation
│   ├── initial-idea.md              # Project concept
│   ├── implementation-plan.md       # Phase-by-phase plan
│   ├── PROGRESS.md                  # Progress tracker
│   └── api/                         # API documentation
│       ├── authentication.md
│       ├── entries.md
│       └── insights.md
│
├── .github/
│   └── workflows/                   # CI/CD pipelines
│       ├── mobile-ci.yml
│       └── backend-ci.yml
│
├── .claude/
│   └── CLAUDE.md                    # This file
│
├── .gitignore
├── README.md
└── package.json                     # Root package.json (optional monorepo)
```

---

## Development Workflow

### Initial Setup

**Frontend (Ionic + React + Vite):**
```bash
cd mobile
npm install
npm run dev              # Start Vite dev server on http://localhost:3000

# For native development:
npm run cap:add:ios      # Add iOS platform (Mac only)
npm run cap:add:android  # Add Android platform
npm run cap:sync         # Sync web code to native platforms
npm run cap:open:ios     # Open in Xcode
npm run cap:open:android # Open in Android Studio
```

**Backend (Node.js):**
```bash
cd backend
npm install
npm run dev              # Development with hot reload
```

**Database (Supabase):**
1. Install Supabase CLI: `npm install -g supabase` (if not already installed)
2. Link to your Supabase project: `npx supabase link --project-ref <your-project-ref>`
3. Apply migrations: `npx supabase db push`
4. Copy connection strings to `.env` from Supabase Dashboard

### Environment Variables

**Mobile (.env):**
```
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

**Backend (.env):**
```
NODE_ENV=development
PORT=3000
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
OPENAI_API_KEY=sk-xxx
DATABASE_URL=postgresql://xxx
PINECONE_API_KEY=xxx
PINECONE_ENVIRONMENT=xxx
```

### Build & Run

**Development:**
- Frontend: `npm run dev` in `mobile/` (Vite dev server on http://localhost:3000)
- Backend: `npm run dev` in `backend/`
- Tests: `npm test` in respective directories

**Production Build:**
- Mobile Web: `npm run build` in `mobile/` (creates `dist/` folder)
- Mobile Native:
  - iOS: `npm run cap:sync && npm run cap:open:ios` → Build in Xcode
  - Android: `npm run cap:sync && npm run cap:open:android` → Build in Android Studio
- Backend: `npm run build` (compiles TypeScript)

### Testing Strategy

**Unit Tests (80%+ coverage):**
- Business logic in services
- Utility functions
- State management
- AI prompt generation

**Integration Tests:**
- API endpoints with test database
- Database queries and RLS policies
- External API integrations (mocked)
- Auth flows

**E2E Tests:**
- Critical user flows:
  - Sign up → Create entry → View entry
  - Login → Edit entry → Delete entry
  - Create entry → View AI insights
- Test on both iOS and Android

**Manual Testing:**
- Test on real iOS and Android devices
- Test offline scenarios
- Test push notifications
- Test media uploads

### Quality Gates (Every Phase)

**Before Marking Phase Complete:**
1. ✅ All tests pass (unit + integration + E2E)
2. ✅ Frontend builds without errors (`npm run build`)
3. ✅ Backend builds without errors (`npm run build`)
4. ✅ No TypeScript errors (`tsc --noEmit`)
5. ✅ ESLint passes with no errors (`npm run lint`)
6. ✅ All deliverables implemented
7. ✅ Manual testing on iOS and Android complete
8. ✅ Security checks pass (auth, RLS, input validation)
9. ✅ Performance requirements met
10. ✅ Code reviewed (if team project)

---

## Implementation Phases

Refer to `docs/implementation-plan.md` for complete details. Here's the execution order:

### MVP Phases (Required for Launch)

**Phase 1: Foundation & Infrastructure** ← START HERE
- Prerequisites: None
- Complexity: Moderate
- Set up Ionic + React + Vite, Supabase, database schema, Capacitor

**Phase 2: User Authentication**
- Prerequisites: Phase 1
- Complexity: Moderate
- Supabase Auth, login/signup screens, JWT middleware

**Phase 3: Core Journal CRUD**
- Prerequisites: Phase 2
- Complexity: Moderate
- Entry list, creation, editing, deletion with RLS

**After Phase 3, these can run in PARALLEL:**

**Phase 4: Mood Tracking** (Simple)
**Phase 5: Search & Filtering** (Moderate)
**Phase 6: Basic AI Integration** (Complex) ← Critical for MVP

### Post-MVP Phases

**Phase 7: Advanced AI Insights**
- Prerequisites: Phase 6
- Complexity: Complex
- Pattern recognition, smart prompts, monthly reports

**Phase 8: Offline Mode & Sync**
- Prerequisites: Phase 3
- Complexity: Complex

**Phase 9: Media & Rich Content**
- Prerequisites: Phase 3
- Complexity: Complex

**Phase 10: Organization Features**
- Prerequisites: Phase 3
- Complexity: Moderate

**Phase 11: Engagement Features**
- Prerequisites: Phase 2 & 3
- Complexity: Moderate

**Phase 12: Vector Search**
- Prerequisites: Phase 6
- Complexity: Complex

### Polish Phase

**Phase 13: Enhanced UI/UX**
- Prerequisites: None (can start anytime)
- Complexity: Moderate
- Dark mode, onboarding, accessibility

---

## Coding Conventions

### TypeScript Standards

**Use Strict Mode:**
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

**Prefer Interfaces for Object Shapes:**
```typescript
// Good
interface Entry {
  id: string;
  userId: string;
  content: string;
  mood: Mood;
  createdAt: Date;
}

// Avoid
type Entry = {
  id: string;
  // ...
}
```

**Use Type for Unions/Intersections:**
```typescript
type Mood = 'happy' | 'sad' | 'anxious' | 'calm' | 'stressed';
type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;
```

### Ionic + React Conventions

**Functional Components with TypeScript:**
```typescript
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle } from '@ionic/react';

interface EntryCardProps {
  entry: Entry;
  onPress: (id: string) => void;
}

export const EntryCard: React.FC<EntryCardProps> = ({ entry, onPress }) => {
  return (
    <IonCard button onClick={() => onPress(entry.id)}>
      <IonCardHeader>
        <IonCardTitle>{new Date(entry.created_at).toLocaleDateString()}</IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        {entry.content}
      </IonCardContent>
    </IonCard>
  );
};
```

**Custom Hooks for Logic Reuse:**
```typescript
export const useEntries = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const data = await entriesService.getAll();
      setEntries(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return { entries, loading, fetchEntries };
};
```

**Zustand Store Pattern:**
```typescript
import { create } from 'zustand';

interface EntriesStore {
  entries: Entry[];
  loading: boolean;
  setEntries: (entries: Entry[]) => void;
  addEntry: (entry: Entry) => void;
  updateEntry: (id: string, updates: Partial<Entry>) => void;
  deleteEntry: (id: string) => void;
}

export const useEntriesStore = create<EntriesStore>((set) => ({
  entries: [],
  loading: false,
  setEntries: (entries) => set({ entries }),
  addEntry: (entry) => set((state) => ({
    entries: [entry, ...state.entries]
  })),
  updateEntry: (id, updates) => set((state) => ({
    entries: state.entries.map(e =>
      e.id === id ? { ...e, ...updates } : e
    )
  })),
  deleteEntry: (id) => set((state) => ({
    entries: state.entries.filter(e => e.id !== id)
  })),
}));
```

### Backend / API Conventions

**Controller Pattern:**
```typescript
// controllers/entries.controller.ts
import { Request, Response } from 'express';
import { entriesService } from '../services/entries.service';

export const getEntries = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id; // From auth middleware
    const entries = await entriesService.getUserEntries(userId);
    res.json({ success: true, data: entries });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch entries'
    });
  }
};
```

**Service Layer Pattern:**
```typescript
// services/entries.service.ts
import { supabase } from '../database/supabase';

export const entriesService = {
  async getUserEntries(userId: string): Promise<Entry[]> {
    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async createEntry(userId: string, entry: CreateEntryDto): Promise<Entry> {
    const { data, error } = await supabase
      .from('entries')
      .insert([{ ...entry, user_id: userId }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
```

**API Response Format:**
```typescript
// Success
{
  "success": true,
  "data": { ... }
}

// Error
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Naming Conventions

**Files:**
- Components: PascalCase - `EntryCard.tsx`
- Services: camelCase - `entries.service.ts`
- Hooks: camelCase - `useEntries.ts`
- Utilities: camelCase - `validation.ts`
- Types: camelCase - `entry.types.ts`

**Variables & Functions:**
- camelCase - `getUserEntries`, `isLoading`, `handleSubmit`

**Constants:**
- UPPER_SNAKE_CASE - `API_BASE_URL`, `MAX_FILE_SIZE`

**React Components:**
- PascalCase - `EntryCard`, `MoodPicker`, `InsightsDashboard`

**Interfaces & Types:**
- PascalCase - `Entry`, `User`, `ApiResponse<T>`

### Code Organization

**Group Imports:**
```typescript
// 1. External libraries
import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';

// 2. Internal modules
import { useEntries } from '../hooks/useEntries';
import { EntryCard } from '../components/entries/EntryCard';

// 3. Types
import type { Entry } from '../types/entry.types';

// 4. Styles
import { styles } from './styles';
```

**Single Responsibility:**
- Each component/function should do ONE thing
- Extract complex logic into custom hooks or services
- Keep components under 200 lines (split if larger)

**DRY Principle:**
- Extract reusable logic into utilities
- Create shared components for repeated UI patterns
- Use custom hooks for common state patterns

### Comment Standards

**JSDoc for Public APIs:**
```typescript
/**
 * Analyzes the sentiment of a journal entry using OpenAI
 * @param content - The text content to analyze
 * @returns Sentiment score between -1 (negative) and 1 (positive)
 * @throws {OpenAIError} If the API call fails
 */
export async function analyzeSentiment(content: string): Promise<number> {
  // Implementation
}
```

**Inline Comments for Complex Logic:**
```typescript
// Calculate streak: consecutive days with at least one entry
const streak = entries.reduce((count, entry, index) => {
  if (index === 0) return 1;

  const prevDate = new Date(entries[index - 1].createdAt);
  const currDate = new Date(entry.createdAt);
  const daysDiff = Math.floor((prevDate - currDate) / (1000 * 60 * 60 * 24));

  // If entries are consecutive days, increment streak
  return daysDiff === 1 ? count + 1 : 1;
}, 0);
```

---

## Security Best Practices

### Authentication & Authorization

**Backend:**
- ✅ Verify JWT tokens on all protected routes
- ✅ Use Supabase Auth middleware
- ✅ Never trust client-side user IDs - extract from verified token
- ✅ Implement rate limiting on auth endpoints

```typescript
// middleware/auth.middleware.ts
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) throw error;

    req.user = user; // Attach verified user to request
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

**Database:**
- ✅ Implement Row-Level Security (RLS) in Supabase
- ✅ Users can only access their own entries
- ✅ No direct database access from frontend (API only)

```sql
-- Row-Level Security Policy
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own entries"
ON entries FOR ALL
USING (auth.uid() = user_id);
```

### Input Validation

**Validate ALL User Inputs:**
```typescript
import { z } from 'zod';

const createEntrySchema = z.object({
  content: z.string().min(1).max(10000),
  mood: z.enum(['happy', 'sad', 'anxious', 'calm', 'stressed']),
  tags: z.array(z.string()).max(10).optional(),
});

export const validateCreateEntry = (data: unknown) => {
  return createEntrySchema.parse(data);
};
```

**Prevent SQL Injection:**
- ✅ Use Supabase client (parameterized queries)
- ❌ Never concatenate user input into SQL strings

**Prevent XSS:**
- ✅ Sanitize HTML if allowing rich text
- ✅ React is safe by default with JSX (auto-escapes)
- ✅ Use `dangerouslySetInnerHTML` only when necessary and sanitize first
- ✅ Escape user content in summaries/insights

### Data Protection

**Sensitive Data:**
- ✅ Never log passwords, tokens, or API keys
- ✅ Use environment variables for secrets
- ✅ Encrypt data at rest (Supabase handles this)
- ✅ Use HTTPS for all API calls

**API Keys:**
- ✅ Store in `.env` files (never commit)
- ✅ Use different keys for dev/staging/production
- ✅ Rotate keys periodically

### Rate Limiting

**Protect AI Endpoints:**
```typescript
import rateLimit from 'express-rate-limit';

const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: 'Too many AI requests, please try again later',
});

router.post('/insights/summary', aiRateLimiter, getSummary);
```

---

## Performance Requirements

### Mobile App Performance

**App Launch:**
- Target: < 3 seconds to interactive
- Optimize: Lazy load screens, minimize bundle size

**Entry List Loading:**
- Target: < 1 second
- Optimize: Pagination, infinite scroll, local cache

**Animations:**
- Target: 60fps smooth animations
- Use: CSS transitions and Ionic animations
- Use: Web Animations API for complex animations
- Avoid: Heavy computations during animations

**Bundle Size:**
- Target: < 2MB initial JS bundle (web)
- Target: < 50MB total app size (native)
- Optimize: Code splitting, tree shaking, lazy loading

### Backend API Performance

**API Response Times:**
- Target: p95 < 500ms (95th percentile)
- Optimize: Database indexes, caching, connection pooling

**AI Operations:**
- Target: < 5 seconds
- Optimize: Parallel requests, caching, background jobs

**Database Queries:**
- Target: < 100ms for most queries
- Optimize: Indexes on `user_id`, `created_at`, full-text search columns

### Caching Strategy

**Backend Caching:**
- AI summaries: Cache for 24 hours (invalidate on new entries)
- User preferences: Cache for 1 hour
- Search results: Cache for 5 minutes

**Frontend Caching:**
- Entry list: Cache in Zustand + localStorage (web) / Capacitor Storage (native)
- User profile: Cache in memory
- Images: Cache with browser cache + Capacitor Filesystem API

### Database Optimization

**Indexes:**
```sql
CREATE INDEX idx_entries_user_id ON entries(user_id);
CREATE INDEX idx_entries_created_at ON entries(created_at DESC);
CREATE INDEX idx_entries_mood ON entries(mood);
CREATE INDEX idx_entries_search ON entries USING GIN(to_tsvector('english', content));
```

**Pagination:**
```typescript
// Fetch 20 entries at a time
const { data } = await supabase
  .from('entries')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .range(offset, offset + 19); // Offset-based pagination
```

---

## Testing Requirements

### Unit Tests (80%+ Coverage)

**What to Test:**
- Business logic in services
- Utility functions (date formatting, validation)
- State management (Zustand stores)
- AI prompt generation
- Data transformations

**Example:**
```typescript
// services/__tests__/entries.service.test.ts
describe('entriesService', () => {
  it('should create entry with correct user_id', async () => {
    const userId = 'user-123';
    const entryData = { content: 'Test entry', mood: 'happy' };

    const entry = await entriesService.createEntry(userId, entryData);

    expect(entry.user_id).toBe(userId);
    expect(entry.content).toBe('Test entry');
  });
});
```

### Integration Tests

**What to Test:**
- API endpoints with test database
- Database queries and RLS policies
- External API integrations (mocked)
- Auth flows end-to-end

**Example:**
```typescript
// routes/__tests__/entries.routes.test.ts
describe('POST /entries', () => {
  it('should create entry for authenticated user', async () => {
    const token = await getTestUserToken();

    const response = await request(app)
      .post('/entries')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Test', mood: 'happy' });

    expect(response.status).toBe(201);
    expect(response.body.data.content).toBe('Test');
  });

  it('should reject unauthenticated requests', async () => {
    const response = await request(app)
      .post('/entries')
      .send({ content: 'Test', mood: 'happy' });

    expect(response.status).toBe(401);
  });
});
```

### E2E Tests (Critical Flows)

**Critical User Flows:**
1. Sign up → Create first entry → View entry
2. Login → Edit entry → Delete entry
3. Create entry → View AI insights
4. Offline: Create entry → Go online → Sync

**Tools:**
- Cypress for E2E testing (comes pre-configured with Ionic)
- Vitest for unit/integration testing
- Test on web browser, iOS, and Android

### Manual Testing Checklist

**Before Each Phase Completion:**
- [ ] Test in Chrome browser (desktop)
- [ ] Test in Safari browser (if on Mac)
- [ ] Test on iOS simulator (if on Mac)
- [ ] Test on Android emulator
- [ ] Test on real iOS device (via Capacitor)
- [ ] Test on real Android device (via Capacitor)
- [ ] Test offline scenarios (if applicable)
- [ ] Test with slow network connection (Chrome DevTools)
- [ ] Test with no network connection
- [ ] Test edge cases (empty states, errors)
- [ ] Test accessibility (screen reader, keyboard navigation)

---

## AI Integration Guidelines

### OpenAI Best Practices

**Cost Control:**
- ✅ Use GPT-3.5-turbo for most tasks (cheaper)
- ✅ Reserve GPT-4 for complex pattern recognition only
- ✅ Cache results aggressively
- ✅ Implement rate limiting per user
- ✅ Monitor costs with usage tracking

**Prompt Engineering:**
```typescript
const SENTIMENT_PROMPT = `
Analyze the emotional tone of this journal entry and return a sentiment score.

Entry: "{content}"

Return ONLY a JSON object with this format:
{
  "score": <number between -1 (very negative) and 1 (very positive)>,
  "primary_emotion": "<happy|sad|anxious|calm|stressed|neutral>",
  "confidence": <number between 0 and 1>
}
`;
```

**Error Handling:**
```typescript
try {
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3, // Lower for consistent results
    max_tokens: 500,
  });

  return JSON.parse(response.choices[0].message.content);
} catch (error) {
  if (error.status === 429) {
    // Rate limited - implement exponential backoff
    await sleep(1000);
    return retry();
  }

  // Return fallback sentiment
  return { score: 0, primary_emotion: 'neutral', confidence: 0 };
}
```

**Caching Strategy:**
```typescript
// Cache sentiment analysis for 30 days (entries rarely edited)
const cacheKey = `sentiment:${entryId}`;
const cached = await redis.get(cacheKey);

if (cached) return JSON.parse(cached);

const sentiment = await analyzeSentiment(content);
await redis.setex(cacheKey, 30 * 24 * 60 * 60, JSON.stringify(sentiment));

return sentiment;
```

### Vector Search with Pinecone (Phase 12)

**Embedding Generation:**
```typescript
const embedding = await openai.embeddings.create({
  model: 'text-embedding-3-small', // Most cost-effective
  input: entry.content,
});

const vector = embedding.data[0].embedding;

// Store in Pinecone
await pinecone.upsert({
  vectors: [{
    id: entry.id,
    values: vector,
    metadata: { userId: entry.userId, createdAt: entry.createdAt },
  }],
});
```

**Similarity Search:**
```typescript
const results = await pinecone.query({
  vector: queryEmbedding,
  topK: 5,
  filter: { userId: currentUserId }, // Only search user's entries
  includeMetadata: true,
});
```

---

## Important Principles

### Privacy First
- ✅ User data is NEVER shared with third parties
- ✅ AI processing happens securely (no training on user data)
- ✅ Provide data export and account deletion
- ✅ Be transparent about what data is stored

### Mobile-First Design
- ✅ Design for mobile screens first, desktop later
- ✅ Touch-friendly UI (44px minimum touch targets)
- ✅ Thumb-friendly navigation (bottom tabs)
- ✅ Offline-capable where possible

### Accessibility
- ✅ Screen reader compatible (accessibility labels)
- ✅ High contrast text (WCAG AA compliance)
- ✅ Keyboard navigable
- ✅ Support for larger text sizes

### Progressive Enhancement
- ✅ Core functionality works without AI (manual journaling)
- ✅ AI insights are additive, not required
- ✅ Offline mode supports essential features
- ✅ Graceful degradation when APIs fail

### Iteration Over Perfection
- ✅ Ship MVP features first, polish later
- ✅ Gather user feedback early and often
- ✅ Iterate on AI prompts based on feedback
- ✅ Don't over-engineer - YAGNI principle

---

## Common Patterns & Examples

### Error Handling Pattern

**Frontend:**
```typescript
try {
  setLoading(true);
  const entry = await entriesService.create(data);
  useEntriesStore.getState().addEntry(entry);
  navigation.navigate('EntryDetail', { id: entry.id });
} catch (error) {
  if (error.code === 'NETWORK_ERROR') {
    // Queue for offline sync
    await syncQueue.add('createEntry', data);
    Alert.alert('Saved offline', 'Will sync when online');
  } else {
    Alert.alert('Error', 'Failed to save entry. Please try again.');
  }
} finally {
  setLoading(false);
}
```

**Backend:**
```typescript
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(err);

  if (err instanceof ValidationError) {
    return res.status(400).json({ error: err.message });
  }

  if (err instanceof AuthError) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  res.status(500).json({ error: 'Internal server error' });
};
```

### Loading States

```typescript
const EntryList: React.FC = () => {
  const { entries, loading } = useEntries();

  if (loading) {
    return <LoadingSkeleton count={5} />;
  }

  if (entries.length === 0) {
    return <EmptyState message="No entries yet. Start journaling!" />;
  }

  return (
    <FlatList
      data={entries}
      renderItem={({ item }) => <EntryCard entry={item} />}
      keyExtractor={item => item.id}
    />
  );
};
```

### Optimistic UI Updates

```typescript
const deleteEntry = async (id: string) => {
  // Optimistically remove from UI
  useEntriesStore.getState().deleteEntry(id);

  try {
    await entriesService.delete(id);
  } catch (error) {
    // Rollback on error
    useEntriesStore.getState().addEntry(deletedEntry);
    Alert.alert('Error', 'Failed to delete entry');
  }
};
```

---

## Git Workflow

### Branch Naming
- `main` - Production-ready code
- `develop` - Integration branch
- `feature/phase-1-setup` - Feature branches
- `bugfix/fix-auth-token` - Bug fixes
- `hotfix/critical-issue` - Production hotfixes

### Commit Messages
```
feat(auth): add password reset flow
fix(entries): resolve duplicate key error on sync
docs(api): update authentication endpoints
test(insights): add sentiment analysis tests
refactor(ui): extract MoodPicker component
```

### Pull Request Template
```markdown
## Phase
Phase 3: Core Journal CRUD Operations

## Description
Implements full CRUD operations for journal entries with RLS

## Checklist
- [x] All tests pass
- [x] ESLint passes
- [x] TypeScript compiles
- [x] Tested on iOS
- [x] Tested on Android
- [x] Phase deliverables complete
- [x] Quality gates met
```

---

## When Implementing Features

### Before Starting
1. ✅ Read the phase description in `docs/implementation-plan.md`
2. ✅ Review prerequisites - are they complete?
3. ✅ Check `docs/PROGRESS.md` for current status
4. ✅ Understand the deliverables and quality gates

### During Implementation
1. ✅ Follow the project structure defined above
2. ✅ Write tests alongside code (TDD when possible)
3. ✅ Keep commits small and focused
4. ✅ Test frequently on both iOS and Android
5. ✅ Document complex logic with comments

### Before Completing Phase
1. ✅ Run all tests (unit + integration + E2E)
2. ✅ Verify all quality gates pass
3. ✅ Manual testing on iOS and Android
4. ✅ Update `docs/PROGRESS.md` with completion date
5. ✅ Document any decisions or learnings

### Code Review Checklist
- [ ] Code follows TypeScript conventions
- [ ] Tests cover edge cases
- [ ] No console.logs or debug code
- [ ] Error handling is comprehensive
- [ ] Security best practices followed
- [ ] Performance requirements met
- [ ] Accessibility considered
- [ ] Mobile-responsive on all screen sizes

---

## Quick Reference

### Useful Commands

```bash
# Frontend (Ionic + Vite)
cd mobile
npm run dev                  # Start Vite dev server (http://localhost:3000)
npm run build                # Build for production
npm test                     # Run Vitest tests
npm run lint                 # Run ESLint
npm run type-check           # TypeScript check
npm run format               # Format with Prettier

# Capacitor (Native)
npm run cap:sync             # Sync web code to native platforms
npm run cap:open:ios         # Open in Xcode (Mac only)
npm run cap:open:android     # Open in Android Studio

# Backend
cd backend
npm run dev                  # Start dev server with hot reload
npm test                     # Run tests
npm run lint                 # Run ESLint
npm run build                # Compile TypeScript

# Database
cd supabase
cat schemas/*.sql > schema.sql              # Combine schema files
npx supabase db push                        # Apply migrations (requires Docker)
```

### Important Files
- `docs/implementation-plan.md` - Complete phase descriptions
- `docs/phases/phase-01-detailed-ionic.md` - Ionic setup guide
- `docs/PROGRESS.md` - Track completion status
- `supabase/schemas/*.sql` - Database schema files
- `supabase/schema.sql` - Combined schema
- `.env` - Environment variables (never commit!)

### Key Links
- Supabase Dashboard: https://app.supabase.com
- Ionic Documentation: https://ionicframework.com/docs
- Capacitor Documentation: https://capacitorjs.com/docs
- OpenAI API Keys: https://platform.openai.com/api-keys
- Railway Dashboard: https://railway.app

---

**Remember:** Quality over speed. Each phase builds on the previous ones, so take time to get it right!
