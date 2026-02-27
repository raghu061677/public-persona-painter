import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, format, subMonths, differenceInDays } from "date-fns";

export type OOHTimeRange = "monthly" | "quarterly" | "yearly" | "custom";

interface DateRange { from: Date; to: Date; }

export interface CampaignProfitRow {
  id: string;
  name: string;
  clientName: string;
  startDate: string | null;
  endDate: string | null;
  assetCount: number;
  revenue: number;
  printingCost: number;
  mountingCost: number;
  allocatedExpenses: number;
  directCost: number;
  netProfit: number;
  margin: number;
  status: string;
}

export interface CityRevenueRow {
  city: string;
  revenue: number;
  assetCount: number;
  avgRevenuePerAsset: number;
  avgRevenuePerSqft: number;
}

export interface AreaRevenueRow {
  area: string;
  city: string;
  revenue: number;
  assetCount: number;
}

export interface MediaTypeRevenueRow {
  mediaType: string;
  revenue: number;
  assetCount: number;
  avgRevenuePerAsset: number;
}

export interface TopLocationRow {
  location: string;
  area: string;
  city: string;
  revenue: number;
  bookings: number;
}

export interface OccupancyKPI {
  totalAssets: number;
  bookedAssets: number;
  occupancyPercent: number;
  totalRevenue: number;
  revenuePerAsset: number;
  revenuePerSqft: number;
}

export interface OccupancyTrend {
  month: string;
  occupancy: number;
  revenue: number;
}

export interface RateRealizationRow {
  campaignName: string;
  clientName: string;
  assetId: string;
  location: string;
  cardRate: number;
  negotiatedRate: number;
  realizationPercent: number;
}

