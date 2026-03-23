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
import { Plus, Search, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown, X, Clock, Check, Info } from "lucide-react";
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
import { datesOverlap, toDateString } from "@/lib/availability/dateOverlap";
import { computeFirstAvailableDate } from "@/utils/resolveAssetBookingWindow";

type SortField = 'media_asset_code' | 'location' | 'city' | 'area' | 'media_type' | 'card_rate' | 'status';
type SortDirection = 'asc' | 'desc' | null;

interface SortConfig {
  field: SortField | null;
  direction: SortDirection;
}

type StatusFilter = 'all' | 'available_for_dates' | 'available_now' | 'conflict' | 'upcoming';

/**
 * Per-asset availability info computed from actual campaign_assets bookings.
 * Campaign-level dates are informational only — asset-wise dates are authoritative.
 */
interface AssetAvailabilityInfo {
  status: 'available' | 'available_adjusted' | 'conflict' | 'upcoming';
  /** If dates needed adjustment, this is the first available date (adjusted start) */
  suggestedStartDate: string | null;
  /** If dates needed adjustment at the end, this is the last available date (adjusted end) */
  suggestedEndDate: string | null;
  /** Existing bookings that overlap with the requested window */
  overlappingBookings: Array<{
    campaignName: string;
    startDate: string;
    endDate: string;
  }>;
}

interface AddCampaignAssetsDialogProps {
  open: boolean;
  onClose: () => void;
  existingAssetIds: string[];
  /** Now accepts assets with suggested booking dates */
  onAddAssets: (assets: any[]) => void;
  campaignId?: string;
  campaignStartDate?: Date | string;
  campaignEndDate?: Date | string;
}

