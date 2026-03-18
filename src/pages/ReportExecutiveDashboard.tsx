import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useStrategicIntelligence, StrategicTimeRange } from "@/hooks/useStrategicIntelligence";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangeFilter } from "@/components/common/date-range-filter";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  DollarSign, TrendingUp, Percent, Building2, Target,
  Users, BarChart3, RefreshCw, Layers, ArrowUpRight,
  Briefcase, Award, Crown, Calendar, AlertCircle, Info, Download,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
  ComposedChart, Line,
} from "recharts";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { generateExecutiveSummaryPDF, captureChartAsImage } from "@/lib/pdf/executiveSummaryPdf";
import { useToast } from "@/hooks/use-toast";

const fmt = (v: number) => `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const COLORS = ["hsl(221, 83%, 53%)", "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)", "hsl(262, 83%, 58%)", "hsl(199, 89%, 48%)", "hsl(25, 95%, 53%)", "hsl(330, 81%, 60%)"];

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertCircle className="h-8 w-8 text-muted-foreground/50 mb-2" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export default function ReportExecutiveDashboard() {
  const navigate = useNavigate();
  const si = useStrategicIntelligence();
  const { company } = useCompany();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const revenueTrendRef = useRef<HTMLDivElement>(null);
  const clientPieRef = useRef<HTMLDivElement>(null);
  const profitTrendRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = useCallback(async () => {
    if (si.loading) return;
    setExporting(true);
    try {
      // Capture charts as images
      const [revImg, pieImg, profImg] = await Promise.all([
        revenueTrendRef.current ? captureChartAsImage(revenueTrendRef.current) : null,
        clientPieRef.current ? captureChartAsImage(clientPieRef.current) : null,
        profitTrendRef.current ? captureChartAsImage(profitTrendRef.current) : null,
      ]);

      // Fetch logo
      let logoBase64: string | undefined;
      if (company?.logo_url) {
        try {
          const res = await fetch(company.logo_url);
          if (res.ok) {
            const blob = await res.blob();
            logoBase64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
          }
        } catch { /* skip logo */ }
      }

      const k = si.executiveKPIs;
      const dateLabel = `${format(si.dateRange.from, 'dd MMM yyyy')} – ${format(si.dateRange.to, 'dd MMM yyyy')}`;

      const blob = await generateExecutiveSummaryPDF({
        companyName: company?.name || 'Company',
        companyLogoBase64: logoBase64,
        themeColor: company?.theme_color || '#1e40af',
        dateRangeLabel: dateLabel,
        generatedAt: format(new Date(), 'dd MMM yyyy'),
        invoicedRevenue: k.annualRevenue,
        netProfit: k.annualProfit,
        collectionRate: k.collectionRate,
        avgOccupancy: k.avgOccupancy,
        totalAssets: k.totalAssets,
        bookedAssets: k.bookedAssets,
        activeCampaigns: k.activeCampaigns,
        totalClients: k.totalClients,
        topCity: k.topCity,
        topCityRevenue: k.topCityRevenue,
        bestROI: k.highestROI,
        bestROIAsset: k.highestROIAsset,
        revenueTrendChartImage: revImg || undefined,
        clientConcentrationChartImage: pieImg || undefined,
        profitTrendChartImage: profImg || undefined,
        clientConcentrationBasis: si.clientConcentration.basis,
        clientConcentrationData: si.clientConcentration.data,
        revenueTrendData: si.revenueTrend,
      });

      const today = format(new Date(), 'yyyy-MM-dd');
      const companySlug = (company?.name || 'Report').replace(/[^a-zA-Z0-9]+/g, '_').replace(/_+$/, '').slice(0, 30);
      const rangeLabels: Record<string, string> = { monthly: 'This-Month', quarterly: 'This-Quarter', yearly: 'This-Year', custom: 'Custom-Range' };
      const rangeLabel = rangeLabels[si.timeRange] || 'Custom-Range';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Executive_Summary_${companySlug}_${today}_${rangeLabel}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "PDF Downloaded", description: "Executive Summary PDF has been generated." });
    } catch (err: any) {
      console.error('PDF export error:', err);
      toast({ variant: "destructive", title: "Export Failed", description: err.message || "Failed to generate PDF" });
    } finally {
      setExporting(false);
    }
  }, [si, company, toast]);

  if (si.loading) {
    return (
      <div className="h-full flex flex-col space-y-6 p-6 md:p-8">
        <h1 className="text-2xl font-bold tracking-tight">Executive Summary</h1>
        <div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Card key={i}><CardContent className="pt-6"><Skeleton className="h-8 w-32" /></CardContent></Card>)}</div>
      </div>
    );
  }

  const k = si.executiveKPIs;
  const hasInvoices = k.annualRevenue > 0;
  const hasCampaigns = k.activeCampaigns > 0 || k.bookedAssets > 0;

  // ROI display helpers
  const roiValue = k.highestROI !== null ? `${k.highestROI}%` : "N/A";
  const roiSub = k.highestROI !== null ? k.highestROIAsset : "Insufficient cost data";
  const roiColor = k.highestROI !== null ? "text-purple-600" : "text-muted-foreground";

  // Top City display
  const topCityLabel = k.topCity !== "—" ? k.topCity : "—";
  const topCitySub = k.topCity !== "—" ? fmt(k.topCityRevenue) : "No data";

  // Drill-down state payload (passed via router state)
  const drillState = {
    from: "executive-summary",
    dateFrom: si.dateRange.from.toISOString(),
    dateTo: si.dateRange.to.toISOString(),
    timeRange: si.timeRange,
  };

  const drillTo = (path: string, extra?: Record<string, string>) => {
    navigate(path, { state: { ...drillState, ...extra } });
  };

  return (
    <div className="h-full flex flex-col space-y-5 p-6 md:p-8 overflow-auto">
      {/* Header with time range selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Crown className="h-6 w-6 text-amber-500" /> Executive Summary
          </h1>
          <p className="text-sm text-muted-foreground">Board-ready overview · Financial metrics on accrual basis</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={si.timeRange} onValueChange={(v) => si.setTimeRange(v as StrategicTimeRange)}>
            <SelectTrigger className="h-9 w-[140px] text-sm">
              <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">This Month</SelectItem>
              <SelectItem value="quarterly">This Quarter</SelectItem>
              <SelectItem value="yearly">This Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          {si.timeRange === "custom" && (
            <DateRangeFilter
              label=""
              value={{ from: si.customRange.from, to: si.customRange.to } as DateRange}
              onChange={(range) => {
                if (range?.from && range?.to) {
                  si.setCustomRange({ from: range.from, to: range.to });
                }
              }}
              placeholder="Select range"
            />
          )}
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={si.refresh}><RefreshCw className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5" onClick={handleExportPDF} disabled={exporting}>
            <Download className="h-3.5 w-3.5" /> {exporting ? "Generating…" : "Export PDF"}
          </Button>
        </div>
      </div>

      {/* Financial KPIs — Accrual Basis */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Financial KPIs</span>
          <span className="text-[9px] font-medium text-muted-foreground/70 bg-muted px-1.5 py-0.5 rounded">Accrual Basis</span>
        </div>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <KPICard title="Invoiced Revenue" value={hasInvoices ? fmt(k.annualRevenue) : "—"} icon={<DollarSign className="h-4 w-4" />} color="text-blue-600"
            sub={!hasInvoices ? "No invoices in period" : undefined}
            tooltip="Sum of total_amount from all non-Draft, non-Cancelled invoices whose invoice_date falls within the selected period."
            onClick={() => drillTo("/admin/invoices")} />
          <KPICard title="Net Profit" value={hasInvoices ? fmt(k.annualProfit) : "—"} icon={<TrendingUp className="h-4 w-4" />}
            color={!hasInvoices ? "text-muted-foreground" : k.annualProfit >= 0 ? "text-emerald-600" : "text-red-600"}
            sub="Invoiced Revenue − Expenses"
            tooltip="Invoiced Revenue minus sum of all expenses whose expense_date falls within the selected period. Note: if expense records are incomplete, profit may be overstated."
            onClick={() => drillTo("/admin/reports/financial")} />
          <KPICard
            title="Collection Rate"
            value={hasInvoices ? `${k.collectionRate}%` : "—"}
            icon={<Percent className="h-4 w-4" />}
            color={!hasInvoices ? "text-muted-foreground" : k.collectionRate >= 80 ? "text-emerald-600" : "text-amber-600"}
            sub={hasInvoices ? "Cash collected ÷ Invoiced Revenue" : "No invoices"}
            tooltip="Total cash collected against invoices in the selected period, regardless of when the payment was made, divided by Invoiced Revenue. This is a cash-on-accrual hybrid metric."
            onClick={() => drillTo("/admin/payments")}
          />
          <KPICard title="Best ROI Asset" value={roiValue} icon={<Award className="h-4 w-4" />} color={roiColor}
            sub={roiSub}
            tooltip="(Booked Value − Direct Cost) ÷ Direct Cost × 100. Only assets with direct cost > 0 are ranked. Assets without printing or mounting cost data are excluded and shown as N/A."
            onClick={() => drillTo("/admin/reports/profitability")} />
        </div>
      </div>

      {/* Operational KPIs */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Operational KPIs</span>
        </div>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          <KPICard title="Avg Occupancy" value={hasCampaigns ? `${k.avgOccupancy}%` : "—"} icon={<Layers className="h-4 w-4" />}
            color={!hasCampaigns ? "text-muted-foreground" : k.avgOccupancy >= 60 ? "text-emerald-600" : "text-amber-600"}
            sub={!hasCampaigns ? "No bookings in period" : "Period date-range aware"}
            tooltip="Sum of booked days (clamped to selected period) across all assets, divided by total assets × period days. Each asset is capped at 100%."
            onClick={() => drillTo("/admin/reports/ooh-kpis")} />
          <KPICard title="Top City by Booked Value" value={topCityLabel} icon={<Building2 className="h-4 w-4" />} color="text-blue-600"
            sub={topCitySub}
            tooltip="City with the highest total booked value (total_price or rent_amount, non-negative only) from campaign assets overlapping the selected period. Company-scoped."
            onClick={k.topCity !== "—" ? () => drillTo("/admin/reports/booked-media", { filterCity: k.topCity }) : undefined} />
          <MiniStatCard label="Total Assets" value={k.totalAssets} icon={<Layers className="h-3.5 w-3.5" />}
            tooltip="Count of all media assets owned by your company."
            onClick={() => drillTo("/admin/media-assets")} />
          <MiniStatCard label="Booked (Period)" value={k.bookedAssets} icon={<Target className="h-3.5 w-3.5" />}
            tooltip="Count of distinct assets with at least one active booking overlapping the selected period."
            onClick={() => drillTo("/admin/reports/booked-media")} />
          <MiniStatCard label="Active Campaigns" value={k.activeCampaigns} icon={<Briefcase className="h-3.5 w-3.5" />}
            tooltip="Campaigns with status: Running, Active, Confirmed, or In Progress."
            onClick={() => drillTo("/admin/campaigns", { filterStatus: "active" })} />
        </div>
      </div>

      {/* Total Clients — separate row */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <MiniStatCard label="Total Clients" value={k.totalClients} icon={<Users className="h-3.5 w-3.5" />}
          tooltip="All registered clients in your company, regardless of period activity."
          onClick={() => drillTo("/admin/clients")} />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">12-Month Revenue vs Expenses (Accrual)</CardTitle></CardHeader>
          <CardContent ref={revenueTrendRef}>
            {si.revenueTrend.some(d => d.revenue > 0 || d.expenses > 0) ? (
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={si.revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                  <RTooltip formatter={(v: number) => fmt(v)} />
                  <Legend />
                  <Bar dataKey="revenue" name="Invoiced Revenue" fill="hsl(221, 83%, 53%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="profit" name="Net Profit" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={{ r: 2 }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : <EmptyState message="No invoice or expense data available for the last 12 months. Create invoices to see trends." />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Client Revenue Concentration
              {si.clientConcentration.basis !== "none" && (
                <span className="ml-2 text-[10px] font-normal text-muted-foreground">
                  Based on {si.clientConcentration.basis === "invoiced" ? "invoiced revenue" : "booked value"}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent ref={clientPieRef}>
            {si.clientConcentration.data.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={si.clientConcentration.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}
                    label={({ name, percent }: any) => `${(name as string).slice(0, 12)} ${(percent * 100).toFixed(0)}%`}>
                    {si.clientConcentration.data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <RTooltip formatter={(v: number) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyState message="No invoiced or booked client data in the selected period." />}
          </CardContent>
        </Card>
      </div>

      {/* Profit Trend */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Monthly Net Profit (Invoiced Revenue − Expenses)</CardTitle></CardHeader>
        <CardContent ref={profitTrendRef}>
          {si.revenueTrend.some(d => d.revenue > 0 || d.expenses > 0) ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={si.revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                <RTooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="profit" name="Net Profit" radius={[4, 4, 0, 0]}>
                  {si.revenueTrend.map((d, i) => <Cell key={i} fill={d.profit >= 0 ? "hsl(142, 71%, 45%)" : "hsl(0, 84%, 60%)"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState message="No financial data to display. Revenue and expense records are required." />}
        </CardContent>
      </Card>

      {/* Quick Navigation */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => navigate("/admin/reports/cashflow-forecast")}>
          <DollarSign className="h-3.5 w-3.5 mr-1.5" /> Cash Flow Forecast
        </Button>
        <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => navigate("/admin/reports/concession-risk")}>
          <Building2 className="h-3.5 w-3.5 mr-1.5" /> Risk Monitor
        </Button>
        <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => navigate("/admin/reports/campaign-profitability")}>
          <BarChart3 className="h-3.5 w-3.5 mr-1.5" /> Campaign Profitability
        </Button>
        <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => navigate("/admin/reports/ooh-revenue")}>
          <TrendingUp className="h-3.5 w-3.5 mr-1.5" /> OOH Revenue
        </Button>
      </div>
    </div>
  );
}

function KPICard({ title, value, icon, color, sub, tooltip, onClick }: {
  title: string; value: string; icon: React.ReactNode; color: string;
  sub?: string; tooltip?: string; onClick?: () => void;
}) {
  return (
    <Card className={cn("transition-shadow", onClick && "cursor-pointer hover:shadow-md")} onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
        <div className="flex items-center gap-1">
          <CardTitle className="text-[11px] font-medium text-muted-foreground truncate">{title}</CardTitle>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground/50 cursor-help shrink-0" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-xs">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <span className={color}>{icon}</span>
      </CardHeader>
      <CardContent className="pb-3 px-4">
        <div className={cn("text-lg font-bold", color)}>{value}</div>
        {sub && <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</div>}
        {onClick && <div className="flex items-center text-[10px] text-muted-foreground mt-0.5"><ArrowUpRight className="h-3 w-3 mr-0.5" />View</div>}
      </CardContent>
    </Card>
  );
}

function MiniStatCard({ label, value, icon, tooltip, onClick }: { label: string; value: number; icon: React.ReactNode; tooltip?: string; onClick?: () => void }) {
  return (
    <div
      className={cn("flex items-center gap-3 rounded-lg border p-3 transition-shadow", onClick && "cursor-pointer hover:shadow-md hover:border-primary/30")}
      onClick={onClick}
    >
      <span className="text-muted-foreground">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <p className="text-[10px] text-muted-foreground">{label}</p>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-2.5 w-2.5 text-muted-foreground/50 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px] text-xs">{tooltip}</TooltipContent>
            </Tooltip>
          )}
        </div>
        <p className="text-lg font-bold">{value}</p>
      </div>
      {onClick && <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
    </div>
  );
}
