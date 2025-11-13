import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Camera, MapPin, Upload, Wifi, WifiOff, Edit, Check, Clock } from "lucide-react";
import { PhotoEditor } from "@/components/mobile/PhotoEditor";
import { uploadProofPhoto } from "@/lib/media-assets/uploadProofs";
import { validateGPSProximity } from "@/lib/gpsValidator";
import { addToQueue, getQueuedPhotos, removeFromQueue, updatePhotoStatus } from "@/lib/offlineQueue";
import { Progress } from "@/components/ui/progress";

interface Asset {
  id: string;
  location: string;
  area: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
}

interface PhotoToUpload {
  id: string;
  file: File;
  preview: string;
  tag: string;
  assetId: string;
  edited?: boolean;
}

export default function MobileOpsUpload() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<string>("");
  const [photos, setPhotos] = useState<PhotoToUpload[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueCount, setQueueCount] = useState(0);
  const [editingPhoto, setEditingPhoto] = useState<PhotoToUpload | null>(null);

  useEffect(() => {
    fetchAssets();
    loadQueueCount();

    const handleOnline = () => {
      setIsOnline(true);
      toast({ title: "Back Online", description: "Syncing queued photos..." });
      processQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({ title: "Offline", description: "Photos will be queued for upload", variant: "destructive" });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const fetchAssets = async () => {
    const { data, error } = await supabase
      .from("media_assets")
      .select("id, location, area, city, latitude, longitude")
      .eq("status", "Booked")
      .order("area");

    if (error) {
      toast({ title: "Error", description: "Failed to load assets", variant: "destructive" });
      return;
    }

    setAssets(data || []);
  };

  const loadQueueCount = async () => {
    const queued = await getQueuedPhotos();
    setQueueCount(queued.length);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedAsset) {
      toast({ title: "Select Asset", description: "Please select an asset first" });
      return;
    }

    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newPhotos: PhotoToUpload[] = files.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      preview: URL.createObjectURL(file),
      tag: detectTag(file.name),
      assetId: selectedAsset,
    }));

    setPhotos(prev => [...prev, ...newPhotos]);
  };

  const detectTag = (fileName: string): string => {
    const name = fileName.toLowerCase();
    if (name.includes("news") || name.includes("paper")) return "Newspaper";
    if (name.includes("traffic") || name.includes("road")) return "Traffic";
    if (name.includes("geo") || name.includes("map")) return "Geo-Tagged";
    return "Other";
  };

  const handleEdit = (photo: PhotoToUpload) => {
    setEditingPhoto(photo);
  };

  const handleEditSave = (editedFile: File) => {
    if (!editingPhoto) return;

    setPhotos(prev => prev.map(p => 
      p.id === editingPhoto.id 
        ? { ...p, file: editedFile, preview: URL.createObjectURL(editedFile), edited: true }
        : p
    ));
    setEditingPhoto(null);
    toast({ title: "Photo Edited", description: "Photo has been optimized" });
  };

  const validateGPS = async (assetId: string): Promise<boolean> => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset || !asset.latitude || !asset.longitude) {
      return true; // Skip validation if no GPS data
    }

    try {
      const result = await validateGPSProximity(
        { latitude: asset.latitude, longitude: asset.longitude },
        100 // 100 meters tolerance
      );

      if (!result.valid) {
        toast({
          title: "GPS Validation Failed",
          description: `You are ${Math.round(result.distance)}m away from the asset`,
          variant: "destructive",
        });
        return false;
      }

      return true;
    } catch (error) {
      toast({
        title: "GPS Error",
        description: "Could not verify location. Continue anyway?",
        variant: "destructive",
      });
      return true; // Allow upload if GPS fails
    }
  };

  const handleUpload = async () => {
    if (photos.length === 0) return;

    const isValid = await validateGPS(selectedAsset);
    if (!isValid) return;

    if (!isOnline) {
      // Queue for offline upload
      for (const photo of photos) {
        const blob = await photo.file.arrayBuffer();
        await addToQueue({
          assetId: photo.assetId,
          file: new Blob([blob], { type: photo.file.type }),
          fileName: photo.file.name,
          tag: photo.tag,
        });
      }

      toast({ title: "Queued", description: `${photos.length} photos queued for upload` });
      setPhotos([]);
      loadQueueCount();
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    let uploaded = 0;

    for (const photo of photos) {
      try {
        await uploadProofPhoto(photo.assetId, photo.file, (progress) => {
          const total = ((uploaded + progress) / photos.length) * 100;
          setUploadProgress(Math.round(total));
        });
        uploaded++;
      } catch (error) {
        console.error("Upload error:", error);
        toast({ title: "Upload Failed", description: `Failed to upload ${photo.file.name}` });
      }
    }

    setUploading(false);
    setPhotos([]);
    toast({ title: "Success", description: `Uploaded ${uploaded} photos` });
  };

  const processQueue = async () => {
    const queued = await getQueuedPhotos("pending");
    
    for (const photo of queued) {
      try {
        await updatePhotoStatus(photo.id, "uploading");
        const file = new File([photo.file], photo.fileName);
        await uploadProofPhoto(photo.assetId, file);
        await removeFromQueue(photo.id);
      } catch (error) {
        await updatePhotoStatus(photo.id, "failed");
      }
    }

    loadQueueCount();
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-2xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Mobile Upload
              </CardTitle>
              <Badge variant={isOnline ? "default" : "destructive"}>
                {isOnline ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
                {isOnline ? "Online" : "Offline"}
              </Badge>
            </div>
            <CardDescription>Upload proof photos for campaign assets</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {queueCount > 0 && (
              <div className="bg-warning/10 border border-warning rounded-lg p-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-warning" />
                <span className="text-sm">{queueCount} photos queued for upload</span>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Select Asset</label>
              <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an asset" />
                </SelectTrigger>
                <SelectContent>
                  {assets.map(asset => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.id} - {asset.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <input
                type="file"
                multiple
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
                id="mobile-photo-upload"
                disabled={!selectedAsset || uploading}
              />
              <label htmlFor="mobile-photo-upload">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={!selectedAsset || uploading}
                  asChild
                >
                  <span>
                    <Camera className="h-4 w-4 mr-2" />
                    Capture Photos
                  </span>
                </Button>
              </label>
            </div>

            {photos.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">{photos.length} Photos Ready</h3>
                <div className="grid grid-cols-2 gap-2">
                  {photos.map(photo => (
                    <div key={photo.id} className="relative group">
                      <img
                        src={photo.preview}
                        alt={photo.tag}
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleEdit(photo)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                      <Badge className="absolute top-2 left-2 text-xs">
                        {photo.tag}
                      </Badge>
                      {photo.edited && (
                        <Badge className="absolute top-2 right-2 text-xs bg-green-500">
                          <Check className="h-3 w-3" />
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>

                {uploading && (
                  <div className="space-y-2">
                    <Progress value={uploadProgress} />
                    <p className="text-xs text-center text-muted-foreground">
                      Uploading... {uploadProgress}%
                    </p>
                  </div>
                )}

                <Button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isOnline ? "Upload Now" : "Queue for Upload"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {editingPhoto && (
        <PhotoEditor
          open={!!editingPhoto}
          imageUrl={editingPhoto.preview}
          fileName={editingPhoto.file.name}
          onSave={handleEditSave}
          onCancel={() => setEditingPhoto(null)}
        />
      )}
    </div>
  );
}
