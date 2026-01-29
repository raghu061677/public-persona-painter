import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Plus, Settings2, ArrowUpDown, ArrowUp, ArrowDown, Calendar as CalendarIcon, Clock, Info } from "lucide-react";
import { formatCurrency } from "@/utils/mediaAssets";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useColumnPrefs } from "@/hooks/use-column-prefs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, isAfter, isBefore } from "date-fns";
import { cn } from "@/lib/utils";

type SortDirection = 'asc' | 'desc' | null;
type SortableColumn = 'asset_id' | 'location' | 'area' | 'available_from';

interface SortConfig {
  column: SortableColumn | null;
  direction: SortDirection;
}

interface AssetBooking {
  asset_id: string;
  booked_to: string | null;
  campaign_name: string;
  client_name: string;
}

interface AssetSelectionTableProps {
  assets: any[];
  selectedIds: Set<string>;
  onSelect: (assetId: string, asset: any) => void;
  onMultiSelect?: (assetIds: string[], assets: any[]) => void;
  planStartDate?: Date;
  planEndDate?: Date;
}

const ALL_COLUMNS = [
  'asset_id',
  'location',
  'city',
  'area',
  'media_type',
  'dimensions',
  'card_rate',
  'base_rate',
  'printing_rate_default',
  'mounting_rate_default',
  'available_from',
] as const;

const DEFAULT_VISIBLE = [
  'asset_id',
  'location',
  'city',
  'area',
  'media_type',
  'card_rate',
  'available_from',
] as const;

const COLUMN_LABELS: Record<string, string> = {
  asset_id: 'Asset ID',
  location: 'Location',
  city: 'City',
  area: 'Area',
  media_type: 'Type',
  dimensions: 'Dimensions',
  card_rate: 'Card Rate',
  base_rate: 'Base Rate',
  printing_rate_default: 'Printing',
  mounting_rate_default: 'Mounting',
  available_from: 'Available From',
};

type AvailabilityFilter = 'available_now' | 'available_by_date' | 'all' | 'booked';

