import { useState, useMemo } from "react";
import { useOpsReportData } from "@/hooks/useOpsReportData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, Printer, ArrowDownToLine, Search, Download, RotateCcw, IndianRupee } from "lucide-react";
import { format } from "date-fns";
import ExcelJS from "exceljs";

const downloadExcel = (buf: ArrayBuffer, name: string) => {
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
};

type PayableType = "all" | "mounting" | "printing" | "unmounting";

export default function ReportOpsPayables() {
  const { lines, isLoading } = useOpsReportData();
  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<PayableType>("all");

  // Get unique months from data
  const months = useMemo(() => {
    const set = new Set<string>();
    lines.forEach(l => {
      if (l.mountingMonth) set.add(l.mountingMonth);
      if (l.unmountingMonth) set.add(l.unmountingMonth);
    });
    return [...set].sort().reverse();
  }, [lines]);

  const filtered = useMemo(() => {
    let result = lines;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        l.campaignName.toLowerCase().includes(q) ||
        l.clientName.toLowerCase().includes(q) ||
        l.assetId.toLowerCase().includes(q) ||
        l.city.toLowerCase().includes(q)
      );
    }
    if (monthFilter !== "all") {
      result = result.filter(l => l.mountingMonth === monthFilter || l.unmountingMonth === monthFilter);
    }
    return result;
  }, [lines, search, monthFilter]);

  // Build flat payable rows
  const payableRows = useMemo(() => {
    const rows: Array<{
      type: string;
      campaignName: string;
      clientName: string;
      assetId: string;
      location: string;
      city: string;
      month: string;
      rate: number;
      qty: string;
      amount: number;
    }> = [];

    filtered.forEach(l => {
      if (typeFilter === "all" || typeFilter === "mounting") {
        rows.push({
          type: "Mounting",
          campaignName: l.campaignName,
          clientName: l.clientName,
          assetId: l.assetId,
          location: l.location,
          city: l.city,
          month: l.mountingMonth,
          rate: l.mountingPayable,
          qty: "1 asset",
          amount: l.mountingPayable,
        });
      }
      if ((typeFilter === "all" || typeFilter === "unmounting") && l.unmountingPayable > 0) {
        rows.push({
          type: "Unmounting",
          campaignName: l.campaignName,
          clientName: l.clientName,
          assetId: l.assetId,
          location: l.location,
          city: l.city,
          month: l.unmountingMonth,
          rate: l.unmountingPayable,
          qty: "1 asset",
          amount: l.unmountingPayable,
        });
      }
      if ((typeFilter === "all" || typeFilter === "printing") && l.printingRequired && l.printingPayable > 0) {
        rows.push({
          type: "Printing",
          campaignName: l.campaignName,
          clientName: l.clientName,
          assetId: l.assetId,
          location: l.location,
          city: l.city,
          month: l.mountingMonth,
          rate: l.printingPayable / (l.totalSqft || 1),
          qty: `${l.totalSqft} sqft`,
          amount: l.printingPayable,
        });
      }
    });

    return rows;
  }, [filtered, typeFilter]);

  // Summary KPIs
  const totals = useMemo(() => {
    let mounting = 0, unmounting = 0, printing = 0;
    filtered.forEach(l => {
      mounting += l.mountingPayable;
      unmounting += l.unmountingPayable;
      if (l.printingRequired) printing += l.printingPayable;
    });
    return { mounting, unmounting, printing, total: mounting + unmounting + printing };
  }, [filtered]);

  const exportExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Ops Payables");
    ws.columns = [
      { header: "Type", key: "type", width: 14 },
      { header: "Campaign", key: "campaignName", width: 25 },
      { header: "Client", key: "clientName", width: 22 },
      { header: "Asset ID", key: "assetId", width: 18 },
      { header: "Location", key: "location", width: 25 },
      { header: "City", key: "city", width: 14 },
      { header: "Month", key: "month", width: 12 },
      { header: "Rate (₹)", key: "rate", width: 12 },
      { header: "Qty", key: "qty", width: 12 },
      { header: "Amount (₹)", key: "amount", width: 14 },
    ];
    ws.getRow(1).font = { bold: true };
    payableRows.forEach(r => ws.addRow(r));
    // Totals row
    ws.addRow({});
    ws.addRow({ type: "TOTAL", amount: payableRows.reduce((s, r) => s + r.amount, 0) });
    const buf = await wb.xlsx.writeBuffer();
    downloadExcel(buf as ArrayBuffer, `ops-payables-${monthFilter !== "all" ? monthFilter : "all"}.xlsx`);
  };

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ops Payables (Vendor)</h1>
        <p className="text-sm text-muted-foreground mt-1">Monthly payables to vendors for mounting, printing & unmounting.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Truck className="h-3.5 w-3.5" /> Mounting</div>
          <p className="text-xl font-bold">{fmt(totals.mounting)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><ArrowDownToLine className="h-3.5 w-3.5" /> Unmounting</div>
          <p className="text-xl font-bold">{fmt(totals.unmounting)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Printer className="h-3.5 w-3.5" /> Printing</div>
          <p className="text-xl font-bold">{fmt(totals.printing)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><IndianRupee className="h-3.5 w-3.5" /> Total Payable</div>
          <p className="text-2xl font-bold text-destructive">{fmt(totals.total)}</p>
        </CardContent></Card>
      </div>

      {/* Filters */}
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
        <Select value={typeFilter} onValueChange={v => setTypeFilter(v as PayableType)}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="mounting">Mounting</SelectItem>
            <SelectItem value="unmounting">Unmounting</SelectItem>
            <SelectItem value="printing">Printing</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => { setSearch(""); setMonthFilter("all"); setTypeFilter("all"); }}>
          <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
        </Button>
        <Button variant="outline" size="sm" onClick={exportExcel}>
          <Download className="h-3.5 w-3.5 mr-1" /> Export
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 text-muted-foreground">
                  <th className="text-left py-3 px-4 font-medium">Type</th>
                  <th className="text-left py-3 px-4 font-medium">Campaign</th>
                  <th className="text-left py-3 px-4 font-medium">Client</th>
                  <th className="text-left py-3 px-4 font-medium">Asset ID</th>
                  <th className="text-left py-3 px-4 font-medium">City</th>
                  <th className="text-left py-3 px-4 font-medium">Month</th>
                  <th className="text-right py-3 px-4 font-medium">Rate</th>
                  <th className="text-left py-3 px-4 font-medium">Qty</th>
                  <th className="text-right py-3 px-4 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payableRows.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-12 text-muted-foreground">No payable records found</td></tr>
                ) : payableRows.map((r, i) => (
                  <tr key={i} className="border-b border-border/20 hover:bg-muted/30">
                    <td className="py-2.5 px-4">
                      <Badge variant={r.type === "Mounting" ? "default" : r.type === "Printing" ? "secondary" : "outline"} className="text-xs">
                        {r.type}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-4 font-medium">{r.campaignName}</td>
                    <td className="py-2.5 px-4">{r.clientName}</td>
                    <td className="py-2.5 px-4 font-mono text-xs">{r.assetId}</td>
                    <td className="py-2.5 px-4">{r.city}</td>
                    <td className="py-2.5 px-4">{r.month}</td>
                    <td className="py-2.5 px-4 text-right font-mono">{fmt(r.rate)}</td>
                    <td className="py-2.5 px-4">{r.qty}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold">{fmt(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
              {payableRows.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-border font-bold">
                    <td colSpan={8} className="py-3 px-4 text-right">Total Payable</td>
                    <td className="py-3 px-4 text-right font-mono text-destructive">{fmt(payableRows.reduce((s, r) => s + r.amount, 0))}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Rates sourced from Settings → Rate Settings. Printing applies only to assets where printing cost &gt; 0.
      </p>
    </div>
  );
}
