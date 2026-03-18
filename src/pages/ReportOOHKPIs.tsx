import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useExecutiveDrillDown } from "@/hooks/useExecutiveDrillDown";
import { ExecutiveSummaryBanner } from "@/components/common/ExecutiveSummaryBanner";
import { useOOHIntelligence, OOHTimeRange } from "@/hooks/useOOHIntelligence";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  CalendarIcon, RefreshCw, ArrowUpRight, BarChart3, Percent,
  DollarSign, Layers, Package, Target,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar, Cell, ComposedChart, Area,
} from "recharts";

const fmt = (v: number) => `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export default function ReportOOHKPIs() {
  const navigate = useNavigate();
  const ooh = useOOHIntelligence();

  if (ooh.loading) {
    return (
      <div className="h-full flex flex-col space-y-6 p-6 md:p-8">
        <div><h1 className="text-2xl font-bold tracking-tight">OOH KPIs</h1></div>
        <div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Card key={i}><CardContent className="pt-6"><Skeleton className="h-8 w-32" /></CardContent></Card>)}</div>
      </div>
    );
  }

  const k = ooh.occupancyKPI;
  const fromStr = format(ooh.dateRange.from, "yyyy-MM-dd");
  const toStr = format(ooh.dateRange.to, "yyyy-MM-dd");

  return (
    <div className="h-full flex flex-col space-y-5 p-6 md:p-8 overflow-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 sticky top-0 z-10 bg-background pb-2 -mt-2 pt-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">OOH KPIs</h1>
          <p className="text-sm text-muted-foreground">Occupancy vs Revenue dashboard</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <TimeToggle value={ooh.timeRange} onChange={ooh.setTimeRange} customRange={ooh.customRange} onCustomChange={ooh.setCustomRange} />
          <Select value={ooh.cityFilter || "all"} onValueChange={v => ooh.setCityFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="All Cities" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {ooh.cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={ooh.mediaTypeFilter || "all"} onValueChange={v => ooh.setMediaTypeFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="All Types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {ooh.mediaTypes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={ooh.refresh}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* KPI Widgets */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <KPICard title="Total Assets" value={k.totalAssets.toString()} icon={<Layers className="h-4 w-4" />} color="text-blue-600" />
        <KPICard title="Booked Assets" value={k.bookedAssets.toString()} icon={<Package className="h-4 w-4" />} color="text-emerald-600"
          onClick={() => navigate(`/admin/reports/booked-media?from=${fromStr}&to=${toStr}`)} sub="Click to view" />
        <KPICard title="Occupancy %" value={`${k.occupancyPercent.toFixed(1)}%`} icon={<Percent className="h-4 w-4" />}
          color={k.occupancyPercent >= 70 ? "text-emerald-600" : k.occupancyPercent >= 40 ? "text-orange-600" : "text-red-600"} />
        <KPICard title="Total Revenue" value={fmt(k.totalRevenue)} icon={<DollarSign className="h-4 w-4" />} color="text-blue-600"
          onClick={() => navigate(`/admin/reports/financial?from=${fromStr}&to=${toStr}`)} sub="Click to view" />
        <KPICard title="Revenue / Asset" value={fmt(k.revenuePerAsset)} icon={<Target className="h-4 w-4" />} color="text-sky-600" />
        <KPICard title="Revenue / Sqft" value={fmt(k.revenuePerSqft)} icon={<BarChart3 className="h-4 w-4" />} color="text-purple-600" />
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Occupancy % by Month</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={ooh.occupancyTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                <Line type="monotone" dataKey="occupancy" stroke="hsl(221, 83%, 53%)" strokeWidth={2} dot={{ r: 3 }} name="Occupancy %" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Revenue by Month</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={ooh.occupancyTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="revenue" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Combined */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Occupancy vs Revenue (12-Month Trend)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={ooh.occupancyTrend}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} domain={[0, 100]} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(v: number, name: string) => name === "Occupancy %" ? `${v.toFixed(1)}%` : fmt(v)} />
              <Legend />
              <Area yAxisId="right" type="monotone" dataKey="revenue" fill="hsl(142, 71%, 45%)" fillOpacity={0.15} stroke="hsl(142, 71%, 45%)" strokeWidth={2} name="Revenue" />
              <Line yAxisId="left" type="monotone" dataKey="occupancy" stroke="hsl(221, 83%, 53%)" strokeWidth={2} dot={{ r: 3 }} name="Occupancy %" />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function KPICard({ title, value, icon, color, sub, onClick }: { title: string; value: string; icon: React.ReactNode; color: string; sub?: string; onClick?: () => void }) {
  return (
    <Card className={cn("transition-shadow", onClick && "cursor-pointer hover:shadow-md")} onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
        <CardTitle className="text-[11px] font-medium text-muted-foreground">{title}</CardTitle>
        <span className={color}>{icon}</span>
      </CardHeader>
      <CardContent className="pb-3 px-4">
        <div className={cn("text-lg font-bold", color)}>{value}</div>
        {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
        {onClick && <div className="flex items-center text-[10px] text-muted-foreground mt-1"><ArrowUpRight className="h-3 w-3 mr-0.5" />View details</div>}
      </CardContent>
    </Card>
  );
}

function TimeToggle({ value, onChange, customRange, onCustomChange }: {
  value: OOHTimeRange; onChange: (v: OOHTimeRange) => void;
  customRange: { from: Date; to: Date }; onCustomChange: (r: { from: Date; to: Date }) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Tabs value={value} onValueChange={v => onChange(v as OOHTimeRange)}>
        <TabsList className="h-8">
          <TabsTrigger value="monthly" className="text-xs px-3 h-7">Monthly</TabsTrigger>
          <TabsTrigger value="quarterly" className="text-xs px-3 h-7">Quarterly</TabsTrigger>
          <TabsTrigger value="yearly" className="text-xs px-3 h-7">Yearly</TabsTrigger>
          <TabsTrigger value="custom" className="text-xs px-3 h-7">Custom</TabsTrigger>
        </TabsList>
      </Tabs>
      {value === "custom" && (
        <div className="flex gap-1">
          <Popover>
            <PopoverTrigger asChild><Button variant="outline" size="sm" className="text-xs h-8"><CalendarIcon className="h-3 w-3 mr-1" />{format(customRange.from, "dd MMM")}</Button></PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={customRange.from} onSelect={d => d && onCustomChange({ ...customRange, from: d })} className="p-3 pointer-events-auto" /></PopoverContent>
          </Popover>
          <span className="text-xs self-center text-muted-foreground">→</span>
          <Popover>
            <PopoverTrigger asChild><Button variant="outline" size="sm" className="text-xs h-8"><CalendarIcon className="h-3 w-3 mr-1" />{format(customRange.to, "dd MMM")}</Button></PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={customRange.to} onSelect={d => d && onCustomChange({ ...customRange, to: d })} className="p-3 pointer-events-auto" /></PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}
