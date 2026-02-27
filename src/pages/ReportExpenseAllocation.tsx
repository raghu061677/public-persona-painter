import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { formatCurrency } from "@/utils/mediaAssets";
import {
  DollarSign, TrendingUp, TrendingDown, BarChart3,
  Download, Search, AlertCircle, Layers,
} from "lucide-react";
import { exportListExcel } from "@/utils/exports/excel/exportListExcel";

interface ExpenseRow {
  id: string;
  expense_no: string | null;
  expense_date: string;
  vendor_name: string;
  category: string;
  amount: number;
  gst_amount: number;
  total_amount: number;
  allocation_type: string;
  campaign_id: string | null;
  plan_id: string | null;
  asset_id: string | null;
  // Joined
  campaign_name?: string;
  client_name?: string;
  plan_name?: string;
  asset_code?: string;
  asset_location?: string;
  asset_city?: string;
}

interface CampaignAgg {
  campaign_id: string;
  campaign_name: string;
  client_name: string;
  total_expenses: number;
  printing: number;
  mounting: number;
  transport: number;
  other: number;
  linked_revenue: number;
  net: number;
  margin: number;
}

interface AssetAgg {
  asset_id: string;
  asset_code: string;
  city: string;
  total_expenses: number;
  linked_revenue: number;
  net: number;
  roi: number;
}

interface PlanAgg {
  plan_id: string;
  plan_name: string;
  client_name: string;
  total_expenses: number;
  linked_revenue: number;
  net: number;
}

const fmt = (v: number) => formatCurrency(v);

