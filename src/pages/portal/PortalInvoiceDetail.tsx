import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useClientPortal } from "@/contexts/ClientPortalContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  ArrowLeft, 
  Download, 
  Receipt, 
  FileText,
  Calendar,
  IndianRupee,
  QrCode
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useReceiptGeneration } from "@/hooks/useReceiptGeneration";
import { logPortalAccess } from "@/utils/portalAccessLogger";

interface InvoiceItem {
  id: string;
  description: string;
  quantity?: number;
  rate?: number;
  rate_value?: number;
  amount?: number;
  base_amount?: number;
  hsn_sac_code?: string;
}

interface PaymentRecord {
  id: string;
  payment_date: string;
  amount: number;
  method?: string;
  payment_method?: string;
  reference_no?: string;
  receipt_no?: string;
}

export default function PortalInvoiceDetail() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const { portalUser } = useClientPortal();
  const { toast } = useToast();
  const { downloadReceiptByPaymentId, generating } = useReceiptGeneration();
  
  const [invoice, setInvoice] = useState<any>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

  useEffect(() => {
    if (portalUser && invoiceId) {
      loadInvoiceData();
      logPortalAccess(portalUser.client_id, 'view_invoice', 'invoice', invoiceId);
    }
  }, [portalUser, invoiceId]);

  const loadInvoiceData = async () => {
    if (!portalUser || !invoiceId) return;

    try {
      // Fetch invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .eq('client_id', portalUser.client_id)
        .single();

      if (invoiceError || !invoiceData) {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "Invoice not found or you don't have permission to view it",
        });
        navigate('/portal/invoices');
        return;
      }

      setInvoice(invoiceData);

      // Fetch invoice items
      const { data: itemsData } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('created_at');

      setItems(itemsData || []);

      // Fetch payment records
      const { data: paymentsData } = await supabase
        .from('payment_records')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('payment_date', { ascending: false });

      setPayments(paymentsData || []);

      // Fetch receipts
      const { data: receiptsData } = await supabase
        .from('receipts')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('receipt_date', { ascending: false });

      setReceipts(receiptsData || []);
    } catch (error) {
      console.error('Error loading invoice:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!invoice) return;
    setDownloadingInvoice(true);

    try {
      logPortalAccess(portalUser!.client_id, 'download_invoice', 'invoice', invoiceId!);

      const { renderInvoicePDF } = await import('@/lib/invoices/templates/registry');
      
      // Fetch client
      const { data: client } = await supabase
        .from('clients')
        .select('*')
        .eq('id', invoice.client_id)
        .single();

      // Fetch org settings
      const { data: orgSettings } = await supabase
        .from('organization_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      const invoiceData = {
        invoice,
        items,
        client: client || { name: invoice.client_name },
        campaign: null,
        company: orgSettings || {},
        orgSettings,
      };

      const pdfBlob = await renderInvoicePDF(invoiceData, invoice.pdf_template_key || 'default_existing');
      
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice-${invoice.invoice_no || invoice.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Downloaded",
        description: `Invoice ${invoice.invoice_no || invoice.id} downloaded`,
      });
    } catch (error: any) {
      console.error('Error downloading invoice:', error);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: error.message || "Failed to download invoice",
      });
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const handleDownloadReceipt = async (paymentId: string) => {
    if (portalUser) {
      logPortalAccess(portalUser.client_id, 'download_proof', 'receipt', paymentId);
    }
    await downloadReceiptByPaymentId(paymentId);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const getStatusVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid': return 'default';
      case 'overdue': return 'destructive';
      case 'partial': return 'secondary';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!invoice) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate('/portal/invoices')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Invoices
      </Button>

      {/* Invoice Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{invoice.invoice_no || invoice.id}</h1>
            <Badge variant={getStatusVariant(invoice.status)} className="text-sm">
              {invoice.status}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Issued on {new Date(invoice.invoice_date).toLocaleDateString('en-IN', { 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            })}
          </p>
        </div>
        <Button onClick={handleDownloadInvoice} disabled={downloadingInvoice}>
          <Download className={`h-4 w-4 mr-2 ${downloadingInvoice ? 'animate-spin' : ''}`} />
          {downloadingInvoice ? 'Downloading...' : 'Download Invoice PDF'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Due Date</p>
                <p className="font-semibold">
                  {new Date(invoice.due_date).toLocaleDateString('en-IN')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <IndianRupee className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="font-semibold">{formatCurrency(invoice.total_amount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Receipt className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Paid Amount</p>
                <p className="font-semibold text-green-600">
                  {formatCurrency(invoice.paid_amount || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={(invoice.balance_due || 0) > 0 ? 'border-orange-200 bg-orange-50/50' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <IndianRupee className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Balance Due</p>
                <p className={`font-semibold ${(invoice.balance_due || 0) > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {formatCurrency(invoice.balance_due || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50%]">Description</TableHead>
                <TableHead className="text-center">HSN/SAC</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.description}</TableCell>
                  <TableCell className="text-center">{item.hsn_sac_code || '-'}</TableCell>
                  <TableCell className="text-center">{item.quantity || 1}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.rate_value || item.rate || 0)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.base_amount || item.amount || 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Totals */}
          <div className="mt-6 flex justify-end">
            <div className="w-full md:w-72 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(invoice.subtotal || invoice.taxable_amount)}</span>
              </div>
              {invoice.cgst_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">CGST ({invoice.cgst_percent || 9}%)</span>
                  <span>{formatCurrency(invoice.cgst_amount)}</span>
                </div>
              )}
              {invoice.sgst_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">SGST ({invoice.sgst_percent || 9}%)</span>
                  <span>{formatCurrency(invoice.sgst_amount)}</span>
                </div>
              )}
              {invoice.igst_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">IGST ({invoice.igst_percent || 18}%)</span>
                  <span>{formatCurrency(invoice.igst_amount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatCurrency(invoice.total_amount)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No payments recorded yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => {
                  const receipt = receipts.find(r => r.payment_record_id === payment.id);
                  return (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {new Date(payment.payment_date).toLocaleDateString('en-IN')}
                      </TableCell>
                      <TableCell>{payment.method || payment.payment_method}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {payment.reference_no || '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {receipt ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadReceipt(payment.id)}
                            disabled={generating}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            {receipt.receipt_no}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payment QR (if balance due) */}
      {(invoice.balance_due || 0) > 0 && invoice.payment_qr_url && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Pay Now
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <p className="text-center text-muted-foreground">
              Scan the QR code to pay {formatCurrency(invoice.balance_due)}
            </p>
            <img 
              src={invoice.payment_qr_url} 
              alt="Payment QR Code" 
              className="w-48 h-48 border rounded-lg"
            />
            <p className="text-sm text-muted-foreground text-center">
              After payment, your receipt will be sent automatically
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
