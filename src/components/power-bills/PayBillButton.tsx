import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface PayBillButtonProps {
  serviceNumber?: string | null;
  uniqueServiceNumber?: string | null;
  paymentLink?: string | null;
  size?: "default" | "sm" | "lg" | "icon";
}

export function PayBillButton({ 
  serviceNumber, 
  uniqueServiceNumber, 
  paymentLink,
  size = "sm"
}: PayBillButtonProps) {
  const handlePayBill = () => {
    const billDeskUrl = paymentLink || 
      `https://www.billdesk.com/pgidsk/pgmerc/tsspdclpgi/TSSPDCLPGIDetails.jsp`;
    
    window.open(billDeskUrl, '_blank');
    
    toast({
      title: "Payment Portal Opened",
      description: "Please complete payment and upload receipt after payment",
    });
  };

  return (
    <Button 
      onClick={handlePayBill}
      variant="default"
      size={size}
      disabled={!serviceNumber && !uniqueServiceNumber}
    >
      <ExternalLink className="h-4 w-4 mr-2" />
      Pay via BillDesk
    </Button>
  );
}
