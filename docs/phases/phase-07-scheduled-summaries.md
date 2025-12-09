# Phase 7: Scheduled AI Summaries

## Overview

Automatically generate AI summaries for users on a schedule:
- **Weekly summaries**: Every Sunday at midnight UTC
- **Monthly summaries**: 1st of each month at midnight UTC

These summaries appear in the EntryListPage as cards at the top of each week/month section.

---

## Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│    pg_cron      │────▶│  generate-scheduled  │────▶│   ai_insights   │
│  (scheduler)    │     │   Edge Function      │     │     (table)     │
└─────────────────┘     └──────────────────────┘     └─────────────────┘
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │      OpenAI API      │
                        └──────────────────────┘
```

---

## Prerequisites

Before implementing, fix a bug in the existing `generate-summary` function:

**File:** `supabase/functions/generate-summary/index.ts`

The function incorrectly uses `created_at` for date filtering. Change to `entry_date`:

```diff
- .gte('created_at', startDate.toISOString())
- .lte('created_at', endDate.toISOString())
+ .gte('entry_date', startDate.toISOString().split('T')[0])
+ .lte('entry_date', endDate.toISOString().split('T')[0])
```

---

## Implementation Steps

### Step 1: Update Schema

Add period tracking columns to `ai_insights` table. Follow the project's database workflow:

**Step 1a: Update the schema file (source of truth)**

**File:** `supabase/schemas/03_ai_insights.sql`

Add these columns to the table definition:

```sql
-- Add after the existing columns in CREATE TABLE
    period_start DATE,
    period_end DATE,
```

Add this index after the existing indexes:

```sql
-- Create composite index for efficient period lookups
CREATE INDEX IF NOT EXISTS idx_ai_insights_period
ON ai_insights(user_id, insight_type, period_start);
```

**Step 1b: Create a migration for the delta changes**

```bash
npx supabase migration new add_period_tracking
```

**Step 1c: Add delta SQL to the generated migration file**

**File:** `supabase/migrations/XXXXXX_add_period_tracking.sql`

```sql
-- Add period tracking columns for week/month identification
ALTER TABLE ai_insights ADD COLUMN IF NOT EXISTS period_start DATE;
ALTER TABLE ai_insights ADD COLUMN IF NOT EXISTS period_end DATE;

-- Create composite index for efficient period lookups
CREATE INDEX IF NOT EXISTS idx_ai_insights_period
ON ai_insights(user_id, insight_type, period_start);
```

**Step 1d: Apply the migration**

```bash
npx supabase db push
```

---

### Step 2: Add Monthly Summary Type

Update `supabase/functions/generate-summary/index.ts` to support monthly summaries.

**Add the monthly prompt after the existing prompts:**

```typescript
const MONTHLY_SUMMARY_PROMPT = `Analyze these journal entries from the past month and provide comprehensive insights.

Return ONLY a JSON object (no markdown formatting):
{
  "summary": "<4-5 sentence overview of the month highlighting key events and emotional journey>",
  "keyThemes": ["<theme1>", "<theme2>", "<theme3>", "<theme4>"],
  "overallMood": "<overall emotional arc - e.g., 'Started anxious, grew more confident'>",
  "insights": ["<major behavioral pattern>", "<growth observation>", "<actionable recommendation>"],
  "highlights": ["<positive moment worth remembering>", "<personal achievement>"],
  "challenges": ["<difficulty faced>", "<area that needs attention>"]
}

Entries:
`;
```

**Update the type handling (around line 99):**

```typescript
if (type === 'monthly') {
  // First day of the target month
  startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
  startDate.setHours(0, 0, 0, 0);
  // Last day of the target month
  endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
  endDate.setHours(23, 59, 59, 999);
  insightType = 'monthly_summary';
  prompt = MONTHLY_SUMMARY_PROMPT;
} else if (type === 'weekly') {
  // existing weekly logic...
} else {
  // existing daily logic...
}
```

**Update the entries query to use `entry_date`:**

```typescript
const { data: entries, error: entriesError } = await supabase
  .from('entries')
  .select('content, entry_date, mood, sentiment_score')
  .gte('entry_date', startDate.toISOString().split('T')[0])
  .lte('entry_date', endDate.toISOString().split('T')[0])
  .order('entry_date', { ascending: true });
```

---

### Step 3: Create Scheduled Summary Edge Function

**File:** `supabase/functions/generate-scheduled-summaries/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseServiceClient } from '../_shared/supabase.ts';

