import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStrategicIntelligence, StrategicTimeRange } from "@/hooks/useStrategicIntelligence";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangeFilter } from "@/components/common/date-range-filter";
import { cn } from "@/lib/utils";
import {
  DollarSign, TrendingUp, Percent, Building2, Target,
  Users, BarChart3, RefreshCw, Layers, ArrowUpRight,
  Briefcase, Award, Crown, Calendar, AlertCircle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
  ComposedChart, Line,
} from "recharts";
import { DateRange } from "react-day-picker";

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

  if (si.loading) {
    return (
      <div className="h-full flex flex-col space-y-6 p-6 md:p-8">
        <h1 className="text-2xl font-bold tracking-tight">Executive Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Card key={i}><CardContent className="pt-6"><Skeleton className="h-8 w-32" /></CardContent></Card>)}</div>
      </div>
    );
  }

  const k = si.executiveKPIs;
  const hasInvoices = k.annualRevenue > 0;
  const hasCampaigns = k.activeCampaigns > 0 || k.bookedAssets > 0;

  return (
    <div className="h-full flex flex-col space-y-5 p-6 md:p-8 overflow-auto">
      {/* Header with time range selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Crown className="h-6 w-6 text-amber-500" /> Executive Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">Board-ready overview of business performance</p>
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
        </div>
      </div>

      {/* Top KPIs */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <KPICard title="Period Revenue" value={hasInvoices ? fmt(k.annualRevenue) : "—"} icon={<DollarSign className="h-4 w-4" />} color="text-blue-600"
          sub={!hasInvoices ? "No invoices in period" : undefined}
          onClick={() => navigate("/admin/reports/financial")} />
        <KPICard title="Period Profit" value={hasInvoices ? fmt(k.annualProfit) : "—"} icon={<TrendingUp className="h-4 w-4" />}
          color={!hasInvoices ? "text-muted-foreground" : k.annualProfit >= 0 ? "text-emerald-600" : "text-red-600"}
          sub={!hasInvoices ? "Invoiced − Expenses" : undefined} />
        <KPICard title="Avg Occupancy" value={hasCampaigns ? `${k.avgOccupancy}%` : "—"} icon={<Layers className="h-4 w-4" />}
          color={!hasCampaigns ? "text-muted-foreground" : k.avgOccupancy >= 60 ? "text-emerald-600" : "text-amber-600"}
          sub={!hasCampaigns ? "No bookings in period" : undefined}
          onClick={() => navigate("/admin/reports/ooh-kpis")} />
        <KPICard title="Collection Rate" value={hasInvoices ? `${k.collectionRate}%` : "—"} icon={<Percent className="h-4 w-4" />}
          color={!hasInvoices ? "text-muted-foreground" : k.collectionRate >= 80 ? "text-emerald-600" : "text-amber-600"}
          sub={!hasInvoices ? "No invoices" : undefined} />
        <KPICard title="Top City" value={k.topCity !== "—" ? k.topCity : "—"} icon={<Building2 className="h-4 w-4" />} color="text-blue-600"
          sub={k.topCity !== "—" ? fmt(k.topCityRevenue) : "No city data"} />
        <KPICard title="Best ROI Asset" value={k.highestROI > 0 ? `${k.highestROI}%` : "—"} icon={<Award className="h-4 w-4" />} color="text-purple-600"
          sub={k.highestROI > 0 ? k.highestROIAsset : "No cost data for ROI"} />
      </div>

      {/* Secondary stats */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <MiniStat label="Total Assets" value={k.totalAssets} icon={<Layers className="h-3.5 w-3.5" />} />
        <MiniStat label="Booked (Period)" value={k.bookedAssets} icon={<Target className="h-3.5 w-3.5" />} />
        <MiniStat label="Active Campaigns" value={k.activeCampaigns} icon={<Briefcase className="h-3.5 w-3.5" />} />
        <MiniStat label="Total Clients" value={k.totalClients} icon={<Users className="h-3.5 w-3.5" />} />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Revenue vs Expenses Trend */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">12-Month Revenue vs Expenses (Accrual)</CardTitle></CardHeader>
          <CardContent>
            {si.revenueTrend.some(d => d.revenue > 0 || d.expenses > 0) ? (
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={si.revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" fill="hsl(221, 83%, 53%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="profit" name="Profit" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={{ r: 2 }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : <EmptyState message="No invoice or expense data available for the last 12 months. Create invoices to see trends." />}
          </CardContent>
        </Card>

        {/* Client Concentration */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Client Revenue Concentration</CardTitle></CardHeader>
          <CardContent>
            {si.clientConcentration.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={si.clientConcentration} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}
                    label={({ name, percent }: any) => `${(name as string).slice(0, 12)} ${(percent * 100).toFixed(0)}%`}>
                    {si.clientConcentration.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyState message="No client revenue data available. Invoices or campaign bookings are needed to show concentration." />}
          </CardContent>
        </Card>
      </div>

      {/* Profit Trend */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Monthly Net Profit (Invoiced − Expenses)</CardTitle></CardHeader>
        <CardContent>
          {si.revenueTrend.some(d => d.revenue > 0 || d.expenses > 0) ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={si.revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: number) => fmt(v)} />
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

function KPICard({ title, value, icon, color, sub, onClick }: { title: string; value: string; icon: React.ReactNode; color: string; sub?: string; onClick?: () => void }) {
  return (
    <Card className={cn("transition-shadow", onClick && "cursor-pointer hover:shadow-md")} onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
        <CardTitle className="text-[11px] font-medium text-muted-foreground truncate">{title}</CardTitle>
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

function MiniStat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <span className="text-muted-foreground">{icon}</span>
      <div>
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-lg font-bold">{value}</p>
      </div>
    </div>
  );
}
