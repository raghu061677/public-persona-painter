import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Download, RefreshCw, Search, ShieldAlert, ChevronLeft, ChevronRight } from "lucide-react";
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

const ACTIONS = ["all", "login", "logout", "magic_link_requested", "login_failed", "view_campaign", "view_invoice", "view_proof", "download_proof", "download_invoice"];
const PAGE_SIZE = 50;

export default function PortalActivity() {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [days, setDays] = useState("30");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(0);
  }, [actionFilter, days]);

  const load = useCallback(async () => {
    setLoading(true);
    const since = new Date(Date.now() - parseInt(days) * 86400000).toISOString();
    const { data, error } = await supabase.rpc("search_portal_access_logs", {
      p_search: debouncedSearch || null,
      p_action: actionFilter,
      p_from: since,
      p_to: null,
      p_client_id: null,
      p_limit: PAGE_SIZE,
      p_offset: page * PAGE_SIZE,
    });
    if (error) {
      console.error(error);
      setRows([]);
      setTotalCount(0);
    } else {
      const list = (data as any[]) || [];
      setRows(list);
      setTotalCount(list[0]?.total_count ?? 0);
    }
    setLoading(false);
  }, [debouncedSearch, actionFilter, days, page]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const logins = rows.filter((r) => r.action === "login").length;
    const uniqueUsers = new Set(rows.map((r) => r.client_id)).size;
    return { total: totalCount, logins, uniqueUsers };
  }, [rows, totalCount]);

  const exportCsv = async () => {
    // Pull up to 5000 matching the current filters for export
    const since = new Date(Date.now() - parseInt(days) * 86400000).toISOString();
    const { data } = await supabase.rpc("search_portal_access_logs", {
      p_search: debouncedSearch || null,
      p_action: actionFilter,
      p_from: since,
      p_to: null,
      p_client_id: null,
      p_limit: 5000,
      p_offset: 0,
    });
    const list = ((data as any[]) || []) as ActivityRow[];
    const headers = ["Timestamp", "User Name", "Email", "Client", "Client ID", "Action", "Resource Type", "Resource ID", "IP"];
    const lines = [headers.join(",")];
    list.forEach((r) => {
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

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Client Portal Activity</h1>
          <p className="text-muted-foreground">Track logins and usage by portal users</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/admin/portal-activity/suspicious">
              <ShieldAlert className="h-4 w-4 mr-2" /> Suspicious logins
            </Link>
          </Button>
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={exportCsv} disabled={!totalCount}>
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
              <Input placeholder="Search by user, email, client, IP..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No activity found</TableCell></TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm whitespace-nowrap">{format(new Date(r.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                      <TableCell className="font-medium">
                        <Link to={`/admin/portal-activity/user/${encodeURIComponent(r.client_id)}`} className="hover:underline text-primary">
                          {r.user_name || r.client_id}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.user_email || "—"}</TableCell>
                      <TableCell>{r.client_name || r.client_id}</TableCell>
                      <TableCell><Badge variant={r.action === "login_failed" ? "destructive" : r.action === "login" ? "default" : "secondary"}>{r.action.replace(/_/g, " ")}</Badge></TableCell>
                      <TableCell className="text-sm">{r.resource_type ? `${r.resource_type}${r.resource_id ? `: ${r.resource_id}` : ""}` : "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.ip_address || "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ResponsiveTable>
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              {totalCount === 0 ? "0 results" : `Showing ${page * PAGE_SIZE + 1}-${Math.min((page + 1) * PAGE_SIZE, totalCount)} of ${totalCount}`}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0 || loading}>
                <ChevronLeft className="h-4 w-4" /> Prev
              </Button>
              <span className="text-sm">Page {page + 1} / {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={(page + 1) >= totalPages || loading}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}