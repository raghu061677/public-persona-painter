import { useState } from "react";
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
import { Search, Plus, Settings2 } from "lucide-react";
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

interface AssetSelectionTableProps {
  assets: any[];
  selectedIds: Set<string>;
  onSelect: (assetId: string, asset: any) => void;
  onMultiSelect?: (assetIds: string[], assets: any[]) => void;
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
] as const;

const DEFAULT_VISIBLE = [
  'asset_id',
  'location',
  'city',
  'area',
  'media_type',
  'card_rate',
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
};

export function AssetSelectionTable({ assets, selectedIds, onSelect, onMultiSelect }: AssetSelectionTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [mediaTypeFilter, setMediaTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("available");
  const [checkedAssets, setCheckedAssets] = useState<Set<string>>(new Set());
  
  const {
    isReady,
    visibleKeys,
    setVisibleKeys,
    reset,
  } = useColumnPrefs('asset-selection', ALL_COLUMNS as any, DEFAULT_VISIBLE as any);

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

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = !searchTerm || 
      asset.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.area?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCity = cityFilter === "all" || asset.city === cityFilter;
    const matchesType = mediaTypeFilter === "all" || asset.media_type === mediaTypeFilter;
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "available" && asset.status === "Available") ||
      (statusFilter === "booked" && asset.status === "Booked");
    
    return matchesSearch && matchesCity && matchesType && matchesStatus;
  });

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
    if (checkedAssets.size === filteredAssets.length) {
      setCheckedAssets(new Set());
    } else {
      setCheckedAssets(new Set(filteredAssets.map(a => a.id)));
    }
  };

  const handleAddSelected = () => {
    if (checkedAssets.size === 0) return;
    const assetsToAdd = filteredAssets.filter(a => checkedAssets.has(a.id) && !selectedIds.has(a.id));
    if (onMultiSelect) {
      onMultiSelect(assetsToAdd.map(a => a.id), assetsToAdd);
    }
    setCheckedAssets(new Set());
  };

  if (!isReady) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ID, location, area..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="w-48">
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
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {mediaTypes.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assets</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="booked">Booked</SelectItem>
          </SelectContent>
        </Select>
        
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
          <TableHeader className="sticky top-0 bg-background">
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={filteredAssets.length > 0 && checkedAssets.size === filteredAssets.length}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              {visibleKeys.map((key) => (
                <TableHead key={key} className={key === 'asset_id' ? '' : key.includes('rate') || key.includes('charges') || key.includes('rent') ? 'text-right' : ''}>
                  {COLUMN_LABELS[key]}
                </TableHead>
              ))}
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAssets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleKeys.length + 2} className="text-center py-8 text-muted-foreground">
                  No assets found
                </TableCell>
              </TableRow>
            ) : (
              filteredAssets.map((asset) => (
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
        Showing {filteredAssets.length} of {assets.length} available assets
      </p>
    </div>
  );
}
