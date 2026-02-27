/**
 * Hook: Computes campaign profitability by comparing revenue vs direct costs (expenses).
 * Used for the Profit Summary Box and the Profitability Lock on invoice generation.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CampaignProfitability {
  revenue: number;          // From invoices (paid/sent) or booking value fallback
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
}

// Get minimum margin threshold from localStorage (company-level setting)
export function getMinMarginThreshold(companyId?: string): number {
  if (!companyId) return 15;
  try {
    const raw = localStorage.getItem(`goads_min_margin_${companyId}`);
    return raw ? parseFloat(raw) : 15;
  } catch { return 15; }
}

export function setMinMarginThreshold(companyId: string, percent: number) {
  localStorage.setItem(`goads_min_margin_${companyId}`, String(percent));
}

export function useCampaignProfitability(campaignId: string | undefined, companyId: string | undefined, bookingValue: number = 0) {
  return useQuery({
    queryKey: ["campaign-profitability", campaignId, companyId],
    enabled: !!campaignId && !!companyId,
    queryFn: async (): Promise<CampaignProfitability> => {
      // Fetch invoices for this campaign
      const [invoicesRes, expensesRes] = await Promise.all([
        supabase
          .from("invoices")
          .select("id, total_amount, status")
          .eq("campaign_id", campaignId!)
          .eq("company_id", companyId!)
          .in("status", ["Sent", "Paid", "Partial"]),
        supabase
          .from("expenses")
          .select("id, amount, total_amount, category, subcategory")
          .eq("campaign_id", campaignId!)
          .eq("company_id", companyId!),
      ]);

      const invoices = invoicesRes.data ?? [];
      const expenses = expensesRes.data ?? [];

      const invoiceRevenue = invoices.reduce((s, inv) => s + (inv.total_amount || 0), 0);
      const revenue = invoiceRevenue > 0 ? invoiceRevenue : bookingValue;

      let mountingCost = 0, printingCost = 0, unmountingCost = 0, otherCosts = 0;
      for (const exp of expenses) {
        const amt = exp.total_amount || exp.amount || 0;
        if (exp.category === "Mounting") {
          if (exp.subcategory === "Unmounting") {
            unmountingCost += amt;
          } else {
            mountingCost += amt;
          }
        } else if (exp.category === "Printing") {
          printingCost += amt;
        } else {
          otherCosts += amt;
        }
      }

      const directCosts = mountingCost + printingCost + unmountingCost + otherCosts;
      const netProfit = revenue - directCosts;
      const marginPercent = revenue > 0 ? (netProfit / revenue) * 100 : 0;

      const minMargin = getMinMarginThreshold(companyId);
      let marginStatus: "green" | "yellow" | "red" = "green";
      if (marginPercent < minMargin) marginStatus = "red";
      else if (marginPercent < minMargin + 10) marginStatus = "yellow";

      return {
        revenue,
        invoiceRevenue,
        bookingRevenue: bookingValue,
        directCosts,
        mountingCost,
        printingCost,
        unmountingCost,
        otherCosts,
        netProfit,
        marginPercent,
        marginStatus,
      };
    },
  });
}
