
import { renderHook, waitFor } from '@testing-library/react';
import { useAnalyticsDataFetcher } from '../useAnalyticsDataFetcher';
import { supabase } from '@/lib/customSupabaseClient';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock Supabase Client
vi.mock('@/lib/customSupabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

describe('useAnalyticsDataFetcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch financial data correctly', async () => {
    // Mock implementations
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [{ id: 1, contribution_amount: 100, contribution_date: '2023-01-01' }],
          error: null
        })
      })
    });
    supabase.from = mockFrom;

    const { result } = renderHook(() => useAnalyticsDataFetcher());

    // Initially loading
    expect(result.current.loading).toBe(true);

    // Wait for update
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.financialData).toBeDefined();
    expect(result.current.financialData.contributions).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it('should handle fetch errors gracefully', async () => {
    // Mock error
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Network error' }
        })
      })
    });
    supabase.from = mockFrom;

    const { result } = renderHook(() => useAnalyticsDataFetcher());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
  });
});