export function useOOHIntelligence() {
  const { company } = useCompany();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<OOHTimeRange>("yearly");
  const [customRange, setCustomRange] = useState<DateRange>({
    from: startOfYear(new Date()),
    to: endOfYear(new Date()),
  });
  const [cityFilter, setCityFilter] = useState<string>("");
  const [clientFilter, setClientFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [mediaTypeFilter, setMediaTypeFilter] = useState<string>("");

  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [campaignAssets, setCampaignAssets] = useState<any[]>([]);
  const [mediaAssets, setMediaAssets] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [campaignExpenses, setCampaignExpenses] = useState<any[]>([]);

  const dateRange = useMemo((): DateRange => {
    const now = new Date();
    switch (timeRange) {
      case "monthly": return { from: startOfMonth(now), to: endOfMonth(now) };
      case "quarterly": return { from: startOfQuarter(now), to: endOfQuarter(now) };
      case "yearly": return { from: startOfYear(now), to: endOfYear(now) };
      case "custom": return customRange;
    }
  }, [timeRange, customRange]);

  const loadData = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const [cmpRes, caRes, maRes, invRes, expRes] = await Promise.all([
        supabase.from("campaigns").select("id, name, client_id, status, start_date, end_date, clients(name)").eq("company_id", company.id),
        supabase.from("campaign_assets").select("id, campaign_id, asset_id, city, area, location, media_type, card_rate, negotiated_rate, printing_cost, mounting_cost, total_price, rent_amount, total_sqft, booking_start_date, booking_end_date, direction, dimensions"),
        supabase.from("media_assets").select("id, city, area, media_type, total_sqft, status, company_id").eq("company_id", company.id),
        supabase.from("invoices").select("id, campaign_id, total_amount, status").eq("company_id", company.id),
        supabase.from("expenses").select("id, campaign_id, total_amount, category, allocation_type").eq("company_id", company.id).eq("allocation_type", "Campaign"),
      ]);
      setCampaigns(cmpRes.data || []);
      setCampaignAssets(caRes.data || []);
      setMediaAssets(maRes.data || []);
      setInvoices(invRes.data || []);
      setCampaignExpenses(expRes.data || []);
    } catch (e) {
      console.error("OOH Intelligence load error:", e);
    } finally {
      setLoading(false);
    }
  }, [company?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  // Filter campaigns by date range
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => {
      const s = c.start_date ? new Date(c.start_date) : null;
      const e = c.end_date ? new Date(c.end_date) : null;
      // Campaign overlaps with date range
      if (!s) return false;
      const rangeEnd = e || s;
      const overlaps = s <= dateRange.to && rangeEnd >= dateRange.from;
      if (!overlaps) return false;
      if (statusFilter && c.status !== statusFilter) return false;
      if (clientFilter) {
        const cn = (c as any).clients?.name || "";
        if (!cn.toLowerCase().includes(clientFilter.toLowerCase())) return false;
      }
      return true;
    });
  }, [campaigns, dateRange, statusFilter, clientFilter]);

  const filteredCampaignIds = useMemo(() => new Set(filteredCampaigns.map(c => c.id)), [filteredCampaigns]);

  const filteredAssets = useMemo(() => {
    let assets = campaignAssets.filter(a => filteredCampaignIds.has(a.campaign_id));
    if (cityFilter) assets = assets.filter(a => a.city === cityFilter);
    if (mediaTypeFilter) assets = assets.filter(a => a.media_type === mediaTypeFilter);
    return assets;
  }, [campaignAssets, filteredCampaignIds, cityFilter, mediaTypeFilter]);

  // Invoice totals by campaign
  const invoiceByCampaign = useMemo(() => {
    const map: Record<string, number> = {};
    invoices.filter(i => i.status !== 'Draft' && i.status !== 'Cancelled').forEach(i => {
      if (i.campaign_id) map[i.campaign_id] = (map[i.campaign_id] || 0) + (Number(i.total_amount) || 0);
    });
    return map;
  }, [invoices]);

  // Expense totals by campaign
  const expenseByCampaign = useMemo(() => {
    const map: Record<string, number> = {};
    campaignExpenses.forEach(e => {
      if (e.campaign_id) map[e.campaign_id] = (map[e.campaign_id] || 0) + (Number(e.total_amount) || 0);
    });
    return map;
  }, [campaignExpenses]);

  // A) Campaign Profitability
  const campaignProfitability = useMemo((): CampaignProfitRow[] => {
    return filteredCampaigns
      .filter(c => c.status !== 'Cancelled')
      .map(c => {
        const assets = campaignAssets.filter(ca => ca.campaign_id === c.id);
        let filteredA = assets;
        if (cityFilter) filteredA = filteredA.filter(a => a.city === cityFilter);

        const invoiceRevenue = invoiceByCampaign[c.id] || 0;
        const assetRevenue = filteredA.reduce((s, a) => s + (Number(a.total_price) || Number(a.rent_amount) || Number(a.negotiated_rate) || Number(a.card_rate) || 0), 0);
        const revenue = invoiceRevenue > 0 ? invoiceRevenue : assetRevenue;
        const printingCost = filteredA.reduce((s, a) => s + (Number(a.printing_cost) || 0), 0);
        const mountingCost = filteredA.reduce((s, a) => s + (Number(a.mounting_cost) || 0), 0);
        const allocatedExpenses = expenseByCampaign[c.id] || 0;
        const directCost = printingCost + mountingCost + allocatedExpenses;
        const netProfit = revenue - directCost;
        const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

        return {
          id: c.id,
          name: c.name || c.id,
          clientName: (c as any).clients?.name || "—",
          startDate: c.start_date,
          endDate: c.end_date,
          assetCount: filteredA.length,
          revenue, printingCost, mountingCost, allocatedExpenses, directCost, netProfit, margin,
          status: c.status || "—",
        };
      })
      .filter(c => c.revenue > 0 || c.assetCount > 0)
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredCampaigns, campaignAssets, invoiceByCampaign, expenseByCampaign, cityFilter]);

  // B) City Revenue
  const cityRevenue = useMemo((): CityRevenueRow[] => {
    const map: Record<string, { revenue: number; count: number; sqft: number }> = {};
    filteredAssets.forEach(a => {
      const city = a.city || "Unknown";
      if (!map[city]) map[city] = { revenue: 0, count: 0, sqft: 0 };
      map[city].revenue += Number(a.total_price) || Number(a.rent_amount) || 0;
      map[city].count++;
      map[city].sqft += Number(a.total_sqft) || 0;
    });
    return Object.entries(map)
      .map(([city, d]) => ({
        city,
        revenue: d.revenue,
        assetCount: d.count,
        avgRevenuePerAsset: d.count > 0 ? d.revenue / d.count : 0,
        avgRevenuePerSqft: d.sqft > 0 ? d.revenue / d.sqft : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredAssets]);

  // Area Revenue
  const areaRevenue = useMemo((): AreaRevenueRow[] => {
    const map: Record<string, { city: string; revenue: number; count: number }> = {};
    filteredAssets.forEach(a => {
      const area = a.area || "Unknown";
      if (!map[area]) map[area] = { city: a.city || "—", revenue: 0, count: 0 };
      map[area].revenue += Number(a.total_price) || Number(a.rent_amount) || 0;
      map[area].count++;
    });
    return Object.entries(map)
      .map(([area, d]) => ({ area, city: d.city, revenue: d.revenue, assetCount: d.count }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredAssets]);

  // Media Type Revenue
  const mediaTypeRevenue = useMemo((): MediaTypeRevenueRow[] => {
    const map: Record<string, { revenue: number; count: number }> = {};
    filteredAssets.forEach(a => {
      const mt = a.media_type || "Other";
      if (!map[mt]) map[mt] = { revenue: 0, count: 0 };
      map[mt].revenue += Number(a.total_price) || Number(a.rent_amount) || 0;
      map[mt].count++;
    });
    return Object.entries(map)
      .map(([mediaType, d]) => ({
        mediaType,
        revenue: d.revenue,
        assetCount: d.count,
        avgRevenuePerAsset: d.count > 0 ? d.revenue / d.count : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredAssets]);

  // Top Locations
  const topLocations = useMemo((): TopLocationRow[] => {
    const map: Record<string, { area: string; city: string; revenue: number; bookings: number }> = {};
    filteredAssets.forEach(a => {
      const loc = a.location || a.area || "Unknown";
      const key = `${loc}|${a.area}|${a.city}`;
      if (!map[key]) map[key] = { area: a.area || "—", city: a.city || "—", revenue: 0, bookings: 0 };
      map[key].revenue += Number(a.total_price) || Number(a.rent_amount) || 0;
      map[key].bookings++;
    });
    return Object.entries(map)
      .map(([key, d]) => ({ location: key.split("|")[0], area: d.area, city: d.city, revenue: d.revenue, bookings: d.bookings }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [filteredAssets]);

  // C) Occupancy KPIs
  const occupancyKPI = useMemo((): OccupancyKPI => {
    const totalAssets = mediaAssets.length;
    const bookedAssetIds = new Set(filteredAssets.map(a => a.asset_id));
    const bookedAssets = bookedAssetIds.size;
    const occupancyPercent = totalAssets > 0 ? (bookedAssets / totalAssets) * 100 : 0;
    const totalRevenue = filteredAssets.reduce((s, a) => s + (Number(a.total_price) || Number(a.rent_amount) || 0), 0);
    const totalSqft = filteredAssets.reduce((s, a) => s + (Number(a.total_sqft) || 0), 0);
    return {
      totalAssets,
      bookedAssets,
      occupancyPercent,
      totalRevenue,
      revenuePerAsset: bookedAssets > 0 ? totalRevenue / bookedAssets : 0,
      revenuePerSqft: totalSqft > 0 ? totalRevenue / totalSqft : 0,
    };
  }, [mediaAssets, filteredAssets]);

  // Occupancy trend by month
  const occupancyTrend = useMemo((): OccupancyTrend[] => {
    const now = new Date();
    const totalAssets = mediaAssets.length;
    const months: OccupancyTrend[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(now, i);
      const mStart = startOfMonth(d);
      const mEnd = endOfMonth(d);
      const label = format(d, "MMM yy");

      // Find campaigns active in this month
      const activeCmpIds = new Set(
        campaigns
          .filter(c => {
            const s = c.start_date ? new Date(c.start_date) : null;
            const e = c.end_date ? new Date(c.end_date) : s;
            return s && s <= mEnd && (e || s) >= mStart && c.status !== 'Cancelled';
          })
          .map(c => c.id)
      );

      const monthAssets = campaignAssets.filter(a => activeCmpIds.has(a.campaign_id));
      const bookedIds = new Set(monthAssets.map(a => a.asset_id));
      const revenue = monthAssets.reduce((s, a) => s + (Number(a.total_price) || Number(a.rent_amount) || 0), 0);

      months.push({
        month: label,
        occupancy: totalAssets > 0 ? (bookedIds.size / totalAssets) * 100 : 0,
        revenue,
      });
    }
    return months;
  }, [campaigns, campaignAssets, mediaAssets]);

  // D) Rate Realization
  const rateRealization = useMemo((): RateRealizationRow[] => {
    return filteredAssets
      .filter(a => Number(a.card_rate) > 0 && Number(a.negotiated_rate) > 0)
      .map(a => {
        const cmp = campaigns.find(c => c.id === a.campaign_id);
        return {
          campaignName: cmp?.name || a.campaign_id,
          clientName: (cmp as any)?.clients?.name || "—",
          assetId: a.asset_id,
          location: a.location || a.area || "—",
          cardRate: Number(a.card_rate),
          negotiatedRate: Number(a.negotiated_rate),
          realizationPercent: (Number(a.negotiated_rate) / Number(a.card_rate)) * 100,
        };
      })
      .sort((a, b) => a.realizationPercent - b.realizationPercent);
  }, [filteredAssets, campaigns]);

  // Avg realization by client
  const clientRealization = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    rateRealization.forEach(r => {
      if (!map[r.clientName]) map[r.clientName] = { total: 0, count: 0 };
      map[r.clientName].total += r.realizationPercent;
      map[r.clientName].count++;
    });
    return Object.entries(map)
      .map(([client, d]) => ({ client, avgRealization: d.count > 0 ? d.total / d.count : 0, count: d.count }))
      .sort((a, b) => a.avgRealization - b.avgRealization);
  }, [rateRealization]);

  // Unique filter options
  const cities = useMemo(() => [...new Set(campaignAssets.map(a => a.city).filter(Boolean))].sort(), [campaignAssets]);
  const mediaTypes = useMemo(() => [...new Set(campaignAssets.map(a => a.media_type).filter(Boolean))].sort(), [campaignAssets]);

  return {
    loading, timeRange, setTimeRange, customRange, setCustomRange, dateRange,
    cityFilter, setCityFilter, clientFilter, setClientFilter,
    statusFilter, setStatusFilter, mediaTypeFilter, setMediaTypeFilter,
    campaignProfitability, cityRevenue, areaRevenue, mediaTypeRevenue, topLocations,
    occupancyKPI, occupancyTrend, rateRealization, clientRealization,
    cities, mediaTypes,
    refresh: loadData,
  };
}
