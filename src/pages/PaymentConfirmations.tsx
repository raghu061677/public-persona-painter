import { PaymentConfirmationQueue } from "@/components/payments/PaymentConfirmationQueue";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function PaymentConfirmations() {
  return (
    <div className="h-full flex flex-col space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payment Confirmations</h1>
        <p className="text-muted-foreground">
          Review and approve WhatsApp payment confirmations • Auto-generates receipts
        </p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Safety First</AlertTitle>
        <AlertDescription>
          Payments are <strong>never</strong> auto-approved. Each confirmation requires manual review 
          before recording as a payment. Receipts are auto-sent via WhatsApp & Email on approval.
        </AlertDescription>
      </Alert>

      <PaymentConfirmationQueue />
    </div>
  );
}
