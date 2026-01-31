import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  MessageSquare, 
  Check, 
  X, 
  Download, 
  RefreshCw, 
  Mail, 
  Phone,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { PaymentApprovalDialog } from "./PaymentApprovalDialog";
import { format } from "date-fns";

interface PaymentConfirmation {
  id: string;
  company_id: string | null;
  client_id: string;
  invoice_id: string | null;
  whatsapp_message: string | null;
  whatsapp_media_url: string | null;
  whatsapp_from: string | null;
  submitted_at: string;
  claimed_amount: number;
  claimed_method: string | null;
  claimed_reference: string | null;
  claimed_date: string | null;
  status: string;
  approved_amount: number | null;
  approved_method: string | null;
  approved_reference: string | null;
  approved_date: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  payment_record_id: string | null;
  receipt_id: string | null;
  whatsapp_send_status: string;
  whatsapp_send_error: string | null;
  whatsapp_sent_at: string | null;
  email_send_status: string;
  email_send_error: string | null;
  email_sent_at: string | null;
  send_whatsapp: boolean;
  send_email: boolean;
  notes: string | null;
  // Joined data
  client_name?: string;
  invoice_no?: string;
  receipt_no?: string;
}

export function PaymentConfirmationQueue() {
  const { toast } = useToast();
  const [confirmations, setConfirmations] = useState<PaymentConfirmation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConfirmation, setSelectedConfirmation] = useState<PaymentConfirmation | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);

  useEffect(() => {
    loadConfirmations();
  }, []);

  const loadConfirmations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("payment_confirmations")
        .select(`
          *,
          clients:client_id (name),
          invoices:invoice_id (invoice_no),
          receipts:receipt_id (receipt_no)
        `)
        .order("submitted_at", { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((c: any) => ({
        ...c,
        client_name: c.clients?.name,
        invoice_no: c.invoices?.invoice_no,
        receipt_no: c.receipts?.receipt_no,
      }));

      setConfirmations(mapped);
    } catch (error: any) {
      console.error("Error loading confirmations:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load payment confirmations",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (confirmation: PaymentConfirmation) => {
    setSelectedConfirmation(confirmation);
    setDialogOpen(true);
  };

  const handleReject = async (confirmation: PaymentConfirmation, reason: string) => {
    try {
      const { error } = await supabase
        .from("payment_confirmations")
        .update({
          status: "Rejected",
          rejection_reason: reason,
        })
        .eq("id", confirmation.id);

      if (error) throw error;

      toast({
        title: "Confirmation Rejected",
        description: "The payment confirmation has been rejected",
      });

      loadConfirmations();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleRetry = async (confirmationId: string, channel: "whatsapp" | "email") => {
    try {
      setRetrying(`${confirmationId}-${channel}`);

      const confirmation = confirmations.find(c => c.id === confirmationId);
      if (!confirmation || !confirmation.receipt_id) {
        throw new Error("Receipt not found for this confirmation");
      }

      const { data, error } = await supabase.functions.invoke("send-receipt-notification", {
        body: {
          confirmationId,
          receiptId: confirmation.receipt_id,
          sendWhatsApp: channel === "whatsapp",
          sendEmail: channel === "email",
          isRetry: true,
        },
      });

      if (error) throw error;

      toast({
        title: "Retry Successful",
        description: `${channel === "whatsapp" ? "WhatsApp" : "Email"} notification resent`,
      });

      loadConfirmations();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Retry Failed",
        description: error.message,
      });
    } finally {
      setRetrying(null);
    }
  };

  const getSendStatusBadge = (status: string, channel: "whatsapp" | "email") => {
    const Icon = channel === "whatsapp" ? Phone : Mail;
    
    switch (status) {
      case "sent":
        return (
          <Badge variant="default" className="gap-1 bg-green-600">
            <CheckCircle2 className="h-3 w-3" />
            Sent
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Failed
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <Icon className="h-3 w-3" />
            Not Sent
          </Badge>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case "Approved":
        return <Badge variant="default" className="bg-green-600">Approved</Badge>;
      case "Rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Payment Confirmations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Payment Confirmations
          </CardTitle>
          <CardDescription>
            WhatsApp payment confirmations pending approval • Auto-sends receipt on approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          {confirmations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No payment confirmations</p>
              <p className="text-sm text-muted-foreground mt-2">
                WhatsApp payment confirmations will appear here
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {confirmations.map((confirmation) => (
                  <TableRow key={confirmation.id}>
                    <TableCell className="text-sm">
                      {format(new Date(confirmation.submitted_at), "dd MMM yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {confirmation.client_name || "Unknown"}
                    </TableCell>
                    <TableCell>
                      {confirmation.invoice_no || confirmation.invoice_id || "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₹{confirmation.claimed_amount.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell>{getStatusBadge(confirmation.status)}</TableCell>
                    <TableCell>
                      {confirmation.receipt_no ? (
                        <span className="text-sm font-mono">{confirmation.receipt_no}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getSendStatusBadge(confirmation.whatsapp_send_status, "whatsapp")}
                        {confirmation.whatsapp_send_status === "failed" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => handleRetry(confirmation.id, "whatsapp")}
                            disabled={retrying === `${confirmation.id}-whatsapp`}
                          >
                            <RefreshCw className={`h-3 w-3 ${retrying === `${confirmation.id}-whatsapp` ? "animate-spin" : ""}`} />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getSendStatusBadge(confirmation.email_send_status, "email")}
                        {confirmation.email_send_status === "failed" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => handleRetry(confirmation.id, "email")}
                            disabled={retrying === `${confirmation.id}-email`}
                          >
                            <RefreshCw className={`h-3 w-3 ${retrying === `${confirmation.id}-email` ? "animate-spin" : ""}`} />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {confirmation.status === "Pending" ? (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="default"
                            className="gap-1 bg-green-600 hover:bg-green-700"
                            onClick={() => handleApprove(confirmation)}
                          >
                            <Check className="h-3 w-3" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="gap-1"
                            onClick={() => {
                              const reason = prompt("Enter rejection reason:");
                              if (reason) handleReject(confirmation, reason);
                            }}
                          >
                            <X className="h-3 w-3" />
                            Reject
                          </Button>
                        </div>
                      ) : confirmation.receipt_id ? (
                        <Button size="sm" variant="outline" className="gap-1">
                          <Download className="h-3 w-3" />
                          Receipt
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedConfirmation && (
        <PaymentApprovalDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          confirmation={selectedConfirmation}
          onApproved={() => {
            loadConfirmations();
            setDialogOpen(false);
          }}
        />
      )}
    </>
  );
}
