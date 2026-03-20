/**
 * Canonical status sets and normalization.
 * Single source of truth for status validation across modules.
 */

// ── Payment Confirmation Statuses ──
export const PAYMENT_CONFIRMATION_STATUSES = ["Pending", "Approved", "Rejected"] as const;
export type PaymentConfirmationStatus = (typeof PAYMENT_CONFIRMATION_STATUSES)[number];

const PAYMENT_CONFIRMATION_ALIASES: Record<string, PaymentConfirmationStatus> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  declined: "Rejected",
};

export function normalizePaymentConfirmationStatus(status: string | null | undefined): PaymentConfirmationStatus {
  const raw = String(status ?? "").trim();
  if ((PAYMENT_CONFIRMATION_STATUSES as readonly string[]).includes(raw)) return raw as PaymentConfirmationStatus;
  const lower = raw.toLowerCase();
  return PAYMENT_CONFIRMATION_ALIASES[lower] ?? "Pending";
}

// ── Invoice Statuses ──
export const INVOICE_STATUSES = ["Draft", "Sent", "Paid", "Overdue", "Cancelled", "Partially Paid"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

const INVOICE_ALIASES: Record<string, InvoiceStatus> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
  canceled: "Cancelled",
  "partially paid": "Partially Paid",
  partial: "Partially Paid",
};

export function normalizeInvoiceStatus(status: string | null | undefined): InvoiceStatus {
  const raw = String(status ?? "").trim();
  if ((INVOICE_STATUSES as readonly string[]).includes(raw)) return raw as InvoiceStatus;
  return INVOICE_ALIASES[raw.toLowerCase()] ?? "Draft";
}

// ── Campaign Statuses ──
export const CAMPAIGN_STATUSES = ["Draft", "Upcoming", "Running", "Completed", "Cancelled", "Archived"] as const;
export type CampaignStatusCanonical = (typeof CAMPAIGN_STATUSES)[number];

const CAMPAIGN_ALIASES: Record<string, CampaignStatusCanonical> = {
  draft: "Draft",
  upcoming: "Upcoming",
  running: "Running",
  active: "Running",
  confirmed: "Running",
  "in progress": "Running",
  in_progress: "Running",
  completed: "Completed",
  cancelled: "Cancelled",
  canceled: "Cancelled",
  archived: "Archived",
  planned: "Draft",
};

export function normalizeCampaignStatus(status: string | null | undefined): CampaignStatusCanonical {
  const raw = String(status ?? "").trim();
  if ((CAMPAIGN_STATUSES as readonly string[]).includes(raw)) return raw as CampaignStatusCanonical;
  return CAMPAIGN_ALIASES[raw.toLowerCase()] ?? "Draft";
}

// ── Media Asset Statuses ──
export const MEDIA_ASSET_STATUSES = ["Available", "Booked", "Blocked", "Under Maintenance", "Expired"] as const;
export type MediaAssetStatusCanonical = (typeof MEDIA_ASSET_STATUSES)[number];

const MEDIA_ASSET_ALIASES: Record<string, MediaAssetStatusCanonical> = {
  available: "Available",
  booked: "Booked",
  blocked: "Blocked",
  "under maintenance": "Under Maintenance",
  maintenance: "Under Maintenance",
  expired: "Expired",
};

export function normalizeMediaAssetStatus(status: string | null | undefined): MediaAssetStatusCanonical {
  const raw = String(status ?? "").trim();
  if ((MEDIA_ASSET_STATUSES as readonly string[]).includes(raw)) return raw as MediaAssetStatusCanonical;
  return MEDIA_ASSET_ALIASES[raw.toLowerCase()] ?? "Available";
}

/**
 * Generic status validator: returns true if value is in the canonical set.
 * Useful for audit checks.
 */
export function isCanonicalStatus(value: string | null | undefined, canonicalSet: readonly string[]): boolean {
  const raw = String(value ?? "").trim();
  return canonicalSet.includes(raw);
}
