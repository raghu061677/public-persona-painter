import { useNavigate } from "react-router-dom";
import { useStrategicIntelligence } from "@/hooks/useStrategicIntelligence";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  AlertTriangle, RefreshCw, Shield, Building2, TrendingUp,
  Users, BarChart3, FileDown, Target, ArrowUpRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from "recharts";
import { exportListExcel } from "@/utils/exports/excel/exportListExcel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useState } from "react";

const fmt = (v: number) => `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const COLORS = ["hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)", "hsl(221, 83%, 53%)", "hsl(262, 83%, 58%)"];
const RISK_COLORS = { Low: "hsl(142, 71%, 45%)", Medium: "hsl(38, 92%, 50%)", High: "hsl(0, 84%, 60%)" };

export default function ReportConcessionRisk() {
  const navigate = useNavigate();
  const si = useStrategicIntelligence();
  const [tab, setTab] = useState("concession");

  if (si.loading) {
    return (
      <div className="h-full flex flex-col space-y-6 p-6 md:p-8">
        <h1 className="text-2xl font-bold tracking-tight">Strategic Risk Monitor</h1>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-5 p-6 md:p-8 overflow-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Strategic Risk Monitor</h1>
          <p className="text-sm text-muted-foreground">Concession fee risk, client risk scoring, and asset ROI</p>
        </div>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={si.refresh}><RefreshCw className="h-4 w-4" /></Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-9">
          <TabsTrigger value="concession" className="text-xs px-4"><Building2 className="h-3.5 w-3.5 mr-1" /> Concession Risk</TabsTrigger>
          <TabsTrigger value="clientRisk" className="text-xs px-4"><Users className="h-3.5 w-3.5 mr-1" /> Client Risk</TabsTrigger>
          <TabsTrigger value="assetROI" className="text-xs px-4"><Target className="h-3.5 w-3.5 mr-1" /> Asset ROI</TabsTrigger>
        </TabsList>

        {/* Concession Risk */}
        <TabsContent value="concession" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Concession vs Revenue by City</CardTitle></CardHeader>
            <CardContent>
              {si.concessionRisk.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={Math.max(250, si.concessionRisk.length * 40)}>
                    <BarChart data={si.concessionRisk} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                      <YAxis type="category" dataKey="city" tick={{ fontSize: 11 }} width={100} />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Bar dataKey="revenue" name="Revenue" fill="hsl(221, 83%, 53%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-4 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>City</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead className="text-right">Occupancy %</TableHead>
                          <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {si.concessionRisk.map(c => (
                          <TableRow key={c.city}>
                            <TableCell className="font-medium">{c.city}</TableCell>
                            <TableCell className="text-right font-semibold">{fmt(c.revenue)}</TableCell>
                            <TableCell className="text-right">{c.occupancyPercent}%</TableCell>
                            <TableCell className="text-right">
                              <Badge variant={c.occupancyPercent >= 60 ? "default" : c.occupancyPercent >= 30 ? "secondary" : "destructive"} className="text-[10px]">
                                {c.occupancyPercent >= 60 ? "Healthy" : c.occupancyPercent >= 30 ? "Monitor" : "At Risk"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 italic">
                    💡 Concession fee input will be available in a future update. Currently showing revenue and occupancy health per city.
                  </p>
                </>
              ) : <div className="text-center text-muted-foreground py-12">No city data available</div>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Client Risk */}
        <TabsContent value="clientRisk" className="space-y-4 mt-4">
          <div className="grid gap-3 grid-cols-3">
            <KPICard title="High Risk" value={String(si.clientRiskScores.filter(c => c.riskLevel === "High").length)} color="text-red-600" icon={<AlertTriangle className="h-4 w-4" />} />
            <KPICard title="Medium Risk" value={String(si.clientRiskScores.filter(c => c.riskLevel === "Medium").length)} color="text-amber-600" icon={<Shield className="h-4 w-4" />} />
            <KPICard title="Low Risk" value={String(si.clientRiskScores.filter(c => c.riskLevel === "Low").length)} color="text-emerald-600" icon={<TrendingUp className="h-4 w-4" />} />
          </div>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Client Risk Scores (Top 20)</CardTitle>
              <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => {
                exportListExcel({
                  branding: { companyName: "GO-ADS 360°", title: "Client Risk Scores" },
                  fields: [
                    { key: "clientName", label: "Client", width: 24 },
                    { key: "riskLevel", label: "Risk", width: 10 },
                    { key: "avgDelayDays", label: "Avg Delay (days)", type: "number", width: 16 },
                    { key: "outstandingAmount", label: "Outstanding (₹)", type: "currency", width: 16 },
                    { key: "realizationPercent", label: "Realization %", type: "number", width: 14 },
                    { key: "revenueContribution", label: "Revenue %", type: "number", width: 12 },
                    { key: "paymentTrend", label: "Trend", width: 12 },
                  ],
                  rows: si.clientRiskScores,
                  fileName: "Client_Risk_Scores.xlsx",
                });
              }}>
                <FileDown className="h-3 w-3 mr-1" /> Export
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Risk</TableHead>
                      <TableHead className="text-right">Avg Delay</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                      <TableHead className="text-right">Realization</TableHead>
                      <TableHead className="text-right">Revenue %</TableHead>
                      <TableHead>Trend</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {si.clientRiskScores.map(c => (
                      <TableRow key={c.clientId}>
                        <TableCell className="font-medium max-w-[180px] truncate">{c.clientName}</TableCell>
                        <TableCell>
                          <Badge variant={c.riskLevel === "High" ? "destructive" : c.riskLevel === "Medium" ? "secondary" : "default"} className="text-[10px]">{c.riskLevel}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{c.avgDelayDays}d</TableCell>
                        <TableCell className="text-right font-semibold">{fmt(c.outstandingAmount)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={c.realizationPercent < 70 ? "destructive" : c.realizationPercent < 85 ? "secondary" : "default"} className="text-[10px]">{c.realizationPercent}%</Badge>
                        </TableCell>
                        <TableCell className="text-right">{c.revenueContribution}%</TableCell>
                        <TableCell>
                          <span className={cn("text-xs", c.paymentTrend === "worsening" ? "text-red-600" : c.paymentTrend === "improving" ? "text-emerald-600" : "text-muted-foreground")}>
                            {c.paymentTrend === "improving" ? "↑ Improving" : c.paymentTrend === "worsening" ? "↓ Worsening" : "→ Stable"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={() => navigate(`/admin/invoices?client=${encodeURIComponent(c.clientName)}&status=unpaid`)}>
                            Invoices <ArrowUpRight className="h-3 w-3 ml-0.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {si.clientRiskScores.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No client data</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Asset ROI */}
        <TabsContent value="assetROI" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Asset ROI Ranking</CardTitle>
              <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => {
                exportListExcel({
                  branding: { companyName: "GO-ADS 360°", title: "Asset ROI Ranking" },
                  fields: [
                    { key: "assetId", label: "Asset ID", width: 16 },
                    { key: "location", label: "Location", width: 28 },
                    { key: "city", label: "City", width: 14 },
                    { key: "mediaType", label: "Media Type", width: 14 },
                    { key: "revenue", label: "Revenue (₹)", type: "currency", width: 16 },
                    { key: "cost", label: "Cost (₹)", type: "currency", width: 14 },
                    { key: "profit", label: "Profit (₹)", type: "currency", width: 14 },
                    { key: "roiPercent", label: "ROI %", type: "number", width: 10 },
                    { key: "occupancyPercent", label: "Occupancy %", type: "number", width: 12 },
                  ],
                  rows: si.assetROI.slice(0, 50),
                  fileName: "Asset_ROI_Ranking.xlsx",
                });
              }}>
                <FileDown className="h-3 w-3 mr-1" /> Export Top 50
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Asset ID</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                      <TableHead className="text-right">ROI %</TableHead>
                      <TableHead className="text-right">Occ %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {si.assetROI.slice(0, 30).map((a, i) => (
                      <TableRow key={a.assetId} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/admin/media-assets/${a.assetId}`)}>
                        <TableCell className="text-muted-foreground text-sm">{i + 1}</TableCell>
                        <TableCell className="font-mono text-xs">{a.assetId}</TableCell>
                        <TableCell className="text-sm max-w-[180px] truncate">{a.location}</TableCell>
                        <TableCell className="text-sm">{a.city}</TableCell>
                        <TableCell className="text-sm">{a.mediaType}</TableCell>
                        <TableCell className="text-right">{fmt(a.revenue)}</TableCell>
                        <TableCell className="text-right text-red-600">{fmt(a.cost)}</TableCell>
                        <TableCell className={cn("text-right font-medium", a.profit >= 0 ? "text-emerald-600" : "text-red-600")}>{fmt(a.profit)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={a.roiPercent >= 50 ? "default" : a.roiPercent >= 0 ? "secondary" : "destructive"} className="text-[10px]">{a.roiPercent}%</Badge>
                        </TableCell>
                        <TableCell className="text-right">{a.occupancyPercent}%</TableCell>
                      </TableRow>
                    ))}
                    {si.assetROI.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No asset data</TableCell></TableRow>}
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

function KPICard({ title, value, icon, color }: { title: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
        <CardTitle className="text-[11px] font-medium text-muted-foreground">{title}</CardTitle>
        <span className={color}>{icon}</span>
      </CardHeader>
      <CardContent className="pb-3 px-4">
        <div className={cn("text-xl font-bold", color)}>{value}</div>
      </CardContent>
    </Card>
  );
}
