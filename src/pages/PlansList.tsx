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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Eye, Trash2, MoreVertical, Share2, Copy, Ban, Activity, ExternalLink, FileText, Rocket, Download, Sparkles, ChevronDown, Info, FolderOpen, Edit } from "lucide-react";
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
import { FilterPresets } from "@/components/common/filter-presets";
import { BulkActionsDropdown, commonBulkActions } from "@/components/common/bulk-actions-dropdown";
import { useTableSettings, formatCurrency as formatCurrencyUtil, formatDate as formatDateUtil } from "@/hooks/use-table-settings";
import { useTableDensity } from "@/hooks/use-table-density";
import { useColumnPrefs } from "@/hooks/use-column-prefs";
import { Checkbox } from "@/components/ui/checkbox";
import { highlightText } from "@/components/common/global-search";
import { TemplatesDialog } from "@/components/plans/TemplatesDialog";
import { BulkActionsToolbar } from "@/components/plans/BulkActionsToolbar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function PlansList() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedPlans, setSelectedPlans] = useState<Set<string>>(new Set());
  const [globalSearchFiltered, setGlobalSearchFiltered] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showTemplatesDialog, setShowTemplatesDialog] = useState(false);

  const { density, setDensity, getRowClassName, getCellClassName } = useTableDensity("plans");
  const { 
    settings, 
    updateSettings, 
    resetSettings,
    isReady: settingsReady 
  } = useTableSettings("plans");

  // Define all columns
  const allColumns = [
    { key: "select", label: "Select" },
    { key: "id", label: "Plan ID" },
    { key: "employee", label: "Employee" },
    { key: "client", label: "Customer Name" },
    { key: "display", label: "Display" },
    { key: "from", label: "From" },
    { key: "to", label: "To" },
    { key: "days", label: "Days" },
    { key: "sqft", label: "SQFT" },
    { key: "amount", label: "Amount" },
    { key: "qos", label: "QoS" },
    { key: "status", label: "Status" },
    { key: "actions", label: "Actions" },
  ];

  const defaultVisibleColumns = allColumns.map(col => col.key);

  const {
    isReady: columnPrefsReady,
    visibleKeys: visibleColumns,
    setVisibleKeys: setVisibleColumns,
    reset: resetColumns,
  } = useColumnPrefs("plans-columns", allColumns.map(c => c.key), defaultVisibleColumns);

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
    
    // Fetch plans
    const { data: plansData, error: plansError } = await supabase
      .from('plans')
      .select('*')
      .order('created_at', { ascending: false });

    if (plansError) {
      toast({
        title: "Error",
        description: "Failed to fetch plans",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Fetch plan items with asset SQFT data for each plan
    const plansWithSqft = await Promise.all(
      (plansData || []).map(async (plan) => {
        const { data: items } = await supabase
          .from('plan_items')
          .select(`
            asset_id,
            dimensions,
            media_assets!inner(total_sqft, media_type, location)
          `)
          .eq('plan_id', plan.id);

        // Calculate total SQFT and create breakdown data
        const sqftBreakdown = items?.map(item => {
          const asset = (item as any).media_assets;
          const sqft = asset?.total_sqft || 0;
          return {
            asset_id: item.asset_id,
            dimensions: item.dimensions,
            media_type: asset?.media_type || 'Unknown',
            location: asset?.location || 'Unknown',
            sqft: Number(sqft)
          };
        }) || [];

        const totalSqft = sqftBreakdown.reduce((sum, item) => sum + item.sqft, 0);

        return {
          ...plan,
          total_sqft: totalSqft,
          sqft_breakdown: sqftBreakdown
        };
      })
    );

    setPlans(plansWithSqft);
    setGlobalSearchFiltered(plansWithSqft);
    setLoading(false);
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

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedPlans.size} plan(s)?`)) return;

    try {
      const { error } = await supabase
        .from('plans')
        .delete()
        .in('id', Array.from(selectedPlans));

      if (error) throw error;

      toast({
        title: "Success",
        description: `${selectedPlans.size} plan(s) deleted successfully`,
      });

      setSelectedPlans(new Set());
      fetchPlans();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleBulkStatusUpdate = async (status: "Draft" | "Sent" | "Approved" | "Rejected" | "Converted") => {
    try {
      const { error } = await supabase
        .from('plans')
        .update({ status })
        .in('id', Array.from(selectedPlans));

      if (error) throw error;

      toast({
        title: "Success",
        description: `${selectedPlans.size} plan(s) updated to ${status}`,
      });

      setSelectedPlans(new Set());
      fetchPlans();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight">Plan List</h1>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setShowTemplatesDialog(true)}
                variant="outline"
                className="border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                <FolderOpen className="mr-2 h-4 w-4" />
                Templates
              </Button>
              {isAdmin && (
                <Button
                  onClick={() => {
                    toast({
                      title: "AI Plan Creation",
                      description: "AI-powered plan creation is coming soon!",
                    });
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Create With AI
                </Button>
              )}
              <Button
                onClick={() => navigate('/admin/plans/new')}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Plan
              </Button>
            </div>
          </div>
        </div>


        {/* Filters Bar */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                Display
                <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </Button>
              
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Filter by Plan ID, Customer Name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <Button size="icon" className="bg-blue-600 hover:bg-blue-700 text-white h-10 w-10">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </Button>
              </div>

              <Button variant="ghost" size="icon" onClick={() => setShowFilters(!showFilters)}>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Button>
            </div>

            {/* Collapsible Advanced Filters */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t space-y-4">
                <TableFilters
                  filters={[
                    {
                      key: "status",
                      label: "Status",
                      type: "select",
                      options: uniqueStatuses.map(s => ({ value: s, label: s })),
                    },
                  ]}
                  filterValues={{
                    status: filterStatus,
                  }}
                  onFilterChange={(key, value) => {
                    if (key === "status") setFilterStatus(value);
                  }}
                  onClearFilters={() => {
                    setSearchTerm("");
                    setFilterStatus("");
                  }}
                  allColumns={allColumns}
                  visibleColumns={visibleColumns}
                  onColumnVisibilityChange={setVisibleColumns}
                  onResetColumns={resetColumns}
                  density={density}
                  onDensityChange={setDensity}
                  tableKey="plans"
                  settings={settings}
                  onUpdateSettings={updateSettings}
                  onResetSettings={resetSettings}
                />
                <FilterPresets
                  tableKey="plans"
                  currentFilters={{
                    searchTerm,
                    status: filterStatus,
                  }}
                  onApplyPreset={(filters) => {
                    setSearchTerm(filters.searchTerm || "");
                    setFilterStatus(filters.status || "");
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bulk Actions Toolbar */}
        {selectedPlans.size > 0 && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-medium">
                  {selectedPlans.size} plan(s) selected
                </span>
                
                <Select onValueChange={handleBulkStatusUpdate}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Update Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Sent">Sent</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  onClick={handleBulkDelete}
                  className="text-destructive border-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Selected
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setSelectedPlans(new Set())}
                >
                  Clear Selection
                </Button>

                {selectedPlans.size >= 2 && (
                  <Button
                    onClick={() => {
                      const planIds = Array.from(selectedPlans).join(',');
                      navigate(`/admin/plans-compare?plans=${planIds}`);
                    }}
                    variant="outline"
                    className="border-blue-600 text-blue-600 hover:bg-blue-50"
                  >
                    Compare Selected Plans
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Table Card */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className={`bg-muted/50 ${getRowClassName()}`}>
                  {visibleColumns.includes("select") && (
                    <TableHead className={getCellClassName()}>
                      <Checkbox
                        checked={selectedPlans.size === filteredPlans.length && filteredPlans.length > 0}
                        onCheckedChange={toggleAllPlans}
                      />
                    </TableHead>
                  )}
                  {visibleColumns.includes("id") && (
                    <TableHead className={`font-semibold ${getCellClassName()}`}>Plan ID</TableHead>
                  )}
                  {visibleColumns.includes("employee") && (
                    <TableHead className={`font-semibold ${getCellClassName()}`}>Employee</TableHead>
                  )}
                  {visibleColumns.includes("client") && (
                    <TableHead className={`font-semibold ${getCellClassName()}`}>Customer Name</TableHead>
                  )}
                  {visibleColumns.includes("display") && (
                    <TableHead className={`font-semibold ${getCellClassName()}`}>Display</TableHead>
                  )}
                  {visibleColumns.includes("from") && (
                    <TableHead className={`font-semibold ${getCellClassName()}`}>From</TableHead>
                  )}
                  {visibleColumns.includes("to") && (
                    <TableHead className={`font-semibold ${getCellClassName()}`}>To</TableHead>
                  )}
                  {visibleColumns.includes("days") && (
                    <TableHead className={`font-semibold ${getCellClassName()}`}>Days</TableHead>
                  )}
                  {visibleColumns.includes("sqft") && (
                    <TableHead className={`font-semibold ${getCellClassName()}`}>SQFT</TableHead>
                  )}
                  {visibleColumns.includes("amount") && (
                    <TableHead className={`text-right font-semibold ${getCellClassName()}`}>Amount</TableHead>
                  )}
                  {visibleColumns.includes("qos") && (
                    <TableHead className={`text-right font-semibold ${getCellClassName()}`}>QoS</TableHead>
                  )}
                  {visibleColumns.includes("status") && (
                    <TableHead className={`font-semibold ${getCellClassName()}`}>Status</TableHead>
                  )}
                  {visibleColumns.includes("actions") && (
                    <TableHead className={`text-right font-semibold ${getCellClassName()}`}>Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading || !settingsReady || !columnPrefsReady ? (
                  <TableRow>
                    <TableCell colSpan={visibleColumns.length} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        <p className="text-muted-foreground">Loading plans...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredPlans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={visibleColumns.length} className="text-center py-12">
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
                      {visibleColumns.includes("select") && (
                        <TableCell className={getCellClassName()} onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedPlans.has(plan.id)}
                            onCheckedChange={() => togglePlanSelection(plan.id)}
                          />
                        </TableCell>
                      )}
                      {visibleColumns.includes("id") && (
                        <TableCell className={`font-medium text-primary ${getCellClassName()}`}>{plan.id}</TableCell>
                      )}
                      {visibleColumns.includes("employee") && (
                        <TableCell className={`${getCellClassName()}`}>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                              {plan.client_name?.charAt(0) || 'U'}
                            </div>
                            <span className="font-medium">Raghu Gajula</span>
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.includes("client") && (
                        <TableCell className={`font-medium ${getCellClassName()}`}>{plan.client_name}</TableCell>
                      )}
                      {visibleColumns.includes("display") && (
                        <TableCell className={getCellClassName()}>
                          <span className="text-blue-600 cursor-pointer hover:underline">
                            {plan.plan_name || '-'}
                          </span>
                        </TableCell>
                      )}
                      {visibleColumns.includes("from") && (
                        <TableCell className={`text-muted-foreground ${getCellClassName()}`}>
                          {plan.start_date ? new Date(plan.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '') : '-'}
                        </TableCell>
                      )}
                      {visibleColumns.includes("to") && (
                        <TableCell className={`text-muted-foreground ${getCellClassName()}`}>
                          {plan.end_date ? new Date(plan.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '') : '-'}
                        </TableCell>
                      )}
                      {visibleColumns.includes("days") && (
                        <TableCell className={`${getCellClassName()}`}>{plan.duration_days}</TableCell>
                      )}
                      {visibleColumns.includes("sqft") && (
                        <TableCell className={`text-right ${getCellClassName()}`}>
                        <TooltipProvider>
                          <Tooltip delayDuration={200}>
                            <TooltipTrigger asChild>
                              <div className="inline-flex items-center gap-1.5 cursor-help">
                                <span className="font-medium">
                                  {plan.total_sqft ? plan.total_sqft.toFixed(2) : '0'}
                                </span>
                                {plan.sqft_breakdown && plan.sqft_breakdown.length > 0 && (
                                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                              </div>
                            </TooltipTrigger>
                            {plan.sqft_breakdown && plan.sqft_breakdown.length > 0 && (
                              <TooltipContent 
                                side="left" 
                                align="start"
                                className="max-w-sm p-4 bg-popover border shadow-lg"
                              >
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between pb-2 border-b">
                                    <p className="font-semibold text-sm">SQFT Breakdown</p>
                                    <Badge variant="secondary" className="text-xs">
                                      {plan.sqft_breakdown.length} {plan.sqft_breakdown.length === 1 ? 'Asset' : 'Assets'}
                                    </Badge>
                                  </div>
                                  <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {plan.sqft_breakdown.map((asset: any, idx: number) => (
                                      <div 
                                        key={idx} 
                                        className="flex items-start justify-between gap-3 py-2 px-2 rounded-md hover:bg-muted/50 transition-colors"
                                      >
                                        <div className="flex-1 min-w-0">
                                          <p className="font-medium text-xs text-primary truncate">
                                            {asset.asset_id}
                                          </p>
                                          <p className="text-xs text-muted-foreground truncate">
                                            {asset.media_type}
                                          </p>
                                          <p className="text-xs text-muted-foreground mt-0.5">
                                            {asset.dimensions}
                                          </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <p className="font-semibold text-xs">
                                            {asset.sqft.toFixed(2)} sq.ft
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {((asset.sqft / plan.total_sqft) * 100).toFixed(1)}%
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="flex items-center justify-between pt-2 border-t">
                                    <p className="text-sm font-semibold">Total SQFT:</p>
                                    <p className="text-sm font-bold text-primary">
                                      {plan.total_sqft.toFixed(2)} sq.ft
                                    </p>
                                  </div>
                                </div>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                        </TableCell>
                      )}
                      {visibleColumns.includes("amount") && (
                        <TableCell className={`text-right font-medium ${getCellClassName()}`}>
                          {formatCurrencyUtil(plan.grand_total, settings.currencyFormat, settings.currencySymbol, settings.compactNumbers)}
                        </TableCell>
                      )}
                      {visibleColumns.includes("qos") && (
                        <TableCell className={`text-right ${getCellClassName()}`}>
                          <span className="text-green-600 font-medium">
                            {plan.status === 'Approved' ? '45%' : plan.status === 'Draft' ? '-' : '30%'}
                          </span>
                        </TableCell>
                      )}
                      {visibleColumns.includes("status") && (
                        <TableCell className={getCellClassName()}>
                          <Badge className={getPlanStatusColor(plan.status)}>
                            {plan.status}
                          </Badge>
                        </TableCell>
                      )}
                      {visibleColumns.includes("actions") && (
                        <TableCell className={`text-right ${getCellClassName()}`}>
                        <TooltipProvider>
                          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <Tooltip>
                              <TooltipTrigger asChild>
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
                              </TooltipTrigger>
                              <TooltipContent>View Details</TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/admin/plans/edit/${plan.id}`);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit Plan</TooltipContent>
                            </Tooltip>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                {isAdmin && (
                                  <>
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
                        </TooltipProvider>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Templates Dialog */}
      <TemplatesDialog
        open={showTemplatesDialog}
        onOpenChange={setShowTemplatesDialog}
      />
    </div>
  );
}
