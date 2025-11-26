import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AuthData {
  is_platform_admin: boolean;
  primary_company_id: string | null;
  company_users: Array<{
    company_id: string;
    role: string;
    is_primary: boolean;
    status: string;
  }>;
  companies: Array<{
    id: string;
    name: string;
    type: string;
    legal_name?: string;
    gstin?: string;
    logo_url?: string;
    theme_color?: string;
    secondary_color?: string;
    status: string;
  }>;
}

/**
 * Hook to fetch and cache user authentication data
 * Uses React Query for caching and background refetching
 */
export function useAuthData() {
  const { user } = useAuth();

  return useQuery<AuthData>({
    queryKey: ['auth-data', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');

      // Verify session is valid before calling RPC
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('No valid session');
      }

      const { data, error } = await supabase.rpc('get_user_auth_data', {
        p_user_id: user.id,
      }) as { data: any; error: any };

      if (error) throw error;
      if (!data) throw new Error('No data returned from RPC');
      
      return data as AuthData;
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes - increased for better performance
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache longer
    refetchOnWindowFocus: false,
    refetchOnReconnect: false, // Don't refetch on reconnect
    retry: 1,
  });
}
