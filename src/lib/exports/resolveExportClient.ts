/**
 * Registration-aware client resolver for all plan/campaign exports.
 * If plan.client_registration_id exists, fetches the registration and
 * overrides billing address, GSTIN, city, state, pincode on the client object.
 * If no registration exists, the client object passes through unchanged.
 */

import { supabase } from '@/integrations/supabase/client';

export async function resolveExportClient(plan: any, clientData: any): Promise<any> {
  if (!clientData) return clientData;
  if (!plan?.client_registration_id) return clientData;

  try {
    const { data: reg } = await supabase
      .from('client_registrations')
      .select('label, legal_name, gstin, billing_address_line1, billing_address_line2, billing_city, billing_state, billing_pincode, state_code, shipping_address_line1, shipping_address_line2, shipping_city, shipping_state, shipping_pincode')
      .eq('id', plan.client_registration_id)
      .single();

    if (!reg) return clientData;

    // Build enriched client by overriding billing fields from registration
    return {
      ...clientData,
      // Name: keep client master name (registration label is branch label, not the legal entity for exports)
      name: reg.legal_name || clientData.name,
      // Billing address overrides
      billing_address_line1: reg.billing_address_line1 || clientData.billing_address_line1,
      billing_address_line2: reg.billing_address_line2 || clientData.billing_address_line2,
      billing_city: reg.billing_city || clientData.billing_city,
      billing_state: reg.billing_state || clientData.billing_state,
      billing_pincode: reg.billing_pincode || clientData.billing_pincode,
      // GST override
      gst_number: reg.gstin || clientData.gst_number,
      // State code
      state_code: reg.state_code || clientData.state_code,
      // Shipping address overrides (if registration has them)
      ...(reg.shipping_address_line1 ? {
        shipping_address_line1: reg.shipping_address_line1,
        shipping_address_line2: reg.shipping_address_line2 || clientData.shipping_address_line2,
        shipping_city: reg.shipping_city || clientData.shipping_city,
        shipping_state: reg.shipping_state || clientData.shipping_state,
        shipping_pincode: reg.shipping_pincode || clientData.shipping_pincode,
      } : {}),
      // Preserve legacy city/state fields too for fallback chains
      city: reg.billing_city || clientData.city,
      state: reg.billing_state || clientData.state,
    };
  } catch (err) {
    console.warn('[resolveExportClient] Failed to fetch registration, using client master:', err);
    return clientData;
  }
}
