import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCFODashboard, TimeRange } from "@/hooks/useCFODashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  DollarSign, TrendingUp, TrendingDown, Percent, Receipt,
  CalendarIcon, ArrowUpRight, AlertTriangle, BarChart3,
  Tv2, Building2, RefreshCw, Wallet,
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
  const [activeTab, setActiveTab] = useState("overview");

  if (dash.loading) {
    return (
      <div className="h-full flex flex-col space-y-6 p-6 md:p-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Dashboard</h1>
          <p className="text-muted-foreground">CFO View • Comprehensive financial analytics</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-32" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  const { kpi, dateRange } = dash;
  const fromStr = format(dateRange.from, "yyyy-MM-dd");
  const toStr = format(dateRange.to, "yyyy-MM-dd");

  return (
    <div className="h-full flex flex-col space-y-5 p-6 md:p-8 overflow-auto">
      {/* ── Sticky Header + Time Filter ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 sticky top-0 z-10 bg-background pb-2 -mt-2 pt-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financial Dashboard</h1>
          <p className="text-sm text-muted-foreground">CFO View • Phase 1</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <TimeToggle value={dash.timeRange} onChange={dash.setTimeRange} customRange={dash.customRange} onCustomChange={dash.setCustomRange} />
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={dash.refresh} title="Refresh"><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* ── KPI Widget Row ── */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <KPICard title="Total Invoiced" value={fmt(kpi.totalInvoiced)} icon={<Receipt className="h-4 w-4" />}
          color="text-blue-600" sub={`${kpi.invoiceCount} invoices`}
          onClick={() => navigate(`/admin/invoices?from=${fromStr}&to=${toStr}`)} />
        <KPICard title="Total Received" value={fmt(kpi.totalReceived)} icon={<TrendingUp className="h-4 w-4" />}
          color="text-emerald-600" sub={`${kpi.paidCount} paid`}
          onClick={() => navigate(`/admin/invoices?status=Paid&from=${fromStr}&to=${toStr}`)} />
        <KPICard title="Outstanding" value={fmt(kpi.outstanding)} icon={<AlertTriangle className="h-4 w-4" />}
          color="text-orange-600" sub={`${kpi.overdueCount} overdue`}
          onClick={() => navigate(`/admin/invoices?status=Overdue&from=${fromStr}&to=${toStr}`)} />
        <KPICard title="Collection %" value={`${kpi.collectionRate.toFixed(1)}%`} icon={<Percent className="h-4 w-4" />}
          color="text-sky-600" />
        <KPICard title="Total Expenses" value={fmt(kpi.totalExpenses)} icon={<TrendingDown className="h-4 w-4" />}
          color="text-red-600"
          onClick={() => navigate(`/admin/expenses?from=${fromStr}&to=${toStr}`)} />
        <KPICard title="Net Cash" value={fmt(kpi.totalReceived - kpi.totalExpenses)} icon={<Wallet className="h-4 w-4" />}
          color={(kpi.totalReceived - kpi.totalExpenses) >= 0 ? "text-emerald-600" : "text-red-600"}
          sub="Received − Expenses" />
      </div>

      {/* ── Tab Navigation ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-9">
          <TabsTrigger value="overview" className="text-xs px-4">Overview</TabsTrigger>
          <TabsTrigger value="aging" className="text-xs px-4">Aging</TabsTrigger>
          <TabsTrigger value="summary" className="text-xs px-4">Monthly Table</TabsTrigger>
          <TabsTrigger value="profitability" className="text-xs px-4">Profitability</TabsTrigger>
        </TabsList>

        {/* ── TAB: Overview ── */}
        <TabsContent value="overview" className="space-y-5 mt-4">
          {/* Charts Row */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" /> Revenue vs Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={dash.trendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

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

          {/* Media Type Pie + Aging Preview */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Tv2 className="h-4 w-4 text-muted-foreground" /> Revenue by Media Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dash.mediaTypeRevenue.length > 0 ? (
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
                ) : (
                  <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">No media type data</div>
                )}
              </CardContent>
            </Card>

            {/* Aging mini preview */}
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" /> Outstanding Aging
                </CardTitle>
                <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={() => setActiveTab("aging")}>
                  View Details <ArrowUpRight className="h-3 w-3 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {dash.agingBuckets.map((b, i) => (
                    <div key={i} className={cn("rounded-lg p-3 text-center",
                      i === 0 ? "bg-emerald-50 dark:bg-emerald-950/30" :
                      i === 1 ? "bg-yellow-50 dark:bg-yellow-950/30" :
                      i === 2 ? "bg-orange-50 dark:bg-orange-950/30" :
                      "bg-red-50 dark:bg-red-950/30"
                    )}>
                      <div className="text-[10px] text-muted-foreground font-medium">{b.label}</div>
                      <div className="text-base font-bold mt-1">{fmt(b.amount)}</div>
                      <div className="text-[10px] text-muted-foreground">{b.count} inv</div>
                    </div>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={140}>
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
          </div>

          {/* Quarterly + Yearly */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Quarterly Summary</CardTitle></CardHeader>
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
                    {dash.quarterlyRows.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No data</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Yearly Summary</CardTitle></CardHeader>
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
                    {dash.yearlyRows.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No data</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── TAB: Aging ── */}
        <TabsContent value="aging" className="space-y-5 mt-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" /> Accounts Receivable Aging
              </CardTitle>
              <Button variant="outline" size="sm" className="text-xs h-7"
                onClick={() => navigate("/admin/invoices?status=Overdue")}>
                View Unpaid Invoices <ArrowUpRight className="h-3 w-3 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {dash.agingBuckets.map((b, i) => (
                  <div key={i} className={cn("rounded-xl p-4 text-center border",
                    i === 0 ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800" :
                    i === 1 ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800" :
                    i === 2 ? "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800" :
                    "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800"
                  )}>
                    <div className="text-xs text-muted-foreground font-medium">{b.label}</div>
                    <div className="text-2xl font-bold mt-2">{fmt(b.amount)}</div>
                    <div className="text-xs text-muted-foreground mt-1">{b.count} invoice{b.count !== 1 ? 's' : ''}</div>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={dash.agingBuckets}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
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
        </TabsContent>

        {/* ── TAB: Monthly Table ── */}
        <TabsContent value="summary" className="space-y-5 mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Month-wise Financial Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Invoiced</TableHead>
                      <TableHead className="text-right">Received</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                      <TableHead className="text-right">Expenses</TableHead>
                      <TableHead className="text-right">Net Cash</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dash.monthlyRows.map((r, i) => (
                      <TableRow key={i} className="cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          // Parse month label like "Feb 2026" to get date range
                          const d = new Date(r.month);
                          if (!isNaN(d.getTime())) {
                            const mFrom = format(d, "yyyy-MM-01");
                            const mTo = format(new Date(d.getFullYear(), d.getMonth() + 1, 0), "yyyy-MM-dd");
                            navigate(`/admin/invoices?from=${mFrom}&to=${mTo}`);
                          }
                        }}>
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
                    {dash.monthlyRows.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No data for selected period</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB: Profitability ── */}
        <TabsContent value="profitability" className="space-y-5 mt-4">
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
                    {dash.cityRevenue.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No data</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
                {dash.cityRevenue.length > 0 && (
                  <ResponsiveContainer width="100%" height={Math.max(200, dash.cityRevenue.length * 40)}>
                    <BarChart data={dash.cityRevenue} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                      <YAxis type="category" dataKey="city" tick={{ fontSize: 11 }} width={100} />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Bar dataKey="revenue" fill="hsl(221, 83%, 53%)" radius={[0, 4, 4, 0]} name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Sub-components ──

function KPICard({ title, value, icon, color, sub, onClick }: {
  title: string; value: string; icon: React.ReactNode; color: string; sub?: string; onClick?: () => void;
}) {
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
  value: TimeRange; onChange: (v: TimeRange) => void;
  customRange: { from: Date; to: Date }; onCustomChange: (r: { from: Date; to: Date }) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
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
