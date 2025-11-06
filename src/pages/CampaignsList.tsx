import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Eye, Trash2 } from "lucide-react";
import { formatCurrency } from "@/utils/mediaAssets";
import { getCampaignStatusColor } from "@/utils/campaigns";
import { formatDate } from "@/utils/plans";
import { toast } from "@/hooks/use-toast";
import { TableFilters } from "@/components/common/table-filters";
import { Card, CardContent } from "@/components/ui/card";

export default function CampaignsList() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

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
        .eq('user_id', user.id)
        .single();
      setIsAdmin(data?.role === 'admin');
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
  };

  const filteredCampaigns = campaigns.filter(campaign => {
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
        </div>

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
            { key: "id", label: "Campaign ID" },
            { key: "client", label: "Client" },
            { key: "campaign", label: "Campaign" },
            { key: "period", label: "Period" },
            { key: "status", label: "Status" },
            { key: "assets", label: "Assets" },
            { key: "total", label: "Total" },
            { key: "actions", label: "Actions" },
          ]}
          visibleColumns={["id", "client", "campaign", "period", "status", "assets", "total", "actions"]}
          onColumnVisibilityChange={() => {}}
          onResetColumns={() => {}}
        />

        <div className="bg-card rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assets</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredCampaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No campaigns found
                  </TableCell>
                </TableRow>
              ) : (
                filteredCampaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">{campaign.id}</TableCell>
                    <TableCell>{campaign.client_name}</TableCell>
                    <TableCell>{campaign.campaign_name}</TableCell>
                    <TableCell>
                      {formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getCampaignStatusColor(campaign.status)}>
                        {campaign.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{campaign.total_assets || 0}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(campaign.grand_total)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/admin/campaigns/${campaign.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(campaign.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
  );
}
