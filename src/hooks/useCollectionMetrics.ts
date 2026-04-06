import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

export interface CollectionMetrics {
  totalInvoiced: number;
  totalCollected: number;
  collectionRate: number;
  avgCollectionDays: number;
  overdueReduction: number; // % of overdue resolved in last 30 days
  followupEffectiveness: number; // % of invoices paid after followup
  activeFollowups: number;
  resolvedAfterFollowup: number;
}

export function useCollectionMetrics() {
  const { company } = useCompany();
  const companyId = company?.id;

  const invoicesQuery = useQuery({
    queryKey: ["collection-metrics-invoices", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, client_id, total_amount, paid_amount, balance_due, status, invoice_date, due_date")
        .eq("company_id", companyId!)
        .not("status", "in", '("Draft","Cancelled")');
      if (error) throw error;
      return data || [];
    },
  });

  const paymentsQuery = useQuery({
    queryKey: ["collection-metrics-payments", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_records")
        .select("id, invoice_id, payment_date, amount")
        .eq("company_id", companyId!)
        .or("is_deleted.is.null,is_deleted.eq.false");
      if (error) throw error;
      return data || [];
    },
  });

  const followupsQuery = useQuery({
    queryKey: ["collection-metrics-followups", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_followups")
        .select("id, invoice_id, created_at")
        .eq("company_id", companyId!);
      if (error) throw error;
      return data || [];
    },
  });

  const metrics = useMemo<CollectionMetrics>(() => {
    const invoices = invoicesQuery.data || [];
    const payments = paymentsQuery.data || [];
    const followups = followupsQuery.data || [];

    const totalInvoiced = invoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
    const totalCollected = invoices.reduce((s, i) => s + Number(i.paid_amount || 0), 0);
    const collectionRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;

    // Average collection days
    const paymentDateMap = new Map<string, string>();
    for (const p of payments) {
      const existing = paymentDateMap.get(p.invoice_id);
      if (!existing || p.payment_date < existing) {
        paymentDateMap.set(p.invoice_id, p.payment_date);
      }
    }

    let totalDays = 0;
    let dayCount = 0;
    for (const inv of invoices) {
      const firstPayment = paymentDateMap.get(inv.id);
      if (firstPayment && inv.invoice_date) {
        const days = Math.max(0, Math.ceil(
          (new Date(firstPayment).getTime() - new Date(inv.invoice_date).getTime()) / 86400000
        ));
        totalDays += days;
        dayCount++;
      }
    }
    const avgCollectionDays = dayCount > 0 ? Math.round(totalDays / dayCount) : 0;

    // Followup effectiveness: % of invoices with followups that are now paid
    const invoicesWithFollowups = new Set(followups.map(f => f.invoice_id));
    const paidAfterFollowup = invoices.filter(
      i => invoicesWithFollowups.has(i.id) && i.status === "Paid"
    ).length;
    const followupEffectiveness = invoicesWithFollowups.size > 0
      ? Math.round((paidAfterFollowup / invoicesWithFollowups.size) * 100)
      : 0;

    // Overdue reduction: compare current overdue vs 30 days ago (simplified)
    const today = new Date();
    const currentOverdue = invoices.filter(i => {
      const due = i.due_date ? new Date(i.due_date) : null;
      return due && due < today && Number(i.balance_due || 0) > 0;
    }).length;
    const totalActive = invoices.filter(i => Number(i.balance_due || 0) > 0).length;
    const overdueReduction = totalActive > 0 ? Math.round(((totalActive - currentOverdue) / totalActive) * 100) : 100;

    return {
      totalInvoiced,
      totalCollected,
      collectionRate,
      avgCollectionDays,
      overdueReduction,
      followupEffectiveness,
      activeFollowups: invoicesWithFollowups.size,
      resolvedAfterFollowup: paidAfterFollowup,
    };
  }, [invoicesQuery.data, paymentsQuery.data, followupsQuery.data]);

  return { metrics, isLoading: invoicesQuery.isLoading };
}
