import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { PageContainer } from "@/components/ui/page-container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, Trash2, FileText, Plus, Pencil, CheckCircle2, RefreshCw, CopyPlus } from "lucide-react";
import { CreateCampaignFromPlanDialog } from "@/components/campaigns/CreateCampaignFromPlanDialog";
import { CampaignTemplatesDialog } from "@/components/campaigns/CampaignTemplatesDialog";
import { BulkStatusUpdateDialog } from "@/components/campaigns/BulkStatusUpdateDialog";
import { CampaignHealthAlerts } from "@/components/campaigns/CampaignHealthAlerts";
import { DeleteCampaignDialog } from "@/components/campaigns/DeleteCampaignDialog";
import { ExtendCampaignDialog } from "@/components/campaigns/ExtendCampaignDialog";
import { DuplicateCampaignDialog } from "@/components/campaigns/DuplicateCampaignDialog";
import { getCampaignStatusConfig } from "@/utils/statusBadges";
import { getCampaignStatusColor } from "@/utils/campaigns";
import { formatDate as formatPlanDate } from "@/utils/plans";
import { toast } from "@/hooks/use-toast";
import { TableFilters } from "@/components/common/table-filters";
import { Card, CardContent } from "@/components/ui/card";
import { BulkActionsDropdown, commonBulkActions } from "@/components/common/bulk-actions-dropdown";
import { useTableSettings, formatCurrency as formatCurrencyUtil, formatDate as formatDateUtil } from "@/hooks/use-table-settings";
import { useTableDensity } from "@/hooks/use-table-density";
import { Checkbox } from "@/components/ui/checkbox";
import { SkeletonStats, SkeletonTable } from "@/components/ui/loading-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { PageCustomization } from "@/components/ui/page-customization";
import { useLayoutSettings } from "@/hooks/use-layout-settings";
import { EnhancedFilterToggle } from "@/components/common/EnhancedFilterToggle";
import { MobileBottomNav, MobileBottomNavButton } from "@/components/ui/mobile-bottom-nav";
import { SortableTableHead, SortConfig } from "@/components/common/SortableTableHead";

