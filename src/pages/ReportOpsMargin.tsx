import { useState, useMemo } from "react";
import { useOpsReportData } from "@/hooks/useOpsReportData";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Download, RotateCcw, TrendingUp, TrendingDown, IndianRupee } from "lucide-react";
import ExcelJS from "exceljs";

const downloadExcel = (buf: ArrayBuffer, name: string) => {
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
};

export default function ReportOpsMargin() {
  const { lines, isLoading } = useOpsReportData();
  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState("all");
  const [view, setView] = useState<"asset" | "campaign" | "client">("campaign");

  const months = useMemo(() => {
    const set = new Set<string>();
    lines.forEach(l => { if (l.mountingMonth) set.add(l.mountingMonth); });
    return [...set].sort().reverse();
  }, [lines]);

  const filtered = useMemo(() => {
    let result = lines;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        l.campaignName.toLowerCase().includes(q) ||
        l.clientName.toLowerCase().includes(q) ||
        l.assetId.toLowerCase().includes(q)
      );
    }
    if (monthFilter !== "all") {
      result = result.filter(l => l.mountingMonth === monthFilter);
    }
    return result;
  }, [lines, search, monthFilter]);

  // Aggregated by campaign or client
  const grouped = useMemo(() => {
    if (view === "asset") return null; // show raw lines
    const map = new Map<string, {
      key: string;
      label: string;
      subLabel?: string;
      assets: number;
      billable: number;
      payable: number;
      margin: number;
    }>();

    filtered.forEach(l => {
      const key = view === "campaign" ? l.campaignId : l.clientName;
      const label = view === "campaign" ? l.campaignName : l.clientName;
      const subLabel = view === "campaign" ? l.clientName : undefined;
      const totalBillable = l.mountingBillable + l.printingBillable + l.unmountingBillable;
      const totalPayable = l.mountingPayable + (l.printingRequired ? l.printingPayable : 0) + l.unmountingPayable;

      const existing = map.get(key);
      if (existing) {
        existing.assets += 1;
        existing.billable += totalBillable;
        existing.payable += totalPayable;
        existing.margin += totalBillable - totalPayable;
      } else {
        map.set(key, {
          key,
          label,
          subLabel,
          assets: 1,
          billable: totalBillable,
          payable: totalPayable,
          margin: totalBillable - totalPayable,
        });
      }
    });

    return [...map.values()].sort((a, b) => b.margin - a.margin);
  }, [filtered, view]);

  // Grand totals
  const totals = useMemo(() => {
    let billable = 0, payable = 0;
    filtered.forEach(l => {
      billable += l.mountingBillable + l.printingBillable + l.unmountingBillable;
      payable += l.mountingPayable + (l.printingRequired ? l.printingPayable : 0) + l.unmountingPayable;
    });
    return { billable, payable, margin: billable - payable, pct: billable > 0 ? ((billable - payable) / billable * 100) : 0 };
  }, [filtered]);

  const exportExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Ops Margin");

    if (view === "asset") {
      ws.columns = [
        { header: "Campaign", key: "campaignName", width: 25 },
        { header: "Client", key: "clientName", width: 22 },
        { header: "Asset ID", key: "assetId", width: 18 },
        { header: "City", key: "city", width: 14 },
        { header: "Mounting Billable", key: "mb", width: 16 },
        { header: "Mounting Payable", key: "mp", width: 16 },
        { header: "Mounting Margin", key: "mm", width: 16 },
        { header: "Printing Billable", key: "pb", width: 16 },
        { header: "Printing Payable", key: "pp", width: 16 },
        { header: "Printing Margin", key: "pm", width: 16 },
        { header: "Total Margin", key: "totalMargin", width: 16 },
        { header: "Mount Rate Source", key: "mountSource", width: 20 },
        { header: "Print Rate Source", key: "printSource", width: 20 },
      ];
      ws.getRow(1).font = { bold: true };
      filtered.forEach(l => ws.addRow({
        campaignName: l.campaignName, clientName: l.clientName, assetId: l.assetId, city: l.city,
        mb: l.mountingBillable, mp: l.mountingPayable, mm: l.mountingMargin,
        pb: l.printingBillable, pp: l.printingRequired ? l.printingPayable : 0, pm: l.printingMargin,
        totalMargin: l.totalMargin,
        mountSource: l.mountingRateSource,
        printSource: l.printingRateSource,
      }));
    } else {
      ws.columns = [
        { header: view === "campaign" ? "Campaign" : "Client", key: "label", width: 28 },
        { header: "Assets", key: "assets", width: 10 },
        { header: "Billable (₹)", key: "billable", width: 16 },
        { header: "Payable (₹)", key: "payable", width: 16 },
        { header: "Margin (₹)", key: "margin", width: 16 },
        { header: "Margin %", key: "pct", width: 12 },
      ];
      ws.getRow(1).font = { bold: true };
      grouped?.forEach(g => ws.addRow({ ...g, pct: g.billable > 0 ? ((g.margin / g.billable * 100).toFixed(1) + "%") : "0%" }));
    }
    ws.addRow({});
    ws.addRow({ label: "TOTAL", billable: totals.billable, payable: totals.payable, margin: totals.margin });
    const buf = await wb.xlsx.writeBuffer();
    downloadExcel(buf as ArrayBuffer, `ops-margin-${view}-${monthFilter !== "all" ? monthFilter : "all"}.xlsx`);
  };

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ops Margin Report</h1>
        <p className="text-sm text-muted-foreground mt-1">Services profit: Client charges minus vendor payables.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4">
          <div className="text-xs text-muted-foreground mb-1">Total Billable</div>
          <p className="text-xl font-bold text-primary">{fmt(totals.billable)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-xs text-muted-foreground mb-1">Total Payable</div>
          <p className="text-xl font-bold text-destructive">{fmt(totals.payable)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            {totals.margin >= 0 ? <TrendingUp className="h-3.5 w-3.5 text-primary" /> : <TrendingDown className="h-3.5 w-3.5 text-destructive" />}
            Net Margin
          </div>
          <p className={`text-2xl font-bold ${totals.margin >= 0 ? "text-primary" : "text-destructive"}`}>{fmt(totals.margin)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-xs text-muted-foreground mb-1">Margin %</div>
          <p className={`text-2xl font-bold ${totals.pct >= 0 ? "text-primary" : "text-destructive"}`}>{totals.pct.toFixed(1)}%</p>
        </CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Month" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Tabs value={view} onValueChange={v => setView(v as any)}>
          <TabsList className="h-9">
            <TabsTrigger value="campaign" className="text-xs">By Campaign</TabsTrigger>
            <TabsTrigger value="client" className="text-xs">By Client</TabsTrigger>
            <TabsTrigger value="asset" className="text-xs">By Asset</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button variant="outline" size="sm" onClick={() => { setSearch(""); setMonthFilter("all"); }}><RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset</Button>
        <Button variant="outline" size="sm" onClick={exportExcel}><Download className="h-3.5 w-3.5 mr-1" /> Export</Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>
      ) : view === "asset" ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 text-muted-foreground">
                  <th className="text-left py-3 px-4 font-medium">Campaign</th>
                  <th className="text-left py-3 px-4 font-medium">Client</th>
                  <th className="text-left py-3 px-4 font-medium">Asset</th>
                  <th className="text-left py-3 px-4 font-medium">City</th>
                  <th className="text-right py-3 px-4 font-medium">Mount ↑</th>
                  <th className="text-right py-3 px-4 font-medium">Mount ↓</th>
                  <th className="text-right py-3 px-4 font-medium">Print ↑</th>
                  <th className="text-right py-3 px-4 font-medium">Print ↓</th>
                  <th className="text-right py-3 px-4 font-medium">Margin</th>
                  <th className="text-left py-3 px-4 font-medium">Rate Source</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-12 text-muted-foreground">No data</td></tr>
                ) : filtered.map((l, i) => (
                  <tr key={i} className="border-b border-border/20 hover:bg-muted/30">
                    <td className="py-2.5 px-4 font-medium">{l.campaignName}</td>
                    <td className="py-2.5 px-4">{l.clientName}</td>
                    <td className="py-2.5 px-4 font-mono text-xs">{l.assetId}</td>
                    <td className="py-2.5 px-4">{l.city}</td>
                    <td className="py-2.5 px-4 text-right font-mono">{fmt(l.mountingBillable)}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-muted-foreground">{fmt(l.mountingPayable)}</td>
                    <td className="py-2.5 px-4 text-right font-mono">{l.printingRequired ? fmt(l.printingBillable) : "—"}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-muted-foreground">{l.printingRequired ? fmt(l.printingPayable) : "—"}</td>
                    <td className={`py-2.5 px-4 text-right font-mono font-bold ${l.totalMargin >= 0 ? "text-primary" : "text-destructive"}`}>{fmt(l.totalMargin)}</td>
                    <td className="py-2.5 px-4">
                      <Badge variant={l.mountingRateSource.includes("Override") ? "default" : "secondary"} className="text-xs">
                        {l.mountingRateSource}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 text-muted-foreground">
                  <th className="text-left py-3 px-4 font-medium">{view === "campaign" ? "Campaign" : "Client"}</th>
                  {view === "campaign" && <th className="text-left py-3 px-4 font-medium">Client</th>}
                  <th className="text-right py-3 px-4 font-medium">Assets</th>
                  <th className="text-right py-3 px-4 font-medium">Billable</th>
                  <th className="text-right py-3 px-4 font-medium">Payable</th>
                  <th className="text-right py-3 px-4 font-medium">Margin</th>
                  <th className="text-right py-3 px-4 font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                {!grouped || grouped.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">No data</td></tr>
                ) : grouped.map((g, i) => {
                  const pct = g.billable > 0 ? (g.margin / g.billable * 100) : 0;
                  return (
                    <tr key={i} className="border-b border-border/20 hover:bg-muted/30">
                      <td className="py-2.5 px-4 font-medium">{g.label}</td>
                      {view === "campaign" && <td className="py-2.5 px-4 text-muted-foreground">{g.subLabel}</td>}
                      <td className="py-2.5 px-4 text-right">{g.assets}</td>
                      <td className="py-2.5 px-4 text-right font-mono">{fmt(g.billable)}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-muted-foreground">{fmt(g.payable)}</td>
                      <td className={`py-2.5 px-4 text-right font-mono font-bold ${g.margin >= 0 ? "text-primary" : "text-destructive"}`}>{fmt(g.margin)}</td>
                      <td className="py-2.5 px-4 text-right">
                        <Badge variant={pct >= 20 ? "default" : pct >= 0 ? "secondary" : "destructive"} className="text-xs">
                          {pct.toFixed(1)}%
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {grouped && grouped.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-border font-bold">
                    <td colSpan={view === "campaign" ? 3 : 2} className="py-3 px-4 text-right">Totals</td>
                    <td className="py-3 px-4 text-right font-mono">{fmt(totals.billable)}</td>
                    <td className="py-3 px-4 text-right font-mono">{fmt(totals.payable)}</td>
                    <td className={`py-3 px-4 text-right font-mono ${totals.margin >= 0 ? "text-primary" : "text-destructive"}`}>{fmt(totals.margin)}</td>
                    <td className="py-3 px-4 text-right">{totals.pct.toFixed(1)}%</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
