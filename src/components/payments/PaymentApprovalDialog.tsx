import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Phone, Mail, Check, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface PaymentConfirmation {
  id: string;
  company_id: string | null;
  client_id: string;
  invoice_id: string | null;
  claimed_amount: number;
  claimed_method: string | null;
  claimed_reference: string | null;
  claimed_date: string | null;
  status: string;
  client_name?: string;
  invoice_no?: string;
}

interface PaymentApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  confirmation: PaymentConfirmation;
  onApproved: () => void;
}

export function PaymentApprovalDialog({
  open,
  onOpenChange,
  confirmation,
  onApproved,
}: PaymentApprovalDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Form state with defaults from claimed values
  const [amount, setAmount] = useState(confirmation.claimed_amount.toString());
  const [method, setMethod] = useState(confirmation.claimed_method || "UPI");
  const [reference, setReference] = useState(confirmation.claimed_reference || "");
  const [paymentDate, setPaymentDate] = useState(
    confirmation.claimed_date || format(new Date(), "yyyy-MM-dd")
  );
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);

  const handleApprove = async () => {
    // Validate
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: "Please enter a valid payment amount",
      });
      return;
    }

    if (!confirmation.invoice_id) {
      toast({
        variant: "destructive",
        title: "Missing Invoice",
        description: "This confirmation is not linked to an invoice",
      });
      return;
    }

    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Step 1: Create payment record
      const { data: paymentRecord, error: paymentError } = await supabase
        .from("payment_records")
        .insert({
          company_id: confirmation.company_id,
          invoice_id: confirmation.invoice_id,
          client_id: confirmation.client_id,
          amount: parsedAmount,
          method: method,
          reference_no: reference || null,
          payment_date: paymentDate,
          notes: `Approved from WhatsApp confirmation ${confirmation.id}`,
          created_by: user.id,
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Step 2: Get receipt that was auto-created by trigger
      // Wait a moment for trigger to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: receipt, error: receiptError } = await supabase
        .from("receipts")
        .select("*")
        .eq("payment_record_id", paymentRecord.id)
        .single();

      if (receiptError) {
        console.warn("Receipt not found immediately, may be created async:", receiptError);
      }

      // Step 3: Update confirmation with approval details
      const { error: updateError } = await supabase
        .from("payment_confirmations")
        .update({
          status: "Approved",
          approved_amount: parsedAmount,
          approved_method: method,
          approved_reference: reference || null,
          approved_date: paymentDate,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          payment_record_id: paymentRecord.id,
          receipt_id: receipt?.id || null,
          send_whatsapp: sendWhatsApp,
          send_email: sendEmail,
          // Set initial send status to pending if enabled
          whatsapp_send_status: sendWhatsApp ? "pending" : "not_sent",
          email_send_status: sendEmail ? "pending" : "not_sent",
        })
        .eq("id", confirmation.id)
        .eq("status", "Pending"); // Safety check

      if (updateError) throw updateError;

      // Step 4: Trigger receipt notification (async - don't wait)
      if (receipt && (sendWhatsApp || sendEmail)) {
        supabase.functions.invoke("send-receipt-notification", {
          body: {
            confirmationId: confirmation.id,
            receiptId: receipt.id,
            sendWhatsApp,
            sendEmail,
            isRetry: false,
          },
        }).then(result => {
          if (result.error) {
            console.error("Receipt notification error:", result.error);
          } else {
            console.log("Receipt notification sent:", result.data);
          }
        });
      }

      toast({
        title: "Payment Approved",
        description: `Payment of ₹${parsedAmount.toLocaleString("en-IN")} recorded. Receipt ${receipt?.receipt_no || ""} will be sent.`,
      });

      onApproved();
    } catch (error: any) {
      console.error("Approval error:", error);
      toast({
        variant: "destructive",
        title: "Approval Failed",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            Approve Payment Confirmation
          </DialogTitle>
          <DialogDescription>
            Review and approve this payment. A receipt will be generated and sent automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Client:</span>
              <span className="font-medium">{confirmation.client_name || "Unknown"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Invoice:</span>
              <span className="font-medium">{confirmation.invoice_no || confirmation.invoice_id}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Claimed Amount:</span>
              <span className="font-medium">₹{confirmation.claimed_amount.toLocaleString("en-IN")}</span>
            </div>
          </div>

          <Separator />

          {/* Editable Fields */}
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Approved Amount *</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="method">Payment Method *</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="NEFT">NEFT</SelectItem>
                  <SelectItem value="RTGS">RTGS</SelectItem>
                  <SelectItem value="IMPS">IMPS</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reference">Reference / UTR / Cheque No</Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Enter reference number"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="paymentDate">Payment Date *</Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
          </div>

          <Separator />

          {/* Send Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Send Receipt To Client</Label>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sendWhatsApp"
                checked={sendWhatsApp}
                onCheckedChange={(checked) => setSendWhatsApp(checked === true)}
              />
              <label
                htmlFor="sendWhatsApp"
                className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                <Phone className="h-4 w-4 text-green-600" />
                Send via WhatsApp
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="sendEmail"
                checked={sendEmail}
                onCheckedChange={(checked) => setSendEmail(checked === true)}
              />
              <label
                htmlFor="sendEmail"
                className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                <Mail className="h-4 w-4 text-blue-600" />
                Send via Email
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleApprove}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Approve & Send Receipt
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
