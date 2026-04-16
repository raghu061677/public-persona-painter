/**
 * Phase 4C: Registration-aware address resolution for invoice PDF templates.
 * Prefers registration snapshot fields when present, falls back to legacy client fields.
 */

interface AddressBlock {
  name: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string;
  contact?: string;
}

function formatSnapshotAddress(snapshot: any): { line1: string; line2: string; city: string; state: string; pincode: string } {
  if (!snapshot || typeof snapshot !== 'object') return { line1: '', line2: '', city: '', state: '', pincode: '' };
  return {
    line1: snapshot.line1 || '',
    line2: snapshot.line2 || '',
    city: [snapshot.city, snapshot.district].filter(Boolean).join(', '),
    state: snapshot.state || '',
    pincode: snapshot.pincode || '',
  };
}

/**
 * Resolve Bill To address using registration snapshot → legacy client fallback.
 */
export function resolveBillTo(data: { invoice: any; client: any }): AddressBlock {
  const inv = data.invoice || {};
  const client = data.client || {};

  // Check if registration billing snapshot exists
  const regBilling = inv.registration_billing_address_snapshot;
  const hasRegSnapshot = !!(inv.registration_gstin_snapshot || (regBilling && typeof regBilling === 'object' && Object.keys(regBilling).length > 0));

  if (hasRegSnapshot) {
    const addr = formatSnapshotAddress(regBilling);
    return {
      name: client.name || inv.registration_label_snapshot || 'Client',
      address1: addr.line1 || client.billing_address_line1 || client.address || '',
      address2: addr.line2 || client.billing_address_line2 || '',
      city: addr.city || client.billing_city || client.city || '',
      state: addr.state || inv.registration_state_snapshot || client.billing_state || client.state || '',
      pincode: addr.pincode || client.billing_pincode || client.pincode || '',
      gstin: inv.registration_gstin_snapshot || client.gst_number || '',
      contact: client.contact_person || '',
    };
  }

  // Legacy fallback
  return {
    name: client.name || 'Client',
    address1: client.billing_address_line1 || client.address || '',
    address2: client.billing_address_line2 || '',
    city: client.billing_city || client.city || '',
    state: client.billing_state || client.state || '',
    pincode: client.billing_pincode || client.pincode || '',
    gstin: client.gst_number || '',
    contact: client.contact_person || '',
  };
}

/**
 * Resolve Ship To address using registration snapshot → legacy client fallback.
 */
export function resolveShipTo(data: { invoice: any; client: any }, billTo: AddressBlock): { address: AddressBlock; sameAsBillTo: boolean } {
  const inv = data.invoice || {};
  const client = data.client || {};

  // Check registration shipping snapshot
  const regShipping = inv.registration_shipping_address_snapshot;
  const hasRegShipping = regShipping && typeof regShipping === 'object' && Object.keys(regShipping).length > 0;

  if (hasRegShipping) {
    const addr = formatSnapshotAddress(regShipping);
    const shipAddr: AddressBlock = {
      name: billTo.name,
      address1: addr.line1 || billTo.address1,
      address2: addr.line2 || billTo.address2,
      city: addr.city || billTo.city,
      state: addr.state || billTo.state,
      pincode: addr.pincode || billTo.pincode,
      gstin: billTo.gstin,
    };
    // Check if effectively same as bill to
    const isSame = shipAddr.address1 === billTo.address1 && shipAddr.city === billTo.city && shipAddr.state === billTo.state;
    return { address: shipAddr, sameAsBillTo: isSame };
  }

  // Legacy fallback
  const hasShipping = !!(client.shipping_address_line1 || client.shipping_city);
  return {
    address: {
      name: client.name || 'Client',
      address1: client.shipping_address_line1 || billTo.address1,
      address2: client.shipping_address_line2 || billTo.address2,
      city: client.shipping_city || billTo.city,
      state: client.shipping_state || billTo.state,
      pincode: client.shipping_pincode || billTo.pincode,
      gstin: billTo.gstin,
    },
    sameAsBillTo: !hasShipping,
  };
}

/**
 * Resolve GSTIN for export mapper: registration snapshot → legacy invoice snapshot → client.
 */
export function resolveGstin(row: any): string {
  return row.registration_gstin_snapshot
    || row.client_gstin_snapshot
    || row.client_gst_number
    || row.client_gstin
    || row.gstin
    || '';
}

/**
 * Resolve place of supply: registration state snapshot → invoice field → fallback.
 */
export function resolvePlaceOfSupply(row: any): string {
  return row.place_of_supply
    || row.registration_state_snapshot
    || row.billing_state
    || '';
}
