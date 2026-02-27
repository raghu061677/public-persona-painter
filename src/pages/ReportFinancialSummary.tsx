import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCFODashboard, TimeRange } from "@/hooks/useCFODashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  DollarSign, TrendingUp, TrendingDown, Percent, Receipt,
  CalendarIcon, ArrowUpRight, AlertTriangle, BarChart3,
  PieChart as PieChartIcon, Building2, Tv2, RefreshCw,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
} from "recharts";

const fmt = (v: number) => `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const COLORS = [
  "hsl(221, 83%, 53%)", "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)", "hsl(262, 83%, 58%)", "hsl(199, 89%, 48%)",
  "hsl(25, 95%, 53%)", "hsl(330, 81%, 60%)",
];

export default function ReportFinancialSummary() {
  const navigate = useNavigate();
  const dash = useCFODashboard();

  if (dash.loading) {
    return (
      <div className="h-full flex flex-col space-y-6 p-6 md:p-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Dashboard</h1>
          <p className="text-muted-foreground">CFO View • Comprehensive financial analytics</p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}><CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-32" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  const { kpi } = dash;

  return (
    <div className="h-full flex flex-col space-y-6 p-6 md:p-8 overflow-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Dashboard</h1>
          <p className="text-muted-foreground">CFO View • Comprehensive financial analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <TimeToggle value={dash.timeRange} onChange={dash.setTimeRange} customRange={dash.customRange} onCustomChange={dash.setCustomRange} />
          <Button variant="outline" size="icon" onClick={dash.refresh}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* KPI Widgets */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
        <KPICard title="Total Invoiced" value={fmt(kpi.totalInvoiced)} icon={<Receipt className="h-4 w-4" />}
          color="text-blue-600" onClick={() => navigate("/admin/invoices")} />
        <KPICard title="Total Received" value={fmt(kpi.totalReceived)} icon={<TrendingUp className="h-4 w-4" />}
          color="text-emerald-600" onClick={() => navigate("/admin/invoices?status=Paid")} />
        <KPICard title="Outstanding" value={fmt(kpi.outstanding)} icon={<AlertTriangle className="h-4 w-4" />}
          color="text-orange-600" onClick={() => navigate("/admin/invoices?status=Overdue")} />
        <KPICard title="Collection %" value={`${kpi.collectionRate.toFixed(1)}%`} icon={<Percent className="h-4 w-4" />}
          color="text-sky-600" />
        <KPICard title="Total Expenses" value={fmt(kpi.totalExpenses)} icon={<TrendingDown className="h-4 w-4" />}
          color="text-red-600" onClick={() => navigate("/admin/expenses")} />
        <KPICard title="Net Profit" value={fmt(kpi.netProfit)} icon={<DollarSign className="h-4 w-4" />}
          color={kpi.netProfit >= 0 ? "text-emerald-600" : "text-red-600"} />
        <KPICard title="Profit Margin" value={`${kpi.profitMargin.toFixed(1)}%`} icon={<Percent className="h-4 w-4" />}
          color={kpi.profitMargin >= 0 ? "text-emerald-600" : "text-red-600"} />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Revenue vs Expense */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" /> Revenue vs Expenses (Monthly)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dash.trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Trend Line */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" /> Monthly Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dash.trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Line type="monotone" dataKey="revenue" stroke="hsl(221, 83%, 53%)" strokeWidth={2} dot={{ r: 3 }} name="Revenue" />
                <Line type="monotone" dataKey="expenses" stroke="hsl(0, 84%, 60%)" strokeWidth={2} dot={{ r: 3 }} name="Expenses" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Aging + Media Type Pie */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Aging */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" /> Accounts Receivable Aging
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {dash.agingBuckets.map((b, i) => (
                <div key={i} className={cn("rounded-lg p-3 text-center",
                  i === 0 ? "bg-emerald-50 dark:bg-emerald-950/30" :
                  i === 1 ? "bg-yellow-50 dark:bg-yellow-950/30" :
                  i === 2 ? "bg-orange-50 dark:bg-orange-950/30" :
                  "bg-red-50 dark:bg-red-950/30"
                )}>
                  <div className="text-xs text-muted-foreground font-medium">{b.label}</div>
                  <div className="text-lg font-bold mt-1">{fmt(b.amount)}</div>
                  <div className="text-xs text-muted-foreground">{b.count} invoices</div>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={dash.agingBuckets}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="amount" name="Outstanding" radius={[4, 4, 0, 0]}>
                  {dash.agingBuckets.map((_, i) => (
                    <Cell key={i} fill={["hsl(142, 71%, 45%)", "hsl(48, 96%, 53%)", "hsl(25, 95%, 53%)", "hsl(0, 84%, 60%)"][i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Media Type Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Tv2 className="h-4 w-4 text-muted-foreground" /> Revenue by Media Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={dash.mediaTypeRevenue.map(m => ({ ...m }))} dataKey="revenue" nameKey="mediaType" cx="50%" cy="50%"
                  outerRadius={90} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ strokeWidth: 1 }}>
                  {dash.mediaTypeRevenue.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Month-wise Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Month-wise Financial Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Invoiced</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Net Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dash.monthlyRows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.month}</TableCell>
                    <TableCell className="text-right">{fmt(r.invoiced)}</TableCell>
                    <TableCell className="text-right text-emerald-600">{fmt(r.received)}</TableCell>
                    <TableCell className="text-right text-orange-600">{fmt(r.outstanding)}</TableCell>
                    <TableCell className="text-right text-red-600">{fmt(r.expenses)}</TableCell>
                    <TableCell className={cn("text-right font-medium", r.netProfit >= 0 ? "text-emerald-600" : "text-red-600")}>
                      {fmt(r.netProfit)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Quarterly + Yearly */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Quarterly Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quarter</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dash.quarterlyRows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.quarter}</TableCell>
                    <TableCell className="text-right">{fmt(r.revenue)}</TableCell>
                    <TableCell className="text-right text-red-600">{fmt(r.expenses)}</TableCell>
                    <TableCell className={cn("text-right font-medium", r.profit >= 0 ? "text-emerald-600" : "text-red-600")}>{fmt(r.profit)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Yearly Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-right">Growth %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dash.yearlyRows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.year}</TableCell>
                    <TableCell className="text-right">{fmt(r.revenue)}</TableCell>
                    <TableCell className="text-right text-red-600">{fmt(r.expenses)}</TableCell>
                    <TableCell className={cn("text-right font-medium", r.profit >= 0 ? "text-emerald-600" : "text-red-600")}>{fmt(r.profit)}</TableCell>
                    <TableCell className="text-right">
                      {i === 0 ? "—" : <Badge variant={r.growth >= 0 ? "default" : "destructive"}>{r.growth >= 0 ? "+" : ""}{r.growth.toFixed(1)}%</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Profitability */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" /> Campaign Profitability
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Printing</TableHead>
                  <TableHead className="text-right">Mounting</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead className="text-right">Margin %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dash.campaignProfitability.map(c => (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/admin/campaigns/${c.id}`)}>
                    <TableCell className="font-medium max-w-[200px] truncate">{c.name}</TableCell>
                    <TableCell>{c.client}</TableCell>
                    <TableCell className="text-right">{fmt(c.revenue)}</TableCell>
                    <TableCell className="text-right text-red-600">{fmt(c.printingCost)}</TableCell>
                    <TableCell className="text-right text-red-600">{fmt(c.mountingCost)}</TableCell>
                    <TableCell className={cn("text-right font-medium", c.net >= 0 ? "text-emerald-600" : "text-red-600")}>{fmt(c.net)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={c.margin >= 20 ? "default" : c.margin >= 0 ? "secondary" : "destructive"}>
                        {c.margin.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {dash.campaignProfitability.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No campaign data</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* City-wise Revenue */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" /> City-wise Revenue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>City</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dash.cityRevenue.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{c.city}</TableCell>
                    <TableCell className="text-right">{fmt(c.revenue)}</TableCell>
                    <TableCell className="text-right text-red-600">{fmt(c.expenses)}</TableCell>
                    <TableCell className={cn("text-right font-medium", c.profit >= 0 ? "text-emerald-600" : "text-red-600")}>{fmt(c.profit)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ResponsiveContainer width="100%" height={Math.max(200, dash.cityRevenue.length * 40)}>
              <BarChart data={dash.cityRevenue} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                <YAxis type="category" dataKey="city" tick={{ fontSize: 11 }} width={100} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="revenue" fill="hsl(221, 83%, 53%)" radius={[0, 4, 4, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Sub-components ──

function KPICard({ title, value, icon, color, onClick }: {
  title: string; value: string; icon: React.ReactNode; color: string; onClick?: () => void;
}) {
  return (
    <Card className={cn("transition-shadow", onClick && "cursor-pointer hover:shadow-md")} onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
        <span className={color}>{icon}</span>
      </CardHeader>
      <CardContent className="pb-3 px-4">
        <div className={cn("text-xl font-bold", color)}>{value}</div>
        {onClick && <div className="flex items-center text-[10px] text-muted-foreground mt-1"><ArrowUpRight className="h-3 w-3 mr-0.5" />View details</div>}
      </CardContent>
    </Card>
  );
}

function TimeToggle({ value, onChange, customRange, onCustomChange }: {
  value: TimeRange; onChange: (v: TimeRange) => void;
  customRange: { from: Date; to: Date }; onCustomChange: (r: { from: Date; to: Date }) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Tabs value={value} onValueChange={v => onChange(v as TimeRange)}>
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
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs h-8">
                <CalendarIcon className="h-3 w-3 mr-1" />{format(customRange.from, "dd MMM")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={customRange.from}
                onSelect={d => d && onCustomChange({ ...customRange, from: d })}
                className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          <span className="text-xs self-center text-muted-foreground">→</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs h-8">
                <CalendarIcon className="h-3 w-3 mr-1" />{format(customRange.to, "dd MMM")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={customRange.to}
                onSelect={d => d && onCustomChange({ ...customRange, to: d })}
                className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}
