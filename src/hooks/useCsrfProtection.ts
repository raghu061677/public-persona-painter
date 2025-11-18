import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to generate and manage CSRF tokens for form submissions
 * Automatically generates a fresh token on mount and provides validation
 */
export function useCsrfProtection() {
  const [csrfToken, setCsrfToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    generateToken();
  }, []);

  const generateToken = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.rpc('generate_csrf_token');
      
      if (error) throw error;
      setCsrfToken(data);
    } catch (error) {
      console.error('Failed to generate CSRF token:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const validateToken = async (token: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('validate_csrf_token', {
        p_token: token
      });
      
      if (error) throw error;
      return data === true;
    } catch (error) {
      console.error('Failed to validate CSRF token:', error);
      return false;
    }
  };

  return {
    csrfToken,
    isLoading,
    generateToken,
    validateToken
  };
}
