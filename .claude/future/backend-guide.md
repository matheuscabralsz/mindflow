# Backend Development Guide (Phase 7+)

**Status:** Not needed for MVP (Phases 1-6). Add this content when starting Phase 7.

## When to Use This Guide

Start implementing backend when you need:
- AI orchestration (OpenAI, embeddings)
- Background jobs (daily summaries, notifications)
- Advanced caching and rate limiting
- Vector search orchestration

## Backend Architecture (Node.js + Express/Fastify)

```
backend/
├── src/
│   ├── routes/              # API route definitions
│   ├── services/            # Business logic (AI, notifications)
│   ├── middleware/          # Auth, rate limiting, error handling
│   ├── utils/               # Logger, cache
│   ├── config/              # Environment, OpenAI, Supabase config
│   └── server.ts            # Express app setup
├── tests/
└── package.json
```

## Environment Variables

```bash
NODE_ENV=development
PORT=3000
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
OPENAI_API_KEY=sk-xxx
DATABASE_URL=postgresql://xxx
```

## Key Patterns

### Authentication Middleware

```typescript
// middleware/auth.middleware.ts
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid token' });

  req.user = user;
  next();
};
```

### Controller Pattern

```typescript
// controllers/entries.controller.ts
export const getEntries = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id; // From auth middleware
    const entries = await entriesService.getUserEntries(userId);
    res.json({ success: true, data: entries });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch entries' });
  }
};
```

### API Response Format

```typescript
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": "Error message", "code": "ERROR_CODE" }
```

## Deployment

**Platform:** Railway
**Database:** Existing Supabase instance
**Environment:** Production env vars in Railway dashboard

---

**TODO:** Expand this guide when starting Phase 7.
