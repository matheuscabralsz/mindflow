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
