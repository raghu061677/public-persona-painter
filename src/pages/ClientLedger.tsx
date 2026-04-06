import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useClientLedger, LedgerEntry } from "@/hooks/useClientLedger";
import { formatINR } from "@/utils/finance";
import { formatDate } from "@/utils/plans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangeFilter } from "@/components/common/date-range-filter";
import { DateRange } from "react-day-picker";
import {
  FileText, ArrowDownRight, ArrowUpRight, CreditCard, Receipt,
  Download, FileSpreadsheet, ChevronLeft, AlertTriangle, IndianRupee,
  Landmark, BookOpen, BadgePercent
} from "lucide-react";
import { exportClientLedgerExcel } from "@/utils/exports/clientLedgerExcel";
import { exportClientLedgerPdf } from "@/utils/exports/clientLedgerPdf";

const TYPE_CONFIG: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  invoice: { label: "Invoice Raised", icon: ArrowUpRight, color: "text-red-600" },
  payment: { label: "Payment Received", icon: ArrowDownRight, color: "text-emerald-600" },
  tds: { label: "TDS Deducted", icon: BadgePercent, color: "text-blue-600" },
  credit_note: { label: "Credit Note", icon: Receipt, color: "text-amber-600" },
};

export default function ClientLedger() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Load clients
  const clientsQuery = useQuery({
    queryKey: ["ledger-clients", company?.id],
    enabled: !!company?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, gstin")
        .eq("company_id", company!.id)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { ledgerEntries, summary, outstanding, isLoading } = useClientLedger(selectedClientId);

  const selectedClient = useMemo(
    () => (clientsQuery.data || []).find(c => c.id === selectedClientId),
    [clientsQuery.data, selectedClientId]
  );

  // Apply filters
  const filteredEntries = useMemo(() => {
    let entries = ledgerEntries;
    if (dateRange?.from) {
      const from = dateRange.from.getTime();
      const to = dateRange.to ? dateRange.to.getTime() + 86400000 : Date.now() + 86400000;
      entries = entries.filter(e => {
        const d = new Date(e.date).getTime();
        return d >= from && d <= to;
      });
    }
    if (typeFilter !== "all") {
      entries = entries.filter(e => e.type === typeFilter);
    }
    return entries;
  }, [ledgerEntries, dateRange, typeFilter]);

  // Reconciliation check
  const reconciliationOk = useMemo(() => {
    if (!ledgerEntries.length) return true;
    const lastBalance = ledgerEntries[ledgerEntries.length - 1]?.runningBalance || 0;
    return Math.abs(lastBalance - summary.netOutstanding) < 1;
  }, [ledgerEntries, summary]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/finance/dashboard")}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Client Ledger</h1>
            <p className="text-sm text-muted-foreground">Receivable statement with running balance</p>
          </div>
        </div>
        {selectedClientId && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => exportClientLedgerExcel(filteredEntries, summary, outstanding, selectedClient)}>
              <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Excel
            </Button>
            <Button size="sm" variant="outline" onClick={() => exportClientLedgerPdf(filteredEntries, summary, outstanding, selectedClient, company)}>
              <Download className="h-4 w-4 mr-1.5" /> PDF
            </Button>
          </div>
        )}
      </div>

      {/* Client Selector + Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="min-w-[250px] flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Client</label>
              <Select value={selectedClientId || ""} onValueChange={v => setSelectedClientId(v || null)}>
                <SelectTrigger><SelectValue placeholder="Select a client..." /></SelectTrigger>
                <SelectContent>
                  {(clientsQuery.data || []).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DateRangeFilter label="Period" value={dateRange} onChange={setDateRange} />
            <div className="min-w-[160px]">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Transactions</SelectItem>
                  <SelectItem value="invoice">Invoices</SelectItem>
                  <SelectItem value="payment">Payments</SelectItem>
                  <SelectItem value="tds">TDS</SelectItem>
                  <SelectItem value="credit_note">Credit Notes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedClientId && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium">Select a client to view ledger</p>
            <p className="text-sm mt-1">Choose a client from the dropdown above to see their receivable statement.</p>
          </CardContent>
        </Card>
      )}

      {selectedClientId && (
        <>
          {/* Reconciliation Warning */}
          {!reconciliationOk && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Running balance does not match computed outstanding. Some transactions may be missing.
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <SummaryCard icon={IndianRupee} label="Total Invoiced" value={summary.totalInvoiced} color="text-primary" />
            <SummaryCard icon={ArrowDownRight} label="Total Received" value={summary.totalReceived} color="text-emerald-600" />
            <SummaryCard icon={BadgePercent} label="Total TDS" value={summary.totalTds} color="text-blue-600" />
            <SummaryCard icon={Receipt} label="Total Credits" value={summary.totalCredits} color="text-amber-600" />
            <SummaryCard icon={Landmark} label="Net Outstanding" value={summary.netOutstanding} color="text-red-600" highlight />
          </div>

          {/* Ledger Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Ledger Statement</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-auto max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Ref No</TableHead>
                      <TableHead className="max-w-[250px]">Description</TableHead>
                      <TableHead className="text-right">Debit (₹)</TableHead>
                      <TableHead className="text-right">Credit (₹)</TableHead>
                      <TableHead className="text-right">Balance (₹)</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                    ) : filteredEntries.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No transactions found</TableCell></TableRow>
                    ) : (
                      filteredEntries.map((entry, i) => {
                        const cfg = TYPE_CONFIG[entry.type];
                        const Icon = cfg.icon;
                        return (
                          <TableRow key={`${entry.type}-${i}`}>
                            <TableCell className="whitespace-nowrap text-sm">{formatDate(entry.date)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                                <span className="text-xs">{cfg.label}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{entry.refNo}</TableCell>
                            <TableCell className="max-w-[250px] truncate text-sm">{entry.description}</TableCell>
                            <TableCell className="text-right font-medium text-red-600">{entry.debit > 0 ? formatINR(entry.debit) : ""}</TableCell>
                            <TableCell className="text-right font-medium text-emerald-600">{entry.credit > 0 ? formatINR(entry.credit) : ""}</TableCell>
                            <TableCell className="text-right font-semibold">{formatINR(entry.runningBalance)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{entry.status}</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Outstanding Invoices */}
          {outstanding.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Outstanding Invoices ({outstanding.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-auto max-h-[350px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice No</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead className="text-right">Credits</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead className="text-right">Overdue</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {outstanding.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs">{row.invoiceNo}</TableCell>
                          <TableCell className="text-sm">{formatDate(row.invoiceDate)}</TableCell>
                          <TableCell className="text-sm">{formatDate(row.dueDate)}</TableCell>
                          <TableCell className="text-right">{formatINR(row.totalAmount)}</TableCell>
                          <TableCell className="text-right text-emerald-600">{formatINR(row.paidAmount)}</TableCell>
                          <TableCell className="text-right text-amber-600">{row.creditAmount > 0 ? formatINR(row.creditAmount) : "—"}</TableCell>
                          <TableCell className="text-right font-semibold">{formatINR(row.balanceDue)}</TableCell>
                          <TableCell className="text-right">
                            {row.overdueDays > 0 ? (
                              <span className="text-red-600 font-medium">{row.overdueDays}d</span>
                            ) : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${row.overdueDays > 0 ? "border-red-300 text-red-700" : ""}`}>
                              {row.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color, highlight }: { icon: typeof IndianRupee; label: string; value: number; color: string; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-red-200 bg-red-50/50 dark:bg-red-950/20" : ""}>
      <CardContent className="pt-4 pb-4 px-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`h-4 w-4 ${color}`} />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className={`text-lg font-bold ${color}`}>{formatINR(value)}</p>
      </CardContent>
    </Card>
  );
}
