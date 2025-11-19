# MindFlow - AI-Powered Journal App

## Repository Purpose

AI-powered mobile journal app (Ionic + React + Vite) that helps users write daily entries, track moods, and receive AI-generated insights.

**Core Problems:**
1. **Making Past Entries Useful** - AI surfaces patterns vs. writing 365 entries/year and never looking back
2. **Overcoming Writer's Block** - Smart prompts based on past entries
3. **Affordable Self-Reflection** - $5-10/month alternative to $100-200 therapy sessions

**Success Criteria:** Mobile journal CRUD, mood tracking, AI insights, search, secure + performant

---

## Tech Stack

**Frontend:** Ionic 8 + React 19 + Vite + TypeScript + Capacitor 7
**State:** Zustand
**Backend (MVP):** Direct Supabase integration (no backend server needed for Phases 1-6)
**Database:** PostgreSQL via Supabase (RLS, full-text search)
**Auth:** Supabase Auth
**AI:** OpenAI API (Phase 6+)
**Testing:** Vitest (unit), Cypress (E2E)

**For advanced features (Phase 7+):** See `.claude/future/backend-guide.md`

---

## Project Structure

```
mindflow/
├── mobile/                     # Ionic + React + Vite app
│   ├── src/
│   │   ├── pages/              # Page components (auth, entries, insights, settings)
│   │   ├── components/         # Reusable UI (common, entries, insights, layout)
│   │   ├── services/           # API clients (supabase, auth, entries)
│   │   ├── store/              # Zustand state management
│   │   ├── utils/              # Helpers (moods.ts, validation.ts, date.ts)
│   │   ├── hooks/              # Custom React hooks
│   │   ├── types/              # TypeScript type definitions
│   │   └── theme/              # Styling and theme config
│   ├── cypress/e2e/            # E2E tests
│   └── [config files]          # capacitor.config.ts, vite.config.ts, etc.
├── supabase/migrations/        # Database migrations
├── docs/                       # Project docs (initial-idea.md, phases/)
└── .claude/                    # This file + future guides
```

---

## Getting Started

### Setup

```bash
cd mobile
npm install
npm run dev                      # Vite dev server (http://localhost:5173)

# Native development (optional)
npm run cap:sync                 # Sync web → native
npm run cap:open:ios             # Open Xcode (Mac only)
npm run cap:open:android         # Open Android Studio

# Database
npx supabase db push             # Apply migrations
```

### Environment Variables

```bash
# mobile/.env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

Get these from Supabase Dashboard → Settings → API

### Common Commands

```bash
# Development
npm run dev                      # Start dev server
npm run build                    # Production build
npm run test.unit                # Vitest unit tests
npm run test.e2e                 # Cypress E2E (headless)
npx cypress open                 # Cypress E2E (interactive)

# Database
npx supabase db push             # Apply migrations
```

---

## Implementation Phases

**MVP Phases (Required for Launch):**
1. **Foundation & Infrastructure** ← START HERE (Ionic, Supabase, Capacitor)
2. **User Authentication** (Supabase Auth, login/signup)
3. **Core Journal CRUD** (Entry list, create, edit, delete with RLS)
4. **Mood Tracking** (Simple - can run parallel after Phase 3)
5. **Search & Filtering** (Moderate - can run parallel after Phase 3)
6. **Basic AI Integration** (Complex - critical for MVP)

**Post-MVP:** Phases 7-13 (Advanced AI, offline sync, media, etc.)

See `docs/phases/phase-0X-detailed.md` for individual phase details.
See `docs/initial-idea.md` for project vision and requirements.

---

## Code Standards

### TypeScript

**Strict mode enabled.** Use interfaces for object shapes, types for unions.

```typescript
// Interfaces for objects
interface Entry {
  id: string;
  user_id: string;
  content: string;
  mood: MoodType | null;
  created_at: string;
}

// Types for unions
type MoodType = 'happy' | 'sad' | 'anxious' | 'calm' | 'stressed' | 'neutral';
```

**Example:** See `mobile/src/utils/moods.ts:1` for complete mood system implementation.

### Ionic + React Patterns

**Page Components:**
- Wrap in `<IonPage>` → `<IonHeader>` → `<IonContent>`
- Use `useParams<{ id: string }>()` for route params
- Example: `mobile/src/pages/entries/EntryListPage.tsx:1`

**Routing:**
```typescript
// App.tsx
<Route exact path="/entries/:id/view">
  <EntryDetailPage />
</Route>
```

**State Management (Zustand):**
```typescript
export const useEntriesStore = create<EntriesStore>((set) => ({
  entries: [],
  setEntries: (entries) => set({ entries }),
  addEntry: (entry) => set((state) => ({ entries: [entry, ...state.entries] })),
  deleteEntry: (id) => set((state) => ({ entries: state.entries.filter(e => e.id !== id) })),
}));
```

### Service Layer (Frontend → Supabase)

```typescript
// mobile/src/services/entries.service.ts
export async function getAllEntries(): Promise<Entry[]> {
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error('Failed to fetch entries');
  return data || [];
}
```

**Note:** RLS automatically filters by `auth.uid()` - no need to pass user_id

### Naming Conventions

- **Files:** PascalCase for components (`EntryCard.tsx`), camelCase for services (`entries.service.ts`)
- **Variables/Functions:** camelCase (`getUserEntries`, `handleSubmit`)
- **Constants:** UPPER_SNAKE_CASE (`API_BASE_URL`)
- **Components/Types:** PascalCase (`EntryCard`, `Entry`)

### Import Organization

```typescript
// 1. External libraries
import React, { useState } from 'react';
import { IonPage, IonContent } from '@ionic/react';

