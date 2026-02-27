import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { computeOpsLines, OpsMarginLine, RateSettingRow } from "@/lib/ops-rate-utils";

export function useOpsReportData() {
  const { company } = useCompany();
  const companyId = company?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["ops-report-data", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      // Fetch campaign_assets, campaigns, and rate_settings in parallel
      const [caRes, campRes, ratesRes] = await Promise.all([
        supabase
          .from("campaign_assets")
          .select("campaign_id, asset_id, location, city, area, media_type, total_sqft, illumination_type, printing_cost, printing_charges, mounting_cost, mounting_charges, booking_start_date, booking_end_date, status")
          .order("campaign_id"),
        supabase
          .from("campaigns")
          .select("id, campaign_name, client_name, start_date, end_date, status, company_id")
          .eq("company_id", companyId!)
          .is("is_deleted", false),
        supabase
          .from("rate_settings" as any)
          .select("*")
          .eq("company_id", companyId!)
          .eq("is_active", true),
      ]);

      if (caRes.error) throw caRes.error;
      if (campRes.error) throw campRes.error;

      const campaigns = new Map(
        (campRes.data ?? []).map((c: any) => [c.id, c])
      );

      // Filter campaign_assets to only those belonging to this company's campaigns
      const companyAssets = (caRes.data ?? []).filter((ca: any) => campaigns.has(ca.campaign_id));

      const rates = (ratesRes.data ?? []) as unknown as RateSettingRow[];

      const lines = computeOpsLines(companyAssets, campaigns, rates);

      return { lines, campaigns: campRes.data ?? [] };
    },
  });

  return {
    lines: data?.lines ?? [],
    campaigns: data?.campaigns ?? [],
    isLoading,
  };
}
