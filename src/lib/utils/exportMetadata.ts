/**
 * Export Salesperson Resolver for Go-Ads 360°
 * 
 * Resolves the correct salesperson for quotation/export PDFs.
 * Priority: plan.owner_id → plan.created_by → company fallback
 * 
 * NEVER uses logged-in user as the salesperson source.
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
 * 3. Empty fallback (no salesperson shown)
 */
export async function resolveExportSalesperson(
  plan: { owner_id?: string | null; created_by?: string | null; company_id?: string | null }
): Promise<ResolvedSalesperson> {
  const userId = plan.owner_id || plan.created_by;
  
  if (!userId) {
    return { name: '', role: '', phone: '', email: '' };
  }

  try {
    // Fetch profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, phone')
      .eq('id', userId)
      .single();

    // Fetch auth email
    // We can't query auth.users, so get email from company_users
    const { data: companyUser } = await supabase
      .from('company_users')
      .select('role, name, email, phone')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1)
      .single();

    const name = companyUser?.name || (profile as any)?.username || '';
    const role = companyUser?.role || '';
    const phone = companyUser?.phone || (profile as any)?.phone || '';
    const email = companyUser?.email || '';

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
