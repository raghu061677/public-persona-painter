import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";
import { PaymentDialog } from "./PaymentDialog";

interface PayBillButtonProps {
  billId: string;
  assetId: string;
  amount: number;
  consumerName?: string | null;
  serviceNumber?: string | null;
  uniqueServiceNumber?: string | null;
  paymentLink?: string | null;
  size?: "default" | "sm" | "lg" | "icon";
  onPaymentSuccess?: () => void;
}

export function PayBillButton({ 
  billId,
  assetId,
  amount,
  consumerName,
  serviceNumber, 
  uniqueServiceNumber, 
  paymentLink,
  size = "sm",
  onPaymentSuccess,
}: PayBillButtonProps) {
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  return (
    <>
      <Button 
        onClick={() => setShowPaymentDialog(true)}
        variant="default"
        size={size}
        disabled={!serviceNumber && !uniqueServiceNumber}
      >
        <CreditCard className="h-4 w-4 mr-2" />
        Pay Bill
      </Button>

      <PaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        billId={billId}
        assetId={assetId}
        amount={amount}
        consumerName={consumerName || undefined}
        serviceNumber={serviceNumber || undefined}
        uniqueServiceNumber={uniqueServiceNumber || undefined}
        onPaymentSuccess={onPaymentSuccess}
      />
    </>
  );
}
