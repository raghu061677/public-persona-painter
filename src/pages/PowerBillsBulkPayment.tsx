import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/mediaAssets";
import { format } from "date-fns";
import { CreditCard, ExternalLink, Loader2, Upload } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PendingBill {
  id: string;
  asset_id: string;
  service_number: string;
  unique_service_number: string;
  consumer_name: string;
  bill_month: string;
  bill_amount: number;
  location: string;
}

export default function PowerBillsBulkPayment() {
  const { isAdmin } = useAuth();
  const [bills, setBills] = useState<PendingBill[]>([]);
  const [selectedBills, setSelectedBills] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [paymentDate, setPaymentDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      fetchPendingBills();
    }
  }, [isAdmin]);

  const fetchPendingBills = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("asset_power_bills")
        .select(`
          id,
          asset_id,
          service_number,
          unique_service_number,
          consumer_name,
          bill_month,
          bill_amount,
          media_assets!inner (
            location
          )
        `)
        .eq("payment_status", "Pending")
        .order("bill_month", { ascending: false });

      if (error) throw error;

      const formattedBills = data?.map((bill: any) => ({
        id: bill.id,
        asset_id: bill.asset_id,
        service_number: bill.service_number,
        unique_service_number: bill.unique_service_number,
        consumer_name: bill.consumer_name,
        bill_month: bill.bill_month,
        bill_amount: Number(bill.bill_amount),
        location: bill.media_assets?.location || bill.asset_id,
      })) || [];

      setBills(formattedBills);
    } catch (error) {
      console.error("Error fetching bills:", error);
      toast.error("Failed to fetch pending bills");
    } finally {
      setLoading(false);
    }
  };

  const toggleBillSelection = (billId: string) => {
    const newSelection = new Set(selectedBills);
    if (newSelection.has(billId)) {
      newSelection.delete(billId);
    } else {
      newSelection.add(billId);
    }
    setSelectedBills(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedBills.size === bills.length) {
      setSelectedBills(new Set());
    } else {
      setSelectedBills(new Set(bills.map(b => b.id)));
    }
  };

  const getTotalAmount = () => {
    return bills
      .filter(b => selectedBills.has(b.id))
      .reduce((sum, b) => sum + b.bill_amount, 0);
  };

  const handleBulkPayment = async () => {
    if (selectedBills.size === 0) {
      toast.error("Please select at least one bill to pay");
      return;
    }

    setProcessing(true);

    try {
      const selectedBillsData = bills.filter(b => selectedBills.has(b.id));
      
      // Open TGSPDCL payment portal (bulk payment not directly supported by TGSPDCL)
      // In production, you would integrate with a payment gateway
      const firstBill = selectedBillsData[0];
      const paymentUrl = `https://www.tssouthernpower.com/OnlineBill/QuickPay?uniqueServiceNo=${firstBill.unique_service_number}`;
      window.open(paymentUrl, '_blank');

      toast.info(
        `Redirected to payment portal. ${selectedBills.size} bills selected totaling ${formatCurrency(getTotalAmount())}`,
        { duration: 5000 }
      );

      // After payment, user can mark bills as paid manually or use the capture-bill-receipt function
    } catch (error) {
      console.error("Error processing bulk payment:", error);
      toast.error("Failed to process bulk payment");
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmBulkPayment = async () => {
    if (selectedBills.size === 0) {
      toast.error("Please select at least one bill");
      return;
    }

    setProcessing(true);
    const selectedBillsData = bills.filter(b => selectedBills.has(b.id));
    let successCount = 0;
    let failCount = 0;
    let receiptUrl: string | null = null;

    try {
      // Upload receipt if provided
      if (receiptFile) {
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `bulk-payment-${Date.now()}.${fileExt}`;
        const filePath = `power-bills/receipts/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('client-documents')
          .upload(filePath, receiptFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('client-documents')
          .getPublicUrl(filePath);

        receiptUrl = publicUrl;
      }

      // Update each selected bill
      for (const bill of selectedBillsData) {
        try {
          const { error } = await supabase
            .from('asset_power_bills')
            .update({
              payment_status: 'Paid',
              paid_amount: bill.bill_amount,
              payment_date: paymentDate,
              paid_receipt_url: receiptUrl,
              updated_at: new Date().toISOString(),
            })
            .eq('id', bill.id);

          if (error) throw error;
          successCount++;
        } catch (error) {
          console.error(`Failed to process bill ${bill.id}:`, error);
          failCount++;
        }
      }

      toast.success(
        `Bulk payment processed: ${successCount} successful, ${failCount} failed`,
        { duration: 5000 }
      );

      // Reset and refresh
      setShowReceiptDialog(false);
      setReceiptFile(null);
      fetchPendingBills();
      setSelectedBills(new Set());
    } catch (error) {
      console.error("Error in bulk payment processing:", error);
      toast.error("Failed to complete bulk payment processing");
    } finally {
      setProcessing(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex-1 p-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Only administrators can access bulk payment processing.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 p-8">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Bulk Power Bill Payment</h2>
          <p className="text-muted-foreground">
            Select multiple bills for batch payment processing
          </p>
        </div>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Selected Bills Summary</CardTitle>
            <Badge variant={selectedBills.size > 0 ? "default" : "secondary"}>
              {selectedBills.size} of {bills.length} selected
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-3xl font-bold">{formatCurrency(getTotalAmount())}</p>
            </div>
            <div className="space-x-2">
              <Button
                onClick={handleBulkPayment}
                disabled={selectedBills.size === 0 || processing}
                className="bg-green-600 hover:bg-green-700"
              >
                {processing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="mr-2 h-4 w-4" />
                )}
                Pay Selected Bills
                <ExternalLink className="ml-2 h-3 w-3" />
              </Button>
              
              <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
                <DialogTrigger asChild>
                  <Button
                    disabled={selectedBills.size === 0 || processing}
                    variant="outline"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Mark as Paid
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm Bulk Payment</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="payment-date">Payment Date</Label>
                      <Input
                        id="payment-date"
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="receipt">Payment Receipt (Optional)</Label>
                      <Input
                        id="receipt"
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                      />
                      {receiptFile && (
                        <p className="text-sm text-muted-foreground">
                          Selected: {receiptFile.name}
                        </p>
                      )}
                    </div>
                    <div className="bg-muted p-3 rounded-lg">
                      <p className="text-sm font-medium">Summary</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedBills.size} bills • Total: {formatCurrency(getTotalAmount())}
                      </p>
                    </div>
                    <Button
                      onClick={handleConfirmBulkPayment}
                      disabled={processing}
                      className="w-full"
                    >
                      {processing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Confirm Payment
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bills Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Bills</CardTitle>
        </CardHeader>
        <CardContent>
          {bills.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No pending bills found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedBills.size === bills.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Asset ID</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Consumer Name</TableHead>
                  <TableHead>Service No.</TableHead>
                  <TableHead>Unique Service No.</TableHead>
                  <TableHead>Bill Month</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedBills.has(bill.id)}
                        onCheckedChange={() => toggleBillSelection(bill.id)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm">{bill.asset_id}</TableCell>
                    <TableCell>{bill.location}</TableCell>
                    <TableCell>{bill.consumer_name}</TableCell>
                    <TableCell className="font-mono text-xs">{bill.service_number}</TableCell>
                    <TableCell className="font-mono text-xs">{bill.unique_service_number}</TableCell>
                    <TableCell>
                      {format(new Date(bill.bill_month), 'MMM yyyy')}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(bill.bill_amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
