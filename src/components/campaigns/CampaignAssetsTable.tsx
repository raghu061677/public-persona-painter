import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatAssetDisplayCode } from "@/lib/assets/formatAssetDisplayCode";
import { formatCurrency } from "@/utils/mediaAssets";
import {
  Plus,
  Trash2,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Settings2,
  AlertCircle,
  ChevronDown,
  Printer,
  Hammer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CampaignAssetDurationCell } from "./CampaignAssetDurationCell";
import { BillingMode } from "@/utils/perAssetPricing";

// Campaign asset interface
interface CampaignAsset {
  id: string;
  asset_id: string;
  media_asset_code: string;
  location: string;
  area: string;
  city: string;
  media_type: string;
  card_rate: number;
  negotiated_rate: number;
  printing_charges: number;
  mounting_charges: number;
  total_price: number;
  status: string;
  isNew?: boolean;
  start_date: Date | string | null;
  end_date: Date | string | null;
  booked_days: number;
  billing_mode: BillingMode;
  daily_rate: number;
  rent_amount: number;
  total_sqft: number;
  printing_rate_per_sqft: number;
  mounting_rate_per_sqft: number;
  printing_cost: number;
  mounting_cost: number;
  dimensions?: string;
}

type SortField =
  | "media_asset_code"
  | "location"
  | "city"
  | "area"
  | "media_type"
  | "total_sqft"
  | "negotiated_rate"
  | "rent_amount"
  | "printing_charges"
  | "mounting_charges"
  | "status";
type SortDirection = "asc" | "desc" | null;

interface SortConfig {
  field: SortField | null;
  direction: SortDirection;
}

