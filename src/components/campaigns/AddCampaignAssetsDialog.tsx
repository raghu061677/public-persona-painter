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
import { Plus, Search, AlertTriangle } from "lucide-react";
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
  const [filteredAssets, setFilteredAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [mediaTypeFilter, setMediaTypeFilter] = useState<string>("all");
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [companyPrefix, setCompanyPrefix] = useState<string | null>(null);
  const [assetConflicts, setAssetConflicts] = useState<Map<string, ConflictInfo[]>>(new Map());
  const [checkingConflicts, setCheckingConflicts] = useState(false);

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
          // Use company name to generate prefix via formatAssetDisplayCode's getCompanyAcronym
          setCompanyPrefix(company.name || null);
        }
      }
    } catch (error) {
      console.error('Error fetching company settings:', error);
    }
  };

  useEffect(() => {
    if (open) {
      fetchAvailableAssets();
      setSelectedAssets(new Set());
      setAssetConflicts(new Map());
    }
  }, [open]);

  useEffect(() => {
    filterAssets();
  }, [assets, searchTerm, cityFilter, mediaTypeFilter, assetConflicts]);

  const formatDateForConflict = (date: Date | string | undefined): string | null => {
    if (!date) return null;
    if (typeof date === 'string') return date.split('T')[0];
    return format(date, 'yyyy-MM-dd');
  };

  const fetchAvailableAssets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('media_assets')
        .select('*')
        .eq('status', 'Available')
        .order('city', { ascending: true });

      if (error) throw error;

      // Filter out assets already in the campaign
      const availableAssets = data?.filter(
        asset => !existingAssetIds.includes(asset.id)
      ) || [];

      setAssets(availableAssets);

      // Check conflicts for all assets if we have campaign dates
      if (campaignStartDate && campaignEndDate && availableAssets.length > 0) {
        await checkConflictsForAssets(availableAssets);
      }
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
      // Check conflicts in batches to avoid overwhelming the database
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

  const filterAssets = () => {
    let filtered = [...assets];

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

    setFilteredAssets(filtered);
  };

  const cities = Array.from(new Set(assets.map(a => a.city).filter(Boolean)));
  const mediaTypes = Array.from(new Set(assets.map(a => a.media_type).filter(Boolean)));

  const hasConflict = (assetId: string): boolean => {
    return assetConflicts.has(assetId);
  };

  const getConflicts = (assetId: string): ConflictInfo[] => {
    return assetConflicts.get(assetId) || [];
  };

  const toggleAssetSelection = (assetId: string) => {
    // Prevent selection of conflicting assets
    if (hasConflict(assetId)) {
      const conflicts = getConflicts(assetId);
      toast({
        title: "Asset has booking conflict",
        description: `This asset is already booked in: ${conflicts.map(c => c.campaign_name).join(', ')}`,
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

  const conflictCount = Array.from(assetConflicts.keys()).length;

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
                  <TableHead className="w-[50px] text-center">S.No</TableHead>
                  <TableHead>Asset ID</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Media Type</TableHead>
                  <TableHead className="text-right">Card Rate</TableHead>
                  <TableHead className="w-16">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading || checkingConflicts ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      {loading ? "Loading assets..." : "Checking availability..."}
                    </TableCell>
                  </TableRow>
                ) : filteredAssets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      No available assets found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssets.map((asset, index) => {
                    const conflicts = getConflicts(asset.id);
                    const isConflicting = conflicts.length > 0;

                    return (
                      <TableRow 
                        key={asset.id}
                        className={isConflicting ? "bg-amber-50/50 dark:bg-amber-950/20" : ""}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedAssets.has(asset.id)}
                            onCheckedChange={() => toggleAssetSelection(asset.id)}
                            disabled={isConflicting}
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
                        <TableCell className="max-w-[200px] truncate">{asset.location}</TableCell>
                        <TableCell>{asset.city}</TableCell>
                        <TableCell>{asset.area}</TableCell>
                        <TableCell>{asset.media_type}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(asset.card_rate)}
                        </TableCell>
                        <TableCell>
                          {isConflicting ? (
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
