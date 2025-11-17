# MindFlow - AI-Powered Journal App

An AI-powered mobile journal app that helps users write daily journal entries, track moods, and receive AI-generated insights.

## Project Structure

- `mobile/` - React Native Expo app (iOS + Android)
- `backend/` - Node.js Express API server
- `supabase/` - Database migrations (Supabase CLI)
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

### Supabase Setup
```aiexclude
// create a supabase migration from schema changes
npx supabase db diff -f <migration-name>
```

### supabase (local)
```
// obs: need docker running
supabase start

// reset supabase database with schema changes
 supabase reset
```

### Supabase (prod)
```
// login to Supabase CLI
npx supabase login

// link project to backend
npx supabase link --project-ref <project-ref>

// run migrations
npx supabase db push
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
