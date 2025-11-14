import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../utils/test-utils';
import CompanyBranding from '@/pages/CompanyBranding';
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
      secondary_color: '#10b981',
      logo_url: null,
    },
    isLoading: false,
  }),
}));

describe('CompanyBranding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders branding settings form', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              theme_color: '#1e40af',
              secondary_color: '#10b981',
            },
            error: null,
          }),
        }),
      }),
    });

    (supabase.from as any) = mockFrom;

    render(<CompanyBranding />);

    await waitFor(() => {
      expect(screen.getByText('Brand Colors')).toBeInTheDocument();
    });
  });

  it('validates color format', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { theme_color: '#1e40af' },
            error: null,
          }),
        }),
      }),
    });

    (supabase.from as any) = mockFrom;

    render(<CompanyBranding />);

    await waitFor(() => {
      const input = screen.getByLabelText(/primary color/i) as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'invalid-color' } });
    });
  });

  it('handles logo upload', async () => {
    const mockUpload = vi.fn().mockResolvedValue({
      data: { path: 'logos/test-logo.png' },
      error: null,
    });

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { logo_url: null },
            error: null,
          }),
        }),
      }),
    });

    const mockStorage = vi.fn().mockReturnValue({
      upload: mockUpload,
      getPublicUrl: vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/logo.png' },
      }),
    });

    (supabase.from as any) = mockFrom;
    (supabase.storage.from as any) = mockStorage;

    render(<CompanyBranding />);

    await waitFor(() => {
      const file = new File(['logo'], 'logo.png', { type: 'image/png' });
      const input = screen.getByLabelText(/upload logo/i) as HTMLInputElement;
      fireEvent.change(input, { target: { files: [file] } });
    });
  });

  it('saves branding changes', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: { id: 'test-company-id' },
        error: null,
      }),
    });

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { theme_color: '#1e40af' },
            error: null,
          }),
        }),
      }),
      update: mockUpdate,
    });

    (supabase.from as any) = mockFrom;

    render(<CompanyBranding />);

    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
    });
  });
});
