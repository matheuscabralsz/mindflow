# Phase 7: Scheduled AI Summaries

## Overview

Automatically generate AI summaries for users on a schedule:
- **Weekly summaries**: Every Sunday at midnight
- **Monthly summaries**: 1st of each month at midnight

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

## Implementation Steps

### Step 1: Update Schema

Add period tracking to `ai_insights` table for precise week/month identification.

**File:** `supabase/migrations/XXXXXX_add_period_tracking.sql`

```sql
-- Add period tracking columns
ALTER TABLE ai_insights ADD COLUMN IF NOT EXISTS period_start DATE;
ALTER TABLE ai_insights ADD COLUMN IF NOT EXISTS period_end DATE;

-- Create index for period lookups
CREATE INDEX IF NOT EXISTS idx_ai_insights_period
ON ai_insights(user_id, insight_type, period_start, period_end);

-- Add service role policy for scheduled jobs
DROP POLICY IF EXISTS "Service role can manage all insights" ON ai_insights;
CREATE POLICY "Service role can manage all insights"
    ON ai_insights FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
```

---

### Step 2: Add Monthly Summary Type to Existing Function

**File:** `supabase/functions/generate-summary/index.ts`

Add to the existing prompts:

```typescript
const MONTHLY_SUMMARY_PROMPT = `Analyze these journal entries from the past month and provide comprehensive insights.

Return ONLY a JSON object (no markdown formatting):
{
  "summary": "<4-5 sentence overview of the month>",
  "keyThemes": ["<theme1>", "<theme2>", "<theme3>", "<theme4>"],
  "overallMood": "<overall emotional arc for the month>",
  "insights": ["<major pattern>", "<growth observation>", "<recommendation>"],
  "highlights": ["<positive moment>", "<achievement>"],
  "challenges": ["<difficulty faced>", "<area for growth>"]
}

Entries:
`;
```

Update the type handling in the function:

```typescript
if (type === 'monthly') {
  // Start from first day of month
  startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
  startDate.setHours(0, 0, 0, 0);
  // End at last day of month
  endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
  endDate.setHours(23, 59, 59, 999);
  insightType = 'monthly_summary';
  prompt = MONTHLY_SUMMARY_PROMPT;
} else if (type === 'weekly') {
  // existing weekly logic
}
```

---

### Step 3: Create Scheduled Summary Edge Function

**File:** `supabase/functions/generate-scheduled-summaries/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface ScheduleRequest {
  type: 'weekly' | 'monthly';
  secret: string;
}

serve(async (req) => {
  try {
    // Verify request is from pg_cron (internal)
    const { type, secret } = await req.json() as ScheduleRequest;

    const cronSecret = Deno.env.get('CRON_SECRET');
    if (secret !== cronSecret) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get all users who have entries in the relevant period
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date;

    if (type === 'weekly') {
      // Last 7 days
      periodEnd = new Date(now);
      periodEnd.setHours(23, 59, 59, 999);
      periodStart = new Date(now);
      periodStart.setDate(periodStart.getDate() - 7);
      periodStart.setHours(0, 0, 0, 0);
    } else {
      // Previous month
      periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      periodEnd.setHours(23, 59, 59, 999);
    }

    // Get unique users with entries in period
    const { data: userEntries, error: userError } = await supabase
      .from('entries')
      .select('user_id')
      .gte('entry_date', periodStart.toISOString().split('T')[0])
      .lte('entry_date', periodEnd.toISOString().split('T')[0]);

    if (userError) throw userError;

    const uniqueUserIds = [...new Set(userEntries?.map(e => e.user_id) || [])];

    console.log(`Processing ${type} summaries for ${uniqueUserIds.length} users`);

    const results = {
      processed: 0,
      skipped: 0,
      errors: 0,
    };

    // Process each user
    for (const userId of uniqueUserIds) {
      try {
        // Check if summary already exists for this period
        const { data: existing } = await supabase
          .from('ai_insights')
          .select('id')
          .eq('user_id', userId)
          .eq('insight_type', `${type}_summary`)
          .eq('period_start', periodStart.toISOString().split('T')[0])
          .single();

        if (existing) {
          results.skipped++;
          continue;
        }

        // Get user's entries for the period
        const { data: entries } = await supabase
          .from('entries')
          .select('content, entry_date, mood, sentiment_score')
          .eq('user_id', userId)
          .gte('entry_date', periodStart.toISOString().split('T')[0])
          .lte('entry_date', periodEnd.toISOString().split('T')[0])
          .order('entry_date', { ascending: true });

        if (!entries || entries.length === 0) {
          results.skipped++;
          continue;
        }

        // Generate summary via OpenAI
        const summary = await generateSummary(entries, type);

        // Store the summary
        await supabase.from('ai_insights').insert({
          user_id: userId,
          insight_type: `${type}_summary`,
          content: summary,
          period_start: periodStart.toISOString().split('T')[0],
          period_end: periodEnd.toISOString().split('T')[0],
          expires_at: null, // Scheduled summaries don't expire
        });

        results.processed++;
      } catch (err) {
        console.error(`Error processing user ${userId}:`, err);
        results.errors++;
      }
    }

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

async function generateSummary(entries: any[], type: 'weekly' | 'monthly') {
  const openaiKey = Deno.env.get('OPENAI_API_KEY');

  const prompt = type === 'monthly'
    ? MONTHLY_PROMPT
    : WEEKLY_PROMPT;

  // Format entries for the prompt
  const formattedEntries = entries
    .map((e, i) => {
      const mood = e.mood ? ` [Mood: ${e.mood}]` : '';
      return `${e.entry_date}${mood}: ${e.content.substring(0, 300)}`;
    })
    .join('\n\n');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a thoughtful journal analyst. Return only valid JSON.' },
        { role: 'user', content: prompt + formattedEntries },
      ],
      temperature: 0.5,
      max_tokens: type === 'monthly' ? 800 : 600,
    }),
  });

  const data = await response.json();
  const text = data.choices[0]?.message?.content || '';
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  return JSON.parse(cleaned);
}

const WEEKLY_PROMPT = `Analyze these journal entries from the past week...
(same as existing)`;

const MONTHLY_PROMPT = `Analyze these journal entries from the past month...
(same as above)`;
```

