import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { ListToolbar } from "@/components/list-views";
import { useListView } from "@/hooks/useListView";
import { useListViewExport } from "@/hooks/useListViewExport";
import { campaignExcelRules, campaignPdfRules } from "@/utils/exports/statusColorRules";
import { CampaignAdvancedFilters, CampaignFilterPills, type CampaignFilters } from "@/components/campaigns/CampaignAdvancedFilters";
import { CampaignQuickChips } from "@/components/campaigns/CampaignQuickChips";
import { PageContainer } from "@/components/ui/page-container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Eye, Trash2, FileText, Plus, Pencil, CheckCircle2, RefreshCw, CopyPlus, SlidersHorizontal } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
import { BulkActionsDropdown, commonBulkActions } from "@/components/common/bulk-actions-dropdown";
import { useTableSettings, formatCurrency as formatCurrencyUtil, formatDate as formatDateUtil } from "@/hooks/use-table-settings";
import { useTableDensity } from "@/hooks/use-table-density";
import { Checkbox } from "@/components/ui/checkbox";
import { SkeletonStats, SkeletonTable } from "@/components/ui/loading-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { SortableTableHead, SortConfig } from "@/components/common/SortableTableHead";

export default function CampaignsList() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const [campaigns, setCampaigns] = useState<any[]>([]);

  // Global List View System
  const lv = useListView("campaigns.list");
  const { handleExportExcel, handleExportPdf } = useListViewExport({
    pageKey: "campaigns.list",
    title: "Campaigns",
    excelRules: campaignExcelRules,
    pdfRules: campaignPdfRules,
    valueOverrides: {
      sno: (_row: any, index: number) => index + 1,
      campaign_id: (row: any) => row.id || "",
      asset_count: (row: any) => row.total_assets || 0,
      total_amount: (row: any) => row.grand_total || 0,
    },
  });

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<CampaignFilters>({});
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; campaign: any | null }>({ open: false, campaign: null });
  const [extendDialog, setExtendDialog] = useState<{ open: boolean; campaign: any | null }>({ open: false, campaign: null });
  const [duplicateDialog, setDuplicateDialog] = useState<{ open: boolean; campaign: any | null }>({ open: false, campaign: null });
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  const { density, setDensity, getRowClassName, getCellClassName } = useTableDensity("campaigns");
  const { settings, updateSettings, resetSettings, isReady: settingsReady } = useTableSettings("campaigns");

  // Handle sorting
  const handleSort = (key: string) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        if (current.direction === 'asc') return { key, direction: 'desc' };
        return null;
      }
      return { key, direction: 'asc' };
    });
  };

  // Auto-refresh
  useEffect(() => {
    if (!settingsReady || settings.autoRefreshInterval === 0) return;
    const interval = setInterval(() => fetchCampaigns(), settings.autoRefreshInterval * 1000);
    return () => clearInterval(interval);
  }, [settings.autoRefreshInterval, settingsReady]);

  useEffect(() => {
    checkAdminStatus();
    fetchCampaigns();
    updateCampaignStatuses();
    
    const channel = supabase
      .channel('campaigns-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns' }, () => fetchCampaigns())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [company]);

  // Auto-create special presets on mount
  useEffect(() => {
    if (lv.loading || !company?.id) return;
    ensureSpecialPresets();
  }, [lv.loading, company?.id]);

  const ensureSpecialPresets = async () => {
    const SPECIAL = [
      {
        preset_name: "Finance View",
        selected_fields: ["sno", "campaign_id", "campaign_name", "client_name", "start_date", "end_date", "status", "total_amount"],
        sort: { field: "end_date", direction: "desc" as const },
        filters: {},
      },
      {
        preset_name: "Ops View",
        selected_fields: ["sno", "campaign_id", "campaign_name", "start_date", "end_date", "status", "asset_count", "city"],
        sort: { field: "start_date", direction: "asc" as const },
        filters: { status: ["Running", "Upcoming"] },
      },
      {
        preset_name: "Client Share View",
        selected_fields: ["campaign_name", "city", "start_date", "end_date", "status", "asset_count"],
        sort: { field: "start_date", direction: "asc" as const },
        filters: { status: ["Running", "Upcoming"] },
      },
    ];

    const existing = lv.presets.map((p) => p.preset_name);
    for (const sp of SPECIAL) {
      if (!existing.includes(sp.preset_name)) {
        await lv.saveCurrentAsView(sp.preset_name, false, true);
      }
    }
  };

  const updateCampaignStatuses = async () => {
    try { await supabase.rpc('auto_update_campaign_status'); } catch (error) { console.error('Error updating campaign statuses:', error); }
  };

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
      setIsAdmin(data?.some(r => r.role === 'admin') || false);
    }
  };

  const fetchCampaigns = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: companyUserData } = await supabase
      .from('company_users').select('company_id').eq('user_id', user.id).eq('status', 'active').maybeSingle();
    if (!companyUserData) {
      toast({ title: "Error", description: "No company association found", variant: "destructive" });
      setLoading(false);
      return;
    }

    const selectedCompanyId = localStorage.getItem('selected_company_id') || companyUserData.company_id;

    const { data, error } = await supabase
      .from('campaigns').select('*')
      .eq('company_id', selectedCompanyId)
      .or('is_deleted.is.null,is_deleted.eq.false')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: "Error", description: "Failed to fetch campaigns", variant: "destructive" });
    } else {
      setCampaigns(data || []);
    }
    setLoading(false);
  };

  // Apply all filters: search + advanced + sort
  const filteredCampaigns = useMemo(() => {
    const searchTerm = lv.searchQuery;
    let result = campaigns.filter(campaign => {
      // Text search
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const match = (
          campaign.id?.toLowerCase().includes(term) ||
          campaign.client_name?.toLowerCase().includes(term) ||
          campaign.campaign_name?.toLowerCase().includes(term)
        );
        if (!match) return false;
      }

      // Status filter (from advanced or chips)
      if (advancedFilters.status?.length) {
        if (!advancedFilters.status.includes(campaign.status)) return false;
      }

      // Amount min
      if (advancedFilters.amount_min) {
        if ((campaign.grand_total || 0) < advancedFilters.amount_min) return false;
      }

      // Date overlap: start_date <= to AND end_date >= from
      if (advancedFilters.date_between) {
        const { from, to } = advancedFilters.date_between;
        if (campaign.start_date && campaign.end_date) {
          if (campaign.start_date > to || campaign.end_date < from) return false;
        }
      }

      // City contains
      if (advancedFilters.city_contains) {
        const city = (campaign.city || "").toLowerCase();
        if (!city.includes(advancedFilters.city_contains.toLowerCase())) return false;
      }

      return true;
    });

    // Sorting
    if (sortConfig?.direction) {
      result = [...result].sort((a, b) => {
        let aVal: any, bVal: any;
        switch (sortConfig.key) {
          case 'start_date': case 'end_date':
            aVal = a[sortConfig.key] ? new Date(a[sortConfig.key]).getTime() : 0;
            bVal = b[sortConfig.key] ? new Date(b[sortConfig.key]).getTime() : 0;
            break;
          case 'total_assets': case 'grand_total':
            aVal = a[sortConfig.key] || 0;
            bVal = b[sortConfig.key] || 0;
            break;
          default:
            aVal = a[sortConfig.key];
            bVal = b[sortConfig.key];
        }
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        const cmp = typeof aVal === 'number' && typeof bVal === 'number'
          ? aVal - bVal
          : String(aVal).toLowerCase().localeCompare(String(bVal).toLowerCase());
        return sortConfig.direction === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [campaigns, lv.searchQuery, advancedFilters, sortConfig]);

  const handleAdvancedFilterApply = (filters: CampaignFilters) => {
    setAdvancedFilters(filters);
  };

  const clearFilterKey = (key: keyof CampaignFilters) => {
    setAdvancedFilters((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleBulkAction = async (actionId: string) => {
    const selectedIds = Array.from(selectedCampaigns);
    if (actionId === "delete") {
      const { error } = await supabase.from("campaigns").delete().in("id", selectedIds);
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
        selectedIds.includes(c.id) && new Date(c.end_date) < today && c.status !== 'Completed'
      );
      if (selectedData.length === 0) {
        toast({ title: "No campaigns to complete", description: "Selected campaigns are either not ended yet or already completed" });
        return;
      }
      if (!confirm(`Auto-complete ${selectedData.length} past campaign(s)?`)) return;
      const { error } = await supabase.from("campaigns").update({ status: 'Completed' }).in("id", selectedData.map(c => c.id));
      if (error) {
        toast({ title: "Error", description: "Failed to auto-complete campaigns", variant: "destructive" });
      } else {
        toast({ title: "Success", description: `${selectedData.length} campaign(s) marked as completed` });
        fetchCampaigns();
        setSelectedCampaigns(new Set());
      }
    }
  };

  const toggleCampaignSelection = (id: string) => {
    const ns = new Set(selectedCampaigns);
    if (ns.has(id)) ns.delete(id); else ns.add(id);
    setSelectedCampaigns(ns);
  };
  const toggleAllCampaigns = () => {
    if (selectedCampaigns.size === filteredCampaigns.length) setSelectedCampaigns(new Set());
    else setSelectedCampaigns(new Set(filteredCampaigns.map(c => c.id)));
  };

  const hasActiveFilters = !!(
    advancedFilters.status?.length ||
    advancedFilters.amount_min ||
    advancedFilters.date_between ||
    advancedFilters.city_contains ||
    advancedFilters.month ||
    advancedFilters.duration_days
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageContainer className="space-y-6">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-2"><Skeleton className="h-9 w-48" /><Skeleton className="h-5 w-64" /></div>
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
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Campaigns</h1>
            <p className="text-muted-foreground mt-1">Track and manage active campaigns</p>
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
                <Button onClick={() => navigate('/admin/campaigns/create')} size="lg" variant="outline" className="transition-smooth">
                  <Plus className="mr-2 h-5 w-5" />Direct Campaign
                </Button>
                <Button onClick={() => setShowCreateDialog(true)} size="lg" className="bg-gradient-primary hover:shadow-glow transition-smooth">
                  <Plus className="mr-2 h-5 w-5" />From Plan
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Global List View Toolbar */}
        <ListToolbar
          searchQuery={lv.searchQuery}
          onSearchChange={lv.setSearchQuery}
          searchPlaceholder="Search campaigns..."
          fields={lv.catalog.fields}
          groups={lv.catalog.groups}
          selectedFields={lv.selectedFields}
          defaultFieldKeys={lv.catalog.defaultFieldKeys}
          onFieldsChange={lv.setSelectedFields}
          presets={lv.presets}
          activePreset={lv.activePreset}
          onPresetSelect={lv.applyPreset}
          onPresetSave={lv.saveCurrentAsView}
          onPresetUpdate={lv.updateCurrentView}
          onPresetDelete={lv.deletePreset}
          onPresetDuplicate={lv.duplicatePreset}
          onExportExcel={(fields) => handleExportExcel(filteredCampaigns, fields)}
          onExportPdf={(fields) => handleExportPdf(filteredCampaigns, fields)}
          onReset={() => { lv.resetToDefaults(); setAdvancedFilters({}); }}
          extraActions={
            <Button
              variant={hasActiveFilters ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => setShowAdvancedFilters(true)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 bg-primary-foreground text-primary rounded-full px-1.5 text-xs font-bold">
                  {Object.keys(advancedFilters).filter(k => advancedFilters[k as keyof CampaignFilters] !== undefined).length}
                </span>
              )}
            </Button>
          }
        />

        {/* Quick Filter Chips */}
        <CampaignQuickChips
          filters={advancedFilters}
          onFiltersChange={setAdvancedFilters}
          presets={lv.presets}
          activePreset={lv.activePreset}
          onPresetSelect={lv.applyPreset}
          onOpenAdvanced={() => setShowAdvancedFilters(true)}
        />

        {/* Active Filter Pills */}
        <CampaignFilterPills
          filters={advancedFilters}
          onClear={clearFilterKey}
          onClearAll={() => setAdvancedFilters({})}
        />

        {/* Health Alerts */}
        <div className="mb-6"><CampaignHealthAlerts /></div>

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
                  ...(isAdmin ? [{ id: "auto-complete-past", label: "Auto-Complete Past", icon: CheckCircle2, variant: "default" as const }] : []),
                  commonBulkActions.delete,
                ]}
                onAction={handleBulkAction}
              />
            </CardContent>
          </Card>
        )}

        {/* Results count */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-muted-foreground">
            {filteredCampaigns.length} campaign{filteredCampaigns.length !== 1 ? "s" : ""}
            {hasActiveFilters || lv.searchQuery ? " (filtered)" : ""}
          </p>
        </div>

        {/* Table */}
        <div className="bg-card rounded-lg border">
          <div className="w-full overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden border-t">
                <Table className="min-w-max w-full table-auto whitespace-nowrap">
                  <TableHeader className="bg-muted sticky top-0 z-20">
                    <TableRow className={getRowClassName()}>
                      <TableHead className={`sticky left-0 z-30 bg-muted px-4 py-3 text-left font-semibold border-r ${getCellClassName()}`}>
                        <Checkbox checked={selectedCampaigns.size === filteredCampaigns.length && filteredCampaigns.length > 0} onCheckedChange={toggleAllCampaigns} />
                      </TableHead>
                      <SortableTableHead sortKey="id" currentSort={sortConfig} onSort={handleSort} className={getCellClassName()}>Campaign ID</SortableTableHead>
                      <SortableTableHead sortKey="client_name" currentSort={sortConfig} onSort={handleSort} className={getCellClassName()}>Client</SortableTableHead>
                      <SortableTableHead sortKey="campaign_name" currentSort={sortConfig} onSort={handleSort} className={getCellClassName()}>Campaign</SortableTableHead>
                      <SortableTableHead sortKey="start_date" currentSort={sortConfig} onSort={handleSort} className={getCellClassName()}>Period</SortableTableHead>
                      <SortableTableHead sortKey="status" currentSort={sortConfig} onSort={handleSort} className={getCellClassName()}>Status</SortableTableHead>
                      <SortableTableHead sortKey="total_assets" currentSort={sortConfig} onSort={handleSort} className={getCellClassName()}>Assets</SortableTableHead>
                      <SortableTableHead sortKey="grand_total" currentSort={sortConfig} onSort={handleSort} className={getCellClassName()} align="right">Total</SortableTableHead>
                      <TableHead className={`px-4 py-3 text-right font-semibold ${getCellClassName()}`}>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!settingsReady ? (
                      <TableRow><TableCell colSpan={9} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /><p className="text-muted-foreground">Loading campaigns...</p></div>
                      </TableCell></TableRow>
                    ) : filteredCampaigns.length === 0 ? (
                      <TableRow><TableCell colSpan={9} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <FileText className="h-12 w-12 text-muted-foreground/50" />
                          <p className="text-muted-foreground font-medium">No campaigns found</p>
                          <p className="text-sm text-muted-foreground">{lv.searchQuery || hasActiveFilters ? 'Try adjusting your filters' : 'Campaigns will appear here'}</p>
                        </div>
                      </TableCell></TableRow>
                    ) : (
                      filteredCampaigns.map((campaign, index) => (
                        <TableRow
                          key={campaign.id}
                          className={`transition-all duration-150 hover:bg-muted/50 ${index % 2 === 0 ? 'bg-background' : 'bg-muted/30'} ${getRowClassName()}`}
                        >
                          <TableCell className={`sticky left-0 z-10 bg-inherit px-4 py-3 border-r ${getCellClassName()}`}>
                            <Checkbox checked={selectedCampaigns.has(campaign.id)} onCheckedChange={() => toggleCampaignSelection(campaign.id)} />
                          </TableCell>
                          <TableCell className={`font-medium px-4 py-3 text-primary hover:underline cursor-pointer ${getCellClassName()}`} onClick={() => navigate(`/admin/campaigns/${campaign.id}`)}>
                            {campaign.id}
                          </TableCell>
                          <TableCell className={`px-4 py-3 ${getCellClassName()}`}>{campaign.client_name}</TableCell>
                          <TableCell className={`px-4 py-3 font-medium text-primary hover:underline cursor-pointer ${getCellClassName()}`} onClick={() => navigate(`/admin/campaigns/edit/${campaign.id}`)}>
                            {campaign.campaign_name}
                          </TableCell>
                          <TableCell className={`px-4 py-3 ${getCellClassName()}`}>
                            {formatDateUtil(campaign.start_date, settings.dateFormat)} - {formatDateUtil(campaign.end_date, settings.dateFormat)}
                          </TableCell>
                          <TableCell className={`px-4 py-3 ${getCellClassName()}`}>
                            <Badge variant="outline" className={getCampaignStatusConfig(campaign.status).className}>{getCampaignStatusConfig(campaign.status).label}</Badge>
                          </TableCell>
                          <TableCell className={`px-4 py-3 ${getCellClassName()}`}>{campaign.total_assets || 0}</TableCell>
                          <TableCell className={`px-4 py-3 text-right ${getCellClassName()}`}>
                            {formatCurrencyUtil(campaign.grand_total, settings.currencyFormat, settings.currencySymbol, settings.compactNumbers)}
                          </TableCell>
                          <TableCell className={`px-4 py-3 text-right ${getCellClassName()}`}>
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/campaigns/${campaign.id}`)} title="View Campaign"><Eye className="h-4 w-4" /></Button>
                              {isAdmin && (
                                <>
                                  {['Running', 'Completed', 'Upcoming'].includes(campaign.status) && (
                                    <Button variant="ghost" size="icon" onClick={() => setExtendDialog({ open: true, campaign })} title="Extend/Renew" className="text-primary hover:text-primary hover:bg-primary/10"><RefreshCw className="h-4 w-4" /></Button>
                                  )}
                                  <Button variant="ghost" size="icon" onClick={() => setDuplicateDialog({ open: true, campaign })} title="Duplicate" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"><CopyPlus className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/campaigns/edit/${campaign.id}`)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({ open: true, campaign })} title="Delete"><Trash2 className="h-4 w-4" /></Button>
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

        {/* Dialogs */}
        <CreateCampaignFromPlanDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} onSuccess={() => { fetchCampaigns(); navigate('/admin/campaigns'); }} />
        {deleteDialog.campaign && <DeleteCampaignDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })} campaignId={deleteDialog.campaign.id} campaignName={deleteDialog.campaign.campaign_name} onDeleted={fetchCampaigns} />}
        {extendDialog.campaign && <ExtendCampaignDialog open={extendDialog.open} onOpenChange={(open) => setExtendDialog({ ...extendDialog, open })} campaign={extendDialog.campaign} onSuccess={fetchCampaigns} />}
        {duplicateDialog.campaign && <DuplicateCampaignDialog open={duplicateDialog.open} onOpenChange={(open) => setDuplicateDialog({ ...duplicateDialog, open })} campaign={duplicateDialog.campaign} onSuccess={fetchCampaigns} />}

        {/* Advanced Filters Drawer */}
        <CampaignAdvancedFilters
          open={showAdvancedFilters}
          onOpenChange={setShowAdvancedFilters}
          filters={advancedFilters}
          onApply={handleAdvancedFilterApply}
          onReset={() => setAdvancedFilters({})}
        />
      </PageContainer>
    </div>
  );
}
