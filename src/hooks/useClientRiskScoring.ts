import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

export interface ClientRiskScore {
  clientId: string;
  clientName: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  avgDelayDays: number;
  overdueFrequency: number;
  totalOutstanding: number;
  paymentConsistencyScore: number;
  lastComputedAt: string | null;
}

/**
 * Computes risk scores from invoices + payments data (client-side).
 * Persists to client_risk_scores table for dashboard display.
 */
export function useClientRiskScoring() {
  const { company } = useCompany();
  const companyId = company?.id;
  const queryClient = useQueryClient();

  // Fetch invoices for scoring
  const invoicesQuery = useQuery({
    queryKey: ["risk-scoring-invoices", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, client_id, client_name, due_date, invoice_date, total_amount, paid_amount, balance_due, status")
        .eq("company_id", companyId!)
        .not("status", "in", '("Draft","Cancelled")');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch payments for delay computation
  const paymentsQuery = useQuery({
    queryKey: ["risk-scoring-payments", companyId],
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

  // Fetch persisted scores
  const scoresQuery = useQuery({
    queryKey: ["client-risk-scores", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_risk_scores")
        .select("*")
        .eq("company_id", companyId!);
      if (error) throw error;
      return data || [];
    },
  });

  // Compute scores client-side
  const computedScores = useMemo<ClientRiskScore[]>(() => {
    const invoices = invoicesQuery.data || [];
    const payments = paymentsQuery.data || [];
    if (!invoices.length) return [];

    // Group invoices by client
    const clientMap = new Map<string, { name: string; invoices: typeof invoices }>();
    for (const inv of invoices) {
      const key = inv.client_id;
      if (!clientMap.has(key)) {
        clientMap.set(key, { name: inv.client_name || "Unknown", invoices: [] });
      }
      clientMap.get(key)!.invoices.push(inv);
    }

    // Build payment lookup: invoice_id -> earliest payment_date
    const paymentDateMap = new Map<string, string>();
    for (const p of payments) {
      const existing = paymentDateMap.get(p.invoice_id);
      if (!existing || p.payment_date < existing) {
        paymentDateMap.set(p.invoice_id, p.payment_date);
      }
    }

    const today = new Date();
    const scores: ClientRiskScore[] = [];

    for (const [clientId, data] of clientMap) {
      const { name, invoices: clientInvoices } = data;

      let totalDelay = 0;
      let delayCount = 0;
      let overdueCount = 0;
      let totalOutstanding = 0;
      let paidOnTimeCount = 0;
      let totalSettled = 0;

      for (const inv of clientInvoices) {
        const balanceDue = Number(inv.balance_due || 0);
        totalOutstanding += balanceDue;

        const dueDate = inv.due_date ? new Date(inv.due_date) : null;
        
        if (dueDate && dueDate < today && balanceDue > 0.01) {
          overdueCount++;
        }

        // Compute delay for paid/partial invoices
        const firstPaymentDate = paymentDateMap.get(inv.id);
        if (firstPaymentDate && dueDate) {
          const delay = Math.max(0, Math.ceil((new Date(firstPaymentDate).getTime() - dueDate.getTime()) / 86400000));
          totalDelay += delay;
          delayCount++;
          if (delay <= 0) paidOnTimeCount++;
          totalSettled++;
        } else if (inv.status === "Paid") {
          totalSettled++;
          paidOnTimeCount++;
        }
      }

      const avgDelayDays = delayCount > 0 ? Math.round(totalDelay / delayCount) : 0;
      const consistencyScore = totalSettled > 0 ? Math.round((paidOnTimeCount / totalSettled) * 100) : 100;

      // Risk level assignment
      let riskLevel: "LOW" | "MEDIUM" | "HIGH" = "LOW";
      if (avgDelayDays > 30 || overdueCount >= 3 || totalOutstanding > 500000) {
        riskLevel = "HIGH";
      } else if (avgDelayDays > 15 || overdueCount >= 1 || totalOutstanding > 100000) {
        riskLevel = "MEDIUM";
      }

      scores.push({
        clientId,
        clientName: name,
        riskLevel,
        avgDelayDays,
        overdueFrequency: overdueCount,
        totalOutstanding,
        paymentConsistencyScore: consistencyScore,
        lastComputedAt: new Date().toISOString(),
      });
    }

    return scores.sort((a, b) => {
      const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return order[a.riskLevel] - order[b.riskLevel] || b.totalOutstanding - a.totalOutstanding;
    });
  }, [invoicesQuery.data, paymentsQuery.data]);

  // Persist scores
  const persistMutation = useMutation({
    mutationFn: async (scores: ClientRiskScore[]) => {
      if (!companyId || !scores.length) return;
      for (const s of scores) {
        await supabase
          .from("client_risk_scores")
          .upsert({
            company_id: companyId,
            client_id: s.clientId,
            risk_level: s.riskLevel,
            avg_delay_days: s.avgDelayDays,
            overdue_frequency: s.overdueFrequency,
            total_outstanding: s.totalOutstanding,
            payment_consistency_score: s.paymentConsistencyScore,
            last_computed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: "company_id,client_id" });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-risk-scores"] });
    },
  });

  // Get risk for a specific client
  const getRiskForClient = (clientId: string): ClientRiskScore | undefined => {
    return computedScores.find(s => s.clientId === clientId);
  };

  // Get persisted risk for a client
  const getPersistedRisk = (clientId: string) => {
    return (scoresQuery.data || []).find((s: any) => s.client_id === clientId);
  };

  return {
    scores: computedScores,
    persistedScores: scoresQuery.data || [],
    isLoading: invoicesQuery.isLoading || paymentsQuery.isLoading,
    getRiskForClient,
    getPersistedRisk,
    persistScores: () => persistMutation.mutate(computedScores),
    isPersisting: persistMutation.isPending,
  };
}
