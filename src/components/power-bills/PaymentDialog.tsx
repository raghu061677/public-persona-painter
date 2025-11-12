import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { 
  CreditCard, 
  Smartphone, 
  Building2, 
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billId: string;
  assetId: string;
  amount: number;
  consumerName?: string;
  serviceNumber?: string;
  uniqueServiceNumber?: string;
  onPaymentSuccess?: () => void;
}

export function PaymentDialog({
  open,
  onOpenChange,
  billId,
  assetId,
  amount,
  consumerName,
  serviceNumber,
  uniqueServiceNumber,
  onPaymentSuccess,
}: PaymentDialogProps) {
  const { user } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState<string>("UPI");
  const [upiId, setUpiId] = useState("");
  const [bankName, setBankName] = useState("");
  const [processing, setProcessing] = useState(false);

  const handlePayment = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to make a payment",
        variant: "destructive",
      });
      return;
    }

    // Validate inputs
    if (paymentMethod === "UPI" && !upiId) {
      toast({
        title: "Error",
        description: "Please enter your UPI ID",
        variant: "destructive",
      });
      return;
    }

    if (paymentMethod === "Net Banking" && !bankName) {
      toast({
        title: "Error",
        description: "Please select your bank",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);

    try {
      // Create payment transaction record
      const { data: transaction, error: transactionError } = await supabase
        .from("payment_transactions")
        .insert({
          bill_id: billId,
          asset_id: assetId,
          payment_method: paymentMethod,
          amount: amount,
          status: "Processing",
          upi_id: paymentMethod === "UPI" ? upiId : null,
          bank_name: paymentMethod === "Net Banking" ? bankName : null,
          initiated_by: user.id,
          metadata: {
            consumer_name: consumerName,
            service_number: serviceNumber,
            unique_service_number: uniqueServiceNumber,
          },
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Construct payment URL based on method
      let paymentUrl = '';
      
      if (uniqueServiceNumber) {
        // Use TGSPDCL payment portal with service number
        paymentUrl = `https://www.tssouthernpower.com/OnlineBill/QuickPay?uniqueServiceNo=${uniqueServiceNumber}`;
      } else {
        // Fallback to BillDesk portal
        paymentUrl = `https://www.billdesk.com/pgidsk/pgmerc/tsspdclpgi/TSSPDCLPGIDetails.jsp`;
      }

      // Add payment method preference as query parameter
      if (paymentMethod === "UPI") {
        paymentUrl += `&paymentMode=UPI`;
      } else if (paymentMethod === "Net Banking") {
        paymentUrl += `&paymentMode=NB`;
      }

      // Open payment gateway in new window
      const paymentWindow = window.open(paymentUrl, '_blank', 'width=800,height=600');

      toast({
        title: "Payment Portal Opened",
        description: "Complete the payment in the new window",
      });

      // Log activity
      await supabase.rpc('log_user_activity', {
        p_user_id: user.id,
        p_activity_type: 'payment_initiated',
        p_activity_description: `Initiated payment of ₹${amount} for asset ${assetId}`,
        p_metadata: {
          bill_id: billId,
          asset_id: assetId,
          payment_method: paymentMethod,
          amount: amount,
          transaction_id: transaction?.id,
        },
      });

      // Set up payment verification check
      const checkPaymentStatus = setInterval(async () => {
        if (paymentWindow?.closed) {
          clearInterval(checkPaymentStatus);
          
          // Show completion dialog
          const confirmed = window.confirm(
            "Did you complete the payment successfully?\n\n" +
            "Click OK if payment was successful, or Cancel to retry."
          );

          if (confirmed) {
            // Update transaction to success
            await supabase
              .from("payment_transactions")
              .update({
                status: "Success",
                completed_at: new Date().toISOString(),
              })
              .eq("id", transaction.id);

            // Update bill status
            await supabase
              .from("asset_power_bills")
              .update({
                payment_status: "Paid",
                paid: true,
                payment_date: new Date().toISOString(),
                paid_amount: amount,
              })
              .eq("id", billId);

            toast({
              title: "Payment Successful",
              description: "Your bill has been marked as paid",
            });

            onPaymentSuccess?.();
            onOpenChange(false);
          } else {
            // Update transaction to failed
            await supabase
              .from("payment_transactions")
              .update({
                status: "Failed",
                failure_reason: "User reported payment failure",
              })
              .eq("id", transaction.id);

            toast({
              title: "Payment Not Completed",
              description: "You can try again or contact support",
              variant: "destructive",
            });
          }
        }
      }, 1000);

      // Clear interval after 5 minutes
      setTimeout(() => clearInterval(checkPaymentStatus), 300000);

    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initiate payment",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Pay TGSPDCL Bill
          </DialogTitle>
          <DialogDescription>
            Choose your preferred payment method
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Bill Details */}
          <Alert>
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-semibold">Bill Amount: ₹{amount.toFixed(2)}</p>
                {consumerName && <p className="text-sm">Consumer: {consumerName}</p>}
                {serviceNumber && <p className="text-sm">Service No: {serviceNumber}</p>}
              </div>
            </AlertDescription>
          </Alert>

          {/* Payment Method Selection */}
          <Tabs value={paymentMethod} onValueChange={setPaymentMethod}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="UPI" className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                UPI
              </TabsTrigger>
              <TabsTrigger value="Net Banking" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Net Banking
              </TabsTrigger>
              <TabsTrigger value="Debit Card" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Card
              </TabsTrigger>
            </TabsList>

            <TabsContent value="UPI" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="upi-id">UPI ID</Label>
                <Input
                  id="upi-id"
                  placeholder="username@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Enter your UPI ID (e.g., yourname@paytm, yourname@googlepay)
                </p>
              </div>
              
              <Alert>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-xs">
                  Instant payment confirmation • Secure UPI payment gateway
                </AlertDescription>
              </Alert>
            </TabsContent>

            <TabsContent value="Net Banking" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bank-name">Select Bank</Label>
                <Select value={bankName} onValueChange={setBankName}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose your bank" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SBI">State Bank of India</SelectItem>
                    <SelectItem value="HDFC">HDFC Bank</SelectItem>
                    <SelectItem value="ICICI">ICICI Bank</SelectItem>
                    <SelectItem value="Axis">Axis Bank</SelectItem>
                    <SelectItem value="PNB">Punjab National Bank</SelectItem>
                    <SelectItem value="BOB">Bank of Baroda</SelectItem>
                    <SelectItem value="Canara">Canara Bank</SelectItem>
                    <SelectItem value="Union">Union Bank</SelectItem>
                    <SelectItem value="Other">Other Banks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Alert>
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-xs">
                  You will be redirected to your bank's secure login page
                </AlertDescription>
              </Alert>
            </TabsContent>

            <TabsContent value="Debit Card" className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-xs">
                  You will enter card details on TGSPDCL's secure payment gateway
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>

          {/* Payment Instructions */}
          <Alert>
            <AlertDescription className="text-xs space-y-1">
              <p className="font-semibold">Payment Instructions:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Click "Proceed to Payment" below</li>
                <li>Complete payment on TGSPDCL portal</li>
                <li>Confirm payment status when done</li>
                <li>Upload receipt if required</li>
              </ol>
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button 
              onClick={handlePayment}
              disabled={processing}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Proceed to Payment
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
