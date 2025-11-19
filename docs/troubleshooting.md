# Troubleshooting Guide

Common issues and solutions for MindFlow development.

## Supabase Connection Errors

**Error:** `Invalid API key or project URL`

**Solutions:**
- Check `.env` has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart Vite dev server after changing `.env`: `npm run dev`
- Verify keys at: https://app.supabase.com/project/_/settings/api

---

## Vite Port Conflicts

**Error:** `Port 5173 is already in use`

**Solutions:**
- Kill existing process: `lsof -ti:5173 | xargs kill`
- Or change port in `vite.config.ts`: `server: { port: 3001 }`

---

## TypeScript Strict Mode Errors

**Error:** `Object is possibly 'null' or 'undefined'`

**Solutions:**
- Add null checks: `if (!entry) return null;`
- Use optional chaining: `entry?.mood`
- Provide default values: `entry ?? {}`

---

## Ionic Routing Issues

**Error:** Page doesn't navigate or shows blank screen

**Solutions:**
- Ensure page component is wrapped in `<IonPage>`
- Check route path matches exactly (case-sensitive)
- Use `exact` prop on routes: `<Route exact path="/entries">`

---

## Cypress Tests Failing

**Error:** `Timed out retrying after 10000ms`

**Solutions:**
- Ensure dev server is running on correct port (check `cypress.config.ts` baseUrl)
- Increase timeout in `cypress.config.ts`: `defaultCommandTimeout: 10000`
- Add explicit waits: `cy.wait(1000)` or `cy.get('[data-testid="entry"]', { timeout: 10000 })`

---

## RLS Policy Blocking Requests

**Error:** `new row violates row-level security policy`

**Solutions:**
- Verify user is authenticated: `await supabase.auth.getUser()`
- Check RLS policy allows operation (SELECT, INSERT, UPDATE, DELETE)
- Ensure `user_id` matches `auth.uid()` in RLS policy

---

## Build Errors

**Error:** `Build failed with TypeScript errors`

**Solutions:**
- Run type check: `npx tsc --noEmit`
- Fix type errors or add `// @ts-ignore` (temporary)
- Ensure all dependencies are installed: `npm install`

---

## Getting Help

- **Ionic Docs**: https://ionicframework.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **React Docs**: https://react.dev
- **Vite Docs**: https://vitejs.dev
- **Cypress Docs**: https://docs.cypress.io

---

**Note:** Add new issues to this document as you encounter them.