export function AssetSelectionTable({ 
  assets, 
  selectedIds, 
  onSelect, 
  onMultiSelect,
  planStartDate,
  planEndDate,
}: AssetSelectionTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [mediaTypeFilter, setMediaTypeFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>("available_now");
  const [availableFromDate, setAvailableFromDate] = useState<Date | undefined>(planStartDate);
  const [checkedAssets, setCheckedAssets] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: null, direction: null });
  const [assetBookings, setAssetBookings] = useState<Map<string, AssetBooking>>(new Map());
  const [loadingBookings, setLoadingBookings] = useState(false);
  
  const {
    isReady,
    visibleKeys,
    setVisibleKeys,
    reset,
  } = useColumnPrefs('asset-selection', ALL_COLUMNS as any, DEFAULT_VISIBLE as any);

  // Fetch active bookings for all assets
  useEffect(() => {
    fetchAssetBookings();
  }, []);

  // Update availableFromDate when plan dates change
  useEffect(() => {
    if (planStartDate && availabilityFilter === 'available_by_date') {
      setAvailableFromDate(planStartDate);
    }
  }, [planStartDate]);

  const fetchAssetBookings = async () => {
    setLoadingBookings(true);
    try {
      // Get all active campaign assets with their end dates
      const { data, error } = await supabase
        .from('campaign_assets')
        .select(`
          asset_id,
          booking_end_date,
          end_date,
          campaigns!inner(
            campaign_name,
            client_name,
            status,
            end_date
          )
        `)
        .in('campaigns.status', ['Draft', 'Upcoming', 'Running']);

      if (error) throw error;

      const bookingsMap = new Map<string, AssetBooking>();
      
      (data || []).forEach((item: any) => {
        const endDate = item.booking_end_date || item.end_date || item.campaigns?.end_date;
        const existing = bookingsMap.get(item.asset_id);
        
        // Keep the latest end date for each asset
        if (!existing || (endDate && new Date(endDate) > new Date(existing.booked_to || ''))) {
          bookingsMap.set(item.asset_id, {
            asset_id: item.asset_id,
            booked_to: endDate,
            campaign_name: item.campaigns?.campaign_name || 'Unknown',
            client_name: item.campaigns?.client_name || 'Unknown',
          });
        }
      });

      setAssetBookings(bookingsMap);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoadingBookings(false);
    }
  };

  const isColumnVisible = (key: string) => visibleKeys.includes(key);
  
  const toggleColumn = (key: string) => {
    if (visibleKeys.includes(key)) {
      setVisibleKeys(visibleKeys.filter(k => k !== key));
    } else {
      setVisibleKeys([...visibleKeys, key]);
    }
  };

  const cities = Array.from(new Set(assets.map(a => a.city))).sort();
  const mediaTypes = Array.from(new Set(assets.map(a => a.media_type))).sort();

  // Get availability info for an asset
  const getAssetAvailability = (asset: any): { available: boolean; availableFrom: Date | null; booking?: AssetBooking } => {
    const booking = assetBookings.get(asset.id);
    
    if (asset.status === 'Available' && !booking) {
      return { available: true, availableFrom: null };
    }
    
    if (booking?.booked_to) {
      const bookedTo = new Date(booking.booked_to);
      const availableFrom = addDays(bookedTo, 1);
      return { available: false, availableFrom, booking };
    }
    
    // Asset is booked but no end date - not available
    if (asset.status === 'Booked' || booking) {
      return { available: false, availableFrom: null, booking };
    }
    
    return { available: true, availableFrom: null };
  };

  // Calculate asset counts by category
  const assetCounts = useMemo(() => {
    let availableNow = 0;
    let booked = 0;
    let availableByDate = 0;

    assets.forEach(asset => {
      const availability = getAssetAvailability(asset);
      if (availability.available) {
        availableNow++;
      } else {
        booked++;
        // Check if will be available by selected date
        if (availableFromDate && availability.availableFrom) {
          if (isBefore(availability.availableFrom, availableFromDate) || 
              format(availability.availableFrom, 'yyyy-MM-dd') === format(availableFromDate, 'yyyy-MM-dd')) {
            availableByDate++;
          }
        }
      }
    });

    return {
      availableNow,
      booked,
      availableByDate: availableNow + availableByDate, // Total available by date = currently available + becoming available
      total: assets.length,
    };
  }, [assets, assetBookings, availableFromDate]);

  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const matchesSearch = !searchTerm || 
        asset.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.media_asset_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.area?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCity = cityFilter === "all" || asset.city === cityFilter;
      const matchesType = mediaTypeFilter === "all" || asset.media_type === mediaTypeFilter;
      
      // Availability filter logic
      const availability = getAssetAvailability(asset);
      let matchesAvailability = true;
      
      if (availabilityFilter === 'available_now') {
        matchesAvailability = availability.available;
      } else if (availabilityFilter === 'available_by_date' && availableFromDate) {
        // Asset is available if: currently available OR will become available before the target date
        if (availability.available) {
          matchesAvailability = true;
        } else if (availability.availableFrom) {
          matchesAvailability = isBefore(availability.availableFrom, availableFromDate) || 
                               format(availability.availableFrom, 'yyyy-MM-dd') === format(availableFromDate, 'yyyy-MM-dd');
        } else {
          matchesAvailability = false;
        }
      } else if (availabilityFilter === 'booked') {
        matchesAvailability = !availability.available;
      }
      // 'all' shows everything
      
      return matchesSearch && matchesCity && matchesType && matchesAvailability;
    });
  }, [assets, searchTerm, cityFilter, mediaTypeFilter, availabilityFilter, availableFromDate, assetBookings]);

  // Get current count to display based on filter
  const getCurrentFilterCount = () => {
    switch (availabilityFilter) {
      case 'available_now':
        return { count: assetCounts.availableNow, label: 'Available Now', color: 'bg-green-500' };
      case 'available_by_date':
        return { 
          count: assetCounts.availableByDate, 
          label: availableFromDate ? `Available by ${format(availableFromDate, 'MMM dd')}` : 'Available By Date',
          color: 'bg-blue-500'
        };
      case 'booked':
        return { count: assetCounts.booked, label: 'Currently Booked', color: 'bg-amber-500' };
      case 'all':
        return { count: assetCounts.total, label: 'All Assets', color: 'bg-slate-500' };
      default:
        return { count: assetCounts.total, label: 'Assets', color: 'bg-slate-500' };
    }
  };

  const sortedAssets = useMemo(() => {
    if (!sortConfig.column || !sortConfig.direction) {
      return filteredAssets;
    }

    return [...filteredAssets].sort((a, b) => {
      let aValue: string;
      let bValue: string;

      switch (sortConfig.column) {
        case 'asset_id':
          aValue = (a.media_asset_code || a.id || '').toLowerCase();
          bValue = (b.media_asset_code || b.id || '').toLowerCase();
          break;
        case 'location':
          aValue = (a.location || '').toLowerCase();
          bValue = (b.location || '').toLowerCase();
          break;
        case 'area':
          aValue = (a.area || '').toLowerCase();
          bValue = (b.area || '').toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredAssets, sortConfig]);

  const handleSort = (column: SortableColumn) => {
    setSortConfig(prev => {
      if (prev.column !== column) {
        return { column, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { column, direction: 'desc' };
      }
      if (prev.direction === 'desc') {
        return { column: null, direction: null };
      }
      return { column, direction: 'asc' };
    });
  };

  const getSortIcon = (column: SortableColumn) => {
    if (sortConfig.column !== column) {
      return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground" />;
    }
    if (sortConfig.direction === 'asc') {
      return <ArrowUp className="ml-1 h-3 w-3 text-primary" />;
    }
    return <ArrowDown className="ml-1 h-3 w-3 text-primary" />;
  };

  const isSortableColumn = (key: string): key is SortableColumn => {
    return ['asset_id', 'location', 'area'].includes(key);
  };

  const handleCheckAsset = (assetId: string) => {
    const newChecked = new Set(checkedAssets);
    if (newChecked.has(assetId)) {
      newChecked.delete(assetId);
    } else {
      newChecked.add(assetId);
    }
    setCheckedAssets(newChecked);
  };

  const handleSelectAll = () => {
    if (checkedAssets.size === sortedAssets.length) {
      setCheckedAssets(new Set());
    } else {
      setCheckedAssets(new Set(sortedAssets.map(a => a.id)));
    }
  };

  const handleAddSelected = () => {
    if (checkedAssets.size === 0) return;
    const assetsToAdd = sortedAssets.filter(a => checkedAssets.has(a.id) && !selectedIds.has(a.id));
    if (onMultiSelect) {
      onMultiSelect(assetsToAdd.map(a => a.id), assetsToAdd);
    }
    setCheckedAssets(new Set());
  };

  if (!isReady) {
    return <div>Loading...</div>;
  }

  const filterInfo = getCurrentFilterCount();

  return (
    <div className="space-y-4">
      {/* Asset Count Banner */}
      <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3">
        <div className="flex items-center gap-3">
          <div className={cn("w-3 h-3 rounded-full", filterInfo.color)} />
          <span className="text-sm font-medium">{filterInfo.label}</span>
          <Badge variant="secondary" className="text-lg font-bold px-3">
            {filterInfo.count}
          </Badge>
          {loadingBookings && (
            <span className="text-xs text-muted-foreground">(Loading bookings...)</span>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            {assetCounts.availableNow} available now
          </span>
          <span className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            {assetCounts.booked} booked
          </span>
          <span className="text-muted-foreground/60">
            {assetCounts.total} total
          </span>
        </div>
      </div>

      {/* Search and Filters Row */}
      <div className="flex flex-col gap-4">
        {/* Large Search Input */}
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search by Asset ID, location, area..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12 text-base w-full"
          />
        </div>
        
        {/* Filters Row */}
        <div className="flex flex-wrap gap-3">
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by city" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {cities.map(city => (
                <SelectItem key={city} value={city}>{city}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={mediaTypeFilter} onValueChange={setMediaTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {mediaTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Availability Filter */}
          <Select value={availabilityFilter} onValueChange={(v) => setAvailabilityFilter(v as AvailabilityFilter)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by availability" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="available_now">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  Available Now
                </div>
              </SelectItem>
              <SelectItem value="available_by_date">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-3 w-3" />
                  Available By Date...
                </div>
              </SelectItem>
              <SelectItem value="booked">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  Currently Booked
                </div>
              </SelectItem>
              <SelectItem value="all">All Assets</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Date Picker for "Available By Date" */}
          {availabilityFilter === 'available_by_date' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[200px] justify-start text-left font-normal",
                    !availableFromDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {availableFromDate ? format(availableFromDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={availableFromDate}
                  onSelect={setAvailableFromDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                  disabled={(date) => isBefore(date, new Date())}
                />
              </PopoverContent>
            </Popover>
          )}
          
          {/* Quick date presets */}
          {availabilityFilter === 'available_by_date' && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAvailableFromDate(addDays(new Date(), 7))}
                className="text-xs"
              >
                +7 days
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAvailableFromDate(addDays(new Date(), 15))}
                className="text-xs"
              >
                +15 days
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAvailableFromDate(addDays(new Date(), 30))}
                className="text-xs"
              >
                +30 days
              </Button>
            </div>
          )}
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings2 className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Show Columns</h4>
                  <Button variant="ghost" size="sm" onClick={reset}>
                    Reset
                  </Button>
                </div>
                <div className="space-y-2">
                  {ALL_COLUMNS.map((col) => (
                    <div key={col} className="flex items-center space-x-2">
                      <Checkbox
                        id={col}
                        checked={isColumnVisible(col)}
                        onCheckedChange={() => toggleColumn(col)}
                      />
                      <label
                        htmlFor={col}
                        className="text-sm cursor-pointer"
                      >
                        {COLUMN_LABELS[col]}
                      </label>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground border-t pt-2">
                  {visibleKeys.length} of {ALL_COLUMNS.length} columns visible
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {checkedAssets.size > 0 && (
        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
            {checkedAssets.size} asset{checkedAssets.size > 1 ? 's' : ''} selected
          </span>
          <Button
            size="sm"
            onClick={handleAddSelected}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Selected to Plan
          </Button>
        </div>
      )}

      <div className="border rounded-lg max-h-96 overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={sortedAssets.length > 0 && checkedAssets.size === sortedAssets.length}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              {visibleKeys.map((key) => (
                <TableHead 
                  key={key} 
                  className={`${key === 'asset_id' ? '' : key.includes('rate') || key.includes('charges') || key.includes('rent') ? 'text-right' : ''} ${isSortableColumn(key) ? 'cursor-pointer select-none hover:bg-muted/50' : ''}`}
                  onClick={() => isSortableColumn(key) && handleSort(key)}
                >
                  <div className={`flex items-center ${key.includes('rate') || key.includes('charges') || key.includes('rent') ? 'justify-end' : ''}`}>
                    {COLUMN_LABELS[key]}
                    {isSortableColumn(key) && getSortIcon(key)}
                  </div>
                </TableHead>
              ))}
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAssets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleKeys.length + 2} className="text-center py-8 text-muted-foreground">
                  No assets found
                </TableCell>
              </TableRow>
            ) : (
              sortedAssets.map((asset) => (
                <TableRow key={asset.id} className={selectedIds.has(asset.id) ? 'bg-muted/50' : ''}>
                  <TableCell>
                    <Checkbox
                      checked={checkedAssets.has(asset.id)}
                      onCheckedChange={() => handleCheckAsset(asset.id)}
                      disabled={selectedIds.has(asset.id)}
                      aria-label={`Select ${asset.id}`}
                    />
                  </TableCell>
                  {visibleKeys.map((key) => {
                    if (key === 'asset_id') {
                      return <TableCell key={key} className="font-medium font-mono text-sm">{asset.media_asset_code || asset.id}</TableCell>;
                    }
                    if (key === 'card_rate' || key === 'base_rate' || key === 'printing_rate_default' || key === 'mounting_rate_default') {
                      return <TableCell key={key} className="text-right">{formatCurrency(asset[key] || 0)}</TableCell>;
                    }
                    if (key === 'available_from') {
                      const availability = getAssetAvailability(asset);
                      return (
                        <TableCell key={key}>
                          {availability.available ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800">
                              Available Now
                            </Badge>
                          ) : availability.availableFrom ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800 cursor-help">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {format(availability.availableFrom, "dd MMM yyyy")}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-sm">
                                    Currently booked for: <strong>{availability.booking?.campaign_name}</strong>
                                    <br />
                                    Client: {availability.booking?.client_name}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800">
                              Booked
                            </Badge>
                          )}
                        </TableCell>
                      );
                    }
                    return <TableCell key={key}>{asset[key] || '-'}</TableCell>;
                  })}
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant={selectedIds.has(asset.id) ? "secondary" : "outline"}
                      onClick={() => onSelect(asset.id, asset)}
                      disabled={selectedIds.has(asset.id)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-sm text-muted-foreground">
        Showing {sortedAssets.length} of {assets.length} available assets
      </p>
    </div>
  );
}