// Column definitions
const ALL_COLUMNS = [
  { id: "asset_id", label: "Asset ID", defaultVisible: true },
  { id: "location", label: "Location", defaultVisible: true },
  { id: "city", label: "City", defaultVisible: false },
  { id: "area", label: "Area", defaultVisible: false },
  { id: "media_type", label: "Media Type", defaultVisible: false },
  { id: "total_sqft", label: "Sqft", defaultVisible: true },
  { id: "duration", label: "Duration", defaultVisible: true },
  { id: "negotiated_rate", label: "Negotiated", defaultVisible: true },
  { id: "rent_amount", label: "Rent", defaultVisible: true },
  { id: "printing", label: "Printing", defaultVisible: true },
  { id: "mounting", label: "Mounting", defaultVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
];

interface CampaignAssetsTableProps {
  assets: CampaignAsset[];
  selectedAssetIds: Set<string>;
  companyPrefix: string | null;
  campaignStartDate?: Date;
  campaignEndDate?: Date;
  onToggleSelectAll: () => void;
  onToggleAssetSelection: (assetId: string) => void;
  onUpdateAsset: (index: number, field: keyof CampaignAsset, value: any) => void;
  onAssetDurationChange: (index: number, updates: any) => void;
  onUpdatePrintingRate: (assetId: string, rate: number) => void;
  onUpdateMountingRate: (assetId: string, rate: number) => void;
  onDeleteAsset: (asset: CampaignAsset) => void;
  onAddAssets: () => void;
  onBulkPrinting: () => void;
  onBulkMounting: () => void;
}

export function CampaignAssetsTable({
  assets,
  selectedAssetIds,
  companyPrefix,
  campaignStartDate,
  campaignEndDate,
  onToggleSelectAll,
  onToggleAssetSelection,
  onUpdateAsset,
  onAssetDurationChange,
  onUpdatePrintingRate,
  onUpdateMountingRate,
  onDeleteAsset,
  onAddAssets,
  onBulkPrinting,
  onBulkMounting,
}: CampaignAssetsTableProps) {
  // State for filtering, sorting, and column visibility
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [mediaTypeFilter, setMediaTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: null, direction: null });
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(ALL_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id))
  );

  // Derive unique filter options
  const cities = useMemo(
    () => Array.from(new Set(assets.map((a) => a.city).filter(Boolean))).sort(),
    [assets]
  );

  const areas = useMemo(() => {
    let filtered = assets;
    if (cityFilter !== "all") {
      filtered = assets.filter((a) => a.city === cityFilter);
    }
    return Array.from(new Set(filtered.map((a) => a.area).filter(Boolean))).sort();
  }, [assets, cityFilter]);

  const mediaTypes = useMemo(
    () => Array.from(new Set(assets.map((a) => a.media_type).filter(Boolean))).sort(),
    [assets]
  );

  const statuses = useMemo(
    () => Array.from(new Set(assets.map((a) => a.status).filter(Boolean))).sort(),
    [assets]
  );

  // Filter and sort assets
  const filteredAndSortedAssets = useMemo(() => {
    let filtered = [...assets];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (asset) =>
          asset.asset_id.toLowerCase().includes(term) ||
          asset.media_asset_code?.toLowerCase().includes(term) ||
          asset.location?.toLowerCase().includes(term) ||
          asset.area?.toLowerCase().includes(term)
      );
    }

    // City filter
    if (cityFilter !== "all") {
      filtered = filtered.filter((asset) => asset.city === cityFilter);
    }

    // Area filter
    if (areaFilter !== "all") {
      filtered = filtered.filter((asset) => asset.area === areaFilter);
    }

    // Media type filter
    if (mediaTypeFilter !== "all") {
      filtered = filtered.filter((asset) => asset.media_type === mediaTypeFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((asset) => asset.status === statusFilter);
    }

    // Apply sorting
    if (sortConfig.field && sortConfig.direction) {
      filtered.sort((a, b) => {
        let aValue: any = a[sortConfig.field as keyof CampaignAsset] ?? "";
        let bValue: any = b[sortConfig.field as keyof CampaignAsset] ?? "";

        // Handle special cases
        if (sortConfig.field === "media_asset_code") {
          aValue = a.media_asset_code || a.asset_id || "";
          bValue = b.media_asset_code || b.asset_id || "";
        }

        // Numeric comparison for numeric fields
        if (
          [
            "total_sqft",
            "negotiated_rate",
            "rent_amount",
            "printing_charges",
            "mounting_charges",
          ].includes(sortConfig.field!)
        ) {
          aValue = Number(aValue) || 0;
          bValue = Number(bValue) || 0;
          return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
        }

        // String comparison
        const comparison = String(aValue).localeCompare(String(bValue));
        return sortConfig.direction === "asc" ? comparison : -comparison;
      });
    }

    return filtered;
  }, [assets, searchTerm, cityFilter, areaFilter, mediaTypeFilter, statusFilter, sortConfig]);

  const handleSort = (field: SortField) => {
    setSortConfig((current) => {
      if (current.field === field) {
        if (current.direction === null) return { field, direction: "asc" };
        if (current.direction === "asc") return { field, direction: "desc" };
        return { field: null, direction: null };
      }
      return { field, direction: "asc" };
    });
  };

  const getSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground/50" />;
    }
    if (sortConfig.direction === "asc") {
      return <ArrowUp className="ml-1 h-3 w-3 text-primary" />;
    }
    return <ArrowDown className="ml-1 h-3 w-3 text-primary" />;
  };

  const clearFilters = () => {
    setSearchTerm("");
    setCityFilter("all");
    setAreaFilter("all");
    setMediaTypeFilter("all");
    setStatusFilter("all");
    setSortConfig({ field: null, direction: null });
  };

  const toggleColumn = (columnId: string) => {
    const newVisible = new Set(visibleColumns);
    if (newVisible.has(columnId)) {
      newVisible.delete(columnId);
    } else {
      newVisible.add(columnId);
    }
    setVisibleColumns(newVisible);
  };

  const activeFilterCount = [
    searchTerm ? 1 : 0,
    cityFilter !== "all" ? 1 : 0,
    areaFilter !== "all" ? 1 : 0,
    mediaTypeFilter !== "all" ? 1 : 0,
    statusFilter !== "all" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  // Find original index in assets array for callbacks
  const getOriginalIndex = (asset: CampaignAsset): number => {
    return assets.findIndex((a) => a.id === asset.id);
  };

  const isColumnVisible = (id: string) => visibleColumns.has(id);

  return (
    <div className="space-y-4">
      {/* Header with title and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-lg">Campaign Assets ({assets.length})</span>
          {filteredAndSortedAssets.length !== assets.length && (
            <Badge variant="outline">{filteredAndSortedAssets.length} shown</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedAssetIds.size > 0 && (
            <Badge variant="secondary" className="text-xs">
              {selectedAssetIds.size} selected
            </Badge>
          )}

          {/* Bulk Update Dropdown */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" disabled={selectedAssetIds.size === 0}>
                        Bulk Update
                        <ChevronDown className="h-4 w-4 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Bulk Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuCheckboxItem onClick={onBulkPrinting}>
                        <Printer className="h-4 w-4 mr-2" />
                        Bulk Printing
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem onClick={onBulkMounting}>
                        <Hammer className="h-4 w-4 mr-2" />
                        Bulk Mounting
                      </DropdownMenuCheckboxItem>
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="h-4 w-4 mr-1" />
                View
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ALL_COLUMNS.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  checked={visibleColumns.has(col.id)}
                  onCheckedChange={() => toggleColumn(col.id)}
                >
                  {col.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={onAddAssets}>
            <Plus className="mr-2 h-4 w-4" />
            Add Assets
          </Button>
        </div>
      </div>

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
            {statuses.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
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
        <Select
          value={cityFilter}
          onValueChange={(v) => {
            setCityFilter(v);
            setAreaFilter("all");
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="City" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cities</SelectItem>
            {cities.map((city) => (
              <SelectItem key={city} value={city}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={areaFilter} onValueChange={setAreaFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Area" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Areas</SelectItem>
            {areas.map((area) => (
              <SelectItem key={area} value={area}>
                {area}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={mediaTypeFilter} onValueChange={setMediaTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Media Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {mediaTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={
                    selectedAssetIds.size === filteredAndSortedAssets.length &&
                    filteredAndSortedAssets.length > 0
                  }
                  onCheckedChange={onToggleSelectAll}
                />
              </TableHead>
              <TableHead className="w-[50px] text-center">S.No</TableHead>

              {isColumnVisible("asset_id") && (
                <TableHead
                  className="w-[140px] cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort("media_asset_code")}
                >
                  <div className="flex items-center">
                    Asset ID
                    {getSortIcon("media_asset_code")}
                  </div>
                </TableHead>
              )}

              {isColumnVisible("location") && (
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort("location")}
                >
                  <div className="flex items-center">
                    Location
                    {getSortIcon("location")}
                  </div>
                </TableHead>
              )}

              {isColumnVisible("city") && (
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort("city")}
                >
                  <div className="flex items-center">
                    City
                    {getSortIcon("city")}
                  </div>
                </TableHead>
              )}

              {isColumnVisible("area") && (
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort("area")}
                >
                  <div className="flex items-center">
                    Area
                    {getSortIcon("area")}
                  </div>
                </TableHead>
              )}

              {isColumnVisible("media_type") && (
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort("media_type")}
                >
                  <div className="flex items-center">
                    Media Type
                    {getSortIcon("media_type")}
                  </div>
                </TableHead>
              )}

              {isColumnVisible("total_sqft") && (
                <TableHead
                  className="text-right w-[80px] cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort("total_sqft")}
                >
                  <div className="flex items-center justify-end">
                    Sqft
                    {getSortIcon("total_sqft")}
                  </div>
                </TableHead>
              )}

              {isColumnVisible("duration") && (
                <TableHead className="min-w-[180px]">Duration</TableHead>
              )}

              {isColumnVisible("negotiated_rate") && (
                <TableHead
                  className="text-right cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort("negotiated_rate")}
                >
                  <div className="flex items-center justify-end">
                    Negotiated
                    {getSortIcon("negotiated_rate")}
                  </div>
                </TableHead>
              )}

              {isColumnVisible("rent_amount") && (
                <TableHead
                  className="text-right cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort("rent_amount")}
                >
                  <div className="flex items-center justify-end">
                    Rent
                    {getSortIcon("rent_amount")}
                  </div>
                </TableHead>
              )}

              {isColumnVisible("printing") && (
                <TableHead
                  className="w-[160px] cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort("printing_charges")}
                >
                  <div className="flex items-center">
                    Printing
                    {getSortIcon("printing_charges")}
                  </div>
                </TableHead>
              )}

              {isColumnVisible("mounting") && (
                <TableHead
                  className="w-[160px] cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort("mounting_charges")}
                >
                  <div className="flex items-center">
                    Mounting
                    {getSortIcon("mounting_charges")}
                  </div>
                </TableHead>
              )}

              {isColumnVisible("status") && (
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center">
                    Status
                    {getSortIcon("status")}
                  </div>
                </TableHead>
              )}

              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedAssets.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={15}
                  className="text-center py-8 text-muted-foreground"
                >
                  {assets.length === 0
                    ? 'No assets in this campaign. Click "Add Assets" to add media assets.'
                    : "No assets match the current filters."}
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedAssets.map((asset, filteredIndex) => {
                const originalIndex = getOriginalIndex(asset);
                return (
                  <TableRow
                    key={asset.id}
                    className={cn(
                      asset.isNew && "bg-green-50/50",
                      selectedAssetIds.has(asset.id) && "bg-primary/5"
                    )}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedAssetIds.has(asset.id)}
                        onCheckedChange={() => onToggleAssetSelection(asset.id)}
                      />
                    </TableCell>
                    <TableCell className="text-center font-medium text-muted-foreground">
                      {filteredIndex + 1}
                    </TableCell>

                    {isColumnVisible("asset_id") && (
                      <TableCell className="font-mono text-sm">
                        {formatAssetDisplayCode({
                          mediaAssetCode: asset.media_asset_code,
                          fallbackId: asset.asset_id,
                          companyName: companyPrefix,
                        })}
                        {asset.isNew && (
                          <span className="ml-1 text-xs text-green-600">(new)</span>
                        )}
                      </TableCell>
                    )}

                    {isColumnVisible("location") && (
                      <TableCell className="min-w-[180px] max-w-[250px] text-sm">
                        <div
                          className="break-words whitespace-normal"
                          title={asset.location}
                        >
                          {asset.location}
                        </div>
                      </TableCell>
                    )}

                    {isColumnVisible("city") && <TableCell>{asset.city}</TableCell>}

                    {isColumnVisible("area") && (
                      <TableCell className="text-sm">{asset.area}</TableCell>
                    )}

                    {isColumnVisible("media_type") && (
                      <TableCell>{asset.media_type}</TableCell>
                    )}

                    {isColumnVisible("total_sqft") && (
                      <TableCell className="text-right">
                        {asset.total_sqft > 0 ? (
                          <span className="font-medium">{asset.total_sqft}</span>
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant="destructive"
                                  className="text-xs cursor-help"
                                >
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  N/A
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                Area missing - cannot calculate printing cost
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </TableCell>
                    )}

                    {isColumnVisible("duration") && (
                      <TableCell>
                        <CampaignAssetDurationCell
                          startDate={asset.start_date}
                          endDate={asset.end_date}
                          billingMode={asset.billing_mode}
                          monthlyRate={asset.negotiated_rate || asset.card_rate}
                          campaignStartDate={campaignStartDate}
                          campaignEndDate={campaignEndDate}
                          onChange={(updates) =>
                            onAssetDurationChange(originalIndex, updates)
                          }
                        />
                      </TableCell>
                    )}

                    {isColumnVisible("negotiated_rate") && (
                      <TableCell>
                        <Input
                          type="number"
                          value={asset.negotiated_rate}
                          onChange={(e) =>
                            onUpdateAsset(
                              originalIndex,
                              "negotiated_rate",
                              Number(e.target.value)
                            )
                          }
                          className="h-8 w-24 text-right"
                        />
                      </TableCell>
                    )}

                    {isColumnVisible("rent_amount") && (
                      <TableCell className="text-right font-semibold text-primary">
                        {formatCurrency(asset.rent_amount || 0)}
                      </TableCell>
                    )}

                    {isColumnVisible("printing") && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={asset.printing_rate_per_sqft || ""}
                            onChange={(e) =>
                              onUpdatePrintingRate(asset.id, Number(e.target.value))
                            }
                            className="h-8 w-16 text-right text-xs"
                            placeholder="₹/sqft"
                            step="0.5"
                          />
                          <span className="text-muted-foreground">→</span>
                          <span className="font-medium text-green-600 min-w-[60px] text-right">
                            {formatCurrency(asset.printing_charges || 0)}
                          </span>
                        </div>
                      </TableCell>
                    )}

                    {isColumnVisible("mounting") && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={asset.mounting_rate_per_sqft || ""}
                            onChange={(e) =>
                              onUpdateMountingRate(asset.id, Number(e.target.value))
                            }
                            className="h-8 w-16 text-right text-xs"
                            placeholder="₹/sqft"
                            step="0.5"
                          />
                          <span className="text-muted-foreground">→</span>
                          <span className="font-medium text-green-600 min-w-[60px] text-right">
                            {formatCurrency(asset.mounting_charges || 0)}
                          </span>
                        </div>
                      </TableCell>
                    )}

                    {isColumnVisible("status") && (
                      <TableCell>
                        <Select
                          value={asset.status}
                          onValueChange={(value) =>
                            onUpdateAsset(originalIndex, "status", value)
                          }
                        >
                          <SelectTrigger className="h-8 w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="Assigned">Assigned</SelectItem>
                            <SelectItem value="Installed">Installed</SelectItem>
                            <SelectItem value="Mounted">Mounted</SelectItem>
                            <SelectItem value="PhotoUploaded">Photo Uploaded</SelectItem>
                            <SelectItem value="Verified">Verified</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    )}

                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDeleteAsset(asset)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
