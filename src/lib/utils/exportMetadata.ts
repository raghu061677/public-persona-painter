/**
 * Export Metadata Resolver for Go-Ads 360°
 * 
 * Resolves salesperson and payment terms for quotation/export PDFs.
 * Salesperson: plan.owner_id → plan.created_by (NOT logged-in user)
 * Payment Terms: plan → client → org_settings → "Net 30 Days"
 */

import { supabase } from '@/integrations/supabase/client';

export interface ResolvedSalesperson {
  name: string;
  role: string;
  phone: string;
  email: string;
}

/**
 * Resolve salesperson from plan's owner/creator, NOT from logged-in user.
 * 
 * Priority:
 * 1. plan.owner_id (explicitly assigned salesperson)
 * 2. plan.created_by (plan creator)
 * 3. Empty fallback
 */
export async function resolveExportSalesperson(
  plan: { owner_id?: string | null; created_by?: string | null; company_id?: string | null }
): Promise<ResolvedSalesperson> {
  const userId = plan.owner_id || plan.created_by;
  
  if (!userId) {
    return { name: '', role: '', phone: '', email: '' };
  }

  try {
    // Fetch profile (has username, phone)
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, phone')
      .eq('id', userId)
      .single();

    // Fetch role from company_users
    const { data: companyUser } = await supabase
      .from('company_users')
      .select('role')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1)
      .single();

    // Try to get email from auth - use a workaround via profiles or just leave blank
    // Auth emails aren't directly queryable from client, so we'll use what we have
    let email = '';
    // If the user has set up their profile, we use that
    // Otherwise try to get from the plan's context

    const name = profile?.username || '';
    const role = companyUser?.role || '';
    const phone = profile?.phone || '';

    return { name, role, phone, email };
  } catch {
    return { name: '', role: '', phone: '', email: '' };
  }
}

/**
 * Resolve payment terms with proper priority chain.
 * Logs the source for debugging.
 */
export function resolvePaymentTerms(
  planPaymentTerms?: string | null,
  clientPaymentTerms?: string | null,
  orgDefaultPaymentTerms?: string | null
): string {
  if (planPaymentTerms) {
    console.log('[PaymentTerms] Using plan-level terms:', planPaymentTerms);
    return planPaymentTerms;
  }
  if (clientPaymentTerms) {
    console.log('[PaymentTerms] Using client-level terms:', clientPaymentTerms);
    return clientPaymentTerms;
  }
  if (orgDefaultPaymentTerms) {
    console.log('[PaymentTerms] Using org-default terms:', orgDefaultPaymentTerms);
    return orgDefaultPaymentTerms;
  }
  console.log('[PaymentTerms] Using hardcoded fallback: Net 30 Days');
  return 'Net 30 Days';
}
