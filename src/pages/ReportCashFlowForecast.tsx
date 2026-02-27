import { useNavigate } from "react-router-dom";
import { useStrategicIntelligence } from "@/hooks/useStrategicIntelligence";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ArrowDownRight, ArrowUpRight, DollarSign, AlertTriangle,
  TrendingUp, RefreshCw, Wallet, Receipt,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from "recharts";

const fmt = (v: number) => `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export default function ReportCashFlowForecast() {
  const navigate = useNavigate();
  const si = useStrategicIntelligence();

  if (si.loading) {
    return (
      <div className="h-full flex flex-col space-y-6 p-6 md:p-8">
        <h1 className="text-2xl font-bold tracking-tight">Cash Flow Forecast</h1>
        <div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Card key={i}><CardContent className="pt-6"><Skeleton className="h-8 w-32" /></CardContent></Card>)}</div>
      </div>
    );
  }

  const { cashFlowForecast, cashFlowTotal } = si;

  return (
    <div className="h-full flex flex-col space-y-5 p-6 md:p-8 overflow-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cash Flow Forecast</h1>
          <p className="text-sm text-muted-foreground">Projected incoming vs outgoing for next 90 days</p>
        </div>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={si.refresh}><RefreshCw className="h-4 w-4" /></Button>
      </div>

      {/* Summary KPIs */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <KPICard title="Expected Incoming (90d)" value={fmt(cashFlowTotal.totalIncoming)} icon={<ArrowDownRight className="h-4 w-4" />} color="text-emerald-600" />
        <KPICard title="Expected Outgoing (90d)" value={fmt(cashFlowTotal.totalOutgoing)} icon={<ArrowUpRight className="h-4 w-4" />} color="text-red-600" />
        <KPICard title="Net Projected" value={fmt(cashFlowTotal.netProjected)}
          icon={<Wallet className="h-4 w-4" />}
          color={cashFlowTotal.netProjected >= 0 ? "text-emerald-600" : "text-red-600"} />
        <KPICard title="Currently Overdue" value={fmt(cashFlowTotal.overdue)} icon={<AlertTriangle className="h-4 w-4" />} color="text-amber-600"
          onClick={() => navigate("/admin/invoices?status=overdue")} sub="Click to view" />
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Cash Flow by Period</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={cashFlowForecast}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend />
              <Bar dataKey="incoming" name="Incoming" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="outgoing" name="Outgoing" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Period Breakdown</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Expected Incoming</TableHead>
                <TableHead className="text-right">Invoices</TableHead>
                <TableHead className="text-right">Expected Outgoing</TableHead>
                <TableHead className="text-right">Expenses</TableHead>
                <TableHead className="text-right">Net Position</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cashFlowForecast.map(b => (
                <TableRow key={b.label}>
                  <TableCell className="font-medium">{b.label}</TableCell>
                  <TableCell className="text-right text-emerald-600 font-semibold">{fmt(b.incoming)}</TableCell>
                  <TableCell className="text-right">{b.invoiceCount}</TableCell>
                  <TableCell className="text-right text-red-600 font-semibold">{fmt(b.outgoing)}</TableCell>
                  <TableCell className="text-right">{b.expenseCount}</TableCell>
                  <TableCell className={cn("text-right font-bold", b.net >= 0 ? "text-emerald-600" : "text-red-600")}>
                    {fmt(b.net)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2 font-bold">
                <TableCell>Total (90 Days)</TableCell>
                <TableCell className="text-right text-emerald-600">{fmt(cashFlowTotal.totalIncoming)}</TableCell>
                <TableCell className="text-right">{cashFlowForecast.reduce((s, b) => s + b.invoiceCount, 0)}</TableCell>
                <TableCell className="text-right text-red-600">{fmt(cashFlowTotal.totalOutgoing)}</TableCell>
                <TableCell className="text-right">{cashFlowForecast.reduce((s, b) => s + b.expenseCount, 0)}</TableCell>
                <TableCell className={cn("text-right", cashFlowTotal.netProjected >= 0 ? "text-emerald-600" : "text-red-600")}>{fmt(cashFlowTotal.netProjected)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Survival Question */}
      <Card className={cn("border-2", cashFlowTotal.netProjected >= 0 ? "border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/10" : "border-red-500/30 bg-red-50/30 dark:bg-red-950/10")}>
        <CardContent className="pt-4 pb-4 flex items-center gap-3">
          {cashFlowTotal.netProjected >= 0
            ? <TrendingUp className="h-6 w-6 text-emerald-600" />
            : <AlertTriangle className="h-6 w-6 text-red-600" />
          }
          <div>
            <p className="font-semibold text-sm">
              {cashFlowTotal.netProjected >= 0
                ? "Cash position is positive for the next 90 days"
                : "⚠️ Cash shortfall projected — collections needed urgently"}
            </p>
            <p className="text-xs text-muted-foreground">
              {cashFlowTotal.overdue > 0 && `${fmt(cashFlowTotal.overdue)} is currently overdue. `}
              Based on current invoices and expense patterns.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => navigate("/admin/invoices?status=unpaid")}>
          <Receipt className="h-3.5 w-3.5 mr-1.5" /> Unpaid Invoices
        </Button>
        <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => navigate("/admin/expenses")}>
          <DollarSign className="h-3.5 w-3.5 mr-1.5" /> All Expenses
        </Button>
        <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => navigate("/admin/reports/financial")}>
          <Wallet className="h-3.5 w-3.5 mr-1.5" /> Financial Summary
        </Button>
      </div>
    </div>
  );
}

function KPICard({ title, value, icon, color, sub, onClick }: { title: string; value: string; icon: React.ReactNode; color: string; sub?: string; onClick?: () => void }) {
  return (
    <Card className={cn("transition-shadow", onClick && "cursor-pointer hover:shadow-md")} onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
        <CardTitle className="text-[11px] font-medium text-muted-foreground">{title}</CardTitle>
        <span className={color}>{icon}</span>
      </CardHeader>
      <CardContent className="pb-3 px-4">
        <div className={cn("text-lg font-bold", color)}>{value}</div>
        {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}
