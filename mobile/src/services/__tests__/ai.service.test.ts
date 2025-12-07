import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeSentiment, generateDailySummary, generateWeeklySummary } from '../ai.service';
import { supabase } from '../supabase';

vi.mock('../supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('AI Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('analyzeSentiment', () => {
    it('should return sentiment analysis for an entry', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            score: 0.8,
            label: 'positive',
            confidence: 0.9,
            emotions: ['happy', 'grateful'],
          },
        },
        error: null,
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue(mockResponse);

      const result = await analyzeSentiment('test-entry-id');

      expect(result.score).toBe(0.8);
      expect(result.label).toBe('positive');
      expect(supabase.functions.invoke).toHaveBeenCalledWith('analyze-sentiment', {
        body: { entryId: 'test-entry-id' },
      });
    });

    it('should throw error when API fails', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { success: false, error: 'Rate limit exceeded' },
        error: null,
      });

      await expect(analyzeSentiment('test-id')).rejects.toThrow('Rate limit exceeded');
    });

    it('should throw error when network fails', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: { message: 'Network error' },
      });

      await expect(analyzeSentiment('test-id')).rejects.toThrow('Network error');
    });
  });

  describe('generateDailySummary', () => {
    it('should return daily summary', async () => {
      const mockSummary = {
        summary: 'A productive day...',
        keyThemes: ['work', 'exercise'],
        overallMood: 'positive',
        insights: ['Great focus today'],
        entryCount: 3,
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { success: true, data: mockSummary },
        error: null,
      });

      const result = await generateDailySummary();

      expect(result.summary).toBe('A productive day...');
      expect(result.entryCount).toBe(3);
      expect(supabase.functions.invoke).toHaveBeenCalledWith('generate-summary', {
        body: { type: 'daily', date: undefined },
      });
    });

    it('should pass date parameter when provided', async () => {
      const mockSummary = {
        summary: 'Summary for specific date',
        keyThemes: ['testing'],
        overallMood: 'neutral',
        insights: [],
        entryCount: 1,
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { success: true, data: mockSummary },
        error: null,
      });

      const testDate = new Date('2024-01-15');
      await generateDailySummary(testDate);

      expect(supabase.functions.invoke).toHaveBeenCalledWith('generate-summary', {
        body: { type: 'daily', date: testDate.toISOString() },
      });
    });

    it('should throw error when no entries found', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { success: false, error: 'No entries found for this day' },
        error: null,
      });

      await expect(generateDailySummary()).rejects.toThrow('No entries found for this day');
    });
  });

  describe('generateWeeklySummary', () => {
    it('should return weekly summary', async () => {
      const mockSummary = {
        summary: 'A week of growth...',
        keyThemes: ['progress', 'challenges'],
        overallMood: 'improving',
        insights: ['Consistent improvement'],
        entryCount: 15,
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { success: true, data: mockSummary },
        error: null,
      });

      const result = await generateWeeklySummary();

      expect(result.summary).toBe('A week of growth...');
      expect(result.entryCount).toBe(15);
      expect(supabase.functions.invoke).toHaveBeenCalledWith('generate-summary', {
        body: { type: 'weekly', date: undefined },
      });
    });

    it('should handle rate limit error', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { success: false, error: 'Rate limit exceeded. Please try again later.' },
        error: null,
      });

      await expect(generateWeeklySummary()).rejects.toThrow('Rate limit exceeded');
    });
  });
});
