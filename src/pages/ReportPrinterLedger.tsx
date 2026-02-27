import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useOpsReportData } from "@/hooks/useOpsReportData";
import { resolveRate, isBacklit, isPrintingRequired, RateSettingRow } from "@/lib/ops-rate-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, RotateCcw, IndianRupee, Printer, CalendarDays, AlertTriangle, FileSpreadsheet } from "lucide-react";
import ExcelJS from "exceljs";

const downloadExcel = (buf: ArrayBuffer, name: string) => {
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
};

const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

interface PrintingLine {
  campaignId: string;
  campaignName: string;
  clientName: string;
  assetId: string;
  location: string;
  city: string;
  illuminationType: string;
  sqft: number;
  ratePerSqft: number;
  amount: number;
  month: string;
  sqftMissing: boolean;
}

interface MonthStatement {
  month: string;
  opening: number;
  printingPayable: number;
  paid: number;
  closing: number;
}

export default function ReportPrinterLedger() {
  const { company } = useCompany();
  const companyId = company?.id;
  const { lines, isLoading: opsLoading } = useOpsReportData();

  const [cityFilter, setCityFilter] = useState("all");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");

  // Fetch printer payments from expenses
  const { data: printerPayments = [] } = useQuery({
    queryKey: ["printer-payments", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase
        .from("expenses")
        .select("id, vendor_id, vendor_name, category, amount, expense_date, payment_status, campaign_id, asset_id, bill_month")
        .eq("company_id", companyId!)
        .eq("category", "Printing")
        .eq("payment_status", "Paid");
      return data ?? [];
    },
  });

  // Build printing payable lines from ops data
  const printingLines = useMemo((): PrintingLine[] => {
    return lines
      .filter(l => l.printingRequired && l.printingPayable > 0)
      .map(l => ({
        campaignId: l.campaignId,
        campaignName: l.campaignName,
        clientName: l.clientName,
        assetId: l.assetId,
        location: l.location,
        city: l.city,
        illuminationType: l.illuminationType,
        sqft: l.totalSqft,
        ratePerSqft: l.totalSqft > 0 ? Math.round(l.printingPayable / l.totalSqft * 100) / 100 : 0,
        amount: l.printingPayable,
        month: l.mountingMonth,
        sqftMissing: l.totalSqft <= 0,
      }));
  }, [lines]);

  // Count issues
  const sqftMissingCount = useMemo(() => printingLines.filter(l => l.sqftMissing).length, [printingLines]);

  // Filter
  const filteredLines = useMemo(() => {
    let result = printingLines;
    if (cityFilter !== "all") result = result.filter(l => l.city === cityFilter);
    if (campaignFilter !== "all") result = result.filter(l => l.campaignName === campaignFilter);
    if (clientFilter !== "all") result = result.filter(l => l.clientName === clientFilter);
    return result;
  }, [printingLines, cityFilter, campaignFilter, clientFilter]);

  // Filter options
  const cities = useMemo(() => [...new Set(printingLines.map(l => l.city))].filter(Boolean).sort(), [printingLines]);
  const campaigns = useMemo(() => [...new Set(printingLines.map(l => l.campaignName))].filter(Boolean).sort(), [printingLines]);
  const clients = useMemo(() => [...new Set(printingLines.map(l => l.clientName))].filter(Boolean).sort(), [printingLines]);

  // Month-wise statement
  const monthStatement = useMemo((): MonthStatement[] => {
    const monthSet = new Set<string>();
    filteredLines.forEach(l => { if (l.month) monthSet.add(l.month); });
    const months = [...monthSet].sort();

    const paidByMonth = new Map<string, number>();
    printerPayments.forEach(vp => {
      const month = vp.bill_month || (vp.expense_date ? vp.expense_date.slice(0, 7) : null);
      if (month) paidByMonth.set(month, (paidByMonth.get(month) ?? 0) + (vp.amount ?? 0));
    });

    let runningBalance = 0;
    return months.map(month => {
      const printingPayable = filteredLines.filter(l => l.month === month).reduce((s, l) => s + l.amount, 0);
      const paid = paidByMonth.get(month) ?? 0;
      const opening = runningBalance;
      const closing = opening + printingPayable - paid;
      runningBalance = closing;
      return { month, opening, printingPayable, paid, closing };
    });
  }, [filteredLines, printerPayments]);

  // KPI totals
  const totals = useMemo(() => {
    const totalPayable = filteredLines.reduce((s, l) => s + l.amount, 0);
    const totalPaid = monthStatement.reduce((s, m) => s + m.paid, 0);
    const balance = totalPayable - totalPaid;
    const totalSqft = filteredLines.reduce((s, l) => s + l.sqft, 0);
    return { totalPayable, totalPaid, balance, totalSqft };
  }, [filteredLines, monthStatement]);

  // Export Excel
  const exportExcel = async () => {
    const wb = new ExcelJS.Workbook();

    // Summary
    const wsSummary = wb.addWorksheet("Summary");
    wsSummary.columns = [
      { header: "Metric", key: "metric", width: 25 },
      { header: "Value", key: "value", width: 20 },
    ];
    wsSummary.getRow(1).font = { bold: true };
    wsSummary.addRow({ metric: "Total Printing Payable", value: totals.totalPayable });
    wsSummary.addRow({ metric: "Total Paid", value: totals.totalPaid });
    wsSummary.addRow({ metric: "Balance", value: totals.balance });
    wsSummary.addRow({ metric: "Total Sq.Ft", value: totals.totalSqft });

    // Month Statement
    const wsStatement = wb.addWorksheet("Month Statement");
    wsStatement.columns = [
      { header: "Month", key: "month", width: 12 },
      { header: "Opening Balance", key: "opening", width: 18 },
      { header: "Printing Payable", key: "printingPayable", width: 18 },
      { header: "Paid", key: "paid", width: 14 },
      { header: "Closing Balance", key: "closing", width: 18 },
    ];
    wsStatement.getRow(1).font = { bold: true };
    monthStatement.forEach(m => wsStatement.addRow(m));

    // Printing Lines
    const wsPrinting = wb.addWorksheet("Printing Lines");
    wsPrinting.columns = [
      { header: "Month", key: "month", width: 12 },
      { header: "Campaign", key: "campaignName", width: 25 },
      { header: "Client", key: "clientName", width: 22 },
      { header: "Asset ID", key: "assetId", width: 18 },
      { header: "Location", key: "location", width: 28 },
      { header: "City", key: "city", width: 14 },
      { header: "Illumination", key: "illuminationType", width: 14 },
      { header: "Sq.Ft", key: "sqft", width: 10 },
      { header: "Rate/Sq.Ft (₹)", key: "ratePerSqft", width: 14 },
      { header: "Amount (₹)", key: "amount", width: 14 },
    ];
    wsPrinting.getRow(1).font = { bold: true };
    filteredLines.forEach(l => wsPrinting.addRow(l));

    // Highlight balance in red if > 0 in statement
    monthStatement.forEach((m, i) => {
      if (m.closing > 0) {
        const row = wsStatement.getRow(i + 2);
        row.getCell("closing").font = { color: { argb: "FFCC0000" }, bold: true };
      }
    });

    const buf = await wb.xlsx.writeBuffer();
    downloadExcel(buf as ArrayBuffer, `Printer_Statement.xlsx`);
  };

  const resetFilters = () => {
    setCityFilter("all");
    setCampaignFilter("all");
    setClientFilter("all");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Printer className="h-6 w-6" /> Printer Ledger
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Month-wise printing payable statements with illumination-aware rate calculation.</p>
      </div>

      {/* Warnings */}
      {sqftMissingCount > 0 && (
        <Alert variant="destructive" className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{sqftMissingCount} asset(s)</strong> have missing Sq.Ft data. Printing payable cannot be accurately calculated for those assets.
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><IndianRupee className="h-3.5 w-3.5" /> Printing Payable</div>
          <p className="text-xl font-bold text-destructive">{fmt(totals.totalPayable)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><IndianRupee className="h-3.5 w-3.5" /> Total Paid</div>
          <p className="text-xl font-bold text-primary">{fmt(totals.totalPaid)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><IndianRupee className="h-3.5 w-3.5" /> Balance Due</div>
          <p className={`text-xl font-bold ${totals.balance > 0 ? "text-destructive" : "text-primary"}`}>{fmt(totals.balance)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><FileSpreadsheet className="h-3.5 w-3.5" /> Total Sq.Ft</div>
          <p className="text-xl font-bold">{totals.totalSqft.toLocaleString("en-IN")}</p>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="City" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cities</SelectItem>
            {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={campaignFilter} onValueChange={setCampaignFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Campaign" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Campaigns</SelectItem>
            {campaigns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Client" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={resetFilters}>
          <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
        </Button>
        <Button variant="outline" size="sm" onClick={exportExcel}>
          <Download className="h-3.5 w-3.5 mr-1" /> Export Excel
        </Button>
      </div>

      {opsLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>
      ) : (
        <Tabs defaultValue="statement">
          <TabsList>
            <TabsTrigger value="statement"><CalendarDays className="h-3.5 w-3.5 mr-1.5" /> Month Statement</TabsTrigger>
            <TabsTrigger value="lines"><Printer className="h-3.5 w-3.5 mr-1.5" /> Printing Lines</TabsTrigger>
          </TabsList>

          {/* Month Statement */}
          <TabsContent value="statement" className="mt-4">
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40 text-muted-foreground">
                      <th className="text-left py-3 px-4 font-medium">Month</th>
                      <th className="text-right py-3 px-4 font-medium">Opening</th>
                      <th className="text-right py-3 px-4 font-medium">Printing Payable</th>
                      <th className="text-right py-3 px-4 font-medium">Paid</th>
                      <th className="text-right py-3 px-4 font-medium">Closing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthStatement.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">No printing payables found</td></tr>
                    ) : monthStatement.map(m => (
                      <tr key={m.month} className="border-b border-border/20 hover:bg-muted/30">
                        <td className="py-2.5 px-4 font-medium">{m.month}</td>
                        <td className="py-2.5 px-4 text-right font-mono">{fmt(m.opening)}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold">{fmt(m.printingPayable)}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-primary">{fmt(m.paid)}</td>
                        <td className={`py-2.5 px-4 text-right font-mono font-bold ${m.closing > 0 ? "text-destructive" : "text-primary"}`}>
                          {fmt(m.closing)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {monthStatement.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-border font-bold">
                        <td className="py-3 px-4">Total</td>
                        <td className="py-3 px-4 text-right font-mono">—</td>
                        <td className="py-3 px-4 text-right font-mono">{fmt(monthStatement.reduce((s, m) => s + m.printingPayable, 0))}</td>
                        <td className="py-3 px-4 text-right font-mono text-primary">{fmt(monthStatement.reduce((s, m) => s + m.paid, 0))}</td>
                        <td className={`py-3 px-4 text-right font-mono ${totals.balance > 0 ? "text-destructive" : "text-primary"}`}>
                          {fmt(totals.balance)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* Printing Line Details */}
          <TabsContent value="lines" className="mt-4">
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40 text-muted-foreground">
                      <th className="text-left py-3 px-4 font-medium">Month</th>
                      <th className="text-left py-3 px-4 font-medium">Campaign</th>
                      <th className="text-left py-3 px-4 font-medium">Client</th>
                      <th className="text-left py-3 px-4 font-medium">Asset ID</th>
                      <th className="text-left py-3 px-4 font-medium">Location</th>
                      <th className="text-left py-3 px-4 font-medium">City</th>
                      <th className="text-left py-3 px-4 font-medium">Illumination</th>
                      <th className="text-right py-3 px-4 font-medium">Sq.Ft</th>
                      <th className="text-right py-3 px-4 font-medium">Rate/Sq.Ft</th>
                      <th className="text-right py-3 px-4 font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLines.length === 0 ? (
                      <tr><td colSpan={10} className="text-center py-12 text-muted-foreground">No printing records</td></tr>
                    ) : filteredLines.map((l, i) => (
                      <tr key={i} className="border-b border-border/20 hover:bg-muted/30">
                        <td className="py-2.5 px-4">{l.month}</td>
                        <td className="py-2.5 px-4 font-medium">{l.campaignName}</td>
                        <td className="py-2.5 px-4">{l.clientName}</td>
                        <td className="py-2.5 px-4 font-mono text-xs">{l.assetId}</td>
                        <td className="py-2.5 px-4 max-w-[180px] truncate">{l.location}</td>
                        <td className="py-2.5 px-4">{l.city}</td>
                        <td className="py-2.5 px-4">
                          <Badge variant="outline" className={
                            l.illuminationType.toLowerCase().includes("backlit")
                              ? "text-amber-600 border-amber-400"
                              : "text-muted-foreground"
                          }>
                            {l.illuminationType}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono">
                          {l.sqftMissing ? (
                            <Badge variant="outline" className="text-amber-600 border-amber-400 text-[10px]">Missing</Badge>
                          ) : l.sqft.toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono">₹{l.ratePerSqft}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold">{fmt(l.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  {filteredLines.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-border font-bold">
                        <td colSpan={7} className="py-3 px-4 text-right">Total</td>
                        <td className="py-3 px-4 text-right font-mono">{filteredLines.reduce((s, l) => s + l.sqft, 0).toLocaleString("en-IN")}</td>
                        <td className="py-3 px-4 text-right font-mono">—</td>
                        <td className="py-3 px-4 text-right font-mono text-destructive">
                          {fmt(filteredLines.reduce((s, l) => s + l.amount, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <p className="text-xs text-muted-foreground">
        Printing payables: Sq.Ft × rate (Backlit ₹14/sq.ft, Non-Lit ₹6/sq.ft, or as configured in Rate Settings).
        Paid amounts tracked from Printing category expense entries.
      </p>
    </div>
  );
}
