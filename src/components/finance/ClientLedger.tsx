import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatINR, getInvoiceStatusColor, getDaysOverdue } from "@/utils/finance";
import { formatDate } from "@/utils/plans";
import { FileText, DollarSign, AlertCircle, CheckCircle, Clock, ExternalLink, Download, Loader2 } from "lucide-react";
import { useReceiptGeneration } from "@/hooks/useReceiptGeneration";

interface Invoice {
  id: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  status: string;
  billing_month: string | null;
  campaign_id: string | null;
}

interface PaymentRecord {
  id: string;
  invoice_id: string;
  payment_date: string;
  amount: number;
  method: string;
  reference_no: string | null;
}

interface ClientLedgerProps {
  clientId: string;
  clientName?: string;
}

export function ClientLedger({ clientId, clientName }: ClientLedgerProps) {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { generating, downloadReceiptByPaymentId } = useReceiptGeneration();

  const [totals, setTotals] = useState({
    totalInvoiced: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    overdueCount: 0,
    overdueAmount: 0,
  });

  useEffect(() => {
    fetchLedgerData();
  }, [clientId]);

  const fetchLedgerData = async () => {
    setLoading(true);
    try {
      // Fetch invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from("invoices")
        .select("id, invoice_date, due_date, total_amount, paid_amount, balance_due, status, billing_month, campaign_id")
        .eq("client_id", clientId)
        .neq("status", "Draft")
        .neq("status", "Cancelled")
        .order("invoice_date", { ascending: false });

      if (invoicesError) throw invoicesError;
      setInvoices(invoicesData || []);

      // Fetch all payments for this client's invoices
      const invoiceIds = (invoicesData || []).map(inv => inv.id);
      if (invoiceIds.length > 0) {
        const { data: paymentsData, error: paymentsError } = await supabase
          .from("payment_records")
          .select("id, invoice_id, payment_date, amount, method, reference_no")
          .in("invoice_id", invoiceIds)
          .order("payment_date", { ascending: false });

        if (paymentsError) throw paymentsError;
        setPayments(paymentsData || []);
      }

      // Calculate totals
      const totalInvoiced = (invoicesData || []).reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
      const totalPaid = (invoicesData || []).reduce((sum, inv) => sum + Number(inv.paid_amount || 0), 0);
      const totalOutstanding = (invoicesData || []).reduce((sum, inv) => sum + Number(inv.balance_due || 0), 0);
      
      const overdueInvoices = (invoicesData || []).filter(inv => {
        if (inv.status === "Paid") return false;
        return getDaysOverdue(inv.due_date) > 0;
      });

      setTotals({
        totalInvoiced,
        totalPaid,
        totalOutstanding,
        overdueCount: overdueInvoices.length,
        overdueAmount: overdueInvoices.reduce((sum, inv) => sum + Number(inv.balance_due || 0), 0),
      });

    } catch (error) {
      console.error("Error fetching ledger data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = statusFilter === "all" 
    ? invoices 
    : invoices.filter(inv => inv.status === statusFilter);

  const getPaymentsForInvoice = (invoiceId: string) => {
    return payments.filter(p => p.invoice_id === invoiceId);
  };

  const paymentProgress = totals.totalInvoiced > 0 
    ? (totals.totalPaid / totals.totalInvoiced) * 100 
    : 0;

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading ledger...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatINR(totals.totalInvoiced)}</div>
            <p className="text-xs text-muted-foreground">{invoices.length} invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatINR(totals.totalPaid)}</div>
            <Progress value={paymentProgress} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatINR(totals.totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground">{paymentProgress.toFixed(0)}% collected</p>
          </CardContent>
        </Card>

        <Card className={totals.overdueCount > 0 ? "border-red-200" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className={`h-4 w-4 ${totals.overdueCount > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totals.overdueCount > 0 ? 'text-red-600' : ''}`}>
              {formatINR(totals.overdueAmount)}
            </div>
            <p className="text-xs text-muted-foreground">{totals.overdueCount} overdue invoices</p>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Invoice History</CardTitle>
              <CardDescription>All invoices and payment records for this client</CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Sent">Sent</SelectItem>
                <SelectItem value="Partial">Partial</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No invoices found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice ID</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => {
                  const daysOverdue = getDaysOverdue(invoice.due_date);
                  const invoicePayments = getPaymentsForInvoice(invoice.id);
                  
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <button
                          onClick={() => navigate(`/admin/invoices/${invoice.id}`)}
                          className="font-medium text-primary hover:underline"
                        >
                          {invoice.id}
                        </button>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {invoice.billing_month || "-"}
                      </TableCell>
                      <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {formatDate(invoice.due_date)}
                          {daysOverdue > 0 && invoice.status !== "Paid" && (
                            <Badge variant="destructive" className="text-xs">
                              +{daysOverdue}d
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatINR(invoice.total_amount)}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatINR(invoice.paid_amount || 0)}
                        {invoicePayments.length > 0 && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({invoicePayments.length})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${
                        (invoice.balance_due || 0) > 0 ? 'text-orange-600' : 'text-green-600'
                      }`}>
                        {formatINR(invoice.balance_due || 0)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getInvoiceStatusColor(invoice.status)}>
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/admin/invoices/${invoice.id}`)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Payments */}
      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
            <CardDescription>Last 10 payment transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.slice(0, 10).map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDate(payment.payment_date)}</TableCell>
                    <TableCell>
                      <button
                        onClick={() => navigate(`/admin/invoices/${payment.invoice_id}`)}
                        className="text-primary hover:underline"
                      >
                        {payment.invoice_id}
                      </button>
                    </TableCell>
                    <TableCell>{payment.method}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {payment.reference_no || "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {formatINR(payment.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => downloadReceiptByPaymentId(payment.id)}
                              disabled={generating}
                            >
                              {generating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4 text-primary" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Download Receipt</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
