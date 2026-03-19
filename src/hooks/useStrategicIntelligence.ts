import { useState, useEffect, useMemo, useCallback } from "react";
import { RevenueAuditCollector } from "@/utils/revenueAudit";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { addDays, differenceInDays, format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, isWithinInterval } from "date-fns";

export type StrategicTimeRange = "monthly" | "quarterly" | "yearly" | "custom";

interface DateRange { from: Date; to: Date; }

// ── Cash Flow Forecast ──
export interface CashFlowBucket {
  label: string;
  incoming: number;
  invoiceCount: number;
  outgoing: number;
  expenseCount: number;
  net: number;
}

// ── Client Risk ──
export interface ClientRiskRow {
  clientId: string;
  clientName: string;
  avgDelayDays: number;
  outstandingAmount: number;
  paymentTrend: "improving" | "stable" | "worsening";
  realizationPercent: number;
  revenueContribution: number;
  riskLevel: "Low" | "Medium" | "High";
  invoiceCount: number;
}

// ── Asset ROI ──
export interface AssetROIRow {
  assetId: string;
  location: string;
  city: string;
  area: string;
  mediaType: string;
  revenue: number;
  cost: number;
  profit: number;
  roiPercent: number | null;
  occupancyPercent: number;
  totalSqft: number;
}

// ── Concession Risk ──
export interface ConcessionRiskRow {
  city: string;
  concessionFee: number;
  revenue: number;
  surplus: number;
  occupancyPercent: number;
  riskLevel: "safe" | "amber" | "red";
}

// ── Executive KPIs ──
export interface ExecutiveKPIs {
  annualRevenue: number;
  annualProfit: number;
  avgOccupancy: number;
  collectionRate: number;
  topCity: string;
  topCityRevenue: number;
  highestROIAsset: string;
  highestROI: number | null;   // null = no valid cost data
  totalAssets: number;
  bookedAssets: number;
  totalClients: number;
  activeCampaigns: number;
}

/** Canonical "live" campaign statuses */
const LIVE_CAMPAIGN_STATUSES = ["Running", "Active", "Confirmed", "In Progress", "running", "active", "confirmed", "in_progress"];

/** Check if two date ranges overlap */
function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart <= bEnd && aEnd >= bStart;
}

