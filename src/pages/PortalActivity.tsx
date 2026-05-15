import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Download, RefreshCw, Search } from "lucide-react";
import { format } from "date-fns";

interface ActivityRow {
  id: string;
  client_id: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: any;
  created_at: string;
  user_name?: string;
  user_email?: string;
  client_name?: string;
}

const ACTIONS = ["all", "login", "logout", "view_campaign", "view_invoice", "view_proof", "download_proof", "download_invoice"];

export default function PortalActivity() {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [days, setDays] = useState("30");

  const load = async () => {
    setLoading(true);
    const since = new Date(Date.now() - parseInt(days) * 86400000).toISOString();
    const { data: logs } = await supabase
      .from("client_portal_access_logs" as any)
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1000);

    const list = (logs as any[]) || [];
    const clientIds = [...new Set(list.map((l) => l.client_id))];

    const [{ data: users }, { data: clients }] = await Promise.all([
      supabase.from("client_portal_users" as any).select("client_id, name, email").in("client_id", clientIds),
      supabase.from("clients").select("id, name").in("id", clientIds),
    ]);

    const userMap = new Map((users as any[] || []).map((u) => [u.client_id, u]));
    const clientMap = new Map((clients as any[] || []).map((c) => [c.id, c.name]));

    setRows(
      list.map((l) => ({
        ...l,
        user_name: userMap.get(l.client_id)?.name,
        user_email: userMap.get(l.client_id)?.email,
        client_name: clientMap.get(l.client_id),
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (actionFilter !== "all" && r.action !== actionFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          r.user_name?.toLowerCase().includes(q) ||
          r.user_email?.toLowerCase().includes(q) ||
          r.client_name?.toLowerCase().includes(q) ||
          r.client_id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [rows, search, actionFilter]);

  const stats = useMemo(() => {
    const logins = filtered.filter((r) => r.action === "login").length;
    const uniqueUsers = new Set(filtered.map((r) => r.client_id)).size;
    return { total: filtered.length, logins, uniqueUsers };
  }, [filtered]);

  const exportCsv = () => {
    const headers = ["Timestamp", "User Name", "Email", "Client", "Client ID", "Action", "Resource Type", "Resource ID", "IP"];
    const lines = [headers.join(",")];
    filtered.forEach((r) => {
      lines.push(
        [
          format(new Date(r.created_at), "dd/MM/yyyy HH:mm:ss"),
          r.user_name || "",
          r.user_email || "",
          r.client_name || "",
          r.client_id,
          r.action,
          r.resource_type || "",
          r.resource_id || "",
          r.ip_address || "",
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      );
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `portal-activity-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Client Portal Activity</h1>
          <p className="text-muted-foreground">Track logins and usage by portal users</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={exportCsv} disabled={!filtered.length}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Events</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Logins</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.logins}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Unique Users</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.uniqueUsers}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by user, email, client..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>{ACTIONS.map((a) => <SelectItem key={a} value={a}>{a === "all" ? "All actions" : a.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-full md:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last 1 year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveTable>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No activity found</TableCell></TableRow>
                ) : (
                  filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm whitespace-nowrap">{format(new Date(r.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                      <TableCell className="font-medium">{r.user_name || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.user_email || "—"}</TableCell>
                      <TableCell>{r.client_name || r.client_id}</TableCell>
                      <TableCell><Badge variant={r.action === "login" ? "default" : "secondary"}>{r.action.replace(/_/g, " ")}</Badge></TableCell>
                      <TableCell className="text-sm">{r.resource_type ? `${r.resource_type}${r.resource_id ? `: ${r.resource_id}` : ""}` : "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.ip_address || "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ResponsiveTable>
        </CardContent>
      </Card>
    </div>
  );
}