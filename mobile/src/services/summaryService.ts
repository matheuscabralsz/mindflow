import { supabase } from './supabase';
import { startOfWeek, format } from 'date-fns';

export interface PeriodSummary {
  id?: string;
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

export interface GenerateSummaryResponse {
  success: boolean;
  data?: PeriodSummary;
  error?: string;
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

  // Build the OR query for both weekly and monthly summaries
  const conditions: string[] = [];

  if (weekStarts.length > 0) {
    conditions.push(`and(insight_type.eq.weekly_summary,period_start.in.(${weekStarts.join(',')}))`);
  }

  if (monthStarts.length > 0) {
    conditions.push(`and(insight_type.eq.monthly_summary,period_start.in.(${monthStarts.join(',')}))`);
  }

  const { data, error } = await supabase
    .from('ai_insights')
    .select('*')
    .or(conditions.join(','));

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

/**
 * Fetch a weekly summary by date range
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 */
export async function fetchWeeklySummary(startDate: string, _endDate: string): Promise<PeriodSummary | null> {
  const { data, error } = await supabase
    .from('ai_insights')
    .select('*')
    .eq('insight_type', 'weekly_summary')
    .eq('period_start', startDate)
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
 * Fetch a monthly summary by month
 * @param month - Month in YYYY-MM format
 */
export async function fetchMonthlySummary(month: string): Promise<PeriodSummary | null> {
  const periodStartStr = `${month}-01`;

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
 * Generate a weekly summary on-demand
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 */
export async function generateWeeklySummary(startDate: string, endDate: string): Promise<GenerateSummaryResponse> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return { success: false, error: 'Not authenticated' };
  }

  const response = await supabase.functions.invoke('generate-summary', {
    body: {
      type: 'weekly',
      periodStart: startDate,
      periodEnd: endDate,
    },
  });

  if (response.error) {
    console.error('Error generating weekly summary:', response.error);
    return { success: false, error: response.error.message };
  }

  const result = response.data;

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    data: result.data,
  };
}

/**
 * Generate a monthly summary on-demand
 * @param month - Month in YYYY-MM format
 */
export async function generateMonthlySummary(month: string): Promise<GenerateSummaryResponse> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return { success: false, error: 'Not authenticated' };
  }

  const response = await supabase.functions.invoke('generate-summary', {
    body: {
      type: 'monthly',
      periodStart: month,
    },
  });

  if (response.error) {
    console.error('Error generating monthly summary:', response.error);
    return { success: false, error: response.error.message };
  }

  const result = response.data;

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    data: result.data,
  };
}
