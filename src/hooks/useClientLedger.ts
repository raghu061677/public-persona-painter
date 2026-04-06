import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

export interface LedgerEntry {
  date: string;
  type: "invoice" | "payment" | "tds" | "credit_note";
  refNo: string;
  campaignName: string | null;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
  status: string;
  meta?: Record<string, unknown>;
}

export interface LedgerSummary {
  totalInvoiced: number;
  totalReceived: number;
  totalTds: number;
  totalCredits: number;
  netOutstanding: number;
}

export interface OutstandingRow {
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  tdsAmount: number;
  creditAmount: number;
  balanceDue: number;
  overdueDays: number;
  status: string;
}

export function useClientLedger(clientId: string | null) {
  const { company } = useCompany();
  const companyId = company?.id;

  const invoicesQuery = useQuery({
    queryKey: ["client-ledger-invoices", clientId, companyId],
    enabled: !!clientId && !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_no, invoice_date, due_date, total_amount, sub_total, paid_amount, credited_amount, balance_due, status, campaign_id, client_name, is_draft, is_cancelled, gst_amount")
        .eq("client_id", clientId!)
        .eq("company_id", companyId!)
        .not("status", "in", '("Draft","Cancelled")')
        .order("invoice_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const paymentsQuery = useQuery({
    queryKey: ["client-ledger-payments", clientId, companyId],
    enabled: !!clientId && !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_records")
        .select("id, invoice_id, amount, tds_amount, tds_certificate_no, payment_date, method, reference_no, notes, is_deleted")
        .eq("client_id", clientId!)
        .eq("company_id", companyId!)
        .or("is_deleted.is.null,is_deleted.eq.false")
        .order("payment_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const creditNotesQuery = useQuery({
    queryKey: ["client-ledger-credits", clientId, companyId],
    enabled: !!clientId && !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_notes")
        .select("id, credit_note_id, credit_date, total_amount, invoice_id, reason, status, is_cancelled")
        .eq("client_id", clientId!)
        .eq("company_id", companyId!)
        .eq("is_cancelled", false)
        .order("credit_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Build invoice number lookup
  const invoiceNoMap = useMemo(() => {
    const map: Record<string, string> = {};
    (invoicesQuery.data || []).forEach(inv => {
      map[inv.id] = inv.invoice_no || inv.id.slice(0, 8);
    });
    return map;
  }, [invoicesQuery.data]);

  // Build ledger entries
  const ledgerEntries = useMemo<LedgerEntry[]>(() => {
    if (!invoicesQuery.data) return [];
    const entries: Omit<LedgerEntry, "runningBalance">[] = [];

    // Invoices → debit
    for (const inv of invoicesQuery.data) {
      entries.push({
        date: inv.invoice_date,
        type: "invoice",
        refNo: inv.invoice_no || inv.id.slice(0, 8),
        campaignName: null,
        description: `Invoice raised – ${inv.client_name || ""}`,
        debit: inv.total_amount,
        credit: 0,
        status: inv.status,
      });
    }

    // Payments → credit
    for (const p of paymentsQuery.data || []) {
      if (p.amount > 0) {
        entries.push({
          date: p.payment_date,
          type: "payment",
          refNo: p.reference_no || p.id.slice(0, 8),
          campaignName: null,
          description: `Payment received (${p.method || "Cash"}) – Inv: ${invoiceNoMap[p.invoice_id] || p.invoice_id.slice(0, 8)}`,
          debit: 0,
          credit: p.amount,
          status: "Received",
        });
      }
      // TDS → credit
      if (p.tds_amount > 0) {
        entries.push({
          date: p.payment_date,
          type: "tds",
          refNo: p.tds_certificate_no || p.reference_no || p.id.slice(0, 8),
          campaignName: null,
          description: `TDS deducted – Inv: ${invoiceNoMap[p.invoice_id] || p.invoice_id.slice(0, 8)}`,
          debit: 0,
          credit: p.tds_amount,
          status: p.tds_certificate_no ? "Received" : "Pending",
        });
      }
    }

    // Credit notes → credit
    for (const cn of creditNotesQuery.data || []) {
      entries.push({
        date: cn.credit_date,
        type: "credit_note",
        refNo: cn.credit_note_id,
        campaignName: null,
        description: `Credit note – ${cn.reason || ""} – Inv: ${invoiceNoMap[cn.invoice_id] || cn.invoice_id.slice(0, 8)}`,
        debit: 0,
        credit: cn.total_amount,
        status: cn.status,
      });
    }

    // Sort chronologically
    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Compute running balance
    let balance = 0;
    return entries.map(e => {
      balance += e.debit - e.credit;
      return { ...e, runningBalance: balance };
    });
  }, [invoicesQuery.data, paymentsQuery.data, creditNotesQuery.data, invoiceNoMap]);

  // Summary
  const summary = useMemo<LedgerSummary>(() => {
    const invoices = invoicesQuery.data || [];
    const payments = paymentsQuery.data || [];
    const credits = creditNotesQuery.data || [];

    const totalInvoiced = invoices.reduce((s, i) => s + i.total_amount, 0);
    const totalReceived = payments.reduce((s, p) => s + (p.amount || 0), 0);
    const totalTds = payments.reduce((s, p) => s + (p.tds_amount || 0), 0);
    const totalCredits = credits.reduce((s, c) => s + c.total_amount, 0);
    const netOutstanding = totalInvoiced - totalReceived - totalTds - totalCredits;

    return { totalInvoiced, totalReceived, totalTds, totalCredits, netOutstanding };
  }, [invoicesQuery.data, paymentsQuery.data, creditNotesQuery.data]);

  // Outstanding invoices
  const outstanding = useMemo<OutstandingRow[]>(() => {
    const invoices = invoicesQuery.data || [];
    const today = new Date();
    return invoices
      .filter(i => i.balance_due > 0.01)
      .map(i => {
        const due = new Date(i.due_date);
        const diffDays = Math.max(0, Math.ceil((today.getTime() - due.getTime()) / 86400000));
        return {
          invoiceNo: i.invoice_no || i.id.slice(0, 8),
          invoiceDate: i.invoice_date,
          dueDate: i.due_date,
          totalAmount: i.total_amount,
          paidAmount: i.paid_amount || 0,
          tdsAmount: 0, // computed below
          creditAmount: i.credited_amount || 0,
          balanceDue: i.balance_due,
          overdueDays: diffDays,
          status: i.status,
        };
      })
      .sort((a, b) => b.overdueDays - a.overdueDays);
  }, [invoicesQuery.data]);

  const isLoading = invoicesQuery.isLoading || paymentsQuery.isLoading || creditNotesQuery.isLoading;

  return { ledgerEntries, summary, outstanding, isLoading, invoices: invoicesQuery.data || [] };
}
