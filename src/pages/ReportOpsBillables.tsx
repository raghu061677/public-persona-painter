import { useState, useMemo } from "react";
import { useOpsReportData } from "@/hooks/useOpsReportData";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, RotateCcw, IndianRupee, Users, Clock } from "lucide-react";
import ExcelJS from "exceljs";

const downloadExcel = (buf: ArrayBuffer, name: string) => {
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
};

export default function ReportOpsBillables() {
  const { lines, isLoading } = useOpsReportData();
  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState("all");

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

  const totals = useMemo(() => {
    let mounting = 0, printing = 0, unmounting = 0;
    filtered.forEach(l => {
      mounting += l.mountingBillable;
      printing += l.printingBillable;
      unmounting += l.unmountingBillable;
    });
    return { mounting, printing, unmounting, total: mounting + printing + unmounting };
  }, [filtered]);

  const exportExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Ops Billables");
    ws.columns = [
      { header: "Campaign", key: "campaignName", width: 25 },
      { header: "Client", key: "clientName", width: 22 },
      { header: "Asset ID", key: "assetId", width: 18 },
      { header: "City", key: "city", width: 14 },
      { header: "Duration (days)", key: "durationDays", width: 14 },
      { header: "Mounting Billable (₹)", key: "mountingBillable", width: 18 },
      { header: "Printing Billable (₹)", key: "printingBillable", width: 18 },
      { header: "Unmount Billable (₹)", key: "unmountingBillable", width: 18 },
      { header: "Total Billable (₹)", key: "totalBillable", width: 16 },
    ];
    ws.getRow(1).font = { bold: true };
    filtered.forEach(l => ws.addRow({
      ...l,
      totalBillable: l.mountingBillable + l.printingBillable + l.unmountingBillable,
    }));
    ws.addRow({});
    ws.addRow({ campaignName: "TOTAL", mountingBillable: totals.mounting, printingBillable: totals.printing, unmountingBillable: totals.unmounting, totalBillable: totals.total });
    const buf = await wb.xlsx.writeBuffer();
    downloadExcel(buf as ArrayBuffer, `ops-billables-${monthFilter !== "all" ? monthFilter : "all"}.xlsx`);
  };

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ops Billables (Client Charges)</h1>
        <p className="text-sm text-muted-foreground mt-1">What you charge clients for mounting, printing & unmounting services.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4">
          <div className="text-xs text-muted-foreground mb-1">Mounting Billable</div>
          <p className="text-xl font-bold">{fmt(totals.mounting)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-xs text-muted-foreground mb-1">Printing Billable</div>
          <p className="text-xl font-bold">{fmt(totals.printing)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-xs text-muted-foreground mb-1">Unmount Billable</div>
          <p className="text-xl font-bold">{fmt(totals.unmounting)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1"><IndianRupee className="h-3.5 w-3.5" /> Total Billable</div>
          <p className="text-2xl font-bold text-primary">{fmt(totals.total)}</p>
        </CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search campaign, client, asset..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Month" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => { setSearch(""); setMonthFilter("all"); }}><RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset</Button>
        <Button variant="outline" size="sm" onClick={exportExcel}><Download className="h-3.5 w-3.5 mr-1" /> Export</Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 text-muted-foreground">
                  <th className="text-left py-3 px-4 font-medium">Campaign</th>
                  <th className="text-left py-3 px-4 font-medium">Client</th>
                  <th className="text-left py-3 px-4 font-medium">Asset ID</th>
                  <th className="text-left py-3 px-4 font-medium">City</th>
                  <th className="text-right py-3 px-4 font-medium">Duration</th>
                  <th className="text-right py-3 px-4 font-medium">Mounting</th>
                  <th className="text-right py-3 px-4 font-medium">Printing</th>
                  <th className="text-right py-3 px-4 font-medium">Unmount</th>
                  <th className="text-right py-3 px-4 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-12 text-muted-foreground">No billable records found</td></tr>
                ) : filtered.map((l, i) => (
                  <tr key={i} className="border-b border-border/20 hover:bg-muted/30">
                    <td className="py-2.5 px-4 font-medium">{l.campaignName}</td>
                    <td className="py-2.5 px-4">{l.clientName}</td>
                    <td className="py-2.5 px-4 font-mono text-xs">{l.assetId}</td>
                    <td className="py-2.5 px-4">{l.city}</td>
                    <td className="py-2.5 px-4 text-right">
                      <Badge variant={l.durationDays <= 90 ? "default" : "secondary"} className="text-xs">{l.durationDays}d</Badge>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono">{fmt(l.mountingBillable)}</td>
                    <td className="py-2.5 px-4 text-right font-mono">{l.printingRequired ? fmt(l.printingBillable) : <span className="text-muted-foreground">—</span>}</td>
                    <td className="py-2.5 px-4 text-right font-mono">{fmt(l.unmountingBillable)}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold">{fmt(l.mountingBillable + l.printingBillable + l.unmountingBillable)}</td>
                  </tr>
                ))}
              </tbody>
              {filtered.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-border font-bold">
                    <td colSpan={5} className="py-3 px-4 text-right">Totals</td>
                    <td className="py-3 px-4 text-right font-mono">{fmt(totals.mounting)}</td>
                    <td className="py-3 px-4 text-right font-mono">{fmt(totals.printing)}</td>
                    <td className="py-3 px-4 text-right font-mono">{fmt(totals.unmounting)}</td>
                    <td className="py-3 px-4 text-right font-mono text-primary">{fmt(totals.total)}</td>
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
