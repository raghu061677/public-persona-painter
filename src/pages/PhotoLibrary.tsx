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
  Play
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { PhotoSlideshow } from "@/components/media-assets/PhotoSlideshow";
import { useNavigate } from "react-router-dom";

interface PhotoItem {
  assetId: string;
  assetLocation?: string;
  assetCity?: string;
  url: string;
  tag: string;
  uploaded_at: string;
  latitude?: number;
  longitude?: number;
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

  useEffect(() => {
    loadPhotos();
  }, []);

  useEffect(() => {
    filterPhotos();
  }, [searchTerm, selectedTag, selectedCity, dateFrom, dateTo, photos]);

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
              uploaded_at: photo.uploaded_at,
              latitude: photo.latitude,
              longitude: photo.longitude,
            });
            tags.add(photo.tag);
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

  const filterPhotos = () => {
    let filtered = [...photos];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(photo =>
        photo.assetId.toLowerCase().includes(term) ||
        photo.assetLocation?.toLowerCase().includes(term) ||
        photo.assetCity?.toLowerCase().includes(term) ||
        photo.tag.toLowerCase().includes(term)
      );
    }

    // Tag filter
    if (selectedTag !== "all") {
      filtered = filtered.filter(photo => photo.tag === selectedTag);
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
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedTag("all");
                  setSelectedCity("all");
                  setDateFrom("");
                  setDateTo("");
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
                    {/* Selection Checkbox */}
                    <div className="absolute top-2 left-2 z-10">
                      <Checkbox
                        checked={selectedPhotos.has(photo.url)}
                        onCheckedChange={() => togglePhotoSelection(photo.url)}
                        className="bg-white"
                      />
                    </div>

                    {/* Image */}
                    <img
                      src={photo.url}
                      alt={photo.tag}
                      className="w-full h-48 object-cover"
                      onClick={() => openSlideshow(index)}
                    />

                    {/* Tag Badge */}
                    <div className="absolute top-2 right-2">
                      <Badge className={`${getTagColor(photo.tag)} text-white`}>
                        {getTagIcon(photo.tag)} {photo.tag}
                      </Badge>
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
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{photo.assetId}</p>
                        <Badge className={`${getTagColor(photo.tag)} text-white text-xs`}>
                          {getTagIcon(photo.tag)} {photo.tag}
                        </Badge>
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
