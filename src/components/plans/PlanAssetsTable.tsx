import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Search, 
  X, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Filter,
  Settings2,
  Plus,
  Wand2,
  Columns
} from "lucide-react";
import { formatCurrency } from "@/utils/mediaAssets";
import { calcProRata } from "@/utils/pricing";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface PlanItem {
  id: string;
  asset_id: string;
  display_asset_id?: string;
  location?: string;
  city?: string;
  area?: string;
  direction?: string;
  media_type?: string;
  dimensions?: string;
  total_sqft?: number;
  illumination_type?: string;
  card_rate: number;
  base_rent?: number;
  negotiated_price?: number;
  sales_price?: number;
  rent_amount?: number;
  discount_amount?: number;
  profit_value?: number;
  printing_charges?: number;
  printing_cost?: number;
  printing_rate?: number;
  mounting_charges?: number;
  installation_cost?: number;
  installation_rate?: number;
  start_date?: string;
  end_date?: string;
  booked_days?: number;
  billing_mode?: string;
  subtotal?: number;
  total_with_gst?: number;
}

interface PlanAssetsTableProps {
  planItems: PlanItem[];
  plan: {
    duration_days: number;
    start_date: string;
    end_date: string;
    gst_percent: number;
    status?: string;
  };
  isAdmin: boolean;
  selectedItems: Set<string>;
  onToggleItem: (assetId: string) => void;
  onToggleAll: () => void;
  onRemoveAsset: (itemId: string, assetId: string) => void;
  onAddAssets?: () => void;
  onBulkPrintingMounting?: () => void;
  onPrintingInstallation?: () => void;
}

type SortDirection = 'asc' | 'desc' | null;
type SortField = string;

