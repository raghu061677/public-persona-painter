import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';

interface Subscription {
  tier: string;
  status: string;
  modules: string[];
  user_limit: number;
  asset_limit: number | null;
  campaign_limit: number | null;
}

export function useSubscription() {
  const { company } = useCompany();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company?.id) {
      setLoading(false);
      return;
    }

    fetchSubscription();
  }, [company?.id]);

  const fetchSubscription = async () => {
    if (!company?.id) return;

    try {
      const { data, error } = await supabase
        .from('company_subscriptions')
        .select('tier, status, modules, user_limit, asset_limit, campaign_limit, end_date')
        .eq('company_id', company.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const modulesArray = Array.isArray(data.modules) 
          ? data.modules.filter((m): m is string => typeof m === 'string')
          : [];
        
        setSubscription({
          tier: data.tier,
          status: data.status,
          modules: modulesArray,
          user_limit: data.user_limit,
          asset_limit: data.asset_limit,
          campaign_limit: data.campaign_limit,
        });
      } else {
        // Default free tier
        setSubscription({
          tier: 'free',
          status: 'active',
          modules: ['dashboard', 'media_assets', 'clients'],
          user_limit: 3,
          asset_limit: 10,
          campaign_limit: 5,
        });
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      // Fallback to free tier
      setSubscription({
        tier: 'free',
        status: 'active',
        modules: ['dashboard', 'media_assets', 'clients'],
        user_limit: 3,
        asset_limit: 10,
        campaign_limit: 5,
      });
    } finally {
      setLoading(false);
    }
  };

  const hasModule = (moduleName: string): boolean => {
    if (!subscription) return false;
    return subscription.modules?.includes(moduleName) || false;
  };

  const canAddUser = async (): Promise<boolean> => {
    if (!company?.id || !subscription) return false;

    const { count } = await supabase
      .from('company_users')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', company.id)
      .eq('status', 'active');

    return (count || 0) < subscription.user_limit;
  };

  return {
    subscription,
    loading,
    hasModule,
    canAddUser,
    refetch: fetchSubscription,
  };
}