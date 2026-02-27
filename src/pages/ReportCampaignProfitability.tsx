import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOOHIntelligence, OOHTimeRange } from "@/hooks/useOOHIntelligence";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  BarChart3, CalendarIcon, RefreshCw, ArrowUpRight, TrendingUp,
  FileDown, Search, Filter, DollarSign, Percent, Target,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { exportListExcel } from "@/utils/exports/excel/exportListExcel";

const fmt = (v: number) => `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const COLORS = ["hsl(221, 83%, 53%)", "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)", "hsl(262, 83%, 58%)", "hsl(199, 89%, 48%)", "hsl(25, 95%, 53%)", "hsl(330, 81%, 60%)"];

export default function ReportCampaignProfitability() {
  const navigate = useNavigate();
  const ooh = useOOHIntelligence();
  const [activeTab, setActiveTab] = useState("profitability");
  const [search, setSearch] = useState("");

  if (ooh.loading) {
    return (
      <div className="h-full flex flex-col space-y-6 p-6 md:p-8">
        <div><h1 className="text-2xl font-bold tracking-tight">Campaign Profitability</h1></div>
        <div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Card key={i}><CardContent className="pt-6"><Skeleton className="h-8 w-32" /></CardContent></Card>)}</div>
      </div>
    );
  }

  const data = ooh.campaignProfitability.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.clientName.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = data.reduce((s, c) => s + c.revenue, 0);
  const totalCost = data.reduce((s, c) => s + c.directCost, 0);
  const totalProfit = data.reduce((s, c) => s + c.netProfit, 0);
  const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const top10 = data.slice(0, 10);
  const marginDist = [
    { label: "< 0%", count: data.filter(c => c.margin < 0).length },
    { label: "0–20%", count: data.filter(c => c.margin >= 0 && c.margin < 20).length },
    { label: "20–40%", count: data.filter(c => c.margin >= 20 && c.margin < 40).length },
    { label: "40%+", count: data.filter(c => c.margin >= 40).length },
  ];

  const fromStr = format(ooh.dateRange.from, "yyyy-MM-dd");
  const toStr = format(ooh.dateRange.to, "yyyy-MM-dd");

  return (
    <div className="h-full flex flex-col space-y-5 p-6 md:p-8 overflow-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 sticky top-0 z-10 bg-background pb-2 -mt-2 pt-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaign Profitability</h1>
          <p className="text-sm text-muted-foreground">Revenue vs direct costs per campaign</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <TimeToggle value={ooh.timeRange} onChange={ooh.setTimeRange} customRange={ooh.customRange} onCustomChange={ooh.setCustomRange} />
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={ooh.refresh}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search campaigns..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 pl-8 w-56 text-xs" />
        </div>
        <Select value={ooh.cityFilter || "all"} onValueChange={v => ooh.setCityFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="All Cities" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cities</SelectItem>
            {ooh.cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={ooh.statusFilter || "all"} onValueChange={v => ooh.setStatusFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {["Draft","Upcoming","Running","Completed"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <KPICard title="Total Revenue" value={fmt(totalRevenue)} icon={<DollarSign className="h-4 w-4" />} color="text-blue-600" sub={`${data.length} campaigns`} />
        <KPICard title="Total Direct Cost" value={fmt(totalCost)} icon={<TrendingUp className="h-4 w-4" />} color="text-red-600" />
        <KPICard title="Net Profit" value={fmt(totalProfit)} icon={<Target className="h-4 w-4" />} color={totalProfit >= 0 ? "text-emerald-600" : "text-red-600"} />
        <KPICard title="Avg Margin" value={`${avgMargin.toFixed(1)}%`} icon={<Percent className="h-4 w-4" />} color={avgMargin >= 20 ? "text-emerald-600" : "text-orange-600"} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-9">
          <TabsTrigger value="profitability" className="text-xs px-4">Table</TabsTrigger>
          <TabsTrigger value="charts" className="text-xs px-4">Charts</TabsTrigger>
          <TabsTrigger value="realization" className="text-xs px-4">Rate Realization</TabsTrigger>
        </TabsList>

        <TabsContent value="profitability" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => {
              exportListExcel({
                branding: { companyName: "GO-ADS 360°", title: "Campaign Profitability" },
                fields: [
                  { key: "name", label: "Campaign", width: 28 },
                  { key: "clientName", label: "Client", width: 22 },
                  { key: "startDate", label: "Start", width: 14 },
                  { key: "endDate", label: "End", width: 14 },
                  { key: "assetCount", label: "Assets", type: "number", width: 10 },
                  { key: "revenue", label: "Revenue (₹)", type: "currency", width: 16 },
                  { key: "printingCost", label: "Printing (₹)", type: "currency", width: 14 },
                  { key: "mountingCost", label: "Mounting (₹)", type: "currency", width: 14 },
                  { key: "netProfit", label: "Net Profit (₹)", type: "currency", width: 16 },
                  { key: "margin", label: "Margin %", type: "number", width: 12, value: r => Number(r.margin.toFixed(1)) },
                  { key: "status", label: "Status", width: 12 },
                ],
                rows: data,
                fileName: `Campaign_Profitability_${fromStr}.xlsx`,
              });
            }}>
              <FileDown className="h-3 w-3 mr-1" /> Export Excel
            </Button>
          </div>
          <Card>
            <CardContent className="pt-4">
              <div className="overflow-auto max-h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>End</TableHead>
                      <TableHead className="text-right">Assets</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Printing</TableHead>
                      <TableHead className="text-right">Mounting</TableHead>
                      <TableHead className="text-right">Net Profit</TableHead>
                      <TableHead className="text-right">Margin</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map(c => (
                      <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/admin/campaigns/${c.id}`)}>
                        <TableCell className="font-medium max-w-[180px] truncate">{c.name}</TableCell>
                        <TableCell className="text-sm">{c.clientName}</TableCell>
                        <TableCell className="text-xs">{c.startDate ? format(new Date(c.startDate), "dd MMM yy") : "—"}</TableCell>
                        <TableCell className="text-xs">{c.endDate ? format(new Date(c.endDate), "dd MMM yy") : "—"}</TableCell>
                        <TableCell className="text-right">{c.assetCount}</TableCell>
                        <TableCell className="text-right">{fmt(c.revenue)}</TableCell>
                        <TableCell className="text-right text-red-600">{fmt(c.printingCost)}</TableCell>
                        <TableCell className="text-right text-red-600">{fmt(c.mountingCost)}</TableCell>
                        <TableCell className={cn("text-right font-medium", c.netProfit >= 0 ? "text-emerald-600" : "text-red-600")}>{fmt(c.netProfit)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={c.margin >= 20 ? "default" : c.margin >= 0 ? "secondary" : "destructive"} className="text-[10px]">{c.margin.toFixed(1)}%</Badge>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{c.status}</Badge></TableCell>
                        <TableCell className="text-right">
                          <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={e => { e.stopPropagation(); navigate(`/admin/campaigns/${c.id}`); }}>
                            View <ArrowUpRight className="h-3 w-3 ml-0.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {data.length === 0 && <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground py-8">No campaign data</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Top 10 Campaigns by Profit</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={top10} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Bar dataKey="netProfit" name="Net Profit" radius={[0, 4, 4, 0]}>
                      {top10.map((c, i) => <Cell key={i} fill={c.netProfit >= 0 ? "hsl(142, 71%, 45%)" : "hsl(0, 84%, 60%)"} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Margin Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={marginDist.filter(m => m.count > 0)} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={100}
                      label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                      {marginDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="realization" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Rate Realization (Negotiated / Card Rate)</CardTitle>
              <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => {
                exportListExcel({
                  branding: { companyName: "GO-ADS 360°", title: "Rate Realization" },
                  fields: [
                    { key: "campaignName", label: "Campaign", width: 24 },
                    { key: "clientName", label: "Client", width: 22 },
                    { key: "assetId", label: "Asset ID", width: 16 },
                    { key: "location", label: "Location", width: 24 },
                    { key: "cardRate", label: "Card Rate (₹)", type: "currency", width: 14 },
                    { key: "negotiatedRate", label: "Negotiated (₹)", type: "currency", width: 14 },
                    { key: "realizationPercent", label: "Realization %", type: "number", width: 14, value: r => Number(r.realizationPercent.toFixed(1)) },
                  ],
                  rows: ooh.rateRealization,
                  fileName: `Rate_Realization_${fromStr}.xlsx`,
                });
              }}>
                <FileDown className="h-3 w-3 mr-1" /> Export
              </Button>
            </CardHeader>
            <CardContent>
              {/* Avg by client */}
              {ooh.clientRealization.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Avg Realization by Client (lowest first)</p>
                  <div className="flex flex-wrap gap-2">
                    {ooh.clientRealization.slice(0, 10).map(c => (
                      <Badge key={c.client} variant={c.avgRealization < 70 ? "destructive" : c.avgRealization < 90 ? "secondary" : "default"} className="text-xs">
                        {c.client}: {c.avgRealization.toFixed(0)}%
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="overflow-auto max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Asset ID</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Card Rate</TableHead>
                      <TableHead className="text-right">Negotiated</TableHead>
                      <TableHead className="text-right">Realization %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ooh.rateRealization.slice(0, 50).map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm max-w-[150px] truncate">{r.campaignName}</TableCell>
                        <TableCell className="text-sm">{r.clientName}</TableCell>
                        <TableCell className="text-xs font-mono">{r.assetId}</TableCell>
                        <TableCell className="text-sm max-w-[150px] truncate">{r.location}</TableCell>
                        <TableCell className="text-right">{fmt(r.cardRate)}</TableCell>
                        <TableCell className="text-right">{fmt(r.negotiatedRate)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={r.realizationPercent < 70 ? "destructive" : r.realizationPercent < 90 ? "secondary" : "default"} className="text-[10px]">
                            {r.realizationPercent.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {ooh.rateRealization.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No rate data available</TableCell></TableRow>}
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

function KPICard({ title, value, icon, color, sub }: { title: string; value: string; icon: React.ReactNode; color: string; sub?: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
        <CardTitle className="text-[11px] font-medium text-muted-foreground">{title}</CardTitle>
        <span className={color}>{icon}</span>
      </CardHeader>
      <CardContent className="pb-3 px-4">
        <div className={cn("text-lg font-bold", color)}>{value}</div>
        {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
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
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs h-8"><CalendarIcon className="h-3 w-3 mr-1" />{format(customRange.from, "dd MMM")}</Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={customRange.from} onSelect={d => d && onCustomChange({ ...customRange, from: d })} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          <span className="text-xs self-center text-muted-foreground">→</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs h-8"><CalendarIcon className="h-3 w-3 mr-1" />{format(customRange.to, "dd MMM")}</Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={customRange.to} onSelect={d => d && onCustomChange({ ...customRange, to: d })} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}
