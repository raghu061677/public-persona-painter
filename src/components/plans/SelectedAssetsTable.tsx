import { useState, useMemo, useCallback } from "react";
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
import { Trash2, Sparkles, Loader2, Settings2, History, ArrowUpDown, ArrowUp, ArrowDown, AlertCircle, CalendarDays, Printer, Hammer, ChevronDown } from "lucide-react";
import { formatCurrency } from "@/utils/mediaAssets";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { calcProRata, calcDiscount, calcProfit } from "@/utils/pricing";
import { PricingHistoryDialog } from "./PricingHistoryDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { useColumnPrefs } from "@/hooks/use-column-prefs";
import { calculatePrintingCost, calculateMountingCost, getAssetSqft } from "@/utils/effectivePricing";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  computeBookedDays,
  computeRentAmount,
  BillingMode,
  BILLING_CYCLE_DAYS,
} from "@/utils/perAssetPricing";
import { BulkPrintingDialog } from "./BulkPrintingDialog";
import { BulkMountingDialog } from "./BulkMountingDialog";

type SortDirection = 'asc' | 'desc' | null;
type SortableColumn = 'asset_id' | 'location' | 'area';

interface SortConfig {
  column: SortableColumn | null;
  direction: SortDirection;
}

interface SelectedAssetsTableProps {
  assets: any[];
  assetPricing: Record<string, any>;
  onRemove: (assetId: string) => void;
  onPricingUpdate: (assetId: string, field: string, value: any) => void;
  durationDays?: number;
  planStartDate?: Date;
  planEndDate?: Date;
}

const ALL_COLUMNS = [
  'asset_id',
  'area',
  'location',
  'direction',
  'dimensions',
  'total_sqft',
  'illumination',
  'asset_dates',
  'days',
  'billing_mode',
  'card_rate',
  'base_rate',
  'negotiated_price',
  'rent_amount',
  'discount',
  'profit',
  'printing',
  'mounting',
  'total',
];

const DEFAULT_VISIBLE = [
  'asset_id',
  'area',
  'location',
  'asset_dates',
  'days',
  'card_rate',
  'negotiated_price',
  'rent_amount',
  'discount',
  'profit',
  'printing',
  'mounting',
  'total',
];

const COLUMN_LABELS: Record<string, string> = {
  asset_id: 'Asset ID',
  area: 'Area',
  location: 'Location',
  direction: 'Direction',
  dimensions: 'Dimensions',
  total_sqft: 'Total Sq.Ft',
  illumination: 'Illumination',
  asset_dates: 'Asset Dates',
  days: 'Days',
  billing_mode: 'Billing Mode',
  card_rate: 'Card Rate (₹/Mo)',
  base_rate: 'Base Rate (₹/Mo)',
  negotiated_price: 'Negotiated (₹/Mo)',
  rent_amount: 'Rent Amount (₹)',
  discount: 'Discount',
  profit: 'Profit',
  printing: 'Printing (Rate/Cost)',
  mounting: 'Mounting (Rate/Cost)',
  total: 'Total (₹)',
};

