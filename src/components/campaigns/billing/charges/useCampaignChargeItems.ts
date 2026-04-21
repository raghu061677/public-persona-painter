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

  const addCharge = useCallback(
    async (input: {
      charge_type: CampaignChargeItem["charge_type"];
      amount: number;
      description?: string;
      campaign_asset_id?: string | null;
      billing_cycle_no?: number | null;
      gst_percent?: number;
    }) => {
      const cycle =
        input.billing_cycle_no ?? (await nextUninvoicedCycle());
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
        .update({ billing_cycle_no: cycle })
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
    deleteCharge,
    nextUninvoicedCycle,
  };
}