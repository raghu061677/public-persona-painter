import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  sendWhatsAppMessage,
  sendEmailMessage,
  logCommunication,
  updateCommStatus,
} from "@/services/communications/commProvider";
import { formatINR } from "@/utils/finance";
import { format } from "date-fns";
import { MessageSquare, Mail, Copy, StickyNote, Send, Loader2, Phone, Globe, AlertCircle, CheckCircle2 } from "lucide-react";
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

interface BulkResult {
  total: number;
  sent: number;
  failed: number;
  manual: number;
}

export function SendReminderModal({ open, onClose, invoices, onSent }: Props) {
  const { company } = useCompany();
  const { user } = useAuth();
  const { data: context, isLoading: contextLoading, fetchContext } = useInvoiceContext();

  const [templateType, setTemplateType] = useState<TemplateType>("due_reminder");
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("");
  const [sending, setSending] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [bulkChannel, setBulkChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);

  const invoice = invoices[0];
  const isBulk = invoices.length > 1;

  // Fetch context & client contact on open
  useEffect(() => {
    if (open && invoices.length > 0) {
      const ids = invoices.map((i) => i.id);
      const cIds = invoices.map((i) => i.campaign_id);
      fetchContext(ids, cIds);
      setBulkResult(null);

      const promiseBroken =
        invoice?.promised_payment_date &&
        invoice.promised_payment_date < new Date().toISOString().split("T")[0] &&
        invoice.balance_due > 0;
      setTemplateType(autoSelectTemplate(invoice?.overdue_days || 0, !!promiseBroken));

      // Fetch client contact info
      if (invoice?.client_id) {
        supabase
          .from("clients")
          .select("phone, email")
          .eq("id", invoice.client_id)
          .maybeSingle()
          .then(({ data }) => {
            if (data) {
              setWhatsappNumber((data as any).phone || "");
              setEmailAddress((data as any).email || "");
            }
          });
      }
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

    const rendered = renderTemplate(templateType, vars);
    setMessage(rendered.body);
    setSubject(rendered.subject);
  }, [templateType, context, contextLoading, invoice, company]);

  const items = useMemo(() => (invoice ? context.items[invoice.id] || [] : []), [context, invoice]);
  const campaign = useMemo(
    () => (invoice?.campaign_id ? context.campaigns[invoice.campaign_id] : null),
    [context, invoice]
  );

  const doSend = async (channel: string, sendFn?: () => Promise<{ success: boolean; mode: string; externalMessageId?: string; error?: string }>) => {
    if (!company?.id || !user?.id || !message.trim()) {
      toast.error("Message cannot be empty");
      return;
    }
    setSending(true);

    // Log as draft first
    const { id: commId, error: logErr } = await logCommunication({
      company_id: company.id,
      client_id: invoice.client_id,
      invoice_id: invoice.id,
      campaign_id: invoice.campaign_id,
      message: isBulk ? `[Bulk] ${message}` : message,
      channel,
      template_type: templateType,
      sent_by: user.id,
      status: "queued",
    });

    if (logErr) {
      toast.error("Failed to log communication");
      setSending(false);
      return;
    }

    if (sendFn) {
      const result = await sendFn();
      if (commId) {
        await updateCommStatus(commId, {
          status: result.success ? (result.mode === "manual" ? "manual" : "sent") : "failed",
          external_message_id: result.externalMessageId || undefined,
          failure_reason: result.error || undefined,
        });
      }

      if (result.success) {
        toast.success(
          result.mode === "manual"
            ? `${channel === "whatsapp" ? "WhatsApp" : "Email"} opened & logged`
            : `${channel === "whatsapp" ? "WhatsApp" : "Email"} sent successfully`
        );
      } else {
        toast.error(`Send failed: ${result.error}`);
      }
    }

    setSending(false);
    onSent?.();
    onClose();
  };

  const handleWhatsApp = () =>
    doSend("whatsapp", () =>
      sendWhatsAppMessage({ phoneNumber: whatsappNumber, message })
    );

  const handleEmail = () =>
    doSend("email", () =>
      sendEmailMessage({ to: emailAddress, subject, body: message })
    );

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message);
    if (company?.id && user?.id) {
      await logCommunication({
        company_id: company.id,
        client_id: invoice.client_id,
        invoice_id: invoice.id,
        campaign_id: invoice.campaign_id,
        message,
        channel: "note",
        template_type: templateType,
        sent_by: user.id,
        status: "manual",
      });
    }
    toast.success("Message copied & logged");
    onSent?.();
    onClose();
  };

  const handleInternalNote = async () => {
    if (!company?.id || !user?.id) return;
    await logCommunication({
      company_id: company.id,
      client_id: invoice.client_id,
      invoice_id: invoice.id,
      campaign_id: invoice.campaign_id,
      message,
      channel: "note",
      template_type: templateType,
      sent_by: user.id,
      status: "sent",
    });
    toast.success("Internal note saved");
    onSent?.();
    onClose();
  };

  // Bulk send
  const handleBulkSend = async () => {
    if (!company?.id || !user?.id) return;
    setSending(true);
    const result: BulkResult = { total: invoices.length, sent: 0, failed: 0, manual: 0 };

    for (const inv of invoices) {
      const cam = inv.campaign_id ? context.campaigns[inv.campaign_id] : null;
      const itms = context.items[inv.id] || [];
      const vars = {
        client_name: inv.client_name,
        invoice_no: inv.invoice_no,
        due_date: inv.due_date || undefined,
        balance_due: inv.balance_due,
        overdue_days: inv.overdue_days,
        company_name: company?.name || "Go-Ads",
        campaign_name: cam?.campaign_name || inv.campaign_name || undefined,
        campaign_duration: cam ? formatCampaignDuration(cam.start_date, cam.end_date) : undefined,
        top_items: formatTopItems(itms, 3),
      };
      const rendered = renderTemplate(templateType, vars);

      // Get client contact
      const { data: client } = await supabase
        .from("clients")
        .select("phone, email")
        .eq("id", inv.client_id)
        .maybeSingle();

      const { id: commId } = await logCommunication({
        company_id: company.id,
        client_id: inv.client_id,
        invoice_id: inv.id,
        campaign_id: inv.campaign_id,
        message: rendered.body,
        channel: bulkChannel,
        template_type: templateType,
        sent_by: user.id,
        status: "queued",
      });

      let sendResult;
      if (bulkChannel === "whatsapp") {
        // Bulk WhatsApp always logs as manual (can't open multiple deep links)
        sendResult = { success: true, mode: "manual" as const };
      } else {
        const email = (client as any)?.email;
        if (email) {
          sendResult = await sendEmailMessage({
            to: email,
            subject: rendered.subject,
            body: rendered.body,
          });
        } else {
          sendResult = { success: false, mode: "fallback" as const, error: "No email" };
        }
      }

      if (commId) {
        await updateCommStatus(commId, {
          status: sendResult.success ? (sendResult.mode === "manual" ? "manual" : "sent") : "failed",
          failure_reason: sendResult.success ? undefined : sendResult.error,
        });
      }

      if (sendResult.success) {
        if (sendResult.mode === "manual") result.manual++;
        else result.sent++;
      } else {
        result.failed++;
      }
    }

    setBulkResult(result);
    setSending(false);
    onSent?.();
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

        {isBulk && !bulkResult && (
          <div className="border rounded-lg p-3 bg-muted/30 space-y-3">
            <p className="text-sm font-medium">Sending to {invoices.length} invoices:</p>
            <div className="text-xs max-h-20 overflow-y-auto space-y-0.5">
              {invoices.map((inv) => (
                <div key={inv.id}>
                  {inv.client_name} – {inv.invoice_no} – {formatINR(inv.balance_due)}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-xs">Channel:</Label>
              <Select value={bulkChannel} onValueChange={(v) => setBulkChannel(v as any)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Bulk result summary */}
        {bulkResult && (
          <div className="border rounded-lg p-4 space-y-2">
            <p className="font-medium text-sm">Bulk Send Complete</p>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 rounded bg-muted">
                <div className="text-lg font-bold">{bulkResult.total}</div>
                <div className="text-muted-foreground">Total</div>
              </div>
              <div className="p-2 rounded bg-green-50 dark:bg-green-950/30">
                <div className="text-lg font-bold text-green-600">{bulkResult.sent}</div>
                <div className="text-muted-foreground">Sent</div>
              </div>
              <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/30">
                <div className="text-lg font-bold text-amber-600">{bulkResult.manual}</div>
                <div className="text-muted-foreground">Manual</div>
              </div>
              <div className="p-2 rounded bg-red-50 dark:bg-red-950/30">
                <div className="text-lg font-bold text-red-600">{bulkResult.failed}</div>
                <div className="text-muted-foreground">Failed</div>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-2" onClick={onClose}>
              Close
            </Button>
          </div>
        )}

        {!bulkResult && (
          <>
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

            {/* Contact info for single invoice */}
            {!isBulk && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <Phone className="h-3 w-3" /> WhatsApp Number
                  </Label>
                  <Input
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="+91XXXXXXXXXX"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Email Address
                  </Label>
                  <Input
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    placeholder="client@example.com"
                    className="text-sm"
                  />
                </div>
              </div>
            )}

            {/* Subject line (for email) */}
            {!isBulk && (
              <div className="space-y-1">
                <Label className="text-xs">Email Subject</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="text-sm"
                />
              </div>
            )}

            {/* Message editor */}
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={10}
              className="font-mono text-xs"
              placeholder={contextLoading ? "Loading context..." : "Message preview..."}
            />

            {/* Channel buttons */}
            <div className="flex flex-wrap gap-2">
              {isBulk ? (
                <Button onClick={handleBulkSend} disabled={sending} className="gap-1.5">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send All ({invoices.length})
                </Button>
              ) : (
                <>
                  <Button onClick={handleWhatsApp} disabled={sending} className="gap-1.5 bg-green-600 hover:bg-green-700">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                    WhatsApp
                    {!whatsappNumber && <span className="text-[10px] opacity-70">(link)</span>}
                  </Button>
                  <Button onClick={handleEmail} disabled={sending} variant="outline" className="gap-1.5">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                    Email
                    {!emailAddress && <span className="text-[10px] opacity-70">(draft)</span>}
                  </Button>
                  <Button onClick={handleCopy} disabled={sending} variant="outline" className="gap-1.5">
                    <Copy className="h-4 w-4" /> Copy
                  </Button>
                  <Button onClick={handleInternalNote} disabled={sending} variant="secondary" className="gap-1.5 ml-auto">
                    <StickyNote className="h-4 w-4" /> Save as Note
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
