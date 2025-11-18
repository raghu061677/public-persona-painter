import React, { FormEvent, ReactNode } from 'react';
import { useCsrfProtection } from '@/hooks/useCsrfProtection';
import { Loader2 } from 'lucide-react';

interface CsrfProtectedFormProps {
  onSubmit: (e: FormEvent<HTMLFormElement>, csrfToken: string) => void | Promise<void>;
  children: ReactNode;
  className?: string;
}

/**
 * Form wrapper that automatically includes CSRF protection
 * Usage:
 * <CsrfProtectedForm onSubmit={async (e, token) => {
 *   // Your form submission logic with token validation
 * }}>
 *   <input name="field1" />
 *   <button type="submit">Submit</button>
 * </CsrfProtectedForm>
 */
export function CsrfProtectedForm({ onSubmit, children, className }: CsrfProtectedFormProps) {
  const { csrfToken, isLoading, validateToken } = useCsrfProtection();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!csrfToken) {
      console.error('CSRF token not available');
      return;
    }

    // Validate token before submission
    const isValid = await validateToken(csrfToken);
    if (!isValid) {
      console.error('Invalid CSRF token');
      return;
    }

    await onSubmit(e, csrfToken);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <input type="hidden" name="csrf_token" value={csrfToken} />
      {children}
    </form>
  );
}
