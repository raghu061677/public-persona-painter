import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, Shield, Calendar } from "lucide-react";
import { BookingHoverCard } from "./BookingHoverCard";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/utils/mediaAssets";
import { useUnifiedAvailability } from "@/hooks/useUnifiedAvailability";
import { toDateString } from "@/lib/availability";
import type { AvailabilityStatus } from "@/lib/availability";

interface AddAssetsDialogProps {
  open: boolean;
  onClose: () => void;
  existingAssetIds: string[];
  onAddAssets: (assets: any[]) => void;
  /** Plan start date for availability check */
  planStartDate?: string;
  /** Plan end date for availability check */
  planEndDate?: string;
}

const AVAILABILITY_BADGE: Record<string, { label: string; className: string }> = {
  AVAILABLE: { label: 'Available', className: 'bg-emerald-50 text-emerald-700' },
  RUNNING: { label: 'Running', className: 'bg-red-50 text-red-700' },
  FUTURE_BOOKED: { label: 'Future Booked', className: 'bg-amber-50 text-amber-700' },
  BOOKED: { label: 'Booked', className: 'bg-blue-50 text-blue-700' },
  HELD: { label: 'Held/Blocked', className: 'bg-purple-50 text-purple-700' },
};

export function AddAssetsDialog({
  open,
  onClose,
  existingAssetIds,
  onAddAssets,
  planStartDate,
  planEndDate,
}: AddAssetsDialogProps) {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [mediaTypeFilter, setMediaTypeFilter] = useState<string>("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("available");
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());

  // Compute date range for availability engine
  const rangeStart = useMemo(() => planStartDate || toDateString(new Date()), [planStartDate]);
  const rangeEnd = useMemo(() => {
    if (planEndDate) return planEndDate;
    const d = new Date(rangeStart);
    d.setFullYear(d.getFullYear() + 1);
    return toDateString(d);
  }, [planEndDate, rangeStart]);

  // Get all asset IDs for batch availability check
  const assetIds = useMemo(() => assets.filter(a => !existingAssetIds.includes(a.id)).map(a => a.id), [assets, existingAssetIds]);

  // Use unified availability engine — powered by asset_availability_view
  const { getStatus, loading: loadingAvailability } = useUnifiedAvailability(
    assetIds,
    rangeStart,
    rangeEnd,
    { enabled: open && assetIds.length > 0 }
  );

  useEffect(() => {
    if (open) {
      fetchAllAssets();
    }
  }, [open]);

  /**
   * Fetch ALL active media assets (not filtered by booking status).
   * Availability is determined by the booking engine, not media_assets.status.
   * Removed/inactive assets are excluded from planning.
   */
  const fetchAllAssets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('media_assets')
        .select('*')
        .eq('operational_status', 'active')
        .order('city', { ascending: true });

      if (error) throw error;
      setAssets(data || []);
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

  // Filter assets excluding already-added ones
  const displayAssets = useMemo(() => {
    let filtered = assets.filter(a => !existingAssetIds.includes(a.id));

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

    if (cityFilter !== "all") {
      filtered = filtered.filter(asset => asset.city === cityFilter);
    }

    if (mediaTypeFilter !== "all") {
      filtered = filtered.filter(asset => asset.media_type === mediaTypeFilter);
    }

    // Availability filter using unified engine
    if (availabilityFilter !== "all") {
      filtered = filtered.filter(asset => {
        const result = getStatus(asset.id);
        if (availabilityFilter === "available") return result.availability_status === 'AVAILABLE';
        if (availabilityFilter === "booked") return result.availability_status === 'RUNNING' || result.availability_status === 'BOOKED' || result.availability_status === 'FUTURE_BOOKED';
        if (availabilityFilter === "blocked") return result.availability_status === 'HELD';
        return true;
      });
    }

    return filtered;
  }, [assets, existingAssetIds, searchTerm, cityFilter, mediaTypeFilter, availabilityFilter, getStatus]);

  const cities = Array.from(new Set(assets.map(a => a.city).filter(Boolean))).sort();
  const mediaTypes = Array.from(new Set(assets.map(a => a.media_type).filter(Boolean))).sort();

  const toggleAssetSelection = (assetId: string) => {
    // Only allow selecting available assets (unified engine)
    const result = getStatus(assetId);
    if (result.availability_status !== 'AVAILABLE') return;

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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Add Assets to Plan</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, location, or area..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={cityFilter} onValueChange={setCityFilter}>
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
            <Select value={mediaTypeFilter} onValueChange={setMediaTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Media Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {mediaTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Availability" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="booked">Booked</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Assets table */}
          <div className="border rounded-lg max-h-[500px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Asset ID</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Media Type</TableHead>
                  <TableHead className="text-right">Card Rate</TableHead>
                  <TableHead>Availability</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(loading || loadingAvailability) ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading assets...
                    </TableCell>
                  </TableRow>
                ) : displayAssets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      No assets found matching filters
                    </TableCell>
                  </TableRow>
                ) : (
                  displayAssets.map((asset) => {
                    const result = getStatus(asset.id);
                    const isAvailable = result.availability_status === 'AVAILABLE';
                    const badge = AVAILABILITY_BADGE[result.availability_status];

                    return (
                      <TableRow
                        key={asset.id}
                        className={!isAvailable ? "opacity-60" : undefined}
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedAssets.has(asset.id)}
                            onChange={() => toggleAssetSelection(asset.id)}
                            disabled={!isAvailable}
                            className="h-4 w-4 rounded border-gray-300 disabled:cursor-not-allowed"
                          />
                        </TableCell>
                        <TableCell className="font-medium font-mono text-sm">{asset.media_asset_code || asset.id}</TableCell>
                        <TableCell>{asset.location}</TableCell>
                        <TableCell>{asset.city}</TableCell>
                        <TableCell>{asset.area}</TableCell>
                        <TableCell>{asset.media_type}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(asset.card_rate)}
                        </TableCell>
                        <TableCell>
                          {!isAvailable ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="outline" className={`${badge?.className} text-[10px] gap-1`}>
                                    {result.availability_status === 'HELD' ? <Shield className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                                    {badge?.label || result.availability_status}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-xs">
                                  <div className="space-y-1 text-xs">
                                    <p className="font-medium">
                                      {result.booking_type === 'CAMPAIGN' ? 'Campaign' : result.booking_type === 'HOLD' ? 'Hold' : 'Booking'}:
                                      {' '}{result.blocking_entity_name || result.blocking_entity_id || 'Unknown'}
                                    </p>
                                    {result.client_name && <p>Client: {result.client_name}</p>}
                                    {result.booking_start && result.booking_end && (
                                      <p>{result.booking_start} → {result.booking_end}</p>
                                    )}
                                    {result.next_available_date && (
                                      <p className="text-primary font-medium">
                                        Available from: {result.next_available_date}
                                      </p>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 text-[10px]">
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
              {' · '}{displayAssets.length} shown
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
