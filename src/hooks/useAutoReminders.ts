import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

interface ReminderCandidate {
  invoiceId: string;
  invoiceNo: string;
  clientName: string;
  overdueDays: number;
  balanceDue: number;
  reminderType: "soft" | "overdue" | "final" | "promise_broken";
  reason: string;
}

/**
 * Auto-reminder engine: identifies invoices needing follow-up and creates
 * automated reminders + follow-up entries.
 */
export function useAutoReminders() {
  const { company } = useCompany();
  const companyId = company?.id;
  const queryClient = useQueryClient();

  // Fetch unpaid invoices
  const invoicesQuery = useQuery({
    queryKey: ["auto-reminder-invoices", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_no, client_id, client_name, due_date, balance_due, status")
        .eq("company_id", companyId!)
        .not("status", "in", '("Draft","Cancelled","Paid")')
        .gt("balance_due", 0);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch existing auto reminders (today)
  const existingRemindersQuery = useQuery({
    queryKey: ["auto-reminders-today", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("collection_auto_reminders")
        .select("invoice_id, reminder_type")
        .eq("company_id", companyId!)
        .gte("triggered_at", todayStart.toISOString());
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch latest promised dates from followups
  const followupsQuery = useQuery({
    queryKey: ["auto-reminder-followups", companyId],
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

  // Identify candidates
  const getCandidates = useCallback((): ReminderCandidate[] => {
    const invoices = invoicesQuery.data || [];
    const existing = new Set(
      (existingRemindersQuery.data || []).map(r => `${r.invoice_id}:${r.reminder_type}`)
    );
    const followups = followupsQuery.data || [];

    // Build promised date map
    const promisedMap = new Map<string, string>();
    for (const f of followups) {
      if (!promisedMap.has(f.invoice_id) && f.promised_payment_date) {
        promisedMap.set(f.invoice_id, f.promised_payment_date);
      }
    }

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const candidates: ReminderCandidate[] = [];

    for (const inv of invoices) {
      const dueDate = inv.due_date ? new Date(inv.due_date) : null;
      if (!dueDate) continue;

      const overdueDays = Math.max(0, Math.ceil((today.getTime() - dueDate.getTime()) / 86400000));
      const balance = Number(inv.balance_due || 0);

      // Check promise broken
      const promisedDate = promisedMap.get(inv.id);
      if (promisedDate && promisedDate < todayStr && balance > 0) {
        const key = `${inv.id}:promise_broken`;
        if (!existing.has(key)) {
          candidates.push({
            invoiceId: inv.id,
            invoiceNo: inv.invoice_no || inv.id.slice(0, 8),
            clientName: inv.client_name || "Unknown",
            overdueDays,
            balanceDue: balance,
            reminderType: "promise_broken",
            reason: `Promise broken – was due by ${promisedDate}`,
          });
        }
        continue; // promise_broken takes priority
      }

      // Determine reminder type by overdue days
      let reminderType: ReminderCandidate["reminderType"] | null = null;
      let reason = "";

      if (overdueDays > 15) {
        reminderType = "final";
        reason = `Overdue ${overdueDays} days – final reminder`;
      } else if (overdueDays > 7) {
        reminderType = "overdue";
        reason = `Overdue ${overdueDays} days – overdue reminder`;
      } else if (overdueDays > 3) {
        reminderType = "soft";
        reason = `Overdue ${overdueDays} days – soft reminder`;
      }

      if (reminderType) {
        const key = `${inv.id}:${reminderType}`;
        if (!existing.has(key)) {
          candidates.push({
            invoiceId: inv.id,
            invoiceNo: inv.invoice_no || inv.id.slice(0, 8),
            clientName: inv.client_name || "Unknown",
            overdueDays,
            balanceDue: balance,
            reminderType,
            reason,
          });
        }
      }
    }

    return candidates.sort((a, b) => b.overdueDays - a.overdueDays);
  }, [invoicesQuery.data, existingRemindersQuery.data, followupsQuery.data]);

  // Execute reminders: create auto_reminder + followup entries
  const executeMutation = useMutation({
    mutationFn: async (candidates: ReminderCandidate[]) => {
      if (!companyId || !candidates.length) return;

      // Insert auto reminder records
      const reminderInserts = candidates.map(c => ({
        company_id: companyId,
        invoice_id: c.invoiceId,
        reminder_type: c.reminderType,
        overdue_days: c.overdueDays,
        balance_at_trigger: c.balanceDue,
        note: c.reason,
      }));

      const { error: remErr } = await supabase
        .from("collection_auto_reminders")
        .insert(reminderInserts);
      if (remErr) throw remErr;

      // Also create followup entries so they appear in collections
      const followupInserts = candidates.map(c => ({
        company_id: companyId,
        invoice_id: c.invoiceId,
        note: `[Auto] ${c.reason}`,
        contact_type: "system",
        follow_up_date: new Date().toISOString().split("T")[0],
      }));

      const { error: fupErr } = await supabase
        .from("invoice_followups")
        .insert(followupInserts);
      if (fupErr) throw fupErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auto-reminders-today"] });
      queryClient.invalidateQueries({ queryKey: ["auto-reminder-invoices"] });
    },
  });

  return {
    candidates: getCandidates(),
    isLoading: invoicesQuery.isLoading || existingRemindersQuery.isLoading,
    executeReminders: (candidates: ReminderCandidate[]) => executeMutation.mutate(candidates),
    isExecuting: executeMutation.isPending,
    executeAll: () => executeMutation.mutate(getCandidates()),
  };
}
