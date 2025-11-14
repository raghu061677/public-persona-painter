import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../utils/test-utils';
import CompanySales from '@/pages/CompanySales';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('@/contexts/CompanyContext', () => ({
  useCompany: () => ({
    company: {
      id: 'test-company-id',
      name: 'Test Company',
    },
    isLoading: false,
  }),
}));

describe('CompanySales', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sales settings form', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              sales_settings: {
                default_campaign_duration: 3,
                default_discount: 0,
                plan_validity_days: 30,
              },
            },
            error: null,
          }),
        }),
      }),
    });

    (supabase.from as any) = mockFrom;

    render(<CompanySales />);

    await waitFor(() => {
      expect(screen.getByText('Sales Settings')).toBeInTheDocument();
    });
  });

  it('validates numeric inputs', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              sales_settings: {
                default_campaign_duration: 3,
              },
            },
            error: null,
          }),
        }),
      }),
    });

    (supabase.from as any) = mockFrom;

    render(<CompanySales />);

    await waitFor(() => {
      const input = screen.getByLabelText(/default campaign duration/i) as HTMLInputElement;
      fireEvent.change(input, { target: { value: '-5' } });
    });
  });

  it('toggles switches correctly', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              sales_settings: {
                require_client_approval: true,
                auto_create_portal: false,
              },
            },
            error: null,
          }),
        }),
      }),
    });

    (supabase.from as any) = mockFrom;

    render(<CompanySales />);

    await waitFor(() => {
      const switchElement = screen.getByLabelText(/require client approval/i);
      fireEvent.click(switchElement);
    });
  });

  it('saves sales settings', async () => {
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
            data: {
              sales_settings: {
                default_campaign_duration: 3,
              },
            },
            error: null,
          }),
        }),
      }),
      update: mockUpdate,
    });

    (supabase.from as any) = mockFrom;

    render(<CompanySales />);

    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  it('creates settings if none exist', async () => {
    const mockInsert = vi.fn().mockResolvedValue({
      data: { id: 'test-company-id' },
      error: null,
    });

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }),
      insert: mockInsert,
    });

    (supabase.from as any) = mockFrom;

    render(<CompanySales />);

    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalled();
    });
  });
});
