import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { differenceInDays } from "date-fns";
import { useCompany } from "@/contexts/CompanyContext";
import { formatINR } from "@/utils/finance";
import { ExternalLink, Download, AlertTriangle, Clock, Users } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AgingData {
  clientId: string;
  clientName: string;
  notDue: number;
  days30: number;
  days60: number;
  days90: number;
  over90: number;
  total: number;
  invoiceCount: number;
}

interface InvoiceRow {
  id: string;
  client_id: string;
  client_name: string;
  balance_due: number;
  due_date: string;
  status: string;
}

export function AgingReport() {
  const { company } = useCompany();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (company?.id) loadAgingData();
  }, [company?.id]);

  const loadAgingData = async () => {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, client_id, client_name, balance_due, due_date, status")
        .eq("company_id", company!.id)
        .not("status", "in", '("Draft","Cancelled","Paid")')
        .gt("balance_due", 0);

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error("Error loading aging data:", error);
    } finally {
      setLoading(false);
    }
  };

  const agingData = useMemo(() => {
    const grouped = new Map<string, AgingData>();

    invoices.forEach((invoice) => {
      const daysOverdue = differenceInDays(new Date(), new Date(invoice.due_date));
      const clientKey = invoice.client_id || invoice.client_name;

      if (!grouped.has(clientKey)) {
        grouped.set(clientKey, {
          clientId: invoice.client_id,
          clientName: invoice.client_name,
          notDue: 0,
          days30: 0,
          days60: 0,
          days90: 0,
          over90: 0,
          total: 0,
          invoiceCount: 0,
        });
      }

      const data = grouped.get(clientKey)!;
      const amount = Number(invoice.balance_due) || 0;
      data.invoiceCount++;

      if (daysOverdue <= 0) {
        data.notDue += amount;
      } else if (daysOverdue <= 30) {
        data.days30 += amount;
      } else if (daysOverdue <= 60) {
        data.days60 += amount;
      } else if (daysOverdue <= 90) {
        data.days90 += amount;
      } else {
        data.over90 += amount;
      }

      data.total += amount;
    });

    return Array.from(grouped.values()).sort((a, b) => b.total - a.total);
  }, [invoices]);

  const totals = useMemo(() => {
    return agingData.reduce(
      (acc, d) => ({
        notDue: acc.notDue + d.notDue,
        days30: acc.days30 + d.days30,
        days60: acc.days60 + d.days60,
        days90: acc.days90 + d.days90,
        over90: acc.over90 + d.over90,
        total: acc.total + d.total,
      }),
      { notDue: 0, days30: 0, days60: 0, days90: 0, over90: 0, total: 0 }
    );
  }, [agingData]);

  if (loading) {
    return <div className="text-center py-8">Loading aging report...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <SummaryCard label="Not Due" amount={totals.notDue} variant="default" />
        <SummaryCard label="0-30 Days" amount={totals.days30} variant="warning" />
        <SummaryCard label="31-60 Days" amount={totals.days60} variant="orange" />
        <SummaryCard label="61-90 Days" amount={totals.days90} variant="danger" />
        <SummaryCard label="90+ Days" amount={totals.over90} variant="critical" />
        <SummaryCard label="Total Outstanding" amount={totals.total} variant="total" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Accounts Receivable Aging — Client Breakdown
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/admin/reports/aging")}
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            Full Report
          </Button>
        </CardHeader>
        <CardContent>
          {agingData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No outstanding receivables found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-center">Invoices</TableHead>
                  <TableHead className="text-right">Not Due</TableHead>
                  <TableHead className="text-right">0-30 Days</TableHead>
                  <TableHead className="text-right">31-60 Days</TableHead>
                  <TableHead className="text-right">61-90 Days</TableHead>
                  <TableHead className="text-right">90+ Days</TableHead>
                  <TableHead className="text-right font-bold">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agingData.map((data) => (
                  <TableRow key={data.clientId || data.clientName}>
                    <TableCell className="font-medium">{data.clientName}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{data.invoiceCount}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {data.notDue > 0 ? formatINR(data.notDue) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-yellow-600">
                      {data.days30 > 0 ? formatINR(data.days30) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-orange-600">
                      {data.days60 > 0 ? formatINR(data.days60) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {data.days90 > 0 ? formatINR(data.days90) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-red-700 font-semibold">
                      {data.over90 > 0 ? formatINR(data.over90) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatINR(data.total)}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Totals row */}
                <TableRow className="bg-muted/50 font-bold border-t-2">
                  <TableCell>Total ({agingData.length} clients)</TableCell>
                  <TableCell className="text-center">
                    <Badge>{invoices.length}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatINR(totals.notDue)}</TableCell>
                  <TableCell className="text-right text-yellow-600">{formatINR(totals.days30)}</TableCell>
                  <TableCell className="text-right text-orange-600">{formatINR(totals.days60)}</TableCell>
                  <TableCell className="text-right text-red-600">{formatINR(totals.days90)}</TableCell>
                  <TableCell className="text-right text-red-700">{formatINR(totals.over90)}</TableCell>
                  <TableCell className="text-right">{formatINR(totals.total)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, amount, variant }: { label: string; amount: number; variant: string }) {
  const colorMap: Record<string, string> = {
    default: "text-muted-foreground",
    warning: "text-yellow-600",
    orange: "text-orange-600",
    danger: "text-red-600",
    critical: "text-red-700",
    total: "text-foreground",
  };

  return (
    <Card className="p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm font-bold ${colorMap[variant] || ""}`}>
        {formatINR(amount)}
      </p>
    </Card>
  );
}
