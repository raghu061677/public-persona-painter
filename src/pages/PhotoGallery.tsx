import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  Image as ImageIcon, 
  Search, 
  FileDown, 
  CheckSquare, 
  Square,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Star,
  Grid3x3,
  List,
  Play,
  Calendar
} from "lucide-react";
import { BulkQRWatermarkButton } from "@/components/gallery/BulkQRWatermarkButton";
import { PhotoExportDialog } from "@/components/gallery/PhotoExportDialog";
import { PhotoApprovalDialog } from "@/components/gallery/PhotoApprovalDialog";
import { PhotoSlideshow } from "@/components/media-assets/PhotoSlideshow";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";

interface PhotoData {
  id: string;
  asset_id: string;
  campaign_id: string | null;
  client_id: string | null;
  photo_url: string;
  category: string;
  uploaded_at: string;
  approval_status: string;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  tags?: string[];
  isFavorite?: boolean;
  // Enriched asset info
  asset_code?: string;
  asset_location?: string;
}

export default function PhotoGallery() {
  const { roles, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const canApprove = roles?.some(r => ['admin', 'operations'].includes(r)) || false;
  
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [filteredPhotos, setFilteredPhotos] = useState<PhotoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedPhotoForApproval, setSelectedPhotoForApproval] = useState<PhotoData | null>(null);
  const [organizationSettings, setOrganizationSettings] = useState<any>(null);
  const [slideshowOpen, setSlideshowOpen] = useState(false);
  const [slideshowIndex, setSlideshowIndex] = useState(0);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAsset, setFilterAsset] = useState("__all__");
  const [filterCampaign, setFilterCampaign] = useState("__all__");
  const [filterCategory, setFilterCategory] = useState("__all__");
  const [filterApprovalStatus, setFilterApprovalStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Unique values for dropdowns
  const [uniqueAssets, setUniqueAssets] = useState<string[]>([]);
  const [uniqueCampaigns, setUniqueCampaigns] = useState<string[]>([]);
  const [uniqueCategories, setUniqueCategories] = useState<string[]>([]);

  // Initialize filter from URL params on mount
  useEffect(() => {
    const assetParam = searchParams.get('asset');
    if (assetParam) {
      setFilterAsset(assetParam);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchPhotos();
    fetchOrganizationSettings();
    loadFavorites();
  }, []);

  useEffect(() => {
    filterPhotosData();
  }, [
    searchQuery, 
    filterAsset, 
    filterCampaign, 
    filterCategory, 
    filterApprovalStatus, 
    dateFrom, 
    dateTo, 
    photos,
    showFavoritesOnly
  ]);

  const loadFavorites = async () => {
    if (!user?.id) return;
    
    const { data } = await supabase
      .from('photo_favorites')
      .select('photo_id')
      .eq('user_id', user.id);
    
    if (data) {
      setFavorites(new Set(data.map(f => f.photo_id)));
    }
  };

  const toggleFavorite = async (photoId: string) => {
    if (!user?.id) return;
    
    const isFavorite = favorites.has(photoId);
    
    if (isFavorite) {
      await supabase
        .from('photo_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('photo_id', photoId);
      
      const newFavorites = new Set(favorites);
      newFavorites.delete(photoId);
      setFavorites(newFavorites);
    } else {
      await supabase
        .from('photo_favorites')
        .insert({ user_id: user.id, photo_id: photoId });
      
      setFavorites(new Set([...favorites, photoId]));
    }
  };

  const fetchOrganizationSettings = async () => {
    const { data } = await supabase
      .from("organization_settings")
      .select("organization_name, logo_url")
      .single();
    
    if (data) {
      setOrganizationSettings(data);
    }
  };

  const fetchPhotos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("media_photos")
        .select("*")
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      
      // Collect unique asset IDs to fetch their details
      const assetIds = new Set<string>();
      const potentialCampaignAssetIds = new Set<string>(); // UUIDs that might be campaign_assets.id
      
      (data || []).forEach(photo => {
        if (photo.asset_id) {
          assetIds.add(photo.asset_id);
          // Check if it looks like a UUID (campaign_assets.id) vs a code like "HYD-BQS-0001"
          if (photo.asset_id.includes('-') && photo.asset_id.length === 36) {
            potentialCampaignAssetIds.add(photo.asset_id);
          }
        }
      });
      
      // Fetch media asset details for all unique asset IDs
      let assetDetailsMap: Record<string, { media_asset_code: string; location: string; actual_asset_id: string }> = {};
      
      if (assetIds.size > 0) {
        // First try to find in media_assets directly
        const { data: assetsData } = await supabase
          .from("media_assets")
          .select("id, media_asset_code, location")
          .in("id", Array.from(assetIds));
        
        if (assetsData) {
          assetsData.forEach(asset => {
            assetDetailsMap[asset.id] = {
              media_asset_code: asset.media_asset_code || asset.id,
              location: asset.location || '',
              actual_asset_id: asset.id
            };
          });
        }
      }
      
      // For UUIDs that weren't found in media_assets, check campaign_assets table
      const missingUuids = Array.from(potentialCampaignAssetIds).filter(id => !assetDetailsMap[id]);
      if (missingUuids.length > 0) {
        const { data: campaignAssetsData } = await supabase
          .from("campaign_assets")
          .select("id, asset_id, location")
          .in("id", missingUuids);
        
        if (campaignAssetsData && campaignAssetsData.length > 0) {
          // Get the actual media asset details for these
          const mediaAssetIds = campaignAssetsData.map(ca => ca.asset_id);
          const { data: mediaAssetsData } = await supabase
            .from("media_assets")
            .select("id, media_asset_code, location")
            .in("id", mediaAssetIds);
          
          const mediaAssetLookup: Record<string, { media_asset_code: string; location: string }> = {};
          if (mediaAssetsData) {
            mediaAssetsData.forEach(ma => {
              mediaAssetLookup[ma.id] = {
                media_asset_code: ma.media_asset_code || ma.id,
                location: ma.location || ''
              };
            });
          }
          
          // Map campaign_assets.id to their actual media asset details
          campaignAssetsData.forEach(ca => {
            const mediaDetails = mediaAssetLookup[ca.asset_id];
            assetDetailsMap[ca.id] = {
              media_asset_code: mediaDetails?.media_asset_code || ca.asset_id,
              location: mediaDetails?.location || ca.location || '',
              actual_asset_id: ca.asset_id
            };
          });
        }
      }
      
      const photosWithDetails = (data || []).map(photo => {
        const assetDetails = assetDetailsMap[photo.asset_id];
        return {
          ...photo,
          isFavorite: favorites.has(photo.id),
          // Use asset_code from media_assets, or fallback to asset_id if it looks like a code
          asset_code: assetDetails?.media_asset_code || photo.asset_id,
          asset_location: assetDetails?.location || '',
          // Store the actual media asset ID for navigation
          asset_id: assetDetails?.actual_asset_id || photo.asset_id
        };
      });
      
      setPhotos(photosWithDetails);

      // Extract unique values - use the readable asset codes for display
      const assets = new Set<string>();
      const campaigns = new Set<string>();
      const categories = new Set<string>();

      photosWithDetails.forEach((photo) => {
        // Use asset_code for filters if available
        assets.add(photo.asset_code || photo.asset_id);
        if (photo.campaign_id) campaigns.add(photo.campaign_id);
        categories.add(photo.category);
      });

      setUniqueAssets(Array.from(assets));
      setUniqueCampaigns(Array.from(campaigns));
      setUniqueCategories(Array.from(categories));
    } catch (error: any) {
      toast({
        title: "Error loading photos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterPhotosData = () => {
    let result = photos;

    // Search filter - search both asset_code and asset_id
    if (searchQuery) {
      result = result.filter(
        (photo) =>
          (photo.asset_code || photo.asset_id).toLowerCase().includes(searchQuery.toLowerCase()) ||
          photo.asset_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          photo.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          photo.campaign_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          photo.asset_location?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Asset filter - match by asset_code or asset_id
    if (filterAsset && filterAsset !== "__all__") {
      result = result.filter((photo) => 
        (photo.asset_code === filterAsset) || (photo.asset_id === filterAsset)
      );
    }

    // Campaign filter
    if (filterCampaign && filterCampaign !== "__all__") {
      result = result.filter((photo) => photo.campaign_id === filterCampaign);
    }

    // Category filter
    if (filterCategory && filterCategory !== "__all__") {
      result = result.filter((photo) => photo.category === filterCategory);
    }

    // Approval status filter
    if (filterApprovalStatus && filterApprovalStatus !== "all") {
      result = result.filter((photo) => photo.approval_status === filterApprovalStatus);
    }

    // Date range filter
    if (dateFrom) {
      result = result.filter((photo) => new Date(photo.uploaded_at) >= new Date(dateFrom));
    }
    if (dateTo) {
      result = result.filter((photo) => new Date(photo.uploaded_at) <= new Date(dateTo));
    }

    // Favorites filter
    if (showFavoritesOnly) {
      result = result.filter((photo) => favorites.has(photo.id));
    }

    setFilteredPhotos(result);
  };

  const handlePhotoClick = (photo: PhotoData) => {
    if (canApprove && photo.approval_status === 'pending') {
      setSelectedPhotoForApproval(photo);
      setApprovalDialogOpen(true);
    }
  };

  const togglePhotoSelection = (photoId: string) => {
    const newSelection = new Set(selectedPhotos);
    if (newSelection.has(photoId)) {
      newSelection.delete(photoId);
    } else {
      newSelection.add(photoId);
    }
    setSelectedPhotos(newSelection);
  };

  const selectAllPhotos = () => {
    if (selectedPhotos.size === filteredPhotos.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(filteredPhotos.map((p) => p.id)));
    }
  };

  const handleApprovalChange = () => {
    fetchPhotos();
    setApprovalDialogOpen(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-success/20 text-success border-success"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-destructive/20 text-destructive border-destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const openSlideshow = (index: number) => {
    setSlideshowIndex(index);
    setSlideshowOpen(true);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setFilterAsset("__all__");
    setFilterCampaign("__all__");
    setFilterCategory("__all__");
    setFilterApprovalStatus("all");
    setDateFrom("");
    setDateTo("");
    setShowFavoritesOnly(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading photos...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Photo Gallery</h1>
        <p className="text-muted-foreground mt-1">
          Browse, manage, and export all media photos
        </p>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search & Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div>
            <Label>Search</Label>
            <Input
              placeholder="Search by asset, campaign, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
          </div>

          {/* Filter Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Asset</Label>
              <Select value={filterAsset} onValueChange={setFilterAsset}>
                <SelectTrigger>
                  <SelectValue placeholder="All Assets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Assets</SelectItem>
                  {uniqueAssets.map((asset) => (
                    <SelectItem key={asset} value={asset}>{asset}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Campaign</Label>
              <Select value={filterCampaign} onValueChange={setFilterCampaign}>
                <SelectTrigger>
                  <SelectValue placeholder="All Campaigns" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Campaigns</SelectItem>
                  {uniqueCampaigns.map((campaign) => (
                    <SelectItem key={campaign} value={campaign}>{campaign}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Category</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Categories</SelectItem>
                  {uniqueCategories.map((category) => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Approval Status</Label>
              <Select value={filterApprovalStatus} onValueChange={setFilterApprovalStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filter Row 2 - Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>From Date</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Label>To Date</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={showFavoritesOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            >
              <Star className="w-4 h-4 mr-2" />
              {showFavoritesOnly ? "Showing Favorites" : "Show Favorites"}
            </Button>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
            <BulkQRWatermarkButton />
            <Button
              variant="outline"
              size="sm"
              onClick={() => openSlideshow(0)}
              disabled={filteredPhotos.length === 0}
            >
              <Play className="w-4 h-4 mr-2" />
              Slideshow
            </Button>
            <div className="ml-auto flex gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selection Actions */}
      {selectedPhotos.size > 0 && (
        <Card className="bg-primary/5 border-primary">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-primary" />
                <span className="font-medium">{selectedPhotos.size} photo(s) selected</span>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setExportDialogOpen(true)}>
                  <FileDown className="w-4 h-4 mr-2" />
                  Export Selected
                </Button>
                <Button variant="outline" onClick={() => setSelectedPhotos(new Set())}>
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {filteredPhotos.length} Photo{filteredPhotos.length !== 1 ? 's' : ''} Found
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={selectAllPhotos}
            >
              {selectedPhotos.size === filteredPhotos.length ? <Square /> : <CheckSquare />}
              {selectedPhotos.size === filteredPhotos.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPhotos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p>No photos found matching your filters</p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredPhotos.map((photo, index) => (
                <div
                  key={photo.id}
                  className="group relative rounded-lg border bg-card overflow-hidden hover:shadow-lg transition-all"
                >
                  <div className="absolute top-2 left-2 z-10">
                    <Checkbox
                      checked={selectedPhotos.has(photo.id)}
                      onCheckedChange={() => togglePhotoSelection(photo.id)}
                      className="bg-background"
                    />
                  </div>
                  <div className="absolute top-2 right-2 z-10">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 bg-background/80 hover:bg-background"
                      onClick={() => toggleFavorite(photo.id)}
                    >
                      <Star
                        className={`w-4 h-4 ${
                          favorites.has(photo.id)
                            ? 'fill-yellow-500 text-yellow-500'
                            : 'text-muted-foreground'
                        }`}
                      />
                    </Button>
                  </div>
                  
                  <div 
                    className="aspect-square cursor-pointer"
                    onClick={() => openSlideshow(index)}
                  >
                    <img
                      src={photo.photo_url}
                      alt={photo.category}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {photo.category}
                      </Badge>
                      {getStatusBadge(photo.approval_status)}
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      <div 
                        className="font-medium text-primary hover:underline cursor-pointer"
                        onClick={() => navigate(`/admin/media-assets/${photo.asset_id}`)}
                      >
                        {photo.asset_code || photo.asset_id}
                      </div>
                      {photo.asset_location && (
                        <div className="text-muted-foreground text-xs truncate" title={photo.asset_location}>
                          {photo.asset_location}
                        </div>
                      )}
                      {photo.campaign_id && (
                        <div className="text-muted-foreground text-xs">
                          Campaign: {photo.campaign_id}
                        </div>
                      )}
                      <div className="text-muted-foreground text-xs flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(photo.uploaded_at), 'PP')}
                      </div>
                    </div>
                    
                    {canApprove && photo.approval_status === 'pending' && (
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => handlePhotoClick(photo)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Review
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPhotos.map((photo, index) => (
                <div
                  key={photo.id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/5 transition-colors"
                >
                  <Checkbox
                    checked={selectedPhotos.has(photo.id)}
                    onCheckedChange={() => togglePhotoSelection(photo.id)}
                  />
                  <img
                    src={photo.photo_url}
                    alt={photo.category}
                    className="w-20 h-20 object-cover rounded cursor-pointer"
                    onClick={() => openSlideshow(index)}
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span 
                        className="font-medium text-primary hover:underline cursor-pointer"
                        onClick={() => navigate(`/admin/media-assets/${photo.asset_id}`)}
                      >
                        {photo.asset_code || photo.asset_id}
                      </span>
                      <Badge variant="outline" className="text-xs">{photo.category}</Badge>
                      {getStatusBadge(photo.approval_status)}
                    </div>
                    {photo.asset_location && (
                      <div className="text-sm text-muted-foreground truncate" title={photo.asset_location}>
                        {photo.asset_location}
                      </div>
                    )}
                    {photo.campaign_id && (
                      <div className="text-sm text-muted-foreground">
                        Campaign: {photo.campaign_id}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(photo.uploaded_at), 'PPp')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleFavorite(photo.id)}
                    >
                      <Star
                        className={`w-4 h-4 ${
                          favorites.has(photo.id)
                            ? 'fill-yellow-500 text-yellow-500'
                            : 'text-muted-foreground'
                        }`}
                      />
                    </Button>
                    {canApprove && photo.approval_status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => handlePhotoClick(photo)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Review
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <PhotoExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        selectedPhotos={filteredPhotos.filter(p => selectedPhotos.has(p.id))}
        organizationSettings={organizationSettings}
      />

      <PhotoApprovalDialog
        open={approvalDialogOpen}
        onOpenChange={setApprovalDialogOpen}
        photo={selectedPhotoForApproval}
        onApprovalChange={handleApprovalChange}
      />

      <PhotoSlideshow
        open={slideshowOpen}
        onOpenChange={setSlideshowOpen}
        photos={filteredPhotos.map(p => ({ url: p.photo_url, tag: p.category, uploaded_at: p.uploaded_at }))}
        initialIndex={slideshowIndex}
      />
    </div>
  );
}
