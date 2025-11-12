import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
import { Eye, Trash2, FileText, Plus, Pencil } from "lucide-react";
import { CreateCampaignFromPlanDialog } from "@/components/campaigns/CreateCampaignFromPlanDialog";
import { CampaignTemplatesDialog } from "@/components/campaigns/CampaignTemplatesDialog";
import { BulkStatusUpdateDialog } from "@/components/campaigns/BulkStatusUpdateDialog";
import { CampaignHealthAlerts } from "@/components/campaigns/CampaignHealthAlerts";
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

export default function CampaignsList() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set());
  const [globalSearchFiltered, setGlobalSearchFiltered] = useState<any[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { density, setDensity, getRowClassName, getCellClassName } = useTableDensity("campaigns");
  const { 
    settings, 
    updateSettings, 
    resetSettings,
    isReady: settingsReady 
  } = useTableSettings("campaigns");

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
  }, []);

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
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
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

  const filteredCampaigns = globalSearchFiltered.filter(campaign => {
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
    if (filterStatus && campaign.status !== filterStatus) return false;
    
    return true;
  });
  
  const uniqueStatuses = Array.from(new Set(campaigns.map(c => c.status).filter(Boolean)));

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this campaign?")) return;

    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete campaign",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Campaign deleted successfully",
      });
      fetchCampaigns();
    }
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
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
                  onClick={() => setShowCreateDialog(true)}
                  size="lg"
                  className="bg-gradient-primary hover:shadow-glow transition-smooth"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  New Campaign
                </Button>
              </>
            )}
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
            setFilterStatus("");
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
          <Table>
            <TableHeader>
              <TableRow className={getRowClassName()}>
                <TableHead className={getCellClassName()}>
                  <Checkbox
                    checked={selectedCampaigns.size === filteredCampaigns.length && filteredCampaigns.length > 0}
                    onCheckedChange={toggleAllCampaigns}
                  />
                </TableHead>
                <TableHead className={getCellClassName()}>Campaign ID</TableHead>
                <TableHead className={getCellClassName()}>Client</TableHead>
                <TableHead className={getCellClassName()}>Campaign</TableHead>
                <TableHead className={getCellClassName()}>Period</TableHead>
                <TableHead className={getCellClassName()}>Status</TableHead>
                <TableHead className={getCellClassName()}>Assets</TableHead>
                <TableHead className={`text-right ${getCellClassName()}`}>Total</TableHead>
                <TableHead className={`text-right ${getCellClassName()}`}>Actions</TableHead>
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
                filteredCampaigns.map((campaign) => (
                  <TableRow key={campaign.id} className={getRowClassName()}>
                    <TableCell className={getCellClassName()}>
                      <Checkbox
                        checked={selectedCampaigns.has(campaign.id)}
                        onCheckedChange={() => toggleCampaignSelection(campaign.id)}
                      />
                    </TableCell>
                    <TableCell className={`font-medium ${getCellClassName()}`}>{campaign.id}</TableCell>
                    <TableCell className={getCellClassName()}>{campaign.client_name}</TableCell>
                    <TableCell className={getCellClassName()}>{campaign.campaign_name}</TableCell>
                    <TableCell className={getCellClassName()}>
                      {formatDateUtil(campaign.start_date, settings.dateFormat)} - {formatDateUtil(campaign.end_date, settings.dateFormat)}
                    </TableCell>
                    <TableCell className={getCellClassName()}>
                      <Badge variant="outline" className={getCampaignStatusConfig(campaign.status).className}>
                        {getCampaignStatusConfig(campaign.status).label}
                      </Badge>
                    </TableCell>
                    <TableCell className={getCellClassName()}>{campaign.total_assets || 0}</TableCell>
                    <TableCell className={`text-right ${getCellClassName()}`}>
                      {formatCurrencyUtil(campaign.grand_total, settings.currencyFormat, settings.currencySymbol, settings.compactNumbers)}
                    </TableCell>
                    <TableCell className={`text-right ${getCellClassName()}`}>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/admin/campaigns/${campaign.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/admin/campaigns/edit/${campaign.id}`)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(campaign.id)}
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

        {/* Create Campaign Dialog */}
        <CreateCampaignFromPlanDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSuccess={() => {
            fetchCampaigns();
            navigate('/admin/campaigns');
          }}
        />
      </div>
    </div>
  );
}
