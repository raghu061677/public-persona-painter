import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download, RefreshCw, ShieldAlert } from "lucide-react";
import { format } from "date-fns";

interface Row {
  id: string; client_id: string; user_email: string | null; user_name: string | null;
  client_name: string | null; action: string; ip_address: string | null;
  user_agent: string | null; created_at: string; reason: string; severity: string;
}

export default function PortalSuspiciousLogins() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState("30");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("detect_suspicious_portal_logins", {
      p_days: parseInt(days), p_baseline_days: 90, p_burst_threshold: 10,
    });
    if (error) console.error(error);
    setRows((data as Row[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [days]);

  const stats = useMemo(() => {
    const high = rows.filter((r) => r.severity === "high").length;
    const newIp = rows.filter((r) => r.reason.includes("New IP")).length;
    const failed = rows.filter((r) => r.reason.includes("Failed")).length;
    const burst = rows.filter((r) => r.reason.includes("burst")).length;
    return { total: rows.length, high, newIp, failed, burst };
  }, [rows]);

  const exportCsv = () => {
    const headers = ["Timestamp", "Severity", "Reason", "User", "Email", "Client", "Client ID", "Action", "IP", "User Agent"];
    const lines = [headers.join(",")];
    rows.forEach((r) => {
      lines.push([
        format(new Date(r.created_at), "dd/MM/yyyy HH:mm:ss"),
        r.severity, r.reason, r.user_name || "", r.user_email || "",
        r.client_name || "", r.client_id, r.action, r.ip_address || "", r.user_agent || "",
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `suspicious-portal-logins-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2">
            <Link to="/admin/portal-activity"><ArrowLeft className="h-4 w-4 mr-2" /> Back to portal activity</Link>
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-2"><ShieldAlert className="h-7 w-7 text-destructive" /> Suspicious Portal Logins</h1>
          <p className="text-muted-foreground">New IPs, failed login attempts, and high-volume bursts</p>
        </div>
        <div className="flex gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button onClick={exportCsv} disabled={!rows.length}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total alerts</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">High severity</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-destructive">{stats.high}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">New IPs</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.newIp}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Failed / Bursts</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.failed + stats.burst}</div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <ResponsiveTable>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No suspicious logins detected — all clear ✓</TableCell></TableRow>
                ) : rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm whitespace-nowrap">{format(new Date(r.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                    <TableCell><Badge variant={r.severity === "high" ? "destructive" : "secondary"}>{r.severity}</Badge></TableCell>
                    <TableCell className="text-sm">{r.reason}</TableCell>
                    <TableCell>
                      <Link to={`/admin/portal-activity/user/${encodeURIComponent(r.client_id)}`} className="hover:underline text-primary font-medium">
                        {r.user_name || r.user_email || r.client_id}
                      </Link>
                      {r.user_email && <div className="text-xs text-muted-foreground">{r.user_email}</div>}
                    </TableCell>
                    <TableCell className="text-sm">{r.client_name || r.client_id}</TableCell>
                    <TableCell><Badge variant="outline">{r.action.replace(/_/g, " ")}</Badge></TableCell>
                    <TableCell className="text-xs">{r.ip_address || "—"}</TableCell>
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