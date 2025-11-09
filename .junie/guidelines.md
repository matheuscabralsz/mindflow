# MindFlow – Development Guidelines (Project‑Specific)

These notes codify the conventions and decisions that are specific to MindFlow. They assume an experienced developer and focus on how we intend to set up and operate this repo as it grows from a docs‑only state to a working app.

## Current State & Intent
- This repository currently contains planning documentation only. No runnable app code is checked in yet.
- The intended architecture is a small monorepo:
  - `mobile/` – React Native with Expo (TypeScript)
  - `backend/` – Node.js API (Express or Fastify, TypeScript)
  - `infra/` (optional) – IaC, database migrations, and operational tooling
- Core platform services (from docs and architecture): Supabase (Auth, Postgres, Storage), OpenAI (LLM + embeddings), Pinecone (vector search, later phases), Railway (backend hosting), Expo EAS (mobile distribution).

---

## Build & Configuration

### Node/Toolchain
- Target Node: LTS (20.x). Local verification succeeded with Node v22.19.0; both work, but prefer LTS for CI.
- Package manager: PNPM (recommended) or npm workspaces. If undecided, default to PNPM for monorepo ergonomics.
- Suggested workspace layout (to be created when we initialize the code):
  ```
  mindflow/
  ├─ package.json            # "private": true, workspaces
  ├─ pnpm-workspace.yaml     # or npm workspaces in package.json
  ├─ mobile/                 # Expo app
  ├─ backend/                # Node API
  └─ infra/                  # Supabase migrations, scripts, IaC
  ```

### Environment Variables & Secrets (project‑specific)
Use per‑package `.env` files plus a secret manager (Doppler/1Password/Vault) for shared CI/CD values. Baseline variables you will need across phases:
- Backend/API
  - `PORT=8080`
  - `NODE_ENV=development|production`
  - `SUPABASE_URL=https://...`
  - `SUPABASE_ANON_KEY=...` (frontend only)
  - `SUPABASE_SERVICE_ROLE_KEY=...` (backend only – keep out of client)
  - `DATABASE_URL=postgres://...` (direct) or `PGBOUNCER_URL=postgres://...` (through pgbouncer)
  - `OPENAI_API_KEY=...`
  - `PINECONE_API_KEY=...` (post‑MVP)
- Mobile/Expo
  - Prefer runtime constants via `expo-constants` and app config plugins. Inject public config via EAS or `.env` processed by `expo-env`/`react-native-config` with a guarded allowlist.

Secrets policy:
- Never commit real keys.
- Service role keys and DB URLs are forbidden in the mobile app bundle.
- Use per‑environment files: `.env.development`, `.env.preview`, `.env.production`.

### Database & Migrations (Supabase)
- Use Supabase SQL migrations with the Supabase CLI for source‑controlled schema and policies.
- Keep RLS enabled by default; write policies first, then table code. Handle auth via `auth.uid()` predicates.
- Indexing: add GIN indexes for text search (`tsvector`) and JSONB, and B‑tree on frequent filters (user_id, created_at).
- Local iteration (once code exists):
  - `supabase start` → local Postgres + Studio
  - `supabase db reset` → recreate from migrations
  - `supabase db diff -f <name>` → create migration from local changes

### Backend Service (planned)
- Framework: Express or Fastify with TypeScript.
- Runtime decisions:
  - Validation via Zod.
  - Auth via Supabase JWT verification middleware (no session server state).
  - Logging: pino with request‑scoped child loggers; redact PII by default.
  - Error model: typed errors → problem+json responses; no stack traces in prod.
  - Observability: OpenTelemetry (http, pg) with OTLP exporter.

### Mobile App (planned)
- Expo TypeScript template; state management with Zustand.
- Navigation: React Navigation.
- UI: NativeBase or React Native Paper (choose one and standardize tokens).
- Offline: write through an offline queue and a `sync.service` that reconciles states; prefer server timestamps; avoid clock‑skew bugs.
- Testing: RNTL + Jest for unit/integration; Detox for e2e (see Testing section).

---

## Testing Strategy

MindFlow will have three layers of tests once code exists:
1) Unit/Component tests
- Backend: Vitest or Jest with `supertest` for HTTP.
- Mobile: Jest + React Native Testing Library.

2) Integration tests
- Backend: run against ephemeral DB (Supabase or Testcontainers Postgres). Apply migrations before tests. Use a dedicated schema or DB; never reuse prod.
- Mobile: run components against mocked network and storage. Keep AI calls mocked; verify prompt shapes, not provider behavior.

