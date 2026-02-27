import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { addDays, differenceInDays, format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths } from "date-fns";

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
  roiPercent: number;
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
  highestROI: number;
  totalAssets: number;
  bookedAssets: number;
  totalClients: number;
  activeCampaigns: number;
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
      const [invRes, payRes, expRes, cmpRes, caRes, maRes] = await Promise.all([
        supabase.from("invoices").select("id, campaign_id, client_id, client_name, total_amount, status, invoice_date, due_date, payment_terms").eq("company_id", company.id),
        supabase.from("payment_records").select("id, invoice_id, amount, payment_date").eq("company_id", company.id),
        supabase.from("expenses").select("id, amount, category, expense_date, campaign_id, asset_id, vendor_name").eq("company_id", company.id),
        supabase.from("campaigns").select("id, name, client_id, status, start_date, end_date, clients(name)").eq("company_id", company.id),
        supabase.from("campaign_assets").select("id, campaign_id, asset_id, city, area, location, media_type, card_rate, negotiated_rate, printing_cost, mounting_cost, total_price, rent_amount, total_sqft, booking_start_date, booking_end_date"),
        supabase.from("media_assets").select("id, city, area, media_type, total_sqft, status, card_rate, base_rate, location").eq("company_id", company.id),
      ]);
      setInvoices(invRes.data || []);
      setPayments(payRes.data || []);
      setExpenses(expRes.data || []);
      setCampaigns(cmpRes.data || []);
      setCampaignAssets(caRes.data || []);
      setMediaAssets(maRes.data || []);
    } catch (e) {
      console.error("Strategic Intelligence load error:", e);
    } finally {
      setLoading(false);
    }
  }, [company?.id]);

  useEffect(() => { loadData(); }, [loadData]);

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

      // Incoming: unpaid invoices with due_date in this window
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

      // Outgoing: expenses expected in this window (simple: recurring monthly approximation)
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

  // Total cash flow summary
  const cashFlowTotal = useMemo(() => {
    const totalIncoming = cashFlowForecast.reduce((s, b) => s + b.incoming, 0);
    const totalOutgoing = cashFlowForecast.reduce((s, b) => s + b.outgoing, 0);
    // Current overdue
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
    const totalRevenue = invoices.filter(i => i.status !== "Draft" && i.status !== "Cancelled").reduce((s, i) => s + (Number(i.total_amount) || 0), 0);

    invoices.filter(i => i.status !== "Draft" && i.status !== "Cancelled").forEach(inv => {
      const cid = inv.client_id || inv.client_name || "Unknown";
      const cname = inv.client_name || cid;
      if (!clientMap[cid]) clientMap[cid] = { name: cname, delays: [], outstanding: 0, realization: [], revenue: 0, invoiceCount: 0 };

      const total = Number(inv.total_amount) || 0;
      const paid = paymentMap[inv.id]?.total || 0;
      const outstanding = total - paid;
      clientMap[cid].revenue += total;
      clientMap[cid].invoiceCount++;

      if (outstanding > 0.01) clientMap[cid].outstanding += outstanding;

      // Delay calculation
      const dueDate = inv.due_date ? new Date(inv.due_date) : (inv.invoice_date ? addDays(new Date(inv.invoice_date), 30) : null);
      if (dueDate && paid >= total * 0.99) {
        const paidDate = paymentMap[inv.id]?.lastDate ? new Date(paymentMap[inv.id].lastDate!) : null;
        if (paidDate) {
          const delay = Math.max(0, differenceInDays(paidDate, dueDate));
          clientMap[cid].delays.push(delay);
        }
      }
    });

    // Add realization from campaign assets
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

        // Recent delays vs older
        const trend: "improving" | "stable" | "worsening" = d.delays.length < 3 ? "stable" :
          d.delays.slice(-2).reduce((a, b) => a + b, 0) / 2 < d.delays.slice(0, -2).reduce((a, b) => a + b, 0) / (d.delays.length - 2) ? "improving" : "worsening";

        // Risk scoring
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

  // ── E) Asset ROI Ranking ──
  const assetROI = useMemo((): AssetROIRow[] => {
    const assetMap: Record<string, { revenue: number; printCost: number; mountCost: number; sqft: number; bookedMonths: number }> = {};
    const now = new Date();
    const yearStart = startOfYear(now);
    const yearEnd = endOfYear(now);

    campaignAssets.forEach(ca => {
      const aid = ca.asset_id;
      if (!assetMap[aid]) assetMap[aid] = { revenue: 0, printCost: 0, mountCost: 0, sqft: 0, bookedMonths: 0 };
      assetMap[aid].revenue += Number(ca.total_price) || Number(ca.rent_amount) || 0;
      assetMap[aid].printCost += Number(ca.printing_cost) || 0;
      assetMap[aid].mountCost += Number(ca.mounting_cost) || 0;
      assetMap[aid].sqft = Number(ca.total_sqft) || 0;
      assetMap[aid].bookedMonths++;
    });

    // Add expenses
    expenses.forEach(e => {
      if (e.asset_id && assetMap[e.asset_id]) {
        assetMap[e.asset_id].printCost += Number(e.amount) || 0;
      }
    });

    const totalAssets = mediaAssets.length;
    const totalMonths = 12;

    return mediaAssets.map(ma => {
      const data = assetMap[ma.id] || { revenue: 0, printCost: 0, mountCost: 0, sqft: 0, bookedMonths: 0 };
      const cost = data.printCost + data.mountCost;
      const profit = data.revenue - cost;
      const roi = cost > 0 ? (profit / cost) * 100 : (data.revenue > 0 ? 100 : 0);
      const occ = totalMonths > 0 ? (data.bookedMonths / totalMonths) * 100 : 0;

      return {
        assetId: ma.id,
        location: ma.location || ma.area || "—",
        city: ma.city || "—",
        area: ma.area || "—",
        mediaType: ma.media_type || "—",
        revenue: data.revenue,
        cost,
        profit,
        roiPercent: Math.round(roi),
        occupancyPercent: Math.min(100, Math.round(occ)),
        totalSqft: Number(ma.total_sqft) || 0,
      };
    }).sort((a, b) => b.roiPercent - a.roiPercent);
  }, [campaignAssets, mediaAssets, expenses]);

  // ── C) Concession Risk ──
  const concessionRisk = useMemo((): ConcessionRiskRow[] => {
    // Group revenue by city from campaign assets
    const cityMap: Record<string, { revenue: number; bookedAssets: Set<string> }> = {};
    campaignAssets.forEach(ca => {
      const city = ca.city || "Unknown";
      if (!cityMap[city]) cityMap[city] = { revenue: 0, bookedAssets: new Set() };
      cityMap[city].revenue += Number(ca.total_price) || Number(ca.rent_amount) || 0;
      cityMap[city].bookedAssets.add(ca.asset_id);
    });

    const totalAssetsByCity: Record<string, number> = {};
    mediaAssets.forEach(ma => {
      const city = ma.city || "Unknown";
      totalAssetsByCity[city] = (totalAssetsByCity[city] || 0) + 1;
    });

    return Object.entries(cityMap).map(([city, data]) => {
      const totalInCity = totalAssetsByCity[city] || 1;
      const occ = (data.bookedAssets.size / totalInCity) * 100;
      // Concession fee placeholder - users can input manually later
      const concessionFee = 0; // Manual input feature for Phase 3+
      const surplus = data.revenue - concessionFee;
      const riskLevel = concessionFee === 0 ? "safe" as const :
        data.revenue < concessionFee ? "red" as const :
        data.revenue < concessionFee * 1.2 ? "amber" as const : "safe" as const;

      return {
        city,
        concessionFee,
        revenue: data.revenue,
        surplus,
        occupancyPercent: Math.min(100, Math.round(occ)),
        riskLevel,
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [campaignAssets, mediaAssets]);

  // ── F) Executive KPIs ──
  const executiveKPIs = useMemo((): ExecutiveKPIs => {
    const validInvoices = invoices.filter(i => i.status !== "Draft" && i.status !== "Cancelled");
    const annualRevenue = validInvoices.reduce((s, i) => s + (Number(i.total_amount) || 0), 0);
    const totalReceived = validInvoices.reduce((s, i) => s + (paymentMap[i.id]?.total || 0), 0);
    const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const annualProfit = totalReceived - totalExpenses;
    const collectionRate = annualRevenue > 0 ? (totalReceived / annualRevenue) * 100 : 0;

    const bookedIds = new Set(campaignAssets.map(ca => ca.asset_id));
    const avgOccupancy = mediaAssets.length > 0 ? (bookedIds.size / mediaAssets.length) * 100 : 0;

    // Top city
    const cityRev: Record<string, number> = {};
    campaignAssets.forEach(ca => {
      const c = ca.city || "—";
      cityRev[c] = (cityRev[c] || 0) + (Number(ca.total_price) || Number(ca.rent_amount) || 0);
    });
    const topCityEntry = Object.entries(cityRev).sort((a, b) => b[1] - a[1])[0];

    // Highest ROI asset
    const topAsset = assetROI[0];

    const activeCampaigns = campaigns.filter(c => c.status === "Running" || c.status === "Active").length;
    const uniqueClients = new Set(validInvoices.map(i => i.client_id || i.client_name).filter(Boolean));

    return {
      annualRevenue,
      annualProfit,
      avgOccupancy: Math.round(avgOccupancy),
      collectionRate: Math.round(collectionRate),
      topCity: topCityEntry?.[0] || "—",
      topCityRevenue: topCityEntry?.[1] || 0,
      highestROIAsset: topAsset?.location || "—",
      highestROI: topAsset?.roiPercent || 0,
      totalAssets: mediaAssets.length,
      bookedAssets: bookedIds.size,
      totalClients: uniqueClients.size,
      activeCampaigns,
    };
  }, [invoices, payments, expenses, campaigns, campaignAssets, mediaAssets, assetROI, paymentMap]);

  // Revenue trend by month (12 months)
  const revenueTrend = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = subMonths(now, 11 - i);
      const mStart = startOfMonth(d);
      const mEnd = endOfMonth(d);
      const label = format(d, "MMM yy");

      const monthInvoiced = invoices
        .filter(inv => inv.status !== "Draft" && inv.status !== "Cancelled" && inv.invoice_date && new Date(inv.invoice_date) >= mStart && new Date(inv.invoice_date) <= mEnd)
        .reduce((s, i) => s + (Number(i.total_amount) || 0), 0);
      const monthExpenses = expenses
        .filter(e => e.expense_date && new Date(e.expense_date) >= mStart && new Date(e.expense_date) <= mEnd)
        .reduce((s, e) => s + (Number(e.amount) || 0), 0);

      return { month: label, revenue: monthInvoiced, expenses: monthExpenses, profit: monthInvoiced - monthExpenses };
    });
  }, [invoices, expenses]);

  // Client concentration
  const clientConcentration = useMemo(() => {
    const map: Record<string, number> = {};
    invoices.filter(i => i.status !== "Draft" && i.status !== "Cancelled").forEach(i => {
      const name = i.client_name || "Unknown";
      map[name] = (map[name] || 0) + (Number(i.total_amount) || 0);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [invoices]);

  return {
    loading, timeRange, setTimeRange, customRange, setCustomRange, dateRange,
    cashFlowForecast, cashFlowTotal,
    clientRiskScores, assetROI, concessionRisk,
    executiveKPIs, revenueTrend, clientConcentration,
    refresh: loadData,
  };
}