export function SelectedAssetsTable({
  assets,
  assetPricing,
  onRemove,
  onPricingUpdate,
  durationDays = 30,
  planStartDate,
  planEndDate,
}: SelectedAssetsTableProps) {
  const [loadingRates, setLoadingRates] = useState<Set<string>>(new Set());
  const [showBulkSettingsDialog, setShowBulkSettingsDialog] = useState(false);
  const [gettingSuggestion, setGettingSuggestion] = useState<string | null>(null);
  const [pricingHistoryAsset, setPricingHistoryAsset] = useState<{
    id: string;
    location: string;
    cardRate: number;
  } | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: null, direction: null });
  
  // Bulk selection state
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [showBulkPrintingDialog, setShowBulkPrintingDialog] = useState(false);
  const [showBulkMountingDialog, setShowBulkMountingDialog] = useState(false);
  
  const { visibleKeys, setVisibleKeys } = useColumnPrefs(
    'plan-assets',
    ALL_COLUMNS,
    DEFAULT_VISIBLE
  );

  const isColumnVisible = (col: string) => visibleKeys.includes(col);

  const toggleColumn = (col: string) => {
    if (visibleKeys.includes(col)) {
      setVisibleKeys(visibleKeys.filter(k => k !== col));
    } else {
      setVisibleKeys([...visibleKeys, col]);
    }
  };

  const sortedAssets = useMemo(() => {
    if (!sortConfig.column || !sortConfig.direction) {
      return assets;
    }

    return [...assets].sort((a, b) => {
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
  }, [assets, sortConfig]);

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

  // Selection handlers
  const isAllSelected = useMemo(() => {
    return sortedAssets.length > 0 && sortedAssets.every((a) => selectedAssetIds.has(a.id));
  }, [sortedAssets, selectedAssetIds]);

  const isSomeSelected = useMemo(() => {
    return sortedAssets.some((a) => selectedAssetIds.has(a.id)) && !isAllSelected;
  }, [sortedAssets, selectedAssetIds, isAllSelected]);

  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedAssetIds(new Set());
    } else {
      setSelectedAssetIds(new Set(sortedAssets.map((a) => a.id)));
    }
  }, [isAllSelected, sortedAssets]);

  const toggleSelectAsset = useCallback((assetId: string) => {
    setSelectedAssetIds((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }
      return next;
    });
  }, []);

  // Bulk update handler - applies multiple field updates at once
  const handleBulkUpdate = useCallback(
    (updates: Array<{ assetId: string; field: string; value: any }>) => {
      updates.forEach(({ assetId, field, value }) => {
        onPricingUpdate(assetId, field, value);
      });
    },
    [onPricingUpdate]
  );

  const getSuggestion = async (assetId: string, asset: any) => {
    setLoadingRates(prev => new Set(prev).add(assetId));
    
    try {
      const { data, error } = await supabase.functions.invoke('rate-suggester', {
        body: {
          assetId,
          location: asset.location,
          mediaType: asset.media_type,
          city: asset.city,
          area: asset.area,
        },
      });

      if (error) throw error;

      toast({
        title: "AI Rate Suggestion",
        description: (
          <div className="space-y-2">
            <p className="font-medium">
              Range: ₹{data.stats.minPrice.toFixed(0)} - ₹{data.stats.maxPrice.toFixed(0)}
            </p>
            <p className="text-sm">{data.suggestion}</p>
            <p className="text-xs text-muted-foreground">
              Based on {data.stats.sampleCount} similar bookings
            </p>
          </div>
        ),
        duration: 8000,
      });

      // Optionally auto-fill with average price
      if (data.stats.avgPrice > 0) {
        onPricingUpdate(assetId, 'sales_price', Math.round(data.stats.avgPrice));
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to get rate suggestion",
        variant: "destructive",
      });
    } finally {
      setLoadingRates(prev => {
        const next = new Set(prev);
        next.delete(assetId);
        return next;
      });
    }
  };

  return (
    <div className="space-y-2">
      {/* Toolbar with Bulk Actions and View Options */}
      <div className="flex items-center justify-between gap-2">
        {/* Selection info - Left side */}
        <div className="flex items-center gap-2">
          {selectedAssetIds.size > 0 && (
            <>
              <Badge variant="secondary" className="text-xs">
                {selectedAssetIds.size} selected
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedAssetIds(new Set())}
                className="text-muted-foreground"
              >
                Clear Selection
              </Button>
            </>
          )}
        </div>

        {/* Bulk Update + View Options - Right side */}
        <div className="flex items-center gap-2">
          {/* Bulk Update Dropdown */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={selectedAssetIds.size === 0}
                      >
                        Bulk Update
                        <ChevronDown className="h-4 w-4 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {/* Apply Plan Dates to All */}
                      {planStartDate && planEndDate && (
                        <DropdownMenuItem 
                          onClick={() => {
                            const updates: Array<{ assetId: string; field: string; value: any }> = [];
                            const startDateStr = planStartDate.toISOString().split('T')[0];
                            const endDateStr = planEndDate.toISOString().split('T')[0];
                            const days = Math.max(1, Math.ceil((planEndDate.getTime() - planStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
                            
                            selectedAssetIds.forEach(assetId => {
                              updates.push({ assetId, field: 'start_date', value: startDateStr });
                              updates.push({ assetId, field: 'end_date', value: endDateStr });
                              updates.push({ assetId, field: 'booked_days', value: days });
                            });
                            handleBulkUpdate(updates);
                            toast({
                              title: "Dates Applied",
                              description: `Plan dates applied to ${selectedAssetIds.size} asset(s)`,
                            });
                          }}
                        >
                          <CalendarDays className="h-4 w-4 mr-2" />
                          Apply Plan Dates
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => setShowBulkPrintingDialog(true)}>
                        <Printer className="h-4 w-4 mr-2" />
                        Bulk Printing
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowBulkMountingDialog(true)}>
                        <Hammer className="h-4 w-4 mr-2" />
                        Bulk Mounting
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </span>
              </TooltipTrigger>
              {selectedAssetIds.size === 0 && (
                <TooltipContent>
                  <p>Select at least one asset to bulk update.</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          {/* View Options */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="h-4 w-4 mr-2" />
                View Options
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-2">
                <h4 className="font-medium text-sm mb-3">Select columns to display:</h4>
                <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                  {ALL_COLUMNS.map((col) => (
                    <div key={col} className="flex items-center space-x-2">
                      <Checkbox
                        id={col}
                        checked={isColumnVisible(col)}
                        onCheckedChange={() => toggleColumn(col)}
                      />
                      <label
                        htmlFor={col}
                        className="text-sm cursor-pointer select-none"
                      >
                        {COLUMN_LABELS[col]}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {/* Selection checkbox header */}
              <TableHead className="w-10">
                <Checkbox
                  checked={isAllSelected}
                  // @ts-ignore
                  indeterminate={isSomeSelected}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all assets"
                />
              </TableHead>
              {isColumnVisible('asset_id') && (
                <TableHead 
                  className="cursor-pointer select-none hover:bg-muted/50"
                  onClick={() => handleSort('asset_id')}
                >
                  <div className="flex items-center">
                    Asset ID
                    {getSortIcon('asset_id')}
                  </div>
                </TableHead>
              )}
              {isColumnVisible('area') && (
                <TableHead 
                  className="cursor-pointer select-none hover:bg-muted/50"
                  onClick={() => handleSort('area')}
                >
                  <div className="flex items-center">
                    Area
                    {getSortIcon('area')}
                  </div>
                </TableHead>
              )}
              {isColumnVisible('location') && (
                <TableHead 
                  className="cursor-pointer select-none hover:bg-muted/50"
                  onClick={() => handleSort('location')}
                >
                  <div className="flex items-center">
                    Location
                    {getSortIcon('location')}
                  </div>
                </TableHead>
              )}
              {isColumnVisible('direction') && <TableHead>Direction</TableHead>}
              {isColumnVisible('dimensions') && <TableHead>Dimensions</TableHead>}
              {isColumnVisible('total_sqft') && <TableHead>Sq.Ft</TableHead>}
              {isColumnVisible('illumination') && <TableHead>Illumination</TableHead>}
              {isColumnVisible('asset_dates') && <TableHead className="w-56">Asset Dates</TableHead>}
              {isColumnVisible('days') && <TableHead className="w-20">Days</TableHead>}
              {isColumnVisible('billing_mode') && <TableHead className="w-36">Billing Mode</TableHead>}
              {isColumnVisible('card_rate') && <TableHead>Card Rate</TableHead>}
              {isColumnVisible('base_rate') && <TableHead>Base Rate</TableHead>}
              {isColumnVisible('negotiated_price') && <TableHead className="w-48">Negotiated (₹/Mo)</TableHead>}
              {isColumnVisible('rent_amount') && <TableHead>Rent Amount</TableHead>}
              {isColumnVisible('discount') && <TableHead>Discount</TableHead>}
              {isColumnVisible('profit') && <TableHead>Profit</TableHead>}
              {isColumnVisible('printing') && <TableHead className="w-48">Printing</TableHead>}
              {isColumnVisible('mounting') && <TableHead className="w-48">Mounting</TableHead>}
              {isColumnVisible('total') && <TableHead className="text-right">Total</TableHead>}
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAssets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={22} className="text-center py-8 text-muted-foreground">
                  No assets selected. Add assets from the table below.
                </TableCell>
              </TableRow>
            ) : (
              sortedAssets.map((asset) => {
                const pricing = assetPricing[asset.id] || {};
                
                // Get rates from asset
                const cardRate = asset.card_rate || 0;
                const baseRate = asset.base_rate || 0;
                const negotiatedPrice = pricing.negotiated_price || cardRate;
                
                // Per-asset dates (default to plan dates if not set)
                const assetStartDate = pricing.start_date 
                  ? new Date(pricing.start_date) 
                  : (planStartDate || new Date());
                const assetEndDate = pricing.end_date 
                  ? new Date(pricing.end_date) 
                  : (planEndDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
                
                // Per-asset billing mode
                const billingMode: BillingMode = pricing.billing_mode || 'PRORATA_30';
                
                // Calculate booked days and rent using per-asset pricing
                const rentResult = computeRentAmount(
                  negotiatedPrice,
                  assetStartDate,
                  assetEndDate,
                  billingMode
                );
                const assetBookedDays = rentResult.booked_days;
                const rentAmount = rentResult.rent_amount;
                
                // Calculate discount and profit (based on monthly rates, not pro-rated)
                const discount = calcDiscount(cardRate, negotiatedPrice);
                const profit = calcProfit(baseRate, negotiatedPrice);
                
                // Calculate printing and mounting using SQFT × Rate formula or Fixed
                const printingRate = pricing.printing_rate || 0;
                const mountingRate = pricing.mounting_rate || 0;
                const mountingMode = pricing.mounting_mode || 'sqft';
                const assetSqft = getAssetSqft(asset);
                
                const printingResult = calculatePrintingCost(asset, printingRate);
                const mountingResult = calculateMountingCost(asset, mountingRate);
                
                // Get the calculated costs - respect mounting mode
                const printing = printingResult.cost;
                const mounting = mountingMode === 'fixed' ? mountingRate : mountingResult.cost;
                
                // P0 FIX: Row Total = Negotiated + Printing + Mounting (NO proration, NO GST)
                // This is the display total for the plan row, not the pro-rated rent amount
                const rowTotal = negotiatedPrice + printing + mounting;

                const formatNumberWithCommas = (num: number) => {
                  return num.toLocaleString('en-IN');
                };

                const parseFormattedNumber = (str: string) => {
                  return parseFloat(str.replace(/,/g, '')) || 0;
                };

                const handleNegotiatedChange = (value: string) => {
                  const numValue = parseFormattedNumber(value);
                  
                  // Update negotiated price and recalculate all dependent values
                  onPricingUpdate(asset.id, 'negotiated_price', numValue);
                  
                  // Recalculate rent, discount, and profit
                  const newRentResult = computeRentAmount(numValue, assetStartDate, assetEndDate, billingMode);
                  const newDiscount = calcDiscount(cardRate, numValue);
                  const newProfit = calcProfit(baseRate, numValue);
                  
                  onPricingUpdate(asset.id, 'rent_amount', newRentResult.rent_amount);
                  onPricingUpdate(asset.id, 'daily_rate', newRentResult.daily_rate);
                  onPricingUpdate(asset.id, 'booked_days', newRentResult.booked_days);
                  onPricingUpdate(asset.id, 'discount_value', newDiscount.value);
                  onPricingUpdate(asset.id, 'discount_percent', newDiscount.percent);
                  onPricingUpdate(asset.id, 'profit_value', newProfit.value);
                  onPricingUpdate(asset.id, 'profit_percent', newProfit.percent);
                };

                const handleNegotiatedBlur = (value: string) => {
                  const numValue = parseFormattedNumber(value);
                  
                  // Only warn if below base rate (below cost) when user finishes typing
                  if (numValue > 0 && numValue < baseRate) {
                    toast({
                      title: "Warning",
                      description: "Price is below base rate (below cost). This will result in a loss.",
                      variant: "destructive",
                    });
                  }
                };

                const handleAssetDateChange = (field: 'start_date' | 'end_date', date: Date | undefined) => {
                  if (!date) return;
                  
                  onPricingUpdate(asset.id, field, date.toISOString().split('T')[0]);
                  
                  // Recalculate rent based on new dates
                  const newStart = field === 'start_date' ? date : assetStartDate;
                  const newEnd = field === 'end_date' ? date : assetEndDate;
                  const newRentResult = computeRentAmount(negotiatedPrice, newStart, newEnd, billingMode);
                  
                  onPricingUpdate(asset.id, 'rent_amount', newRentResult.rent_amount);
                  onPricingUpdate(asset.id, 'daily_rate', newRentResult.daily_rate);
                  onPricingUpdate(asset.id, 'booked_days', newRentResult.booked_days);
                };

                // Handler for changing Days directly - updates end_date based on start_date + days
                const handleDaysChange = (newDays: number) => {
                  if (!pricing.start_date && !planStartDate) {
                    toast({
                      title: "Set Start Date First",
                      description: "Please set a start date before modifying days.",
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  // Clamp days to valid range
                  const clampedDays = Math.max(1, Math.min(365, newDays));
                  
                  // Calculate new end date = start_date + (days - 1)
                  const startDate = assetStartDate;
                  const newEndDate = new Date(startDate);
                  newEndDate.setDate(newEndDate.getDate() + clampedDays - 1);
                  
                  // Update end_date and booked_days
                  onPricingUpdate(asset.id, 'end_date', newEndDate.toISOString().split('T')[0]);
                  onPricingUpdate(asset.id, 'booked_days', clampedDays);
                  
                  // Recalculate rent with new duration
                  const newRentResult = computeRentAmount(negotiatedPrice, startDate, newEndDate, billingMode);
                  onPricingUpdate(asset.id, 'rent_amount', newRentResult.rent_amount);
                  onPricingUpdate(asset.id, 'daily_rate', newRentResult.daily_rate);
                };

                const handleBillingModeChange = (mode: BillingMode) => {
                  onPricingUpdate(asset.id, 'billing_mode', mode);
                  
                  // Recalculate rent with new mode
                  const newRentResult = computeRentAmount(negotiatedPrice, assetStartDate, assetEndDate, mode);
                  onPricingUpdate(asset.id, 'rent_amount', newRentResult.rent_amount);
                  onPricingUpdate(asset.id, 'daily_rate', newRentResult.daily_rate);
                };

                return (
                  <TableRow key={asset.id} className={selectedAssetIds.has(asset.id) ? 'bg-primary/5' : ''}>
                    {/* Row selection checkbox */}
                    <TableCell>
                      <Checkbox
                        checked={selectedAssetIds.has(asset.id)}
                        onCheckedChange={() => toggleSelectAsset(asset.id)}
                        aria-label={`Select ${asset.media_asset_code || asset.id}`}
                      />
                    </TableCell>
                    {isColumnVisible('asset_id') && (
                      <TableCell className="font-medium font-mono text-sm">{asset.media_asset_code || asset.id}</TableCell>
                    )}
                    {isColumnVisible('area') && (
                      <TableCell className="text-sm">{asset.area}</TableCell>
                    )}
                    {isColumnVisible('location') && (
                      <TableCell className="text-sm">{asset.location}</TableCell>
                    )}
                    {isColumnVisible('direction') && (
                      <TableCell className="text-sm">{asset.direction || '-'}</TableCell>
                    )}
                    {isColumnVisible('dimensions') && (
                      <TableCell className="text-sm">
                        {asset.dimensions || '-'}
                      </TableCell>
                    )}
                    {isColumnVisible('total_sqft') && (
                      <TableCell className="text-sm">{asset.total_sqft || '-'}</TableCell>
                    )}
                    {isColumnVisible('illumination') && (
                      <TableCell className="text-sm">{asset.illumination_type || '-'}</TableCell>
                    )}
                    {/* Per-Asset Dates Column */}
                    {isColumnVisible('asset_dates') && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Popover modal={true}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                  "h-8 w-24 text-xs justify-start text-left font-normal",
                                  !pricing.start_date && "text-muted-foreground"
                                )}
                              >
                                {format(assetStartDate, "dd/MM/yy")}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 pointer-events-auto" align="start" side="bottom" sideOffset={4}>
                              <Calendar
                                mode="single"
                                selected={assetStartDate}
                                onSelect={(date) => handleAssetDateChange('start_date', date)}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <span className="text-muted-foreground text-xs">-</span>
                          <Popover modal={true}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                  "h-8 w-24 text-xs justify-start text-left font-normal",
                                  !pricing.end_date && "text-muted-foreground"
                                )}
                              >
                                {format(assetEndDate, "dd/MM/yy")}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 pointer-events-auto" align="start" side="bottom" sideOffset={4}>
                              <Calendar
                                mode="single"
                                selected={assetEndDate}
                                onSelect={(date) => handleAssetDateChange('end_date', date)}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </TableCell>
                    )}
                    {/* Days Column - Editable */}
                    {isColumnVisible('days') && (
                      <TableCell className="text-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Input
                                type="number"
                                min={1}
                                max={365}
                                value={assetBookedDays}
                                onChange={(e) => {
                                  const newDays = parseInt(e.target.value) || 1;
                                  handleDaysChange(newDays);
                                }}
                                className="h-8 w-16 text-center text-sm font-mono"
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Edit days to auto-update End Date</p>
                              <p className="text-xs text-muted-foreground">
                                Pro-rata factor: {(assetBookedDays / BILLING_CYCLE_DAYS).toFixed(2)}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    )}
                    {/* Billing Mode Column */}
                    {isColumnVisible('billing_mode') && (
                      <TableCell>
                        <Select
                          value={billingMode}
                          onValueChange={(val) => handleBillingModeChange(val as BillingMode)}
                        >
                          <SelectTrigger className="h-8 w-32 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PRORATA_30">Pro-rata (30d)</SelectItem>
                            <SelectItem value="FULL_MONTH">Full Month</SelectItem>
                            <SelectItem value="DAILY">Daily</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    )}
                    {isColumnVisible('card_rate') && (
                      <TableCell className="text-right bg-muted/30">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help">{formatCurrency(cardRate)}</span>
                            </TooltipTrigger>
                            <TooltipContent>Market rate per month</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    )}
                    {isColumnVisible('base_rate') && (
                      <TableCell className="text-right bg-muted/30">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help">{formatCurrency(baseRate)}</span>
                            </TooltipTrigger>
                            <TooltipContent>Internal cost per month</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    )}
                    {isColumnVisible('negotiated_price') && (
                      <TableCell>
                        <div className="flex gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Input
                                  type="text"
                                  value={formatNumberWithCommas(negotiatedPrice)}
                                  onChange={(e) => handleNegotiatedChange(e.target.value)}
                                  onBlur={(e) => handleNegotiatedBlur(e.target.value)}
                                  className="h-10 w-40 text-base"
                                  placeholder={formatNumberWithCommas(cardRate)}
                                />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">Client agreed price per month</p>
                                <p className="text-xs text-muted-foreground">Can be any price (above or below Card Rate)</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-9 w-9 shrink-0"
                                  onClick={() => setPricingHistoryAsset({
                                    id: asset.id,
                                    location: asset.location,
                                    cardRate: cardRate,
                                  })}
                                >
                                  <History className="h-4 w-4 text-blue-600" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View pricing history</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-9 w-9 shrink-0"
                                  onClick={() => getSuggestion(asset.id, asset)}
                                  disabled={loadingRates.has(asset.id)}
                                >
                                  {loadingRates.has(asset.id) ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Sparkles className="h-4 w-4 text-primary" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Get AI rate suggestion</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    )}
                    {isColumnVisible('rent_amount') && (
                      <TableCell className="text-right bg-muted/30">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help font-medium">{formatCurrency(rentAmount)}</span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs font-semibold">Rent = Negotiated ÷ 30 × {assetBookedDays} Days</p>
                              <p className="text-xs">₹{negotiatedPrice.toFixed(0)} ÷ 30 × {assetBookedDays} days</p>
                              <p className="text-xs">= ₹{rentAmount.toFixed(2)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    )}
                    {isColumnVisible('discount') && (
                      <TableCell className="text-right bg-muted/30">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="cursor-help">
                                <div className="text-blue-600 dark:text-blue-400 font-medium">
                                  {formatCurrency(discount.value)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {discount.percent.toFixed(1)}%
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs font-semibold">Discount = Card Rate − Negotiated</p>
                              <p className="text-xs">₹{cardRate.toFixed(0)} − ₹{negotiatedPrice.toFixed(0)} = ₹{discount.value.toFixed(2)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    )}
                    {isColumnVisible('profit') && (
                      <TableCell className="text-right bg-muted/30">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="cursor-help">
                                <div className={`font-medium ${profit.value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                  {formatCurrency(profit.value)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {profit.percent.toFixed(1)}%
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs font-semibold">Profit = Negotiated − Base Rate</p>
                              <p className="text-xs">₹{negotiatedPrice.toFixed(0)} − ₹{baseRate.toFixed(0)} = ₹{profit.value.toFixed(2)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    )}
                    {isColumnVisible('printing') && (
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="space-y-1">
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="text"
                                    value={formatNumberWithCommas(printingRate)}
                                    onChange={(e) => {
                                      const rate = parseFormattedNumber(e.target.value);
                                      onPricingUpdate(asset.id, 'printing_rate', rate);
                                      // Auto-calculate and update the printing_charges field
                                      const result = calculatePrintingCost(asset, rate);
                                      onPricingUpdate(asset.id, 'printing_charges', result.cost);
                                    }}
                                    className="h-8 w-24 text-sm"
                                    placeholder="₹/SQFT"
                                  />
                                  <span className="text-xs text-muted-foreground">/sqft</span>
                                </div>
                                <div className={`text-sm font-medium ${printingResult.error ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`}>
                                  {printingResult.error ? (
                                    <span className="flex items-center gap-1">
                                      <AlertCircle className="h-3 w-3" />
                                      <span className="text-xs">N/A</span>
                                    </span>
                                  ) : (
                                    formatCurrency(printing)
                                  )}
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs font-semibold">Printing = SQFT × Rate</p>
                              <p className="text-xs">{assetSqft} sqft × ₹{printingRate} = ₹{printing.toFixed(2)}</p>
                              {printingResult.error && <p className="text-xs text-destructive">{printingResult.error}</p>}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    )}
                    {isColumnVisible('mounting') && (
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="space-y-1">
                                <div className="flex items-center gap-1">
                                  <Select
                                    value={pricing.mounting_mode || 'sqft'}
                                    onValueChange={(mode: 'sqft' | 'fixed') => {
                                      onPricingUpdate(asset.id, 'mounting_mode', mode);
                                      // Recalculate mounting cost based on new mode
                                      const rate = mountingRate;
                                      if (mode === 'fixed') {
                                        onPricingUpdate(asset.id, 'mounting_charges', rate);
                                      } else {
                                        const result = calculateMountingCost(asset, rate);
                                        onPricingUpdate(asset.id, 'mounting_charges', result.cost);
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="h-7 w-16 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="sqft">/Sqft</SelectItem>
                                      <SelectItem value="fixed">Fixed</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Input
                                    type="text"
                                    value={formatNumberWithCommas(mountingRate)}
                                    onChange={(e) => {
                                      const rate = parseFormattedNumber(e.target.value);
                                      onPricingUpdate(asset.id, 'mounting_rate', rate);
                                      const mountingMode = pricing.mounting_mode || 'sqft';
                                      // Calculate cost based on mode
                                      if (mountingMode === 'fixed') {
                                        onPricingUpdate(asset.id, 'mounting_charges', rate);
                                      } else {
                                        const result = calculateMountingCost(asset, rate);
                                        onPricingUpdate(asset.id, 'mounting_charges', result.cost);
                                      }
                                    }}
                                    className="h-7 w-20 text-sm"
                                    placeholder={pricing.mounting_mode === 'fixed' ? "₹" : "₹/sqft"}
                                  />
                                </div>
                                <div className={`text-sm font-medium ${mountingResult.error && pricing.mounting_mode !== 'fixed' ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`}>
                                  {pricing.mounting_mode === 'fixed' ? (
                                    formatCurrency(mountingRate)
                                  ) : mountingResult.error ? (
                                    <span className="flex items-center gap-1">
                                      <AlertCircle className="h-3 w-3" />
                                      <span className="text-xs">N/A</span>
                                    </span>
                                  ) : (
                                    formatCurrency(mounting)
                                  )}
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              {pricing.mounting_mode === 'fixed' ? (
                                <>
                                  <p className="text-xs font-semibold">Mounting = Fixed Price</p>
                                  <p className="text-xs">₹{mountingRate.toFixed(2)}</p>
                                </>
                              ) : (
                                <>
                                  <p className="text-xs font-semibold">Mounting = SQFT × Rate</p>
                                  <p className="text-xs">{assetSqft} sqft × ₹{mountingRate} = ₹{mounting.toFixed(2)}</p>
                                  {mountingResult.error && <p className="text-xs text-destructive">{mountingResult.error}</p>}
                                </>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    )}
                    {isColumnVisible('total') && (
                      <TableCell className="text-right font-medium">
                        {formatCurrency(rowTotal)}
                      </TableCell>
                    )}
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onRemove(asset.id)}
                        className="h-9 w-9"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Pricing History Dialog */}
      {pricingHistoryAsset && (
        <PricingHistoryDialog
          open={!!pricingHistoryAsset}
          onOpenChange={(open) => !open && setPricingHistoryAsset(null)}
          assetId={pricingHistoryAsset.id}
          assetLocation={pricingHistoryAsset.location}
          currentCardRate={pricingHistoryAsset.cardRate}
        />
      )}

      {/* Bulk Printing Dialog */}
      <BulkPrintingDialog
        open={showBulkPrintingDialog}
        onOpenChange={setShowBulkPrintingDialog}
        assets={assets}
        selectedAssetIds={selectedAssetIds}
        assetPricing={assetPricing}
        onBulkUpdate={handleBulkUpdate}
      />

      {/* Bulk Mounting Dialog */}
      <BulkMountingDialog
        open={showBulkMountingDialog}
        onOpenChange={setShowBulkMountingDialog}
        assets={assets}
        selectedAssetIds={selectedAssetIds}
        assetPricing={assetPricing}
        onBulkUpdate={handleBulkUpdate}
      />
    </div>
  );
}
