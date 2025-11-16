# Phase 1 Testing Guide

This guide will help you verify that your MindFlow development environment is set up correctly. We'll test in two stages:

1. **Stage 1:** Test without Supabase (basic functionality)
2. **Stage 2:** Configure Supabase and test full integration

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Stage 1: Testing Without Supabase](#stage-1-testing-without-supabase)
  - [1.1 Backend Server Test](#11-backend-server-test)
  - [1.2 Mobile App Test](#12-mobile-app-test)
  - [1.3 Code Quality Tests](#13-code-quality-tests)
- [Stage 2: Configure Supabase](#stage-2-configure-supabase)
  - [2.1 Create Supabase Project](#21-create-supabase-project)
  - [2.2 Get Credentials](#22-get-credentials)
  - [2.3 Update Environment Files](#23-update-environment-files)
  - [2.4 Apply Database Schema](#24-apply-database-schema)
- [Stage 3: Testing With Supabase](#stage-3-testing-with-supabase)
  - [3.1 Database Connection Test](#31-database-connection-test)
  - [3.2 Backend Integration Test](#32-backend-integration-test)
- [Troubleshooting](#troubleshooting)
- [Success Checklist](#success-checklist)

---

## Prerequisites

Before starting, ensure you have:

- ✅ Node.js 22+ installed (`node --version`)
- ✅ Dependencies installed (completed in Phase 1)
- ✅ iOS Simulator (Mac) or Android Studio with emulator
- ✅ Git initialized in project

---

## Stage 1: Testing Without Supabase

These tests verify your development environment works without requiring external services.

### 1.1 Backend Server Test

**Test that the Node.js Express server starts and responds to requests.**

#### Step 1: Start the Backend Server

Open a terminal and navigate to the backend directory:

```bash
cd /home/matheus/my_workspace/mindflow/backend
npm run dev
```

**Expected Output:**
```
[nodemon] 3.1.11
[nodemon] to restart at any time, enter `rs`
[nodemon] watching path(s): src/**/*
[nodemon] watching extensions: ts,tsx
[nodemon] starting `node -r ts-node/register src/server.ts`
[20:57:11] INFO: MindFlow API listening
    port: 3000
    env: "development"
```

✅ **Success:** Server is running on port 3000

❌ **Failure:** If you see errors, check:
- Is port 3000 already in use? (`lsof -i:3000`)
- Did dependencies install correctly? (Try `npm install` again)
- Any TypeScript errors? (`npm run type-check`)

#### Step 2: Test Health Endpoint

**Keep the server running.** Open a **new terminal** and run:

```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "success": true,
  "message": "MindFlow API is running",
  "timestamp": "2025-11-16T...",
  "environment": "development"
}
```

✅ **Success:** Health endpoint is working

You can also test in your browser by visiting: `http://localhost:3000/health`

#### Step 3: Stop the Server

In the terminal running the server, press `Ctrl+C` to stop it.

---

### 1.2 Mobile App Test

**Test that the React Native Expo app builds and displays the UI.**

#### Step 1: Start Expo Dev Server

Open a terminal and navigate to the mobile directory:

```bash
cd /home/matheus/my_workspace/mindflow/mobile
npm start
```

**Expected Output:**
```
Starting Metro Bundler
› Metro waiting on exp://...
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)

› Press a │ open Android
› Press i │ open iOS simulator
› Press w │ open web

› Press r │ reload app
› Press m │ toggle menu
› Press ? │ show all commands
```

✅ **Success:** Expo dev server is running

#### Step 2: Open in Simulator/Emulator

Choose one of the following options:

**Option A: iOS Simulator (Mac only)**
```bash
Press 'i' in the Expo terminal
```

**Option B: Android Emulator**
```bash
Press 'a' in the Expo terminal
```

**Option C: Web Browser (for quick test)**
```bash
Press 'w' in the Expo terminal
```

**Option D: Physical Device**
- Install "Expo Go" app from App Store/Play Store
- Scan the QR code shown in terminal

#### Step 3: Verify App Display

The app should show:

```
┌─────────────────────┐
│                     │
│     MindFlow        │  (Blue text, 32px, bold)
│                     │
│  AI-Powered         │  (Gray text, 18px)
│  Journal App        │
│                     │
│  ✅ Frontend        │  (Green text, 16px)
│  Setup Complete!    │
│                     │
└─────────────────────┘
```

✅ **Success:** App displays correctly with MindFlow branding

❌ **Failure:** If you see errors:
- Check the Metro bundler output for errors
- Try clearing cache: `npm start -- --clear`
- Check TypeScript errors: `npm run type-check`

#### Step 4: Stop the Expo Server

Press `Ctrl+C` in the Expo terminal to stop it.

---

### 1.3 Code Quality Tests

**Verify TypeScript compilation and linting.**

#### Backend Code Quality

```bash
cd /home/matheus/my_workspace/mindflow/backend

# TypeScript type checking
npm run type-check

# ESLint
ESLINT_USE_FLAT_CONFIG=false npm run lint
```

**Expected Output:**
```
# type-check: No output = success
# lint: No errors, possibly deprecation warnings (safe to ignore)
```

✅ **Success:** No TypeScript or ESLint errors

#### Mobile Code Quality

```bash
cd /home/matheus/my_workspace/mindflow/mobile

# TypeScript type checking
npm run type-check

# ESLint
ESLINT_USE_FLAT_CONFIG=false npm run lint
```

**Expected Output:**
```
# type-check: No output = success
# lint: No errors
```

✅ **Success:** No TypeScript or ESLint errors

---

## ✅ Stage 1 Complete!

If all tests passed, you've verified:
- ✅ Backend server runs and responds to HTTP requests
- ✅ Mobile app builds and displays UI correctly
- ✅ Code compiles without TypeScript errors
- ✅ Code passes linting standards

**You can develop basic UI and routing without Supabase!**

---

## Stage 2: Configure Supabase

To test database functionality and prepare for Phase 2, you'll need to set up Supabase.

### 2.1 Create Supabase Project

1. **Go to:** https://supabase.com
2. **Sign in** or **Sign up** (free tier is sufficient)
3. Click **"New Project"**
4. Fill in project details:
   - **Name:** `mindflow` (or your preferred name)
   - **Database Password:** Generate a strong password
     - ⚠️ **IMPORTANT:** Save this password! You'll need it later
   - **Region:** Choose the region closest to you
   - **Pricing Plan:** Free
5. Click **"Create new project"**
6. **Wait 2-3 minutes** for the project to initialize

---

### 2.2 Get Credentials

Once your project is ready:

#### Step 1: Get API Keys

1. In Supabase dashboard, go to **Settings** (⚙️ icon in sidebar)
2. Click **API**
3. Copy the following values:

   - **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
     - Save as: `SUPABASE_URL`

   - **anon public** key (starts with `eyJhb...`)
     - Under "Project API keys"
     - Save as: `SUPABASE_ANON_KEY`

   - **service_role secret** key (starts with `eyJhb...`)
     - Under "Project API keys"
     - ⚠️ Click "Reveal" to see it
     - Save as: `SUPABASE_SERVICE_KEY`

#### Step 2: Get Database URL

1. In Supabase dashboard, go to **Settings** → **Database**
2. Scroll down to **Connection String**
3. Select **URI** tab
4. Copy the connection string (looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres`)
5. **Replace** `[YOUR-PASSWORD]` with the password you created in Step 2.1
6. Save as: `DATABASE_URL`

---

### 2.3 Update Environment Files

Now update your `.env` files with the real credentials.

#### Update Backend .env

Open `/home/matheus/my_workspace/mindflow/backend/.env` in your editor and update:

```env
NODE_ENV=development
PORT=3000
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
OPENAI_API_KEY=sk-your-key
```

**Replace:**
- `xxxxxxxxxxxxx.supabase.co` → Your actual project URL
- `eyJhbGci...` → Your actual service key and anon key
- `YOUR_PASSWORD` → Your database password

⚠️ **Note:** `OPENAI_API_KEY` is not needed until Phase 6 (you can leave it as-is)

#### Update Mobile .env

Open `/home/matheus/my_workspace/mindflow/mobile/.env` in your editor and update:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Replace:**
- `xxxxxxxxxxxxx.supabase.co` → Your actual project URL
- `eyJhbGci...` → Your actual anon key

#### Verify .env Files

Run this to check your backend `.env` is loaded correctly:

```bash
cd /home/matheus/my_workspace/mindflow/backend
node -e "require('dotenv').config(); console.log('SUPABASE_URL:', process.env.SUPABASE_URL)"
```

**Expected:** Should print your Supabase URL, not `https://your-project.supabase.co`

---

### 2.4 Apply Database Schema

Now create the database tables in Supabase.

#### Step 1: Copy Schema SQL

```bash
cd /home/matheus/my_workspace/mindflow
cat database/schema.sql
```

Copy the **entire output** to your clipboard.

#### Step 2: Run in Supabase SQL Editor

1. Go to Supabase dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **"New query"**
4. **Paste** the schema SQL you copied
5. Click **"Run"** (or press `Ctrl+Enter`)

**Expected:**
```
Success. No rows returned
```

#### Step 3: Verify Tables Created

1. In Supabase dashboard, click **Table Editor**
2. You should see these tables:
   - `entries`
   - `user_preferences`
   - `ai_insights`

✅ **Success:** Database schema applied!

---

## Stage 3: Testing With Supabase

Now test that your application can connect to Supabase.

### 3.1 Database Connection Test

Let's create a simple test script to verify database connectivity.

#### Step 1: Create Test Script

```bash
cd /home/matheus/my_workspace/mindflow/backend
```

Create a file `src/test-db-connection.ts`:

```typescript
import { supabase } from './database/supabase';

async function testConnection() {
  console.log('🔍 Testing Supabase connection...\n');

  try {
    // Test 1: Query the entries table
    console.log('Test 1: Querying entries table...');
    const { data: entries, error: entriesError } = await supabase
      .from('entries')
      .select('*')
      .limit(1);

    if (entriesError) {
      console.error('❌ Entries query failed:', entriesError.message);
      process.exit(1);
    }

    console.log('✅ Entries table accessible');
    console.log(`   Found ${entries?.length || 0} entries\n`);

    // Test 2: Query the user_preferences table
    console.log('Test 2: Querying user_preferences table...');
    const { data: prefs, error: prefsError } = await supabase
      .from('user_preferences')
      .select('*')
      .limit(1);

    if (prefsError) {
      console.error('❌ User preferences query failed:', prefsError.message);
      process.exit(1);
    }

    console.log('✅ User preferences table accessible');
    console.log(`   Found ${prefs?.length || 0} preferences\n`);

    // Test 3: Query the ai_insights table
    console.log('Test 3: Querying ai_insights table...');
    const { data: insights, error: insightsError } = await supabase
      .from('ai_insights')
      .select('*')
      .limit(1);

    if (insightsError) {
      console.error('❌ AI insights query failed:', insightsError.message);
      process.exit(1);
    }

    console.log('✅ AI insights table accessible');
    console.log(`   Found ${insights?.length || 0} insights\n`);

    console.log('🎉 All database tests passed!');
    console.log('✅ Supabase is configured correctly\n');

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

testConnection();
```

#### Step 2: Run the Test

```bash
npx ts-node src/test-db-connection.ts
```

**Expected Output:**
```
🔍 Testing Supabase connection...

Test 1: Querying entries table...
✅ Entries table accessible
   Found 0 entries

Test 2: Querying user_preferences table...
✅ User preferences table accessible
   Found 0 preferences

Test 3: Querying ai_insights table...
✅ AI insights table accessible
   Found 0 insights

🎉 All database tests passed!
✅ Supabase is configured correctly
```

✅ **Success:** Backend can connect to Supabase database!

❌ **Failure:** If you see errors:
- Check `.env` file has correct `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
- Verify schema was applied in Supabase SQL Editor
- Check for typos in environment variables

#### Step 3: Clean Up (Optional)

After testing, you can delete the test file:

```bash
rm src/test-db-connection.ts
```

---

### 3.2 Backend Integration Test

Test that the backend server works with Supabase configured.

```bash
cd /home/matheus/my_workspace/mindflow/backend
npm run dev
```

In another terminal:

```bash
curl http://localhost:3000/health
```

**Expected:** Same successful response as Stage 1

✅ **Success:** Backend server runs with Supabase configured

---

## ✅ Stage 2 & 3 Complete!

If all tests passed, you've verified:
- ✅ Supabase project created and configured
- ✅ Environment variables set correctly
- ✅ Database schema applied successfully
- ✅ Backend can connect to Supabase database
- ✅ All tables are accessible

**You're now ready to start Phase 2: User Authentication!**

---

## Troubleshooting

### Issue: Port 3000 Already in Use

**Error:** `EADDRINUSE: address already in use :::3000`

**Solution:**
```bash
# Find and kill the process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm run dev
```

---

### Issue: Expo Won't Start

**Error:** Various Expo errors

**Solution:**
```bash
cd mobile
# Clear Expo cache
npx expo start --clear

# If that doesn't work, clear node_modules
rm -rf node_modules .expo
npm install
npx expo start
```

---

### Issue: "Cannot find module 'ts-node'"

**Error:** `Cannot find module 'ts-node/register'`

**Solution:**
```bash
cd backend
npm install --save-dev ts-node
```

---

### Issue: Database Connection Test Fails

**Error:** `Invalid API key` or `Could not connect to database`

**Solution:**
1. Verify `.env` file has no extra spaces or quotes around values
2. Check that you're using `SUPABASE_SERVICE_KEY` (not `SUPABASE_ANON_KEY`) in backend
3. Verify your Supabase project is active (not paused)
4. Try regenerating API keys in Supabase dashboard

---

### Issue: ESLint Errors About Config

**Error:** `ESLint couldn't find eslint.config.js`

**Solution:**
```bash
# Use the legacy config flag
ESLINT_USE_FLAT_CONFIG=false npm run lint
```

---

### Issue: Table Not Found in Supabase

**Error:** `relation "entries" does not exist`

**Solution:**
1. Go to Supabase SQL Editor
2. Re-run the schema from `database/schema.sql`
3. Verify tables appear in Table Editor
4. Check for any error messages in SQL Editor

---

## Success Checklist

### Stage 1: Without Supabase
- [ ] Backend server starts without errors
- [ ] Health endpoint returns success response
- [ ] Mobile app displays MindFlow UI
- [ ] TypeScript compiles without errors (backend & mobile)
- [ ] ESLint passes without errors (backend & mobile)

### Stage 2 & 3: With Supabase
- [ ] Supabase project created
- [ ] API credentials copied correctly
- [ ] Backend `.env` updated with real credentials
- [ ] Mobile `.env` updated with real credentials
- [ ] Database schema applied in Supabase SQL Editor
- [ ] All 3 tables visible in Supabase Table Editor
- [ ] Database connection test passes
- [ ] Backend server runs with Supabase configured

---

## Next Steps

Once all tests pass, you're ready to:

1. **Commit your progress** (don't commit `.env` files!)
   ```bash
   git add .
   git commit -m "Complete Phase 1: Foundation & Infrastructure Setup"
   ```

2. **Review Phase 2 documentation:**
   - Read `docs/phases/phase-02-detailed.md`
   - Understand authentication requirements

3. **Start Phase 2:** User Authentication System

---

## Questions or Issues?

If you encounter issues not covered in this guide:

1. Check the project's `.claude/CLAUDE.md` for general instructions
2. Review the detailed Phase 1 guide: `docs/phases/phase-01-detailed.md`
3. Check environment variable values (no extra spaces, quotes, or line breaks)
4. Verify all dependencies are installed (`npm install` in both directories)

Good luck! 🚀
