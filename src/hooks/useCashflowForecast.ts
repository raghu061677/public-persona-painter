import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

export interface ForecastBucket {
  label: string;
  days: number;
  expected: number;
  promised: number;
  invoiceCount: number;
}

export interface CashflowForecastData {
  buckets: ForecastBucket[];
  totalExpected: number;
  totalPromised: number;
  riskAdjusted: number;
}

/**
 * Forecasts incoming cash based on due_date, promised_date, and client behavior.
 */
export function useCashflowForecast() {
  const { company } = useCompany();
  const companyId = company?.id;

  const invoicesQuery = useQuery({
    queryKey: ["forecast-invoices", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, client_id, client_name, due_date, balance_due, status")
        .eq("company_id", companyId!)
        .not("status", "in", '("Draft","Cancelled","Paid")')
        .gt("balance_due", 0);
      if (error) throw error;
      return data || [];
    },
  });

  // Get latest promised dates from followups
  const followupsQuery = useQuery({
    queryKey: ["forecast-followups", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_followups")
        .select("invoice_id, promised_payment_date")
        .eq("company_id", companyId!)
        .not("promised_payment_date", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Client risk scores for adjustment
  const riskQuery = useQuery({
    queryKey: ["forecast-risk-scores", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_risk_scores")
        .select("client_id, risk_level, payment_consistency_score")
        .eq("company_id", companyId!);
      if (error) throw error;
      return data || [];
    },
  });

  const forecast = useMemo<CashflowForecastData>(() => {
    const invoices = invoicesQuery.data || [];
    const followups = followupsQuery.data || [];
    const risks = riskQuery.data || [];
    
    if (!invoices.length) {
      return { buckets: [], totalExpected: 0, totalPromised: 0, riskAdjusted: 0 };
    }

    // Build promised date map (latest per invoice)
    const promisedMap = new Map<string, string>();
    for (const f of followups) {
      if (!promisedMap.has(f.invoice_id) && f.promised_payment_date) {
        promisedMap.set(f.invoice_id, f.promised_payment_date);
      }
    }

    // Risk multiplier map
    const riskMultiplier = new Map<string, number>();
    for (const r of risks) {
      const mult = r.risk_level === "HIGH" ? 0.5 : r.risk_level === "MEDIUM" ? 0.75 : 0.95;
      riskMultiplier.set(r.client_id, mult);
    }

    const today = new Date();
    const todayMs = today.getTime();

    const bucketDefs = [
      { label: "Next 7 Days", days: 7 },
      { label: "Next 15 Days", days: 15 },
      { label: "Next 30 Days", days: 30 },
    ];

    const buckets: ForecastBucket[] = bucketDefs.map(def => ({
      ...def,
      expected: 0,
      promised: 0,
      invoiceCount: 0,
    }));

    let totalExpected = 0;
    let totalPromised = 0;
    let riskAdjusted = 0;

    for (const inv of invoices) {
      const balance = Number(inv.balance_due || 0);
      const dueDate = inv.due_date ? new Date(inv.due_date) : null;
      const promisedDate = promisedMap.get(inv.id);
      const effectiveDate = promisedDate ? new Date(promisedDate) : dueDate;
      const mult = riskMultiplier.get(inv.client_id) ?? 0.9;

      if (!effectiveDate) continue;

      const daysAway = Math.ceil((effectiveDate.getTime() - todayMs) / 86400000);
      
      totalExpected += balance;
      if (promisedDate) totalPromised += balance;
      riskAdjusted += balance * mult;

      for (const bucket of buckets) {
        if (daysAway <= bucket.days && daysAway >= 0) {
          bucket.expected += balance;
          if (promisedDate) bucket.promised += balance;
          bucket.invoiceCount++;
          break; // Only count in smallest applicable bucket
        }
      }
    }

    // Make buckets cumulative
    for (let i = 1; i < buckets.length; i++) {
      buckets[i].expected += buckets[i - 1].expected;
      buckets[i].promised += buckets[i - 1].promised;
      buckets[i].invoiceCount += buckets[i - 1].invoiceCount;
    }

    return { buckets, totalExpected, totalPromised, riskAdjusted };
  }, [invoicesQuery.data, followupsQuery.data, riskQuery.data]);

  return {
    forecast,
    isLoading: invoicesQuery.isLoading,
  };
}
