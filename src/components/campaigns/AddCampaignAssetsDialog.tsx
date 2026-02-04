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
import { Plus, Search, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown, X } from "lucide-react";
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

interface ConflictInfo {
  campaign_id: string;
  campaign_name: string;
  client_name: string;
  start_date: string;
  end_date: string;
  status: string;
}

type SortField = 'media_asset_code' | 'location' | 'city' | 'area' | 'media_type' | 'card_rate' | 'status';
type SortDirection = 'asc' | 'desc' | null;

interface SortConfig {
  field: SortField | null;
  direction: SortDirection;
}

interface AddCampaignAssetsDialogProps {
  open: boolean;
  onClose: () => void;
  existingAssetIds: string[];
  onAddAssets: (assets: any[]) => void;
  /** Campaign ID to exclude from conflict check */
  campaignId?: string;
  /** Campaign start date for conflict checking */
  campaignStartDate?: Date | string;
  /** Campaign end date for conflict checking */
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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [companyPrefix, setCompanyPrefix] = useState<string | null>(null);
  const [assetConflicts, setAssetConflicts] = useState<Map<string, ConflictInfo[]>>(new Map());
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
      setAssetConflicts(new Map());
    }
  }, [open]);

  const formatDateForConflict = (date: Date | string | undefined): string | null => {
    if (!date) return null;
    if (typeof date === 'string') return date.split('T')[0];
    return format(date, 'yyyy-MM-dd');
  };

  const fetchAllAssets = async () => {
    setLoading(true);
    try {
      // Fetch ALL assets regardless of status for filtering
      const { data, error } = await supabase
        .from('media_assets')
        .select('*')
        .order('city', { ascending: true });

      if (error) throw error;

      // Filter out assets already in the campaign
      const filteredAssets = data?.filter(
        asset => !existingAssetIds.includes(asset.id)
      ) || [];

      setAssets(filteredAssets);

      // Check conflicts for all assets if we have campaign dates
      if (campaignStartDate && campaignEndDate && filteredAssets.length > 0) {
        await checkConflictsForAssets(filteredAssets);
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

  const checkConflictsForAssets = async (assetList: any[]) => {
    setCheckingConflicts(true);
    const conflictMap = new Map<string, ConflictInfo[]>();

    const startDate = formatDateForConflict(campaignStartDate);
    const endDate = formatDateForConflict(campaignEndDate);

    if (!startDate || !endDate) {
      setCheckingConflicts(false);
      return;
    }

    try {
      const batchSize = 10;
      for (let i = 0; i < assetList.length; i += batchSize) {
        const batch = assetList.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (asset) => {
          const { data, error } = await supabase.rpc('check_asset_conflict', {
            p_asset_id: asset.id,
            p_start_date: startDate,
            p_end_date: endDate,
            p_exclude_campaign_id: campaignId || null,
          });

          if (!error && data) {
            const result = data as unknown as { has_conflict: boolean; conflicting_campaigns: ConflictInfo[] };
            if (result.has_conflict && result.conflicting_campaigns?.length > 0) {
              conflictMap.set(asset.id, result.conflicting_campaigns);
            }
          }
        }));
      }

      setAssetConflicts(conflictMap);
    } catch (error) {
      console.error('Error checking conflicts:', error);
    } finally {
      setCheckingConflicts(false);
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

  const hasConflict = (assetId: string): boolean => {
    return assetConflicts.has(assetId);
  };

  const getConflicts = (assetId: string): ConflictInfo[] => {
    return assetConflicts.get(assetId) || [];
  };

  // Determine effective status for display and filtering
  const getEffectiveStatus = (asset: any): 'available' | 'booked' | 'conflict' => {
    if (hasConflict(asset.id)) return 'conflict';
    if (asset.status === 'Available') return 'available';
    return 'booked';
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

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(asset => {
        const effectiveStatus = getEffectiveStatus(asset);
        if (statusFilter === "available") return effectiveStatus === 'available';
        if (statusFilter === "booked") return effectiveStatus === 'booked' || effectiveStatus === 'conflict';
        return true;
      });
    }

    // Apply sorting
    if (sortConfig.field && sortConfig.direction) {
      filtered.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (sortConfig.field === 'status') {
          aValue = getEffectiveStatus(a);
          bValue = getEffectiveStatus(b);
        } else if (sortConfig.field === 'media_asset_code') {
          aValue = a.media_asset_code || a.id || '';
          bValue = b.media_asset_code || b.id || '';
        } else {
          aValue = a[sortConfig.field] ?? '';
          bValue = b[sortConfig.field] ?? '';
        }

        // Numeric comparison for card_rate
        if (sortConfig.field === 'card_rate') {
          aValue = Number(aValue) || 0;
          bValue = Number(bValue) || 0;
          return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
        }

        // String comparison
        const comparison = String(aValue).localeCompare(String(bValue));
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [assets, searchTerm, cityFilter, areaFilter, mediaTypeFilter, statusFilter, sortConfig, assetConflicts]);

  const handleSort = (field: SortField) => {
    setSortConfig(current => {
      if (current.field === field) {
        // Cycle: null -> asc -> desc -> null
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
    if (hasConflict(assetId)) {
      const conflicts = getConflicts(assetId);
      toast({
        title: "Asset has booking conflict",
        description: `This asset is already booked in: ${conflicts.map(c => c.campaign_name).join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    // Check if asset is not available
    const asset = assets.find(a => a.id === assetId);
    if (asset && asset.status !== 'Available') {
      toast({
        title: "Asset not available",
        description: `This asset is currently ${asset.status}`,
        variant: "destructive",
      });
      return;
    }

    const newSelected = new Set(selectedAssets);
    if (newSelected.has(assetId)) {
      newSelected.delete(assetId);
    } else {
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

  const conflictCount = Array.from(assetConflicts.keys()).length;
  const availableCount = filteredAndSortedAssets.filter(a => getEffectiveStatus(a) === 'available').length;
  const bookedCount = filteredAndSortedAssets.filter(a => getEffectiveStatus(a) !== 'available').length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Add Assets to Campaign
            {conflictCount > 0 && (
              <Badge variant="outline" className="text-amber-600 border-amber-500">
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Available ({assets.filter(a => getEffectiveStatus(a) === 'available').length})
                  </span>
                </SelectItem>
                <SelectItem value="booked">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Booked ({assets.filter(a => getEffectiveStatus(a) !== 'available').length})
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
              <Badge variant="outline" className="text-amber-600 border-amber-500">{bookedCount} booked</Badge>
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
                    className="w-24 cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center">
                      Status
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
                    const conflicts = getConflicts(asset.id);
                    const effectiveStatus = getEffectiveStatus(asset);
                    const isSelectable = effectiveStatus === 'available';

                    return (
                      <TableRow 
                        key={asset.id}
                        className={effectiveStatus !== 'available' ? "bg-amber-50/50 dark:bg-amber-950/20" : ""}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedAssets.has(asset.id)}
                            onCheckedChange={() => toggleAssetSelection(asset.id)}
                            disabled={!isSelectable}
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
                          {effectiveStatus === 'conflict' ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-amber-600 border-amber-500 cursor-help">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    Conflict
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <div className="text-sm">
                                    <p className="font-semibold mb-1">Booked in:</p>
                                    {conflicts.map((c, i) => (
                                      <div key={i} className="mb-1">
                                        <span className="font-medium">{c.campaign_name}</span>
                                        <br />
                                        <span className="text-xs text-muted-foreground">
                                          {c.start_date} to {c.end_date}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : effectiveStatus === 'booked' ? (
                            <Badge variant="outline" className="text-amber-600 border-amber-500">
                              {asset.status}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-green-600 border-green-500">
                              Available
                            </Badge>
                          )}
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
                  • {conflictCount} asset(s) unavailable due to conflicts
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
