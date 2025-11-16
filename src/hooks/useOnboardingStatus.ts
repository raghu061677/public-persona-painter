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
        // Check if user belongs to a company
        const { data: companyUser, error: companyUserError } = await supabase
          .from('company_users')
          .select('company_id, companies(status)')
          .eq('user_id', user.id)
          .single();

        if (companyUserError && companyUserError.code !== 'PGRST116') {
          console.error('Error checking company status:', companyUserError);
        }

        const hasCompany = !!companyUser;
        const companyApproved = hasCompany && (companyUser.companies as any)?.status === 'active';

        // Check if user has completed the guided tour
        const { data: profile } = await supabase
          .from('profiles')
          .select('tour_completed')
          .eq('id', user.id)
          .single();

        setStatus({
          hasCompany,
          companyApproved,
          tourCompleted: profile?.tour_completed || false,
          loading: false,
        });
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setStatus({ hasCompany: false, companyApproved: false, tourCompleted: false, loading: false });
      }
    };

    checkOnboardingStatus();
  }, [user]);

  return status;
}
