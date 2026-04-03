import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Lock,
  Unlock,
  CalendarCheck,
  AlertTriangle,
  CheckCircle2,
  IndianRupee,
  TrendingDown,
  Zap,
  ExternalLink,
  ShieldCheck,
  FileText,
  Hammer,
  Printer,
  BarChart3,
} from "lucide-react";
import { format, subMonths, endOfMonth } from "date-fns";
import { isMonthClosed } from "@/pages/MonthClose";

function generateMonthOptions() {
  const months: { label: string; value: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = subMonths(now, i);
    months.push({
      label: format(d, "MMM yyyy"),
      value: format(d, "yyyy-MM"),
    });
  }
  return months;
}

export function MonthCloseWidget() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const companyId = company?.id;
  const [selectedMonth, setSelectedMonth] = useState(
    format(new Date(), "yyyy-MM")
  );
  const monthOptions = useMemo(generateMonthOptions, []);

  const isClosed = companyId
    ? isMonthClosed(companyId, selectedMonth)
    : false;

  const monthStart = `${selectedMonth}-01`;
  const monthEnd = format(endOfMonth(new Date(monthStart)), "yyyy-MM-dd");

  // Fetch summary data + vendor snapshot for the selected month
  const { data, isLoading } = useQuery({
    queryKey: ["month-close-widget", companyId, selectedMonth],
    enabled: !!companyId,
    queryFn: async () => {
      const [invoicesRes, expensesRes, batchRes] = await Promise.all([
        supabase
          .from("invoices")
          .select("id, status, total_amount, balance_due")
          .eq("company_id", companyId!)
          .gte("invoice_date", monthStart)
          .lte("invoice_date", monthEnd),
        supabase
          .from("expenses")
          .select("id, amount, category, payment_status")
          .eq("company_id", companyId!)
          .gte("expense_date", monthStart)
          .lte("expense_date", monthEnd),
        supabase
          .from("payable_batches" as any)
          .select("id")
          .eq("company_id", companyId!)
          .eq("month_key", selectedMonth)
          .maybeSingle(),
      ]);

      const invoices = invoicesRes.data ?? [];
      const expenses = expensesRes.data ?? [];
      const revenue = invoices.reduce(
        (s, i) => s + Number(i.total_amount || 0),
        0
      );
      const totalExpenses = expenses.reduce(
        (s, e) => s + Number(e.amount || 0),
        0
      );
      const draftInvoices = invoices.filter(
        (i) => i.status === "Draft"
      ).length;
      const outstanding = invoices
        .filter((i) => i.status !== "Paid" && i.status !== "Cancelled" && i.status !== "Draft")
        .reduce((s, i) => s + Number(i.balance_due || 0), 0);

      // Vendor snapshot from expenses
      const mountingPayable = expenses
        .filter((e: any) => e.category === "Mounting")
        .reduce((s, e) => s + Number(e.amount || 0), 0);
      const printingPayable = expenses
        .filter((e: any) => e.category === "Printing")
        .reduce((s, e) => s + Number(e.amount || 0), 0);
      const unmountPayable = expenses
        .filter((e: any) => e.category === "Unmounting")
        .reduce((s, e) => s + Number(e.amount || 0), 0);
      const paidToVendors = expenses
        .filter(
          (e: any) =>
            ["Mounting", "Printing", "Unmounting"].includes(e.category) &&
            e.payment_status === "Paid"
        )
        .reduce((s, e) => s + Number(e.amount || 0), 0);
      const vendorTotal = mountingPayable + printingPayable + unmountPayable;
      const vendorBalance = vendorTotal - paidToVendors;

      return {
        revenue,
        expenses: totalExpenses,
        draftInvoices,
        outstanding,
        payablesGenerated: !!batchRes.data,
        vendorSnapshot: {
          mounting: mountingPayable,
          printing: printingPayable,
          unmounting: unmountPayable,
          paid: paidToVendors,
          balance: vendorBalance,
        },
      };
    },
  });

  // Warnings
  const warnings: string[] = [];
  if (data && !data.payablesGenerated) warnings.push("Payables not generated");
  if (data && data.draftInvoices > 0)
    warnings.push(`${data.draftInvoices} draft invoice(s)`);

  const fmt = (v: number | undefined) =>
    v != null ? `₹${v.toLocaleString("en-IN")}` : "—";

  return (
    <Card className="hover-scale transition-all duration-200 border-l-4 border-l-violet-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarCheck className="h-4 w-4" />
            Month Close
          </CardTitle>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  <span className="flex items-center gap-1.5">
                    {m.label}
                    {companyId &&
                      isMonthClosed(companyId, m.value) && (
                        <Lock className="h-3 w-3 text-destructive" />
                      )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Status Badge */}
        <div className="mt-2">
          {isClosed ? (
            <Badge variant="destructive" className="gap-1">
              <Lock className="h-3 w-3" /> CLOSED
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className="gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
            >
              <Unlock className="h-3 w-3" /> OPEN
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Mini Summary */}
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : data ? (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-1.5">
              <IndianRupee className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-muted-foreground">Revenue</span>
            </div>
            <span className="text-right font-semibold">
              {fmt(data.revenue)}
            </span>

            <div className="flex items-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              <span className="text-muted-foreground">Expenses</span>
            </div>
            <span className="text-right font-semibold">
              {fmt(data.expenses)}
            </span>

            <div className="flex items-center gap-1.5">
              {data.payablesGenerated ? (
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              )}
              <span className="text-muted-foreground">Payables</span>
            </div>
            <span className="text-right font-semibold">
              {data.payablesGenerated ? (
                <span className="text-emerald-600">Generated ✓</span>
              ) : (
                <span className="text-amber-600">Not Generated</span>
              )}
            </span>

            <div className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-muted-foreground">Outstanding</span>
            </div>
            <span className="text-right font-semibold">
              {fmt(data.outstanding)}
            </span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Month Close module not configured.
          </p>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="space-y-1.5">
            {warnings.map((w, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded"
              >
                <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                {w}
              </div>
            ))}
          </div>
        )}

        {/* Period Actions */}
        <div className="flex flex-col gap-2 pt-1">
          {isClosed ? (
            <>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" />
                This period is closed. Editing disabled.
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() =>
                  navigate(
                    `/admin/finance/month-close?month=${selectedMonth}`
                  )
                }
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                View Month Close
              </Button>
            </>
          ) : (
            <>
              {data && !data.payablesGenerated ? (
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() =>
                    navigate(
                      `/admin/finance/generate-payables?month=${selectedMonth}`
                    )
                  }
                >
                  <Zap className="h-3.5 w-3.5 mr-1.5" />
                  Generate Payables
                </Button>
              ) : data?.payablesGenerated ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate("/admin/finance/ops-payables")}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                  Payables Generated — View Ledger
                </Button>
              ) : null}

              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() =>
                  navigate(
                    `/admin/finance/month-close?month=${selectedMonth}`
                  )
                }
              >
                <Lock className="h-3.5 w-3.5 mr-1.5" />
                Close Month
              </Button>
            </>
          )}
        </div>

        {/* Vendor Controls */}
        <Separator />
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Vendor Controls
          </p>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs h-8"
              onClick={() =>
                navigate(
                  `/admin/reports/vendor-ledger?month=${selectedMonth}&type=mounter`
                )
              }
            >
              <Hammer className="h-3 w-3 mr-1" />
              Mounter
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs h-8"
              onClick={() =>
                navigate(
                  `/admin/reports/printer-ledger?month=${selectedMonth}`
                )
              }
            >
              <Printer className="h-3 w-3 mr-1" />
              Printer
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs h-8"
              onClick={() =>
                navigate(
                  `/admin/reports/ops-margin?month=${selectedMonth}`
                )
              }
            >
              <BarChart3 className="h-3 w-3 mr-1" />
              Ops Margin
            </Button>
          </div>
        </div>

        {/* Vendor Snapshot */}
        {!isLoading && data?.vendorSnapshot && (
          <>
            <Separator />
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Vendor Snapshot
              </p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Hammer className="h-3 w-3" /> Mounting
                </span>
                <span className="text-right font-medium">
                  {fmt(data.vendorSnapshot.mounting)}
                </span>

                <span className="text-muted-foreground flex items-center gap-1">
                  <Printer className="h-3 w-3" /> Printing
                </span>
                <span className="text-right font-medium">
                  {fmt(data.vendorSnapshot.printing)}
                </span>

                <span className="text-muted-foreground">Unmounting</span>
                <span className="text-right font-medium">
                  {fmt(data.vendorSnapshot.unmounting)}
                </span>

                <span className="text-muted-foreground">Paid to Vendors</span>
                <span className="text-right font-medium text-emerald-600">
                  {fmt(data.vendorSnapshot.paid)}
                </span>

                <span className="font-semibold text-foreground">Balance</span>
                <span className="text-right font-bold text-foreground">
                  {fmt(data.vendorSnapshot.balance)}
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