3) End‑to‑End tests
- Mobile e2e with Detox on a stable device profile. Smoke tests only in CI due to runtime overhead.

### Verified Minimal Example (Node built‑in test runner)
Because there is no codebase yet, we validated the environment using Node’s native test runner. This example is known‑good and was executed successfully on this machine.

1) Create a throwaway file `tmp-demo-node-test.mjs` with the following content:
```mjs
import test from 'node:test';
import assert from 'node:assert/strict';

// Minimal demo function under test
function add(a, b) {
  return a + b;
}

// Example test suite demonstrating Node's built-in test runner
// Run with: node --test tmp-demo-node-test.mjs

test('add() sums positive, negative, and tiny numbers', () => {
  assert.equal(add(2, 3), 5);
  assert.equal(add(-1, -4), -5);
  assert.equal(add(0, 0), 0);
  assert.equal(add(1e-10, -1e-10), 0);
});
```
2) Run it:
```
node --test tmp-demo-node-test.mjs
```
Expected output (observed locally):
```
✔ add() sums positive, negative, and tiny numbers (...ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms <~50
```
3) Remove the file when done:
```
# Windows PowerShell
Remove-Item tmp-demo-node-test.mjs
```
This serves as a pattern for adding future backend unit tests if you choose to keep using `node:test` (alternatively, adopt Vitest/Jest for broader ecosystem support).

### How We’ll Add Tests Once Code Exists
- Backend
  - Folder: `backend/src/**/__tests__/*.test.ts`
  - Runner: Vitest (preferred) or Node test runner
  - HTTP testing: `supertest`
  - DB: Spin up a dedicated test database; apply migrations; truncate between tests
- Mobile
  - Folder: `mobile/src/**/__tests__/*.test.tsx`
  - Config: Jest + React Native Testing Library
  - Mocks: network (MSW), storage (AsyncStorage), time (fake timers)
- E2E (Mobile)
  - Detox config per platform; establish a single golden device profile for CI to reduce flakiness

---

## Additional Development Guidance (project‑specific)

### Code Style & Quality
- TypeScript strict mode in both packages.
- ESLint + Prettier. Keep a shared config at repo root (`eslint-config-mindflow`).
- Absolute imports via TS path aliases (`@app/...`, `@backend/...`).
- Commit style: Conventional Commits; semantic versioning for the backend API.

### API & Data Contracts
- API request/response schemas validated at the boundary with Zod; generate OpenAPI from source.
- Pagination: cursor‑based for entries; stable sort on `(created_at, id)`.
- Idempotency: apply for write endpoints used by offline sync.

### Security & Privacy
- RLS: default‑deny posture; all queries go through policies.
- PII: isolate and avoid logging; apply field‑level encryption at rest for sensitive content if feasible.
- AI usage: never send raw secrets or irreversible identifiers to third parties; tokenize user IDs.

### Observability
- Logging: pino with redact rules; correlate mobile requests via `X-Request-Id` propagated end‑to‑end.
- Metrics: basic SLIs (p95 latency, error rate) on the backend; usage counters for AI calls.

### Performance & UX
- Mobile performance budgets: initial load < 2s on mid‑range devices; avoid long JS stalls; batch state updates.
- Backend: prefer streaming for large text responses; use connection pooling.

### Migrations & Releases
- Migration discipline: forward‑only SQL with `-- revert:` sections where possible.
- Feature flags for risky AI features; gradual rollout.
- Mobile releases via EAS; backend zero‑downtime via Railway.

---

## Quickstart (when we add code)
- Initialize workspaces with PNPM and set Node version in `.node-version` (Volta or nvmrc) to LTS.
- Create Supabase project; set env values in CI and `.env.local`.
- Scaffold `mobile/` with Expo TS template; scaffold `backend/` with Fastify + TS.
- Add lint/test/precommit tooling; wire CI to run:
  - `pnpm -r build`
  - `pnpm -r test`
  - Lint + typecheck gates

---

## Appendix: Verified Commands Snapshot
The following were executed on this machine to verify test tooling is available:
- `node -v` → v22.19.0
- `node --test tmp-demo-node-test.mjs` → 1 test passed (see output above)

No persistent files were added during the check; the demo test file is removed after execution. The only file intentionally added by this task is this document.
