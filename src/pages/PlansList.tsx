import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Eye, Trash2, MoreVertical, Share2, Copy, Ban, Activity, ExternalLink, FileText, Rocket, Download } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getPlanStatusColor, formatDate as formatPlanDate } from "@/utils/plans";
import { toast } from "@/hooks/use-toast";
import { TableFilters } from "@/components/common/table-filters";
import { BulkActionsDropdown, commonBulkActions } from "@/components/common/bulk-actions-dropdown";
import { useTableSettings, formatCurrency as formatCurrencyUtil, formatDate as formatDateUtil } from "@/hooks/use-table-settings";
import { useTableDensity } from "@/hooks/use-table-density";
import { Checkbox } from "@/components/ui/checkbox";
import { highlightText } from "@/components/common/global-search";

export default function PlansList() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedPlans, setSelectedPlans] = useState<Set<string>>(new Set());
  const [globalSearchFiltered, setGlobalSearchFiltered] = useState<any[]>([]);

  const { density, setDensity, getRowClassName, getCellClassName } = useTableDensity("plans");
  const { 
    settings, 
    updateSettings, 
    resetSettings,
    isReady: settingsReady 
  } = useTableSettings("plans");

  // Auto-refresh
  useEffect(() => {
    if (!settingsReady || settings.autoRefreshInterval === 0) return;
    const interval = setInterval(() => {
      fetchPlans();
    }, settings.autoRefreshInterval * 1000);
    return () => clearInterval(interval);
  }, [settings.autoRefreshInterval, settingsReady]);

  useEffect(() => {
    checkAdminStatus();
    fetchPlans();
    
    const channel = supabase
      .channel('plans-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'plans'
        },
        () => {
          fetchPlans();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      setIsAdmin(data?.role === 'admin');
    }
  };

  const fetchPlans = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch plans",
        variant: "destructive",
      });
    } else {
      setPlans(data || []);
    }
    setLoading(false);
    setGlobalSearchFiltered(data || []);
  };

  const filteredPlans = globalSearchFiltered.filter(plan => {
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesSearch = (
        plan.id?.toLowerCase().includes(term) ||
        plan.client_name?.toLowerCase().includes(term) ||
        plan.plan_name?.toLowerCase().includes(term)
      );
      if (!matchesSearch) return false;
    }
    
    // Status filter
    if (filterStatus && plan.status !== filterStatus) return false;
    
    return true;
  });
  
  const uniqueStatuses = Array.from(new Set(plans.map(p => p.status).filter(Boolean)));

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this plan?")) return;

    const { error } = await supabase
      .from('plans')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete plan",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Plan deleted successfully",
      });
      fetchPlans();
    }
  };

  const handleShare = async (plan: any) => {
    let shareToken = plan.share_token;
    
    if (!shareToken) {
      const { data } = await supabase.rpc('generate_share_token');
      shareToken = data;
      
      await supabase
        .from('plans')
        .update({ share_token: shareToken })
        .eq('id', plan.id);
    }

    const shareUrl = `${window.location.origin}/admin/plans/${plan.id}/share/${shareToken}`;
    await navigator.clipboard.writeText(shareUrl);
    
    toast({
      title: "Public Link Copied",
      description: "Share link copied to clipboard",
    });
  };

  const handleCopy = async (id: string) => {
    await navigator.clipboard.writeText(id);
    toast({
      title: "Copied",
      description: "Plan ID copied to clipboard",
    });
  };

  const handleBlock = async (id: string) => {
    const { error } = await supabase
      .from('plans')
      .update({ status: 'Rejected' })
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to reject plan",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Plan rejected successfully",
      });
      fetchPlans();
    }
  };

  const handleBulkAction = async (actionId: string) => {
    const selectedIds = Array.from(selectedPlans);
    
    if (actionId === "delete") {
      const { error } = await supabase
        .from("plans")
        .delete()
        .in("id", selectedIds);

      if (error) throw error;
      
      fetchPlans();
      setSelectedPlans(new Set());
    } else if (actionId === "export") {
      const selectedData = filteredPlans.filter(p => selectedIds.includes(p.id));
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(selectedData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Plans");
      XLSX.writeFile(wb, "plans-export.xlsx");
    }
  };

  const togglePlanSelection = (id: string) => {
    const newSelection = new Set(selectedPlans);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedPlans(newSelection);
  };

  const toggleAllPlans = () => {
    if (selectedPlans.size === filteredPlans.length) {
      setSelectedPlans(new Set());
    } else {
      setSelectedPlans(new Set(filteredPlans.map(p => p.id)));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Plans & Quotations</h1>
              <p className="text-muted-foreground mt-1">
                Manage client proposals and quotations
              </p>
            </div>
            {isAdmin && (
              <Button
                onClick={() => navigate('/admin/plans/new')}
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                size="lg"
              >
                <Plus className="mr-2 h-5 w-5" />
                New Plan
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Plans</p>
                  <p className="text-2xl font-bold">{plans.length}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold">
                    {plans.filter(p => p.status === 'Approved').length}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Converted</p>
                  <p className="text-2xl font-bold">
                    {plans.filter(p => p.status === 'Converted').length}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <Rocket className="h-6 w-6 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Draft</p>
                  <p className="text-2xl font-bold">
                    {plans.filter(p => p.status === 'Draft').length}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        {selectedPlans.size > 0 && (
          <Card className="mb-4 bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-lg font-bold text-primary-foreground">{selectedPlans.size}</span>
                </div>
                <div>
                  <p className="font-semibold">Plans Selected</p>
                  <p className="text-sm text-muted-foreground">Ready for bulk actions</p>
                </div>
              </div>
              <BulkActionsDropdown
                selectedCount={selectedPlans.size}
                actions={[
                  { ...commonBulkActions.export, id: "export", label: "Export Selected" },
                  commonBulkActions.delete,
                ]}
                onAction={handleBulkAction}
              />
            </CardContent>
          </Card>
        )}

        <TableFilters
          filters={[
            {
              key: "search",
              label: "Search",
              type: "text",
              placeholder: "Search by Plan ID, client name, or plan name...",
            },
            {
              key: "status",
              label: "Status",
              type: "select",
              options: uniqueStatuses.map(s => ({ value: s, label: s })),
            },
          ]}
          filterValues={{
            search: searchTerm,
            status: filterStatus,
          }}
          onFilterChange={(key, value) => {
            if (key === "search") setSearchTerm(value);
            else if (key === "status") setFilterStatus(value);
          }}
          onClearFilters={() => {
            setSearchTerm("");
            setFilterStatus("");
          }}
          allColumns={[
            { key: "select", label: "Select" },
            { key: "id", label: "Plan ID" },
            { key: "client", label: "Client Name" },
            { key: "type", label: "Plan Type" },
            { key: "status", label: "Status" },
            { key: "duration", label: "Duration" },
            { key: "total", label: "Grand Total" },
            { key: "created", label: "Created" },
            { key: "actions", label: "Actions" },
          ]}
          visibleColumns={["select", "id", "client", "type", "status", "duration", "total", "created", "actions"]}
          onColumnVisibilityChange={() => {}}
          onResetColumns={() => {}}
          density={density}
          onDensityChange={setDensity}
          tableKey="plans"
          enableGlobalSearch
          searchableData={plans}
          searchableKeys={["id", "client_name", "plan_name", "plan_type", "status"]}
          onGlobalSearchFilter={setGlobalSearchFiltered}
          settings={settings}
          onUpdateSettings={updateSettings}
          onResetSettings={resetSettings}
        />

        {/* Table Card */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-lg">All Plans</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className={`bg-muted/50 ${getRowClassName()}`}>
                  <TableHead className={getCellClassName()}>
                    <Checkbox
                      checked={selectedPlans.size === filteredPlans.length && filteredPlans.length > 0}
                      onCheckedChange={toggleAllPlans}
                    />
                  </TableHead>
                  <TableHead className={`font-semibold ${getCellClassName()}`}>Plan ID</TableHead>
                  <TableHead className={`font-semibold ${getCellClassName()}`}>Client Name</TableHead>
                  <TableHead className={`font-semibold ${getCellClassName()}`}>Plan Type</TableHead>
                  <TableHead className={`font-semibold ${getCellClassName()}`}>Status</TableHead>
                  <TableHead className={`font-semibold ${getCellClassName()}`}>Duration</TableHead>
                  <TableHead className={`text-right font-semibold ${getCellClassName()}`}>Grand Total</TableHead>
                  <TableHead className={`font-semibold ${getCellClassName()}`}>Created</TableHead>
                  <TableHead className={`text-right font-semibold ${getCellClassName()}`}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading || !settingsReady ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        <p className="text-muted-foreground">Loading plans...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredPlans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="h-12 w-12 text-muted-foreground/50" />
                        <p className="text-muted-foreground font-medium">No plans found</p>
                        <p className="text-sm text-muted-foreground">
                          {searchTerm ? 'Try adjusting your search criteria' : 'Create your first plan to get started'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPlans.map((plan) => (
                    <TableRow 
                      key={plan.id} 
                      className={`hover:bg-muted/50 cursor-pointer transition-colors ${getRowClassName()}`}
                      onClick={() => navigate(`/admin/plans/${plan.id}`)}
                    >
                      <TableCell className={getCellClassName()} onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedPlans.has(plan.id)}
                          onCheckedChange={() => togglePlanSelection(plan.id)}
                        />
                      </TableCell>
                      <TableCell className={`font-medium text-primary ${getCellClassName()}`}>{plan.id}</TableCell>
                      <TableCell className={`font-medium ${getCellClassName()}`}>{plan.client_name}</TableCell>
                      <TableCell className={getCellClassName()}>
                        <Badge variant="outline" className="font-normal">
                          {plan.plan_type}
                        </Badge>
                      </TableCell>
                      <TableCell className={getCellClassName()}>
                        <Badge className={getPlanStatusColor(plan.status)}>
                          {plan.status}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-muted-foreground ${getCellClassName()}`}>{plan.duration_days} days</TableCell>
                      <TableCell className={`text-right font-semibold ${getCellClassName()}`}>
                        {formatCurrencyUtil(plan.grand_total, settings.currencyFormat, settings.currencySymbol, settings.compactNumbers)}
                      </TableCell>
                      <TableCell className={`text-muted-foreground ${getCellClassName()}`}>
                        {formatDateUtil(plan.created_at, settings.dateFormat, settings.showTimestamps)}
                      </TableCell>
                      <TableCell className={`text-right ${getCellClassName()}`}>
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/plans/${plan.id}`);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {isAdmin && (
                                <>
                                  <DropdownMenuItem onClick={() => navigate(`/admin/plans/edit/${plan.id}`)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDelete(plan.id)}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleBlock(plan.id)}>
                                    <Ban className="mr-2 h-4 w-4" />
                                    Reject
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              <DropdownMenuItem onClick={() => handleCopy(plan.id)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Copy ID
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleShare(plan)}>
                                <Share2 className="mr-2 h-4 w-4" />
                                Share
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleShare(plan)}>
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Public Link
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/admin/plans/${plan.id}`)}>
                                <Activity className="mr-2 h-4 w-4" />
                                Activity
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