// Campaign statuses that represent active/valid bookings
const BOOKING_CAMPAIGN_STATUSES = ['Draft', 'Upcoming', 'Running'];
const EXCLUDED_CAMPAIGN_STATUSES = ['Cancelled', 'Archived', 'Completed'];

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
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: null, direction: null });
  
  /**
   * Asset-wise availability map — computed from campaign_assets bookings.
   * Key: asset_id, Value: availability info with suggested dates.
   */
  const [availabilityMap, setAvailabilityMap] = useState<Map<string, AssetAvailabilityInfo>>(new Map());
  const [checkingAvailability, setCheckingAvailability] = useState(false);

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

  const formatDateStr = (date: Date | string | undefined): string | null => {
    if (!date) return null;
    if (typeof date === 'string') return date.split('T')[0];
    return format(date, 'yyyy-MM-dd');
  };

  const startDateStr = formatDateStr(campaignStartDate);
  const endDateStr = formatDateStr(campaignEndDate);

  useEffect(() => {
    if (open) {
      fetchAllAssetsAndCheckAvailability();
      setSelectedAssets(new Set());
      setAvailabilityMap(new Map());
      setStatusFilter(campaignStartDate && campaignEndDate ? 'available_for_dates' : 'all');
    }
  }, [open]);

  /**
   * Fetch all media assets, then check their actual bookings from campaign_assets
   * using asset-wise dates (effective_start/end_date, booking_start/end_date).
   * 
   * This is the core change: we no longer use campaign-level dates for conflict detection.
   * Instead, we look at each asset's existing bookings and compute:
   * 1. Whether the asset has overlapping bookings
   * 2. The first available date if there's an overlap
   * 3. Whether the asset can still be added with adjusted dates
   */
  const fetchAllAssetsAndCheckAvailability = async () => {
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

      // Check asset-wise availability using campaign_assets as source of truth
      if (startDateStr && endDateStr && filteredAssets.length > 0) {
        setCheckingAvailability(true);
        try {
          const assetIds = filteredAssets.map(a => a.id);
          const newMap = await computeAssetWiseAvailability(assetIds, startDateStr, endDateStr, campaignId);
          setAvailabilityMap(newMap);
        } finally {
          setCheckingAvailability(false);
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

  /**
   * Core availability computation using asset-wise dates from campaign_assets.
   * For each asset, fetches existing bookings and determines:
   * - 'available': no overlap, can use campaign dates as-is
   * - 'available_adjusted': overlap exists but asset becomes available within the campaign period
   * - 'conflict': asset is fully blocked for the entire requested period
   */
  const computeAssetWiseAvailability = async (
    assetIds: string[],
    reqStart: string,
    reqEnd: string,
    excludeCampaignId?: string
  ): Promise<Map<string, AssetAvailabilityInfo>> => {
    const result = new Map<string, AssetAvailabilityInfo>();

    // Batch fetch existing bookings from campaign_assets using asset-wise dates
    let query = supabase
      .from('campaign_assets')
      .select(`
        asset_id,
        effective_start_date, effective_end_date,
        booking_start_date, booking_end_date,
        start_date, end_date,
        is_removed,
        campaigns!inner(id, campaign_name, client_name, start_date, end_date, status, is_deleted)
      `)
      .in('asset_id', assetIds);

    if (excludeCampaignId) {
      query = query.neq('campaign_id', excludeCampaignId);
    }

    const { data: allBookings } = await query;

    // Also check holds
    const { data: allHolds } = await supabase
      .from('asset_holds')
      .select('id, asset_id, start_date, end_date, status, client_name')
      .in('asset_id', assetIds)
      .eq('status', 'ACTIVE');

    // Group bookings by asset_id, resolving to asset-wise dates
    const bookingsByAsset = new Map<string, Array<{ campaignName: string; startDate: string; endDate: string }>>();

    for (const b of (allBookings || [])) {
      const campaign = b.campaigns as any;
      if (!campaign || campaign.is_deleted) continue;
      if (EXCLUDED_CAMPAIGN_STATUSES.includes(campaign.status)) continue;

      // Skip dropped/removed assets — they no longer block availability
      // Their effective_end_date marks when they were freed
      if (b.is_removed) continue;

      // Resolve using asset-wise date priority (NOT campaign dates)
      const bStart = toDateString(b.effective_start_date) ||
                     toDateString(b.booking_start_date) ||
                     toDateString(b.start_date) ||
                     toDateString(campaign.start_date);
      const bEnd = toDateString(b.effective_end_date) ||
                   toDateString(b.booking_end_date) ||
                   toDateString(b.end_date) ||
                   toDateString(campaign.end_date);

      if (!bStart || !bEnd) continue;

      const list = bookingsByAsset.get(b.asset_id) || [];
      list.push({
        campaignName: campaign.campaign_name || campaign.id,
        startDate: bStart,
        endDate: bEnd,
      });
      bookingsByAsset.set(b.asset_id, list);
    }

    // Add holds as bookings
    for (const h of (allHolds || [])) {
      if (!h.start_date || !h.end_date) continue;
      const list = bookingsByAsset.get(h.asset_id) || [];
      list.push({
        campaignName: `Hold: ${h.client_name || 'Reserved'}`,
        startDate: toDateString(h.start_date),
        endDate: toDateString(h.end_date),
      });
      bookingsByAsset.set(h.asset_id, list);
    }

    // Compute availability for each asset
    for (const assetId of assetIds) {
      const existingBookings = bookingsByAsset.get(assetId) || [];

      if (existingBookings.length === 0) {
        result.set(assetId, { status: 'available', suggestedStartDate: null, suggestedEndDate: null, overlappingBookings: [] });
        continue;
      }

      // Find bookings that overlap with the requested range
      const overlapping = existingBookings.filter(b =>
        datesOverlap(b.startDate, b.endDate, reqStart, reqEnd)
      );

      if (overlapping.length === 0) {
        result.set(assetId, { status: 'available', suggestedStartDate: null, suggestedEndDate: null, overlappingBookings: [] });
        continue;
      }

      // Try forward adjustment: first available date after overlapping bookings end
      const firstAvailable = computeFirstAvailableDate(
        overlapping.map(b => ({ startDate: b.startDate, endDate: b.endDate })),
        reqStart,
        reqEnd
      );

      if (firstAvailable) {
        result.set(assetId, {
          status: 'available_adjusted',
          suggestedStartDate: firstAvailable,
          suggestedEndDate: null,
          overlappingBookings: overlapping,
        });
        continue;
      }

      // Try backward adjustment: check if there's a free window at the START of the range
      // Find the earliest overlapping booking start date
      const earliestOverlapStart = overlapping.reduce((min, b) => 
        b.startDate < min ? b.startDate : min, overlapping[0].startDate);
      
      if (earliestOverlapStart > reqStart) {
        // There's a gap at the beginning: reqStart to (earliestOverlapStart - 1 day)
        const endBefore = new Date(earliestOverlapStart + 'T00:00:00');
        endBefore.setDate(endBefore.getDate() - 1);
        const suggestedEnd = endBefore.toISOString().split('T')[0];
        
        if (suggestedEnd >= reqStart) {
          result.set(assetId, {
            status: 'available_adjusted',
            suggestedStartDate: null,
            suggestedEndDate: suggestedEnd,
            overlappingBookings: overlapping,
          });
          continue;
        }
      }

      // True conflict — asset is fully blocked for the entire period
      result.set(assetId, {
        status: 'conflict',
        suggestedStartDate: null,
        suggestedEndDate: null,
        overlappingBookings: overlapping,
      });
    }

    return result;
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

  const getAvailInfo = (assetId: string): AssetAvailabilityInfo => {
    return availabilityMap.get(assetId) || { status: 'available', suggestedStartDate: null, suggestedEndDate: null, overlappingBookings: [] };
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

    // Status filter using asset-wise availability
    if (statusFilter !== "all") {
      filtered = filtered.filter(asset => {
        const info = getAvailInfo(asset.id);
        switch (statusFilter) {
          case 'available_for_dates':
            return info.status === 'available' || info.status === 'available_adjusted';
          case 'conflict':
            return info.status === 'conflict';
          case 'available_now':
            return info.status === 'available';
          case 'upcoming':
            return info.status === 'available_adjusted';
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
          aValue = getAvailInfo(a.id).status;
          bValue = getAvailInfo(b.id).status;
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
  }, [assets, searchTerm, cityFilter, areaFilter, mediaTypeFilter, statusFilter, sortConfig, availabilityMap]);

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
    const newSelected = new Set(selectedAssets);
    if (newSelected.has(assetId)) {
      newSelected.delete(assetId);
    } else {
      newSelected.add(assetId);
    }
    setSelectedAssets(newSelected);
  };

  /**
   * When adding selected assets, attach suggested booking dates per asset.
   * Assets with adjusted dates get their booking_start_date set to the
   * first available date instead of the campaign start date.
   */
  const handleAddSelected = () => {
    const assetsToAdd = assets
      .filter(asset => selectedAssets.has(asset.id))
      .map(asset => {
        const info = getAvailInfo(asset.id);
        return {
          ...asset,
          // Attach suggested asset-wise booking dates
          _suggestedStartDate: info.suggestedStartDate || null,
          _hasAdjustedDates: info.status === 'available_adjusted',
        };
      });
    
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

  // Counts
  const conflictCount = [...availabilityMap.values()].filter(v => v.status === 'conflict').length;
  const adjustedCount = [...availabilityMap.values()].filter(v => v.status === 'available_adjusted').length;
  const availableCount = filteredAndSortedAssets.filter(a => {
    const s = getAvailInfo(a.id).status;
    return s === 'available' || s === 'available_adjusted';
  }).length;

  const renderStatusBadge = (asset: any) => {
    const info = getAvailInfo(asset.id);
    
    switch (info.status) {
      case 'conflict':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-destructive border-destructive cursor-help">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Fully Booked
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="text-sm">
                  <p className="font-semibold mb-1">Asset fully booked for this period:</p>
                  {info.overlappingBookings.map((c, i) => (
                    <div key={i} className="mb-1">
                      <span className="font-medium">{c.campaignName}</span>
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(c.startDate), 'dd MMM yyyy')} to{' '}
                        {format(new Date(c.endDate), 'dd MMM yyyy')}
                      </span>
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      
      case 'available_adjusted':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-blue-600 border-blue-500 cursor-help">
                  <Clock className="w-3 h-3 mr-1" />
                  From {info.suggestedStartDate ? format(new Date(info.suggestedStartDate), 'dd MMM') : ''}
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="text-sm">
                  <p className="font-semibold mb-1">
                    Available from {info.suggestedStartDate ? format(new Date(info.suggestedStartDate), 'dd MMM yyyy') : ''}
                  </p>
                  <p className="text-muted-foreground mb-1">Previous booking:</p>
                  {info.overlappingBookings.map((c, i) => (
                    <div key={i} className="mb-1">
                      <span className="font-medium">{c.campaignName}</span>
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(c.startDate), 'dd MMM yyyy')} to{' '}
                        {format(new Date(c.endDate), 'dd MMM yyyy')}
                      </span>
                    </div>
                  ))}
                  <p className="mt-1 text-xs text-blue-600 font-medium">
                    ✔ Booking dates will be auto-adjusted when added
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
            {adjustedCount > 0 && (
              <Badge variant="outline" className="text-blue-600 border-blue-500">
                <Info className="w-3 h-3 mr-1" />
                {adjustedCount} with adjusted dates
              </Badge>
            )}
            {conflictCount > 0 && (
              <Badge variant="outline" className="text-destructive border-destructive">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {conflictCount} fully booked
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
                    Available for Dates
                  </span>
                </SelectItem>
                <SelectItem value="available_now">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Fully Available
                  </span>
                </SelectItem>
                <SelectItem value="conflict">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-destructive"></span>
                    Fully Booked
                  </span>
                </SelectItem>
                <SelectItem value="upcoming">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Available (Adjusted Dates)
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
                <Badge variant="outline" className="text-destructive border-destructive">{conflictCount} fully booked</Badge>
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
                    className="w-40 cursor-pointer hover:bg-muted/50 select-none"
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
                {loading || checkingAvailability ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      {loading ? "Loading assets..." : "Checking asset-wise availability..."}
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
                    const info = getAvailInfo(asset.id);
                    const isConflict = info.status === 'conflict';
                    const isAdjusted = info.status === 'available_adjusted';

                    return (
                      <TableRow 
                        key={asset.id}
                        className={
                          isConflict 
                            ? "bg-destructive/5 dark:bg-destructive/10" 
                            : isAdjusted 
                              ? "bg-blue-50 dark:bg-blue-950/20" 
                              : ""
                        }
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedAssets.has(asset.id)}
                            onCheckedChange={() => toggleAssetSelection(asset.id)}
                            disabled={isConflict}
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
            <div className="text-sm text-muted-foreground space-y-1">
              <p>{selectedAssets.size} asset(s) selected</p>
              {[...selectedAssets].some(id => getAvailInfo(id).status === 'available_adjusted') && (
                <p className="text-blue-600 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Some assets will have adjusted booking start dates based on existing bookings
                </p>
              )}
            </div>
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
