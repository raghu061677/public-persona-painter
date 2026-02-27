/**
 * Shared profitability utilities for the profitability gate system.
 * Used by all invoice generation entry points.
 */
import { supabase } from "@/integrations/supabase/client";

export interface ProfitLockSettings {
  enabled: boolean;
  minMargin: number;
  watchBuffer: number;
}

export interface ProfitabilitySnapshot {
  revenue: number;
  invoiceRevenue: number;
  bookingRevenue: number;
  directCosts: number;
  mountingCost: number;
  printingCost: number;
  unmountingCost: number;
  otherCosts: number;
  netProfit: number;
  marginPercent: number;
  marginStatus: "green" | "yellow" | "red";
  calcFailed?: boolean;
}

const SETTINGS_PREFIX = "goads_profit_lock_";
const LEGACY_PREFIX = "goads_min_margin_";

/**
 * Get profitability lock settings from localStorage.
 * Migrates from legacy key if needed.
 */
export function getProfitLockSettings(companyId?: string): ProfitLockSettings {
  const defaults: ProfitLockSettings = { enabled: true, minMargin: 15, watchBuffer: 5 };
  if (!companyId) return defaults;

  try {
    const raw = localStorage.getItem(`${SETTINGS_PREFIX}${companyId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaults, ...parsed };
    }
    // Migrate from legacy single-value key
    const legacy = localStorage.getItem(`${LEGACY_PREFIX}${companyId}`);
    if (legacy) {
      return { ...defaults, minMargin: parseFloat(legacy) };
    }
  } catch { /* fallback */ }
  return defaults;
}

/**
 * Save profitability lock settings to localStorage.
 * Also writes legacy key for backward compat.
 */
export function setProfitLockSettings(companyId: string, settings: Partial<ProfitLockSettings>) {
  const current = getProfitLockSettings(companyId);
  const updated = { ...current, ...settings };
  localStorage.setItem(`${SETTINGS_PREFIX}${companyId}`, JSON.stringify(updated));
  // Keep legacy key in sync for backward compat
  localStorage.setItem(`${LEGACY_PREFIX}${companyId}`, String(updated.minMargin));
}

/**
 * Compute profitability snapshot for a campaign.
 * Non-throwing: returns calcFailed=true on error.
 */
export async function computeCampaignProfitabilitySnapshot(
  campaignId: string,
  companyId: string,
  bookingValue: number = 0,
): Promise<ProfitabilitySnapshot> {
  try {
    const [invoicesRes, expensesRes] = await Promise.all([
      supabase
        .from("invoices")
        .select("id, total_amount, status")
        .eq("campaign_id", campaignId)
        .eq("company_id", companyId)
        .in("status", ["Sent", "Paid", "Partial"]),
      supabase
        .from("expenses")
        .select("id, amount, total_amount, category, subcategory")
        .eq("campaign_id", campaignId)
        .eq("company_id", companyId),
    ]);

    const invoices = invoicesRes.data ?? [];
    const expenses = expensesRes.data ?? [];

    const invoiceRevenue = invoices.reduce((s, inv) => s + (inv.total_amount || 0), 0);
    const revenue = invoiceRevenue > 0 ? invoiceRevenue : bookingValue;

    let mountingCost = 0, printingCost = 0, unmountingCost = 0, otherCosts = 0;
    for (const exp of expenses) {
      const amt = exp.total_amount || exp.amount || 0;
      if (exp.category === "Mounting") {
        if (exp.subcategory === "Unmounting") unmountingCost += amt;
        else mountingCost += amt;
      } else if (exp.category === "Printing") {
        printingCost += amt;
      } else {
        otherCosts += amt;
      }
    }

    const directCosts = mountingCost + printingCost + unmountingCost + otherCosts;
    const netProfit = revenue - directCosts;
    const marginPercent = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    const settings = getProfitLockSettings(companyId);
    let marginStatus: "green" | "yellow" | "red" = "green";
    if (revenue <= 0 || marginPercent < settings.minMargin - settings.watchBuffer) {
      marginStatus = "red";
    } else if (marginPercent < settings.minMargin) {
      marginStatus = "yellow";
    }

    return {
      revenue, invoiceRevenue, bookingRevenue: bookingValue,
      directCosts, mountingCost, printingCost, unmountingCost, otherCosts,
      netProfit, marginPercent, marginStatus,
    };
  } catch (err) {
    console.error("Profitability calc failed:", err);
    return {
      revenue: bookingValue, invoiceRevenue: 0, bookingRevenue: bookingValue,
      directCosts: 0, mountingCost: 0, printingCost: 0, unmountingCost: 0, otherCosts: 0,
      netProfit: 0, marginPercent: 0, marginStatus: "red",
      calcFailed: true,
    };
  }
}

/**
 * Get profit status label from margin value.
 */
export function getProfitStatus(
  marginPercent: number,
  minMargin: number,
  buffer: number = 5,
): "green" | "yellow" | "red" {
  if (marginPercent < minMargin - buffer) return "red";
  if (marginPercent < minMargin) return "yellow";
  return "green";
}

/**
 * Log a profitability override to activity_logs.
 * Non-blocking: will not throw on failure.
 */
export async function logProfitabilityOverride(params: {
  campaignId: string;
  campaignName: string;
  invoiceContext: string;
  snapshot: ProfitabilitySnapshot;
  minMargin: number;
  overrideReason: string;
}): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("activity_logs").insert({
      action: "profitability_override",
      resource_type: "campaign",
      resource_id: params.campaignId,
      resource_name: params.campaignName,
      user_id: user?.id,
      user_name: user?.email,
      details: {
        invoice_context: params.invoiceContext,
        min_margin: params.minMargin,
        actual_margin: params.snapshot.marginPercent,
        revenue: params.snapshot.revenue,
        costs: {
          mounting: params.snapshot.mountingCost,
          printing: params.snapshot.printingCost,
          unmounting: params.snapshot.unmountingCost,
          other: params.snapshot.otherCosts,
          total: params.snapshot.directCosts,
        },
        net_profit: params.snapshot.netProfit,
        override_reason: params.overrideReason,
        calc_failed: params.snapshot.calcFailed || false,
      },
    });
    return true;
  } catch (err) {
    console.warn("Failed to log profitability override:", err);
    return false;
  }
}
