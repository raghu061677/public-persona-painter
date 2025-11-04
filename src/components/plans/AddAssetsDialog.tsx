import { useState, useEffect } from "react";
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
import { Plus, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/utils/mediaAssets";

interface AddAssetsDialogProps {
  open: boolean;
  onClose: () => void;
  existingAssetIds: string[];
  onAddAssets: (assets: any[]) => void;
}

export function AddAssetsDialog({
  open,
  onClose,
  existingAssetIds,
  onAddAssets,
}: AddAssetsDialogProps) {
  const [assets, setAssets] = useState<any[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [mediaTypeFilter, setMediaTypeFilter] = useState<string>("all");
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      fetchAvailableAssets();
    }
  }, [open]);

  useEffect(() => {
    filterAssets();
  }, [assets, searchTerm, cityFilter, mediaTypeFilter]);

  const fetchAvailableAssets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('media_assets')
        .select('*')
        .eq('status', 'Available')
        .order('city', { ascending: true });

      if (error) throw error;

      // Filter out assets already in the plan
      const availableAssets = data?.filter(
        asset => !existingAssetIds.includes(asset.id)
      ) || [];

      setAssets(availableAssets);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch available assets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAssets = () => {
    let filtered = [...assets];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        asset =>
          asset.id.toLowerCase().includes(term) ||
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

    setFilteredAssets(filtered);
  };

  const cities = Array.from(new Set(assets.map(a => a.city).filter(Boolean)));
  const mediaTypes = Array.from(new Set(assets.map(a => a.media_type).filter(Boolean)));

  const toggleAssetSelection = (assetId: string) => {
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
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, location, or area..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-[180px]">
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading assets...
                    </TableCell>
                  </TableRow>
                ) : filteredAssets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      No available assets found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssets.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedAssets.has(asset.id)}
                          onChange={() => toggleAssetSelection(asset.id)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </TableCell>
                      <TableCell className="font-medium">{asset.id}</TableCell>
                      <TableCell>{asset.location}</TableCell>
                      <TableCell>{asset.city}</TableCell>
                      <TableCell>{asset.area}</TableCell>
                      <TableCell>{asset.media_type}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(asset.card_rate)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {selectedAssets.size} asset(s) selected
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
