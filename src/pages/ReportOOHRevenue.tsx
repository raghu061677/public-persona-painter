import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOOHIntelligence, OOHTimeRange } from "@/hooks/useOOHIntelligence";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Building2, CalendarIcon, RefreshCw, MapPin, Tv2, ArrowUpRight, FileDown,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { exportListExcel } from "@/utils/exports/excel/exportListExcel";

const fmt = (v: number) => `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const COLORS = ["hsl(221, 83%, 53%)", "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)", "hsl(262, 83%, 58%)", "hsl(199, 89%, 48%)", "hsl(25, 95%, 53%)", "hsl(330, 81%, 60%)"];

export default function ReportOOHRevenue() {
  const navigate = useNavigate();
  const ooh = useOOHIntelligence();
  const [tab, setTab] = useState("city");

  if (ooh.loading) {
    return (
      <div className="h-full flex flex-col space-y-6 p-6 md:p-8">
        <div><h1 className="text-2xl font-bold tracking-tight">OOH Revenue Insights</h1></div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const fromStr = format(ooh.dateRange.from, "yyyy-MM-dd");
  const toStr = format(ooh.dateRange.to, "yyyy-MM-dd");

  return (
    <div className="h-full flex flex-col space-y-5 p-6 md:p-8 overflow-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 sticky top-0 z-10 bg-background pb-2 -mt-2 pt-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">OOH Revenue Insights</h1>
          <p className="text-sm text-muted-foreground">City / Area / Media Type / Top Locations</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <TimeToggle value={ooh.timeRange} onChange={ooh.setTimeRange} customRange={ooh.customRange} onCustomChange={ooh.setCustomRange} />
          <Select value={ooh.statusFilter || "all"} onValueChange={v => ooh.setStatusFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {["Running","Completed","Upcoming"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={ooh.refresh}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-9">
          <TabsTrigger value="city" className="text-xs px-4"><Building2 className="h-3.5 w-3.5 mr-1" /> City-wise</TabsTrigger>
          <TabsTrigger value="area" className="text-xs px-4"><MapPin className="h-3.5 w-3.5 mr-1" /> Area-wise</TabsTrigger>
          <TabsTrigger value="media" className="text-xs px-4"><Tv2 className="h-3.5 w-3.5 mr-1" /> Media Type</TabsTrigger>
          <TabsTrigger value="locations" className="text-xs px-4"><MapPin className="h-3.5 w-3.5 mr-1" /> Top Locations</TabsTrigger>
        </TabsList>

        {/* City */}
        <TabsContent value="city" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">Revenue by City</CardTitle>
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => {
                  exportListExcel({
                    branding: { companyName: "GO-ADS 360°", title: "City-wise Revenue" },
                    fields: [
                      { key: "city", label: "City", width: 20 },
                      { key: "revenue", label: "Revenue (₹)", type: "currency", width: 16 },
                      { key: "assetCount", label: "Assets", type: "number", width: 10 },
                      { key: "avgRevenuePerAsset", label: "Avg/Asset (₹)", type: "currency", width: 16 },
                      { key: "avgRevenuePerSqft", label: "Avg/Sqft (₹)", type: "currency", width: 14 },
                    ],
                    rows: ooh.cityRevenue,
                    fileName: `City_Revenue_${fromStr}.xlsx`,
                  });
                }}>
                  <FileDown className="h-3 w-3 mr-1" /> Export
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>City</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Assets</TableHead>
                      <TableHead className="text-right">Avg/Asset</TableHead>
                      <TableHead className="text-right">Avg/Sqft</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ooh.cityRevenue.map(c => (
                      <TableRow key={c.city} className="cursor-pointer hover:bg-muted/50" onClick={() => ooh.setCityFilter(c.city)}>
                        <TableCell className="font-medium">{c.city}</TableCell>
                        <TableCell className="text-right font-semibold">{fmt(c.revenue)}</TableCell>
                        <TableCell className="text-right">{c.assetCount}</TableCell>
                        <TableCell className="text-right">{fmt(c.avgRevenuePerAsset)}</TableCell>
                        <TableCell className="text-right">{fmt(c.avgRevenuePerSqft)}</TableCell>
                      </TableRow>
                    ))}
                    {ooh.cityRevenue.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">City Revenue Chart</CardTitle></CardHeader>
              <CardContent>
                {ooh.cityRevenue.length > 0 ? (
                  <ResponsiveContainer width="100%" height={Math.max(250, ooh.cityRevenue.length * 35)}>
                    <BarChart data={ooh.cityRevenue} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                      <YAxis type="category" dataKey="city" tick={{ fontSize: 11 }} width={100} />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Bar dataKey="revenue" fill="hsl(221, 83%, 53%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="text-center text-muted-foreground py-12">No data</div>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Area */}
        <TabsContent value="area" className="space-y-4 mt-4">
          <div className="flex gap-2 items-center mb-2">
            <Select value={ooh.cityFilter || "all"} onValueChange={v => ooh.setCityFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Filter City" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {ooh.cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Area-wise Revenue</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Area</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Assets</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ooh.areaRevenue.map((a, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{a.area}</TableCell>
                        <TableCell className="text-sm">{a.city}</TableCell>
                        <TableCell className="text-right font-semibold">{fmt(a.revenue)}</TableCell>
                        <TableCell className="text-right">{a.assetCount}</TableCell>
                      </TableRow>
                    ))}
                    {ooh.areaRevenue.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Media Type */}
        <TabsContent value="media" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Revenue by Media Type</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Media Type</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Assets</TableHead>
                      <TableHead className="text-right">Avg/Asset</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ooh.mediaTypeRevenue.map(m => (
                      <TableRow key={m.mediaType}>
                        <TableCell className="font-medium">{m.mediaType}</TableCell>
                        <TableCell className="text-right font-semibold">{fmt(m.revenue)}</TableCell>
                        <TableCell className="text-right">{m.assetCount}</TableCell>
                        <TableCell className="text-right">{fmt(m.avgRevenuePerAsset)}</TableCell>
                      </TableRow>
                    ))}
                    {ooh.mediaTypeRevenue.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Media Type Distribution</CardTitle></CardHeader>
              <CardContent>
                {ooh.mediaTypeRevenue.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={ooh.mediaTypeRevenue.map(m => ({ ...m }))} dataKey="revenue" nameKey="mediaType" cx="50%" cy="50%" outerRadius={100}
                        label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {ooh.mediaTypeRevenue.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => fmt(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="text-center text-muted-foreground py-12">No data</div>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Top Locations */}
        <TabsContent value="locations" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Top 10 Locations by Revenue</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Area</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Bookings</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ooh.topLocations.map((l, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium max-w-[200px] truncate">{l.location}</TableCell>
                        <TableCell className="text-sm">{l.area}</TableCell>
                        <TableCell className="text-sm">{l.city}</TableCell>
                        <TableCell className="text-right font-semibold">{fmt(l.revenue)}</TableCell>
                        <TableCell className="text-right">{l.bookings}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="link" size="sm" className="text-xs h-auto p-0"
                            onClick={() => navigate(`/admin/reports/booked-media?area=${encodeURIComponent(l.area)}&from=${fromStr}&to=${toStr}`)}>
                            Booked <ArrowUpRight className="h-3 w-3 ml-0.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {ooh.topLocations.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>}
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
