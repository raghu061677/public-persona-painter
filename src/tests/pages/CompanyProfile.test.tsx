import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../utils/test-utils';
import CompanyProfile from '@/pages/CompanyProfile';
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
      legal_name: 'Test Company Ltd',
      gstin: '29ABCDE1234F1Z5',
      email: 'test@company.com',
      phone: '1234567890',
    },
    isLoading: false,
  }),
}));

describe('CompanyProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders profile form with company data', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              name: 'Test Company',
              legal_name: 'Test Company Ltd',
              gstin: '29ABCDE1234F1Z5',
            },
            error: null,
          }),
        }),
      }),
    });

    (supabase.from as any) = mockFrom;

    render(<CompanyProfile />);

    await waitFor(() => {
      expect(screen.getByText('Company Profile')).toBeInTheDocument();
    });
  });

  it('validates GSTIN format', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { name: 'Test Company' },
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Invalid GSTIN format' },
        }),
      }),
    });

    (supabase.from as any) = mockFrom;

    render(<CompanyProfile />);

    await waitFor(() => {
      const input = screen.getByLabelText(/gstin/i) as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'INVALID' } });
    });
  });

  it('saves profile changes successfully', async () => {
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

    render(<CompanyProfile />);

    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  it('handles save errors gracefully', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { name: 'Test Company' },
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      }),
    });

    (supabase.from as any) = mockFrom;

    render(<CompanyProfile />);

    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);
    });
  });

  it('shows loading state while saving', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { name: 'Test Company' },
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(() => resolve({ data: {}, error: null }), 100)
            )
        ),
      }),
    });

    (supabase.from as any) = mockFrom;

    render(<CompanyProfile />);

    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);
    });

    expect(screen.getByText(/saving/i)).toBeInTheDocument();
  });
});