// 2. Internal modules
import { useEntries } from '../hooks/useEntries';
import { EntryCard } from '../components/entries/EntryCard';

// 3. Types
import type { Entry } from '../types/entry.types';
```

---

## Best Practices

### Security

**Authentication:**
- Supabase Auth handles JWT tokens
- RLS policies enforce user-level access
- Never trust client-side user IDs

```sql
-- Row-Level Security
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own entries"
ON entries FOR ALL USING (auth.uid() = user_id);
```

**Input Validation:**
```typescript
import { z } from 'zod';

const createEntrySchema = z.object({
  content: z.string().min(1).max(10000),
  mood: z.enum(['happy', 'sad', 'anxious', 'calm', 'stressed', 'neutral']).nullable(),
});
```

**Data Protection:**
- Never log passwords, tokens, or API keys
- Use `.env` for secrets (never commit)
- HTTPS for all API calls

### Performance

**Mobile App:**
- App launch: < 3 seconds
- Entry list: < 1 second (use pagination)
- Animations: 60fps (CSS transitions, Ionic animations)
- Bundle size: < 2MB JS bundle

**Database:**
```sql
-- Essential indexes
CREATE INDEX idx_entries_user_id ON entries(user_id);
CREATE INDEX idx_entries_created_at ON entries(created_at DESC);
CREATE INDEX idx_entries_mood ON entries(mood);
```

**Caching:**
- Frontend: Cache entries in Zustand + Capacitor Storage
- Backend (Phase 6+): Cache AI summaries for 24 hours

### Error Handling

```typescript
try {
  setLoading(true);
  const entry = await entriesService.create(data);
  useEntriesStore.getState().addEntry(entry);
  navigation.navigate('EntryDetail', { id: entry.id });
} catch (error) {
  console.error('Failed to create entry:', error);
  // Show user-friendly error
} finally {
  setLoading(false);
}
```

---

## Testing

**Unit Tests (80%+ coverage):**
- Services, utils, state management
- Run: `npm run test.unit`

**E2E Tests (Cypress):**
- Critical flows: Sign up → Create entry → View entry
- Example: `mobile/cypress/e2e/mood-tracking.cy.ts:1`
- Run: `npx cypress open` (interactive) or `npm run test.e2e` (headless)

**Quality Gates (Before Marking Phase Complete):**
1. All tests pass
2. `npm run build` succeeds
3. No TypeScript errors (`npx tsc --noEmit`)
4. ESLint passes (`npm run lint`)
5. Manual testing on iOS and Android

---

## Feature Implementation Workflow

### Before Starting
1. Read phase description in `docs/phases/phase-0X-detailed.md`
2. Check prerequisites are complete
3. Review `docs/initial-idea.md` for requirements

### During Implementation
1. Follow project structure
2. Write tests alongside code (TDD)
3. Test frequently on iOS and Android
4. Document complex logic

### Before Completing Phase
1. Run all tests
2. Verify quality gates
3. Manual testing on devices

---

## Important Principles

**Privacy First:** User data never shared, AI processing secure, provide data export
**Mobile-First:** Design for mobile screens, 44px touch targets, thumb-friendly nav
**Accessibility:** Screen reader compatible, WCAG AA compliance, keyboard navigable
**Progressive Enhancement:** Core features work without AI, graceful degradation
**Iteration Over Perfection:** Ship MVP features first, gather feedback, iterate

---

## Git Workflow

**Branches:** `main`, `develop`, `feature/phase-X-name`, `bugfix/fix-name`

**Commit Messages:**
```
feat(auth): add password reset flow
fix(entries): resolve duplicate key error
docs(api): update authentication endpoints
test(insights): add sentiment analysis tests
```

---

## Quick Reference

**Important Files:**
- `docs/initial-idea.md` - Project vision and requirements
- `docs/phases/phase-0X-detailed.md` - Individual phase descriptions
- `supabase/schema.sql` - Database schema
- `.env` - Environment variables (never commit!)

**Key Links:**
- Supabase Dashboard: https://app.supabase.com
- Ionic Docs: https://ionicframework.com/docs
- Capacitor Docs: https://capacitorjs.com/docs

**Need Help?**
- Troubleshooting: See `docs/troubleshooting.md`
- AI Integration: See `.claude/future/ai-integration.md` (Phase 6+)
- Backend Setup: See `.claude/future/backend-guide.md` (Phase 7+)

---

**Remember:** Quality over speed. Each phase builds on the previous ones.