export function useStrategicIntelligence() {
  const { company } = useCompany();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<StrategicTimeRange>("yearly");
  const [customRange, setCustomRange] = useState<DateRange>({
    from: startOfYear(new Date()),
    to: endOfYear(new Date()),
  });

  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [campaignAssets, setCampaignAssets] = useState<any[]>([]);
  const [mediaAssets, setMediaAssets] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);

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
      const [invRes, payRes, expRes, cmpRes, caRes, maRes, clRes] = await Promise.all([
        supabase.from("invoices").select("id, campaign_id, client_id, client_name, total_amount, status, invoice_date, due_date, payment_terms").eq("company_id", company.id),
        supabase.from("payment_records").select("id, invoice_id, amount, payment_date").eq("company_id", company.id),
        supabase.from("expenses").select("id, amount, category, expense_date, campaign_id, asset_id, vendor_name").eq("company_id", company.id),
        supabase.from("campaigns").select("id, name, client_id, status, start_date, end_date, company_id, clients(name)").eq("company_id", company.id),
        // FIX #1: Scope campaign_assets via campaigns join, and exclude dropped assets
        supabase.from("campaign_assets").select("id, campaign_id, asset_id, city, area, location, media_type, card_rate, negotiated_rate, printing_cost, mounting_cost, total_price, rent_amount, total_sqft, booking_start_date, booking_end_date, effective_start_date, effective_end_date, is_removed, campaigns!inner(company_id)").eq("campaigns.company_id", company.id).eq("is_removed", false),
        supabase.from("media_assets").select("id, city, area, media_type, total_sqft, status, card_rate, base_rate, location").eq("company_id", company.id),
        // FIX #7: Load clients directly for accurate count
        supabase.from("clients").select("id, name").eq("company_id", company.id),
      ]);
      setInvoices(invRes.data || []);
      setPayments(payRes.data || []);
      setExpenses(expRes.data || []);
      setCampaigns(cmpRes.data || []);
      setCampaignAssets(caRes.data || []);
      setMediaAssets(maRes.data || []);
      setClients(clRes.data || []);
    } catch (e) {
      console.error("Strategic Intelligence load error:", e);
    } finally {
      setLoading(false);
    }
  }, [company?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  // Helper: resolve booking window for a campaign asset
  const resolveBookingWindow = (ca: any): { start: Date; end: Date } | null => {
    const s = ca.effective_start_date || ca.booking_start_date;
    const e = ca.effective_end_date || ca.booking_end_date;
    if (!s || !e) return null;
    return { start: new Date(s), end: new Date(e) };
  };

  // Filter campaign assets by date range
  const periodCampaignAssets = useMemo(() => {
    return campaignAssets.filter(ca => {
      const window = resolveBookingWindow(ca);
      if (!window) return false;
      return rangesOverlap(window.start, window.end, dateRange.from, dateRange.to);
    });
  }, [campaignAssets, dateRange]);

  // Filter invoices by date range
  const periodInvoices = useMemo(() => {
    return invoices.filter(i => {
      if (i.status === "Draft" || i.status === "Cancelled") return false;
      if (!i.invoice_date) return false;
      const d = new Date(i.invoice_date);
      return d >= dateRange.from && d <= dateRange.to;
    });
  }, [invoices, dateRange]);

  // Filter expenses by date range
  const periodExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (!e.expense_date) return false;
      const d = new Date(e.expense_date);
      return d >= dateRange.from && d <= dateRange.to;
    });
  }, [expenses, dateRange]);

  // Payment map by invoice
  const paymentMap = useMemo(() => {
    const map: Record<string, { total: number; lastDate: string | null }> = {};
    payments.forEach(p => {
      if (!map[p.invoice_id]) map[p.invoice_id] = { total: 0, lastDate: null };
      map[p.invoice_id].total += Number(p.amount) || 0;
      if (p.payment_date && (!map[p.invoice_id].lastDate || p.payment_date > map[p.invoice_id].lastDate)) {
        map[p.invoice_id].lastDate = p.payment_date;
      }
    });
    return map;
  }, [payments]);

  // ── A) Cash Flow Forecast ──
  const cashFlowForecast = useMemo((): CashFlowBucket[] => {
    const today = new Date();
    const buckets = [
      { label: "Next 30 Days", days: 30 },
      { label: "31–60 Days", days: 60 },
      { label: "61–90 Days", days: 90 },
    ];

    return buckets.map((b, idx) => {
      const start = idx === 0 ? today : addDays(today, buckets[idx - 1].days + 1);
      const end = addDays(today, b.days);

      const incomingInvoices = invoices.filter(inv => {
        if (inv.status === "Draft" || inv.status === "Cancelled") return false;
        const paid = paymentMap[inv.id]?.total || 0;
        const outstanding = (Number(inv.total_amount) || 0) - paid;
        if (outstanding <= 0.01) return false;
        const due = inv.due_date ? new Date(inv.due_date) : (inv.invoice_date ? addDays(new Date(inv.invoice_date), 30) : null);
        if (!due) return false;
        return due >= start && due <= end;
      });
      const incoming = incomingInvoices.reduce((s, inv) => {
        const paid = paymentMap[inv.id]?.total || 0;
        return s + ((Number(inv.total_amount) || 0) - paid);
      }, 0);

      const monthlyExpenses = expenses.filter(e => {
        const d = e.expense_date ? new Date(e.expense_date) : null;
        if (!d) return false;
        return d >= start && d <= end;
      });
      const outgoing = monthlyExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

      return {
        label: b.label,
        incoming,
        invoiceCount: incomingInvoices.length,
        outgoing,
        expenseCount: monthlyExpenses.length,
        net: incoming - outgoing,
      };
    });
  }, [invoices, expenses, paymentMap]);

  const cashFlowTotal = useMemo(() => {
    const totalIncoming = cashFlowForecast.reduce((s, b) => s + b.incoming, 0);
    const totalOutgoing = cashFlowForecast.reduce((s, b) => s + b.outgoing, 0);
    const today = new Date();
    const overdue = invoices.filter(inv => {
      if (inv.status === "Draft" || inv.status === "Cancelled") return false;
      const paid = paymentMap[inv.id]?.total || 0;
      const outstanding = (Number(inv.total_amount) || 0) - paid;
      if (outstanding <= 0.01) return false;
      const due = inv.due_date ? new Date(inv.due_date) : (inv.invoice_date ? addDays(new Date(inv.invoice_date), 30) : null);
      return due && due < today;
    }).reduce((s, inv) => s + ((Number(inv.total_amount) || 0) - (paymentMap[inv.id]?.total || 0)), 0);
    return { totalIncoming, totalOutgoing, netProjected: totalIncoming - totalOutgoing, overdue };
  }, [cashFlowForecast, invoices, paymentMap]);

  // ── D) Client Risk Scoring ──
  const clientRiskScores = useMemo((): ClientRiskRow[] => {
    const clientMap: Record<string, { name: string; delays: number[]; outstanding: number; realization: number[]; revenue: number; invoiceCount: number }> = {};
    const validInvoices = invoices.filter(i => i.status !== "Draft" && i.status !== "Cancelled");
    const totalRevenue = validInvoices.reduce((s, i) => s + (Number(i.total_amount) || 0), 0);

    validInvoices.forEach(inv => {
      const cid = inv.client_id || inv.client_name || "Unknown";
      const cname = inv.client_name || cid;
      if (!clientMap[cid]) clientMap[cid] = { name: cname, delays: [], outstanding: 0, realization: [], revenue: 0, invoiceCount: 0 };

      const total = Number(inv.total_amount) || 0;
      const paid = paymentMap[inv.id]?.total || 0;
      const outstanding = total - paid;
      clientMap[cid].revenue += total;
      clientMap[cid].invoiceCount++;

      if (outstanding > 0.01) clientMap[cid].outstanding += outstanding;

      const dueDate = inv.due_date ? new Date(inv.due_date) : (inv.invoice_date ? addDays(new Date(inv.invoice_date), 30) : null);
      if (dueDate && paid >= total * 0.99) {
        const paidDate = paymentMap[inv.id]?.lastDate ? new Date(paymentMap[inv.id].lastDate!) : null;
        if (paidDate) {
          const delay = Math.max(0, differenceInDays(paidDate, dueDate));
          clientMap[cid].delays.push(delay);
        }
      }
    });

    const campaignClientMap: Record<string, string> = {};
    campaigns.forEach(c => {
      const cname = (c as any).clients?.name || "";
      if (cname) campaignClientMap[c.id] = cname;
    });

    campaignAssets.forEach(ca => {
      const cmpName = campaignClientMap[ca.campaign_id];
      if (!cmpName) return;
      const card = Number(ca.card_rate) || 0;
      const neg = Number(ca.negotiated_rate) || 0;
      if (card > 0 && neg > 0) {
        const cid = Object.keys(clientMap).find(k => clientMap[k].name === cmpName);
        if (cid) clientMap[cid].realization.push((neg / card) * 100);
      }
    });

    return Object.entries(clientMap)
      .filter(([_, d]) => d.invoiceCount > 0)
      .map(([cid, d]) => {
        const avgDelay = d.delays.length > 0 ? d.delays.reduce((a, b) => a + b, 0) / d.delays.length : 0;
        const avgRealization = d.realization.length > 0 ? d.realization.reduce((a, b) => a + b, 0) / d.realization.length : 100;
        const revContrib = totalRevenue > 0 ? (d.revenue / totalRevenue) * 100 : 0;

        const trend: "improving" | "stable" | "worsening" = d.delays.length < 3 ? "stable" :
          d.delays.slice(-2).reduce((a, b) => a + b, 0) / 2 < d.delays.slice(0, -2).reduce((a, b) => a + b, 0) / (d.delays.length - 2) ? "improving" : "worsening";

        let riskScore = 0;
        if (avgDelay > 60) riskScore += 3; else if (avgDelay > 30) riskScore += 2; else if (avgDelay > 15) riskScore += 1;
        if (d.outstanding > 500000) riskScore += 2; else if (d.outstanding > 100000) riskScore += 1;
        if (avgRealization < 70) riskScore += 2; else if (avgRealization < 85) riskScore += 1;
        if (trend === "worsening") riskScore += 1;
        const riskLevel: "High" | "Medium" | "Low" = riskScore >= 5 ? "High" : riskScore >= 3 ? "Medium" : "Low";

        return {
          clientId: cid,
          clientName: d.name,
          avgDelayDays: Math.round(avgDelay),
          outstandingAmount: d.outstanding,
          paymentTrend: trend,
          realizationPercent: Math.round(avgRealization),
          revenueContribution: Math.round(revContrib * 10) / 10,
          riskLevel,
          invoiceCount: d.invoiceCount,
        };
      })
      .sort((a, b) => {
        const order = { High: 0, Medium: 1, Low: 2 };
        return order[a.riskLevel] - order[b.riskLevel] || b.outstandingAmount - a.outstandingAmount;
      })
      .slice(0, 20);
  }, [invoices, paymentMap, campaigns, campaignAssets]);

  // ── E) Asset ROI Ranking (period-aware) ──
  const assetROI = useMemo((): AssetROIRow[] => {
    const assetMap: Record<string, { revenue: number; printCost: number; mountCost: number; sqft: number; bookedDays: number }> = {};
    const audit = new RevenueAuditCollector();

    periodCampaignAssets.forEach(ca => {
      const aid = ca.asset_id;
      if (!assetMap[aid]) assetMap[aid] = { revenue: 0, printCost: 0, mountCost: 0, sqft: 0, bookedDays: 0 };
      const rawRev = Number(ca.total_price) || Number(ca.rent_amount) || 0;
      const field = Number(ca.total_price) ? 'total_price' : 'rent_amount';
      assetMap[aid].revenue += audit.clamp(rawRev, 'campaign_assets', field, aid);
      assetMap[aid].printCost += Number(ca.printing_cost) || 0;
      assetMap[aid].mountCost += Number(ca.mounting_cost) || 0;
      assetMap[aid].sqft = Number(ca.total_sqft) || 0;
      const window = resolveBookingWindow(ca);
      if (window) {
        // Clamp to period
        const clampedStart = window.start < dateRange.from ? dateRange.from : window.start;
        const clampedEnd = window.end > dateRange.to ? dateRange.to : window.end;
        assetMap[aid].bookedDays += Math.max(0, differenceInDays(clampedEnd, clampedStart) + 1);
      }
    });

    audit.summarize('AssetROI');

    // Add period expenses
    periodExpenses.forEach(e => {
      if (e.asset_id && assetMap[e.asset_id]) {
        assetMap[e.asset_id].printCost += Number(e.amount) || 0;
      }
    });

    const periodDays = Math.max(1, differenceInDays(dateRange.to, dateRange.from) + 1);

    return mediaAssets.map(ma => {
      const data = assetMap[ma.id] || { revenue: 0, printCost: 0, mountCost: 0, sqft: 0, bookedDays: 0 };
      const cost = data.printCost + data.mountCost;
      const profit = data.revenue - cost;
      // STRICT FIX: ROI = null when cost <= 0 (excluded from ranking)
      const roi = cost > 0 ? (profit / cost) * 100 : null;
      const occ = (data.bookedDays / periodDays) * 100;

      return {
        assetId: ma.id,
        location: ma.location || ma.area || "—",
        city: ma.city || "—",
        area: ma.area || "—",
        mediaType: ma.media_type || "—",
        revenue: data.revenue,
        cost,
        profit,
        roiPercent: roi !== null ? Math.round(roi) : null,
        occupancyPercent: Math.min(100, Math.round(occ)),
        totalSqft: Number(ma.total_sqft) || 0,
      };
    })
    // Only rank assets with valid (non-null) ROI
    .sort((a, b) => {
      if (a.roiPercent === null && b.roiPercent === null) return 0;
      if (a.roiPercent === null) return 1;
      if (b.roiPercent === null) return -1;
      return b.roiPercent - a.roiPercent;
    });
  }, [periodCampaignAssets, mediaAssets, periodExpenses, dateRange]);

  // ── C) Concession Risk ──
  const concessionRisk = useMemo((): ConcessionRiskRow[] => {
    const cityMap: Record<string, { revenue: number; bookedAssets: Set<string> }> = {};
    const audit = new RevenueAuditCollector();
    periodCampaignAssets.forEach(ca => {
      const city = ca.city || "Unknown";
      if (!cityMap[city]) cityMap[city] = { revenue: 0, bookedAssets: new Set() };
      const rawRev = Number(ca.total_price) || Number(ca.rent_amount) || 0;
      cityMap[city].revenue += audit.clamp(rawRev, 'campaign_assets', 'total_price', ca.asset_id, `city=${city}`);
      cityMap[city].bookedAssets.add(ca.asset_id);
    });
    audit.summarize('ConcessionRisk');

    const totalAssetsByCity: Record<string, number> = {};
    mediaAssets.forEach(ma => {
      const city = ma.city || "Unknown";
      totalAssetsByCity[city] = (totalAssetsByCity[city] || 0) + 1;
    });

    return Object.entries(cityMap).map(([city, data]) => {
      const totalInCity = totalAssetsByCity[city] || 1;
      const occ = (data.bookedAssets.size / totalInCity) * 100;
      const concessionFee = 0;
      const surplus = data.revenue - concessionFee;
      const riskLevel = concessionFee === 0 ? "safe" as const :
        data.revenue < concessionFee ? "red" as const :
        data.revenue < concessionFee * 1.2 ? "amber" as const : "safe" as const;

      return { city, concessionFee, revenue: data.revenue, surplus, occupancyPercent: Math.min(100, Math.round(occ)), riskLevel };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [periodCampaignAssets, mediaAssets]);

  // ── F) Executive KPIs (period-aware, consistent definitions) ──
  const executiveKPIs = useMemo((): ExecutiveKPIs => {
    // FIX #4: Unified accrual-basis definition: Revenue = invoiced, Profit = invoiced - expenses
    const periodRevenue = periodInvoices.reduce((s, i) => s + Math.max(0, Number(i.total_amount) || 0), 0);
    const periodExpenseTotal = periodExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const periodProfit = periodRevenue - periodExpenseTotal;

    // Collection rate uses all-time payment data for period invoices
    const periodReceived = periodInvoices.reduce((s, i) => s + (paymentMap[i.id]?.total || 0), 0);
    const collectionRate = periodRevenue > 0 ? (periodReceived / periodRevenue) * 100 : 0;

    // FIX #3: Date-range-aware occupancy
    const periodDays = Math.max(1, differenceInDays(dateRange.to, dateRange.from) + 1);
    const assetBookedDays: Record<string, number> = {};
    periodCampaignAssets.forEach(ca => {
      const window = resolveBookingWindow(ca);
      if (!window) return;
      const clampedStart = window.start < dateRange.from ? dateRange.from : window.start;
      const clampedEnd = window.end > dateRange.to ? dateRange.to : window.end;
      const days = Math.max(0, differenceInDays(clampedEnd, clampedStart) + 1);
      assetBookedDays[ca.asset_id] = (assetBookedDays[ca.asset_id] || 0) + days;
    });
    const totalOccDays = Object.values(assetBookedDays).reduce((s, d) => s + Math.min(d, periodDays), 0);
    const avgOccupancy = mediaAssets.length > 0 ? (totalOccDays / (mediaAssets.length * periodDays)) * 100 : 0;

    const bookedIds = new Set(periodCampaignAssets.map(ca => ca.asset_id));

    // STRICT: Top city - sanitize to non-negative booked values only
    const cityRev: Record<string, number> = {};
    periodCampaignAssets.forEach(ca => {
      const c = ca.city || "—";
      const rev = Math.max(0, Number(ca.total_price) || Number(ca.rent_amount) || 0);
      if (rev > 0) cityRev[c] = (cityRev[c] || 0) + rev;
    });
    const topCityEntry = Object.entries(cityRev).sort((a, b) => b[1] - a[1])[0];

    // STRICT: Best ROI - only assets with cost > 0 and non-null ROI
    const topAsset = assetROI.find(a => a.cost > 0 && a.roiPercent !== null);

    // FIX #6: Active campaigns - canonical live statuses
    const activeCampaigns = campaigns.filter(c => LIVE_CAMPAIGN_STATUSES.includes(c.status)).length;

    // FIX #7: Total clients from clients table
    const totalClients = clients.length;

    return {
      annualRevenue: periodRevenue,
      annualProfit: periodProfit,
      avgOccupancy: Math.round(avgOccupancy),
      collectionRate: Math.round(collectionRate),
      topCity: topCityEntry?.[0] || "—",
      topCityRevenue: topCityEntry?.[1] || 0,
      highestROIAsset: topAsset?.location || "—",
      highestROI: topAsset?.roiPercent ?? null,
      totalAssets: mediaAssets.length,
      bookedAssets: bookedIds.size,
      totalClients,
      activeCampaigns,
    };
  }, [periodInvoices, periodExpenses, campaigns, periodCampaignAssets, mediaAssets, assetROI, paymentMap, dateRange, clients]);

  // Revenue trend by month (12 months) - consistent accrual basis
  const revenueTrend = useMemo(() => {
    const now = new Date();
    const validInvoices = invoices.filter(i => i.status !== "Draft" && i.status !== "Cancelled");

    return Array.from({ length: 12 }, (_, i) => {
      const d = subMonths(now, 11 - i);
      const mStart = startOfMonth(d);
      const mEnd = endOfMonth(d);
      const label = format(d, "MMM yy");

      const monthInvoiced = validInvoices
        .filter(inv => inv.invoice_date && new Date(inv.invoice_date) >= mStart && new Date(inv.invoice_date) <= mEnd)
        .reduce((s, inv) => s + (Number(inv.total_amount) || 0), 0);
      const monthExpenses = expenses
        .filter(e => e.expense_date && new Date(e.expense_date) >= mStart && new Date(e.expense_date) <= mEnd)
        .reduce((s, e) => s + (Number(e.amount) || 0), 0);

      return { month: label, revenue: monthInvoiced, expenses: monthExpenses, profit: monthInvoiced - monthExpenses };
    });
  }, [invoices, expenses]);

  // Client concentration — dual-basis with proper name resolution
  const clientConcentration = useMemo((): { data: { name: string; value: number }[]; basis: "invoiced" | "booked" | "none" } => {
    // Build lookup maps for client name resolution
    const clientNameById: Record<string, string> = {};
    clients.forEach(c => { if (c.id && c.name) clientNameById[c.id] = c.name; });

    const campaignClientMap: Record<string, string> = {};
    const campaignClientIdMap: Record<string, string> = {};
    campaigns.forEach(c => {
      const joined = (c as any).clients?.name;
      if (joined) campaignClientMap[c.id] = joined;
      if (c.client_id) campaignClientIdMap[c.id] = c.client_id;
    });

    // Resolve name with priority: clients.name > campaign.clients.name > invoice.client_name > "Unknown Client"
    const resolveName = (clientId?: string, campaignId?: string, fallbackName?: string): string => {
      if (clientId && clientNameById[clientId]) return clientNameById[clientId];
      if (campaignId && campaignClientMap[campaignId]) return campaignClientMap[campaignId];
      if (campaignId && campaignClientIdMap[campaignId] && clientNameById[campaignClientIdMap[campaignId]])
        return clientNameById[campaignClientIdMap[campaignId]];
      if (fallbackName && fallbackName.trim()) return fallbackName.trim();
      return "Unknown Client";
    };

    const aggregate = (map: Record<string, number>): { name: string; value: number }[] => {
      const entries = Object.entries(map)
        .filter(([_, v]) => v > 0)
        .sort((a, b) => b[1] - a[1]);
      if (entries.length <= 5) return entries.map(([name, value]) => ({ name, value }));
      const top5 = entries.slice(0, 5);
      const othersValue = entries.slice(5).reduce((s, [_, v]) => s + v, 0);
      const result = top5.map(([name, value]) => ({ name, value }));
      if (othersValue > 0) result.push({ name: "Others", value: othersValue });
      return result;
    };

    // A) Primary: invoiced revenue by client in selected period
    const invoiceMap: Record<string, number> = {};
    periodInvoices.forEach(i => {
      const name = resolveName(i.client_id, i.campaign_id, i.client_name);
      const amt = Number(i.total_amount) || 0;
      if (amt > 0) invoiceMap[name] = (invoiceMap[name] || 0) + amt;
    });

    const invoiceEntries = Object.keys(invoiceMap).filter(k => k !== "Unknown Client");
    if (invoiceEntries.length > 0) {
      return { data: aggregate(invoiceMap), basis: "invoiced" };
    }

    // B) Fallback: booked value by client from period campaign assets
    const bookedMap: Record<string, number> = {};
    periodCampaignAssets.forEach(ca => {
      const campaignId = ca.campaign_id;
      const name = resolveName(undefined, campaignId);
      const rev = Math.max(0, Number(ca.total_price) || Number(ca.rent_amount) || 0);
      if (rev > 0) bookedMap[name] = (bookedMap[name] || 0) + rev;
    });

    const bookedEntries = Object.keys(bookedMap).filter(k => k !== "Unknown Client");
    if (bookedEntries.length > 0) {
      return { data: aggregate(bookedMap), basis: "booked" };
    }

    return { data: [], basis: "none" };
  }, [periodInvoices, periodCampaignAssets, campaigns, clients]);

  return {
    loading, timeRange, setTimeRange, customRange, setCustomRange, dateRange,
    cashFlowForecast, cashFlowTotal,
    clientRiskScores, assetROI, concessionRisk,
    executiveKPIs, revenueTrend, clientConcentration,
    refresh: loadData,
  };
}
