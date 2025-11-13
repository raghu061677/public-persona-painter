import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
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
  Eye
} from "lucide-react";
import { PhotoExportDialog } from "@/components/gallery/PhotoExportDialog";
import { PhotoApprovalDialog } from "@/components/gallery/PhotoApprovalDialog";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

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
}

export default function PhotoGallery() {
  const { roles } = useAuth();
  const canApprove = roles?.some(r => ['admin', 'operations'].includes(r)) || false;
  
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [filteredPhotos, setFilteredPhotos] = useState<PhotoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedPhotoForApproval, setSelectedPhotoForApproval] = useState<PhotoData | null>(null);
  const [organizationSettings, setOrganizationSettings] = useState<any>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAsset, setFilterAsset] = useState("");
  const [filterCampaign, setFilterCampaign] = useState("__all__");
  const [filterCategory, setFilterCategory] = useState("__all__");
  const [filterApprovalStatus, setFilterApprovalStatus] = useState("all");

  useEffect(() => {
    fetchPhotos();
    fetchOrganizationSettings();
  }, []);

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
      setPhotos(data || []);
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

  useEffect(() => {
    let result = photos;

    // Filter by search
    if (searchQuery) {
      result = result.filter(
        (photo) =>
          photo.asset_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          photo.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          photo.campaign_id?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by asset
    if (filterAsset) {
      result = result.filter((photo) => photo.asset_id === filterAsset);
    }

    // Filter by campaign
    if (filterCampaign && filterCampaign !== "__all__") {
      result = result.filter((photo) => photo.campaign_id === filterCampaign);
    }

    // Filter by category
    if (filterCategory && filterCategory !== "__all__") {
      result = result.filter((photo) => photo.category === filterCategory);
    }

    // Filter by approval status
    if (filterApprovalStatus !== "all") {
      result = result.filter((photo) => photo.approval_status === filterApprovalStatus);
    }

    setFilteredPhotos(result);
  }, [photos, searchQuery, filterAsset, filterCampaign, filterCategory, filterApprovalStatus]);

  const uniqueAssets = Array.from(new Set(photos.map((p) => p.asset_id)));
  const uniqueCampaigns = Array.from(new Set(photos.map((p) => p.campaign_id).filter(Boolean))) as string[];
  const uniqueCategories = Array.from(new Set(photos.map((p) => p.category)));

  const toggleSelectAll = () => {
    if (selectedPhotos.size === filteredPhotos.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(filteredPhotos.map((p) => p.id)));
    }
  };

  const handlePhotoSelect = (photoId: string) => {
    const newSelection = new Set(selectedPhotos);
    if (newSelection.has(photoId)) {
      newSelection.delete(photoId);
    } else {
      newSelection.add(photoId);
    }
    setSelectedPhotos(newSelection);
  };

  const handlePhotoClick = (photo: PhotoData) => {
    if (canApprove) {
      setSelectedPhotoForApproval(photo);
      setApprovalDialogOpen(true);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ImageIcon className="h-8 w-8" />
            Photo Gallery
          </h1>
          <p className="text-muted-foreground mt-1">
            Browse and manage all uploaded photos
          </p>
        </div>

        {selectedPhotos.size > 0 && (
          <Button onClick={() => setExportDialogOpen(true)}>
            <FileDown className="mr-2 h-4 w-4" />
            Export {selectedPhotos.size} Photo{selectedPhotos.size > 1 ? 's' : ''}
          </Button>
        )}
      </div>

      {/* Filters Card */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search
              </Label>
              <Input
                placeholder="Search by asset, campaign, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Asset Filter */}
            <div className="space-y-2">
              <Label>Asset</Label>
              <Select value={filterAsset} onValueChange={setFilterAsset}>
                <SelectTrigger>
                  <SelectValue placeholder="All Assets" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="__none__">All Assets</SelectItem>
                  {uniqueAssets.map((asset) => (
                    <SelectItem key={asset} value={asset}>
                      {asset}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Campaign Filter */}
            <div className="space-y-2">
              <Label>Campaign</Label>
              <Select value={filterCampaign} onValueChange={setFilterCampaign}>
                <SelectTrigger>
                  <SelectValue placeholder="All Campaigns" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="__all__">All Campaigns</SelectItem>
                  {uniqueCampaigns.map((campaign) => (
                    <SelectItem key={campaign} value={campaign}>
                      {campaign}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="__all__">All Categories</SelectItem>
                  {uniqueCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Approval Status Filter */}
            {canApprove && (
              <div className="space-y-2">
                <Label>Approval Status</Label>
                <Select value={filterApprovalStatus} onValueChange={setFilterApprovalStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Selection Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSelectAll}
            className="gap-2"
          >
            {selectedPhotos.size === filteredPhotos.length ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            {selectedPhotos.size === filteredPhotos.length ? "Deselect All" : "Select All"}
          </Button>
          {selectedPhotos.size > 0 && (
            <span className="text-sm text-muted-foreground">
              {selectedPhotos.size} of {filteredPhotos.length} selected
            </span>
          )}
        </div>
        <span className="text-sm text-muted-foreground">
          Total: {filteredPhotos.length} photo{filteredPhotos.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Photo Grid */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading photos...</p>
        </div>
      ) : filteredPhotos.length === 0 ? (
        <div className="text-center py-12">
          <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
          <p className="text-muted-foreground mt-4">No photos found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPhotos.map((photo) => (
            <Card
              key={photo.id}
              className="group relative overflow-hidden rounded-lg border bg-card hover:shadow-lg transition-all cursor-pointer"
              onClick={() => handlePhotoClick(photo)}
            >
              <div className="aspect-square overflow-hidden bg-muted">
                <img
                  src={photo.photo_url}
                  alt={`${photo.asset_id} - ${photo.category}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Checkbox
                      checked={selectedPhotos.has(photo.id)}
                      onCheckedChange={() => handlePhotoSelect(photo.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{photo.asset_id}</p>
                      <p className="text-xs text-muted-foreground">{photo.category}</p>
                    </div>
                  </div>
                  {getStatusBadge(photo.approval_status)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(photo.uploaded_at).toLocaleDateString()}
                </div>
                {canApprove && photo.approval_status === "pending" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePhotoClick(photo);
                    }}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Review
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <PhotoExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        selectedPhotos={Array.from(selectedPhotos).map(id => 
          photos.find(p => p.id === id)!
        ).filter(Boolean)}
        organizationSettings={organizationSettings}
      />

      <PhotoApprovalDialog
        open={approvalDialogOpen}
        onOpenChange={setApprovalDialogOpen}
        photo={selectedPhotoForApproval}
        onApprovalChange={() => {
          fetchPhotos();
          setSelectedPhotoForApproval(null);
        }}
      />
    </div>
  );
}
