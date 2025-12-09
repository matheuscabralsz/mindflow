import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';
import { checkRateLimit } from '../_shared/rate-limit.ts';

interface SummaryResult {
  summary: string;
  keyThemes: string[];
  overallMood: string;
  insights: string[];
  entryCount: number;
}

const DAILY_SUMMARY_PROMPT = `Analyze these journal entries from today and provide a thoughtful summary.

Return ONLY a JSON object (no markdown formatting):
{
  "summary": "<2-3 sentence overview of the day>",
  "keyThemes": ["<theme1>", "<theme2>", "<theme3>"],
  "overallMood": "<overall emotional tone>",
  "insights": ["<insight1>", "<insight2>"]
}

Entries:
`;

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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user context
    const supabase = createSupabaseClient(authHeader);

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(user.id, 'generate-summary');
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          resetAt: rateLimit.resetAt,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetAt.toISOString(),
          }
        }
      );
    }

    // Get request body
    const { type = 'daily', date, periodStart, periodEnd } = await req.json();
    const targetDate = date ? new Date(date) : new Date();

    // Calculate date range
    let startDate: Date;
    let endDate: Date;
    let insightType: string;
    let prompt: string;

    if (type === 'monthly') {
      if (periodStart) {
        // Use provided period (YYYY-MM format expected, parse as first day of month)
        const [year, month] = periodStart.split('-').map(Number);
        startDate = new Date(year, month - 1, 1);
        endDate = new Date(year, month, 0); // Last day of month
      } else {
        // First day of the target month
        startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
        // Last day of the target month
        endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
      }
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      insightType = 'monthly_summary';
      prompt = MONTHLY_SUMMARY_PROMPT;
    } else if (type === 'weekly') {
      if (periodStart && periodEnd) {
        // Use provided period dates (YYYY-MM-DD format)
        startDate = new Date(periodStart + 'T00:00:00');
        endDate = new Date(periodEnd + 'T23:59:59.999');
      } else {
        startDate = new Date(targetDate);
        startDate.setDate(startDate.getDate() - 7);
        endDate = new Date(targetDate);
      }
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      insightType = 'weekly_summary';
      prompt = WEEKLY_SUMMARY_PROMPT;
    } else {
      startDate = new Date(targetDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(targetDate);
      endDate.setHours(23, 59, 59, 999);
      insightType = 'daily_summary';
      prompt = DAILY_SUMMARY_PROMPT;
    }

    // Format period dates for storage
    const periodStartStr = startDate.toISOString().split('T')[0];
    const periodEndStr = endDate.toISOString().split('T')[0];

    // Check if summary already exists for this period
    const { data: existingSummary } = await supabase
      .from('ai_insights')
      .select('id, content, created_at, period_start, period_end')
      .eq('user_id', user.id)
      .eq('insight_type', insightType)
      .eq('period_start', periodStartStr)
      .maybeSingle();

    // Return existing summary if found
    if (existingSummary) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            ...existingSummary.content,
            periodStart: existingSummary.period_start,
            periodEnd: existingSummary.period_end,
            cached: true,
            cachedAt: existingSummary.created_at,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch entries for date range
    const { data: entries, error: entriesError } = await supabase
      .from('entries')
      .select('content, entry_date, mood, sentiment_score')
      .gte('entry_date', startDate.toISOString().split('T')[0])
      .lte('entry_date', endDate.toISOString().split('T')[0])
      .order('entry_date', { ascending: true });

    if (entriesError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch entries' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!entries || entries.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: `No entries found for this ${type === 'weekly' ? 'week' : 'day'}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format entries for prompt
    let formattedEntries: string;

    if (type === 'weekly' || type === 'monthly') {
      // Group by day for weekly/monthly
      const entriesByDay: Record<string, typeof entries> = {};
      entries.forEach((entry) => {
        const day = new Date(entry.entry_date + 'T00:00:00').toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        });
        if (!entriesByDay[day]) entriesByDay[day] = [];
        entriesByDay[day].push(entry);
      });

      formattedEntries = Object.entries(entriesByDay)
        .map(([day, dayEntries]) => {
          const dayContent = dayEntries.map((e, i) => {
            const mood = e.mood ? ` [Mood: ${e.mood}]` : '';
            const sentiment = e.sentiment_score ? ` [Sentiment: ${e.sentiment_score.toFixed(2)}]` : '';
            return `  ${i + 1}. ${e.content.substring(0, 200)}${mood}${sentiment}`;
          }).join('\n');
          return `${day} (${dayEntries.length} ${dayEntries.length === 1 ? 'entry' : 'entries'}):\n${dayContent}`;
        })
        .join('\n\n---\n\n');
    } else {
      // Simple list for daily
      formattedEntries = entries
        .map((entry, index) => {
          const mood = entry.mood ? ` [Mood: ${entry.mood}]` : '';
          return `Entry ${index + 1}${mood}:\n${entry.content}`;
        })
        .join('\n\n---\n\n');
    }

    // Call OpenAI
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: 'You are a thoughtful journal analysis assistant. Return ONLY valid JSON.',
          },
          {
            role: 'user',
            content: prompt + formattedEntries,
          },
        ],
        temperature: 0.5,
        max_tokens: type === 'monthly' ? 800 : type === 'weekly' ? 600 : 500,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error('OpenAI error:', errorData);
      return new Response(
        JSON.stringify({ success: false, error: 'AI analysis failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiData = await openaiResponse.json();
    const responseText = openaiData.choices[0]?.message?.content || '';

    // Parse response
    let summary: SummaryResult;
    try {
      const cleanedResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      summary = JSON.parse(cleanedResponse);
      summary.entryCount = entries.length;
    } catch (parseError) {
      console.error('Failed to parse summary response:', responseText);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store the result with period dates
    await supabase.from('ai_insights').insert({
      user_id: user.id,
      insight_type: insightType,
      content: summary,
      period_start: periodStartStr,
      period_end: periodEndStr,
      expires_at: null, // Period summaries don't expire
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...summary,
          periodStart: periodStartStr,
          periodEnd: periodEndStr,
          cached: false,
        },
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        }
      }
    );
  } catch (error) {
    console.error('Summary generation error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
