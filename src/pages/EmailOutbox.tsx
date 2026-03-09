import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RefreshCw, RotateCcw, Mail } from "lucide-react";
import { SettingsContentWrapper, SectionHeader } from "@/components/settings/zoho-style";
import { format } from "date-fns";

interface OutboxItem {
  id: string;
  recipient_to: string;
  subject_rendered: string;
  template_key: string | null;
  entity_type: string | null;
  status: string;
  retry_count: number;
  last_error: string | null;
  sent_at: string | null;
  created_at: string;
}

export default function EmailOutbox() {
  const { toast } = useToast();
  const [items, setItems] = useState<OutboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => { fetchOutbox(); }, [filter]);

  const fetchOutbox = async () => {
    setLoading(true);
    let query = supabase
      .from("email_outbox")
      .select("id, recipient_to, subject_rendered, template_key, entity_type, status, retry_count, last_error, sent_at, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (filter !== "all") query = query.eq("status", filter);
    const { data } = await query;
    if (data) setItems(data);
    setLoading(false);
  };

  const retryFailed = async (id: string) => {
    await supabase.from("email_outbox").update({ status: "queued", retry_count: 0 }).eq("id", id);
    toast({ title: "Re-queued for sending" });
    fetchOutbox();
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "sent": return "bg-emerald-100 text-emerald-700";
      case "failed": return "bg-red-100 text-red-700";
      case "bounced": return "bg-amber-100 text-amber-700";
      case "processing": return "bg-blue-100 text-blue-700";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const filtered = items.filter(i =>
    !search || i.recipient_to.toLowerCase().includes(search.toLowerCase()) || i.subject_rendered.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SettingsContentWrapper>
      <SectionHeader title="Email Outbox" description="View queued and sent emails. Retry failed deliveries." />

      <div className="flex items-center gap-3 mb-4">
        <Input placeholder="Search by recipient or subject…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="queued">Queued</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="bounced">Bounced</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchOutbox}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
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
                <TableHead>Template</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="text-sm">{item.recipient_to}</TableCell>
                  <TableCell className="text-sm max-w-[250px] truncate">{item.subject_rendered}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{item.template_key || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusColor(item.status)}>{item.status}</Badge>
                    {item.retry_count > 0 && <span className="text-xs text-muted-foreground ml-1">({item.retry_count} retries)</span>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {item.sent_at ? format(new Date(item.sent_at), "dd MMM HH:mm") : format(new Date(item.created_at), "dd MMM HH:mm")}
                  </TableCell>
                  <TableCell>
                    {item.status === "failed" && (
                      <Button variant="ghost" size="sm" onClick={() => retryFailed(item.id)}>
                        <RotateCcw className="h-3 w-3 mr-1" />Retry
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </SettingsContentWrapper>
  );
}
