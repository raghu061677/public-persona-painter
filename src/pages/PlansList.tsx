import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ModuleGuard } from "@/components/rbac/ModuleGuard";
import { ActionGuard } from "@/components/rbac/ActionGuard";
import { useSensitiveFieldMask } from "@/components/rbac/SensitiveField";
import { useScopedQuery } from "@/hooks/useScopedQuery";
import { useModuleActions } from "@/hooks/useModuleActions";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { ListToolbar } from "@/components/list-views";
import { useListView } from "@/hooks/useListView";
import { useListViewExport } from "@/hooks/useListViewExport";
import { planExcelRules, planPdfRules } from "@/utils/exports/statusColorRules";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPlanStatusConfig } from "@/utils/statusBadges";
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
import { Plus, Eye, Trash2, MoreVertical, Share2, Copy, Ban, Activity, ExternalLink, FileText, Rocket, Download, Sparkles, ChevronDown, Info, FolderOpen, Edit, ClipboardList, Users, TrendingUp, CopyPlus, Search, X, Archive, ArchiveRestore } from "lucide-react";
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
import { BulkConversionDialog } from "@/components/plans/BulkConversionDialog";
import { DuplicatePlanDialog } from "@/components/plans/DuplicatePlanDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PageCustomization, PageCustomizationOption } from "@/components/ui/page-customization";
import { EnhancedFilterToggle } from "@/components/common/EnhancedFilterToggle";
import { useLayoutSettings } from "@/hooks/use-layout-settings";
import { SortableTableHead, useSortableData, SortConfig } from "@/components/common/SortableTableHead";
import { Input } from "@/components/ui/input";
import { PlansSummaryBar } from "@/components/plans/PlansSummaryBar";
import { PlanFilterPills } from "@/components/plans/PlanFilterPills";
import { DatePeriodFilter, getPeriodRange, type PeriodKey, type DatePeriodValue } from "@/components/common/DatePeriodFilter";
import { FYFilterDropdown, isDateInFY } from "@/components/invoices/FYFilterDropdown";
import { SlidersHorizontal } from "lucide-react";
import type { DateRange } from "react-day-picker";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function PlansList() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const [plans, setPlans] = useState<any[]>([]);

  // RBAC scope filtering and sensitive field masking
  const { filterByScope: planScopeFilter } = useScopedQuery('plans', { ownerColumn: 'created_by', additionalOwnerColumns: ['sales_owner_id'] });
  const { mask: maskPlanField, canSee: canSeePlanField } = useSensitiveFieldMask('plans');
  const actions = useModuleActions('plans');

  // Global List View System
  const lv = useListView("plans.list");
  const { handleExportExcel, handleExportPdf } = useListViewExport({
    pageKey: "plans.list",
    title: "Plans",
    excelRules: planExcelRules,
    pdfRules: planPdfRules,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [statusTab, setStatusTab] = useState<"current_month" | "all_active" | "archived" | "all">("current_month");
  const [viewMode, setViewMode] = useState<"current_month" | "all_active" | "archived" | "all">("current_month");
  const [selectedPlans, setSelectedPlans] = useState<Set<string>>(new Set());
  const [globalSearchFiltered, setGlobalSearchFiltered] = useState<any[]>([]);
  const [showTemplatesDialog, setShowTemplatesDialog] = useState(false);
  const [showBulkConversionDialog, setShowBulkConversionDialog] = useState(false);
  const [duplicateDialog, setDuplicateDialog] = useState<{ open: boolean; plan: any | null }>({
    open: false,
    plan: null,
  });
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [datePeriod, setDatePeriod] = useState<PeriodKey>("current_month");
  const [datePeriodRange, setDatePeriodRange] = useState<DatePeriodValue | undefined>(getPeriodRange("current_month"));
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const [fyFilter, setFyFilter] = useState<string>("all");
  
  // Layout settings with persistence
  const { getSetting, updateSetting, isReady: layoutReady } = useLayoutSettings('plans');

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
    
    // Keyboard shortcut: Ctrl+K+B - Bulk conversion dialog
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        const handleSecondKey = (e2: KeyboardEvent) => {
          if (e2.key === 'b') {
            setShowBulkConversionDialog(true);
          }
          document.removeEventListener('keydown', handleSecondKey);
        };
        document.addEventListener('keydown', handleSecondKey);
        setTimeout(() => document.removeEventListener('keydown', handleSecondKey), 1000);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
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
      document.removeEventListener('keydown', handleKeyDown);
      supabase.removeChannel(channel);
    };
  }, [company]);

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
    
    try {
      // Get user's company ID for multi-tenant filtering
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user found');
        setLoading(false);
        return;
      }

      // First try to get company_id directly from company_users
      const { data: companyUserData, error: companyError } = await supabase
        .from('company_users')
        .select('company_id, companies(type)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (companyError) {
        console.error('Error fetching company data:', companyError);
        toast({
          title: "Error",
          description: "Failed to fetch company data",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!companyUserData) {
        console.error('No active company association found for user:', user.id);
        toast({
          title: "Error",
          description: "No company association found",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      const userCompanyId = companyUserData.company_id;
      
      // Platform admins can see all plans, others see only their company's plans
      const isPlatformAdmin = (companyUserData as any).companies?.type === 'platform_admin';
      
      // CRITICAL: For platform admins, don't filter by company_id to see all plans
      const query = supabase
        .from('plans')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Only filter by company_id if not a platform admin
      if (!isPlatformAdmin) {
        query.eq('company_id', userCompanyId);
      }
      
      const { data: plansData, error: plansError } = await query;

      // Show user-friendly message if no plans found
      if (!plansData || plansData.length === 0) {
        console.warn('No plans found for:', {
          isPlatformAdmin,
          userCompanyId,
          userEmail: user.email
        });
      }

      // Collect unique creator IDs and batch-fetch their profiles + company_users fallback
      const creatorIds = [...new Set((plansData || []).map(p => p.created_by).filter(Boolean))];
      const profileMap: Record<string, string> = {};
      if (creatorIds.length > 0) {
        // Try profiles first
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', creatorIds);
        (profiles || []).forEach((p: any) => {
          if (p.username) profileMap[p.id] = p.username;
        });

        // Fallback: fetch from company_users for any missing names
        const missingIds = creatorIds.filter(id => !profileMap[id]);
        if (missingIds.length > 0) {
          const { data: companyUsers } = await supabase
            .from('company_users')
            .select('user_id, name, email')
            .in('user_id', missingIds);
          (companyUsers || []).forEach((cu: any) => {
            if (!profileMap[cu.user_id] && cu.name) {
              profileMap[cu.user_id] = cu.name;
            } else if (!profileMap[cu.user_id] && cu.email) {
              profileMap[cu.user_id] = cu.email.split('@')[0];
            }
          });
        }
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
            sqft_breakdown: sqftBreakdown,
            employee_name: profileMap[plan.created_by] || null,
          };
        })
      );

      const scopedPlans = planScopeFilter(plansWithSqft);
      setPlans(scopedPlans);
      setGlobalSearchFiltered(scopedPlans);
      setLoading(false);
    } catch (error: any) {
      console.error('Error in fetchPlans:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch plans",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  // Filter plans first
  const baseFilteredPlans = useMemo(() => {
    return globalSearchFiltered.filter(plan => {
      // View mode filter (archive state only)
      if (viewMode === "current_month" || viewMode === "all_active") {
        if (plan.is_archived) return false;
      } else if (viewMode === "archived") {
        if (!plan.is_archived) return false;
      }
      // "all" shows everything

      // Date period filter on created_at
      if (datePeriodRange) {
        const planDate = plan.created_at?.substring(0, 10);
        if (!planDate || planDate < datePeriodRange.from || planDate > datePeriodRange.to) return false;
      }

      // FY filter
      if (fyFilter && fyFilter !== 'all') {
        if (!isDateInFY(plan.created_at, fyFilter)) return false;
      }
      
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
      
      // Additional status filter (from dropdown)
      if (filterStatus && plan.status !== filterStatus) return false;
      
      return true;
    });
  }, [globalSearchFiltered, viewMode, searchTerm, filterStatus, datePeriodRange, fyFilter]);

  // Apply sorting
  const { sortedData: filteredPlans, sortConfig, handleSort } = useSortableData(baseFilteredPlans);
  
  const uniqueStatuses = Array.from(new Set(plans.map(p => p.status).filter(Boolean)));

  // Generate search suggestions based on current data
  const searchSuggestions = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) return [];
    
    const term = searchTerm.toLowerCase();
    const suggestions: { type: string; value: string; label: string }[] = [];
    const seen = new Set<string>();
    
    for (const plan of plans) {
      // Plan ID suggestions
      if (plan.id?.toLowerCase().includes(term) && !seen.has(`id:${plan.id}`)) {
        seen.add(`id:${plan.id}`);
        suggestions.push({ type: 'Plan ID', value: plan.id, label: plan.id });
      }
      // Customer name suggestions
      if (plan.client_name?.toLowerCase().includes(term) && !seen.has(`client:${plan.client_name}`)) {
        seen.add(`client:${plan.client_name}`);
        suggestions.push({ type: 'Customer', value: plan.client_name, label: plan.client_name });
      }
      // Display/Plan name suggestions
      if (plan.plan_name?.toLowerCase().includes(term) && !seen.has(`display:${plan.plan_name}`)) {
        seen.add(`display:${plan.plan_name}`);
        suggestions.push({ type: 'Display', value: plan.plan_name, label: plan.plan_name });
      }
      
      if (suggestions.length >= 10) break;
    }
    
    return suggestions;
  }, [searchTerm, plans]);

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

  const handleUnarchive = async (plan: any) => {
    const { error } = await supabase
      .from('plans')
      .update({ is_archived: false, archived_at: null })
      .eq('id', plan.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to unarchive plan",
        variant: "destructive",
      });
    } else {
      // Log the unarchive activity
      try {
        await supabase.from('activity_logs').insert({
          action: 'plan_unarchived',
          resource_type: 'plan',
          resource_id: plan.id,
          resource_name: plan.plan_name || plan.id,
          details: { previous_archived_reason: plan.archived_reason },
        });
      } catch (e) {
        console.warn('Failed to log unarchive activity:', e);
      }
      toast({
        title: "Success",
        description: "Plan unarchived successfully",
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
      // If status is being changed to "Sent", create approval workflows FIRST
      if (status === "Sent") {
        const planIds = Array.from(selectedPlans);
        const failedPlans: string[] = [];
        for (const planId of planIds) {
          try {
            const { error } = await supabase.rpc("create_plan_approval_workflow", { p_plan_id: planId });
            if (error) {
              failedPlans.push(planId);
              console.error(`Approval workflow failed for ${planId}:`, error.message);
            }
          } catch (workflowError) {
            failedPlans.push(planId);
            console.error(`Approval workflow exception for ${planId}:`, workflowError);
          }
        }

        if (failedPlans.length > 0) {
          toast({
            title: "Approval Setup Failed",
            description: `Could not create approval workflow for: ${failedPlans.join(', ')}. Check approval rules configuration.`,
            variant: "destructive",
          });
          // Only update status for plans that succeeded
          const successPlans = planIds.filter(p => !failedPlans.includes(p));
          if (successPlans.length === 0) return;

          const { error } = await supabase
            .from('plans')
            .update({ status })
            .in('id', successPlans);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('plans')
            .update({ status })
            .in('id', planIds);
          if (error) throw error;
        }
      } else {
        const { error } = await supabase
          .from('plans')
          .update({ status })
          .in('id', Array.from(selectedPlans));
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Plan(s) updated to ${status}${status === "Sent" ? " and submitted for approval" : ""}`,
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

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Sent':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Approved':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Rejected':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'Converted':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (!layoutReady || !settingsReady || !columnPrefsReady) {
    return null;
  }

  // Customization options
  const customizationOptions: PageCustomizationOption[] = [
    {
      id: 'show-stats',
      label: 'Statistics Cards',
      description: 'Display plan summary metrics',
      enabled: getSetting('showStats', false),
      onChange: (val) => updateSetting('showStats', val),
    },
  ];

  return (
    <ModuleGuard module="plans">
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 max-w-7xl space-y-4">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FileText className="h-6 sm:h-8 w-6 sm:w-8 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Plan List
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <PageCustomization options={customizationOptions} />
            <Button
              onClick={() => setShowTemplatesDialog(true)}
              variant="outline"
              size="sm"
            >
              <FolderOpen className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Templates</span>
            </Button>
            <ActionGuard module="plans" action="create">
            <Button
              onClick={() => navigate('/admin/plans/new')}
              size="default"
            >
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Add Plan</span>
              <span className="sm:hidden">Add</span>
            </Button>
            </ActionGuard>
          </div>
        </div>

        {/* Global List View Toolbar */}
        <ListToolbar
          searchQuery={lv.searchQuery}
          onSearchChange={(q) => { lv.setSearchQuery(q); setSearchTerm(q); }}
          searchPlaceholder="Search plans..."
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
          onExportExcel={actions.canExport() ? (fields) => handleExportExcel(filteredPlans, fields) : undefined}
          onExportPdf={actions.canExport() ? (fields) => handleExportPdf(filteredPlans, fields) : undefined}
          onReset={() => {
            lv.resetToDefaults();
            setFilterStatus('');
            setSearchTerm('');
            setDatePeriod('current_month');
            setDatePeriodRange(getPeriodRange('current_month'));
            setFyFilter('all');
          }}
          extraActions={
            <>
              <DatePeriodFilter
                value={datePeriod}
                customRange={customDateRange}
                onChange={(period, range, custom) => {
                  setDatePeriod(period);
                  setDatePeriodRange(range);
                  if (custom) setCustomDateRange(custom);
                  // When selecting a date period, switch view to all_active to avoid conflict
                  if (period !== 'all' && viewMode === 'current_month') {
                    setViewMode('all_active');
                  }
                }}
              />
              <FYFilterDropdown value={fyFilter} onChange={setFyFilter} />
              {filterStatus && (
                <Button
                  variant="default"
                  size="sm"
                  className="gap-2"
                  onClick={() => setFilterStatus('')}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Status: {filterStatus}
                </Button>
              )}
            </>
          }
        />

        {/* View Mode Tabs (Archive state) */}
        <Card>
          <CardContent className="p-2">
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              <Button
                variant={viewMode === "all_active" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("all_active")}
                className="whitespace-nowrap"
              >
                <Activity className="mr-1.5 h-4 w-4" />
                All Active ({plans.filter(p => !p.is_archived).length})
              </Button>
              <Button
                variant={viewMode === "archived" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("archived")}
                className="whitespace-nowrap"
              >
                <Archive className="mr-1.5 h-4 w-4" />
                Archived ({plans.filter(p => p.is_archived).length})
              </Button>
              <Button
                variant={viewMode === "all" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("all")}
                className="whitespace-nowrap"
              >
                <FolderOpen className="mr-1.5 h-4 w-4" />
                All Plans ({plans.length})
              </Button>
              {/* Status quick filter */}
              <div className="ml-auto">
                <Select value={filterStatus || "all_statuses"} onValueChange={(v) => setFilterStatus(v === 'all_statuses' ? '' : v)}>
                  <SelectTrigger className="h-8 w-[140px] text-xs">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_statuses">All Statuses</SelectItem>
                    {uniqueStatuses.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filter Pills */}
        <PlanFilterPills
          filterStatus={filterStatus}
          datePeriod={datePeriod}
          fyFilter={fyFilter}
          searchTerm={searchTerm}
          viewMode={viewMode}
          onClearStatus={() => setFilterStatus('')}
          onClearDatePeriod={() => { setDatePeriod('all'); setDatePeriodRange(undefined); }}
          onClearFY={() => setFyFilter('all')}
          onClearSearch={() => { setSearchTerm(''); lv.setSearchQuery(''); }}
          onClearAll={() => {
            setFilterStatus('');
            setDatePeriod('current_month');
            setDatePeriodRange(getPeriodRange('current_month'));
            setFyFilter('all');
            setSearchTerm('');
            lv.setSearchQuery('');
          }}
        />

        {/* Plans Summary Bar */}
        <PlansSummaryBar plans={filteredPlans} />

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
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Sent">Sent (For Approval)</SelectItem>
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

                {selectedPlans.size > 0 && Array.from(selectedPlans).every(id => {
                  const plan = filteredPlans.find(p => p.id === id);
                  return plan?.status?.toLowerCase() === 'approved';
                }) && isAdmin && (
                  <Button
                    onClick={() => setShowBulkConversionDialog(true)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Rocket className="mr-2 h-4 w-4" />
                    Convert {selectedPlans.size} to Campaigns
                  </Button>
                )}

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
            <div className="w-full overflow-x-auto">
              <div className="inline-block min-w-full align-middle">
                <div className="overflow-hidden border-t">
                  <Table className="min-w-max w-full table-auto whitespace-nowrap">
              <TableHeader className="bg-muted sticky top-0 z-20">
                <TableRow>
                  {visibleColumns.includes("select") && (
                    <TableHead className="sticky left-0 z-30 bg-muted px-4 py-3 text-left font-semibold border-r">
                      <Checkbox
                        checked={selectedPlans.size === filteredPlans.length && filteredPlans.length > 0}
                        onCheckedChange={toggleAllPlans}
                      />
                    </TableHead>
                  )}
                  {visibleColumns.includes("id") && (
                    <SortableTableHead sortKey="id" currentSort={sortConfig} onSort={handleSort}>
                      Plan ID
                    </SortableTableHead>
                  )}
                  {visibleColumns.includes("employee") && (
                    <TableHead className="px-4 py-3 text-left font-semibold">Employee</TableHead>
                  )}
                  {visibleColumns.includes("client") && (
                    <SortableTableHead sortKey="client_name" currentSort={sortConfig} onSort={handleSort}>
                      Customer Name
                    </SortableTableHead>
                  )}
                  {visibleColumns.includes("display") && (
                    <SortableTableHead sortKey="plan_name" currentSort={sortConfig} onSort={handleSort}>
                      Display
                    </SortableTableHead>
                  )}
                  {visibleColumns.includes("from") && (
                    <SortableTableHead sortKey="start_date" currentSort={sortConfig} onSort={handleSort}>
                      From
                    </SortableTableHead>
                  )}
                  {visibleColumns.includes("to") && (
                    <SortableTableHead sortKey="end_date" currentSort={sortConfig} onSort={handleSort}>
                      To
                    </SortableTableHead>
                  )}
                  {visibleColumns.includes("days") && (
                    <SortableTableHead sortKey="duration_days" currentSort={sortConfig} onSort={handleSort}>
                      Days
                    </SortableTableHead>
                  )}
                  {visibleColumns.includes("sqft") && (
                    <SortableTableHead sortKey="total_sqft" currentSort={sortConfig} onSort={handleSort} align="right">
                      SQFT
                    </SortableTableHead>
                  )}
                  {visibleColumns.includes("amount") && (
                    <SortableTableHead sortKey="grand_total" currentSort={sortConfig} onSort={handleSort} align="right">
                      Amount
                    </SortableTableHead>
                  )}
                  {visibleColumns.includes("qos") && (
                    <TableHead className="px-4 py-3 text-right font-semibold">QoS</TableHead>
                  )}
                  {visibleColumns.includes("status") && (
                    <SortableTableHead sortKey="status" currentSort={sortConfig} onSort={handleSort}>
                      Status
                    </SortableTableHead>
                  )}
                  {visibleColumns.includes("actions") && (
                    <TableHead className="px-4 py-3 text-right font-semibold">Actions</TableHead>
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
                  filteredPlans.map((plan, index) => (
                    <TableRow 
                      key={plan.id} 
                      className={`cursor-pointer transition-all duration-150 hover:bg-muted/80 ${
                        index % 2 === 0 ? 'bg-background' : 'bg-muted/30'
                      }`}
                      onClick={() => navigate(`/admin/plans/${plan.id}`)}
                    >
                      {visibleColumns.includes("select") && (
                        <TableCell className="sticky left-0 z-10 px-4 py-3 border-r bg-inherit" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedPlans.has(plan.id)}
                            onCheckedChange={() => togglePlanSelection(plan.id)}
                          />
                        </TableCell>
                      )}
                      {visibleColumns.includes("id") && (
                        <TableCell className="px-4 py-3 font-medium text-primary">{plan.id}</TableCell>
                      )}
                      {visibleColumns.includes("employee") && (
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                              {(plan.employee_name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium">{plan.employee_name || 'Unknown'}</span>
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.includes("client") && (
                        <TableCell className="px-4 py-3 font-medium">{plan.client_name}</TableCell>
                      )}
                      {visibleColumns.includes("display") && (
                        <TableCell className="px-4 py-3">
                          <span className="text-blue-600 cursor-pointer hover:underline">
                            {plan.plan_name || '-'}
                          </span>
                        </TableCell>
                      )}
                      {visibleColumns.includes("from") && (
                        <TableCell className="px-4 py-3 text-muted-foreground">
                          {plan.start_date ? new Date(plan.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '') : '-'}
                        </TableCell>
                      )}
                      {visibleColumns.includes("to") && (
                        <TableCell className="px-4 py-3 text-muted-foreground">
                          {plan.end_date ? new Date(plan.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '') : '-'}
                        </TableCell>
                      )}
                      {visibleColumns.includes("days") && (
                        <TableCell className="px-4 py-3">{plan.duration_days}</TableCell>
                      )}
                      {visibleColumns.includes("sqft") && (
                        <TableCell className="px-4 py-3 text-right">
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
                        <TableCell className="px-4 py-3 text-right font-medium">
                          {canSeePlanField('grand_total', plan)
                            ? formatCurrencyUtil(plan.grand_total, settings.currencyFormat, settings.currencySymbol, settings.compactNumbers)
                            : <span className="text-muted-foreground select-none">••••••</span>}
                        </TableCell>
                      )}
                      {visibleColumns.includes("qos") && (
                        <TableCell className="px-4 py-3 text-right">
                          <span className="text-green-600 font-medium">
                            {plan.status?.toLowerCase() === 'approved' ? '45%' : plan.status?.toLowerCase() === 'draft' ? '-' : '30%'}
                          </span>
                        </TableCell>
                      )}
                      {visibleColumns.includes("status") && (
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Badge 
                              variant={getPlanStatusConfig(plan.status).variant}
                              className={getPlanStatusConfig(plan.status).className}
                            >
                              {getPlanStatusConfig(plan.status).label}
                            </Badge>
                            {plan.is_archived && (
                              <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
                                <Archive className="mr-1 h-3 w-3" />
                                Archived
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.includes("actions") && (
                        <TableCell className="px-4 py-3 text-right">
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
                            
                            {plan.status !== 'Converted' && (
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
                            )}
                            
                            {plan.status?.toLowerCase() === 'approved' && isAdmin && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="default"
                                    size="icon"
                                    className="h-8 w-8 bg-green-600 hover:bg-green-700"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/admin/plans/${plan.id}`);
                                    }}
                                  >
                                    <Rocket className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Convert to Campaign</TooltipContent>
                              </Tooltip>
                            )}
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56">
                                {plan.status?.toLowerCase() === 'approved' && isAdmin && (
                                  <>
                                    <DropdownMenuItem 
                                      onClick={() => navigate(`/admin/plans/${plan.id}`)}
                                      className="text-green-600 font-medium"
                                    >
                                      <Rocket className="mr-2 h-4 w-4" />
                                      Convert to Campaign
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                  </>
                                )}
                                <ActionGuard module="plans" action="delete" record={plan}>
                                    <DropdownMenuItem onClick={() => handleDelete(plan.id)}>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleBlock(plan.id)}>
                                      <Ban className="mr-2 h-4 w-4" />
                                      Reject
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                </ActionGuard>
                                <DropdownMenuItem onClick={() => handleCopy(plan.id)}>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Copy ID
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => setDuplicateDialog({ open: true, plan })}
                                  className="text-primary"
                                >
                                  <CopyPlus className="mr-2 h-4 w-4" />
                                  Duplicate Plan
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
                                {plan.is_archived && isAdmin && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleUnarchive(plan)} className="text-primary">
                                      <ArchiveRestore className="mr-2 h-4 w-4" />
                                      Unarchive Plan
                                    </DropdownMenuItem>
                                  </>
                                )}
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
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Templates Dialog */}
      <TemplatesDialog
        open={showTemplatesDialog}
        onOpenChange={setShowTemplatesDialog}
      />

      {/* Bulk Conversion Dialog */}
      <BulkConversionDialog
        open={showBulkConversionDialog}
        onOpenChange={setShowBulkConversionDialog}
        selectedPlanIds={Array.from(selectedPlans)}
        onComplete={() => {
          setSelectedPlans(new Set());
          fetchPlans();
        }}
      />

      {/* Duplicate Plan Dialog */}
      {duplicateDialog.plan && (
        <DuplicatePlanDialog
          open={duplicateDialog.open}
          onOpenChange={(open) => setDuplicateDialog({ ...duplicateDialog, open })}
          plan={duplicateDialog.plan}
          onSuccess={fetchPlans}
        />
      )}
    </div>
    </ModuleGuard>
  );
}
