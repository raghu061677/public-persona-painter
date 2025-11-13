import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Search, 
  Filter, 
  Download, 
  MapPin, 
  Calendar,
  Image as ImageIcon,
  Grid3x3,
  List,
  CheckSquare,
  Play,
  Star,
  Tag,
  Plus,
  X
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { PhotoSlideshow } from "@/components/media-assets/PhotoSlideshow";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface PhotoItem {
  assetId: string;
  assetLocation?: string;
  assetCity?: string;
  url: string;
  tag: string;
  tags?: string[];
  uploaded_at: string;
  latitude?: number;
  longitude?: number;
  isFavorite?: boolean;
}

interface PhotoTag {
  id: string;
  name: string;
  color: string;
  usage_count: number;
}

export default function PhotoLibrary() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [filteredPhotos, setFilteredPhotos] = useState<PhotoItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [slideshowOpen, setSlideshowOpen] = useState(false);
  const [slideshowIndex, setSlideshowIndex] = useState(0);

  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [customTags, setCustomTags] = useState<PhotoTag[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedPhotoForTagging, setSelectedPhotoForTagging] = useState<PhotoItem | null>(null);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#6b7280");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadPhotos();
    loadCustomTags();
    loadFavorites();
  }, []);

  useEffect(() => {
    filterPhotos();
  }, [searchTerm, selectedTag, selectedCity, dateFrom, dateTo, photos, showFavoritesOnly]);

  const loadPhotos = async () => {
    try {
      setLoading(true);
      
      // Fetch all media assets with photos
      const { data: assets, error } = await supabase
        .from('media_assets')
        .select('id, location, city, area, images')
        .not('images', 'is', null);

      if (error) throw error;

      const allPhotos: PhotoItem[] = [];
      const tags = new Set<string>();
      const cities = new Set<string>();

      assets?.forEach(asset => {
        const imagesData = asset.images as any;
        if (imagesData?.photos && Array.isArray(imagesData.photos)) {
          imagesData.photos.forEach((photo: any) => {
            allPhotos.push({
              assetId: asset.id,
              assetLocation: asset.location,
              assetCity: asset.city,
              url: photo.url,
              tag: photo.tag,
              tags: photo.tags || [photo.tag],
              uploaded_at: photo.uploaded_at,
              latitude: photo.latitude,
              longitude: photo.longitude,
              isFavorite: favorites.has(photo.url),
            });
            tags.add(photo.tag);
            if (photo.tags) {
              photo.tags.forEach((t: string) => tags.add(t));
            }
          });
        }
        if (asset.city) cities.add(asset.city);
      });

      setPhotos(allPhotos);
      setAvailableTags(Array.from(tags).sort());
      setAvailableCities(Array.from(cities).sort());
    } catch (error: any) {
      console.error('Error loading photos:', error);
      toast({
        title: "Error",
        description: "Failed to load photo library",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCustomTags = async () => {
    try {
      const { data, error } = await supabase
        .from('photo_tags')
        .select('*')
        .order('usage_count', { ascending: false });

      if (error) throw error;
      setCustomTags(data || []);
    } catch (error: any) {
      console.error('Error loading custom tags:', error);
    }
  };

  const loadFavorites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('photo_favorites')
        .select('photo_id')
        .eq('user_id', user.id);

      if (error) throw error;
      setFavorites(new Set(data?.map(f => f.photo_id) || []));
    } catch (error: any) {
      console.error('Error loading favorites:', error);
    }
  };

  const toggleFavorite = async (photoUrl: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (favorites.has(photoUrl)) {
        await supabase
          .from('photo_favorites')
          .delete()
          .eq('photo_id', photoUrl)
          .eq('user_id', user.id);
        
        const newFavorites = new Set(favorites);
        newFavorites.delete(photoUrl);
        setFavorites(newFavorites);
      } else {
        await supabase
          .from('photo_favorites')
          .insert({ photo_id: photoUrl, user_id: user.id });
        
        setFavorites(new Set([...favorites, photoUrl]));
      }

      // Update photos
      setPhotos(photos.map(p => 
        p.url === photoUrl ? { ...p, isFavorite: !favorites.has(photoUrl) } : p
      ));
      
      toast({
        title: favorites.has(photoUrl) ? "Removed from favorites" : "Added to favorites",
      });
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      toast({
        title: "Error",
        description: "Failed to update favorite",
        variant: "destructive",
      });
    }
  };

  const createCustomTag = async () => {
    if (!newTagName.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('photo_tags')
        .insert({
          name: newTagName.trim(),
          color: newTagColor,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setCustomTags([...customTags, data]);
      setNewTagName("");
      setNewTagColor("#6b7280");
      
      toast({
        title: "Tag created",
        description: `"${data.name}" tag has been created`,
      });
    } catch (error: any) {
      console.error('Error creating tag:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create tag",
        variant: "destructive",
      });
    }
  };

  const addTagToPhoto = async (photoUrl: string, tagName: string) => {
    try {
      // Find the asset containing this photo
      const { data: assets, error: fetchError } = await supabase
        .from('media_assets')
        .select('id, images')
        .not('images', 'is', null);

      if (fetchError) throw fetchError;

      let targetAssetId = null;
      let updatedImages = null;

      for (const asset of assets || []) {
        const imagesData = asset.images as any;
        if (imagesData?.photos && Array.isArray(imagesData.photos)) {
          const photoIndex = imagesData.photos.findIndex((p: any) => p.url === photoUrl);
          if (photoIndex !== -1) {
            targetAssetId = asset.id;
            const currentTags = imagesData.photos[photoIndex].tags || [imagesData.photos[photoIndex].tag];
            if (!currentTags.includes(tagName)) {
              imagesData.photos[photoIndex].tags = [...currentTags, tagName];
              updatedImages = imagesData;
            }
            break;
          }
        }
      }

      if (targetAssetId && updatedImages) {
        const { error: updateError } = await supabase
          .from('media_assets')
          .update({ images: updatedImages })
          .eq('id', targetAssetId);

        if (updateError) throw updateError;

        // Update tag usage count
        const tagToUpdate = customTags.find(t => t.name === tagName);
        if (tagToUpdate) {
          await supabase
            .from('photo_tags')
            .update({ usage_count: tagToUpdate.usage_count + 1 })
            .eq('id', tagToUpdate.id);
        }

        // Reload photos and tags
        await loadPhotos();
        await loadCustomTags();
        
        toast({
          title: "Tag added",
          description: `"${tagName}" added to photo`,
        });
      }
    } catch (error: any) {
      console.error('Error adding tag:', error);
      toast({
        title: "Error",
        description: "Failed to add tag to photo",
        variant: "destructive",
      });
    }
  };

  const filterPhotos = () => {
    let filtered = [...photos];

    // Favorites filter
    if (showFavoritesOnly) {
      filtered = filtered.filter(photo => photo.isFavorite);
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(photo =>
        photo.assetId.toLowerCase().includes(term) ||
        photo.assetLocation?.toLowerCase().includes(term) ||
        photo.assetCity?.toLowerCase().includes(term) ||
        photo.tag.toLowerCase().includes(term) ||
        photo.tags?.some(t => t.toLowerCase().includes(term))
      );
    }

    // Tag filter
    if (selectedTag !== "all") {
      filtered = filtered.filter(photo => 
        photo.tag === selectedTag || photo.tags?.includes(selectedTag)
      );
    }

    // City filter
    if (selectedCity !== "all") {
      filtered = filtered.filter(photo => photo.assetCity === selectedCity);
    }

    // Date range filter
    if (dateFrom) {
      filtered = filtered.filter(photo => 
        new Date(photo.uploaded_at) >= new Date(dateFrom)
      );
    }
    if (dateTo) {
      filtered = filtered.filter(photo => 
        new Date(photo.uploaded_at) <= new Date(dateTo)
      );
    }

    setFilteredPhotos(filtered);
  };

  const togglePhotoSelection = (photoUrl: string) => {
    const newSelected = new Set(selectedPhotos);
    if (newSelected.has(photoUrl)) {
      newSelected.delete(photoUrl);
    } else {
      newSelected.add(photoUrl);
    }
    setSelectedPhotos(newSelected);
  };

  const selectAll = () => {
    if (selectedPhotos.size === filteredPhotos.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(filteredPhotos.map(p => p.url)));
    }
  };

  const downloadSelected = async () => {
    for (const photoUrl of selectedPhotos) {
      const link = document.createElement('a');
      link.href = photoUrl;
      link.download = photoUrl.split('/').pop() || 'photo.jpg';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    toast({
      title: "Download Started",
      description: `Downloading ${selectedPhotos.size} photo(s)`,
    });
  };

  const getTagColor = (tag: string) => {
    if (tag.includes('Traffic')) return 'bg-blue-500';
    if (tag.includes('Newspaper')) return 'bg-purple-500';
    if (tag.includes('Geo')) return 'bg-green-500';
    return 'bg-gray-500';
  };

  const getTagIcon = (tag: string) => {
    if (tag.includes('Traffic')) return '🚗';
    if (tag.includes('Newspaper')) return '📰';
    if (tag.includes('Geo')) return '📍';
    return '📷';
  };

  const openSlideshow = (index: number) => {
    setSlideshowIndex(index);
    setSlideshowOpen(true);
  };

  if (loading) {
    return (
      <div className="flex-1 p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Loading photo library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Photo Library</h1>
        <p className="text-muted-foreground">
          Browse, search, and manage all proof photos across all media assets
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters & Search
              </CardTitle>
              <CardDescription>
                {filteredPhotos.length} of {photos.length} photos
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Asset ID, Location, Tag..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Tag Filter */}
            <div className="space-y-2">
              <Label>Photo Type</Label>
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {availableTags.map(tag => (
                    <SelectItem key={tag} value={tag}>
                      {getTagIcon(tag)} {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* City Filter */}
            <div className="space-y-2">
              <Label>City</Label>
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {availableCities.map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date From */}
            <div className="space-y-2">
              <Label>Date From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date To */}
            <div className="space-y-2">
              <Label>Date To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className="space-y-2 lg:col-span-3 flex items-end gap-2">
              <Button
                variant={showFavoritesOnly ? "default" : "outline"}
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              >
                <Star className={`h-4 w-4 mr-2 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                Favorites
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Tag className="h-4 w-4 mr-2" />
                    Manage Tags
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Manage Photo Tags</DialogTitle>
                    <DialogDescription>
                      Create and manage custom tags for organizing your photos
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="New tag name"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                      />
                      <Input
                        type="color"
                        value={newTagColor}
                        onChange={(e) => setNewTagColor(e.target.value)}
                        className="w-20"
                      />
                      <Button onClick={createCustomTag}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {customTags.map(tag => (
                        <div key={tag.id} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded" 
                              style={{ backgroundColor: tag.color }}
                            />
                            <span>{tag.name}</span>
                            <Badge variant="secondary">{tag.usage_count}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedTag("all");
                  setSelectedCity("all");
                  setDateFrom("");
                  setDateTo("");
                  setShowFavoritesOnly(false);
                }}
              >
                Clear Filters
              </Button>
              {filteredPhotos.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => openSlideshow(0)}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Slideshow
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selection Actions */}
      {selectedPhotos.size > 0 && (
        <Card className="border-primary">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {selectedPhotos.size} photo(s) selected
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={downloadSelected}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedPhotos(new Set())}>
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photo Grid/List */}
      {filteredPhotos.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-2">
              <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">No photos found</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Results ({filteredPhotos.length})</CardTitle>
              <Button variant="outline" size="sm" onClick={selectAll}>
                <CheckSquare className="h-4 w-4 mr-2" />
                {selectedPhotos.size === filteredPhotos.length ? "Deselect All" : "Select All"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredPhotos.map((photo, index) => (
                  <div
                    key={photo.url}
                    className={`relative group border rounded-lg overflow-hidden hover:shadow-lg transition-all cursor-pointer ${
                      selectedPhotos.has(photo.url) ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    {/* Selection Checkbox & Favorite */}
                    <div className="absolute top-2 left-2 z-10 flex gap-2">
                      <Checkbox
                        checked={selectedPhotos.has(photo.url)}
                        onCheckedChange={() => togglePhotoSelection(photo.url)}
                        className="bg-white"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 bg-white hover:bg-white/90"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(photo.url);
                        }}
                      >
                        <Star 
                          className={`h-4 w-4 ${photo.isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`}
                        />
                      </Button>
                    </div>

                    {/* Image */}
                    <img
                      src={photo.url}
                      alt={photo.tag}
                      className="w-full h-48 object-cover"
                      onClick={() => openSlideshow(index)}
                    />

                    {/* Tag Badge */}
                    <div className="absolute top-2 right-2 flex flex-wrap gap-1 justify-end max-w-[50%]">
                      {(photo.tags || [photo.tag]).map((t, i) => (
                        <Badge 
                          key={i}
                          className={`${getTagColor(t)} text-white text-xs`}
                        >
                          {getTagIcon(t)} {t}
                        </Badge>
                      ))}
                    </div>

                    {/* Info Overlay */}
                    <div className="p-3 bg-background border-t">
                      <p className="font-medium text-sm truncate">{photo.assetId}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {photo.assetLocation}, {photo.assetCity}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(photo.uploaded_at), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      {photo.latitude && photo.longitude && (
                        <div className="flex items-center gap-2 mt-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">
                            GPS Available
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Hover Actions */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Tag className="h-4 w-4 mr-1" />
                            Tag
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48" onClick={(e) => e.stopPropagation()}>
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Add Tag</p>
                            {customTags.map(tag => (
                              <Button
                                key={tag.id}
                                size="sm"
                                variant="ghost"
                                className="w-full justify-start"
                                onClick={() => addTagToPhoto(photo.url, tag.name)}
                              >
                                <div 
                                  className="w-3 h-3 rounded mr-2" 
                                  style={{ backgroundColor: tag.color }}
                                />
                                {tag.name}
                              </Button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/media-assets/${photo.assetId}`);
                        }}
                      >
                        View Asset
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(photo.url, '_blank');
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredPhotos.map((photo, index) => (
                  <div
                    key={photo.url}
                    className={`flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer ${
                      selectedPhotos.has(photo.url) ? 'bg-primary/5 border-primary' : ''
                    }`}
                    onClick={() => openSlideshow(index)}
                  >
                    <Checkbox
                      checked={selectedPhotos.has(photo.url)}
                      onCheckedChange={() => togglePhotoSelection(photo.url)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <img
                      src={photo.url}
                      alt={photo.tag}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{photo.assetId}</p>
                        {(photo.tags || [photo.tag]).map((t, i) => (
                          <Badge key={i} className={`${getTagColor(t)} text-white text-xs`}>
                            {getTagIcon(t)} {t}
                          </Badge>
                        ))}
                        {photo.isFavorite && (
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {photo.assetLocation}, {photo.assetCity}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(photo.uploaded_at), 'MMM dd, yyyy')}
                      </div>
                      {photo.latitude && photo.longitude && (
                        <MapPin className="h-4 w-4" />
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/media-assets/${photo.assetId}`);
                      }}
                    >
                      View Asset
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Slideshow */}
      <PhotoSlideshow
        photos={filteredPhotos}
        open={slideshowOpen}
        onOpenChange={setSlideshowOpen}
        initialIndex={slideshowIndex}
      />
    </div>
  );
}