export function PlanAssetsTable({
  planItems,
  plan,
  isAdmin,
  selectedItems,
  onToggleItem,
  onToggleAll,
  onRemoveAsset,
  onAddAssets,
  onBulkPrintingMounting,
  onPrintingInstallation,
}: PlanAssetsTableProps) {
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [mediaTypeFilter, setMediaTypeFilter] = useState<string>("all");

  // Sorting state
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Column visibility state
  const [showAssetDates, setShowAssetDates] = useState(true);
  const [showBookedDays, setShowBookedDays] = useState(true);
  const [showBillingMode, setShowBillingMode] = useState(false);
  const [showDirection, setShowDirection] = useState(false);
  const [showDimensions, setShowDimensions] = useState(false);
  const [showSqft, setShowSqft] = useState(false);
  const [showIllumination, setShowIllumination] = useState(false);
  const [showMediaType, setShowMediaType] = useState(false);
  const [showArea, setShowArea] = useState(false);
  const [showBaseRate, setShowBaseRate] = useState(false);
  const [showPrintingRate, setShowPrintingRate] = useState(false);
  const [showMountingCost, setShowMountingCost] = useState(false);
  const [showDiscount, setShowDiscount] = useState(true);
  const [showProfit, setShowProfit] = useState(true);

  // Get unique filter values
  const filterOptions = useMemo(() => {
    const cities = [...new Set(planItems.map(item => item.city).filter(Boolean))].sort();
    const areas = [...new Set(planItems.map(item => item.area).filter(Boolean))].sort();
    const mediaTypes = [...new Set(planItems.map(item => item.media_type).filter(Boolean))].sort();
    return { cities, areas, mediaTypes };
  }, [planItems]);

  // Filtered and sorted items
  const filteredAndSortedItems = useMemo(() => {
    let result = [...planItems];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => 
        (item.display_asset_id || item.asset_id || '').toLowerCase().includes(query) ||
        (item.location || '').toLowerCase().includes(query) ||
        (item.city || '').toLowerCase().includes(query) ||
        (item.area || '').toLowerCase().includes(query)
      );
    }

    // Apply city filter
    if (cityFilter !== "all") {
      result = result.filter(item => item.city === cityFilter);
    }

    // Apply area filter
    if (areaFilter !== "all") {
      result = result.filter(item => item.area === areaFilter);
    }

    // Apply media type filter
    if (mediaTypeFilter !== "all") {
      result = result.filter(item => item.media_type === mediaTypeFilter);
    }

    // Apply sorting
    if (sortField && sortDirection) {
      result.sort((a, b) => {
        let aVal: any;
        let bVal: any;

        switch (sortField) {
          case 'asset_id':
            aVal = a.display_asset_id || a.asset_id || '';
            bVal = b.display_asset_id || b.asset_id || '';
            break;
          case 'location':
            aVal = a.location || '';
            bVal = b.location || '';
            break;
          case 'city':
            aVal = a.city || '';
            bVal = b.city || '';
            break;
          case 'area':
            aVal = a.area || '';
            bVal = b.area || '';
            break;
          case 'media_type':
            aVal = a.media_type || '';
            bVal = b.media_type || '';
            break;
          case 'total_sqft':
            aVal = a.total_sqft || 0;
            bVal = b.total_sqft || 0;
            break;
          case 'card_rate':
            aVal = a.card_rate || 0;
            bVal = b.card_rate || 0;
            break;
          case 'negotiated':
            aVal = a.negotiated_price || a.sales_price || a.card_rate || 0;
            bVal = b.negotiated_price || b.sales_price || b.card_rate || 0;
            break;
          case 'booked_days':
            aVal = a.booked_days || plan.duration_days;
            bVal = b.booked_days || plan.duration_days;
            break;
          default:
            aVal = '';
            bVal = '';
        }

        if (typeof aVal === 'string') {
          const comparison = aVal.localeCompare(bVal);
          return sortDirection === 'asc' ? comparison : -comparison;
        } else {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }
      });
    }

    return result;
  }, [planItems, searchQuery, cityFilter, areaFilter, mediaTypeFilter, sortField, sortDirection, plan.duration_days]);

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
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    if (sortDirection === 'asc') return <ArrowUp className="h-3 w-3 ml-1" />;
    if (sortDirection === 'desc') return <ArrowDown className="h-3 w-3 ml-1" />;
    return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
  };

  const clearFilters = () => {
    setSearchQuery("");
    setCityFilter("all");
    setAreaFilter("all");
    setMediaTypeFilter("all");
    setSortField(null);
    setSortDirection(null);
  };

  const hasActiveFilters = searchQuery || cityFilter !== "all" || areaFilter !== "all" || mediaTypeFilter !== "all";
  const canEdit = isAdmin && ['pending', 'approved', 'draft', 'sent'].includes(plan.status?.toLowerCase() || '');

  return (
    <div className="space-y-4">
      {/* Toolbar: Search, Filters, View Options */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* City Filter */}
        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="City" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cities</SelectItem>
            {filterOptions.cities.map((city) => (
              <SelectItem key={city} value={city!}>{city}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Area Filter */}
        <Select value={areaFilter} onValueChange={setAreaFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Area" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Areas</SelectItem>
            {filterOptions.areas.map((area) => (
              <SelectItem key={area} value={area!}>{area}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Media Type Filter */}
        <Select value={mediaTypeFilter} onValueChange={setMediaTypeFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Media Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {filterOptions.mediaTypes.map((type) => (
              <SelectItem key={type} value={type!}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear Filters
          </Button>
        )}

        <div className="flex-1" />

        {/* View Options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Columns className="h-4 w-4 mr-2" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked={showAssetDates} onCheckedChange={setShowAssetDates}>
              Asset Dates
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={showBookedDays} onCheckedChange={setShowBookedDays}>
              Days
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={showBillingMode} onCheckedChange={setShowBillingMode}>
              Billing Mode
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={showArea} onCheckedChange={setShowArea}>
              Area
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={showDirection} onCheckedChange={setShowDirection}>
              Direction
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={showMediaType} onCheckedChange={setShowMediaType}>
              Media Type
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={showDimensions} onCheckedChange={setShowDimensions}>
              Dimensions
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={showSqft} onCheckedChange={setShowSqft}>
              Sqft
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={showIllumination} onCheckedChange={setShowIllumination}>
              Illumination
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={showBaseRate} onCheckedChange={setShowBaseRate}>
              Base Rate
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={showPrintingRate} onCheckedChange={setShowPrintingRate}>
              Printing Rate
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={showMountingCost} onCheckedChange={setShowMountingCost}>
              Mounting Cost
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={showDiscount} onCheckedChange={setShowDiscount}>
              Discount
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={showProfit} onCheckedChange={setShowProfit}>
              Profit
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Bulk Actions */}
        {selectedItems.size > 0 && canEdit && (
          <>
            {onPrintingInstallation && (
              <Button
                variant="outline"
                size="sm"
                onClick={onPrintingInstallation}
                className="bg-primary/5 hover:bg-primary/10"
              >
                <Wand2 className="mr-2 h-4 w-4" />
                Printing & Installation
              </Button>
            )}
            {onBulkPrintingMounting && (
              <Button
                variant="outline"
                size="sm"
                onClick={onBulkPrintingMounting}
              >
                <Wand2 className="mr-2 h-4 w-4" />
                Bulk P&M
              </Button>
            )}
          </>
        )}

        {/* Add Assets Button */}
        {canEdit && onAddAssets && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAddAssets}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Assets
          </Button>
        )}
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredAndSortedItems.length} of {planItems.length} assets
        {selectedItems.size > 0 && ` • ${selectedItems.size} selected`}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedItems.size === planItems.length && planItems.length > 0}
                  onCheckedChange={onToggleAll}
                />
              </TableHead>
              {canEdit && <TableHead className="w-12"></TableHead>}
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('asset_id')}
              >
                <div className="flex items-center">
                  Asset ID {getSortIcon('asset_id')}
                </div>
              </TableHead>
              {showArea && (
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('area')}
                >
                  <div className="flex items-center">
                    Area {getSortIcon('area')}
                  </div>
                </TableHead>
              )}
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('location')}
              >
                <div className="flex items-center">
                  Location {getSortIcon('location')}
                </div>
              </TableHead>
              {showDirection && <TableHead>Direction</TableHead>}
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('city')}
              >
                <div className="flex items-center">
                  City {getSortIcon('city')}
                </div>
              </TableHead>
              {showMediaType && (
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('media_type')}
                >
                  <div className="flex items-center">
                    Media Type {getSortIcon('media_type')}
                  </div>
                </TableHead>
              )}
              {showDimensions && <TableHead>Dimensions</TableHead>}
              {showSqft && (
                <TableHead 
                  className="text-right cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('total_sqft')}
                >
                  <div className="flex items-center justify-end">
                    Sqft {getSortIcon('total_sqft')}
                  </div>
                </TableHead>
              )}
              {showIllumination && <TableHead>Illumination</TableHead>}
              {showAssetDates && <TableHead>Start Date</TableHead>}
              {showAssetDates && <TableHead>End Date</TableHead>}
              {showBookedDays && (
                <TableHead 
                  className="text-center cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('booked_days')}
                >
                  <div className="flex items-center justify-center">
                    Days {getSortIcon('booked_days')}
                  </div>
                </TableHead>
              )}
              {showBillingMode && <TableHead>Billing Mode</TableHead>}
              <TableHead 
                className="text-right cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('card_rate')}
              >
                <div className="flex items-center justify-end">
                  Card Rate {getSortIcon('card_rate')}
                </div>
              </TableHead>
              {showBaseRate && <TableHead className="text-right">Base Rate</TableHead>}
              <TableHead 
                className="text-right cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('negotiated')}
              >
                <div className="flex items-center justify-end">
                  Negotiated {getSortIcon('negotiated')}
                </div>
              </TableHead>
              <TableHead className="text-right">Pro-Rata</TableHead>
              {showDiscount && <TableHead className="text-right">Discount</TableHead>}
              {showProfit && <TableHead className="text-right">Profit</TableHead>}
              {showPrintingRate && <TableHead className="text-right">Print Rate</TableHead>}
              <TableHead className="text-right">Printing</TableHead>
              {showMountingCost && <TableHead className="text-right">Mounting</TableHead>}
              <TableHead className="text-right">Installation</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">GST</TableHead>
              <TableHead className="text-right">Total + GST</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedItems.map((item) => {
              // Calculate values
              const effectivePrice = item.negotiated_price || item.sales_price || item.card_rate;
              const printingCost = item.printing_charges || item.printing_cost || 0;
              const mountingCost = item.mounting_charges || item.installation_cost || 0;
              const assetBookedDays = item.booked_days || plan.duration_days;
              const proRataAmount = item.rent_amount ?? calcProRata(effectivePrice, assetBookedDays);
              const discountAmount = item.discount_amount ?? Math.round((item.card_rate - effectivePrice) * 100) / 100;
              const discountPercent = item.card_rate > 0 ? ((item.card_rate - effectivePrice) / item.card_rate) * 100 : 0;
              const baseRent = item.base_rent || 0;
              const profitAmount = item.profit_value ?? Math.round((effectivePrice - baseRent) * 100) / 100;
              const profitPercent = baseRent > 0 ? ((effectivePrice - baseRent) / baseRent) * 100 : (effectivePrice > 0 ? 100 : 0);
              const lineTotal = Math.round((proRataAmount + printingCost + mountingCost) * 100) / 100;
              const gstPercent = plan.gst_percent || 0;
              const rowGstAmount = Math.round((lineTotal * gstPercent / 100) * 100) / 100;
              const rowTotalWithGst = Math.round((lineTotal + rowGstAmount) * 100) / 100;

              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedItems.has(item.asset_id)}
                      onCheckedChange={() => onToggleItem(item.asset_id)}
                    />
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemoveAsset(item.id, item.asset_id)}
                        className="h-8 w-8"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                  <TableCell className="font-medium font-mono">
                    {item.display_asset_id || item.asset_id}
                  </TableCell>
                  {showArea && <TableCell>{item.area || '-'}</TableCell>}
                  <TableCell>{item.location}</TableCell>
                  {showDirection && <TableCell>{item.direction || '-'}</TableCell>}
                  <TableCell>{item.city}</TableCell>
                  {showMediaType && <TableCell>{item.media_type || '-'}</TableCell>}
                  {showDimensions && <TableCell>{item.dimensions || '-'}</TableCell>}
                  {showSqft && <TableCell className="text-right">{item.total_sqft || '-'}</TableCell>}
                  {showIllumination && <TableCell>{item.illumination_type || '-'}</TableCell>}
                  {showAssetDates && (
                    <TableCell className="text-sm">
                      {item.start_date 
                        ? format(new Date(item.start_date), 'dd/MM/yy') 
                        : format(new Date(plan.start_date), 'dd/MM/yy')}
                    </TableCell>
                  )}
                  {showAssetDates && (
                    <TableCell className="text-sm">
                      {item.end_date 
                        ? format(new Date(item.end_date), 'dd/MM/yy') 
                        : format(new Date(plan.end_date), 'dd/MM/yy')}
                    </TableCell>
                  )}
                  {showBookedDays && (
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="font-mono">
                        {assetBookedDays}d
                      </Badge>
                    </TableCell>
                  )}
                  {showBillingMode && (
                    <TableCell className="text-sm text-muted-foreground">
                      {item.billing_mode || 'PRORATA_30'}
                    </TableCell>
                  )}
                  <TableCell className="text-right">{formatCurrency(item.card_rate)}</TableCell>
                  {showBaseRate && <TableCell className="text-right">{formatCurrency(baseRent)}</TableCell>}
                  <TableCell className="text-right font-medium">{formatCurrency(effectivePrice)}</TableCell>
                  <TableCell className="text-right text-purple-600">{formatCurrency(proRataAmount)}</TableCell>
                  {showDiscount && (
                    <TableCell className="text-right text-blue-600 font-medium">
                      -{formatCurrency(discountAmount)} ({discountPercent.toFixed(1)}%)
                    </TableCell>
                  )}
                  {showProfit && (
                    <TableCell className="text-right text-green-600 font-medium">
                      {formatCurrency(profitAmount)} ({profitPercent.toFixed(1)}%)
                    </TableCell>
                  )}
                  {showPrintingRate && (
                    <TableCell className="text-right">{formatCurrency(item.printing_rate || 0)}/sqft</TableCell>
                  )}
                  <TableCell className="text-right">{formatCurrency(printingCost)}</TableCell>
                  {showMountingCost && (
                    <TableCell className="text-right">{formatCurrency(item.installation_rate || 0)}</TableCell>
                  )}
                  <TableCell className="text-right">{formatCurrency(mountingCost)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(lineTotal)}</TableCell>
                  <TableCell className="text-right text-red-600">
                    {gstPercent > 0 ? formatCurrency(rowGstAmount) : '₹0'}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-lg">
                    {formatCurrency(rowTotalWithGst)}
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredAndSortedItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={20} className="h-24 text-center text-muted-foreground">
                  {planItems.length === 0 ? "No assets in this plan" : "No assets match your filters"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