export default function CampaignsList() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set());
  const [globalSearchFiltered, setGlobalSearchFiltered] = useState<any[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; campaign: any | null }>({
    open: false,
    campaign: null,
  });
  const [extendDialog, setExtendDialog] = useState<{ open: boolean; campaign: any | null }>({
    open: false,
    campaign: null,
  });
  const [duplicateDialog, setDuplicateDialog] = useState<{ open: boolean; campaign: any | null }>({
    open: false,
    campaign: null,
  });
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  const { density, setDensity, getRowClassName, getCellClassName } = useTableDensity("campaigns");
  const { 
    settings, 
    updateSettings, 
    resetSettings,
    isReady: settingsReady 
  } = useTableSettings("campaigns");
  
  const layoutSettings = useLayoutSettings('campaigns-list');
  const [showFilters, setShowFilters] = useState(true);

  // Handle sorting
  const handleSort = (key: string) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        // Cycle: asc -> desc -> null
        if (current.direction === 'asc') {
          return { key, direction: 'desc' };
        }
        return null;
      }
      return { key, direction: 'asc' };
    });
  };

  // Auto-refresh
  useEffect(() => {
    if (!settingsReady || settings.autoRefreshInterval === 0) return;
    const interval = setInterval(() => {
      fetchCampaigns();
    }, settings.autoRefreshInterval * 1000);
    return () => clearInterval(interval);
  }, [settings.autoRefreshInterval, settingsReady]);

  useEffect(() => {
    checkAdminStatus();
    fetchCampaigns();
    // Trigger status update on mount
    updateCampaignStatuses();
    
    const channel = supabase
      .channel('campaigns-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaigns'
        },
        () => {
          fetchCampaigns();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [company]);

  const updateCampaignStatuses = async () => {
    try {
      await supabase.rpc('auto_update_campaign_status');
    } catch (error) {
      console.error('Error updating campaign statuses:', error);
    }
  };

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      // Check if user has admin role among all their roles
      const hasAdminRole = data?.some(r => r.role === 'admin');
      setIsAdmin(hasAdminRole || false);
    }
  };

  const fetchCampaigns = async () => {
    setLoading(true);
    
    // Get user's company ID for multi-tenant filtering
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: companyUserData } = await supabase
      .from('company_users')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!companyUserData) {
      toast({
        title: "Error",
        description: "No company association found",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Use selected company from localStorage if available (for platform admins)
    const selectedCompanyId = localStorage.getItem('selected_company_id') || companyUserData.company_id;

    // CRITICAL: Filter by company_id for multi-tenant isolation
    // Also filter out soft-deleted campaigns
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('company_id', selectedCompanyId)
      .or('is_deleted.is.null,is_deleted.eq.false')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch campaigns",
        variant: "destructive",
      });
    } else {
      setCampaigns(data || []);
    }
    setLoading(false);
    setGlobalSearchFiltered(data || []);
  };

  const filteredCampaigns = useMemo(() => {
    let result = globalSearchFiltered.filter(campaign => {
      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesSearch = (
          campaign.id?.toLowerCase().includes(term) ||
          campaign.client_name?.toLowerCase().includes(term) ||
          campaign.campaign_name?.toLowerCase().includes(term)
        );
        if (!matchesSearch) return false;
      }
      
      // Status filter
      if (filterStatus && filterStatus !== "all" && campaign.status !== filterStatus) return false;
      
      return true;
    });
    
    // Apply sorting
    if (sortConfig && sortConfig.direction) {
      result = [...result].sort((a, b) => {
        let aVal: any;
        let bVal: any;
        
        // Handle special cases for sorting keys
        switch (sortConfig.key) {
          case 'id':
            aVal = a.id;
            bVal = b.id;
            break;
          case 'client_name':
            aVal = a.client_name;
            bVal = b.client_name;
            break;
          case 'campaign_name':
            aVal = a.campaign_name;
            bVal = b.campaign_name;
            break;
          case 'start_date':
            aVal = a.start_date ? new Date(a.start_date).getTime() : 0;
            bVal = b.start_date ? new Date(b.start_date).getTime() : 0;
            break;
          case 'status':
            aVal = a.status;
            bVal = b.status;
            break;
          case 'total_assets':
            aVal = a.total_assets || 0;
            bVal = b.total_assets || 0;
            break;
          case 'grand_total':
            aVal = a.grand_total || 0;
            bVal = b.grand_total || 0;
            break;
          default:
            aVal = a[sortConfig.key];
            bVal = b[sortConfig.key];
        }
        
        // Handle null/undefined
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        
        // Compare values
        let comparison: number;
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal;
        } else {
          comparison = String(aVal).toLowerCase().localeCompare(String(bVal).toLowerCase());
        }
        
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }
    
    return result;
  }, [globalSearchFiltered, searchTerm, filterStatus, sortConfig]);
  
  const uniqueStatuses = Array.from(new Set(campaigns.map(c => c.status).filter(Boolean)));

  const handleOpenDeleteDialog = (campaign: any) => {
    setDeleteDialog({ open: true, campaign });
  };

  const handleBulkAction = async (actionId: string) => {
    const selectedIds = Array.from(selectedCampaigns);
    
    if (actionId === "delete") {
      const { error } = await supabase
        .from("campaigns")
        .delete()
        .in("id", selectedIds);

      if (error) throw error;
      
      fetchCampaigns();
      setSelectedCampaigns(new Set());
    } else if (actionId === "export") {
      const selectedData = filteredCampaigns.filter(c => selectedIds.includes(c.id));
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(selectedData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Campaigns");
      XLSX.writeFile(wb, "campaigns-export.xlsx");
    } else if (actionId === "auto-complete-past") {
      const today = new Date();
      const selectedData = filteredCampaigns.filter(c => 
        selectedIds.includes(c.id) && 
        new Date(c.end_date) < today &&
        c.status !== 'Completed'
      );

      if (selectedData.length === 0) {
        toast({
          title: "No campaigns to complete",
          description: "Selected campaigns are either not ended yet or already completed",
        });
        return;
      }

      if (!confirm(`Auto-complete ${selectedData.length} past campaign(s)? This will mark them as Completed.`)) {
        return;
      }

      const { error } = await supabase
        .from("campaigns")
        .update({ status: 'Completed' })
        .in("id", selectedData.map(c => c.id));

      if (error) {
        toast({
          title: "Error",
          description: "Failed to auto-complete campaigns",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `${selectedData.length} campaign(s) marked as completed`,
        });
        fetchCampaigns();
        setSelectedCampaigns(new Set());
      }
    }
  };

  const toggleCampaignSelection = (id: string) => {
    const newSelection = new Set(selectedCampaigns);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedCampaigns(newSelection);
  };

  const toggleAllCampaigns = () => {
    if (selectedCampaigns.size === filteredCampaigns.length) {
      setSelectedCampaigns(new Set());
    } else {
      setSelectedCampaigns(new Set(filteredCampaigns.map(c => c.id)));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageContainer className="space-y-6">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-2">
              <Skeleton className="h-9 w-48" />
              <Skeleton className="h-5 w-64" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          <SkeletonStats count={4} />
          <SkeletonTable rows={10} columns={6} />
        </PageContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageContainer>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Campaigns</h1>
            <p className="text-muted-foreground mt-1">
              Track and manage active campaigns
            </p>
          </div>
          <div className="flex gap-2">
            <CampaignTemplatesDialog />
            {isAdmin && (
              <>
                <BulkStatusUpdateDialog
                  selectedCampaigns={Array.from(selectedCampaigns)}
                  onUpdate={fetchCampaigns}
                  onClearSelection={() => setSelectedCampaigns(new Set())}
                />
                <Button
                  onClick={() => navigate('/admin/campaigns/create')}
                  size="lg"
                  variant="outline"
                  className="transition-smooth"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Direct Campaign
                </Button>
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  size="lg"
                  className="bg-gradient-primary hover:shadow-glow transition-smooth"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  From Plan
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="mb-6">
          <div className="flex items-center gap-2 border-b border-border overflow-x-auto pb-0">
            {[
              { label: "All Campaigns", value: "all" },
              { label: "Running", value: "Running" },
              { label: "Draft", value: "Draft" },
              { label: "Upcoming", value: "Upcoming" },
              { label: "Completed", value: "Completed" },
              { label: "Cancelled", value: "Cancelled" },
              { label: "Archived", value: "Archived" },
            ].map((tab) => {
              const count = tab.value === "all" 
                ? campaigns.length 
                : campaigns.filter(c => c.status === tab.value).length;
              
              return (
                <button
                  key={tab.value}
                  onClick={() => setFilterStatus(tab.value)}
                  className={`
                    px-4 py-3 text-sm font-medium whitespace-nowrap
                    border-b-2 transition-smooth
                    ${filterStatus === tab.value
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                    }
                  `}
                >
                  {tab.label}
                  {count > 0 && (
                    <span className={`
                      ml-2 px-2 py-0.5 rounded-full text-xs
                      ${filterStatus === tab.value
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                      }
                    `}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Health Alerts */}
        <div className="mb-6">
          <CampaignHealthAlerts />
        </div>

        {/* Bulk Actions */}
        {selectedCampaigns.size > 0 && (
          <Card className="mb-4 bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-lg font-bold text-primary-foreground">{selectedCampaigns.size}</span>
                </div>
                <div>
                  <p className="font-semibold">Campaigns Selected</p>
                  <p className="text-sm text-muted-foreground">Ready for bulk actions</p>
                </div>
              </div>
              <BulkActionsDropdown
                selectedCount={selectedCampaigns.size}
                actions={[
                  { ...commonBulkActions.export, id: "export", label: "Export Selected" },
                  ...(isAdmin ? [{
                    id: "auto-complete-past",
                    label: "Auto-Complete Past",
                    icon: CheckCircle2,
                    variant: "default" as const,
                  }] : []),
                  commonBulkActions.delete,
                ]}
                onAction={handleBulkAction}
              />
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <TableFilters
          filters={[
            {
              key: "search",
              label: "Search",
              type: "text",
              placeholder: "Search by Campaign ID, client, or campaign name...",
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
            setFilterStatus("all");
          }}
          allColumns={[
            { key: "select", label: "Select" },
            { key: "id", label: "Campaign ID" },
            { key: "client", label: "Client" },
            { key: "campaign", label: "Campaign" },
            { key: "period", label: "Period" },
            { key: "status", label: "Status" },
            { key: "assets", label: "Assets" },
            { key: "total", label: "Total" },
            { key: "actions", label: "Actions" },
          ]}
          visibleColumns={["select", "id", "client", "campaign", "period", "status", "assets", "total", "actions"]}
          onColumnVisibilityChange={() => {}}
          onResetColumns={() => {}}
          density={density}
          onDensityChange={setDensity}
          tableKey="campaigns"
          enableGlobalSearch
          searchableData={campaigns}
          searchableKeys={["id", "client_name", "campaign_name", "status"]}
          onGlobalSearchFilter={setGlobalSearchFiltered}
          settings={settings}
          onUpdateSettings={updateSettings}
          onResetSettings={resetSettings}
        />

        <div className="bg-card rounded-lg border">
          <div className="w-full overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden border-t">
                <Table className="min-w-max w-full table-auto whitespace-nowrap">
                  <TableHeader className="bg-muted sticky top-0 z-20">
                    <TableRow className={getRowClassName()}>
                      <TableHead className={`sticky left-0 z-30 bg-muted px-4 py-3 text-left font-semibold border-r ${getCellClassName()}`}>
                        <Checkbox
                          checked={selectedCampaigns.size === filteredCampaigns.length && filteredCampaigns.length > 0}
                          onCheckedChange={toggleAllCampaigns}
                        />
                      </TableHead>
                      <SortableTableHead
                        sortKey="id"
                        currentSort={sortConfig}
                        onSort={handleSort}
                        className={getCellClassName()}
                      >
                        Campaign ID
                      </SortableTableHead>
                      <SortableTableHead
                        sortKey="client_name"
                        currentSort={sortConfig}
                        onSort={handleSort}
                        className={getCellClassName()}
                      >
                        Client
                      </SortableTableHead>
                      <SortableTableHead
                        sortKey="campaign_name"
                        currentSort={sortConfig}
                        onSort={handleSort}
                        className={getCellClassName()}
                      >
                        Campaign
                      </SortableTableHead>
                      <SortableTableHead
                        sortKey="start_date"
                        currentSort={sortConfig}
                        onSort={handleSort}
                        className={getCellClassName()}
                      >
                        Period
                      </SortableTableHead>
                      <SortableTableHead
                        sortKey="status"
                        currentSort={sortConfig}
                        onSort={handleSort}
                        className={getCellClassName()}
                      >
                        Status
                      </SortableTableHead>
                      <SortableTableHead
                        sortKey="total_assets"
                        currentSort={sortConfig}
                        onSort={handleSort}
                        className={getCellClassName()}
                      >
                        Assets
                      </SortableTableHead>
                      <SortableTableHead
                        sortKey="grand_total"
                        currentSort={sortConfig}
                        onSort={handleSort}
                        className={getCellClassName()}
                        align="right"
                      >
                        Total
                      </SortableTableHead>
                      <TableHead className={`px-4 py-3 text-right font-semibold ${getCellClassName()}`}>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
              {loading || !settingsReady ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                      <p className="text-muted-foreground">Loading campaigns...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredCampaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-12 w-12 text-muted-foreground/50" />
                      <p className="text-muted-foreground font-medium">No campaigns found</p>
                      <p className="text-sm text-muted-foreground">
                        {searchTerm ? 'Try adjusting your search criteria' : 'Campaigns will appear here'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCampaigns.map((campaign, index) => (
                  <TableRow 
                    key={campaign.id} 
                    className={`transition-all duration-150 hover:bg-muted/50 ${
                      index % 2 === 0 ? 'bg-background' : 'bg-muted/30'
                    } ${getRowClassName()}`}
                  >
                    <TableCell 
                      className={`sticky left-0 z-10 bg-inherit px-4 py-3 border-r ${getCellClassName()}`}
                    >
                      <Checkbox
                        checked={selectedCampaigns.has(campaign.id)}
                        onCheckedChange={() => toggleCampaignSelection(campaign.id)}
                      />
                    </TableCell>
                    <TableCell 
                      className={`font-medium px-4 py-3 text-primary hover:underline cursor-pointer ${getCellClassName()}`}
                      onClick={() => navigate(`/admin/campaigns/${campaign.id}`)}
                    >
                      {campaign.id}
                    </TableCell>
                    <TableCell className={`px-4 py-3 ${getCellClassName()}`}>{campaign.client_name}</TableCell>
                    <TableCell 
                      className={`px-4 py-3 font-medium text-primary hover:underline cursor-pointer ${getCellClassName()}`}
                      onClick={() => navigate(`/admin/campaigns/edit/${campaign.id}`)}
                    >
                      {campaign.campaign_name}
                    </TableCell>
                    <TableCell className={`px-4 py-3 ${getCellClassName()}`}>
                      {formatDateUtil(campaign.start_date, settings.dateFormat)} - {formatDateUtil(campaign.end_date, settings.dateFormat)}
                    </TableCell>
                    <TableCell className={`px-4 py-3 ${getCellClassName()}`}>
                      <Badge variant="outline" className={getCampaignStatusConfig(campaign.status).className}>
                        {getCampaignStatusConfig(campaign.status).label}
                      </Badge>
                    </TableCell>
                    <TableCell className={`px-4 py-3 ${getCellClassName()}`}>{campaign.total_assets || 0}</TableCell>
                    <TableCell className={`px-4 py-3 text-right ${getCellClassName()}`}>
                      {formatCurrencyUtil(campaign.grand_total, settings.currencyFormat, settings.currencySymbol, settings.compactNumbers)}
                    </TableCell>
                    <TableCell 
                      className={`px-4 py-3 text-right ${getCellClassName()}`}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/admin/campaigns/${campaign.id}`)}
                          title="View Campaign"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <>
                            {/* Extend/Renew button - show for Running or Completed campaigns */}
                            {['Running', 'Completed', 'Upcoming'].includes(campaign.status) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setExtendDialog({ open: true, campaign })}
                                title="Extend/Renew Campaign"
                                className="text-primary hover:text-primary hover:bg-primary/10"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDuplicateDialog({ open: true, campaign })}
                              title="Duplicate Campaign"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <CopyPlus className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/admin/campaigns/edit/${campaign.id}`)}
                              title="Edit Campaign"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDeleteDialog(campaign)}
                              title="Delete Campaign"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  </div>

        {/* Create Campaign Dialog */}
        <CreateCampaignFromPlanDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSuccess={() => {
            fetchCampaigns();
            navigate('/admin/campaigns');
          }}
        />
        
        {/* Delete Campaign Dialog */}
        {deleteDialog.campaign && (
          <DeleteCampaignDialog
            open={deleteDialog.open}
            onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
            campaignId={deleteDialog.campaign.id}
            campaignName={deleteDialog.campaign.campaign_name}
            onDeleted={fetchCampaigns}
          />
        )}

        {/* Extend/Renew Campaign Dialog */}
        {extendDialog.campaign && (
          <ExtendCampaignDialog
            open={extendDialog.open}
            onOpenChange={(open) => setExtendDialog({ ...extendDialog, open })}
            campaign={extendDialog.campaign}
            onSuccess={fetchCampaigns}
          />
        )}

        {/* Duplicate Campaign Dialog */}
        {duplicateDialog.campaign && (
          <DuplicateCampaignDialog
            open={duplicateDialog.open}
            onOpenChange={(open) => setDuplicateDialog({ ...duplicateDialog, open })}
            campaign={duplicateDialog.campaign}
            onSuccess={fetchCampaigns}
          />
        )}
      </PageContainer>
    </div>
  );
}
