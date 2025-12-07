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
├── supabase/
│   ├── schemas/                # Source of truth (edit these)
│   ├── migrations/             # Generated migrations (via CLI)
│   └── functions/              # Edge Functions (AI)
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
npx supabase migration new <name>  # Create migration file
npx supabase db push               # Apply migrations (prod)
supabase db reset                  # Reset local DB
```

---

## Database Workflow

**Schema files are the source of truth.** Migrations contain delta changes.

1. Edit schema in `supabase/schemas/XX_name.sql`
2. Create migration: `npx supabase migration new <name>`
3. Add delta SQL to the generated migration file
4. Apply: `npx supabase db push` (prod) or `supabase db reset` (local)

---

## Edge Functions Deployment

```bash
npx supabase secrets set OPENAI_API_KEY=sk-xxx  # Set secrets
npx supabase functions deploy                    # Deploy all functions
npx supabase functions deploy <name>             # Deploy specific function
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

---

## Important Principles

**Privacy First:** User data never shared, AI processing secure, provide data export
**Mobile-First:** Design for mobile screens, 44px touch targets, thumb-friendly nav
**Accessibility:** Screen reader compatible, WCAG AA compliance, keyboard navigable
**Progressive Enhancement:** Core features work without AI, graceful degradation
**Iteration Over Perfection:** Ship MVP features first, gather feedback, iterate

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

---

**Remember:** Quality over speed. Each phase builds on the previous ones.
