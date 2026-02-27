import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useOpsReportData } from "@/hooks/useOpsReportData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, RotateCcw, IndianRupee, Truck, ArrowDownToLine, Printer, BookOpen, User, CalendarDays, AlertTriangle } from "lucide-react";
import ExcelJS from "exceljs";

const downloadExcel = (buf: ArrayBuffer, name: string) => {
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
};

const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

interface PayableLine {
  type: "Mounting" | "Unmounting" | "Printing";
  campaignName: string;
  clientName: string;
  assetId: string;
  location: string;
  city: string;
  month: string;
  amount: number;
  mounterId: string | null;
  mounterName: string;
}

interface MonthStatement {
  month: string;
  opening: number;
  mountingPayable: number;
  unmountingPayable: number;
  printingPayable: number;
  totalPayable: number;
  paid: number;
  closing: number;
}

export default function ReportVendorLedger() {
  const { company } = useCompany();
  const companyId = company?.id;
  const { lines, isLoading: opsLoading } = useOpsReportData();

  const [selectedVendor, setSelectedVendor] = useState("all");
  const [vendorType, setVendorType] = useState<"all" | "mounter" | "printer">("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [campaignFilter, setCampaignFilter] = useState("all");

  // Fetch mounters
  const { data: mounters = [] } = useQuery({
    queryKey: ["mounters-list", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase
        .from("mounters")
        .select("id, name, phone")
        .eq("company_id", companyId!)
        .order("name");
      return data ?? [];
    },
  });

  // Fetch campaign_assets with mounter assignments for linking
  const { data: assetMounterMap = new Map() } = useQuery({
    queryKey: ["campaign-asset-mounters", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase
        .from("campaign_assets")
        .select("id, asset_id, campaign_id, assigned_mounter_id, mounter_name");
      const map = new Map<string, { mounterId: string | null; mounterName: string }>();
      (data ?? []).forEach((ca: any) => {
        const key = `${ca.campaign_id}__${ca.asset_id}`;
        map.set(key, {
          mounterId: ca.assigned_mounter_id,
          mounterName: ca.mounter_name || "Unassigned",
        });
      });
      return map;
    },
  });

  // Fetch vendor payments from expenses table
  const { data: vendorPayments = [] } = useQuery({
    queryKey: ["vendor-payments", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase
        .from("expenses")
        .select("id, vendor_id, vendor_name, category, amount, expense_date, payment_status, campaign_id, asset_id, bill_month")
        .eq("company_id", companyId!)
        .in("category", ["Mounting", "Printing"])
        .eq("payment_status", "Paid");
      return data ?? [];
    },
  });

  // Build payable lines from ops data with mounter info
  const payableLines = useMemo((): PayableLine[] => {
    const result: PayableLine[] = [];
    lines.forEach(l => {
      const key = `${l.campaignId}__${l.assetId}`;
      const mounter = assetMounterMap.get(key) ?? { mounterId: null, mounterName: "Unassigned" };

      if (l.mountingPayable > 0) {
        result.push({
          type: "Mounting",
          campaignName: l.campaignName,
          clientName: l.clientName,
          assetId: l.assetId,
          location: l.location,
          city: l.city,
          month: l.mountingMonth,
          amount: l.mountingPayable,
          mounterId: mounter.mounterId,
          mounterName: mounter.mounterName,
        });
      }
      if (l.unmountingPayable > 0) {
        result.push({
          type: "Unmounting",
          campaignName: l.campaignName,
          clientName: l.clientName,
          assetId: l.assetId,
          location: l.location,
          city: l.city,
          month: l.unmountingMonth,
          amount: l.unmountingPayable,
          mounterId: mounter.mounterId,
          mounterName: mounter.mounterName,
        });
      }
      if (l.printingRequired && l.printingPayable > 0) {
        result.push({
          type: "Printing",
          campaignName: l.campaignName,
          clientName: l.clientName,
          assetId: l.assetId,
          location: l.location,
          city: l.city,
          month: l.mountingMonth,
          amount: l.printingPayable,
          mounterId: null,
          mounterName: "Printer Vendor",
        });
      }
    });
    return result;
  }, [lines, assetMounterMap]);

  // Count unassigned payables (mounting/unmounting only — printers handled separately)
  const unassignedCount = useMemo(() => {
    return payableLines.filter(l => (l.type === "Mounting" || l.type === "Unmounting") && !l.mounterId).length;
  }, [payableLines]);

  // Filter payable lines
  const filteredLines = useMemo(() => {
    let result = payableLines;
    if (selectedVendor === "__unassigned__") {
      result = result.filter(l => !l.mounterId && l.type !== "Printing");
    } else if (selectedVendor !== "all") {
      result = result.filter(l => l.mounterId === selectedVendor);
    }
    if (vendorType === "mounter") {
      result = result.filter(l => l.type === "Mounting" || l.type === "Unmounting");
    } else if (vendorType === "printer") {
      result = result.filter(l => l.type === "Printing");
    }
    if (cityFilter !== "all") result = result.filter(l => l.city === cityFilter);
    if (campaignFilter !== "all") result = result.filter(l => l.campaignName === campaignFilter);
    return result;
  }, [payableLines, selectedVendor, vendorType, cityFilter, campaignFilter]);

  // Unique values for filters
  const cities = useMemo(() => [...new Set(payableLines.map(l => l.city))].filter(Boolean).sort(), [payableLines]);
  const campaigns = useMemo(() => [...new Set(payableLines.map(l => l.campaignName))].filter(Boolean).sort(), [payableLines]);

  // Build month-wise statement
  const monthStatement = useMemo((): MonthStatement[] => {
    const monthSet = new Set<string>();
    filteredLines.forEach(l => { if (l.month) monthSet.add(l.month); });
    const months = [...monthSet].sort();

    const paidByMonth = new Map<string, number>();
    vendorPayments.forEach(vp => {
      const matchVendor = selectedVendor === "all" || selectedVendor === "__unassigned__" || vp.vendor_id === selectedVendor;
      if (!matchVendor) return;
      const month = vp.bill_month || (vp.expense_date ? vp.expense_date.slice(0, 7) : null);
      if (month) paidByMonth.set(month, (paidByMonth.get(month) ?? 0) + (vp.amount ?? 0));
    });

    let runningBalance = 0;
    return months.map(month => {
      const monthLines = filteredLines.filter(l => l.month === month);
      const mountingPayable = monthLines.filter(l => l.type === "Mounting").reduce((s, l) => s + l.amount, 0);
      const unmountingPayable = monthLines.filter(l => l.type === "Unmounting").reduce((s, l) => s + l.amount, 0);
      const printingPayable = monthLines.filter(l => l.type === "Printing").reduce((s, l) => s + l.amount, 0);
      const totalPayable = mountingPayable + unmountingPayable + printingPayable;
      const paid = paidByMonth.get(month) ?? 0;
      const opening = runningBalance;
      const closing = opening + totalPayable - paid;
      runningBalance = closing;
      return { month, opening, mountingPayable, unmountingPayable, printingPayable, totalPayable, paid, closing };
    });
  }, [filteredLines, vendorPayments, selectedVendor]);

  // KPI totals
  const totals = useMemo(() => {
    const totalPayable = filteredLines.reduce((s, l) => s + l.amount, 0);
    const totalPaid = monthStatement.reduce((s, m) => s + m.paid, 0);
    const balance = totalPayable - totalPaid;
    return { totalPayable, totalPaid, balance };
  }, [filteredLines, monthStatement]);

  // Export Excel
  const exportExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const vendorLabel = selectedVendor === "all" ? "All-Vendors" :
      selectedVendor === "__unassigned__" ? "Unassigned" :
      (mounters.find(m => m.id === selectedVendor)?.name ?? selectedVendor);

    const wsSummary = wb.addWorksheet("Summary");
    wsSummary.columns = [
      { header: "Metric", key: "metric", width: 25 },
      { header: "Amount (₹)", key: "amount", width: 18 },
    ];
    wsSummary.getRow(1).font = { bold: true };
    wsSummary.addRow({ metric: "Vendor", amount: vendorLabel });
    wsSummary.addRow({ metric: "Total Payable", amount: totals.totalPayable });
    wsSummary.addRow({ metric: "Total Paid", amount: totals.totalPaid });
    wsSummary.addRow({ metric: "Balance", amount: totals.balance });

    const wsStatement = wb.addWorksheet("Month Statement");
    wsStatement.columns = [
      { header: "Month", key: "month", width: 12 },
      { header: "Opening Balance", key: "opening", width: 18 },
      { header: "Mounting Payable", key: "mountingPayable", width: 18 },
      { header: "Unmounting Payable", key: "unmountingPayable", width: 18 },
      { header: "Printing Payable", key: "printingPayable", width: 18 },
      { header: "Total Payable", key: "totalPayable", width: 16 },
      { header: "Paid", key: "paid", width: 14 },
      { header: "Closing Balance", key: "closing", width: 18 },
    ];
    wsStatement.getRow(1).font = { bold: true };
    monthStatement.forEach(m => wsStatement.addRow(m));

    const lineCols = [
      { header: "Month", key: "month", width: 12 },
      { header: "Campaign", key: "campaignName", width: 25 },
      { header: "Client", key: "clientName", width: 22 },
      { header: "Asset ID", key: "assetId", width: 18 },
      { header: "Location", key: "location", width: 28 },
      { header: "City", key: "city", width: 14 },
      { header: "Mounter", key: "mounterName", width: 18 },
      { header: "Amount (₹)", key: "amount", width: 14 },
    ];

    (["Mounting", "Unmounting", "Printing"] as const).forEach(type => {
      const typeLines = filteredLines.filter(l => l.type === type);
      if (typeLines.length > 0) {
        const ws = wb.addWorksheet(`${type} Lines`);
        ws.columns = lineCols.map(c => ({ ...c }));
        ws.getRow(1).font = { bold: true };
        typeLines.forEach(l => ws.addRow(l));
      }
    });

    const buf = await wb.xlsx.writeBuffer();
    downloadExcel(buf as ArrayBuffer, `Vendor_Statement_${vendorLabel}.xlsx`);
  };

  const resetFilters = () => {
    setSelectedVendor("all");
    setVendorType("all");
    setCityFilter("all");
    setCampaignFilter("all");
  };

  const isLoading = opsLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BookOpen className="h-6 w-6" /> Vendor Ledger
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Month-wise vendor statements with payables, payments & balance tracking.</p>
      </div>

      {/* Unassigned warning */}
      {unassignedCount > 0 && (
        <Alert variant="destructive" className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{unassignedCount} payable line(s)</strong> are not assigned to a vendor.
            Assign mounters in Campaign Operations to link payables to specific vendors.
            <Button variant="outline" size="sm" className="ml-3" onClick={() => setSelectedVendor("__unassigned__")}>
              View Unassigned
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><IndianRupee className="h-3.5 w-3.5" /> Total Payable</div>
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
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><User className="h-3.5 w-3.5" /> Vendors</div>
          <p className="text-xl font-bold">{mounters.length}</p>
          {unassignedCount > 0 && <Badge variant="outline" className="text-amber-600 border-amber-400 text-[10px] mt-1">{unassignedCount} unassigned</Badge>}
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={selectedVendor} onValueChange={setSelectedVendor}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Select Vendor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vendors</SelectItem>
            <SelectItem value="__unassigned__">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3 text-amber-500" /> Unassigned
              </span>
            </SelectItem>
            {mounters.map(m => (
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={vendorType} onValueChange={v => setVendorType(v as any)}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="mounter">Mounter</SelectItem>
            <SelectItem value="printer">Printer</SelectItem>
          </SelectContent>
        </Select>
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
        <Button variant="outline" size="sm" onClick={resetFilters}>
          <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
        </Button>
        <Button variant="outline" size="sm" onClick={exportExcel}>
          <Download className="h-3.5 w-3.5 mr-1" /> Export Excel
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>
      ) : (
        <Tabs defaultValue="statement">
          <TabsList>
            <TabsTrigger value="statement"><CalendarDays className="h-3.5 w-3.5 mr-1.5" /> Month Statement</TabsTrigger>
            <TabsTrigger value="mounting"><Truck className="h-3.5 w-3.5 mr-1.5" /> Mounting Lines</TabsTrigger>
            <TabsTrigger value="unmounting"><ArrowDownToLine className="h-3.5 w-3.5 mr-1.5" /> Unmounting Lines</TabsTrigger>
            <TabsTrigger value="printing"><Printer className="h-3.5 w-3.5 mr-1.5" /> Printing Lines</TabsTrigger>
          </TabsList>

          {/* Month-wise Statement */}
          <TabsContent value="statement" className="mt-4">
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40 text-muted-foreground">
                      <th className="text-left py-3 px-4 font-medium">Month</th>
                      <th className="text-right py-3 px-4 font-medium">Opening</th>
                      <th className="text-right py-3 px-4 font-medium">Mounting</th>
                      <th className="text-right py-3 px-4 font-medium">Unmounting</th>
                      <th className="text-right py-3 px-4 font-medium">Printing</th>
                      <th className="text-right py-3 px-4 font-medium">Total Payable</th>
                      <th className="text-right py-3 px-4 font-medium">Paid</th>
                      <th className="text-right py-3 px-4 font-medium">Closing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthStatement.length === 0 ? (
                      <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">No data for selected filters</td></tr>
                    ) : monthStatement.map(m => (
                      <tr key={m.month} className="border-b border-border/20 hover:bg-muted/30">
                        <td className="py-2.5 px-4 font-medium">{m.month}</td>
                        <td className="py-2.5 px-4 text-right font-mono">{fmt(m.opening)}</td>
                        <td className="py-2.5 px-4 text-right font-mono">{fmt(m.mountingPayable)}</td>
                        <td className="py-2.5 px-4 text-right font-mono">{fmt(m.unmountingPayable)}</td>
                        <td className="py-2.5 px-4 text-right font-mono">{fmt(m.printingPayable)}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold">{fmt(m.totalPayable)}</td>
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
                        <td className="py-3 px-4 text-right font-mono">{fmt(monthStatement.reduce((s, m) => s + m.mountingPayable, 0))}</td>
                        <td className="py-3 px-4 text-right font-mono">{fmt(monthStatement.reduce((s, m) => s + m.unmountingPayable, 0))}</td>
                        <td className="py-3 px-4 text-right font-mono">{fmt(monthStatement.reduce((s, m) => s + m.printingPayable, 0))}</td>
                        <td className="py-3 px-4 text-right font-mono">{fmt(monthStatement.reduce((s, m) => s + m.totalPayable, 0))}</td>
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

          {/* Drilldown Lines */}
          {(["mounting", "unmounting", "printing"] as const).map(tab => {
            const typeLabel = tab === "mounting" ? "Mounting" : tab === "unmounting" ? "Unmounting" : "Printing";
            const tabLines = filteredLines.filter(l => l.type === typeLabel);
            return (
              <TabsContent key={tab} value={tab} className="mt-4">
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
                          <th className="text-left py-3 px-4 font-medium">Vendor</th>
                          <th className="text-right py-3 px-4 font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tabLines.length === 0 ? (
                          <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">No {typeLabel.toLowerCase()} records</td></tr>
                        ) : tabLines.map((l, i) => (
                          <tr key={i} className="border-b border-border/20 hover:bg-muted/30">
                            <td className="py-2.5 px-4">{l.month}</td>
                            <td className="py-2.5 px-4 font-medium">{l.campaignName}</td>
                            <td className="py-2.5 px-4">{l.clientName}</td>
                            <td className="py-2.5 px-4 font-mono text-xs">{l.assetId}</td>
                            <td className="py-2.5 px-4 max-w-[200px] truncate">{l.location}</td>
                            <td className="py-2.5 px-4">{l.city}</td>
                            <td className="py-2.5 px-4">
                              {l.mounterId ? l.mounterName : (
                                <Badge variant="outline" className="text-amber-600 border-amber-400 text-[10px]">Unassigned</Badge>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-semibold">{fmt(l.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                      {tabLines.length > 0 && (
                        <tfoot>
                          <tr className="border-t-2 border-border font-bold">
                            <td colSpan={7} className="py-3 px-4 text-right">Total</td>
                            <td className="py-3 px-4 text-right font-mono text-destructive">
                              {fmt(tabLines.reduce((s, l) => s + l.amount, 0))}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>
      )}

      <p className="text-xs text-muted-foreground">
        Payables computed from campaign assets using Rate Settings engine. Paid amounts tracked from Mounting/Printing expense entries.
        Vendor linked via campaign_assets.assigned_mounter_id.
      </p>
    </div>
  );
}
