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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Plus, Trash2, DollarSign, CreditCard, Building2, Banknote, Smartphone, CircleDot, Download, Loader2, ChevronDown } from "lucide-react";
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
  tds_amount: number;
  tds_certificate_no: string | null;
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
  const [clientTds, setClientTds] = useState<{ tds_applicable: boolean; default_tds_rate: number | null }>({ tds_applicable: false, default_tds_rate: null });
  const [tdsOpen, setTdsOpen] = useState(false);
  const { generating, downloadReceiptByPaymentId } = useReceiptGeneration();
  
  const [newPayment, setNewPayment] = useState({
    amount: "",
    tds_amount: "",
    tds_certificate_no: "",
    payment_date: new Date().toISOString().split('T')[0],
    method: "Bank Transfer",
    reference_no: "",
    notes: "",
  });

  useEffect(() => {
    fetchPayments();
    fetchClientTdsSettings();
  }, [invoiceId]);

  const fetchClientTdsSettings = async () => {
    if (!clientId) return;
    try {
      const { data } = await supabase
        .from("clients")
        .select("tds_applicable, default_tds_rate")
        .eq("id", clientId)
        .maybeSingle();
      if (data) {
        setClientTds({
          tds_applicable: (data as any).tds_applicable || false,
          default_tds_rate: (data as any).default_tds_rate || null,
        });
        if ((data as any).tds_applicable) {
          setTdsOpen(true);
        }
      }
    } catch (e) {
      // silently ignore
    }
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("payment_records")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("payment_date", { ascending: false });

      if (error) throw error;
      setPayments((data || []).map((p: any) => ({
        ...p,
        tds_amount: p.tds_amount || 0,
        tds_certificate_no: p.tds_certificate_no || null,
      })));
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalTds = payments.reduce((sum, p) => sum + Number(p.tds_amount || 0), 0);
  const totalSettled = totalPaid + totalTds;
  const balance = Math.max(totalAmount - totalSettled, 0);
  const paymentProgress = totalAmount > 0 ? (totalSettled / totalAmount) * 100 : 0;

  const handleAddPayment = async () => {
    const amount = parseFloat(newPayment.amount);
    const tdsAmount = parseFloat(newPayment.tds_amount) || 0;
    const totalSettleThis = amount + tdsAmount;
    
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    if (tdsAmount < 0) {
      toast.error("TDS amount cannot be negative");
      return;
    }

    if (totalSettleThis > balance + 0.01) {
      toast.error(`Payment + TDS (${formatINR(totalSettleThis)}) exceeds balance due (${formatINR(balance)})`);
      return;
    }

    if (!newPayment.payment_date) {
      toast.error("Please select a payment date");
      return;
    }

    setSaving(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        toast.error("Authentication required. Please log in and try again.");
        return;
      }
      
      const { data: invoiceData, error: invoiceFetchError } = await supabase
        .from("invoices")
        .select("company_id, client_id, campaign_id")
        .eq("id", invoiceId)
        .maybeSingle();

      if (invoiceFetchError || !invoiceData?.company_id) {
        toast.error("Failed to fetch invoice details");
        return;
      }

      const payload: any = {
        invoice_id: invoiceId,
        client_id: clientId || invoiceData.client_id || null,
        campaign_id: campaignId || invoiceData.campaign_id || null,
        company_id: invoiceData.company_id,
        amount: amount,
        tds_amount: tdsAmount,
        tds_certificate_no: newPayment.tds_certificate_no?.trim() || null,
        payment_date: newPayment.payment_date,
        method: newPayment.method,
        reference_no: newPayment.reference_no || null,
        notes: newPayment.notes || null,
        created_by: user.id,
      };

      const { error } = await supabase
        .from("payment_records")
        .insert(payload);

      if (error) {
        const detail = [error.message, error.details, error.hint].filter(Boolean).join(" — ");
        toast.error(`Failed to add payment: ${detail}`);
        return;
      }

      toast.success("Payment recorded successfully");

      setNewPayment({
        amount: "",
        tds_amount: "",
        tds_certificate_no: "",
        payment_date: new Date().toISOString().split('T')[0],
        method: "Bank Transfer",
        reference_no: "",
        notes: "",
      });
      
      setDialogOpen(false);
      fetchPayments();
      onPaymentAdded?.();
    } catch (error: any) {
      toast.error(error?.message || "An unexpected error occurred while adding payment");
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
    if (balance <= 0.01) return <Badge className="bg-green-500/10 text-green-700 border-green-500/20">Paid</Badge>;
    if (totalPaid > 0 || totalTds > 0) return <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20">Partial</Badge>;
    return <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/20">Pending</Badge>;
  };

  const isDraftInvoice = status === "Draft";

  // Pre-fill TDS when dialog opens
  const handleDialogOpen = (open: boolean) => {
    setDialogOpen(open);
    if (open && clientTds.tds_applicable && clientTds.default_tds_rate && !newPayment.tds_amount) {
      // Suggest TDS based on remaining balance
      const suggestedTds = (balance * (clientTds.default_tds_rate / 100));
      setNewPayment(prev => ({ ...prev, tds_amount: suggestedTds.toFixed(2) }));
      setTdsOpen(true);
    }
  };

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
          <Dialog open={dialogOpen} onOpenChange={handleDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={isDraftInvoice || balance <= 0.01}>
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
                  <Label htmlFor="amount">Amount Received *</Label>
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

                {/* TDS Section */}
                <Collapsible open={tdsOpen || clientTds.tds_applicable} onOpenChange={setTdsOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground hover:text-foreground">
                      <span className="flex items-center gap-1">
                        TDS Deduction
                        {clientTds.tds_applicable && (
                          <Badge variant="outline" className="text-xs ml-1">Client TDS: {clientTds.default_tds_rate}%</Badge>
                        )}
                      </span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${tdsOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pt-2">
                    <div>
                      <Label htmlFor="tdsAmount">TDS Deducted</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                        <Input
                          id="tdsAmount"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="pl-8"
                          value={newPayment.tds_amount}
                          onChange={(e) => setNewPayment({ ...newPayment, tds_amount: e.target.value })}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Amount deducted as TDS by the client
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="tdsCertNo">TDS Certificate No.</Label>
                      <Input
                        id="tdsCertNo"
                        placeholder="Optional certificate number"
                        value={newPayment.tds_certificate_no}
                        onChange={(e) => setNewPayment({ ...newPayment, tds_certificate_no: e.target.value })}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>

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
              <span className="font-medium">{Math.min(paymentProgress, 100).toFixed(0)}%</span>
            </div>
            <Progress value={Math.min(paymentProgress, 100)} className="h-2" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-lg font-bold">{formatINR(totalAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Amount Received</p>
                <p className="text-lg font-bold text-green-600">{formatINR(totalPaid)}</p>
              </div>
              {totalTds > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">TDS Deducted</p>
                  <p className="text-lg font-bold text-blue-600">{formatINR(totalTds)}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Balance Due</p>
                <p className={`text-lg font-bold ${balance > 0.01 ? 'text-orange-600' : 'text-green-600'}`}>
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
                  <TableHead>Amount Received</TableHead>
                  {totalTds > 0 && <TableHead>TDS</TableHead>}
                  {totalTds > 0 && <TableHead>Total Settled</TableHead>}
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
                    {totalTds > 0 && (
                      <TableCell className="font-medium text-blue-600">
                        {payment.tds_amount > 0 ? formatINR(payment.tds_amount) : "-"}
                      </TableCell>
                    )}
                    {totalTds > 0 && (
                      <TableCell className="font-medium">
                        {formatINR(payment.amount + payment.tds_amount)}
                      </TableCell>
                    )}
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
                      {payment.tds_certificate_no ? `TDS Cert: ${payment.tds_certificate_no}` : ""}
                      {payment.tds_certificate_no && payment.notes ? " | " : ""}
                      {payment.notes || (!payment.tds_certificate_no ? "-" : "")}
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
