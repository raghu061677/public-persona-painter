import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CampaignChargeItem {
  id: string;
  campaign_id: string;
  campaign_asset_id: string | null;
  company_id: string | null;
  charge_type: "display" | "printing" | "mounting" | "reprinting" | "remounting" | "misc";
  charge_scope: "recurring_cycle" | "one_time" | "ad_hoc";
  description: string | null;
  amount: number;
  gst_percent: number;
  charge_date: string;
  billing_cycle_no: number | null;
  /** YYYY-MM key when assigned to a Calendar Monthly invoice. */
  billing_month_key: string | null;
  invoice_id: string | null;
  is_invoiced: boolean;
  created_from: string | null;
}

/**
 * Fetch + manage cycle-billing charge items for a campaign.
 * Lazy auto-seeds initial printing/mounting (per-asset, > 0 only) onto Cycle 1
 * the very first time it runs for a campaign that has no charge items yet.
 */
export function useCampaignChargeItems(
  campaignId: string,
  campaignAssets: any[],
  companyId: string | undefined,
  totalCycles: number,
) {
  const [items, setItems] = useState<CampaignChargeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeded, setSeeded] = useState(false);

  const fetchItems = useCallback(async () => {
    if (!campaignId) return;
    const { data, error } = await supabase
      .from("campaign_charge_items")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("billing_cycle_no", { ascending: true })
      .order("created_at", { ascending: true });
    if (!error) setItems((data as CampaignChargeItem[]) || []);
    setLoading(false);
  }, [campaignId]);

  // Lazy auto-seed initial printing/mounting on first preview render
  const ensureSeeded = useCallback(async () => {
    if (seeded || !campaignId || totalCycles === 0) return;
    setSeeded(true);
    // Skip if any charge items already exist
    const { data: existing } = await supabase
      .from("campaign_charge_items")
      .select("id")
      .eq("campaign_id", campaignId)
      .limit(1);
    if (existing && existing.length > 0) return;

    const rows: any[] = [];
    for (const ca of campaignAssets || []) {
      if (ca?.is_removed) continue;
      const printing = Number(ca?.printing_charges || ca?.printing_client_amount || 0);
      const mounting = Number(ca?.mounting_charges || ca?.mounting_cost || 0);
      if (printing > 0) {
        rows.push({
          campaign_id: campaignId,
          campaign_asset_id: ca.id,
          company_id: companyId || null,
          charge_type: "printing",
          charge_scope: "one_time",
          description: `Initial printing — ${ca.location || ""}, ${ca.area || ""}`.trim(),
          amount: printing,
          gst_percent: 18,
          billing_cycle_no: 1,
          is_invoiced: false,
          created_from: "auto_seed_cycle1",
        });
      }
      if (mounting > 0) {
        rows.push({
          campaign_id: campaignId,
          campaign_asset_id: ca.id,
          company_id: companyId || null,
          charge_type: "mounting",
          charge_scope: "one_time",
          description: `Initial mounting — ${ca.location || ""}, ${ca.area || ""}`.trim(),
          amount: mounting,
          gst_percent: 18,
          billing_cycle_no: 1,
          is_invoiced: false,
          created_from: "auto_seed_cycle1",
        });
      }
    }
    if (rows.length === 0) return;
    await supabase.from("campaign_charge_items").insert(rows);
    await fetchItems();
  }, [seeded, campaignId, totalCycles, campaignAssets, companyId, fetchItems]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    if (!loading) ensureSeeded();
  }, [loading, ensureSeeded]);

  /** Find next uninvoiced cycle (defaults to last cycle if all invoiced). */
  const nextUninvoicedCycle = useCallback(
    async (): Promise<number> => {
      const { data } = await supabase
        .from("invoices")
        .select("billing_window_key")
        .eq("campaign_id", campaignId)
        .eq("billing_mode", "asset_cycle")
        .neq("status", "Cancelled");
      const invoicedCycles = new Set(
        (data || [])
          .map((r: any) => {
            const m = /^cycle-(\d+)$/.exec(r.billing_window_key || "");
            return m ? Number(m[1]) : null;
          })
          .filter((n): n is number => n !== null),
      );
      for (let i = 1; i <= Math.max(1, totalCycles); i++) {
        if (!invoicedCycles.has(i)) return i;
      }
      return Math.max(1, totalCycles);
    },
    [campaignId, totalCycles],
  );

  /**
   * Lazy auto-seed initial printing/mounting onto the FIRST month for Calendar Monthly billing.
   * Mirrors the cycle-1 seeding but uses billing_month_key. If the campaign was previously
   * seeded for cycle billing (cycle 1), those rows are migrated to the first month so the
   * same charges aren't duplicated when the user switches modes.
   */
  const ensureMonthlySeeded = useCallback(
    async (firstMonthKey: string) => {
      if (!campaignId || !firstMonthKey) return;

      // Migrate any existing cycle-seeded rows that were never invoiced
      // to the first month, so monthly billing reuses the same charges.
      const { data: orphanCycleRows } = await supabase
        .from("campaign_charge_items")
        .select("id")
        .eq("campaign_id", campaignId)
        .eq("is_invoiced", false)
        .is("billing_month_key", null)
        .not("billing_cycle_no", "is", null);

      if (orphanCycleRows && orphanCycleRows.length > 0) {
        await supabase
          .from("campaign_charge_items")
          .update({ billing_month_key: firstMonthKey, billing_cycle_no: null })
          .in("id", orphanCycleRows.map((r: any) => r.id));
        await fetchItems();
        return;
      }

      // If any month-assigned rows already exist (seeded or manual), do nothing.
      const { data: existingMonthly } = await supabase
        .from("campaign_charge_items")
        .select("id")
        .eq("campaign_id", campaignId)
        .not("billing_month_key", "is", null)
        .limit(1);
      if (existingMonthly && existingMonthly.length > 0) return;

      // Fresh seed: one printing/mounting row per asset (>0 only) onto the first month.
      const rows: any[] = [];
      for (const ca of campaignAssets || []) {
        if (ca?.is_removed) continue;
        const printing = Number(ca?.printing_charges || ca?.printing_client_amount || 0);
        const mounting = Number(ca?.mounting_charges || ca?.mounting_cost || 0);
        if (printing > 0) {
          rows.push({
            campaign_id: campaignId,
            campaign_asset_id: ca.id,
            company_id: companyId || null,
            charge_type: "printing",
            charge_scope: "one_time",
            description: `Initial printing — ${ca.location || ""}, ${ca.area || ""}`.trim(),
            amount: printing,
            gst_percent: 18,
            billing_month_key: firstMonthKey,
            is_invoiced: false,
            created_from: "auto_seed_month1",
          });
        }
        if (mounting > 0) {
          rows.push({
            campaign_id: campaignId,
            campaign_asset_id: ca.id,
            company_id: companyId || null,
            charge_type: "mounting",
            charge_scope: "one_time",
            description: `Initial mounting — ${ca.location || ""}, ${ca.area || ""}`.trim(),
            amount: mounting,
            gst_percent: 18,
            billing_month_key: firstMonthKey,
            is_invoiced: false,
            created_from: "auto_seed_month1",
          });
        }
      }
      if (rows.length === 0) return;
      await supabase.from("campaign_charge_items").insert(rows);
      await fetchItems();
    },
    [campaignId, campaignAssets, companyId, fetchItems],
  );

  /** Find the next uninvoiced month from a list of available month keys. */
  const nextUninvoicedMonth = useCallback(
    async (availableMonths: string[]): Promise<string | null> => {
      if (!availableMonths.length) return null;
      const { data } = await supabase
        .from("invoices")
        .select("billing_month")
        .eq("campaign_id", campaignId)
        .eq("billing_mode", "calendar_monthly")
        .neq("status", "Cancelled");
      const invoiced = new Set((data || []).map((r: any) => r.billing_month).filter(Boolean));
      for (const m of availableMonths) {
        if (!invoiced.has(m)) return m;
      }
      return availableMonths[availableMonths.length - 1];
    },
    [campaignId],
  );

  const addCharge = useCallback(
    async (input: {
      charge_type: CampaignChargeItem["charge_type"];
      amount: number;
      description?: string;
      campaign_asset_id?: string | null;
      billing_cycle_no?: number | null;
      billing_month_key?: string | null;
      gst_percent?: number;
    }) => {
      // Monthly assignment takes precedence when provided; otherwise resolve cycle.
      const useMonth = input.billing_month_key !== undefined && input.billing_month_key !== null;
      const cycle = useMonth
        ? null
        : (input.billing_cycle_no ?? (await nextUninvoicedCycle()));
      const { error } = await supabase.from("campaign_charge_items").insert({
        campaign_id: campaignId,
        company_id: companyId || null,
        campaign_asset_id: input.campaign_asset_id ?? null,
        charge_type: input.charge_type,
        charge_scope: "ad_hoc",
        description: input.description || null,
        amount: input.amount,
        gst_percent: input.gst_percent ?? 18,
        billing_cycle_no: cycle,
        billing_month_key: useMonth ? input.billing_month_key : null,
        is_invoiced: false,
        created_from: "manual_panel",
      });
      if (error) throw error;
      await fetchItems();
    },
    [campaignId, companyId, nextUninvoicedCycle, fetchItems],
  );

  const reassignCycle = useCallback(
    async (id: string, cycle: number) => {
      const { error } = await supabase
        .from("campaign_charge_items")
        .update({ billing_cycle_no: cycle, billing_month_key: null })
        .eq("id", id)
        .eq("is_invoiced", false);
      if (error) throw error;
      await fetchItems();
    },
    [fetchItems],
  );

  const reassignMonth = useCallback(
    async (id: string, monthKey: string) => {
      const { error } = await supabase
        .from("campaign_charge_items")
        .update({ billing_month_key: monthKey, billing_cycle_no: null })
        .eq("id", id)
        .eq("is_invoiced", false);
      if (error) throw error;
      await fetchItems();
    },
    [fetchItems],
  );

  const deleteCharge = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("campaign_charge_items")
        .delete()
        .eq("id", id)
        .eq("is_invoiced", false);
      if (error) throw error;
      await fetchItems();
    },
    [fetchItems],
  );

  return {
    items,
    loading,
    refetch: fetchItems,
    addCharge,
    reassignCycle,
    reassignMonth,
    deleteCharge,
    nextUninvoicedCycle,
    nextUninvoicedMonth,
    ensureMonthlySeeded,
  };
}