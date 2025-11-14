import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

describe('Database Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Media Assets Operations', () => {
    it('should fetch media assets', async () => {
      const mockAssets = [
        { id: 'TEST-001', city: 'Hyderabad', status: 'Available' },
        { id: 'TEST-002', city: 'Bangalore', status: 'Booked' },
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockAssets, error: null }),
        }),
      } as any);

      const { data, error } = await supabase
        .from('media_assets')
        .select('*')
        .order('id');

      expect(error).toBeNull();
      expect(data).toEqual(mockAssets);
      expect(data).toHaveLength(2);
    });

    it('should filter available assets', async () => {
      const mockAvailableAssets = [
        { id: 'TEST-001', city: 'Hyderabad', status: 'Available' },
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: mockAvailableAssets, error: null }),
        }),
      } as any);

      const { data, error } = await supabase
        .from('media_assets')
        .select('*')
        .eq('status', 'Available');

      expect(error).toBeNull();
      expect(data).toEqual(mockAvailableAssets);
      expect(data?.[0].status).toBe('Available');
    });
  });

  describe('Client Operations', () => {
    it('should create a new client', async () => {
      const newClient = {
        id: 'CLT-TEST-001',
        name: 'Test Client',
        email: 'test@example.com',
        company: 'Test Corp',
      };

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: [newClient], error: null }),
      } as any);

      const { data, error } = await supabase
        .from('clients')
        .insert([newClient]);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should update client information', async () => {
      const updatedClient = {
        id: 'CLT-001',
        name: 'Updated Name',
      };

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [updatedClient], error: null }),
        }),
      } as any);

      const { data, error } = await supabase
        .from('clients')
        .update({ name: 'Updated Name' })
        .eq('id', 'CLT-001');

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('Campaign Operations', () => {
    it('should create campaign from plan', async () => {
      const campaign = {
        id: 'CAM-2025-001',
        campaign_name: 'Test Campaign',
        client_id: 'CLT-001',
        client_name: 'Test Client',
        plan_id: 'PLAN-2025-001',
        status: 'Planned' as const,
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        grand_total: 100000,
        gst_amount: 18000,
        gst_percent: 18,
        total_amount: 118000,
        created_by: 'user-123',
      };

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: [campaign], error: null }),
      } as any);

      const { data, error } = await supabase
        .from('campaigns')
        .insert([campaign]);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });
});
