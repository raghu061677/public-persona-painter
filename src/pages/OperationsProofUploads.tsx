import { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Image as ImageIcon, MapPin, CheckCircle, AlertCircle, Search, ArrowUpDown, ArrowUp, ArrowDown, X, Filter, Images } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { QrCode, ExternalLink } from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";
import { format } from "date-fns";
import { resolveAssetDisplayCode } from "@/lib/assets/getAssetDisplayCode";
import { ROUTES } from "@/lib/routes";

interface ProofAsset {
  id: string;
  campaign_id: string;
  asset_id: string;
  city: string;
  area: string;
  location: string;
  media_type: string;
  status: string;
  photos: any;
  mounter_name: string | null;
  completed_at: string | null;
  latitude?: number | null;
  longitude?: number | null;
  media_assets?: {
    id: string;
    media_asset_code?: string | null;
  } | null;
  campaigns: {
    campaign_name: string;
    client_name: string;
    status: string;
  } | null;
}

type SortField = 'asset_code' | 'location' | 'campaign_name' | 'mounter_name' | 'status' | 'completed_at' | 'photo_count';
type SortDirection = 'asc' | 'desc' | null;

export default function OperationsProofUploads() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<ProofAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { company } = useCompany();
  
  // Filters & sorting state
  const [searchQuery, setSearchQuery] = useState("");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  useEffect(() => {
    if (company?.id) {
      loadProofUploads();
    }
  }, [company?.id]);

  const loadProofUploads = async () => {
    try {
      setLoading(true);
      
      // Fetch campaign assets with photos or in photo-related statuses, including media_asset_code
      const { data, error } = await supabase
        .from("campaign_assets")
        .select(`
          id,
          campaign_id,
          asset_id,
          city,
          area,
          location,
          media_type,
          status,
          photos,
          mounter_name,
          completed_at,
          latitude,
          longitude,
          media_assets!campaign_assets_asset_id_fkey (
            id,
            media_asset_code
          ),
          campaigns!campaign_assets_campaign_id_fkey (
            campaign_name,
            client_name,
            status,
            company_id
          )
        `)
        .in("status", ["PhotoUploaded", "Verified", "Completed", "Mounted"])
        .order("completed_at", { ascending: false, nullsFirst: false });

      if (error) throw error;
      
      // Filter by company
      const filteredData = (data || []).filter(asset => 
        asset.campaigns && (asset.campaigns as any).company_id === company?.id
      );
      
      setAssets(filteredData as ProofAsset[]);
    } catch (error: any) {
      console.error("Error loading proof uploads:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load proof uploads",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const countPhotos = (photos: any): number => {
    if (!photos) return 0;
    if (typeof photos === "string") {
      try {
        const parsed = JSON.parse(photos);
        return Object.keys(parsed).filter(k => parsed[k]).length;
      } catch {
        return 0;
      }
    }
    if (typeof photos === "object") {
      return Object.keys(photos).filter(k => photos[k]).length;
    }
    return 0;
  };

  // Get unique campaigns for filter
  const uniqueCampaigns = useMemo(() => {
    const campaignMap = new Map<string, { id: string; name: string; status: string }>();
    assets.forEach(a => {
      if (a.campaigns && a.campaign_id) {
        campaignMap.set(a.campaign_id, {
          id: a.campaign_id,
          name: a.campaigns.campaign_name,
          status: a.campaigns.status
        });
      }
    });
    // Only show active/running campaigns
    return Array.from(campaignMap.values()).filter(c => 
      c.status === 'InProgress' || c.status === 'Planned' || c.status === 'Running'
    );
  }, [assets]);

  // Get unique statuses for filter
  const uniqueStatuses = useMemo(() => {
    return Array.from(new Set(assets.map(a => a.status).filter(Boolean))).sort();
  }, [assets]);

  // Handle sort
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

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="ml-1 h-3 w-3" />;
    }
    return <ArrowDown className="ml-1 h-3 w-3" />;
  };

  // Filter and sort
  const processedAssets = useMemo(() => {
    let result = [...assets];

    // Search - use display code, not raw asset_id
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(asset => {
        const displayCode = resolveAssetDisplayCode(asset);
        return displayCode.toLowerCase().includes(query) ||
          asset.location?.toLowerCase().includes(query) ||
          asset.area?.toLowerCase().includes(query) ||
          asset.city?.toLowerCase().includes(query) ||
          (asset.mounter_name || '').toLowerCase().includes(query) ||
          (asset.campaigns?.campaign_name || '').toLowerCase().includes(query) ||
          (asset.campaigns?.client_name || '').toLowerCase().includes(query);
      });
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
          case 'asset_code':
            aVal = resolveAssetDisplayCode(a);
            bVal = resolveAssetDisplayCode(b);
            break;
          case 'location':
            aVal = a.location || '';
            bVal = b.location || '';
            break;
          case 'campaign_name':
            aVal = a.campaigns?.campaign_name || '';
            bVal = b.campaigns?.campaign_name || '';
            break;
          case 'mounter_name':
            aVal = a.mounter_name || '';
            bVal = b.mounter_name || '';
            break;
          case 'status':
            aVal = a.status || '';
            bVal = b.status || '';
            break;
          case 'completed_at':
            aVal = a.completed_at ? new Date(a.completed_at).getTime() : 0;
            bVal = b.completed_at ? new Date(b.completed_at).getTime() : 0;
            break;
          case 'photo_count':
            aVal = countPhotos(a.photos);
            bVal = countPhotos(b.photos);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Verified":
      case "verified":
        return (
          <Badge variant="default" className="gap-1 bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/50">
            <CheckCircle className="h-3 w-3" />
            Verified
          </Badge>
        );
      case "PhotoUploaded":
      case "proof_uploaded":
        return (
          <Badge variant="secondary" className="gap-1 bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border-cyan-500/50">
            <AlertCircle className="h-3 w-3" />
            Pending Review
          </Badge>
        );
      case "Mounted":
      case "installed":
        return <Badge variant="outline" className="bg-orange-500/20 text-orange-700 border-orange-500/50">Mounted</Badge>;
      case "Completed":
        return (
          <Badge variant="default" className="gap-1 bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/50">
            <CheckCircle className="h-3 w-3" />
            Completed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setCampaignFilter("all");
    setStatusFilter("all");
    setSortField(null);
    setSortDirection(null);
  };

  const hasActiveFilters = searchQuery || campaignFilter !== 'all' || statusFilter !== 'all';

  return (
    <div className="h-full flex flex-col space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Proof Photo Uploads</h1>
        <p className="text-muted-foreground">
          Review and manage installation proof photos
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Proof Photo Gallery ({processedAssets.length} of {assets.length})
              </CardTitle>
              <CardDescription>
                View all uploaded proof photos for campaigns.{" "}
                <Link to={ROUTES.PHOTO_LIBRARY} className="text-primary hover:underline">
                  Open Photo Library
                </Link>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to={ROUTES.PHOTO_LIBRARY}>
                  <Images className="mr-2 h-4 w-4" />
                  Open Gallery
                </Link>
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="mr-1 h-3 w-3" />
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search asset, location, mounter, campaign..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Campaign Filter */}
            <Select value={campaignFilter} onValueChange={setCampaignFilter}>
              <SelectTrigger className="w-full sm:w-[250px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by Campaign" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                {uniqueCampaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
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

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No proof photos uploaded yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Installation proof photos will appear here once assets are mounted and photos are uploaded
              </p>
            </div>
          ) : processedAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No matching results</p>
              <p className="text-sm text-muted-foreground mt-2">
                Try adjusting your search or filters
              </p>
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8"
                        onClick={() => handleSort('asset_code')}
                      >
                        Asset Code
                        {getSortIcon('asset_code')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8"
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
                        className="-ml-3 h-8"
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
                        className="-ml-3 h-8"
                        onClick={() => handleSort('photo_count')}
                      >
                        Photos
                        {getSortIcon('photo_count')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8"
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
                        className="-ml-3 h-8"
                        onClick={() => handleSort('completed_at')}
                      >
                        Completed
                        {getSortIcon('completed_at')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8"
                        onClick={() => handleSort('status')}
                      >
                        Status
                        {getSortIcon('status')}
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedAssets.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell className="font-medium">
                        {resolveAssetDisplayCode(asset)}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[180px]">
                          <p className="truncate font-medium text-sm">
                            {asset.campaigns?.campaign_name || '-'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {asset.campaigns?.client_name || ''}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start gap-1 max-w-[200px]">
                          <MapPin className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="text-sm">
                            <div className="truncate">{asset.location}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {asset.area}, {asset.city}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <ImageIcon className="h-3 w-3" />
                          {countPhotos(asset.photos)}/4
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {asset.mounter_name || <span className="text-muted-foreground">Unassigned</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {asset.completed_at
                          ? format(new Date(asset.completed_at), 'dd MMM yyyy')
                          : "Pending"}
                      </TableCell>
                      <TableCell>{getStatusBadge(asset.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {asset.latitude && asset.longitude && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                const url = `https://www.google.com/maps?q=${asset.latitude},${asset.longitude}`;
                                window.open(url, '_blank');
                              }}
                              title="Open in Maps"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              navigate(`/admin/operations/${asset.campaign_id}/assets/${asset.asset_id}`)
                            }
                          >
                            View Photos
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Results count */}
          {!loading && processedAssets.length > 0 && (
            <p className="text-sm text-muted-foreground text-center">
              Showing {processedAssets.length} of {assets.length} proof uploads
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
