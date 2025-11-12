import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, DollarSign } from "lucide-react";
import { formatINR } from "@/utils/finance";
import { formatDate } from "@/utils/plans";

interface PaymentTrackingProps {
  invoiceId: string;
  totalAmount: number;
  onPaymentAdded?: () => void;
}

export function PaymentTracking({ invoiceId, totalAmount, onPaymentAdded }: PaymentTrackingProps) {
  const { toast } = useToast();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [newPayment, setNewPayment] = useState({
    amount: "",
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: "bank_transfer",
    reference_number: "",
    notes: "",
  });

  useEffect(() => {
    fetchPayments();
  }, [invoiceId]);

  const fetchPayments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("invoice_payments" as any)
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("payment_date", { ascending: false }) as any;

    if (error) {
      console.error("Error fetching payments:", error);
    } else {
      setPayments(data || []);
    }
    setLoading(false);
  };

  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const balance = totalAmount - totalPaid;

  const handleAddPayment = async () => {
    if (!newPayment.amount || parseFloat(newPayment.amount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid payment amount",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("invoice_payments" as any)
        .insert({
          invoice_id: invoiceId,
          amount: parseFloat(newPayment.amount),
          payment_date: newPayment.payment_date,
          payment_method: newPayment.payment_method,
          reference_number: newPayment.reference_number || null,
          notes: newPayment.notes || null,
          created_by: user?.id,
        }) as any;

      if (error) throw error;

      // Update invoice balance
      const newBalance = balance - parseFloat(newPayment.amount);
      const newStatus = newBalance <= 0 ? "Paid" : ("Partial" as any);
      
      await supabase
        .from("invoices")
        .update({
          balance_due: newBalance,
          status: newStatus,
        })
        .eq("id", invoiceId);

      toast({
        title: "Payment added",
        description: "Payment has been recorded successfully",
      });

      setNewPayment({
        amount: "",
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: "bank_transfer",
        reference_number: "",
        notes: "",
      });
      
      setDialogOpen(false);
      fetchPayments();
      onPaymentAdded?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePayment = async (paymentId: string, amount: number) => {
    if (!confirm("Are you sure you want to delete this payment?")) return;

    try {
      const { error } = await supabase
        .from("invoice_payments" as any)
        .delete()
        .eq("id", paymentId) as any;

      if (error) throw error;

      // Update invoice balance
      const newBalance = balance + amount;
      const newStatus = newBalance >= totalAmount ? "Draft" : ("Partial" as any);
      
      await supabase
        .from("invoices")
        .update({
          balance_due: newBalance,
          status: newStatus,
        })
        .eq("id", invoiceId);

      toast({
        title: "Payment deleted",
        description: "Payment has been removed",
      });

      fetchPayments();
      onPaymentAdded?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              <CardTitle>Payment Tracking</CardTitle>
            </div>
            <CardDescription className="mt-1">
              Track all payments received for this invoice
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Payment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Payment</DialogTitle>
                <DialogDescription>
                  Add a new payment entry for this invoice
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="paymentDate">Payment Date</Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={newPayment.payment_date}
                    onChange={(e) => setNewPayment({ ...newPayment, payment_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select
                    value={newPayment.payment_method}
                    onValueChange={(value) => setNewPayment({ ...newPayment, payment_method: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="refNumber">Reference Number</Label>
                  <Input
                    id="refNumber"
                    placeholder="Transaction/Cheque number"
                    value={newPayment.reference_number}
                    onChange={(e) => setNewPayment({ ...newPayment, reference_number: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Input
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
          {/* Summary */}
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
              <p className="text-lg font-bold text-orange-600">{formatINR(balance)}</p>
            </div>
          </div>

          {/* Payments table */}
          {payments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDate(payment.payment_date)}</TableCell>
                    <TableCell className="font-medium">{formatINR(payment.amount)}</TableCell>
                    <TableCell className="capitalize">{payment.payment_method.replace('_', ' ')}</TableCell>
                    <TableCell>{payment.reference_number || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeletePayment(payment.id, payment.amount)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
