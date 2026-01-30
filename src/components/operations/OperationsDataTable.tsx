import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Filter, Camera, Eye, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface CampaignAsset {
  id: string;
  asset_id: string;
  campaign_id: string;
  location: string;
  area: string;
  city: string;
  media_type: string;
  status: string;
  mounter_name: string | null;
  assigned_at: string | null;
  completed_at: string | null;
  photos: any;
  campaign?: {
    id: string;
    campaign_name: string;
    client_name: string;
    status: string;
  };
}

interface Campaign {
  id: string;
  campaign_name: string;
  client_name: string;
  status: string;
}

interface OperationsDataTableProps {
  assets: CampaignAsset[];
  campaigns: Campaign[];
  loading: boolean;
  onRefresh?: () => void;
}

type SortField = 'asset_id' | 'location' | 'mounter_name' | 'status' | 'assigned_at' | 'completed_at' | 'campaign_name';
type SortDirection = 'asc' | 'desc' | null;

export function OperationsDataTable({ assets, campaigns, loading, onRefresh }: OperationsDataTableProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Get only active/running campaigns for the filter dropdown
  const activeCampaigns = useMemo(() => {
    return campaigns.filter(c => 
      c.status === 'InProgress' || 
      c.status === 'Planned' || 
      c.status === 'Running' ||
      c.status === 'Active'
    );
  }, [campaigns]);

  // Handle sort toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get sort icon
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="ml-1 h-3 w-3" />;
    }
    return <ArrowDown className="ml-1 h-3 w-3" />;
  };

  // Filter and sort data
  const processedAssets = useMemo(() => {
    let result = [...assets];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(asset =>
        asset.asset_id.toLowerCase().includes(query) ||
        asset.location.toLowerCase().includes(query) ||
        asset.area?.toLowerCase().includes(query) ||
        asset.city?.toLowerCase().includes(query) ||
        (asset.mounter_name || '').toLowerCase().includes(query) ||
        (asset.campaign?.campaign_name || '').toLowerCase().includes(query) ||
        (asset.campaign?.client_name || '').toLowerCase().includes(query)
      );
    }

    // Campaign filter
    if (campaignFilter !== 'all') {
      result = result.filter(asset => asset.campaign_id === campaignFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(asset => asset.status === statusFilter);
    }

    // Sort
    if (sortField && sortDirection) {
      result.sort((a, b) => {
        let aVal: any;
        let bVal: any;

        switch (sortField) {
          case 'asset_id':
            aVal = a.asset_id;
            bVal = b.asset_id;
            break;
          case 'location':
            aVal = a.location || '';
            bVal = b.location || '';
            break;
          case 'mounter_name':
            aVal = a.mounter_name || '';
            bVal = b.mounter_name || '';
            break;
          case 'status':
            aVal = a.status || '';
            bVal = b.status || '';
            break;
          case 'assigned_at':
            aVal = a.assigned_at ? new Date(a.assigned_at).getTime() : 0;
            bVal = b.assigned_at ? new Date(b.assigned_at).getTime() : 0;
            break;
          case 'completed_at':
            aVal = a.completed_at ? new Date(a.completed_at).getTime() : 0;
            bVal = b.completed_at ? new Date(b.completed_at).getTime() : 0;
            break;
          case 'campaign_name':
            aVal = a.campaign?.campaign_name || '';
            bVal = b.campaign?.campaign_name || '';
            break;
          default:
            return 0;
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [assets, searchQuery, campaignFilter, statusFilter, sortField, sortDirection]);

  // Get unique statuses for filter
  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(assets.map(a => a.status).filter(Boolean));
    return Array.from(statuses).sort();
  }, [assets]);

  // Get photo count
  const getPhotoCount = (photos: any) => {
    if (!photos) return 0;
    if (Array.isArray(photos)) return photos.length;
    if (typeof photos === 'object') {
      return Object.values(photos).filter(Boolean).length;
    }
    return 0;
  };

  // Get status badge color
  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'Pending': 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/50',
      'Assigned': 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/50',
      'InProgress': 'bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/50',
      'Mounted': 'bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/50',
      'PhotoUploaded': 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border-cyan-500/50',
      'Verified': 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/50',
      'Completed': 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/50',
    };
    
    return (
      <Badge variant="outline" className={cn("font-medium", colors[status] || 'bg-gray-500/20 text-gray-700')}>
        {status.replace(/([A-Z])/g, ' $1').trim()}
      </Badge>
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setCampaignFilter("all");
    setStatusFilter("all");
    setSortField(null);
    setSortDirection(null);
  };

  const hasActiveFilters = searchQuery || campaignFilter !== 'all' || statusFilter !== 'all';

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>All Operations</CardTitle>
            <CardDescription>
              {processedAssets.length} of {assets.length} assets
            </CardDescription>
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="mr-1 h-3 w-3" />
              Clear Filters
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters Row */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search asset code, location, mounter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Campaign Filter - Active/Running only */}
          <Select value={campaignFilter} onValueChange={setCampaignFilter}>
            <SelectTrigger className="w-full sm:w-[250px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by Campaign" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {activeCampaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.campaign_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {uniqueStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status.replace(/([A-Z])/g, ' $1').trim()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8 data-[state=open]:bg-accent"
                    onClick={() => handleSort('asset_id')}
                  >
                    Asset Code
                    {getSortIcon('asset_id')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8 data-[state=open]:bg-accent"
                    onClick={() => handleSort('location')}
                  >
                    Location
                    {getSortIcon('location')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8 data-[state=open]:bg-accent"
                    onClick={() => handleSort('campaign_name')}
                  >
                    Campaign
                    {getSortIcon('campaign_name')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8 data-[state=open]:bg-accent"
                    onClick={() => handleSort('mounter_name')}
                  >
                    Mounter
                    {getSortIcon('mounter_name')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8 data-[state=open]:bg-accent"
                    onClick={() => handleSort('status')}
                  >
                    Status
                    {getSortIcon('status')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8 data-[state=open]:bg-accent"
                    onClick={() => handleSort('assigned_at')}
                  >
                    Assigned
                    {getSortIcon('assigned_at')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8 data-[state=open]:bg-accent"
                    onClick={() => handleSort('completed_at')}
                  >
                    Completed
                    {getSortIcon('completed_at')}
                  </Button>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    Loading operations...
                  </TableCell>
                </TableRow>
              ) : processedAssets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    No operations found
                  </TableCell>
                </TableRow>
              ) : (
                processedAssets.map((asset) => (
                  <TableRow key={asset.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      {asset.asset_id}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px]">
                        <p className="truncate font-medium">{asset.location}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {asset.area}, {asset.city}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[180px]">
                        <p className="truncate font-medium text-sm">
                          {asset.campaign?.campaign_name || '-'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {asset.campaign?.client_name || ''}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {asset.mounter_name || (
                        <span className="text-muted-foreground text-sm">Not assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(asset.status)}
                    </TableCell>
                    <TableCell>
                      {asset.assigned_at ? (
                        <span className="text-sm">
                          {format(new Date(asset.assigned_at), 'dd MMM yyyy')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {asset.completed_at ? (
                        <span className="text-sm">
                          {format(new Date(asset.completed_at), 'dd MMM yyyy')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/admin/operations/${asset.campaign_id}/assets/${asset.asset_id}`)}
                          title="Manage Photos"
                        >
                          <Camera className="h-4 w-4" />
                          <span className="ml-1 text-xs">
                            {getPhotoCount(asset.photos)}/4
                          </span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/admin/campaigns/${asset.campaign_id}`)}
                          title="View Campaign"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Results count */}
        {!loading && processedAssets.length > 0 && (
          <p className="text-sm text-muted-foreground text-center">
            Showing {processedAssets.length} of {assets.length} operations
          </p>
        )}
      </CardContent>
    </Card>
  );
}
