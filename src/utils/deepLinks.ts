/**
 * Deep-Link URL builders for Go-Ads 360° reports and dashboards.
 * All helpers return a URL string with properly encoded query params.
 */

function buildUrl(base: string, params: Record<string, string | undefined | null>): string {
  const url = new URL(base, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });
  return url.pathname + url.search;
}

// Shared date helpers
export function currentMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return { from, to, month };
}

// ── Financial Summary ──────────────────────────────────────────────
export interface FinancialLinkParams {
  mode?: "monthly" | "quarterly" | "yearly" | "custom";
  from?: string;
  to?: string;
  month?: string;
  quarter?: string;
  year?: string;
}

export function buildFinancialLink(p: FinancialLinkParams = {}): string {
  return buildUrl("/admin/reports/financial", {
    mode: p.mode,
    from: p.from,
    to: p.to,
    month: p.month,
    quarter: p.quarter,
    year: p.year,
  });
}

// ── Revenue Control Center ─────────────────────────────────────────
export interface RevenueLinkParams {
  tab?: "overview" | "campaign" | "asset" | "geo" | "forecast";
  from?: string;
  to?: string;
  month?: string;
  city?: string;
  area?: string;
  mediaType?: string;
  client?: string;
  status?: string;
}

export function buildRevenueLink(p: RevenueLinkParams = {}): string {
  return buildUrl("/admin/reports/revenue", {
    tab: p.tab,
    from: p.from,
    to: p.to,
    month: p.month,
    city: p.city,
    area: p.area,
    mediaType: p.mediaType,
    client: p.client,
    status: p.status,
  });
}

// ── Payments Control Center ────────────────────────────────────────
export interface PaymentsLinkParams {
  tab?: "all" | "confirmations" | "approvals" | "overdue" | "clients";
  from?: string;
  to?: string;
  mode?: string;
  client?: string;
  invoice?: string;
  status?: string;
}

export function buildPaymentsLink(p: PaymentsLinkParams = {}): string {
  return buildUrl("/admin/payments", {
    tab: p.tab,
    from: p.from,
    to: p.to,
    mode: p.mode,
    client: p.client,
    invoice: p.invoice,
    status: p.status,
  });
}

// ── Booked Media Report ────────────────────────────────────────────
export interface BookedMediaLinkParams {
  from?: string;
  to?: string;
  city?: string;
  area?: string;
  mediaType?: string;
  location?: string;
  assetId?: string;
  status?: string;
  sort?: string;
}

export function buildBookedMediaLink(p: BookedMediaLinkParams = {}): string {
  return buildUrl("/admin/reports/booked-media", {
    from: p.from,
    to: p.to,
    city: p.city,
    area: p.area,
    mediaType: p.mediaType,
    location: p.location,
    assetId: p.assetId,
    status: p.status,
    sort: p.sort,
  });
}

// ── OOH KPIs ───────────────────────────────────────────────────────
export interface OOHKpisLinkParams {
  from?: string;
  to?: string;
  city?: string;
  mediaType?: string;
  tab?: "overview" | "occupancy" | "revenue";
}

export function buildOOHKpisLink(p: OOHKpisLinkParams = {}): string {
  return buildUrl("/admin/reports/ooh-kpis", {
    from: p.from,
    to: p.to,
    city: p.city,
    mediaType: p.mediaType,
    tab: p.tab,
  });
}

// ── Invoices ───────────────────────────────────────────────────────
export interface InvoicesLinkParams {
  from?: string;
  to?: string;
  status?: string;
  client?: string;
}

export function buildInvoicesLink(p: InvoicesLinkParams = {}): string {
  return buildUrl("/admin/invoices", {
    from: p.from,
    to: p.to,
    status: p.status,
    client: p.client,
  });
}

// ── Vacant Media ───────────────────────────────────────────────────
export function buildVacantMediaLink(p: { from?: string; to?: string; city?: string; mediaType?: string } = {}): string {
  return buildUrl("/admin/reports/vacant-media", {
    from: p.from,
    to: p.to,
    city: p.city,
    mediaType: p.mediaType,
  });
}

// ── Campaign Bookings ──────────────────────────────────────────────
export function buildCampaignBookingsLink(p: { from?: string; to?: string; status?: string; month?: string } = {}): string {
  return buildUrl("/admin/reports/campaigns", {
    from: p.from,
    to: p.to,
    status: p.status,
    month: p.month,
  });
}

// ── Client Bookings ────────────────────────────────────────────────
export function buildClientBookingsLink(p: { from?: string; to?: string; client?: string } = {}): string {
  return buildUrl("/admin/reports/client-bookings", {
    from: p.from,
    to: p.to,
    client: p.client,
  });
}
