import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, RefreshCw, RotateCcw, Mail, Eye, Code, Search, Play, CheckCircle2 } from "lucide-react";
import { SettingsContentWrapper, SectionHeader } from "@/components/settings/zoho-style";
import { format } from "date-fns";
import { EMAIL_EVENTS } from "@/services/notifications/emailEvents";

interface OutboxItem {
  id: string;
  recipient_to: string | null;
  recipient_cc: string | null;
  subject_rendered: string | null;
  html_rendered: string | null;
  template_key: string | null;
  event_key: string | null;
  source_module: string | null;
  entity_type: string | null;
  status: string | null;
  retry_count: number | null;
  attempt_count: number | null;
  last_error: string | null;
  sent_at: string | null;
  failed_at: string | null;
  created_at: string | null;
  payload_json: any;
}

export default function EmailOutbox() {
  const { toast } = useToast();
  const [items, setItems] = useState<OutboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [eventFilter, setEventFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [viewEmail, setViewEmail] = useState<OutboxItem | null>(null);
  const [viewPayload, setViewPayload] = useState<OutboxItem | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ sent: 0, failed: 0, total: 0 });

  useEffect(() => { fetchOutbox(); }, [filter, eventFilter]);

  const fetchOutbox = async () => {
    setLoading(true);
    let query = (supabase
      .from("email_outbox" as any)
      .select("*") as any)
      .order("created_at", { ascending: false })
      .limit(200);
    if (filter !== "all") query = query.eq("status", filter);
    if (eventFilter !== "all") query = query.eq("event_key", eventFilter);
    const { data } = await query;
    if (data) setItems(data as OutboxItem[]);
    setLoading(false);
  };

  const sendSingleEmail = async (item: OutboxItem): Promise<boolean> => {
    // Mark as processing
    await supabase.from("email_outbox" as any).update({
      status: "processing",
      attempt_count: (item.attempt_count || item.retry_count || 0) + 1,
      last_error: null,
    } as any).eq("id", item.id);

    try {
      const { error } = await supabase.functions.invoke("send-tenant-email", {
        body: {
          to: item.recipient_to,
          subject: item.subject_rendered,
          html: item.html_rendered,
        },
      });

      if (error) {
        await supabase.from("email_outbox" as any).update({
          status: "failed",
          last_error: error.message || String(error),
          failed_at: new Date().toISOString(),
        } as any).eq("id", item.id);
        return false;
      } else {
        await supabase.from("email_outbox" as any).update({
          status: "sent",
          sent_at: new Date().toISOString(),
        } as any).eq("id", item.id);
        return true;
      }
    } catch (err: any) {
      await supabase.from("email_outbox" as any).update({
        status: "failed",
        last_error: err.message,
        failed_at: new Date().toISOString(),
      } as any).eq("id", item.id);
      return false;
    }
  };

  const retryFailed = async (item: OutboxItem) => {
    const success = await sendSingleEmail(item);
    toast(success
      ? { title: "Email sent successfully" }
      : { variant: "destructive", title: "Retry failed" }
    );
    fetchOutbox();
  };

  const processAllQueued = async () => {
    // Fetch ALL queued emails (not just filtered view)
    const { data: queuedEmails } = await (supabase
      .from("email_outbox" as any)
      .select("*") as any)
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(500);

    if (!queuedEmails?.length) {
      toast({ title: "No queued emails to process" });
      return;
    }

    setBulkProcessing(true);
    setBulkProgress({ sent: 0, failed: 0, total: queuedEmails.length });

    let sent = 0;
    let failed = 0;

    // Process in batches of 5 with small delay to avoid rate limits
    for (let i = 0; i < queuedEmails.length; i++) {
      const item = queuedEmails[i] as OutboxItem;
      const success = await sendSingleEmail(item);
      if (success) sent++; else failed++;
      setBulkProgress({ sent, failed, total: queuedEmails.length });

      // Small delay every 5 emails to avoid rate limiting
      if ((i + 1) % 5 === 0 && i < queuedEmails.length - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    setBulkProcessing(false);
    toast({
      title: "Bulk processing complete",
      description: `${sent} sent, ${failed} failed out of ${queuedEmails.length} emails`,
    });
    fetchOutbox();
  };

  const statusColor = (s: string | null) => {
    switch (s) {
      case "sent": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300";
      case "failed": return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
      case "processing": return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
      case "cancelled": return "bg-gray-100 text-gray-500";
      case "queued": return "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300";
      default: return "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300";
    }
  };

  const getEventLabel = (key: string | null) => {
    if (!key) return "—";
    return EMAIL_EVENTS[key]?.label || key;
  };

  const filtered = items.filter(i => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (i.recipient_to || '').toLowerCase().includes(s) || (i.subject_rendered || '').toLowerCase().includes(s);
  });

  const queuedCount = items.filter(i => i.status === "queued").length;
  const eventKeys = [...new Set(items.map(i => i.event_key).filter(Boolean))];

  return (
    <SettingsContentWrapper>
      <SectionHeader title="Email Outbox & Logs" description="View queued, sent, and failed emails. Retry failed deliveries and inspect payloads." />

      {/* Bulk processing progress bar */}
      {bulkProcessing && (
        <Card className="mb-4 border-primary/30">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">Processing queued emails…</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {bulkProgress.sent + bulkProgress.failed} / {bulkProgress.total} processed
                  — <span className="text-emerald-600">{bulkProgress.sent} sent</span>
                  {bulkProgress.failed > 0 && <>, <span className="text-destructive">{bulkProgress.failed} failed</span></>}
                </p>
                <div className="w-full bg-muted rounded-full h-2 mt-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((bulkProgress.sent + bulkProgress.failed) / bulkProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by recipient or subject…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="queued">Queued</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={eventFilter} onValueChange={setEventFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Event" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            {eventKeys.map(k => <SelectItem key={k} value={k!}>{getEventLabel(k)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchOutbox}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>

        {/* Bulk Process Queued Button */}
        {queuedCount > 0 && !bulkProcessing && (
          <Button size="sm" onClick={processAllQueued} className="ml-auto">
            <Play className="h-4 w-4 mr-1" />
            Process All Queued ({queuedCount})
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Mail className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>No emails in outbox</p>
        </CardContent></Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="text-sm">{item.recipient_to || "—"}</TableCell>
                  <TableCell className="text-sm max-w-[220px] truncate">{item.subject_rendered || "—"}</TableCell>
                  <TableCell className="text-xs">{getEventLabel(item.event_key)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusColor(item.status)}>{item.status || "pending"}</Badge>
                    {item.last_error && (
                      <p className="text-xs text-destructive mt-1 max-w-[200px] truncate" title={item.last_error}>{item.last_error}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{item.attempt_count || item.retry_count || 0}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {item.sent_at
                      ? format(new Date(item.sent_at), "dd MMM HH:mm")
                      : item.created_at
                        ? format(new Date(item.created_at), "dd MMM HH:mm")
                        : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setViewEmail(item)} title="View Email">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {item.payload_json && (
                        <Button variant="ghost" size="sm" onClick={() => setViewPayload(item)} title="View Payload">
                          <Code className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {(item.status === "failed" || item.status === "cancelled" || item.status === "queued") && (
                        <Button variant="ghost" size="sm" onClick={() => retryFailed(item)} title={item.status === "queued" ? "Send Now" : "Retry"} disabled={bulkProcessing}>
                          {item.status === "queued" ? <Play className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-2">{filtered.length} emails shown</p>

      {/* View Rendered Email Dialog */}
      <Dialog open={!!viewEmail} onOpenChange={() => setViewEmail(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader><DialogTitle>Email Preview</DialogTitle></DialogHeader>
          {viewEmail && (
            <div className="space-y-3">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">To: {viewEmail.recipient_to || "—"}</p>
                {viewEmail.recipient_cc && <p className="text-xs text-muted-foreground">CC: {viewEmail.recipient_cc}</p>}
                <p className="text-sm font-medium mt-1">Subject: {viewEmail.subject_rendered || "—"}</p>
              </div>
              <ScrollArea className="h-[50vh]">
                <div className="border rounded-lg bg-white p-4">
                  <div dangerouslySetInnerHTML={{ __html: viewEmail.html_rendered || "<p>No HTML content</p>" }} />
                </div>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Payload Dialog */}
      <Dialog open={!!viewPayload} onOpenChange={() => setViewPayload(null)}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader><DialogTitle>Email Payload</DialogTitle></DialogHeader>
          <ScrollArea className="h-[60vh]">
            <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
              {viewPayload?.payload_json ? JSON.stringify(viewPayload.payload_json, null, 2) : "No payload data"}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </SettingsContentWrapper>
  );
}