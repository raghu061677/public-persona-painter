import { useState, useEffect } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SettingsCard, SectionHeader, SettingsContentWrapper } from "@/components/settings/zoho-style";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, Search, Mail } from "lucide-react";
import { format } from "date-fns";

interface EmailLog {
  id: string;
  template_key: string | null;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  status: string;
  provider_used: string;
  error_message: string | null;
  sent_at: string;
}

export default function EmailSendLogs() {
  const { company } = useCompany();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (company) loadLogs();
  }, [company]);

  const loadLogs = async () => {
    if (!company) return;
    setLoading(true);
    try {
      let query = supabase
        .from("email_send_logs" as any)
        .select("*")
        .eq("company_id", company.id)
        .order("sent_at", { ascending: false })
        .limit(200);

      const { data, error } = await query;
      if (error) throw error;
      setLogs((data as any[] || []) as EmailLog[]);
    } catch (err: any) {
      toast({ title: "Failed to load logs", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = !searchQuery ||
      log.recipient_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusBadge = (status: string) => {
    switch (status) {
      case "sent": return <Badge className="bg-emerald-100 text-emerald-700 border-0">Sent</Badge>;
      case "failed": return <Badge variant="destructive">Failed</Badge>;
      case "bounced": return <Badge className="bg-amber-100 text-amber-700 border-0">Bounced</Badge>;
      default: return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <SettingsContentWrapper>
      <div>
        <h1 className="text-2xl font-semibold mb-1">Email Logs</h1>
        <p className="text-sm text-muted-foreground">View the history of all outbound emails sent from your account</p>
      </div>

      <SettingsCard>
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email or subject..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="bounced">Bounced</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={loadLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No email logs found</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Recipient</th>
                  <th className="text-left px-4 py-3 font-medium">Subject</th>
                  <th className="text-left px-4 py-3 font-medium">Template</th>
                  <th className="text-left px-4 py-3 font-medium">Provider</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Sent At</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{log.recipient_email}</div>
                      {log.recipient_name && <div className="text-xs text-muted-foreground">{log.recipient_name}</div>}
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate">{log.subject}</td>
                    <td className="px-4 py-3">
                      {log.template_key ? (
                        <Badge variant="outline" className="text-xs">{log.template_key}</Badge>
                      ) : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-xs">{log.provider_used || "resend"}</Badge>
                    </td>
                    <td className="px-4 py-3">{statusBadge(log.status)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {format(new Date(log.sent_at), "dd MMM yyyy, HH:mm")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SettingsCard>
    </SettingsContentWrapper>
  );
}
