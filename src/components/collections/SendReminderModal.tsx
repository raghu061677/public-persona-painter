import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useInvoiceContext } from "@/hooks/useInvoiceContext";
import {
  TemplateType,
  autoSelectTemplate,
  renderTemplate,
  getTemplateList,
  formatTopItems,
  formatCampaignDuration,
} from "@/utils/collectionTemplates";
import { formatINR } from "@/utils/finance";
import { format } from "date-fns";
import { MessageSquare, Mail, Copy, StickyNote, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface InvoiceData {
  id: string;
  invoice_no: string;
  client_id: string;
  client_name: string;
  campaign_name: string | null;
  campaign_id: string | null;
  due_date: string | null;
  balance_due: number;
  overdue_days: number;
  promised_payment_date?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  invoices: InvoiceData[];
  onSent?: () => void;
}

export function SendReminderModal({ open, onClose, invoices, onSent }: Props) {
  const { company } = useCompany();
  const { user } = useAuth();
  const { data: context, isLoading: contextLoading, fetchContext } = useInvoiceContext();

  const [templateType, setTemplateType] = useState<TemplateType>("due_reminder");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const invoice = invoices[0];
  const isBulk = invoices.length > 1;

  // Fetch context on open
  useEffect(() => {
    if (open && invoices.length > 0) {
      const ids = invoices.map((i) => i.id);
      const cIds = invoices.map((i) => i.campaign_id);
      fetchContext(ids, cIds);

      // Auto-select template
      const promiseBroken =
        invoice?.promised_payment_date &&
        invoice.promised_payment_date < new Date().toISOString().split("T")[0] &&
        invoice.balance_due > 0;
      setTemplateType(autoSelectTemplate(invoice?.overdue_days || 0, !!promiseBroken));
    }
  }, [open, invoices]);

  // Generate message when template or context changes
  useEffect(() => {
    if (!invoice || contextLoading) return;

    const campaign = invoice.campaign_id ? context.campaigns[invoice.campaign_id] : null;
    const items = context.items[invoice.id] || [];

    const vars = {
      client_name: invoice.client_name,
      invoice_no: invoice.invoice_no,
      due_date: invoice.due_date || undefined,
      balance_due: invoice.balance_due,
      overdue_days: invoice.overdue_days,
      company_name: company?.name || "Go-Ads",
      campaign_name: campaign?.campaign_name || invoice.campaign_name || undefined,
      campaign_duration: campaign
        ? formatCampaignDuration(campaign.start_date, campaign.end_date)
        : undefined,
      top_items: formatTopItems(items, 3),
    };

    const { body } = renderTemplate(templateType, vars);
    setMessage(body);
  }, [templateType, context, contextLoading, invoice, company]);

  const items = useMemo(() => (invoice ? context.items[invoice.id] || [] : []), [context, invoice]);
  const campaign = useMemo(
    () => (invoice?.campaign_id ? context.campaigns[invoice.campaign_id] : null),
    [context, invoice]
  );

  const logCommunication = async (channel: string) => {
    if (!company?.id || !user?.id || !message.trim()) {
      toast.error("Message cannot be empty");
      return false;
    }
    setSending(true);

    const inserts = invoices.map((inv) => ({
      company_id: company.id,
      client_id: inv.client_id,
      invoice_id: inv.id,
      campaign_id: inv.campaign_id || null,
      message: isBulk ? `[Bulk] ${message}` : message,
      channel,
      template_type: templateType,
      sent_by: user.id,
      status: "sent",
    }));

    const { error } = await supabase.from("collection_communications" as any).insert(inserts as any);
    setSending(false);

    if (error) {
      toast.error("Failed to log communication");
      console.error(error);
      return false;
    }
    return true;
  };

  const handleWhatsApp = async () => {
    const ok = await logCommunication("whatsapp");
    if (!ok) return;
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
    toast.success("WhatsApp opened & communication logged");
    onSent?.();
    onClose();
  };

  const handleEmail = async () => {
    const ok = await logCommunication("email");
    if (!ok) return;
    const subject = encodeURIComponent(`Payment Reminder – ${invoice?.invoice_no || ""}`);
    const body = encodeURIComponent(message);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
    toast.success("Email draft opened & communication logged");
    onSent?.();
    onClose();
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message);
    await logCommunication("note");
    toast.success("Message copied & logged");
    onSent?.();
    onClose();
  };

  const handleInternalNote = async () => {
    const ok = await logCommunication("note");
    if (!ok) return;
    toast.success("Internal note saved");
    onSent?.();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isBulk ? `Send Reminders (${invoices.length} invoices)` : "Send Reminder"}
          </DialogTitle>
        </DialogHeader>

        {/* Context Summary */}
        {invoice && !isBulk && (
          <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Client:</span>{" "}
                <span className="font-medium">{invoice.client_name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Invoice:</span>{" "}
                <span className="font-medium">{invoice.invoice_no}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Amount Due:</span>{" "}
                <span className="font-medium text-red-600">{formatINR(invoice.balance_due)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Due Date:</span>{" "}
                <span className="font-medium">
                  {invoice.due_date ? format(new Date(invoice.due_date), "dd MMM yyyy") : "—"}
                </span>
              </div>
              {campaign && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Campaign:</span>{" "}
                  <span className="font-medium">{campaign.campaign_name}</span>
                  {campaign.start_date && campaign.end_date && (
                    <span className="text-xs text-muted-foreground ml-1">
                      ({formatCampaignDuration(campaign.start_date, campaign.end_date)})
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Line items preview */}
            {items.length > 0 && (
              <div className="mt-2 pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-1">Media Details:</p>
                <div className="text-xs space-y-0.5">
                  {items.slice(0, 3).map((item, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="truncate max-w-[70%]">
                        • {item.location || item.description || "Media"}
                        {item.quantity ? ` × ${item.quantity}` : ""}
                      </span>
                      <span className="font-medium">{formatINR(item.amount || 0)}</span>
                    </div>
                  ))}
                  {items.length > 3 && (
                    <p className="text-muted-foreground italic">
                      and {items.length - 3} more locations…
                    </p>
                  )}
                </div>
              </div>
            )}

            {invoice.overdue_days > 0 && (
              <Badge variant="destructive" className="text-xs">
                {invoice.overdue_days} days overdue
              </Badge>
            )}
          </div>
        )}

        {isBulk && (
          <div className="border rounded-lg p-3 bg-muted/30">
            <p className="text-sm font-medium">Sending to {invoices.length} invoices:</p>
            <div className="text-xs mt-1 max-h-20 overflow-y-auto space-y-0.5">
              {invoices.map((inv) => (
                <div key={inv.id}>
                  {inv.client_name} – {inv.invoice_no} – {formatINR(inv.balance_due)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Template selector */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium whitespace-nowrap">Template:</span>
          <Select
            value={templateType}
            onValueChange={(v) => setTemplateType(v as TemplateType)}
          >
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getTemplateList().map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Message editor */}
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={12}
          className="font-mono text-xs"
          placeholder={contextLoading ? "Loading context..." : "Message preview..."}
        />

        {/* Channel buttons */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleWhatsApp} disabled={sending} className="gap-1.5 bg-green-600 hover:bg-green-700">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
            WhatsApp
          </Button>
          <Button onClick={handleEmail} disabled={sending} variant="outline" className="gap-1.5">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Email
          </Button>
          <Button onClick={handleCopy} disabled={sending} variant="outline" className="gap-1.5">
            <Copy className="h-4 w-4" /> Copy
          </Button>
          <Button onClick={handleInternalNote} disabled={sending} variant="secondary" className="gap-1.5 ml-auto">
            <StickyNote className="h-4 w-4" /> Save as Note
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
