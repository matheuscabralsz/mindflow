import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';
import { checkRateLimit } from '../_shared/rate-limit.ts';

interface SentimentResult {
  score: number;
  label: 'positive' | 'neutral' | 'negative';
  confidence: number;
  emotions: string[];
}

const SENTIMENT_PROMPT = `Analyze the emotional tone of this journal entry and return ONLY a JSON object with this exact format (no markdown, no explanation):

{
  "score": <number between -1 (very negative) and 1 (very positive)>,
  "label": "<positive|neutral|negative>",
  "confidence": <number between 0 and 1>,
  "emotions": ["<emotion1>", "<emotion2>"]
}

Journal entry:
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
    const rateLimit = await checkRateLimit(user.id, 'analyze-sentiment');
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
    const { entryId } = await req.json();
    if (!entryId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Entry ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch entry (RLS ensures user can only access their own)
    const { data: entry, error: entryError } = await supabase
      .from('entries')
      .select('id, content, sentiment_score, sentiment_label')
      .eq('id', entryId)
      .single();

    if (entryError || !entry) {
      return new Response(
        JSON.stringify({ success: false, error: 'Entry not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return cached result if exists
    if (entry.sentiment_score !== null && entry.sentiment_label !== null) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            score: entry.sentiment_score,
            label: entry.sentiment_label,
            cached: true,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call OpenAI
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Truncate long content
    const truncatedContent = entry.content.substring(0, 2000);

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
            content: 'You are a sentiment analysis expert. Return ONLY valid JSON, no markdown formatting.',
          },
          {
            role: 'user',
            content: SENTIMENT_PROMPT + truncatedContent,
          },
        ],
        temperature: 0.2,
        max_tokens: 200,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error('OpenAI error:', errorData);

      if (openaiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI service rate limited. Please try again later.' }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: 'AI analysis failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiData = await openaiResponse.json();
    const responseText = openaiData.choices[0]?.message?.content || '';

    // Parse response
    let sentiment: SentimentResult;
    try {
      const cleanedResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      sentiment = JSON.parse(cleanedResponse);

      // Validate response
      if (
        typeof sentiment.score !== 'number' ||
        sentiment.score < -1 ||
        sentiment.score > 1 ||
        !['positive', 'neutral', 'negative'].includes(sentiment.label)
      ) {
        throw new Error('Invalid sentiment response format');
      }
    } catch (parseError) {
      console.error('Failed to parse sentiment response:', responseText);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update entry with sentiment
    const { error: updateError } = await supabase
      .from('entries')
      .update({
        sentiment_score: sentiment.score,
        sentiment_label: sentiment.label,
      })
      .eq('id', entryId);

    if (updateError) {
      console.error('Failed to update entry:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          score: sentiment.score,
          label: sentiment.label,
          confidence: sentiment.confidence,
          emotions: sentiment.emotions,
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
    console.error('Sentiment analysis error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
