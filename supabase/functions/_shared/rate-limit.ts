import { createSupabaseServiceClient } from './supabase.ts';

interface RateLimitConfig {
  maxRequests: number;
  windowMinutes: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  'analyze-sentiment': { maxRequests: 20, windowMinutes: 60 },
  'generate-summary': { maxRequests: 10, windowMinutes: 60 },
};

export async function checkRateLimit(
  userId: string,
  endpoint: string
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const config = RATE_LIMITS[endpoint] || { maxRequests: 10, windowMinutes: 60 };
  const supabase = createSupabaseServiceClient();

  const windowStart = new Date();
  windowStart.setMinutes(windowStart.getMinutes() - config.windowMinutes);

  // Count requests in current window
  const { count, error } = await supabase
    .from('ai_rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
    .gte('window_start', windowStart.toISOString());

  if (error) {
    console.error('Rate limit check failed:', error);
    // Allow request if rate limit check fails (fail open)
    return { allowed: true, remaining: config.maxRequests, resetAt: new Date() };
  }

  const currentCount = count || 0;
  const allowed = currentCount < config.maxRequests;

  if (allowed) {
    // Log this request
    await supabase.from('ai_rate_limits').insert({
      user_id: userId,
      endpoint,
      window_start: new Date().toISOString(),
    });
  }

  const resetAt = new Date();
  resetAt.setMinutes(resetAt.getMinutes() + config.windowMinutes);

  return {
    allowed,
    remaining: Math.max(0, config.maxRequests - currentCount - 1),
    resetAt,
  };
}
