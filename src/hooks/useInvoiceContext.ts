import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface InvoiceItem {
  id: string;
  invoice_id: string;
  location?: string;
  description?: string;
  dimensions?: string;
  size?: string;
  booking_unit?: string;
  quantity?: number;
  unit_price?: number;
  rate?: number;
  subtotal?: number;
  total_amount?: number;
  amount?: number;
}

interface CampaignInfo {
  id: string;
  campaign_name: string;
  start_date?: string;
  end_date?: string;
}

interface InvoiceContextData {
  items: Record<string, InvoiceItem[]>;
  campaigns: Record<string, CampaignInfo>;
}

export function useInvoiceContext() {
  const [data, setData] = useState<InvoiceContextData>({ items: {}, campaigns: {} });
  const [isLoading, setIsLoading] = useState(false);

  const fetchContext = useCallback(async (invoiceIds: string[], campaignIds: (string | null)[]) => {
    if (invoiceIds.length === 0) return;
    setIsLoading(true);

    const uniqueCampaignIds = [...new Set(campaignIds.filter(Boolean))] as string[];

    const [itemsRes, campaignsRes] = await Promise.all([
      supabase
        .from("invoice_items")
        .select("id, invoice_id, description, quantity, rate, amount, hsn_code")
        .in("invoice_id", invoiceIds),
      uniqueCampaignIds.length > 0
        ? supabase
            .from("campaigns")
            .select("id, campaign_name, start_date, end_date")
            .in("id", uniqueCampaignIds)
        : Promise.resolve({ data: [] }),
    ]);

    const itemsMap: Record<string, InvoiceItem[]> = {};
    (itemsRes.data || []).forEach((item: any) => {
      if (!itemsMap[item.invoice_id]) itemsMap[item.invoice_id] = [];
      itemsMap[item.invoice_id].push({
        id: item.id,
        invoice_id: item.invoice_id,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount,
        location: item.description,
      });
    });

    const campaignsMap: Record<string, CampaignInfo> = {};
    (campaignsRes.data || []).forEach((c: any) => {
      campaignsMap[c.id] = {
        id: c.id,
        campaign_name: c.campaign_name,
        start_date: c.start_date,
        end_date: c.end_date,
      };
    });

    setData({ items: itemsMap, campaigns: campaignsMap });
    setIsLoading(false);

    return { items: itemsMap, campaigns: campaignsMap };
  }, []);

  return { data, isLoading, fetchContext };
}
