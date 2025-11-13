import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, Camera, Calendar, MapPin, User, FileDown, CheckSquare, Square } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { PhotoExportDialog } from "@/components/gallery/PhotoExportDialog";

interface MediaPhoto {
  id: string;
  asset_id: string;
  campaign_id: string | null;
  client_id: string | null;
  photo_url: string;
  category: string;
  uploaded_at: string;
  uploaded_by: string;
  metadata: any;
}

export default function PhotoGallery() {
  const [photos, setPhotos] = useState<MediaPhoto[]>([]);
  const [filteredPhotos, setFilteredPhotos] = useState<MediaPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<MediaPhoto | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [showExportDialog, setShowExportDialog] = useState(false);
  
  // Filter states
  const [searchAsset, setSearchAsset] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    loadPhotos();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [photos, searchAsset, selectedCategory, activeTab]);

  const loadPhotos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('media_photos')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...photos];

    // Tab filtering
    if (activeTab !== "all") {
      filtered = filtered.filter(p => p.category.toLowerCase() === activeTab.toLowerCase());
    }

    // Search filters
    if (searchAsset) {
      filtered = filtered.filter(p => 
        p.asset_id?.toLowerCase().includes(searchAsset.toLowerCase())
      );
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    setFilteredPhotos(filtered);
  };

  const togglePhotoSelection = (photoId: string) => {
    const newSelected = new Set(selectedPhotos);
    if (newSelected.has(photoId)) {
      newSelected.delete(photoId);
    } else {
      newSelected.add(photoId);
    }
    setSelectedPhotos(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedPhotos.size === filteredPhotos.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(filteredPhotos.map(p => p.id)));
    }
  };

  const handleExport = () => {
    if (selectedPhotos.size === 0) {
      toast({
        title: "No photos selected",
        description: "Please select at least one photo to export",
        variant: "destructive",
      });
      return;
    }
    setShowExportDialog(true);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Mounting: "bg-blue-500",
      Display: "bg-green-500",
      Proof: "bg-purple-500",
      Monitoring: "bg-orange-500",
      General: "bg-gray-500",
    };
    return colors[category] || "bg-gray-500";
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Loading photo gallery...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Photo Gallery</h2>
          <p className="text-muted-foreground">
            Browse all media photos across assets, campaigns, and clients
          </p>
        </div>
        <div className="flex gap-2">
          {selectedPhotos.size > 0 && (
            <Button variant="outline" onClick={handleExport}>
              <FileDown className="mr-2 h-4 w-4" />
              Export ({selectedPhotos.size})
            </Button>
          )}
          <Button onClick={loadPhotos}>
            <Camera className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Asset ID
              </label>
              <Input
                placeholder="Search by asset..."
                value={searchAsset}
                onChange={(e) => setSearchAsset(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Mounting">Mounting</SelectItem>
                  <SelectItem value="Display">Display</SelectItem>
                  <SelectItem value="Proof">Proof</SelectItem>
                  <SelectItem value="Monitoring">Monitoring</SelectItem>
                  <SelectItem value="General">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  setSearchAsset("");
                  setSelectedCategory("all");
                  setActiveTab("all");
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selection Actions Bar */}
      {selectedPhotos.size > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSelectAll}
                >
                  {selectedPhotos.size === filteredPhotos.length ? (
                    <CheckSquare className="h-4 w-4 mr-2" />
                  ) : (
                    <Square className="h-4 w-4 mr-2" />
                  )}
                  {selectedPhotos.size === filteredPhotos.length ? 'Deselect All' : 'Select All'}
                </Button>
                <span className="text-sm font-medium">
                  {selectedPhotos.size} photo{selectedPhotos.size !== 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPhotos(new Set())}
                >
                  Clear Selection
                </Button>
                <Button
                  size="sm"
                  onClick={handleExport}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs for quick category filtering */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All ({photos.length})</TabsTrigger>
          <TabsTrigger value="mounting">
            Mounting ({photos.filter(p => p.category === 'Mounting').length})
          </TabsTrigger>
          <TabsTrigger value="display">
            Display ({photos.filter(p => p.category === 'Display').length})
          </TabsTrigger>
          <TabsTrigger value="proof">
            Proof ({photos.filter(p => p.category === 'Proof').length})
          </TabsTrigger>
          <TabsTrigger value="monitoring">
            Monitoring ({photos.filter(p => p.category === 'Monitoring').length})
          </TabsTrigger>
          <TabsTrigger value="general">
            General ({photos.filter(p => p.category === 'General').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredPhotos.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Camera className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No photos found</p>
                <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredPhotos.map((photo) => (
                <Card
                  key={photo.id}
                  className={`overflow-hidden transition-all ${
                    selectedPhotos.has(photo.id) ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-lg'
                  }`}
                >
                  <div className="aspect-square relative overflow-hidden bg-muted">
                    {/* Selection Checkbox */}
                    <div 
                      className="absolute top-2 left-2 z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePhotoSelection(photo.id);
                      }}
                    >
                      <div className="bg-background/80 backdrop-blur-sm rounded p-1 hover:bg-background cursor-pointer">
                        <Checkbox
                          checked={selectedPhotos.has(photo.id)}
                          onCheckedChange={() => togglePhotoSelection(photo.id)}
                        />
                      </div>
                    </div>

                    <img
                      src={photo.photo_url}
                      alt={`${photo.asset_id} - ${photo.category}`}
                      className="object-cover w-full h-full hover:scale-105 transition-transform duration-300 cursor-pointer"
                      onClick={() => setSelectedPhoto(photo)}
                    />
                    <div className="absolute top-2 right-2">
                      <Badge className={getCategoryColor(photo.category)}>
                        {photo.category}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{photo.asset_id}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{format(new Date(photo.uploaded_at), 'PP')}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Photo Detail Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl">
          {selectedPhoto && (
            <div className="space-y-4">
              <img
                src={selectedPhoto.photo_url}
                alt="Photo"
                className="w-full h-auto rounded-lg"
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Asset ID</p>
                  <p className="text-lg font-semibold">{selectedPhoto.asset_id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Category</p>
                  <Badge className={getCategoryColor(selectedPhoto.category)}>
                    {selectedPhoto.category}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Uploaded</p>
                  <p className="text-lg flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(selectedPhoto.uploaded_at), 'PPp')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <PhotoExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        selectedPhotos={photos.filter(p => selectedPhotos.has(p.id))}
      />
    </div>
  );
}
