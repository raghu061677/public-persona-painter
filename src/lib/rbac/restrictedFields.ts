/**
 * Restricted Fields Framework for Go-Ads 360°.
 * Central registry of restricted fields per module with filtering utilities.
 * 
 * Usage:
 *   const filtered = filterRestrictedFields('plans', record, { canViewFinancial: false, canViewContacts: false });
 *   const columns = getVisibleColumns('clients', allColumns, { canViewFinancial, canViewContacts });
 */

// ─── Field Categories ───────────────────────────────────────────────────────

export type FieldCategory = 'financial' | 'contact' | 'internal';

export type RestrictedFieldEntry = {
  field: string;
  category: FieldCategory;
  /** Value to show when masked. null = omit entirely. */
  maskedValue?: any;
};

export type RestrictedModule = 'clients' | 'plans' | 'campaigns' | 'invoices' | 'payments' | 'media_assets' | 'operations';

// ─── Central Registry ────────────────────────────────────────────────────────

const RESTRICTED_FIELDS_REGISTRY: Record<RestrictedModule, RestrictedFieldEntry[]> = {
  clients: [
    // Contact fields
    { field: 'email', category: 'contact', maskedValue: '••••••' },
    { field: 'phone', category: 'contact', maskedValue: '••••••' },
    { field: 'mobile', category: 'contact', maskedValue: '••••••' },
    { field: 'work_phone', category: 'contact', maskedValue: '••••••' },
    { field: 'contact_person', category: 'contact', maskedValue: '••••••' },
    { field: 'designation', category: 'contact', maskedValue: '••••••' },
    // Financial
    { field: 'outstanding', category: 'financial' },
    { field: 'total_revenue', category: 'financial' },
    { field: 'balance_due', category: 'financial' },
    { field: 'paid_amount', category: 'financial' },
    // Internal
    { field: 'internal_notes', category: 'internal' },
    { field: 'internal_notes_finance', category: 'internal' },
  ],
  plans: [
    { field: 'negotiated_rate', category: 'financial' },
    { field: 'base_rate', category: 'financial' },
    { field: 'card_rate', category: 'financial' },
    { field: 'final_rate', category: 'financial' },
    { field: 'vendor_rate', category: 'financial' },
    { field: 'grand_total', category: 'financial' },
    { field: 'total_amount', category: 'financial' },
    { field: 'subtotal', category: 'financial' },
    { field: 'taxable_amount', category: 'financial' },
    { field: 'cgst_amount', category: 'financial' },
    { field: 'sgst_amount', category: 'financial' },
    { field: 'igst_amount', category: 'financial' },
    { field: 'discount_amount', category: 'financial' },
    { field: 'margin', category: 'financial' },
    { field: 'profit', category: 'financial' },
    { field: 'mounting_cost', category: 'financial' },
    { field: 'printing_cost', category: 'financial' },
    { field: 'mounting_charges', category: 'financial' },
    { field: 'printing_charges', category: 'financial' },
    { field: 'rent_amount', category: 'financial' },
    { field: 'daily_rate', category: 'financial' },
    { field: 'base_rate_monthly', category: 'financial' },
    { field: 'total_price', category: 'financial' },
    { field: 'amount', category: 'financial' },
    { field: 'amount_before_tax', category: 'financial' },
    { field: 'net_payable', category: 'financial' },
    { field: 'internal_notes', category: 'internal' },
    { field: 'internal_notes_finance', category: 'internal' },
  ],
  campaigns: [
    { field: 'negotiated_rate', category: 'financial' },
    { field: 'base_rate', category: 'financial' },
    { field: 'card_rate', category: 'financial' },
    { field: 'grand_total', category: 'financial' },
    { field: 'total_amount', category: 'financial' },
    { field: 'subtotal', category: 'financial' },
    { field: 'taxable_amount', category: 'financial' },
    { field: 'cgst_amount', category: 'financial' },
    { field: 'sgst_amount', category: 'financial' },
    { field: 'igst_amount', category: 'financial' },
    { field: 'margin', category: 'financial' },
    { field: 'profit', category: 'financial' },
    { field: 'gross_revenue', category: 'financial' },
    { field: 'net_revenue', category: 'financial' },
    { field: 'mounting_cost', category: 'financial' },
    { field: 'printing_cost', category: 'financial' },
    { field: 'mounting_charges', category: 'financial' },
    { field: 'printing_charges', category: 'financial' },
    { field: 'rent_amount', category: 'financial' },
    { field: 'total_price', category: 'financial' },
    { field: 'purchase_cost', category: 'financial' },
    { field: 'commission', category: 'financial' },
    { field: 'internal_notes', category: 'internal' },
    { field: 'internal_notes_finance', category: 'internal' },
  ],
  invoices: [
    { field: 'amount', category: 'financial' },
    { field: 'total_amount', category: 'financial' },
    { field: 'taxable_amount', category: 'financial' },
    { field: 'cgst_amount', category: 'financial' },
    { field: 'sgst_amount', category: 'financial' },
    { field: 'igst_amount', category: 'financial' },
    { field: 'balance_due', category: 'financial' },
    { field: 'paid_amount', category: 'financial' },
    { field: 'discount_amount', category: 'financial' },
    { field: 'invoice_amount', category: 'financial' },
    { field: 'net_payable', category: 'financial' },
    { field: 'payment_status', category: 'financial' },
    { field: 'internal_notes', category: 'internal' },
  ],
  payments: [
    { field: 'amount', category: 'financial' },
    { field: 'payment_mode', category: 'financial' },
    { field: 'reference_number', category: 'financial' },
    { field: 'internal_notes', category: 'internal' },
  ],
  media_assets: [
    { field: 'base_rate', category: 'financial' },
    { field: 'card_rate', category: 'financial' },
    { field: 'vendor_rate', category: 'financial' },
    { field: 'purchase_cost', category: 'financial' },
    { field: 'mounting_cost', category: 'financial' },
    { field: 'printing_cost', category: 'financial' },
    { field: 'mounting_cost_default', category: 'financial' },
    { field: 'printing_cost_default', category: 'financial' },
    { field: 'mounting_rate_per_sqft', category: 'financial' },
    { field: 'printing_rate_per_sqft', category: 'financial' },
    { field: 'rent_amount', category: 'financial' },
    { field: 'daily_rate', category: 'financial' },
    { field: 'base_rate_monthly', category: 'financial' },
  ],
  operations: [
    { field: 'mounting_cost', category: 'financial' },
    { field: 'printing_cost', category: 'financial' },
    { field: 'total_price', category: 'financial' },
  ],
};

