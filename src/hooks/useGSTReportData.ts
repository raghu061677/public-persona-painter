import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GSTFilters {
  companyId: string;
  filingMonth: number;
  filingYear: number;
}

export function useGSTReportData(filters: GSTFilters | null) {
  const [summary, setSummary] = useState<any>(null);
  const [b2b, setB2b] = useState<any[]>([]);
  const [b2c, setB2c] = useState<any[]>([]);
  const [creditNotes, setCreditNotes] = useState<any[]>([]);
  const [hsn, setHsn] = useState<any[]>([]);
  const [statewise, setStatewise] = useState<any[]>([]);
  const [validation, setValidation] = useState<any[]>([]);
  const [invoiceRegister, setInvoiceRegister] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!filters) return;
    setLoading(true);
    setError(null);
    const { companyId, filingMonth, filingYear } = filters;
    const eq = (q: any) => q.eq("company_id", companyId).eq("filing_month", filingMonth).eq("filing_year", filingYear);

    try {
      const [sumRes, b2bRes, b2cRes, cnRes, hsnRes, stRes, valRes, regRes] = await Promise.all([
        eq(supabase.from("gst_monthly_summary_v" as any).select("*")).maybeSingle(),
        eq(supabase.from("gst_b2b_v" as any).select("*")).order("invoice_date" as any, { ascending: false }),
        eq(supabase.from("gst_b2c_v" as any).select("*")).order("invoice_date" as any, { ascending: false }),
        eq(supabase.from("gst_credit_note_register_v" as any).select("*")),
        eq(supabase.from("gst_hsn_summary_v" as any).select("*")),
        eq(supabase.from("gst_statewise_summary_v" as any).select("*")),
        supabase.from("gst_validation_v" as any).select("*").eq("company_id", companyId),
        eq(supabase.from("gst_invoice_register_v" as any).select("*")),
      ]);

      if (sumRes.error) throw sumRes.error;
      setSummary(sumRes.data);
      setB2b((b2bRes.data || []) as any[]);
      setB2c((b2cRes.data || []) as any[]);
      setCreditNotes((cnRes.data || []) as any[]);
      setHsn((hsnRes.data || []) as any[]);
      setStatewise((stRes.data || []) as any[]);
      setValidation((valRes.data || []) as any[]);
      setInvoiceRegister((regRes.data || []) as any[]);
    } catch (err: any) {
      console.error("GST data fetch error:", err);
      setError(err.message || "Failed to load GST report data");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const readiness = (() => {
    const blocking = validation.filter((v: any) => v.severity === "blocking");
    const warnings = validation.filter((v: any) => v.severity === "warning");
    if (blocking.length > 0) return "blocked" as const;
    if (warnings.length > 0) return "warning" as const;
    return "ready" as const;
  })();

  return { summary, b2b, b2c, creditNotes, hsn, statewise, validation, invoiceRegister, loading, error, readiness, refresh: fetchAll };
}
