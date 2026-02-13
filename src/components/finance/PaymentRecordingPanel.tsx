import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Plus, Trash2, DollarSign, CreditCard, Building2, Banknote, Smartphone, CircleDot, Download, FileText, Loader2 } from "lucide-react";
import { formatINR } from "@/utils/finance";
import { formatDate } from "@/utils/plans";
import { useReceiptGeneration } from "@/hooks/useReceiptGeneration";

interface PaymentRecord {
  id: string;
  invoice_id: string;
  client_id: string | null;
  campaign_id: string | null;
  payment_date: string;
  amount: number;
  method: string;
  reference_no: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

interface PaymentRecordingPanelProps {
  invoiceId: string;
  totalAmount: number;
  balanceDue?: number;
  paidAmount?: number;
  status?: string;
  clientId?: string;
  campaignId?: string;
  onPaymentAdded?: () => void;
}

const PAYMENT_METHODS = [
  { value: "Bank Transfer", label: "Bank Transfer", icon: Building2 },
  { value: "UPI", label: "UPI", icon: Smartphone },
  { value: "Cheque", label: "Cheque", icon: CircleDot },
  { value: "Cash", label: "Cash", icon: Banknote },
  { value: "Card", label: "Card", icon: CreditCard },
  { value: "Other", label: "Other", icon: DollarSign },
];

export function PaymentRecordingPanel({
  invoiceId,
  totalAmount,
  balanceDue: initialBalanceDue,
  paidAmount: initialPaidAmount,
  status,
  clientId,
  campaignId,
  onPaymentAdded,
}: PaymentRecordingPanelProps) {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { generating, downloadReceiptByPaymentId } = useReceiptGeneration();
  
  const [newPayment, setNewPayment] = useState({
    amount: "",
    payment_date: new Date().toISOString().split('T')[0],
    method: "Bank Transfer",
    reference_no: "",
    notes: "",
  });

  useEffect(() => {
    fetchPayments();
  }, [invoiceId]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("payment_records")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("payment_date", { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const balance = totalAmount - totalPaid;
  const paymentProgress = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;

  const handleAddPayment = async () => {
    const amount = parseFloat(newPayment.amount);
    
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    if (amount > balance + 0.01) {
      toast.error(`Payment amount (₹${amount.toFixed(2)}) exceeds balance due (₹${balance.toFixed(2)})`);
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get company_id from invoice for RLS compliance
      const { data: invoiceData } = await supabase
        .from("invoices")
        .select("company_id")
        .eq("id", invoiceId)
        .single();

      const { error } = await supabase
        .from("payment_records")
        .insert({
          invoice_id: invoiceId,
          client_id: clientId || null,
          campaign_id: campaignId || null,
          company_id: invoiceData?.company_id || null,
          amount: amount,
          payment_date: newPayment.payment_date,
          method: newPayment.method,
          reference_no: newPayment.reference_no || null,
          notes: newPayment.notes || null,
          created_by: user?.id,
        });

      if (error) throw error;

      toast.success("Payment recorded successfully");

      setNewPayment({
        amount: "",
        payment_date: new Date().toISOString().split('T')[0],
        method: "Bank Transfer",
        reference_no: "",
        notes: "",
      });
      
      setDialogOpen(false);
      fetchPayments();
      onPaymentAdded?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to add payment");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm("Are you sure you want to delete this payment?")) return;

    try {
      const { error } = await supabase
        .from("payment_records")
        .delete()
        .eq("id", paymentId);

      if (error) throw error;

      toast.success("Payment deleted successfully");
      fetchPayments();
      onPaymentAdded?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete payment");
    }
  };

  const getMethodIcon = (method: string) => {
    const found = PAYMENT_METHODS.find(m => m.value === method);
    const Icon = found?.icon || DollarSign;
    return <Icon className="h-4 w-4" />;
  };

  const getStatusBadge = () => {
    if (balance <= 0) return <Badge className="bg-green-500/10 text-green-700 border-green-500/20">Paid</Badge>;
    if (totalPaid > 0) return <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20">Partial</Badge>;
    return <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/20">Pending</Badge>;
  };

  const isDraftInvoice = status === "Draft";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              <CardTitle>Payment Records</CardTitle>
              {getStatusBadge()}
            </div>
            <CardDescription className="mt-1">
              Track all payments received for this invoice
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={isDraftInvoice || balance <= 0}>
                <Plus className="mr-2 h-4 w-4" />
                Add Payment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Payment</DialogTitle>
                <DialogDescription>
                  Add a new payment entry. Balance due: {formatINR(balance)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="amount">Amount *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="pl-8"
                      value={newPayment.amount}
                      onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Max: {formatINR(balance)}
                  </p>
                </div>
                <div>
                  <Label htmlFor="paymentDate">Payment Date *</Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={newPayment.payment_date}
                    onChange={(e) => setNewPayment({ ...newPayment, payment_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="paymentMethod">Payment Method *</Label>
                  <Select
                    value={newPayment.method}
                    onValueChange={(value) => setNewPayment({ ...newPayment, method: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          <div className="flex items-center gap-2">
                            <method.icon className="h-4 w-4" />
                            {method.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="refNumber">Reference Number (UTR/Cheque No.)</Label>
                  <Input
                    id="refNumber"
                    placeholder="Transaction/Cheque number"
                    value={newPayment.reference_no}
                    onChange={(e) => setNewPayment({ ...newPayment, reference_no: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Optional notes"
                    value={newPayment.notes}
                    onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddPayment} disabled={saving}>
                  {saving ? "Saving..." : "Add Payment"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Summary with Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Payment Progress</span>
              <span className="font-medium">{paymentProgress.toFixed(0)}%</span>
            </div>
            <Progress value={paymentProgress} className="h-2" />
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-lg font-bold">{formatINR(totalAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="text-lg font-bold text-green-600">{formatINR(totalPaid)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Balance Due</p>
                <p className={`text-lg font-bold ${balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {formatINR(balance)}
                </p>
              </div>
            </div>
          </div>

          {isDraftInvoice && (
            <div className="text-center py-4 text-muted-foreground bg-muted/50 rounded-lg">
              Payments cannot be added to draft invoices. Please finalize the invoice first.
            </div>
          )}

          {/* Payments table */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading payments...</div>
          ) : payments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDate(payment.payment_date)}</TableCell>
                    <TableCell className="font-medium text-green-600">
                      {formatINR(payment.amount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getMethodIcon(payment.method)}
                        <span>{payment.method}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {payment.reference_no || "-"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {payment.notes || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
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
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletePayment(payment.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No payments recorded yet
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
