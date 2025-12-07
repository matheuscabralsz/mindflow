# MindFlow - AI-Powered Journal App

An AI-powered mobile journal app that helps users write daily journal entries, track moods, and receive AI-generated insights.

## Project Structure

- `mobile/` - Ionic + React + Vite app (iOS + Android via Capacitor)
- `supabase/` - Database files
  - `schemas/` - Source of truth schema files organized by entity (what you edit)
  - `migrations/` - Timestamped migration files (generated via `db diff`, applied via `db push`)
- `docs/` - Documentation

## Quick Start

### Prerequisites
- Node.js 18+
- iOS Simulator (Mac) or Android Studio (for native builds)
- Supabase account

### Frontend Setup
```bash
cd mobile
npm install
npm run dev                      # Vite dev server (http://localhost:5173)

# Native development (optional)
npm run cap:sync                 # Sync web → native
npm run cap:open:ios             # Open Xcode (Mac only)
npm run cap:open:android         # Open Android Studio
```

### Environment Variables
```bash
# mobile/.env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

### Supabase Setup
```bash
# Create a supabase migration from schema changes
npx supabase db diff -f <migration-name>
```

### Supabase (local)
```bash
# Requires Docker running
supabase start

# Reset supabase database with schema changes
supabase reset
```

### Supabase (prod)
```bash
# Login to Supabase CLI
npx supabase login

# Link project
npx supabase link --project-ref <project-ref>

# Run migrations
npx supabase db push
```

## Documentation

- [Initial Idea](docs/initial-idea.md)
- [Phase Documentation](docs/phases/)
- [Project Instructions](.claude/CLAUDE.md)

## Tech Stack

- Frontend: Ionic 8 + React 19 + Vite + TypeScript
- State Management: Zustand
- Native: Capacitor 7
- Database: PostgreSQL (Supabase)
- AI: OpenAI API (Phase 6+)
- Auth: Supabase Auth

## License

MIT
