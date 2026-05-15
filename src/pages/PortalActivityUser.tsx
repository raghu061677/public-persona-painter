import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download } from "lucide-react";
import { format } from "date-fns";

export default function PortalActivityUser() {
  const { clientId = "" } = useParams();
  const decodedId = decodeURIComponent(clientId);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState("90");
  const [user, setUser] = useState<any>(null);
  const [client, setClient] = useState<any>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - parseInt(days) * 86400000).toISOString();
      const [{ data: logs }, { data: u }, { data: c }] = await Promise.all([
        supabase.rpc("search_portal_access_logs", {
          p_search: null, p_action: "all", p_from: since, p_to: null,
          p_client_id: decodedId, p_limit: 1000, p_offset: 0,
        }),
        supabase.from("client_portal_users" as any).select("*").eq("client_id", decodedId).maybeSingle(),
        supabase.from("clients").select("id, name").eq("id", decodedId).maybeSingle(),
      ]);
      setRows((logs as any[]) || []);
      setUser(u);
      setClient(c);
      setLoading(false);
    })();
  }, [decodedId, days]);

  const stats = useMemo(() => {
    const logins = rows.filter((r) => r.action === "login").length;
    const ips = new Set(rows.map((r) => r.ip_address).filter(Boolean));
    const last = rows[0]?.created_at;
    const counts: Record<string, number> = {};
    rows.forEach((r) => { counts[r.action] = (counts[r.action] || 0) + 1; });
    return { total: rows.length, logins, uniqueIps: ips.size, last, counts };
  }, [rows]);

  const exportCsv = () => {
    const headers = ["Timestamp", "Action", "Resource Type", "Resource ID", "IP", "User Agent"];
    const lines = [headers.join(",")];
    rows.forEach((r) => {
      lines.push([
        format(new Date(r.created_at), "dd/MM/yyyy HH:mm:ss"),
        r.action, r.resource_type || "", r.resource_id || "",
        r.ip_address || "", r.user_agent || "",
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `portal-activity-${decodedId}-${format(new Date(), "yyyyMMdd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2">
            <Link to="/admin/portal-activity"><ArrowLeft className="h-4 w-4 mr-2" /> Back to all activity</Link>
          </Button>
          <h1 className="text-3xl font-bold">{user?.name || client?.name || decodedId}</h1>
          <p className="text-muted-foreground">{user?.email || "No portal user"} · Client {decodedId}</p>
        </div>
        <div className="flex gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last 1 year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportCsv} disabled={!rows.length}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total events</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Logins</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.logins}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Unique IPs</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.uniqueIps}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Last activity</CardTitle></CardHeader><CardContent><div className="text-sm font-medium">{stats.last ? format(new Date(stats.last), "dd/MM/yyyy HH:mm") : "—"}</div></CardContent></Card>
      </div>

      {Object.keys(stats.counts).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Action breakdown</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {Object.entries(stats.counts).sort((a,b) => b[1]-a[1]).map(([action, count]) => (
              <Badge key={action} variant="secondary">{action.replace(/_/g, " ")}: {count}</Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">All events</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveTable>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>User Agent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No events found</TableCell></TableRow>
                ) : rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm whitespace-nowrap">{format(new Date(r.created_at), "dd/MM/yyyy HH:mm:ss")}</TableCell>
                    <TableCell><Badge variant={r.action === "login_failed" ? "destructive" : r.action === "login" ? "default" : "secondary"}>{r.action.replace(/_/g, " ")}</Badge></TableCell>
                    <TableCell className="text-sm">{r.resource_type ? `${r.resource_type}${r.resource_id ? `: ${r.resource_id}` : ""}` : "—"}</TableCell>
                    <TableCell className="text-xs">{r.ip_address || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{r.user_agent || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ResponsiveTable>
        </CardContent>
      </Card>
    </div>
  );
}