import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface OnboardingStatus {
  hasCompany: boolean;
  companyApproved: boolean;
  tourCompleted: boolean;
  loading: boolean;
}

export function useOnboardingStatus() {
  const { user } = useAuth();
  const [status, setStatus] = useState<OnboardingStatus>({
    hasCompany: false,
    companyApproved: false,
    tourCompleted: false,
    loading: true,
  });

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) {
        setStatus({ hasCompany: false, companyApproved: false, tourCompleted: false, loading: false });
        return;
      }

      try {
        // Check if user belongs to any companies - get all and find first active one
        const { data: companyUsers, error: companyUserError } = await supabase
          .from('company_users')
          .select('company_id, companies(status)')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('is_primary', { ascending: false });

        if (companyUserError) {
          console.error('Error checking company status:', companyUserError);
          setStatus({ hasCompany: false, companyApproved: false, tourCompleted: false, loading: false });
          return;
        }

        const hasCompany = companyUsers && companyUsers.length > 0;
        const activeCompany = companyUsers?.find((cu: any) => cu.companies?.status === 'active');
        const companyApproved = !!activeCompany;

        // Check if user has completed the guided tour
        const { data: profile } = await supabase
          .from('profiles')
          .select('tour_completed')
          .eq('id', user.id)
          .maybeSingle();

        setStatus({
          hasCompany,
          companyApproved,
          tourCompleted: profile?.tour_completed || false,
          loading: false,
        });
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        // Don't block on error - user might have just signed up
        setStatus({ hasCompany: false, companyApproved: false, tourCompleted: false, loading: false });
      }
    };

    checkOnboardingStatus();
  }, [user]);

  return status;
}
