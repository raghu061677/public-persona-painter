import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown, X, Clock, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/utils/mediaAssets";
import { Checkbox } from "@/components/ui/checkbox";
import { formatAssetDisplayCode } from "@/lib/assets/formatAssetDisplayCode";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import {
  batchCheckConflicts,
  getAssetBookingInfo,
  formatConflictSummary,
  type BookingConflict,
  type BookingDisplayStatus,
} from "@/utils/bookingEngine";

type SortField = 'media_asset_code' | 'location' | 'city' | 'area' | 'media_type' | 'card_rate' | 'status';
type SortDirection = 'asc' | 'desc' | null;

interface SortConfig {
  field: SortField | null;
  direction: SortDirection;
}

type StatusFilter = 'all' | 'available_for_dates' | 'available_now' | 'conflict' | 'upcoming';

interface AddCampaignAssetsDialogProps {
  open: boolean;
  onClose: () => void;
  existingAssetIds: string[];
  onAddAssets: (assets: any[]) => void;
  campaignId?: string;
  campaignStartDate?: Date | string;
  campaignEndDate?: Date | string;
}

export function AddCampaignAssetsDialog({
  open,
  onClose,
  existingAssetIds,
  onAddAssets,
  campaignId,
  campaignStartDate,
  campaignEndDate,
}: AddCampaignAssetsDialogProps) {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [mediaTypeFilter, setMediaTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("available_for_dates");
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [companyPrefix, setCompanyPrefix] = useState<string | null>(null);
  const [conflictMap, setConflictMap] = useState<Map<string, BookingConflict[]>>(new Map());
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: null, direction: null });

  useEffect(() => {
    fetchCompanySettings();
  }, []);

  const fetchCompanySettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: companyUser } = await supabase
          .from('company_users')
          .select('company_id, companies(name)')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();
        
        if (companyUser?.companies) {
          const company = companyUser.companies as any;
          setCompanyPrefix(company.name || null);
        }
      }
    } catch (error) {
      console.error('Error fetching company settings:', error);
    }
  };

  useEffect(() => {
    if (open) {
      fetchAllAssets();
      setSelectedAssets(new Set());
      setConflictMap(new Map());
      // Default to 'available_for_dates' when dates exist, 'all' otherwise
      setStatusFilter(campaignStartDate && campaignEndDate ? 'available_for_dates' : 'all');
    }
  }, [open]);

  const formatDateStr = (date: Date | string | undefined): string | null => {
    if (!date) return null;
    if (typeof date === 'string') return date.split('T')[0];
    return format(date, 'yyyy-MM-dd');
  };

  const startDateStr = formatDateStr(campaignStartDate);
  const endDateStr = formatDateStr(campaignEndDate);

  const fetchAllAssets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('media_assets')
        .select('*')
        .order('city', { ascending: true });

      if (error) throw error;

      const filteredAssets = data?.filter(
        asset => !existingAssetIds.includes(asset.id)
      ) || [];

      setAssets(filteredAssets);

      // Run batch conflict check using the booking engine RPC
      if (startDateStr && endDateStr && filteredAssets.length > 0) {
        setCheckingConflicts(true);
        try {
          const assetIds = filteredAssets.map(a => a.id);
          const conflicts = await batchCheckConflicts(assetIds, startDateStr, endDateStr, campaignId);
          setConflictMap(conflicts);
        } finally {
          setCheckingConflicts(false);
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch assets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Derive unique filter options from assets
  const cities = useMemo(() => 
    Array.from(new Set(assets.map(a => a.city).filter(Boolean))).sort(),
    [assets]
  );
  
  const areas = useMemo(() => {
    let filteredAreas = assets;
    if (cityFilter !== "all") {
      filteredAreas = assets.filter(a => a.city === cityFilter);
    }
    return Array.from(new Set(filteredAreas.map(a => a.area).filter(Boolean))).sort();
  }, [assets, cityFilter]);
  
  const mediaTypes = useMemo(() => 
    Array.from(new Set(assets.map(a => a.media_type).filter(Boolean))).sort(),
    [assets]
  );

  /**
   * Get booking info for an asset using the booking engine.
   * This replaces the old getEffectiveStatus / hasConflict logic.
   */
  const getBookingInfo = (asset: any): { status: BookingDisplayStatus; info: ReturnType<typeof getAssetBookingInfo> } => {
    const info = getAssetBookingInfo(
      asset.id,
      conflictMap,
      asset.status,
      asset.booking_end_date || asset.next_available_from,
      startDateStr
    );
    return { status: info.displayStatus, info };
  };

  // Filter and sort assets
  const filteredAndSortedAssets = useMemo(() => {
    let filtered = [...assets];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        asset =>
          asset.id.toLowerCase().includes(term) ||
          asset.media_asset_code?.toLowerCase().includes(term) ||
          asset.location?.toLowerCase().includes(term) ||
          asset.area?.toLowerCase().includes(term)
      );
    }

    // City filter
    if (cityFilter !== "all") {
      filtered = filtered.filter(asset => asset.city === cityFilter);
    }

    // Area filter
    if (areaFilter !== "all") {
      filtered = filtered.filter(asset => asset.area === areaFilter);
    }

    // Media type filter
    if (mediaTypeFilter !== "all") {
      filtered = filtered.filter(asset => asset.media_type === mediaTypeFilter);
    }

    // Status filter using booking engine
    if (statusFilter !== "all") {
      filtered = filtered.filter(asset => {
        const { status } = getBookingInfo(asset);
        switch (statusFilter) {
          case 'available_for_dates':
            return status === 'available' || status === 'available_soon';
          case 'conflict':
            return status === 'conflict';
          case 'available_now':
            return status === 'available';
          case 'upcoming':
            return status === 'upcoming' || status === 'available_soon';
          default:
            return true;
        }
      });
    }

    // Apply sorting
    if (sortConfig.field && sortConfig.direction) {
      filtered.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (sortConfig.field === 'status') {
          aValue = getBookingInfo(a).status;
          bValue = getBookingInfo(b).status;
        } else if (sortConfig.field === 'media_asset_code') {
          aValue = a.media_asset_code || a.id || '';
          bValue = b.media_asset_code || b.id || '';
        } else if (sortConfig.field === 'card_rate') {
          return sortConfig.direction === 'asc' 
            ? (Number(a.card_rate) || 0) - (Number(b.card_rate) || 0)
            : (Number(b.card_rate) || 0) - (Number(a.card_rate) || 0);
        } else {
          aValue = a[sortConfig.field!] ?? '';
          bValue = b[sortConfig.field!] ?? '';
        }

        const comparison = String(aValue).localeCompare(String(bValue));
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [assets, searchTerm, cityFilter, areaFilter, mediaTypeFilter, statusFilter, sortConfig, conflictMap]);

  const handleSort = (field: SortField) => {
    setSortConfig(current => {
      if (current.field === field) {
        if (current.direction === null) return { field, direction: 'asc' };
        if (current.direction === 'asc') return { field, direction: 'desc' };
        return { field: null, direction: null };
      }
      return { field, direction: 'asc' };
    });
  };

  const getSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground/50" />;
    }
    if (sortConfig.direction === 'asc') {
      return <ArrowUp className="ml-1 h-3 w-3 text-primary" />;
    }
    return <ArrowDown className="ml-1 h-3 w-3 text-primary" />;
  };

  const toggleAssetSelection = (assetId: string) => {
    const { info } = getBookingInfo(assets.find(a => a.id === assetId) || {});
    
    const newSelected = new Set(selectedAssets);
    if (newSelected.has(assetId)) {
      newSelected.delete(assetId);
    } else {
      // Warn but allow selection for conflicting assets — user can set per-asset dates after adding
      if (!info.isSelectable) {
        toast({
          title: "⚠️ Conflict with campaign-level dates",
          description: `${formatConflictSummary(info.conflicts)}\n\nYou can still add this asset and adjust its per-asset booking dates to avoid the overlap.`,
        });
      }
      newSelected.add(assetId);
    }
    setSelectedAssets(newSelected);
  };

  const handleAddSelected = () => {
    const assetsToAdd = assets.filter(asset => selectedAssets.has(asset.id));
    onAddAssets(assetsToAdd);
    setSelectedAssets(new Set());
    onClose();
  };

  const clearFilters = () => {
    setSearchTerm("");
    setCityFilter("all");
    setAreaFilter("all");
    setMediaTypeFilter("all");
    setStatusFilter("all");
    setSortConfig({ field: null, direction: null });
  };

  const activeFilterCount = [
    searchTerm ? 1 : 0,
    cityFilter !== "all" ? 1 : 0,
    areaFilter !== "all" ? 1 : 0,
    mediaTypeFilter !== "all" ? 1 : 0,
    statusFilter !== "all" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  // Counts using booking engine
  const conflictCount = conflictMap.size;
  const availableCount = filteredAndSortedAssets.filter(a => {
    const s = getBookingInfo(a).status;
    return s === 'available' || s === 'available_soon';
  }).length;

  const renderStatusBadge = (asset: any) => {
    const { status, info } = getBookingInfo(asset);
    
    switch (status) {
      case 'conflict':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-destructive border-destructive cursor-help">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Conflict
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="text-sm">
                  <p className="font-semibold mb-1">Booking Conflict:</p>
                  {info.conflicts.map((c, i) => (
                    <div key={i} className="mb-1">
                      <span className="font-medium">{c.campaign_name || c.source_type || 'Booking'}</span>
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {c.start_date ? format(new Date(c.start_date), 'dd MMM yyyy') : '?'} to{' '}
                        {c.end_date ? format(new Date(c.end_date), 'dd MMM yyyy') : '?'}
                      </span>
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      
      case 'available_soon':
        return (
          <Badge variant="outline" className="text-blue-600 border-blue-500">
            <Clock className="w-3 h-3 mr-1" />
            Available From {info.availableFrom ? format(new Date(info.availableFrom), 'dd MMM') : ''}
          </Badge>
        );
      
      case 'upcoming':
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-500">
            <Clock className="w-3 h-3 mr-1" />
            Upcoming
          </Badge>
        );
      
      case 'blocked':
        return (
          <Badge variant="outline" className="text-destructive border-destructive">
            Blocked
          </Badge>
        );
      
      default:
        return (
          <Badge variant="outline" className="text-green-600 border-green-500">
            <Check className="w-3 h-3 mr-1" />
            Available
          </Badge>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Add Assets to Campaign
            {conflictCount > 0 && (
              <Badge variant="outline" className="text-destructive border-destructive">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {conflictCount} conflict(s)
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filters Row 1: Search + Status + Clear */}
          <div className="flex gap-3 flex-wrap items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, location, or area..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Availability" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assets</SelectItem>
                <SelectItem value="available_for_dates">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Available for Selected Dates
                  </span>
                </SelectItem>
                <SelectItem value="available_now">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Available Now
                  </span>
                </SelectItem>
                <SelectItem value="conflict">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-destructive"></span>
                    Conflicting
                  </span>
                </SelectItem>
                <SelectItem value="upcoming">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Upcoming
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
                <X className="h-4 w-4 mr-1" />
                Clear ({activeFilterCount})
              </Button>
            )}
          </div>

          {/* Filters Row 2: City, Area, Media Type */}
          <div className="flex gap-3 flex-wrap">
            <Select value={cityFilter} onValueChange={(v) => { setCityFilter(v); setAreaFilter("all"); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="City" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {cities.map(city => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Area" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Areas</SelectItem>
                {areas.map(area => (
                  <SelectItem key={area} value={area}>{area}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={mediaTypeFilter} onValueChange={setMediaTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Media Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {mediaTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 ml-auto text-sm text-muted-foreground">
              <Badge variant="secondary">{filteredAndSortedAssets.length} assets</Badge>
              <Badge variant="outline" className="text-green-600 border-green-500">{availableCount} available</Badge>
              {conflictCount > 0 && (
                <Badge variant="outline" className="text-destructive border-destructive">{conflictCount} conflicts</Badge>
              )}
            </div>
          </div>

          {/* Assets table */}
          <div className="border rounded-lg max-h-[400px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="w-[50px] text-center">S.No</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('media_asset_code')}
                  >
                    <div className="flex items-center">
                      Asset ID
                      {getSortIcon('media_asset_code')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('location')}
                  >
                    <div className="flex items-center">
                      Location
                      {getSortIcon('location')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('city')}
                  >
                    <div className="flex items-center">
                      City
                      {getSortIcon('city')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('area')}
                  >
                    <div className="flex items-center">
                      Area
                      {getSortIcon('area')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('media_type')}
                  >
                    <div className="flex items-center">
                      Media Type
                      {getSortIcon('media_type')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none text-right"
                    onClick={() => handleSort('card_rate')}
                  >
                    <div className="flex items-center justify-end">
                      Card Rate
                      {getSortIcon('card_rate')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="w-32 cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center">
                      Availability
                      {getSortIcon('status')}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading || checkingConflicts ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      {loading ? "Loading assets..." : "Checking availability..."}
                    </TableCell>
                  </TableRow>
                ) : filteredAndSortedAssets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      No assets found matching filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedAssets.map((asset, index) => {
                    const { info } = getBookingInfo(asset);

                    return (
                      <TableRow 
                        key={asset.id}
                        className={!info.isSelectable ? "bg-amber-50 dark:bg-amber-950/20" : ""}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedAssets.has(asset.id)}
                            onCheckedChange={() => toggleAssetSelection(asset.id)}
                          />
                        </TableCell>
                        <TableCell className="text-center font-medium text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-medium font-mono text-sm">
                          {formatAssetDisplayCode({
                            mediaAssetCode: asset.media_asset_code,
                            fallbackId: asset.id,
                            companyName: companyPrefix
                          })}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={asset.location}>
                          {asset.location}
                        </TableCell>
                        <TableCell>{asset.city}</TableCell>
                        <TableCell>{asset.area}</TableCell>
                        <TableCell>{asset.media_type}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(asset.card_rate)}
                        </TableCell>
                        <TableCell>
                          {renderStatusBadge(asset)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {selectedAssets.size} asset(s) selected
              {conflictCount > 0 && (
                <span className="ml-2 text-amber-600">
                  • {conflictCount} asset(s) have conflicts with campaign dates — adjust per-asset dates after adding
                </span>
              )}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleAddSelected}
                disabled={selectedAssets.size === 0}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Selected ({selectedAssets.size})
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
