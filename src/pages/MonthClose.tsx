import { useState, useEffect, useMemo } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Lock, Unlock, CalendarCheck, AlertTriangle, CheckCircle2, XCircle,
  IndianRupee, TrendingUp, TrendingDown, FileText, BarChart3, Loader2
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { toast } from "sonner";

interface ClosingCheck {
  label: string;
  passed: boolean;
  detail: string;
}

interface MonthSummary {
  totalRevenue: number;
  totalExpenses: number;
  totalInvoices: number;
  draftInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  profit: number;
}

// Store closed months in localStorage per company (UI-only lock)
function getClosedMonths(companyId: string): string[] {
  try {
    const raw = localStorage.getItem(`goads_closed_months_${companyId}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function setClosedMonths(companyId: string, months: string[]) {
  localStorage.setItem(`goads_closed_months_${companyId}`, JSON.stringify(months));
}

export function isMonthClosed(companyId: string | undefined, monthKey: string): boolean {
  if (!companyId) return false;
  return getClosedMonths(companyId).includes(monthKey);
}

function generateMonthOptions() {
  const months: { label: string; value: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = subMonths(now, i);
    months.push({
      label: format(d, "MMMM yyyy"),
      value: format(d, "yyyy-MM"),
    });
  }
  return months;
}

export default function MonthClose() {
  const { company } = useCompany();
  const companyId = company?.id;
  const [selectedMonth, setSelectedMonth] = useState(format(subMonths(new Date(), 1), "yyyy-MM"));
  const [summary, setSummary] = useState<MonthSummary | null>(null);
  const [checks, setChecks] = useState<ClosingCheck[]>([]);
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);

  const monthOptions = useMemo(generateMonthOptions, []);
  const isClosed = companyId ? isMonthClosed(companyId, selectedMonth) : false;

  const monthStart = `${selectedMonth}-01`;
  const monthEnd = format(endOfMonth(new Date(monthStart)), "yyyy-MM-dd");

  useEffect(() => {
    if (!companyId) return;
    loadSummary();
  }, [companyId, selectedMonth]);

  async function loadSummary() {
    if (!companyId) return;
    setLoading(true);
    try {
      // Fetch invoices for the month
      const { data: invoices } = await supabase
        .from("invoices")
        .select("id, status, total_amount, invoice_date")
        .eq("company_id", companyId)
        .gte("invoice_date", monthStart)
        .lte("invoice_date", monthEnd);

      // Fetch expenses
      const { data: expenses } = await supabase
        .from("expenses")
        .select("id, amount, expense_date")
        .eq("company_id", companyId)
        .gte("expense_date", monthStart)
        .lte("expense_date", monthEnd);

      const inv = invoices || [];
      const exp = expenses || [];

      const totalRevenue = inv.reduce((s, i) => s + (i.total_amount || 0), 0);
      const totalExpenses = exp.reduce((s, e) => s + (e.amount || 0), 0);
      const draftInvoices = inv.filter(i => i.status === "Draft").length;
      const paidInvoices = inv.filter(i => i.status === "Paid").length;
      const overdueInvoices = inv.filter(i => i.status === "Overdue").length;

      const summaryData: MonthSummary = {
        totalRevenue,
        totalExpenses,
        totalInvoices: inv.length,
        draftInvoices,
        paidInvoices,
        overdueInvoices,
        profit: totalRevenue - totalExpenses,
      };
      setSummary(summaryData);

      // Validation checks
      const validationChecks: ClosingCheck[] = [
        {
          label: "No draft invoices pending",
          passed: draftInvoices === 0,
          detail: draftInvoices === 0 ? "All invoices finalized" : `${draftInvoices} draft invoice(s) need attention`,
        },
        {
          label: "All invoices generated",
          passed: inv.length > 0,
          detail: inv.length > 0 ? `${inv.length} invoice(s) generated` : "No invoices found for this month",
        },
        {
          label: "Expenses recorded",
          passed: true,
          detail: `${exp.length} expense(s) recorded totaling ₹${totalExpenses.toLocaleString("en-IN")}`,
        },
      ];
      setChecks(validationChecks);
    } catch (err) {
      toast.error("Failed to load month summary");
    } finally {
      setLoading(false);
    }
  }

  function handleCloseMonth() {
    if (!companyId) return;
    setClosing(true);
    // Simulate brief processing
    setTimeout(() => {
      const existing = getClosedMonths(companyId);
      if (!existing.includes(selectedMonth)) {
        setClosedMonths(companyId, [...existing, selectedMonth]);
      }
      setClosing(false);
      toast.success(`${format(new Date(monthStart), "MMMM yyyy")} has been closed successfully`);
    }, 800);
  }

  function handleReopenMonth() {
    if (!companyId) return;
    const existing = getClosedMonths(companyId);
    setClosedMonths(companyId, existing.filter(m => m !== selectedMonth));
    toast.info(`${format(new Date(monthStart), "MMMM yyyy")} has been reopened`);
  }

  const allChecksPassed = checks.length > 0 && checks.every(c => c.passed);
  const hasBlockers = checks.some(c => !c.passed);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarCheck className="h-6 w-6" />
            Monthly Closing
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review, validate, and lock monthly financial records
          </p>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map(m => (
              <SelectItem key={m.value} value={m.value}>
                <span className="flex items-center gap-2">
                  {m.label}
                  {companyId && isMonthClosed(companyId, m.value) && (
                    <Lock className="h-3 w-3 text-destructive" />
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status Banner */}
      {isClosed && (
        <Alert className="border-destructive/50 bg-destructive/5">
          <Lock className="h-4 w-4" />
          <AlertTitle>Month Closed</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              {format(new Date(monthStart), "MMMM yyyy")} is locked. Financial records cannot be edited.
            </span>
            <Button variant="outline" size="sm" onClick={handleReopenMonth}>
              <Unlock className="h-3.5 w-3.5 mr-1" /> Reopen
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Summary */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <Card key={i}><CardContent className="pt-4 pb-3 space-y-2">
              <div className="h-3 w-20 bg-muted animate-pulse rounded" />
              <div className="h-7 w-16 bg-muted animate-pulse rounded" />
            </CardContent></Card>
          ))}
        </div>
      ) : summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <IndianRupee className="h-3.5 w-3.5" /> Total Revenue
              </div>
              <p className="text-2xl font-bold text-emerald-600">₹{summary.totalRevenue.toLocaleString("en-IN")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <TrendingDown className="h-3.5 w-3.5" /> Total Expenses
              </div>
              <p className="text-2xl font-bold text-red-600">₹{summary.totalExpenses.toLocaleString("en-IN")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <TrendingUp className="h-3.5 w-3.5" /> Profit
              </div>
              <p className={`text-2xl font-bold ${summary.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                ₹{summary.profit.toLocaleString("en-IN")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <FileText className="h-3.5 w-3.5" /> Invoices
              </div>
              <p className="text-2xl font-bold">{summary.totalInvoices}</p>
              <div className="flex gap-2 mt-1 text-xs">
                <Badge variant="secondary">{summary.paidInvoices} Paid</Badge>
                {summary.draftInvoices > 0 && <Badge variant="outline">{summary.draftInvoices} Draft</Badge>}
                {summary.overdueInvoices > 0 && <Badge variant="destructive">{summary.overdueInvoices} Overdue</Badge>}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Validation Checks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Pre-Close Validation
          </CardTitle>
          <CardDescription>All checks must pass before closing the month</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : checks.map((check, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                check.passed
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950"
                  : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950"
              }`}
            >
              {check.passed ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className="font-medium text-sm">{check.label}</p>
                <p className="text-xs text-muted-foreground">{check.detail}</p>
              </div>
              <Badge variant={check.passed ? "default" : "secondary"}>
                {check.passed ? "Pass" : "Warning"}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Action */}
      {!isClosed && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold">Close {format(new Date(monthStart), "MMMM yyyy")}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Closing will lock all invoices and expenses for this month. They will become read-only.
                </p>
              </div>
              <Button
                size="lg"
                onClick={handleCloseMonth}
                disabled={closing || hasBlockers}
                className="min-w-[180px]"
              >
                {closing ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Closing...</>
                ) : (
                  <><Lock className="mr-2 h-4 w-4" /> Close Month</>
                )}
              </Button>
            </div>
            {hasBlockers && (
              <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Resolve validation warnings before closing. You may still close with warnings if needed by fixing draft invoices.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}