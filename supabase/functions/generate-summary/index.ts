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
    const { type = 'daily', date } = await req.json();
    const targetDate = date ? new Date(date) : new Date();

    // Calculate date range
    let startDate: Date;
    let endDate: Date;
    let insightType: string;
    let prompt: string;

    if (type === 'weekly') {
      startDate = new Date(targetDate);
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(targetDate);
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

    // Check cache first
    const { data: cachedInsight } = await supabase
      .from('ai_insights')
      .select('content, created_at')
      .eq('user_id', user.id)
      .eq('insight_type', insightType)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Return cached result if less than 6 hours old
    if (cachedInsight) {
      const cacheAge = Date.now() - new Date(cachedInsight.created_at).getTime();
      const sixHours = 6 * 60 * 60 * 1000;

      if (cacheAge < sixHours) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              ...cachedInsight.content,
              cached: true,
              cachedAt: cachedInsight.created_at,
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch entries for date range
    const { data: entries, error: entriesError } = await supabase
      .from('entries')
      .select('content, created_at, mood, sentiment_score')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true });

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

    if (type === 'weekly') {
      // Group by day for weekly
      const entriesByDay: Record<string, typeof entries> = {};
      entries.forEach((entry) => {
        const day = new Date(entry.created_at).toLocaleDateString('en-US', {
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
          const time = new Date(entry.created_at).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          });
          const mood = entry.mood ? ` [Mood: ${entry.mood}]` : '';
          return `Entry ${index + 1} (${time})${mood}:\n${entry.content}`;
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
        max_tokens: type === 'weekly' ? 600 : 500,
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

    // Cache the result
    await supabase.from('ai_insights').insert({
      user_id: user.id,
      insight_type: insightType,
      content: summary,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...summary,
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
