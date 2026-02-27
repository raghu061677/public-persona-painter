import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, format, differenceInDays, subMonths, parseISO } from "date-fns";

export type TimeRange = "monthly" | "quarterly" | "yearly" | "custom";

interface DateRange {
  from: Date;
  to: Date;
}

export interface KPIData {
  totalInvoiced: number;
  totalReceived: number;
  outstanding: number;
  collectionRate: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  invoiceCount: number;
  paidCount: number;
  overdueCount: number;
}

export interface MonthRow {
  month: string;
  invoiced: number;
  received: number;
  outstanding: number;
  expenses: number;
  netProfit: number;
}

export interface QuarterRow {
  quarter: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface YearRow {
  year: string;
  revenue: number;
  expenses: number;
  profit: number;
  growth: number;
}

export interface AgingBucket {
  label: string;
  count: number;
  amount: number;
}

export interface CampaignProfit {
  id: string;
  name: string;
  client: string;
  revenue: number;
  printingCost: number;
  mountingCost: number;
  net: number;
  margin: number;
}

export interface CityRevenue {
  city: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface MediaTypeRevenue {
  mediaType: string;
  revenue: number;
  percent: number;
}

export interface ClientOutstanding {
  clientId: string;
  clientName: string;
  outstanding: number;
  unpaidCount: number;
  oldestDue: string | null;
  agingBucket: string;
}

export interface ClientInvoiced {
  clientId: string;
  clientName: string;
  totalInvoiced: number;
  totalReceived: number;
  outstanding: number;
  invoiceCount: number;
}

export interface RevenueExpenseTrend {
  month: string;
  revenue: number;
  expenses: number;
}

export function useCFODashboard() {
  const { company } = useCompany();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>("monthly");
  const [customRange, setCustomRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  // Raw data
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [campaignAssets, setCampaignAssets] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);

  const dateRange = useMemo((): DateRange => {
    const now = new Date();
    switch (timeRange) {
      case "monthly":
        return { from: startOfMonth(now), to: endOfMonth(now) };
      case "quarterly":
        return { from: startOfQuarter(now), to: endOfQuarter(now) };
      case "yearly":
        return { from: startOfYear(now), to: endOfYear(now) };
      case "custom":
        return customRange;
    }
  }, [timeRange, customRange]);

  const loadData = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const [invRes, payRes, expRes, caRes, cmpRes] = await Promise.all([
        supabase.from("invoices").select("id, invoice_no, invoice_date, due_date, total_amount, paid_amount, balance_due, status, campaign_id, client_id, clients(name)").eq("company_id", company.id),
        supabase.from("payment_records").select("id, invoice_id, amount, payment_date, method").eq("company_id", company.id),
        supabase.from("expenses").select("id, category, amount, total_amount, expense_date, vendor_name, campaign_id").eq("company_id", company.id),
        supabase.from("campaign_assets").select("id, campaign_id, asset_id, city, media_type, card_rate, negotiated_rate, printing_cost, mounting_cost, total_price, rent_amount"),
        supabase.from("campaigns").select("id, name, client_id, status, start_date, end_date, clients(name)").eq("company_id", company.id),
      ]);

      setInvoices(invRes.data || []);
      setPayments(payRes.data || []);
      setExpenses(expRes.data || []);
      setCampaignAssets(caRes.data || []);
      setCampaigns(cmpRes.data || []);
    } catch (e) {
      console.error("CFO data load error:", e);
    } finally {
      setLoading(false);
    }
  }, [company?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  // Filter by date range
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const d = inv.invoice_date ? new Date(inv.invoice_date) : null;
      return d && d >= dateRange.from && d <= dateRange.to;
    });
  }, [invoices, dateRange]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const d = p.payment_date ? new Date(p.payment_date) : null;
      return d && d >= dateRange.from && d <= dateRange.to;
    });
  }, [payments, dateRange]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const d = e.expense_date ? new Date(e.expense_date) : null;
      return d && d >= dateRange.from && d <= dateRange.to;
    });
  }, [expenses, dateRange]);

  // KPIs
  const kpi = useMemo((): KPIData => {
    const totalInvoiced = filteredInvoices.reduce((s, i) => s + (Number(i.total_amount) || 0), 0);
    const totalReceived = filteredPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const outstanding = filteredInvoices.reduce((s, i) => s + (Number(i.balance_due) || 0), 0);
    const collectionRate = totalInvoiced > 0 ? (totalReceived / totalInvoiced) * 100 : 0;
    const totalExp = filteredExpenses.reduce((s, e) => s + (Number(e.total_amount) || 0), 0);
    const netProfit = totalReceived - totalExp;
    const profitMargin = totalReceived > 0 ? (netProfit / totalReceived) * 100 : 0;
    const paidCount = filteredInvoices.filter(i => i.status === 'Paid').length;
    const overdueCount = filteredInvoices.filter(i => i.status === 'Overdue').length;

    return {
      totalInvoiced, totalReceived, outstanding, collectionRate,
      totalExpenses: totalExp, netProfit, profitMargin,
      invoiceCount: filteredInvoices.length, paidCount, overdueCount,
    };
  }, [filteredInvoices, filteredPayments, filteredExpenses]);

  // Monthly summary (last 12 months, regardless of toggle — for the table)
  const monthlyRows = useMemo((): MonthRow[] => {
    const now = new Date();
    const months: MonthRow[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(now, i);
      const key = format(d, "yyyy-MM");
      const label = format(d, "MMM yyyy");
      const mStart = startOfMonth(d);
      const mEnd = endOfMonth(d);

      const mInv = invoices.filter(inv => {
        const dt = inv.invoice_date ? new Date(inv.invoice_date) : null;
        return dt && dt >= mStart && dt <= mEnd;
      });
      const mPay = payments.filter(p => {
        const dt = p.payment_date ? new Date(p.payment_date) : null;
        return dt && dt >= mStart && dt <= mEnd;
      });
      const mExp = expenses.filter(e => {
        const dt = e.expense_date ? new Date(e.expense_date) : null;
        return dt && dt >= mStart && dt <= mEnd;
      });

      const invoiced = mInv.reduce((s, i) => s + (Number(i.total_amount) || 0), 0);
      const received = mPay.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const outstanding = mInv.reduce((s, i) => s + (Number(i.balance_due) || 0), 0);
      const exp = mExp.reduce((s, e) => s + (Number(e.total_amount) || 0), 0);

      months.push({ month: label, invoiced, received, outstanding, expenses: exp, netProfit: received - exp });
    }
    return months;
  }, [invoices, payments, expenses]);

  // Quarterly
  const quarterlyRows = useMemo((): QuarterRow[] => {
    const qMap: Record<string, { revenue: number; expenses: number }> = {};
    monthlyRows.forEach(m => {
      const date = new Date(m.month);
      const q = `Q${Math.ceil((date.getMonth() + 1) / 3)} ${date.getFullYear()}`;
      if (!qMap[q]) qMap[q] = { revenue: 0, expenses: 0 };
      qMap[q].revenue += m.received;
      qMap[q].expenses += m.expenses;
    });
    return Object.entries(qMap).map(([quarter, d]) => ({
      quarter, revenue: d.revenue, expenses: d.expenses, profit: d.revenue - d.expenses,
    }));
  }, [monthlyRows]);

  // Yearly
  const yearlyRows = useMemo((): YearRow[] => {
    const yMap: Record<string, { revenue: number; expenses: number }> = {};
    invoices.forEach(inv => {
      const y = inv.invoice_date ? new Date(inv.invoice_date).getFullYear().toString() : null;
      if (!y) return;
      if (!yMap[y]) yMap[y] = { revenue: 0, expenses: 0 };
      yMap[y].revenue += Number(inv.total_amount) || 0;
    });
    expenses.forEach(exp => {
      const y = exp.expense_date ? new Date(exp.expense_date).getFullYear().toString() : null;
      if (!y) return;
      if (!yMap[y]) yMap[y] = { revenue: 0, expenses: 0 };
      yMap[y].expenses += Number(exp.total_amount) || 0;
    });
    const sorted = Object.entries(yMap).sort(([a], [b]) => a.localeCompare(b));
    return sorted.map(([year, d], idx) => {
      const prevRevenue = idx > 0 ? sorted[idx - 1][1].revenue : 0;
      const growth = prevRevenue > 0 ? ((d.revenue - prevRevenue) / prevRevenue) * 100 : 0;
      return { year, revenue: d.revenue, expenses: d.expenses, profit: d.revenue - d.expenses, growth };
    });
  }, [invoices, expenses]);

  // Aging buckets
  const agingBuckets = useMemo((): AgingBucket[] => {
    const now = new Date();
    const buckets = [
      { label: "0–30 Days", count: 0, amount: 0 },
      { label: "31–60 Days", count: 0, amount: 0 },
      { label: "61–90 Days", count: 0, amount: 0 },
      { label: "90+ Days", count: 0, amount: 0 },
    ];
    invoices.filter(i => (Number(i.balance_due) || 0) > 0 && i.status !== 'Draft' && i.status !== 'Cancelled').forEach(inv => {
      const dueDate = inv.due_date ? new Date(inv.due_date) : (inv.invoice_date ? new Date(inv.invoice_date) : now);
      const days = Math.max(0, differenceInDays(now, dueDate));
      const bal = Number(inv.balance_due) || 0;
      if (days <= 30) { buckets[0].count++; buckets[0].amount += bal; }
      else if (days <= 60) { buckets[1].count++; buckets[1].amount += bal; }
      else if (days <= 90) { buckets[2].count++; buckets[2].amount += bal; }
      else { buckets[3].count++; buckets[3].amount += bal; }
    });
    return buckets;
  }, [invoices]);

  // Campaign profitability
  const campaignProfitability = useMemo((): CampaignProfit[] => {
    return campaigns
      .filter(c => c.status !== 'Cancelled')
      .map(c => {
        const assets = campaignAssets.filter(ca => ca.campaign_id === c.id);
        const revenue = assets.reduce((s, a) => s + (Number(a.total_price) || Number(a.rent_amount) || Number(a.negotiated_rate) || Number(a.card_rate) || 0), 0);
        const printingCost = assets.reduce((s, a) => s + (Number(a.printing_cost) || 0), 0);
        const mountingCost = assets.reduce((s, a) => s + (Number(a.mounting_cost) || 0), 0);
        const net = revenue - printingCost - mountingCost;
        const margin = revenue > 0 ? (net / revenue) * 100 : 0;
        return {
          id: c.id, name: c.name || c.id,
          client: (c as any).clients?.name || "—",
          revenue, printingCost, mountingCost, net, margin,
        };
      })
      .filter(c => c.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20);
  }, [campaigns, campaignAssets]);

  // City-wise revenue
  const cityRevenue = useMemo((): CityRevenue[] => {
    const map: Record<string, { revenue: number; expenses: number }> = {};
    campaignAssets.forEach(a => {
      const city = a.city || "Unknown";
      if (!map[city]) map[city] = { revenue: 0, expenses: 0 };
      map[city].revenue += Number(a.total_price) || Number(a.rent_amount) || 0;
      map[city].expenses += (Number(a.printing_cost) || 0) + (Number(a.mounting_cost) || 0);
    });
    return Object.entries(map)
      .map(([city, d]) => ({ city, revenue: d.revenue, expenses: d.expenses, profit: d.revenue - d.expenses }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [campaignAssets]);

  // Media type revenue
  const mediaTypeRevenue = useMemo((): MediaTypeRevenue[] => {
    const map: Record<string, number> = {};
    let total = 0;
    campaignAssets.forEach(a => {
      const mt = a.media_type || "Other";
      const rev = Number(a.total_price) || Number(a.rent_amount) || 0;
      map[mt] = (map[mt] || 0) + rev;
      total += rev;
    });
    return Object.entries(map)
      .map(([mediaType, revenue]) => ({ mediaType, revenue, percent: total > 0 ? (revenue / total) * 100 : 0 }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [campaignAssets]);

  // Trend data (for charts)
  const trendData = useMemo((): RevenueExpenseTrend[] => {
    return monthlyRows.map(m => ({
      month: m.month.split(" ")[0],
      revenue: m.received,
      expenses: m.expenses,
    }));
  }, [monthlyRows]);

  // Client Outstanding Top 10
  const clientOutstandingTop10 = useMemo((): ClientOutstanding[] => {
    const now = new Date();
    // Build payment map: invoice_id -> total paid
    const paymentMap: Record<string, number> = {};
    payments.forEach(p => {
      paymentMap[p.invoice_id] = (paymentMap[p.invoice_id] || 0) + (Number(p.amount) || 0);
    });

    // Filter unpaid invoices in selected period
    const unpaid = filteredInvoices.filter(inv => {
      const total = Number(inv.total_amount) || 0;
      const paid = paymentMap[inv.id] || 0;
      return (total - paid) > 0.01 && inv.status !== 'Draft' && inv.status !== 'Cancelled';
    });

    // Group by client
    const clientMap: Record<string, { clientName: string; outstanding: number; count: number; oldestDue: Date | null }> = {};
    unpaid.forEach(inv => {
      const cid = inv.client_id || 'unknown';
      const cname = (inv as any).clients?.name || '—';
      const total = Number(inv.total_amount) || 0;
      const paid = paymentMap[inv.id] || 0;
      const bal = total - paid;
      const dueDate = inv.due_date ? new Date(inv.due_date) : (inv.invoice_date ? new Date(inv.invoice_date) : null);

      if (!clientMap[cid]) clientMap[cid] = { clientName: cname, outstanding: 0, count: 0, oldestDue: null };
      clientMap[cid].outstanding += bal;
      clientMap[cid].count++;
      if (dueDate && (!clientMap[cid].oldestDue || dueDate < clientMap[cid].oldestDue!)) {
        clientMap[cid].oldestDue = dueDate;
      }
    });

    return Object.entries(clientMap)
      .map(([clientId, d]) => {
        const days = d.oldestDue ? Math.max(0, differenceInDays(now, d.oldestDue)) : 0;
        const agingBucket = days <= 30 ? '0–30' : days <= 60 ? '31–60' : days <= 90 ? '61–90' : '90+';
        return {
          clientId, clientName: d.clientName, outstanding: d.outstanding,
          unpaidCount: d.count, oldestDue: d.oldestDue ? format(d.oldestDue, 'dd MMM yyyy') : null, agingBucket,
        };
      })
      .sort((a, b) => b.outstanding - a.outstanding)
      .slice(0, 10);
  }, [filteredInvoices, payments]);

  // Top 10 Clients by Invoiced
  const clientInvoicedTop10 = useMemo((): ClientInvoiced[] => {
    const paymentMap: Record<string, number> = {};
    payments.forEach(p => {
      paymentMap[p.invoice_id] = (paymentMap[p.invoice_id] || 0) + (Number(p.amount) || 0);
    });

    const clientMap: Record<string, { clientName: string; invoiced: number; received: number; count: number }> = {};
    filteredInvoices.filter(i => i.status !== 'Draft' && i.status !== 'Cancelled').forEach(inv => {
      const cid = inv.client_id || 'unknown';
      const cname = (inv as any).clients?.name || '—';
      const total = Number(inv.total_amount) || 0;
      const paid = paymentMap[inv.id] || 0;

      if (!clientMap[cid]) clientMap[cid] = { clientName: cname, invoiced: 0, received: 0, count: 0 };
      clientMap[cid].invoiced += total;
      clientMap[cid].received += Math.min(paid, total);
      clientMap[cid].count++;
    });

    return Object.entries(clientMap)
      .map(([clientId, d]) => ({
        clientId, clientName: d.clientName, totalInvoiced: d.invoiced,
        totalReceived: d.received, outstanding: d.invoiced - d.received, invoiceCount: d.count,
      }))
      .sort((a, b) => b.totalInvoiced - a.totalInvoiced)
      .slice(0, 10);
  }, [filteredInvoices, payments]);

  return {
    loading, timeRange, setTimeRange, customRange, setCustomRange, dateRange,
    kpi, monthlyRows, quarterlyRows, yearlyRows, agingBuckets,
    campaignProfitability, cityRevenue, mediaTypeRevenue, trendData,
    clientOutstandingTop10, clientInvoicedTop10,
    refresh: loadData,
  };
}
