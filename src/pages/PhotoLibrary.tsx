import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { 
  Search, 
  Download, 
  Heart, 
  Filter, 
  Image as ImageIcon,
  MapPin,
  Calendar,
  Tag,
  Grid3x3,
  List,
  Loader2,
  Star,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import SidebarLayout from '@/layouts/SidebarLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import JSZip from 'jszip';
import { logActivity } from '@/utils/activityLogger';

interface OperationsPhoto {
  id: string;
  campaign_id: string;
  asset_id: string;
  tag: string;
  photo_url: string;
  uploaded_at: string;
  latitude: number | null;
  longitude: number | null;
  validation_score: number | null;
  isFavorite?: boolean;
}

export default function PhotoLibrary() {
  const [photos, setPhotos] = useState<OperationsPhoto[]>([]);
  const [filteredPhotos, setFilteredPhotos] = useState<OperationsPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [downloading, setDownloading] = useState(false);
  
  // Filters
  const [filterTag, setFilterTag] = useState<string>('all');
  const [filterCampaign, setFilterCampaign] = useState<string>('all');
  const [filterAsset, setFilterAsset] = useState<string>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  
  // Available filter options
  const [campaigns, setCampaigns] = useState<string[]>([]);
  const [assets, setAssets] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    loadPhotos();
    const cleanup = setupRealtimeSubscription();
    return cleanup;
  }, []);

  useEffect(() => {
    applyFilters();
  }, [photos, searchTerm, filterTag, filterCampaign, filterAsset, showFavoritesOnly]);

  const loadPhotos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load photos
      const { data: photosData, error: photosError } = await supabase
        .from('operations_photos')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (photosError) throw photosError;

      // Load favorites
      const { data: favoritesData, error: favError } = await supabase
        .from('photo_favorites')
        .select('photo_id')
        .eq('user_id', user.id);

      if (favError) throw favError;

      const favoriteIds = new Set(favoritesData?.map(f => f.photo_id) || []);

      const photosWithFavorites = (photosData || []).map(photo => ({
        ...photo,
        isFavorite: favoriteIds.has(photo.id),
      }));

      setPhotos(photosWithFavorites);

      // Extract unique values for filters
      const uniqueCampaigns = [...new Set(photosData?.map(p => p.campaign_id) || [])];
      const uniqueAssets = [...new Set(photosData?.map(p => p.asset_id) || [])];
      const uniqueTags = [...new Set(photosData?.map(p => p.tag) || [])];

      setCampaigns(uniqueCampaigns);
      setAssets(uniqueAssets);
      setTags(uniqueTags);

      // Log activity
      await logActivity('view', 'operation_photo', undefined, 'Photo Library');
    } catch (error: any) {
      console.error('Error loading photos:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load photos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('photo-library-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'operations_photos',
        },
        () => {
          loadPhotos();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'photo_favorites',
        },
        () => {
          loadPhotos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const applyFilters = () => {
    let filtered = [...photos];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        photo =>
          photo.asset_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          photo.campaign_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          photo.tag.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Tag filter
    if (filterTag !== 'all') {
      filtered = filtered.filter(photo => photo.tag === filterTag);
    }

    // Campaign filter
    if (filterCampaign !== 'all') {
      filtered = filtered.filter(photo => photo.campaign_id === filterCampaign);
    }

    // Asset filter
    if (filterAsset !== 'all') {
      filtered = filtered.filter(photo => photo.asset_id === filterAsset);
    }

    // Favorites filter
    if (showFavoritesOnly) {
      filtered = filtered.filter(photo => photo.isFavorite);
    }

    setFilteredPhotos(filtered);
  };

  const toggleFavorite = async (photoId: string) => {
    const photo = photos.find(p => p.id === photoId);
    if (!photo) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (photo.isFavorite) {
        // Remove from favorites
        await supabase
          .from('photo_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('photo_id', photoId);
      } else {
        // Add to favorites
        await supabase
          .from('photo_favorites')
          .insert({
            user_id: user.id,
            photo_id: photoId,
          });
      }

      // Update local state
      setPhotos(photos.map(p =>
        p.id === photoId ? { ...p, isFavorite: !p.isFavorite } : p
      ));

      toast({
        title: photo.isFavorite ? 'Removed from favorites' : 'Added to favorites',
        description: photo.isFavorite ? 'Photo removed from your favorites' : 'Photo added to your favorites',
      });
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update favorites',
        variant: 'destructive',
      });
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

  const selectAll = () => {
    setSelectedPhotos(new Set(filteredPhotos.map(p => p.id)));
  };

  const deselectAll = () => {
    setSelectedPhotos(new Set());
  };

  const downloadSelectedPhotos = async () => {
    if (selectedPhotos.size === 0) {
      toast({
        title: 'No photos selected',
        description: 'Please select at least one photo to download',
        variant: 'destructive',
      });
      return;
    }

    setDownloading(true);
    try {
      const zip = new JSZip();
      const selectedPhotosList = filteredPhotos.filter(p => selectedPhotos.has(p.id));

      // Download each photo and add to zip
      for (const photo of selectedPhotosList) {
        try {
          const response = await fetch(photo.photo_url);
          const blob = await response.blob();
          const fileName = `${photo.asset_id}_${photo.tag}_${format(new Date(photo.uploaded_at), 'yyyy-MM-dd')}.jpg`;
          zip.file(fileName, blob);
        } catch (error) {
          console.error(`Failed to download ${photo.photo_url}:`, error);
        }
      }

      // Generate and download zip
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `proof_photos_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Log activity
      await logActivity(
        'download',
        'operation_photo',
        undefined,
        `Bulk download: ${selectedPhotos.size} photos`,
        { count: selectedPhotos.size }
      );

      toast({
        title: 'Download complete',
        description: `Downloaded ${selectedPhotos.size} photo${selectedPhotos.size !== 1 ? 's' : ''} as ZIP`,
      });

      deselectAll();
    } catch (error: any) {
      console.error('Error downloading photos:', error);
      toast({
        title: 'Download failed',
        description: error.message || 'Failed to download photos',
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterTag('all');
    setFilterCampaign('all');
    setFilterAsset('all');
    setShowFavoritesOnly(false);
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ImageIcon className="h-8 w-8" />
            Photo Library
          </h1>
          <p className="text-muted-foreground mt-2">
            Browse, search, and manage all proof photos with advanced filters
          </p>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Search & Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by asset ID, campaign ID, or tag..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select value={filterTag} onValueChange={setFilterTag}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  {tags.map(tag => (
                    <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterCampaign} onValueChange={setFilterCampaign}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by campaign" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campaigns</SelectItem>
                  {campaigns.map(campaign => (
                    <SelectItem key={campaign} value={campaign}>{campaign}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterAsset} onValueChange={setFilterAsset}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by asset" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assets</SelectItem>
                  {assets.map(asset => (
                    <SelectItem key={asset} value={asset}>{asset}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="favorites"
                  checked={showFavoritesOnly}
                  onCheckedChange={(checked) => setShowFavoritesOnly(checked as boolean)}
                />
                <label htmlFor="favorites" className="text-sm font-medium flex items-center gap-1 cursor-pointer">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  Favorites Only
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
              <Separator orientation="vertical" className="h-8" />
              <Button variant="outline" size="sm" onClick={selectAll}>
                Select All ({filteredPhotos.length})
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAll}>
                Deselect All
              </Button>
              <div className="flex-1" />
              {selectedPhotos.size > 0 && (
                <Button onClick={downloadSelectedPhotos} disabled={downloading}>
                  {downloading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Download Selected ({selectedPhotos.size})
                    </>
                  )}
                </Button>
              )}
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'grid' | 'list')}>
                <TabsList>
                  <TabsTrigger value="grid">
                    <Grid3x3 className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="list">
                    <List className="h-4 w-4" />
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle>
              {filteredPhotos.length} Photo{filteredPhotos.length !== 1 ? 's' : ''}
              {showFavoritesOnly && ' (Favorites)'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredPhotos.length === 0 ? (
              <div className="text-center py-12">
                <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No photos found</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredPhotos.map(photo => (
                  <div key={photo.id} className="group relative">
                    <div className={cn(
                      "aspect-square rounded-lg overflow-hidden border-2 transition-all cursor-pointer",
                      selectedPhotos.has(photo.id) ? "border-primary" : "border-border"
                    )}>
                      <img
                        src={photo.photo_url}
                        alt={`${photo.asset_id} - ${photo.tag}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        onClick={() => togglePhotoSelection(photo.id)}
                      />
                      
                      {/* Selection Checkbox */}
                      <div className="absolute top-2 left-2">
                        <Checkbox
                          checked={selectedPhotos.has(photo.id)}
                          onCheckedChange={() => togglePhotoSelection(photo.id)}
                          className="bg-background/80 backdrop-blur"
                        />
                      </div>

                      {/* Favorite Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8 bg-background/80 backdrop-blur hover:bg-background"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(photo.id);
                        }}
                      >
                        <Heart className={cn(
                          "h-4 w-4",
                          photo.isFavorite && "fill-red-500 text-red-500"
                        )} />
                      </Button>

                      {/* Tag Badge */}
                      <Badge className="absolute bottom-2 left-2 bg-background/80 backdrop-blur">
                        {photo.tag}
                      </Badge>
                    </div>

                    {/* Photo Info */}
                    <div className="mt-2 space-y-1 text-xs">
                      <p className="font-medium truncate">{photo.asset_id}</p>
                      <p className="text-muted-foreground truncate">{photo.campaign_id}</p>
                      <p className="text-muted-foreground">
                        {format(new Date(photo.uploaded_at), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredPhotos.map(photo => (
                  <div
                    key={photo.id}
                    className={cn(
                      "flex items-center gap-4 p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer",
                      selectedPhotos.has(photo.id) && "bg-accent border-primary"
                    )}
                    onClick={() => togglePhotoSelection(photo.id)}
                  >
                    <Checkbox
                      checked={selectedPhotos.has(photo.id)}
                      onCheckedChange={() => togglePhotoSelection(photo.id)}
                    />
                    
                    <div className="w-16 h-16 rounded overflow-hidden shrink-0">
                      <img
                        src={photo.photo_url}
                        alt={`${photo.asset_id} - ${photo.tag}`}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{photo.asset_id}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {photo.tag}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(photo.uploaded_at), 'MMM dd, yyyy')}
                        </span>
                        {photo.latitude && photo.longitude && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            GPS
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{photo.campaign_id}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(photo.id);
                        }}
                      >
                        <Heart className={cn(
                          "h-4 w-4",
                          photo.isFavorite && "fill-red-500 text-red-500"
                        )} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                      >
                        <a href={photo.photo_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