// ─── Access Context ──────────────────────────────────────────────────────────

export interface FieldAccessContext {
  canViewFinancial: boolean;
  canViewContacts: boolean;
  /** If true, internal notes are visible. Defaults to same as canViewFinancial. */
  canViewInternal?: boolean;
}

// ─── Core Utilities ──────────────────────────────────────────────────────────

/**
 * Get the list of restricted fields for a module.
 */
export function getRestrictedFields(module: RestrictedModule): RestrictedFieldEntry[] {
  return RESTRICTED_FIELDS_REGISTRY[module] || [];
}

/**
 * Check if a specific field is restricted for the given access context.
 */
export function isFieldRestricted(
  module: RestrictedModule,
  fieldName: string,
  access: FieldAccessContext,
): boolean {
  const entries = RESTRICTED_FIELDS_REGISTRY[module];
  if (!entries) return false;

  const entry = entries.find(e => e.field === fieldName);
  if (!entry) return false;

  switch (entry.category) {
    case 'financial':
      return !access.canViewFinancial;
    case 'contact':
      return !access.canViewContacts;
    case 'internal':
      return !(access.canViewInternal ?? access.canViewFinancial);
    default:
      return false;
  }
}

/**
 * Filter restricted fields from a record, removing or masking them.
 * This is the primary utility for data sanitization before rendering.
 */
export function filterRestrictedFields<T extends Record<string, any>>(
  module: RestrictedModule,
  record: T,
  access: FieldAccessContext,
): T {
  if (access.canViewFinancial && access.canViewContacts) return record;

  const entries = RESTRICTED_FIELDS_REGISTRY[module];
  if (!entries || entries.length === 0) return record;

  const result = { ...record };

  for (const entry of entries) {
    if (!(entry.field in result)) continue;

    const restricted = isFieldRestricted(module, entry.field, access);
    if (restricted) {
      if (entry.maskedValue !== undefined) {
        (result as any)[entry.field] = entry.maskedValue;
      } else {
        delete (result as any)[entry.field];
      }
    }
  }

  return result;
}

/**
 * Filter an array of records through the restricted fields framework.
 */
export function filterRestrictedRecords<T extends Record<string, any>>(
  module: RestrictedModule,
  records: T[],
  access: FieldAccessContext,
): T[] {
  if (access.canViewFinancial && access.canViewContacts) return records;
  return records.map(r => filterRestrictedFields(module, r, access));
}

/**
 * Filter column definitions to exclude restricted columns.
 * Works with any column config that has an `accessorKey` or `id` field.
 */
export function getVisibleColumns<C extends { accessorKey?: string; id?: string }>(
  module: RestrictedModule,
  columns: C[],
  access: FieldAccessContext,
): C[] {
  if (access.canViewFinancial && access.canViewContacts) return columns;

  return columns.filter(col => {
    const key = col.accessorKey || col.id;
    if (!key) return true;
    return !isFieldRestricted(module, key, access);
  });
}

/**
 * Get masked display value for a field.
 */
export function getMaskedValue(
  module: RestrictedModule,
  fieldName: string,
  originalValue: any,
  access: FieldAccessContext,
): { value: any; isMasked: boolean } {
  if (!isFieldRestricted(module, fieldName, access)) {
    return { value: originalValue, isMasked: false };
  }

  const entry = (RESTRICTED_FIELDS_REGISTRY[module] || []).find(e => e.field === fieldName);
  if (entry?.maskedValue !== undefined) {
    return { value: entry.maskedValue, isMasked: true };
  }

  // Default masking by type
  if (typeof originalValue === 'number') return { value: null, isMasked: true };
  if (typeof originalValue === 'string') return { value: '••••••', isMasked: true };
  return { value: null, isMasked: true };
}

/**
 * Get list of field names that are restricted for a given access context.
 * Useful for export filtering.
 */
export function getRestrictedFieldNames(
  module: RestrictedModule,
  access: FieldAccessContext,
): string[] {
  const entries = RESTRICTED_FIELDS_REGISTRY[module] || [];
  return entries
    .filter(e => isFieldRestricted(module, e.field, access))
    .map(e => e.field);
}

/**
 * Check if a module has any financial fields defined.
 */
export function hasFinancialFields(module: RestrictedModule): boolean {
  return (RESTRICTED_FIELDS_REGISTRY[module] || []).some(e => e.category === 'financial');
}

/**
 * Check if a module has any contact fields defined.
 */
export function hasContactFields(module: RestrictedModule): boolean {
  return (RESTRICTED_FIELDS_REGISTRY[module] || []).some(e => e.category === 'contact');
}