interface ScheduleRequest {
  type: 'weekly' | 'monthly';
  secret: string;
}

interface SummaryContent {
  summary: string;
  keyThemes: string[];
  overallMood: string;
  insights: string[];
  entryCount: number;
  highlights?: string[];
  challenges?: string[];
}

const WEEKLY_SUMMARY_PROMPT = `Analyze these journal entries from the past week and provide insights.

Return ONLY a JSON object (no markdown formatting):
{
  "summary": "<3-4 sentence overview of the week>",
  "keyThemes": ["<theme1>", "<theme2>", "<theme3>"],
  "overallMood": "<overall emotional trajectory>",
  "insights": ["<pattern1>", "<pattern2>", "<growth observation>"]
}

Entries:
`;

const MONTHLY_SUMMARY_PROMPT = `Analyze these journal entries from the past month and provide comprehensive insights.

Return ONLY a JSON object (no markdown formatting):
{
  "summary": "<4-5 sentence overview of the month highlighting key events and emotional journey>",
  "keyThemes": ["<theme1>", "<theme2>", "<theme3>", "<theme4>"],
  "overallMood": "<overall emotional arc - e.g., 'Started anxious, grew more confident'>",
  "insights": ["<major behavioral pattern>", "<growth observation>", "<actionable recommendation>"],
  "highlights": ["<positive moment worth remembering>", "<personal achievement>"],
  "challenges": ["<difficulty faced>", "<area that needs attention>"]
}

Entries:
`;

// Simple delay function for rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

