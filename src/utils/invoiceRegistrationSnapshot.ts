/**
 * Phase 4A: Build registration snapshot fields for invoice creation.
 * Fetches client_registration details from the campaign's client_registration_id
 * and returns formatted snapshot fields to merge into the invoice insert payload.
 *
 * Returns empty object if no registration is linked — fully backward compatible.
 */
import { supabase } from "@/integrations/supabase/client";

function formatAddress(parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(", ");
}

interface RegistrationSnapshotFields {
  client_registration_id?: string;
  registration_label_snapshot?: string;
  registration_gstin_snapshot?: string;
  registration_billing_address_snapshot?: string;
  registration_shipping_address_snapshot?: string;
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
      "id, label, gstin, billing_address_line1, billing_address_line2, billing_city, billing_district, billing_state, billing_state_code, billing_pincode, billing_country, shipping_address_line1, shipping_address_line2, shipping_city, shipping_district, shipping_state, shipping_state_code, shipping_pincode, shipping_country, is_active"
    )
    .eq("id", regId)
    .maybeSingle();

  if (!reg) return {};

  return {
    client_registration_id: reg.id,
    registration_label_snapshot: reg.label || undefined,
    registration_gstin_snapshot: reg.gstin || undefined,
    registration_billing_address_snapshot:
      formatAddress([
        reg.billing_address_line1,
        reg.billing_address_line2,
        reg.billing_city,
        reg.billing_district,
        reg.billing_state,
        reg.billing_pincode,
        reg.billing_country,
      ]) || undefined,
    registration_shipping_address_snapshot:
      formatAddress([
        reg.shipping_address_line1,
        reg.shipping_address_line2,
        reg.shipping_city,
        reg.shipping_district,
        reg.shipping_state,
        reg.shipping_pincode,
        reg.shipping_country,
      ]) || undefined,
    registration_state_snapshot: reg.billing_state || undefined,
    registration_state_code_snapshot: reg.billing_state_code || undefined,
  };
}
