import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Shield, Search, Download, Filter } from "lucide-react";
import { format } from "date-fns";

interface AuditLog {
  id: string;
  user_email: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, any>;
  created_at: string;
}

export default function AuditLogs() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterResourceType, setFilterResourceType] = useState<string>("all");

  useEffect(() => {
    if (!isAdmin) {
      navigate("/admin/dashboard");
      return;
    }
    fetchLogs();
  }, [isAdmin, navigate]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      setLogs(data as any || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = filterAction === "all" || log.action === filterAction;
    const matchesResourceType = filterResourceType === "all" || log.resource_type === filterResourceType;
    
    return matchesSearch && matchesAction && matchesResourceType;
  });

  const exportLogs = () => {
    const csv = [
      ['Timestamp', 'User', 'Action', 'Resource Type', 'Resource ID', 'Details'].join(','),
      ...filteredLogs.map(log => [
        format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
        log.user_email,
        log.action,
        log.resource_type,
        log.resource_id || '',
        JSON.stringify(log.details),
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const getActionBadge = (action: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      export_data: "default",
      view_vendor: "secondary",
      update_vendor: "outline",
      delete_vendor: "destructive",
      generate_id: "secondary",
      role_change: "destructive",
      bulk_delete: "destructive",
      bulk_update: "outline",
    };
    return <Badge variant={variants[action] || "default"}>{action}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Loading audit logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Audit Logs
          </h2>
          <p className="text-muted-foreground mt-2">
            Comprehensive tracking of all sensitive operations and data access
          </p>
        </div>
        <Button onClick={exportLogs} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter audit logs by action, resource type, or search</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="export_data">Export Data</SelectItem>
                <SelectItem value="view_vendor">View Vendor</SelectItem>
                <SelectItem value="update_vendor">Update Vendor</SelectItem>
                <SelectItem value="delete_vendor">Delete Vendor</SelectItem>
                <SelectItem value="generate_id">Generate ID</SelectItem>
                <SelectItem value="role_change">Role Change</SelectItem>
                <SelectItem value="bulk_delete">Bulk Delete</SelectItem>
                <SelectItem value="bulk_update">Bulk Update</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterResourceType} onValueChange={setFilterResourceType}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by resource" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resources</SelectItem>
                <SelectItem value="vendor">Vendor</SelectItem>
                <SelectItem value="export">Export</SelectItem>
                <SelectItem value="campaign">Campaign</SelectItem>
                <SelectItem value="plan">Plan</SelectItem>
                <SelectItem value="client">Client</SelectItem>
                <SelectItem value="invoice">Invoice</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity ({filteredLogs.length} records)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource Type</TableHead>
                  <TableHead>Resource ID</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No audit logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs">
                        {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell className="font-medium">{log.user_email}</TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.resource_type}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.resource_id || '-'}
                      </TableCell>
                      <TableCell>
                        <details className="cursor-pointer">
                          <summary className="text-xs text-muted-foreground hover:text-foreground">
                            View details
                          </summary>
                          <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-w-md">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
