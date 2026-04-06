import { useState, useEffect, useMemo } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, DollarSign, CreditCard, Building2, Banknote, Smartphone, CircleDot, Download, Loader2, Info } from "lucide-react";
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
  tds_rate: number;
  tds_base_amount: number;
  tds_certificate_no: string | null;
  tds_certificate_date: string | null;
  method: string;
  reference_no: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

interface PaymentRecordingPanelProps {
  invoiceId: string;
  totalAmount: number;
  subTotal?: number;
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

interface ClientTdsDefaults {
  tds_applicable: boolean;
  default_tds_rate: number;
  tds_deduction_basis: string;
  tan_number: string;
}

export function PaymentRecordingPanel({
  invoiceId,
  totalAmount,
  subTotal,
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
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editData, setEditData] = useState({
    payment_date: "",
    method: "Bank Transfer",
    reference_no: "",
    notes: "",
  });
  const [clientTds, setClientTds] = useState<ClientTdsDefaults>({
    tds_applicable: false,
    default_tds_rate: 0,
    tds_deduction_basis: "taxable_value",
    tan_number: "",
  });
  const [tdsEnabled, setTdsEnabled] = useState(false);
  const { generating, downloadReceiptByPaymentId } = useReceiptGeneration();
  
  const [newPayment, setNewPayment] = useState({
    amount: "",
    tds_rate: "",
    tds_base_amount: "",
    tds_amount: "",
    tds_certificate_no: "",
    tds_certificate_date: "",
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
        .select("tds_applicable, default_tds_rate, tds_deduction_basis, tan_number")
        .eq("id", clientId)
        .maybeSingle();
      if (data) {
        setClientTds({
          tds_applicable: (data as any).tds_applicable || false,
          default_tds_rate: (data as any).default_tds_rate || 0,
          tds_deduction_basis: (data as any).tds_deduction_basis || "taxable_value",
          tan_number: (data as any).tan_number || "",
        });
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
        tds_rate: p.tds_rate || 0,
        tds_base_amount: p.tds_base_amount || 0,
        tds_certificate_no: p.tds_certificate_no || null,
        tds_certificate_date: p.tds_certificate_date || null,
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

  // TDS base amount: taxable value (sub_total) before GST
  const effectiveTdsBase = useMemo(() => {
    if (subTotal && subTotal > 0) return subTotal;
    // Fallback: estimate taxable value from total (assume 18% GST)
    return totalAmount / 1.18;
  }, [subTotal, totalAmount]);

  // Auto-calc TDS when rate changes
  const handleTdsRateChange = (rateStr: string) => {
    const rate = parseFloat(rateStr) || 0;
    const base = parseFloat(newPayment.tds_base_amount) || effectiveTdsBase;
    const tdsAmt = rate > 0 ? (base * rate / 100) : 0;
    setNewPayment(prev => ({
      ...prev,
      tds_rate: rateStr,
      tds_amount: tdsAmt > 0 ? tdsAmt.toFixed(2) : "",
    }));
  };

  // Auto-calc TDS when base changes
  const handleTdsBaseChange = (baseStr: string) => {
    const base = parseFloat(baseStr) || 0;
    const rate = parseFloat(newPayment.tds_rate) || 0;
    const tdsAmt = rate > 0 && base > 0 ? (base * rate / 100) : parseFloat(newPayment.tds_amount) || 0;
    setNewPayment(prev => ({
      ...prev,
      tds_base_amount: baseStr,
      tds_amount: rate > 0 ? tdsAmt.toFixed(2) : prev.tds_amount,
    }));
  };

  // Settlement summary for modal
  const modalSettlement = useMemo(() => {
    const cashReceived = parseFloat(newPayment.amount) || 0;
    const tdsDeducted = parseFloat(newPayment.tds_amount) || 0;
    const totalSettleThis = cashReceived + tdsDeducted;
    const remainingBalance = Math.max(balance - totalSettleThis, 0);
    return { cashReceived, tdsDeducted, totalSettleThis, remainingBalance };
  }, [newPayment.amount, newPayment.tds_amount, balance]);

  const handleAddPayment = async () => {
    const amount = parseFloat(newPayment.amount);
    const tdsAmount = parseFloat(newPayment.tds_amount) || 0;
    const tdsRate = parseFloat(newPayment.tds_rate) || 0;
    const tdsBase = parseFloat(newPayment.tds_base_amount) || (tdsAmount > 0 ? effectiveTdsBase : 0);
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
        tds_rate: tdsRate,
        tds_base_amount: tdsBase,
        tds_certificate_no: newPayment.tds_certificate_no?.trim() || null,
        tds_certificate_date: newPayment.tds_certificate_date || null,
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
        tds_rate: "",
        tds_base_amount: "",
        tds_amount: "",
        tds_certificate_no: "",
        tds_certificate_date: "",
        payment_date: new Date().toISOString().split('T')[0],
        method: "Bank Transfer",
        reference_no: "",
        notes: "",
      });
      setTdsEnabled(false);
      
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
    if (open && clientTds.tds_applicable) {
      setTdsEnabled(true);
      const rate = clientTds.default_tds_rate || 2;
      const base = effectiveTdsBase;
      const tdsAmt = (base * rate / 100);
      setNewPayment(prev => ({
        ...prev,
        tds_rate: rate.toString(),
        tds_base_amount: base.toFixed(2),
        tds_amount: tdsAmt.toFixed(2),
      }));
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
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Record Payment</DialogTitle>
                <DialogDescription>
                  Balance due: {formatINR(balance)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                {/* Amount Received */}
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
                </div>

                {/* TDS Section */}
                <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="tdsApplicable"
                      checked={tdsEnabled}
                      onCheckedChange={(checked) => {
                        setTdsEnabled(!!checked);
                        if (!checked) {
                          setNewPayment(prev => ({
                            ...prev,
                            tds_rate: "",
                            tds_base_amount: "",
                            tds_amount: "",
                            tds_certificate_no: "",
                            tds_certificate_date: "",
                          }));
                        } else if (clientTds.tds_applicable) {
                          const rate = clientTds.default_tds_rate || 2;
                          const base = effectiveTdsBase;
                          setNewPayment(prev => ({
                            ...prev,
                            tds_rate: rate.toString(),
                            tds_base_amount: base.toFixed(2),
                            tds_amount: (base * rate / 100).toFixed(2),
                          }));
                        }
                      }}
                    />
                    <Label htmlFor="tdsApplicable" className="font-medium cursor-pointer">
                      Client deducted TDS
                    </Label>
                    {clientTds.tds_applicable && (
                      <Badge variant="outline" className="text-xs">
                        Client default: {clientTds.default_tds_rate}%
                      </Badge>
                    )}
                  </div>

                  {tdsEnabled && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Info className="h-3 w-3" />
                        TDS is calculated on taxable value before GST
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="tdsRate">TDS Rate (%)</Label>
                          <Input
                            id="tdsRate"
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            placeholder="2"
                            value={newPayment.tds_rate}
                            onChange={(e) => handleTdsRateChange(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="tdsBase">TDS Base (Taxable Value)</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                            <Input
                              id="tdsBase"
                              type="number"
                              step="0.01"
                              className="pl-8"
                              placeholder={effectiveTdsBase.toFixed(2)}
                              value={newPayment.tds_base_amount}
                              onChange={(e) => handleTdsBaseChange(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="tdsAmount">TDS Amount (auto-calculated)</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                          <Input
                            id="tdsAmount"
                            type="number"
                            step="0.01"
                            className="pl-8"
                            value={newPayment.tds_amount}
                            onChange={(e) => setNewPayment({ ...newPayment, tds_amount: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="tdsCertNo">Certificate No.</Label>
                          <Input
                            id="tdsCertNo"
                            placeholder="Form 16A number"
                            value={newPayment.tds_certificate_no}
                            onChange={(e) => setNewPayment({ ...newPayment, tds_certificate_no: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="tdsCertDate">Certificate Date</Label>
                          <Input
                            id="tdsCertDate"
                            type="date"
                            value={newPayment.tds_certificate_date}
                            onChange={(e) => setNewPayment({ ...newPayment, tds_certificate_date: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Settlement Summary */}
                {(parseFloat(newPayment.amount) > 0 || parseFloat(newPayment.tds_amount) > 0) && (
                  <div className="border rounded-lg p-4 bg-accent/30 space-y-2">
                    <p className="font-medium text-sm mb-2">Settlement Summary</p>
                    <div className="grid grid-cols-2 gap-y-1 text-sm">
                      <span className="text-muted-foreground">Invoice Total</span>
                      <span className="text-right font-medium">{formatINR(totalAmount)}</span>
                      
                      {subTotal && subTotal > 0 && (
                        <>
                          <span className="text-muted-foreground">Taxable Value</span>
                          <span className="text-right">{formatINR(subTotal)}</span>
                        </>
                      )}
                      
                      <span className="text-muted-foreground">Already Settled</span>
                      <span className="text-right">{formatINR(totalSettled)}</span>

                      <Separator className="col-span-2 my-1" />
                      
                      <span className="text-muted-foreground">Cash Received</span>
                      <span className="text-right text-green-600 font-medium">{formatINR(modalSettlement.cashReceived)}</span>
                      
                      {tdsEnabled && modalSettlement.tdsDeducted > 0 && (
                        <>
                          <span className="text-muted-foreground">TDS Deducted</span>
                          <span className="text-right text-blue-600 font-medium">{formatINR(modalSettlement.tdsDeducted)}</span>
                        </>
                      )}
                      
                      <span className="text-muted-foreground font-medium">This Settlement</span>
                      <span className="text-right font-bold">{formatINR(modalSettlement.totalSettleThis)}</span>

                      <Separator className="col-span-2 my-1" />
                      
                      <span className="text-muted-foreground font-medium">Remaining Balance</span>
                      <span className={`text-right font-bold ${modalSettlement.remainingBalance > 0.01 ? 'text-orange-600' : 'text-green-600'}`}>
                        {formatINR(modalSettlement.remainingBalance)}
                      </span>
                    </div>
                    {modalSettlement.remainingBalance <= 0.01 && (
                      <p className="text-xs text-green-600 font-medium mt-2">✓ Invoice will be marked as Paid</p>
                    )}
                  </div>
                )}

                {/* Payment Details */}
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
                  {saving ? "Saving..." : "Record Payment"}
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
                        {payment.tds_amount > 0 ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                {formatINR(payment.tds_amount)}
                                {payment.tds_rate > 0 && <span className="text-xs ml-1">({payment.tds_rate}%)</span>}
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-xs space-y-1">
                                  {payment.tds_base_amount > 0 && <p>Base: {formatINR(payment.tds_base_amount)}</p>}
                                  {payment.tds_rate > 0 && <p>Rate: {payment.tds_rate}%</p>}
                                  {payment.tds_certificate_no && <p>Cert: {payment.tds_certificate_no}</p>}
                                  {payment.tds_certificate_date && <p>Cert Date: {formatDate(payment.tds_certificate_date)}</p>}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : "-"}
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
