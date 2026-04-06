import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { MessageSquare, Mail, Phone, StickyNote, RefreshCw, RotateCcw, AlertCircle } from "lucide-react";
import { updateCommStatus } from "@/services/communications/commProvider";
import { toast } from "sonner";

interface CommRecord {
  id: string;
  client_id: string;
  invoice_id: string;
  campaign_id: string | null;
  message: string;
  channel: string;
  template_type: string;
  sent_by: string;
  sent_at: string;
  status: string;
  external_message_id: string | null;
  failure_reason: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  retry_count: number;
  parent_comm_id: string | null;
}

const channelIcons: Record<string, React.ReactNode> = {
  whatsapp: <MessageSquare className="h-3.5 w-3.5 text-green-600" />,
  email: <Mail className="h-3.5 w-3.5 text-blue-600" />,
  call: <Phone className="h-3.5 w-3.5 text-purple-600" />,
  note: <StickyNote className="h-3.5 w-3.5 text-amber-600" />,
};

const channelColors: Record<string, string> = {
  whatsapp: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  email: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  call: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  note: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  queued: "bg-blue-100 text-blue-700",
  sent: "bg-green-100 text-green-700",
  delivered: "bg-emerald-100 text-emerald-700",
  opened: "bg-teal-100 text-teal-700",
  failed: "bg-red-100 text-red-700",
  manual: "bg-amber-100 text-amber-700",
};

const templateLabels: Record<string, string> = {
  due_reminder: "Due Reminder",
  overdue_reminder: "Overdue",
  final_reminder: "Final",
  promise_broken: "Promise Broken",
  tds_certificate: "TDS Certificate",
  ledger_share: "Ledger",
};

type QuickFilter = "all" | "failed" | "sent_today" | "manual" | "pending";

export function CollectionCommunicationsTab() {
  const { company } = useCompany();
  const [records, setRecords] = useState<CommRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [retrying, setRetrying] = useState<string | null>(null);

  const fetchComms = async () => {
    if (!company?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("collection_communications" as any)
      .select("*")
      .eq("company_id", company.id)
      .order("sent_at", { ascending: false })
      .limit(500);
    setRecords((data as any as CommRecord[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchComms();
  }, [company?.id]);

  const todayStr = new Date().toISOString().split("T")[0];

  const filtered = useMemo(() => {
    let list = records;

    // Quick filters
    if (quickFilter === "failed") list = list.filter((r) => r.status === "failed");
    else if (quickFilter === "sent_today") list = list.filter((r) => r.sent_at?.startsWith(todayStr));
    else if (quickFilter === "manual") list = list.filter((r) => r.status === "manual");
    else if (quickFilter === "pending") list = list.filter((r) => r.status === "queued" || r.status === "draft");

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.invoice_id?.toLowerCase().includes(q) ||
          r.client_id?.toLowerCase().includes(q) ||
          r.message?.toLowerCase().includes(q)
      );
    }
    if (channelFilter !== "all") {
      list = list.filter((r) => r.channel === channelFilter);
    }
    if (statusFilter !== "all") {
      list = list.filter((r) => r.status === statusFilter);
    }
    return list;
  }, [records, search, channelFilter, statusFilter, quickFilter, todayStr]);

  const handleRetry = async (record: CommRecord) => {
    setRetrying(record.id);
    // Create a new comm record as retry child
    const { error } = await supabase
      .from("collection_communications" as any)
      .insert({
        company_id: company?.id,
        client_id: record.client_id,
        invoice_id: record.invoice_id,
        campaign_id: record.campaign_id,
        message: record.message,
        channel: record.channel,
        template_type: record.template_type,
        sent_by: record.sent_by,
        status: "queued",
        parent_comm_id: record.id,
        retry_count: (record.retry_count || 0) + 1,
        sent_at: new Date().toISOString(),
      } as any);

    if (error) {
      toast.error("Failed to create retry");
    } else {
      toast.success("Retry queued");
      fetchComms();
    }
    setRetrying(null);
  };

  // Stats
  const stats = useMemo(() => {
    const total = records.length;
    const sent = records.filter((r) => r.status === "sent" || r.status === "delivered").length;
    const failed = records.filter((r) => r.status === "failed").length;
    const manual = records.filter((r) => r.status === "manual").length;
    const today = records.filter((r) => r.sent_at?.startsWith(todayStr)).length;
    return { total, sent, failed, manual, today };
  }, [records, todayStr]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quick stats */}
      <div className="grid grid-cols-5 gap-2">
        {[
          { label: "Total", value: stats.total, filter: "all" as QuickFilter, color: "" },
          { label: "Sent/Delivered", value: stats.sent, filter: "all" as QuickFilter, color: "text-green-600" },
          { label: "Failed", value: stats.failed, filter: "failed" as QuickFilter, color: "text-red-600" },
          { label: "Manual", value: stats.manual, filter: "manual" as QuickFilter, color: "text-amber-600" },
          { label: "Today", value: stats.today, filter: "sent_today" as QuickFilter, color: "text-blue-600" },
        ].map((s) => (
          <button
            key={s.label}
            onClick={() => setQuickFilter(s.filter === quickFilter ? "all" : s.filter)}
            className={`p-2 rounded-lg border text-center transition-colors ${
              quickFilter === s.filter && s.filter !== "all" ? "ring-2 ring-primary" : ""
            } hover:bg-muted/50`}
          >
            <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
          </button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Communication History</CardTitle>
            <Button size="sm" variant="outline" onClick={fetchComms} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3 flex-wrap">
            <Input
              placeholder="Search by invoice, client, or message..."
              className="max-w-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="call">Call</SelectItem>
                <SelectItem value="note">Note</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="queued">Queued</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground self-center ml-auto">
              {filtered.length} records
            </span>
          </div>

          <div className="overflow-x-auto">
            <TooltipProvider>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead className="min-w-[200px]">Message</TableHead>
                    <TableHead>Delivery</TableHead>
                    <TableHead className="w-16">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No communications recorded yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(new Date(r.sent_at), "dd MMM yy, hh:mm a")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`gap-1 ${channelColors[r.channel] || ""}`}>
                          {channelIcons[r.channel]}
                          {r.channel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${statusColors[r.status] || ""}`}>
                          {r.status}
                        </Badge>
                        {r.retry_count > 0 && (
                          <span className="text-[9px] text-muted-foreground ml-1">
                            (retry #{r.retry_count})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {templateLabels[r.template_type] || r.template_type}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {r.invoice_id?.slice(0, 12)}…
                      </TableCell>
                      <TableCell className="text-xs max-w-[300px] truncate" title={r.message}>
                        {r.message?.slice(0, 100)}…
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.delivered_at && (
                          <div className="text-green-600">
                            ✓ {format(new Date(r.delivered_at), "dd MMM, HH:mm")}
                          </div>
                        )}
                        {r.opened_at && (
                          <div className="text-teal-600">
                            👁 {format(new Date(r.opened_at), "dd MMM, HH:mm")}
                          </div>
                        )}
                        {r.failure_reason && (
                          <Tooltip>
                            <TooltipTrigger>
                              <span className="text-red-500 flex items-center gap-0.5">
                                <AlertCircle className="h-3 w-3" /> Error
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              {r.failure_reason}
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {!r.delivered_at && !r.opened_at && !r.failure_reason && (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.status === "failed" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            title="Retry"
                            disabled={retrying === r.id}
                            onClick={() => handleRetry(r)}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