---

### Step 4: Enable pg_cron and Create Jobs

**Option A: Via Supabase Dashboard**

1. Go to **Database** → **Extensions**
2. Enable `pg_cron`
3. Go to **SQL Editor** and run:

```sql
-- Weekly summary: Every Sunday at 00:00 UTC
SELECT cron.schedule(
  'weekly-summaries',
  '0 0 * * 0',  -- Every Sunday at midnight
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-scheduled-summaries',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object('type', 'weekly', 'secret', current_setting('app.settings.cron_secret'))
  );
  $$
);

-- Monthly summary: 1st of each month at 00:00 UTC
SELECT cron.schedule(
  'monthly-summaries',
  '0 0 1 * *',  -- First day of month at midnight
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-scheduled-summaries',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object('type', 'monthly', 'secret', current_setting('app.settings.cron_secret'))
  );
  $$
);
```

**Option B: Via Migration File**

**File:** `supabase/migrations/XXXXXX_setup_cron_jobs.sql`

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Note: The actual cron.schedule calls need to be run manually
-- after deploying, as they require the function URL to be known.
-- See Step 4 in phase-07 docs for the SQL to run.
```

---

### Step 5: Set Secrets

```bash
# Generate a random secret for cron authentication
npx supabase secrets set CRON_SECRET=$(openssl rand -hex 32)

# Ensure OpenAI key is set
npx supabase secrets set OPENAI_API_KEY=sk-xxx
```

---

### Step 6: Update Frontend to Fetch Summaries

**File:** `mobile/src/services/summaryService.ts`

```typescript
import { supabase } from './supabase';

interface PeriodSummary {
  id: string;
  summary: string;
  keyThemes: string[];
  overallMood: string;
  insights: string[];
  periodStart: string;
  periodEnd: string;
}

export async function getWeeklySummary(weekStart: Date): Promise<PeriodSummary | null> {
  const startStr = weekStart.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('ai_insights')
    .select('*')
    .eq('insight_type', 'weekly_summary')
    .eq('period_start', startStr)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    ...data.content,
    periodStart: data.period_start,
    periodEnd: data.period_end,
  };
}

export async function getMonthlySummary(year: number, month: number): Promise<PeriodSummary | null> {
  const monthStart = new Date(year, month, 1).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('ai_insights')
    .select('*')
    .eq('insight_type', 'monthly_summary')
    .eq('period_start', monthStart)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    ...data.content,
    periodStart: data.period_start,
    periodEnd: data.period_end,
  };
}
```

---

### Step 7: Update EntryListPage

Update `AISummaryCard` usage in `EntryListPage.tsx` to fetch and display actual summaries:

```typescript
// Add state for summaries
const [weeklySummaries, setWeeklySummaries] = useState<Map<string, PeriodSummary>>();
const [monthlySummaries, setMonthlySummaries] = useState<Map<string, PeriodSummary>>();

// Fetch summaries when entries load
useEffect(() => {
  if (entries.length > 0) {
    fetchSummaries();
  }
}, [entries]);

// In the render, pass summary to the card
<AISummaryCard
  type="week"
  period={formatWeekHeader(entryDate)}
  summary={weeklySummaries?.get(getWeekKey(entryDate))?.summary}
  onClick={() => handleSummaryClick('week', entryDate)}
/>
```

---

## Deployment Checklist

1. [ ] Create migration for `period_start`/`period_end` columns
2. [ ] Deploy updated `generate-summary` function with monthly support
3. [ ] Create and deploy `generate-scheduled-summaries` function
4. [ ] Set `CRON_SECRET` in Supabase secrets
5. [ ] Enable `pg_cron` and `pg_net` extensions
6. [ ] Create cron jobs via SQL Editor
7. [ ] Update frontend to fetch/display summaries
8. [ ] Test with manual cron trigger

---

## Testing

### Manual Trigger

Test the scheduled function manually:

```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/generate-scheduled-summaries' \
  -H 'Content-Type: application/json' \
  -d '{"type": "weekly", "secret": "YOUR_CRON_SECRET"}'
```

### Verify Cron Jobs

```sql
-- List all scheduled jobs
SELECT * FROM cron.job;

-- Check job run history
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

---

## Cost Considerations

- **OpenAI API**: ~$0.001-0.002 per summary (GPT-3.5-turbo)
- **Supabase Edge Functions**: Free tier includes 500k invocations/month
- **pg_cron**: Included in Supabase (Pro plan and above for production)

For 100 active users:
- Weekly: 100 summaries/week = ~$0.10-0.20/week
- Monthly: 100 summaries/month = ~$0.10-0.20/month

---

## Future Enhancements

- [ ] Allow users to regenerate summaries on-demand
- [ ] Add notification when new summary is available
- [ ] Yearly summaries
- [ ] Summary comparisons (this week vs last week)
- [ ] Export summaries as PDF