export default function ReportExpenseAllocation() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "campaign";
  const { company } = useCompany();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [invoiceRevByCampaign, setInvoiceRevByCampaign] = useState<Record<string, number>>({});
  const [assetRevenue, setAssetRevenue] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState(format(startOfMonth(subMonths(new Date(), 2)), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [categoryFilter, setCategoryFilter] = useState("");

  const setTab = (tab: string) => setSearchParams({ tab });

  useEffect(() => {
    if (company?.id) fetchData();
  }, [company?.id, startDate, endDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch expenses with joins
      const { data: expData, error } = await supabase
        .from("expenses")
        .select(`
          id, expense_no, expense_date, vendor_name, category, amount, gst_amount, total_amount,
          allocation_type, campaign_id, plan_id, asset_id,
          campaigns:campaign_id(id, campaign_name, client_name),
          plans:plan_id(id, name, client_name),
          media_assets:asset_id(id, media_asset_code, location, city)
        `)
        .eq("company_id", company!.id)
        .gte("expense_date", startDate)
        .lte("expense_date", endDate)
        .order("expense_date", { ascending: false });

      if (error) throw error;

      const mapped: ExpenseRow[] = (expData || []).map((e: any) => ({
        id: e.id,
        expense_no: e.expense_no,
        expense_date: e.expense_date,
        vendor_name: e.vendor_name,
        category: e.category,
        amount: e.amount || 0,
        gst_amount: e.gst_amount || 0,
        total_amount: e.total_amount || 0,
        allocation_type: e.allocation_type || "General",
        campaign_id: e.campaign_id,
        plan_id: e.plan_id,
        asset_id: e.asset_id,
        campaign_name: e.campaigns?.campaign_name || e.campaigns?.id || "",
        client_name: e.campaigns?.client_name || e.plans?.client_name || "",
        plan_name: e.plans?.name || e.plans?.id || "",
        asset_code: e.media_assets?.media_asset_code || e.media_assets?.id || "",
        asset_location: e.media_assets?.location || "",
        asset_city: e.media_assets?.city || "",
      }));
      setExpenses(mapped);

      // Fetch invoice revenue by campaign
      const { data: invoices } = await supabase
        .from("invoices")
        .select("campaign_id, total_amount, status")
        .eq("company_id", company!.id)
        .not("status", "in", '("Draft","Cancelled")');

      const revMap: Record<string, number> = {};
      (invoices || []).forEach(i => {
        if (i.campaign_id) revMap[i.campaign_id] = (revMap[i.campaign_id] || 0) + (i.total_amount || 0);
      });
      setInvoiceRevByCampaign(revMap);

      // Fetch asset revenue from campaign_assets
      const { data: caData } = await supabase
        .from("campaign_assets")
        .select("asset_id, total_price, negotiated_rate, card_rate")
        .gte("booking_start_date", startDate)
        .lte("booking_end_date", endDate);

      const arMap: Record<string, number> = {};
      (caData || []).forEach(a => {
        const rev = a.total_price || a.negotiated_rate || a.card_rate || 0;
        arMap[a.asset_id] = (arMap[a.asset_id] || 0) + rev;
      });
      setAssetRevenue(arMap);
    } catch (err: any) {
      console.error("Error loading expense allocation:", err);
      toast({ title: "Error", description: "Failed to load expense data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let list = expenses;
    if (categoryFilter) list = list.filter(e => e.category === categoryFilter);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(e =>
        e.vendor_name.toLowerCase().includes(s) ||
        (e.campaign_name || "").toLowerCase().includes(s) ||
        (e.plan_name || "").toLowerCase().includes(s) ||
        (e.asset_code || "").toLowerCase().includes(s)
      );
    }
    return list;
  }, [expenses, categoryFilter, search]);

  // Campaign aggregation
  const campaignAgg = useMemo((): CampaignAgg[] => {
    const map = new Map<string, CampaignAgg>();
    filtered
      .filter(e => e.allocation_type === "Campaign" && e.campaign_id)
      .forEach(e => {
        const key = e.campaign_id!;
        const existing = map.get(key) || {
          campaign_id: key,
          campaign_name: e.campaign_name || key,
          client_name: e.client_name || "—",
          total_expenses: 0, printing: 0, mounting: 0, transport: 0, other: 0,
          linked_revenue: 0, net: 0, margin: 0,
        };
        existing.total_expenses += e.total_amount;
        const cat = (e.category || "").toLowerCase();
        if (cat.includes("print")) existing.printing += e.total_amount;
        else if (cat.includes("mount")) existing.mounting += e.total_amount;
        else if (cat.includes("transport")) existing.transport += e.total_amount;
        else existing.other += e.total_amount;
        map.set(key, existing);
      });
    return Array.from(map.values()).map(c => {
      c.linked_revenue = invoiceRevByCampaign[c.campaign_id] || 0;
      c.net = c.linked_revenue - c.total_expenses;
      c.margin = c.linked_revenue > 0 ? (c.net / c.linked_revenue) * 100 : 0;
      return c;
    }).sort((a, b) => b.total_expenses - a.total_expenses);
  }, [filtered, invoiceRevByCampaign]);

  // Asset aggregation
  const assetAgg = useMemo((): AssetAgg[] => {
    const map = new Map<string, AssetAgg>();
    filtered
      .filter(e => e.allocation_type === "Asset" && e.asset_id)
      .forEach(e => {
        const key = e.asset_id!;
        const existing = map.get(key) || {
          asset_id: key,
          asset_code: e.asset_code || key,
          city: e.asset_city || "—",
          total_expenses: 0, linked_revenue: 0, net: 0, roi: 0,
        };
        existing.total_expenses += e.total_amount;
        map.set(key, existing);
      });
    return Array.from(map.values()).map(a => {
      a.linked_revenue = assetRevenue[a.asset_id] || 0;
      a.net = a.linked_revenue - a.total_expenses;
      a.roi = a.total_expenses > 0 ? (a.net / a.total_expenses) * 100 : 0;
      return a;
    }).sort((a, b) => b.total_expenses - a.total_expenses);
  }, [filtered, assetRevenue]);

  // Plan aggregation
  const planAgg = useMemo((): PlanAgg[] => {
    const map = new Map<string, PlanAgg>();
    filtered
      .filter(e => e.allocation_type === "Plan" && e.plan_id)
      .forEach(e => {
        const key = e.plan_id!;
        const existing = map.get(key) || {
          plan_id: key, plan_name: e.plan_name || key,
          client_name: e.client_name || "—",
          total_expenses: 0, linked_revenue: 0, net: 0,
        };
        existing.total_expenses += e.total_amount;
        map.set(key, existing);
      });
    return Array.from(map.values()).sort((a, b) => b.total_expenses - a.total_expenses);
  }, [filtered]);

  // General (unallocated)
  const generalExpenses = useMemo(() =>
    filtered.filter(e => e.allocation_type === "General" || (!e.campaign_id && !e.plan_id && !e.asset_id)),
    [filtered]
  );

  // Totals
  const totalAll = filtered.reduce((s, e) => s + e.total_amount, 0);
  const totalCampaign = campaignAgg.reduce((s, c) => s + c.total_expenses, 0);
  const totalAsset = assetAgg.reduce((s, a) => s + a.total_expenses, 0);
  const totalGeneral = generalExpenses.reduce((s, e) => s + e.total_amount, 0);

  const categories = [...new Set(expenses.map(e => e.category).filter(Boolean))].sort();

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-6">
        <div><h1 className="text-2xl font-bold">Expense Allocation Report</h1></div>
        <div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-5 p-6 md:p-8 overflow-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expense Allocation Report</h1>
          <p className="text-sm text-muted-foreground">
            How expenses are distributed across Campaigns, Assets, Plans & General
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-8 w-36 text-xs" />
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-8 w-36 text-xs" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 pl-8 w-52 text-xs" />
        </div>
        <Select value={categoryFilter || "all"} onValueChange={v => setCategoryFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Layers className="h-4 w-4" /> Total Expenses</div>
          <p className="text-2xl font-bold">{fmt(totalAll)}</p>
          <p className="text-xs text-muted-foreground">{filtered.length} records</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><BarChart3 className="h-4 w-4" /> Campaign Allocated</div>
          <p className="text-2xl font-bold text-blue-600">{fmt(totalCampaign)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><TrendingUp className="h-4 w-4" /> Asset Allocated</div>
          <p className="text-2xl font-bold text-emerald-600">{fmt(totalAsset)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><AlertCircle className="h-4 w-4" /> Unallocated</div>
          <p className="text-2xl font-bold text-orange-600">{fmt(totalGeneral)}</p>
        </CardContent></Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setTab} className="flex-1">
        <TabsList className="h-9">
          <TabsTrigger value="campaign" className="text-xs px-4">Campaign-wise</TabsTrigger>
          <TabsTrigger value="asset" className="text-xs px-4">Asset-wise</TabsTrigger>
          <TabsTrigger value="plan" className="text-xs px-4">Plan-wise</TabsTrigger>
          <TabsTrigger value="general" className="text-xs px-4">Unallocated</TabsTrigger>
        </TabsList>

        <TabsContent value="campaign" className="mt-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Campaign-wise Expenses ({campaignAgg.length})</CardTitle>
              <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => exportListExcel({
                branding: { companyName: "GO-ADS 360°", title: "Campaign Expense Allocation" },
                fields: [
                  { key: "campaign_name", label: "Campaign", width: 24 },
                  { key: "client_name", label: "Client", width: 20 },
                  { key: "total_expenses", label: "Total Expenses", type: "currency", width: 16 },
                  { key: "printing", label: "Printing", type: "currency", width: 14 },
                  { key: "mounting", label: "Mounting", type: "currency", width: 14 },
                  { key: "other", label: "Other", type: "currency", width: 14 },
                  { key: "linked_revenue", label: "Revenue", type: "currency", width: 16 },
                  { key: "net", label: "Net", type: "currency", width: 16 },
                  { key: "margin", label: "Margin %", type: "number", width: 12, value: (r: any) => Number(r.margin.toFixed(1)) },
                ],
                rows: campaignAgg,
                fileName: `Campaign_Expense_Allocation_${startDate}.xlsx`,
              })}>
                <Download className="h-3 w-3 mr-1" /> Export
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead className="text-right">Total Expenses</TableHead>
                      <TableHead className="text-right">Printing</TableHead>
                      <TableHead className="text-right">Mounting</TableHead>
                      <TableHead className="text-right">Other</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                      <TableHead className="text-right">Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaignAgg.map(c => (
                      <TableRow key={c.campaign_id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/admin/campaigns/${c.campaign_id}`)}>
                        <TableCell className="font-medium max-w-[180px] truncate">{c.campaign_name}</TableCell>
                        <TableCell className="text-sm">{c.client_name}</TableCell>
                        <TableCell className="text-right">{fmt(c.total_expenses)}</TableCell>
                        <TableCell className="text-right text-sm">{fmt(c.printing)}</TableCell>
                        <TableCell className="text-right text-sm">{fmt(c.mounting)}</TableCell>
                        <TableCell className="text-right text-sm">{fmt(c.other)}</TableCell>
                        <TableCell className="text-right">{c.linked_revenue > 0 ? fmt(c.linked_revenue) : <span className="text-muted-foreground text-xs">No revenue</span>}</TableCell>
                        <TableCell className={`text-right font-medium ${c.net >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmt(c.net)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={c.margin >= 20 ? "default" : c.margin >= 0 ? "secondary" : "destructive"} className="text-[10px]">
                            {c.margin.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {campaignAgg.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No campaign-allocated expenses</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="asset" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Asset-wise Expenses ({assetAgg.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset Code</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead className="text-right">Total Expenses</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Net Profit</TableHead>
                      <TableHead className="text-right">ROI %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assetAgg.map(a => (
                      <TableRow key={a.asset_id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/admin/media-assets/${a.asset_id}`)}>
                        <TableCell className="font-mono text-sm">{a.asset_code}</TableCell>
                        <TableCell>{a.city}</TableCell>
                        <TableCell className="text-right">{fmt(a.total_expenses)}</TableCell>
                        <TableCell className="text-right">{a.linked_revenue > 0 ? fmt(a.linked_revenue) : <span className="text-muted-foreground text-xs">No revenue</span>}</TableCell>
                        <TableCell className={`text-right font-medium ${a.net >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmt(a.net)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={a.roi >= 0 ? "default" : "destructive"} className="text-[10px]">{a.roi.toFixed(1)}%</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {assetAgg.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No asset-allocated expenses</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plan" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Plan-wise Expenses ({planAgg.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead className="text-right">Total Expenses</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {planAgg.map(p => (
                      <TableRow key={p.plan_id}>
                        <TableCell className="font-medium">{p.plan_name}</TableCell>
                        <TableCell>{p.client_name}</TableCell>
                        <TableCell className="text-right">{fmt(p.total_expenses)}</TableCell>
                      </TableRow>
                    ))}
                    {planAgg.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No plan-allocated expenses</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Unallocated (General) Expenses ({generalExpenses.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 p-3 rounded-md bg-orange-50 border border-orange-200 dark:bg-orange-950/20 dark:border-orange-900">
                <div className="flex items-center gap-2 text-sm text-orange-700 dark:text-orange-400">
                  <AlertCircle className="h-4 w-4" />
                  These expenses are not assigned to any revenue source (Campaign, Plan, or Asset).
                </div>
              </div>
              <div className="overflow-auto max-h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {generalExpenses.map(e => (
                      <TableRow key={e.id}>
                        <TableCell className="text-xs">{format(new Date(e.expense_date), "dd MMM yyyy")}</TableCell>
                        <TableCell>{e.vendor_name}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{e.category}</Badge></TableCell>
                        <TableCell className="text-right">{fmt(e.amount)}</TableCell>
                        <TableCell className="text-right font-medium">{fmt(e.total_amount)}</TableCell>
                      </TableRow>
                    ))}
                    {generalExpenses.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No unallocated expenses</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