serve(async (req) => {
  try {
    const { type, secret } = await req.json() as ScheduleRequest;

    // Verify cron secret
    const cronSecret = Deno.env.get('CRON_SECRET');
    if (!cronSecret || secret !== cronSecret) {
      console.error('Unauthorized: invalid or missing CRON_SECRET');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client (bypasses RLS)
    const supabase = createSupabaseServiceClient();

    // Calculate period boundaries
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date;
    let insightType: string;

    if (type === 'weekly') {
      // Previous 7 days (Sunday runs for the past week)
      periodEnd = new Date(now);
      periodEnd.setDate(periodEnd.getDate() - 1); // Yesterday
      periodEnd.setHours(23, 59, 59, 999);

      periodStart = new Date(periodEnd);
      periodStart.setDate(periodStart.getDate() - 6); // 7 days total
      periodStart.setHours(0, 0, 0, 0);

      insightType = 'weekly_summary';
    } else {
      // Previous month (1st runs for last month)
      periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth(), 0); // Last day of prev month
      periodEnd.setHours(23, 59, 59, 999);

      insightType = 'monthly_summary';
    }

    const periodStartStr = periodStart.toISOString().split('T')[0];
    const periodEndStr = periodEnd.toISOString().split('T')[0];

    console.log(`Generating ${type} summaries for period: ${periodStartStr} to ${periodEndStr}`);

    // Get unique users with entries in the period
    const { data: userEntries, error: userError } = await supabase
      .from('entries')
      .select('user_id')
      .gte('entry_date', periodStartStr)
      .lte('entry_date', periodEndStr);

    if (userError) {
      console.error('Failed to fetch users:', userError);
      throw userError;
    }

    const uniqueUserIds = [...new Set(userEntries?.map(e => e.user_id) || [])];
    console.log(`Found ${uniqueUserIds.length} users with entries`);

    const results = {
      processed: 0,
      skipped: 0,
      errors: 0,
      details: [] as string[],
    };

    // Process each user with rate limiting
    for (let i = 0; i < uniqueUserIds.length; i++) {
      const userId = uniqueUserIds[i];

      try {
        // Check if summary already exists for this period
        const { data: existing } = await supabase
          .from('ai_insights')
          .select('id')
          .eq('user_id', userId)
          .eq('insight_type', insightType)
          .eq('period_start', periodStartStr)
          .maybeSingle();

        if (existing) {
          results.skipped++;
          results.details.push(`User ${userId.slice(0, 8)}...: skipped (exists)`);
          continue;
        }

        // Get user's entries for the period
        const { data: entries, error: entriesError } = await supabase
          .from('entries')
          .select('content, entry_date, mood, sentiment_score')
          .eq('user_id', userId)
          .gte('entry_date', periodStartStr)
          .lte('entry_date', periodEndStr)
          .order('entry_date', { ascending: true });

        if (entriesError) throw entriesError;

        if (!entries || entries.length === 0) {
          results.skipped++;
          continue;
        }

        // Generate summary via OpenAI
        const summary = await generateSummary(entries, type);
        summary.entryCount = entries.length;

        // Store the summary
        const { error: insertError } = await supabase.from('ai_insights').insert({
          user_id: userId,
          insight_type: insightType,
          content: summary,
          period_start: periodStartStr,
          period_end: periodEndStr,
          expires_at: null, // Scheduled summaries don't expire
        });

        if (insertError) throw insertError;

        results.processed++;
        results.details.push(`User ${userId.slice(0, 8)}...: success (${entries.length} entries)`);

        // Rate limit: wait 500ms between OpenAI calls to avoid hitting limits
        if (i < uniqueUserIds.length - 1) {
          await delay(500);
        }
      } catch (err) {
        console.error(`Error processing user ${userId}:`, err);
        results.errors++;
        results.details.push(`User ${userId.slice(0, 8)}...: error - ${err}`);
      }
    }

    console.log('Summary generation complete:', results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Scheduled summary error:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

async function generateSummary(
  entries: Array<{ content: string; entry_date: string; mood: string | null; sentiment_score: number | null }>,
  type: 'weekly' | 'monthly'
): Promise<SummaryContent> {
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const prompt = type === 'monthly' ? MONTHLY_SUMMARY_PROMPT : WEEKLY_SUMMARY_PROMPT;

  // Format entries for the prompt
  const formattedEntries = entries
    .map((e) => {
      const mood = e.mood ? ` [Mood: ${e.mood}]` : '';
      const sentiment = e.sentiment_score !== null ? ` [Sentiment: ${e.sentiment_score.toFixed(2)}]` : '';
      // Truncate long entries to avoid token limits
      const content = e.content.length > 400 ? e.content.substring(0, 400) + '...' : e.content;
      return `${e.entry_date}${mood}${sentiment}:\n${content}`;
    })
    .join('\n\n---\n\n');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a thoughtful journal analysis assistant. Provide warm, insightful summaries that help users reflect on their experiences. Return ONLY valid JSON, no markdown.',
        },
        {
          role: 'user',
          content: prompt + formattedEntries,
        },
      ],
      temperature: 0.5,
      max_tokens: type === 'monthly' ? 800 : 600,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('OpenAI API error:', errorData);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices[0]?.message?.content || '';

  // Clean up potential markdown formatting
  const cleaned = text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (parseError) {
    console.error('Failed to parse OpenAI response:', text);
    throw new Error('Failed to parse AI response as JSON');
  }
}
```

---

### Step 4: Enable pg_cron and pg_net Extensions

**Via Supabase Dashboard:**

1. Go to **Database** → **Extensions**
2. Search for and enable:
   - `pg_cron` - For scheduling jobs
   - `pg_net` - For making HTTP requests from SQL

**Or via migration:**

```sql
-- Enable extensions (run once)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
```

---

### Step 5: Set Up Secrets

```bash
# Generate a secure random secret for cron authentication
CRON_SECRET=$(openssl rand -hex 32)
echo "Save this secret: $CRON_SECRET"

# Set secrets in Supabase
npx supabase secrets set CRON_SECRET=$CRON_SECRET
npx supabase secrets set OPENAI_API_KEY=sk-your-key-here
```

---

### Step 6: Create Cron Jobs

Run this SQL in the Supabase SQL Editor. Replace `YOUR_PROJECT_REF` with your project reference and `YOUR_CRON_SECRET` with the secret you generated.

```sql
-- Weekly summaries: Every Sunday at 00:05 UTC
-- (5 min after midnight to avoid edge cases)
SELECT cron.schedule(
  'generate-weekly-summaries',
  '5 0 * * 0',
  $$
  SELECT extensions.http_post(
    'https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-scheduled-summaries',
    '{"type": "weekly", "secret": "YOUR_CRON_SECRET"}',
    'application/json'
  );
  $$
);

-- Monthly summaries: 1st of each month at 00:05 UTC
SELECT cron.schedule(
  'generate-monthly-summaries',
  '5 0 1 * *',
  $$
  SELECT extensions.http_post(
    'https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-scheduled-summaries',
    '{"type": "monthly", "secret": "YOUR_CRON_SECRET"}',
    'application/json'
  );
  $$
);

-- Verify jobs were created
SELECT * FROM cron.job;
```

**Note:** The `http_post` function comes from `pg_net` extension. If using older Supabase versions, you may need `net.http_post` instead.

---

### Step 7: Create Summary Service

**File:** `mobile/src/services/summaryService.ts`

```typescript
import { supabase } from './supabase';
import { startOfWeek, format } from 'date-fns';

export interface PeriodSummary {
  id: string;
  summary: string;
  keyThemes: string[];
  overallMood: string;
  insights: string[];
  entryCount: number;
  periodStart: string;
  periodEnd: string;
  highlights?: string[];
  challenges?: string[];
}

/**
 * Get weekly summary for a specific week
 * @param weekDate - Any date within the desired week
 */
export async function getWeeklySummary(weekDate: Date): Promise<PeriodSummary | null> {
  const weekStart = startOfWeek(weekDate, { weekStartsOn: 0 }); // Sunday
  const periodStartStr = format(weekStart, 'yyyy-MM-dd');

  const { data, error } = await supabase
    .from('ai_insights')
    .select('*')
    .eq('insight_type', 'weekly_summary')
    .eq('period_start', periodStartStr)
    .maybeSingle();

  if (error) {
    console.error('Error fetching weekly summary:', error);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    ...data.content,
    periodStart: data.period_start,
    periodEnd: data.period_end,
  };
}

/**
 * Get monthly summary for a specific month
 * @param year - Full year (e.g., 2024)
 * @param month - Month index (0-11, where 0 = January)
 */
export async function getMonthlySummary(year: number, month: number): Promise<PeriodSummary | null> {
  const periodStartStr = format(new Date(year, month, 1), 'yyyy-MM-dd');

  const { data, error } = await supabase
    .from('ai_insights')
    .select('*')
    .eq('insight_type', 'monthly_summary')
    .eq('period_start', periodStartStr)
    .maybeSingle();

  if (error) {
    console.error('Error fetching monthly summary:', error);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    ...data.content,
    periodStart: data.period_start,
    periodEnd: data.period_end,
  };
}

/**
 * Get all summaries for entries currently displayed
 */
export async function getSummariesForPeriods(
  weekStarts: string[],
  monthStarts: string[]
): Promise<{
  weekly: Map<string, PeriodSummary>;
  monthly: Map<string, PeriodSummary>;
}> {
  const weekly = new Map<string, PeriodSummary>();
  const monthly = new Map<string, PeriodSummary>();

  if (weekStarts.length === 0 && monthStarts.length === 0) {
    return { weekly, monthly };
  }

  // Fetch all relevant summaries in one query
  const { data, error } = await supabase
    .from('ai_insights')
    .select('*')
    .or(
      `and(insight_type.eq.weekly_summary,period_start.in.(${weekStarts.map(s => `"${s}"`).join(',')})),` +
      `and(insight_type.eq.monthly_summary,period_start.in.(${monthStarts.map(s => `"${s}"`).join(',')}))`
    );

  if (error) {
    console.error('Error fetching summaries:', error);
    return { weekly, monthly };
  }

  for (const item of data || []) {
    const summary: PeriodSummary = {
      id: item.id,
      ...item.content,
      periodStart: item.period_start,
      periodEnd: item.period_end,
    };

    if (item.insight_type === 'weekly_summary') {
      weekly.set(item.period_start, summary);
    } else {
      monthly.set(item.period_start, summary);
    }
  }

  return { weekly, monthly };
}
```

---

### Step 8: Update EntryListPage

Update `mobile/src/pages/entries/EntryListPage.tsx` to fetch and display summaries.

**Add imports and state:**

```typescript
import { useState, useEffect, useMemo } from 'react';
import { startOfWeek, startOfMonth, format } from 'date-fns';
import { getSummariesForPeriods, PeriodSummary } from '../../services/summaryService';

// Inside component:
const [weeklySummaries, setWeeklySummaries] = useState<Map<string, PeriodSummary>>(new Map());
const [monthlySummaries, setMonthlySummaries] = useState<Map<string, PeriodSummary>>(new Map());

// Calculate unique periods from entries
const { weekStarts, monthStarts } = useMemo(() => {
  const weeks = new Set<string>();
  const months = new Set<string>();

  entries.forEach(entry => {
    const date = new Date(entry.entry_date + 'T00:00:00');
    weeks.add(format(startOfWeek(date, { weekStartsOn: 0 }), 'yyyy-MM-dd'));
    months.add(format(startOfMonth(date), 'yyyy-MM-dd'));
  });

  return {
    weekStarts: Array.from(weeks),
    monthStarts: Array.from(months),
  };
}, [entries]);

// Fetch summaries when periods change
useEffect(() => {
  if (weekStarts.length > 0 || monthStarts.length > 0) {
    getSummariesForPeriods(weekStarts, monthStarts).then(({ weekly, monthly }) => {
      setWeeklySummaries(weekly);
      setMonthlySummaries(monthly);
    });
  }
}, [weekStarts, monthStarts]);

// Helper to get week key for a date
const getWeekKey = (date: Date) => format(startOfWeek(date, { weekStartsOn: 0 }), 'yyyy-MM-dd');
const getMonthKey = (date: Date) => format(startOfMonth(date), 'yyyy-MM-dd');
```

**Update the AISummaryCard usage:**

```tsx
{/* Monthly AI Summary Card */}
<AISummaryCard
  type="month"
  period={formatMonthHeader(entryDate)}
  summary={monthlySummaries.get(getMonthKey(entryDate))?.summary}
  onClick={() => {/* Navigate to full summary view */}}
/>

{/* Weekly AI Summary Card */}
<AISummaryCard
  type="week"
  period={formatWeekHeader(entryDate)}
  summary={weeklySummaries.get(getWeekKey(entryDate))?.summary}
  onClick={() => {/* Navigate to full summary view */}}
/>
```

---

## Deployment Checklist

1. [ ] Fix `generate-summary` to use `entry_date` instead of `created_at`
2. [ ] Add monthly summary prompt to `generate-summary`
3. [ ] Update schema file: `supabase/schemas/03_ai_insights.sql`
4. [ ] Create migration: `npx supabase migration new add_period_tracking`
5. [ ] Add delta SQL to migration file
6. [ ] Apply migration: `npx supabase db push`
7. [ ] Create `generate-scheduled-summaries` Edge Function
8. [ ] Deploy functions: `npx supabase functions deploy`
9. [ ] Generate and set `CRON_SECRET`
10. [ ] Enable `pg_cron` and `pg_net` extensions
11. [ ] Create cron jobs via SQL Editor
12. [ ] Create `summaryService.ts`
13. [ ] Update `EntryListPage` to fetch/display summaries
14. [ ] Test manually (see below)

---

## Testing

### Manual Trigger

Test the scheduled function before waiting for cron:

```bash
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-scheduled-summaries' \
  -H 'Content-Type: application/json' \
  -d '{"type": "weekly", "secret": "YOUR_CRON_SECRET"}'
```

### Check Function Logs

```bash
npx supabase functions logs generate-scheduled-summaries
```

### Verify Cron Jobs

```sql
-- List all scheduled jobs
SELECT jobid, jobname, schedule, command FROM cron.job;

-- Check recent job runs
SELECT jobid, runid, job_pid, status, return_message, start_time, end_time
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 20;

-- Manually trigger a job for testing
SELECT cron.schedule('test-weekly-now', 'NOW', $$ ... $$);
```

### Verify Summaries Were Created

```sql
SELECT id, user_id, insight_type, period_start, period_end, created_at
FROM ai_insights
WHERE insight_type IN ('weekly_summary', 'monthly_summary')
ORDER BY created_at DESC
LIMIT 10;
```

---

## Cost Estimation

**OpenAI API (GPT-3.5-turbo):**
- Input: ~$0.0005/1K tokens
- Output: ~$0.0015/1K tokens
- Per summary: ~800 input + 300 output tokens ≈ $0.001

**For 100 active users:**
- Weekly: 100 × 4 weeks × $0.001 = ~$0.40/month
- Monthly: 100 × $0.001 = ~$0.10/month
- **Total: ~$0.50/month**

**Supabase:**
- Edge Functions: Free tier includes 500K invocations/month
- pg_cron: Available on Pro plan ($25/month) and above

---

## Troubleshooting

### Cron job not running
- Check `cron.job` table to verify job exists
- Check `cron.job_run_details` for error messages
- Verify pg_cron extension is enabled
- Ensure function URL is correct

### Summaries not appearing
- Check `ai_insights` table for records
- Verify `period_start` format matches query format (YYYY-MM-DD)
- Check browser console for API errors

### Rate limit errors from OpenAI
- Increase delay between calls (currently 500ms)
- Consider upgrading OpenAI plan
- Process users in smaller batches

---

## Future Enhancements

- [ ] User preference to opt-out of scheduled summaries
- [ ] Push notification when new summary available
- [ ] Yearly summary (January 1st)
- [ ] Summary comparison view (this week vs last week)
- [ ] Export summaries as PDF
- [ ] Regenerate summary on-demand
- [ ] Custom summary schedule per user
