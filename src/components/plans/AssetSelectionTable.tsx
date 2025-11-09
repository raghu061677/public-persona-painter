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
}

const ALL_COLUMNS = [
  'asset_id',
  'location',
  'city',
  'area',
  'media_type',
  'dimensions',
  'card_rate',
  'base_rent',
  'printing_charges',
  'mounting_charges',
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
  base_rent: 'Base Rent',
  printing_charges: 'Printing',
  mounting_charges: 'Mounting',
};

export function AssetSelectionTable({ assets, selectedIds, onSelect }: AssetSelectionTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [mediaTypeFilter, setMediaTypeFilter] = useState("all");
  
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
    
    return matchesSearch && matchesCity && matchesType;
  });

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

      <div className="border rounded-lg max-h-96 overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background">
            <TableRow>
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
                <TableCell colSpan={visibleKeys.length + 1} className="text-center py-8 text-muted-foreground">
                  No available assets found
                </TableCell>
              </TableRow>
            ) : (
              filteredAssets.map((asset) => (
                <TableRow key={asset.id}>
                  {visibleKeys.map((key) => {
                    if (key === 'asset_id') {
                      return <TableCell key={key} className="font-medium">{asset.id}</TableCell>;
                    }
                    if (key === 'card_rate' || key === 'base_rent' || key === 'printing_charges' || key === 'mounting_charges') {
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
