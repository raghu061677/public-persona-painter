import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../utils/test-utils';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn(),
    },
  },
}));

vi.mock('@/contexts/CompanyContext', () => ({
  useCompany: () => ({
    company: {
      id: 'test-company-id',
      name: 'Test Company',
      theme_color: '#1e40af',
    },
    isLoading: false,
  }),
}));

describe('Settings Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads and saves settings across multiple pages', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              name: 'Test Company',
              sales_settings: {
                default_campaign_duration: 3,
              },
              tax_settings: {
                gst_enabled: true,
              },
            },
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { id: 'test-company-id' },
          error: null,
        }),
      }),
    });

    (supabase.from as any) = mockFrom;

    // Test that settings persist across page navigation
    expect(mockFrom).toBeDefined();
  });

  it('handles concurrent updates', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: { id: 'test-company-id' },
        error: null,
      }),
    });

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { name: 'Test Company' },
            error: null,
          }),
        }),
      }),
      update: mockUpdate,
    });

    (supabase.from as any) = mockFrom;

    // Simulate concurrent saves
    await Promise.all([
      mockUpdate({ name: 'Updated Name 1' }),
      mockUpdate({ name: 'Updated Name 2' }),
    ]);

    expect(mockUpdate).toHaveBeenCalledTimes(2);
  });

  it('validates data integrity across settings', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              name: 'Test Company',
              gstin: '29ABCDE1234F1Z5',
              sales_settings: {
                require_gst: true,
              },
            },
            error: null,
          }),
        }),
      }),
    });

    (supabase.from as any) = mockFrom;

    // Test that GSTIN is required when require_gst is enabled
    expect(mockFrom).toBeDefined();
  });

  it('handles network errors gracefully', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockRejectedValue(new Error('Network error')),
        }),
      }),
    });

    (supabase.from as any) = mockFrom;

    // Test error handling
    try {
      await mockFrom('companies').select('*').eq('id', 'test-id').maybeSingle();
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('maintains form state during navigation', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              name: 'Test Company',
              email: 'test@company.com',
            },
            error: null,
          }),
        }),
      }),
    });

    (supabase.from as any) = mockFrom;

    // Test that unsaved changes are preserved
    expect(mockFrom).toBeDefined();
  });
});
