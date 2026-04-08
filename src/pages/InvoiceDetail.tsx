import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ModuleGuard } from "@/components/rbac/ModuleGuard";
import { ActionGuard } from "@/components/rbac/ActionGuard";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Trash2, Lock, FileText, Send, Info, ShieldCheck, Save, Ban } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ShareInvoiceButton } from "@/components/invoices/ShareInvoiceButton";
import { toast } from "@/hooks/use-toast";
import { formatINR, getInvoiceStatusColor, isDraftInvoiceId, finalizeInvoiceNumber } from "@/utils/finance";
import { formatDate } from "@/utils/plans";
import { InvoicePDFExport } from "@/components/invoices/InvoicePDFExport";
import { PaymentRecordingPanel } from "@/components/finance/PaymentRecordingPanel";
import { PaymentTermsEditor } from "@/components/invoices/PaymentTermsEditor";
import { InvoiceTypeSelector } from "@/components/invoices/InvoiceTypeSelector";
import { InvoiceTemplateZoho } from "@/components/invoices/InvoiceTemplateZoho";
import { InvoiceMetadataEditor } from "@/components/invoices/InvoiceMetadataEditor";
import { CreditNotesList } from "@/components/finance/CreditNotesList";
import { CreateCreditNoteDialog } from "@/components/finance/CreateCreditNoteDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function InvoiceDetail() {
  const { id, encodedId, '*': wildcardPath } = useParams();
  const location = useLocation();
  // Support 3 route patterns:
  // 1. /invoices/view/:encodedId (encoded, preferred)
  // 2. /invoices/:id (simple IDs without slashes)
  // 3. /invoices/* (catch-all for unencoded IDs with slashes like INV/2026-27/0002)
  const invoiceId = encodedId ? decodeURIComponent(encodedId) : id || wildcardPath || null;
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [creditNoteDialogOpen, setCreditNoteDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [previewNumber, setPreviewNumber] = useState<string | null>(null);

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
      // Fetch preview number for draft invoices
      if (data && isDraftInvoiceId(data.id)) {
        fetchPreviewNumber(data.company_id, data.gst_percent, data.invoice_date);
      }
    }
    setLoading(false);
  };

  const fetchPreviewNumber = async (companyId: string, gstPercent: number, invoiceDate?: string) => {
    try {
      // Use ?? instead of || so that 0% GST is preserved (0 is falsy with ||)
      const rpcParams = {
        p_company_id: companyId,
        p_gst_rate: gstPercent ?? 18,
        ...(invoiceDate ? { p_invoice_date: invoiceDate.split('T')[0] } : {}),
      };
      const { data, error } = await supabase.rpc('preview_next_invoice_number', rpcParams as any);
      if (!error && data) {
        setPreviewNumber(data);
      }
    } catch {
      // Non-critical, ignore
    }
  };

  const handleDelete = async () => {
    if (!invoice) return;
    // Only allow deleting draft invoices
    if (!isDraftInvoiceId(invoice.id) && invoice.status !== 'Draft') {
      toast({
        title: "Cannot Delete",
        description: "Finalized invoices cannot be deleted. Use Credit Notes instead.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm("Are you sure you want to delete this draft invoice? This action cannot be undone.")) return;

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
        description: "Draft invoice deleted successfully",
      });
      navigate('/admin/invoices');
    }
  };

  const handleMarkAsSent = async () => {
    if (!invoice) return;
    
    const isDraft = isDraftInvoiceId(invoice.id);
    const confirmMsg = isDraft
      ? `This will assign permanent invoice number${previewNumber ? ` (${previewNumber})` : ''} and lock the invoice from further financial edits. This action cannot be undone. Continue?`
      : "Mark this invoice as 'Sent' to client? This will lock the invoice from further edits.";
    
    if (!confirm(confirmMsg)) return;

    try {
      if (isDraft) {
        // Finalize: assign permanent number via atomic counter
        const gstRate = invoice.gst_percent || 0;
        const permanentId = await finalizeInvoiceNumber(supabase, invoice.id, gstRate, invoice.company_id);
        
        toast({
          title: "Invoice Finalized",
          description: `Permanent number assigned: ${permanentId}`,
        });
        
        // Navigate to the new permanent URL
        navigate(`/admin/invoices/view/${encodeURIComponent(permanentId)}`, { replace: true });
      } else {
        // Already has permanent number, just update status
        const { error } = await supabase
          .from('invoices')
          .update({ status: 'Sent', updated_at: new Date().toISOString() })
          .eq('id', invoiceId);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Invoice marked as Sent",
        });
        fetchInvoice();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update invoice status",
        variant: "destructive",
      });
    }
  };

  const handleCancelInvoice = async () => {
    if (!invoice || !cancelReason.trim()) {
      toast({ title: "Error", description: "Please provide a cancellation reason", variant: "destructive" });
      return;
    }
    setCancelling(true);
    try {
      // Pre-validation: check status is not already terminal
      if (['Cancelled', 'Paid', 'Fully Credited'].includes(invoice.status)) {
        throw new Error(`Cannot cancel — invoice status is already "${invoice.status}".`);
      }
      // Pre-validation: check paid_amount is zero or negligible
      if ((invoice.paid_amount || 0) > 1) {
        throw new Error(`Cannot cancel — invoice has ₹${invoice.paid_amount} paid. Reverse payments first.`);
      }
      // Safety check: no payments linked
      const { data: payments } = await supabase
        .from('payment_records')
        .select('id')
        .eq('invoice_id', invoice.id)
        .limit(1);
      if (payments && payments.length > 0) {
        throw new Error("Cannot cancel — this invoice has linked payment records. Delete payments first.");
      }
      // Safety check: no credit notes linked
      const { data: credits } = await supabase
        .from('credit_notes')
        .select('id')
        .eq('invoice_id', invoice.id)
        .limit(1);
      if (credits && credits.length > 0) {
        throw new Error("Cannot cancel — this invoice has linked credit notes.");
      }
      // Build structured cancellation note with ISO date and user role
      const cancelDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const userRole = roles.length > 0 ? roles[0] : 'user';
      const existingNotes = invoice.notes || '';
      const cancellationBlock = [
        `[Cancelled on ${cancelDate} by ${userRole}]`,
        `Reason: ${cancelReason.trim()}`,
        `Replaced by: (to be generated from campaign billing tab)`
      ].join('\n');
      const updatedNotes = existingNotes
        ? `${existingNotes}\n\n${cancellationBlock}`
        : cancellationBlock;
      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'Cancelled',
          balance_due: 0,
          notes: updatedNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoice.id);
      if (error) throw error;
      toast({ title: "Invoice Cancelled", description: `${invoice.id} has been cancelled and excluded from receivables.` });
      setCancelDialogOpen(false);
      setCancelReason('');
      fetchInvoice();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to cancel invoice", variant: "destructive" });
    } finally {
      setCancelling(false);
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

  const isDraft = isDraftInvoiceId(invoice.id);
  // Invoice is locked once finalized (not Draft status and not a draft ID)
  const isFinalized = !isDraft && invoice.status !== 'Draft';
  const canEdit = isAdmin && !isFinalized;
  const creditedAmount = invoice.credited_amount || 0;
  const effectiveBalance = (invoice.total_amount || 0) - creditedAmount - (invoice.paid_amount || 0);

  return (
    <ModuleGuard module="finance">
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 space-y-6">
        {/* Draft Invoice Number Preview */}
        {isDraft && previewNumber && (
          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              <strong>Next Invoice Number:</strong> {previewNumber}
              <span className="block text-xs mt-1 text-blue-600 dark:text-blue-400">
                Finalizing this invoice will assign this permanent number and lock financial edits. 
                If another invoice is finalized first, the actual number may differ.
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Finalized Lock Warning */}
        {isFinalized && (
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              <strong>Invoice Finalized</strong> — This invoice is locked ({invoice.status}). 
              Financial fields cannot be edited. To make corrections, create a Credit Note.
              {creditedAmount > 0 && (
                <span className="block mt-1">
                  Credits Applied: {formatINR(creditedAmount)} | Effective Balance: {formatINR(Math.max(0, effectiveBalance))}
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/invoices')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                {isDraft ? (
                  <span className="text-muted-foreground">Draft Invoice</span>
                ) : (
                  invoice.id
                )}
                {isFinalized && <ShieldCheck className="h-5 w-5 text-green-600" />}
              </h1>
              <p className="text-muted-foreground mt-1">
                {isDraft && <span className="text-xs font-mono mr-2">({invoice.id})</span>}
                {invoice.invoice_type === 'PROFORMA' ? 'Proforma Invoice' : 'Tax Invoice'} for {invoice.client_name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={getInvoiceStatusColor(invoice.status)}>
              {invoice.status}
            </Badge>
            <InvoicePDFExport invoiceId={invoice.id} clientName={invoice.client_name} />
            <ActionGuard module="finance" action="edit">
            {isAdmin && isFinalized && (
              <ShareInvoiceButton invoiceId={invoice.id} invoiceNo={invoice.id} />
            )}
            {isAdmin && !isFinalized && invoice.status === 'Draft' && (
              <Button onClick={handleMarkAsSent} className="bg-primary">
                <Send className="mr-2 h-4 w-4" />
                {isDraft ? 'Finalize & Send' : 'Mark as Sent'}
              </Button>
            )}
            </ActionGuard>
            <ActionGuard module="finance" action="delete">
            {isAdmin && isDraft && (
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Draft
              </Button>
            )}
            </ActionGuard>
            <ActionGuard module="finance" action="approve">
            {isAdmin && isFinalized && !['Fully Credited', 'Cancelled'].includes(invoice.status) && (
              <Button variant="outline" onClick={() => setCreditNoteDialogOpen(true)}>
                <FileText className="mr-2 h-4 w-4" />
                Credit Note
              </Button>
            )}
            </ActionGuard>
            {/* Cancel Invoice — only for unpaid finalized invoices */}
            <ActionGuard module="finance" action="delete">
            {isAdmin && isFinalized && !['Cancelled', 'Paid', 'Fully Credited'].includes(invoice.status) && (invoice.paid_amount || 0) <= 1 && (
              <Button variant="destructive" onClick={() => setCancelDialogOpen(true)}>
                <Ban className="mr-2 h-4 w-4" />
                Cancel Invoice
              </Button>
            )}
            </ActionGuard>
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
            {isFinalized && (
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  Financial fields are locked. You can still edit Notes, PO Reference, and Due Date below.
                </AlertDescription>
              </Alert>
            )}
            <div className="grid md:grid-cols-2 gap-6">
              <InvoiceTypeSelector
                invoiceId={invoice.id}
                currentType={invoice.invoice_type || 'TAX_INVOICE'}
                onUpdate={() => fetchInvoice()}
                readOnly={false}
              />
              <PaymentTermsEditor
                invoiceId={invoice.id}
                currentTermsMode={invoice.terms_mode || 'DUE_ON_RECEIPT'}
                currentTermsDays={invoice.terms_days || 0}
                invoiceDate={invoice.invoice_date}
                dueDate={invoice.due_date}
                invoiceType={invoice.invoice_type || 'TAX_INVOICE'}
                onUpdate={() => fetchInvoice()}
                readOnly={false}
              />
            </div>

            {/* Editable metadata fields - always available */}
            <InvoiceMetadataEditor
              invoiceId={invoice.id}
              notes={invoice.notes || ''}
              poNumber={invoice.client_po_number || ''}
              poDate={invoice.client_po_date || ''}
              dueDate={invoice.due_date || ''}
              onUpdate={fetchInvoice}
            />
          </TabsContent>

          <TabsContent value="payments" className="mt-6">
            <PaymentRecordingPanel 
              invoiceId={invoice.id} 
              totalAmount={invoice.total_amount}
              subTotal={invoice.sub_total || undefined}
              balanceDue={invoice.balance_due}
              paidAmount={invoice.paid_amount}
              creditedAmount={invoice.credited_amount || 0}
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
        {invoice && isFinalized && !['Fully Credited', 'Cancelled'].includes(invoice.status) && (
          <CreateCreditNoteDialog
            open={creditNoteDialogOpen}
            onOpenChange={setCreditNoteDialogOpen}
            invoice={{
              id: invoice.id,
              invoice_no: invoice.invoice_no,
              client_id: invoice.client_id,
              company_id: invoice.company_id,
              total_amount: invoice.total_amount,
              balance_due: Math.max(0, effectiveBalance),
              gst_mode: invoice.gst_mode,
              gst_percent: invoice.gst_percent,
              sub_total: invoice.sub_total,
              items: invoice.items,
            }}
            onCreditNoteCreated={fetchInvoice}
          />
        )}

        {/* Cancel Invoice Confirmation Dialog */}
        <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Invoice {invoice.id}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will mark the invoice as <strong>Cancelled</strong> and exclude it from all receivables, aging reports, and dashboards. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2">
              <Label htmlFor="cancel-reason">Cancellation Reason *</Label>
              <Textarea
                id="cancel-reason"
                placeholder="e.g., Wrong pricing — 90-day calculation instead of 42-day"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setCancelReason('')}>Keep Invoice</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancelInvoice}
                disabled={!cancelReason.trim() || cancelling}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {cancelling ? 'Cancelling...' : 'Yes, Cancel Invoice'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
    </ModuleGuard>
  );
}