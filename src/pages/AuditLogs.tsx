import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ROUTES } from "@/lib/routes";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Shield, Search, Download, Filter, Calendar, User, Activity, ChevronDown, ChevronUp, Eye } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";

interface AuditLog {
  id: string;
  user_id: string | null;
  user_name: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  resource_name: string | null;
  details: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

const RESOURCE_TYPES = [
  { value: "all", label: "All Resources" },
  { value: "campaign", label: "Campaign" },
  { value: "plan", label: "Plan" },
  { value: "client", label: "Client" },
  { value: "invoice", label: "Invoice" },
  { value: "expense", label: "Expense" },
  { value: "media_asset", label: "Media Asset" },
  { value: "operation", label: "Operation" },
  { value: "payment", label: "Payment" },
  { value: "vendor", label: "Vendor" },
  { value: "export", label: "Export" },
  { value: "user", label: "User" },
];

const ACTION_TYPES = [
  { value: "all", label: "All Actions" },
  { value: "create", label: "Create" },
  { value: "update", label: "Update" },
  { value: "delete", label: "Delete" },
  { value: "create_direct_campaign", label: "Direct Campaign" },
  { value: "create_historical_campaign", label: "Historical Campaign" },
  { value: "status_change", label: "Status Change" },
  { value: "price_change", label: "Price Change" },
  { value: "invoice_generated", label: "Invoice Generated" },
  { value: "export_data", label: "Export Data" },
  { value: "role_change", label: "Role Change" },
  { value: "bulk_delete", label: "Bulk Delete" },
  { value: "bulk_update", label: "Bulk Update" },
];

export default function AuditLogs() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterResourceType, setFilterResourceType] = useState<string>("all");
  const [filterUser, setFilterUser] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Get URL parameters for filtering
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const resourceType = urlParams.get('resource_type');
    const resourceId = urlParams.get('resource_id');
    const campaignId = urlParams.get('campaign_id');
    const clientId = urlParams.get('client_id');
    
    if (resourceType) {
      setFilterResourceType(resourceType);
    }
    if (resourceId || campaignId || clientId) {
      setSearchTerm(resourceId || campaignId || clientId || '');
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      navigate(ROUTES.DASHBOARD);
      return;
    }
    fetchLogs();
  }, [isAdmin, navigate, dateRange]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (dateRange?.from) {
        query = query.gte('created_at', startOfDay(dateRange.from).toISOString());
      }
      if (dateRange?.to) {
        query = query.lte('created_at', endOfDay(dateRange.to).toISOString());
      }

      const { data, error } = await query.limit(1000);

      if (error) throw error;
      setLogs(data || []);
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
      log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = filterAction === "all" || log.action === filterAction || 
      (filterAction === "create" && log.action.startsWith("create")) ||
      (filterAction === "update" && log.action.includes("update")) ||
      (filterAction === "delete" && log.action.includes("delete"));
    
    const matchesResourceType = filterResourceType === "all" || log.resource_type === filterResourceType;
    const matchesUser = !filterUser || log.user_name?.toLowerCase().includes(filterUser.toLowerCase());
    
    return matchesSearch && matchesAction && matchesResourceType && matchesUser;
  });

  const exportLogs = () => {
    const csv = [
      ['Timestamp', 'User', 'Action', 'Resource Type', 'Resource ID', 'Resource Name', 'IP Address', 'Details'].join(','),
      ...filteredLogs.map(log => [
        format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
        `"${log.user_name || 'Unknown'}"`,
        log.action,
        log.resource_type,
        log.resource_id || '',
        `"${log.resource_name || ''}"`,
        log.ip_address || '',
        `"${JSON.stringify(log.details || {}).replace(/"/g, '""')}"`,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
    a.click();
  };

  const getActionBadge = (action: string) => {
    const actionColors: Record<string, string> = {
      create: "bg-green-100 text-green-800 border-green-200",
      create_direct_campaign: "bg-blue-100 text-blue-800 border-blue-200",
      create_historical_campaign: "bg-purple-100 text-purple-800 border-purple-200",
      update: "bg-yellow-100 text-yellow-800 border-yellow-200",
      delete: "bg-red-100 text-red-800 border-red-200",
      bulk_delete: "bg-red-100 text-red-800 border-red-200",
      status_change: "bg-blue-100 text-blue-800 border-blue-200",
      price_change: "bg-orange-100 text-orange-800 border-orange-200",
      invoice_generated: "bg-green-100 text-green-800 border-green-200",
      export_data: "bg-gray-100 text-gray-800 border-gray-200",
      role_change: "bg-purple-100 text-purple-800 border-purple-200",
    };

    const colorClass = Object.entries(actionColors).find(([key]) => 
      action.toLowerCase().includes(key)
    )?.[1] || "bg-gray-100 text-gray-800 border-gray-200";

    return <Badge className={colorClass}>{action.replace(/_/g, ' ')}</Badge>;
  };

  const getResourceBadge = (resourceType: string) => {
    const resourceColors: Record<string, string> = {
      campaign: "bg-indigo-100 text-indigo-800",
      plan: "bg-cyan-100 text-cyan-800",
      client: "bg-emerald-100 text-emerald-800",
      invoice: "bg-amber-100 text-amber-800",
      expense: "bg-rose-100 text-rose-800",
      media_asset: "bg-violet-100 text-violet-800",
      operation: "bg-teal-100 text-teal-800",
      payment: "bg-lime-100 text-lime-800",
    };

    return (
      <Badge variant="outline" className={resourceColors[resourceType] || ""}>
        {resourceType}
      </Badge>
    );
  };

  const toggleRowExpand = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  // Statistics
  const stats = {
    total: filteredLogs.length,
    creates: filteredLogs.filter(l => l.action.includes('create')).length,
    updates: filteredLogs.filter(l => l.action.includes('update')).length,
    deletes: filteredLogs.filter(l => l.action.includes('delete')).length,
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
            Audit Trail
          </h2>
          <p className="text-muted-foreground mt-2">
            Comprehensive tracking of all operations and data changes
          </p>
        </div>
        <Button onClick={exportLogs} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Events</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm text-muted-foreground">Creates</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.creates}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-yellow-500" />
              <span className="text-sm text-muted-foreground">Updates</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.updates}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-sm text-muted-foreground">Deletes</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.deletes}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>Filter audit logs by date, action, resource type, or user</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Date Range */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <Calendar className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d, yyyy")}
                      </>
                    ) : (
                      format(dateRange.from, "MMM d, yyyy")
                    )
                  ) : (
                    "Pick dates"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Action Filter */}
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                {ACTION_TYPES.map((action) => (
                  <SelectItem key={action.value} value={action.value}>
                    {action.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Resource Type Filter */}
            <Select value={filterResourceType} onValueChange={setFilterResourceType}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by resource" />
              </SelectTrigger>
              <SelectContent>
                {RESOURCE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* User Filter */}
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter by user..."
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log ({filteredLogs.length} records)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Resource ID</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No audit logs found matching your filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.slice(0, 100).map((log) => (
                    <>
                      <TableRow key={log.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0"
                            onClick={() => toggleRowExpand(log.id)}
                          >
                            {expandedRows.has(log.id) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
                        </TableCell>
                        <TableCell className="font-medium">{log.user_name || 'System'}</TableCell>
                        <TableCell>{getActionBadge(log.action)}</TableCell>
                        <TableCell>{getResourceBadge(log.resource_type)}</TableCell>
                        <TableCell className="font-mono text-xs max-w-[150px] truncate">
                          {log.resource_id || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedLog(log)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      {expandedRows.has(log.id) && (
                        <TableRow key={`${log.id}-details`}>
                          <TableCell colSpan={7} className="bg-muted/30 p-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Resource Name</p>
                                <p className="font-medium">{log.resource_name || '-'}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">IP Address</p>
                                <p className="font-mono">{log.ip_address || '-'}</p>
                              </div>
                              {log.details && Object.keys(log.details).length > 0 && (
                                <div className="col-span-2">
                                  <p className="text-muted-foreground mb-2">Details</p>
                                  <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-40">
                                    {JSON.stringify(log.details, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {filteredLogs.length > 100 && (
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Showing first 100 of {filteredLogs.length} records. Use filters to narrow down results.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Audit Log Details
              {selectedLog && getActionBadge(selectedLog.action)}
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Timestamp</p>
                    <p className="font-mono">{format(new Date(selectedLog.created_at), 'PPpp')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">User</p>
                    <p className="font-medium">{selectedLog.user_name || 'System'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Resource Type</p>
                    {getResourceBadge(selectedLog.resource_type)}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Resource ID</p>
                    <p className="font-mono text-sm">{selectedLog.resource_id || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Resource Name</p>
                    <p>{selectedLog.resource_name || '-'}</p>
                  </div>
                  {selectedLog.ip_address && (
                    <div>
                      <p className="text-sm text-muted-foreground">IP Address</p>
                      <p className="font-mono">{selectedLog.ip_address}</p>
                    </div>
                  )}
                </div>

                {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Full Details</p>
                    <pre className="text-xs bg-muted p-4 rounded overflow-auto">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.user_agent && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">User Agent</p>
                    <p className="text-xs text-muted-foreground font-mono break-all">
                      {selectedLog.user_agent}
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
