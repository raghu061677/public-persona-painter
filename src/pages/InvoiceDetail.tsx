import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Trash2, Lock, FileText, Send } from "lucide-react";
import { ShareInvoiceButton } from "@/components/invoices/ShareInvoiceButton";
import { toast } from "@/hooks/use-toast";
import { formatINR, getInvoiceStatusColor } from "@/utils/finance";
import { formatDate } from "@/utils/plans";
import { InvoicePDFExport } from "@/components/invoices/InvoicePDFExport";
import { PaymentRecordingPanel } from "@/components/finance/PaymentRecordingPanel";
import { PaymentTermsEditor } from "@/components/invoices/PaymentTermsEditor";
import { InvoiceTypeSelector } from "@/components/invoices/InvoiceTypeSelector";
import { InvoiceTemplateZoho } from "@/components/invoices/InvoiceTemplateZoho";
import { CreditNotesList } from "@/components/finance/CreditNotesList";
import { CreateCreditNoteDialog } from "@/components/finance/CreateCreditNoteDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function InvoiceDetail() {
  const { id, encodedId } = useParams();
  const invoiceId = encodedId ? decodeURIComponent(encodedId) : id;
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [creditNoteDialogOpen, setCreditNoteDialogOpen] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    fetchInvoice();
  }, [invoiceId]);

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
      .eq('id', invoiceId)
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
      .eq('id', invoiceId);

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

  const handleMarkAsSent = async () => {
    if (!confirm("Mark this invoice as 'Sent' to client? This will lock the invoice from further edits.")) return;

    const { error } = await supabase
      .from('invoices')
      .update({ status: 'Sent', updated_at: new Date().toISOString() })
      .eq('id', invoiceId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update invoice status",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Invoice marked as Sent",
      });
      fetchInvoice();
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

  // Invoice is locked if status is not Draft
  const isLocked = invoice.status !== 'Draft';
  const canEdit = isAdmin && !isLocked;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 space-y-6">
        {/* Finalize Lock Warning */}
        {isLocked && (
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              This invoice is finalized ({invoice.status}) and cannot be edited. To make changes, create a credit note or adjustment.
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/finance/invoices')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                {invoice.invoice_no || invoice.id}
                {isLocked && <Lock className="h-5 w-5 text-muted-foreground" />}
              </h1>
              <p className="text-muted-foreground mt-1">
                {invoice.invoice_type === 'PROFORMA' ? 'Proforma Invoice' : 'Tax Invoice'} for {invoice.client_name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={getInvoiceStatusColor(invoice.status)}>
              {invoice.status}
            </Badge>
            <InvoicePDFExport invoiceId={invoice.id} clientName={invoice.client_name} />
            {isAdmin && invoice.status !== 'Draft' && (
              <ShareInvoiceButton invoiceId={invoice.id} invoiceNo={invoice.invoice_no} />
            )}
            {isAdmin && invoice.status === 'Draft' && (
              <Button onClick={handleMarkAsSent} className="bg-primary">
                <Send className="mr-2 h-4 w-4" />
                Mark as Sent
              </Button>
            )}
            {isAdmin && invoice.status === 'Draft' && (
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
            {isAdmin && invoice.status !== 'Draft' && (
              <Button variant="outline" onClick={() => setCreditNoteDialogOpen(true)}>
                <FileText className="mr-2 h-4 w-4" />
                Credit Note
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="preview" className="w-full">
          <TabsList>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="credits">Credit Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="mt-6">
            <Card>
              <CardContent className="p-0">
                <InvoiceTemplateZoho invoiceId={invoice.id} readOnly />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="mt-6 space-y-6">
            {isLocked && (
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  Settings are locked because this invoice has been finalized.
                </AlertDescription>
              </Alert>
            )}
            <div className="grid md:grid-cols-2 gap-6">
              <InvoiceTypeSelector
                invoiceId={invoice.id}
                currentType={invoice.invoice_type || 'TAX_INVOICE'}
                onUpdate={() => fetchInvoice()}
                readOnly={!canEdit}
              />
              <PaymentTermsEditor
                invoiceId={invoice.id}
                currentTermsMode={invoice.terms_mode || 'DUE_ON_RECEIPT'}
                currentTermsDays={invoice.terms_days || 0}
                invoiceDate={invoice.invoice_date}
                dueDate={invoice.due_date}
                invoiceType={invoice.invoice_type || 'TAX_INVOICE'}
                onUpdate={() => fetchInvoice()}
                readOnly={!canEdit}
              />
            </div>

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
          </TabsContent>

          <TabsContent value="payments" className="mt-6">
            <PaymentRecordingPanel 
              invoiceId={invoice.id} 
              totalAmount={invoice.total_amount}
              balanceDue={invoice.balance_due}
              paidAmount={invoice.paid_amount}
              status={invoice.status}
              clientId={invoice.client_id}
              campaignId={invoice.campaign_id}
              onPaymentAdded={fetchInvoice}
            />
          </TabsContent>

          <TabsContent value="credits" className="mt-6">
            <CreditNotesList 
              invoiceId={invoice.id} 
              onCreditNoteChange={fetchInvoice} 
            />
          </TabsContent>
        </Tabs>

        {/* Credit Note Dialog */}
        {invoice && invoice.status !== 'Draft' && (
          <CreateCreditNoteDialog
            open={creditNoteDialogOpen}
            onOpenChange={setCreditNoteDialogOpen}
            invoice={{
              id: invoice.id,
              invoice_no: invoice.invoice_no,
              client_id: invoice.client_id,
              company_id: invoice.company_id,
              total_amount: invoice.total_amount,
              balance_due: invoice.balance_due,
              gst_mode: invoice.gst_mode,
            }}
            onCreditNoteCreated={fetchInvoice}
          />
        )}
      </div>
    </div>
  );
}
