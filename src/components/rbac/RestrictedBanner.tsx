/**
 * RestrictedBanner - Shows a prominent banner when viewing a record in restricted mode.
 */
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

interface RestrictedBannerProps {
  module: 'plan' | 'campaign' | 'client';
}

const MESSAGES: Record<string, string> = {
  plan: 'Limited View: You can view plan summary only. Financial details and edit access are restricted to the owner.',
  campaign: 'Limited View: You can view campaign summary only. Financial and sensitive fields are restricted.',
  client: 'Limited View: Sensitive client contacts and financial data are restricted to the record owner.',
};

export function RestrictedBanner({ module }: RestrictedBannerProps) {
  return (
    <Alert className="mb-4 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700">
      <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm font-medium">
        {MESSAGES[module]}
      </AlertDescription>
    </Alert>
  );
}
