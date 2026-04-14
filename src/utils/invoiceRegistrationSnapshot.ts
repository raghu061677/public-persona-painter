/**
 * Phase 4A: Build registration snapshot fields for invoice creation.
 * Fetches client_registration details from the campaign's client_registration_id
 * and returns formatted snapshot fields to merge into the invoice insert payload.
 *
 * Returns empty object if no registration is linked — fully backward compatible.
 */
import { supabase } from "@/integrations/supabase/client";

function buildAddressObj(parts: Record<string, string | null | undefined>) {
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(parts)) {
    if (v) clean[k] = v;
  }
  return Object.keys(clean).length > 0 ? clean : null;
}

interface RegistrationSnapshotFields {
  client_registration_id?: string;
  registration_label_snapshot?: string;
  registration_gstin_snapshot?: string;
  registration_billing_address_snapshot?: Record<string, string> | null;
  registration_shipping_address_snapshot?: Record<string, string> | null;
  registration_state_snapshot?: string;
  registration_state_code_snapshot?: string;
}

/**
 * Fetch registration snapshot fields for a campaign.
 * @param campaignId - campaign id to look up client_registration_id
 * @returns snapshot fields to spread into invoice insert, or empty object
 */
export async function buildRegistrationSnapshot(
  campaignId: string
): Promise<RegistrationSnapshotFields> {
  if (!campaignId) return {};

  // 1. Get campaign's client_registration_id
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("client_registration_id")
    .eq("id", campaignId)
    .maybeSingle();

  const regId = campaign?.client_registration_id;
  if (!regId) return {};

  // 2. Fetch the registration record
  const { data: reg } = await supabase
    .from("client_registrations")
    .select(
      "id, label, gstin, billing_address_line1, billing_address_line2, billing_city, billing_district, billing_state, billing_pincode, billing_country, shipping_address_line1, shipping_address_line2, shipping_city, shipping_district, shipping_state, shipping_pincode, shipping_country, state_code"
    )
    .eq("id", regId)
    .maybeSingle();

  if (!reg) return {};

  return {
    client_registration_id: reg.id,
    registration_label_snapshot: reg.label || undefined,
    registration_gstin_snapshot: reg.gstin || undefined,
    registration_billing_address_snapshot: buildAddressObj({
      line1: reg.billing_address_line1,
      line2: reg.billing_address_line2,
      city: reg.billing_city,
      district: reg.billing_district,
      state: reg.billing_state,
      pincode: reg.billing_pincode,
      country: reg.billing_country,
    }),
    registration_shipping_address_snapshot: buildAddressObj({
      line1: reg.shipping_address_line1,
      line2: reg.shipping_address_line2,
      city: reg.shipping_city,
      district: reg.shipping_district,
      state: reg.shipping_state,
      pincode: reg.shipping_pincode,
      country: reg.shipping_country,
    }),
    registration_state_snapshot: reg.billing_state || undefined,
    registration_state_code_snapshot: reg.state_code || undefined,
  };
}
