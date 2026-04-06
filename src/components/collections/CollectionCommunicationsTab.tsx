import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { MessageSquare, Mail, Phone, StickyNote, RefreshCw } from "lucide-react";

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
}

const channelIcons: Record<string, React.ReactNode> = {
  whatsapp: <MessageSquare className="h-3.5 w-3.5 text-green-600" />,
  email: <Mail className="h-3.5 w-3.5 text-blue-600" />,
  call: <Phone className="h-3.5 w-3.5 text-purple-600" />,
  note: <StickyNote className="h-3.5 w-3.5 text-amber-600" />,
};

const channelColors: Record<string, string> = {
  whatsapp: "bg-green-100 text-green-800",
  email: "bg-blue-100 text-blue-800",
  call: "bg-purple-100 text-purple-800",
  note: "bg-amber-100 text-amber-800",
};

const templateLabels: Record<string, string> = {
  due_reminder: "Due Reminder",
  overdue_reminder: "Overdue",
  final_reminder: "Final",
  promise_broken: "Promise Broken",
  tds_certificate: "TDS Certificate",
  ledger_share: "Ledger",
};

export function CollectionCommunicationsTab() {
  const { company } = useCompany();
  const [records, setRecords] = useState<CommRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");

  const fetchComms = async () => {
    if (!company?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("collection_communications" as any)
      .select("*")
      .eq("company_id", company.id)
      .order("sent_at", { ascending: false })
      .limit(200);
    setRecords((data as any as CommRecord[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchComms();
  }, [company?.id]);

  const filtered = useMemo(() => {
    let list = records;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.invoice_id.toLowerCase().includes(q) ||
          r.client_id.toLowerCase().includes(q) ||
          r.message.toLowerCase().includes(q)
      );
    }
    if (channelFilter !== "all") {
      list = list.filter((r) => r.channel === channelFilter);
    }
    return list;
  }, [records, search, channelFilter]);

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
            <span className="text-xs text-muted-foreground self-center ml-auto">
              {filtered.length} records
            </span>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead className="min-w-[200px]">Message</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
                    <TableCell className="text-xs">
                      {templateLabels[r.template_type] || r.template_type}
                    </TableCell>
                    <TableCell className="text-xs font-mono">{r.invoice_id.slice(0, 8)}…</TableCell>
                    <TableCell className="text-xs max-w-[300px] truncate" title={r.message}>
                      {r.message.slice(0, 100)}…
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={r.status === "sent" ? "default" : "outline"}
                        className="text-[10px]"
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
