import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatINR, getInvoiceStatusColor } from "@/utils/finance";
import { formatDate } from "@/utils/plans";
import { InvoicePDFExport } from "@/components/invoices/InvoicePDFExport";
import { PaymentTracking } from "@/components/invoices/PaymentTracking";

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    fetchInvoice();
  }, [id]);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      setIsAdmin(data?.role === 'admin' || data?.role === 'finance');
    }
  };

  const fetchInvoice = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch invoice details",
        variant: "destructive",
      });
      navigate('/finance/invoices');
    } else {
      setInvoice(data);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;

    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete invoice",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Invoice deleted successfully",
      });
      navigate('/finance/invoices');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading invoice...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Invoice not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/finance/invoices')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{invoice.id}</h1>
              <p className="text-muted-foreground mt-1">
                Invoice for {invoice.client_name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={getInvoiceStatusColor(invoice.status)}>
              {invoice.status}
            </Badge>
            <InvoicePDFExport invoiceId={invoice.id} />
            {isAdmin && (
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
        </div>

        {/* Invoice Details */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoice Date:</span>
                <span className="font-medium">{formatDate(invoice.invoice_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due Date:</span>
                <span className="font-medium">{formatDate(invoice.due_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Campaign:</span>
                <span className="font-medium">{(invoice as any).campaign_id || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimation:</span>
                <span className="font-medium">{invoice.estimation_id || "N/A"}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">{formatINR(invoice.sub_total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST ({invoice.gst_percent}%):</span>
                <span className="font-medium">{formatINR(invoice.gst_amount)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total Amount:</span>
                <span>{formatINR(invoice.total_amount)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-orange-600">
                <span>Balance Due:</span>
                <span>{formatINR(invoice.balance_due)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Line Items */}
        {(invoice as any).line_items && (invoice as any).line_items.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
              <CardDescription>Detailed breakdown of invoice items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(invoice as any).line_items.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{item.description}</p>
                      <p className="text-sm text-muted-foreground">
                        Qty: {item.quantity} × {formatINR(item.rate)}
                      </p>
                    </div>
                    <span className="font-bold">{formatINR(item.amount)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Tracking */}
        <PaymentTracking 
          invoiceId={invoice.id} 
          totalAmount={invoice.total_amount}
          onPaymentAdded={fetchInvoice}
        />

        {/* Notes */}
        {invoice.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{invoice.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
