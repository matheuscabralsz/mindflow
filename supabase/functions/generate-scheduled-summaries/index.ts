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
