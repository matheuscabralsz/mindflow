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
