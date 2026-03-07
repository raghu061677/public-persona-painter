import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, Navigation, Upload, Loader2, CheckCircle2, AlertTriangle, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const PROOF_TAGS = [
  { value: "mounting", label: "Mounting Photo" },
  { value: "geotag", label: "Geo-tagged Photo" },
  { value: "newspaper", label: "Newspaper Proof" },
  { value: "traffic_1", label: "Traffic View 1" },
  { value: "traffic_2", label: "Traffic View 2" },
  { value: "issue_photo", label: "Issue / Revisit Photo" },
] as const;

interface OpsProofCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: any;
  campaignId: string;
  onComplete?: () => void;
}

export function OpsProofCapture({ open, onOpenChange, asset, campaignId, onComplete }: OpsProofCaptureProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [proofTag, setProofTag] = useState<string>("mounting");
  const [uploading, setUploading] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "fetching" | "success" | "error">("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fetchGps = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsStatus("error");
      return;
    }
    setGpsStatus("fetching");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsStatus("success");
      },
      () => setGpsStatus("error"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 10MB per photo", variant: "destructive" });
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    // Auto-fetch GPS when photo is selected
    if (gpsStatus === "idle") fetchGps();
  };

  const handleUpload = async () => {
    if (!selectedFile || !user || !asset) return;

    setUploading(true);
    try {
      const timestamp = Date.now();
      const ext = selectedFile.name.split(".").pop() || "jpg";
      const filePath = `company/${asset.campaign?.company_id || "default"}/${campaignId}/${asset.asset_id}/${proofTag}_${timestamp}.${ext}`;

      // Upload to storage
      const { error: uploadErr } = await supabase.storage
        .from("operations-photos")
        .upload(filePath, selectedFile, { contentType: selectedFile.type, upsert: false });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("operations-photos")
        .getPublicUrl(filePath);

      // Insert into media_photos
      const photoRecord: any = {
        campaign_id: campaignId,
        asset_id: asset.asset_id,
        photo_url: urlData.publicUrl,
        photo_type: proofTag,
        uploaded_by: user.id,
        captured_at: new Date().toISOString(),
      };

      if (coords) {
        photoRecord.latitude = coords.lat;
        photoRecord.longitude = coords.lng;
      }

      const { error: insertErr } = await supabase
        .from("media_photos")
        .insert(photoRecord);

      if (insertErr) throw insertErr;

      toast({ title: "Proof uploaded", description: `${proofTag.replace("_", " ")} photo saved successfully` });
      
      // Reset
      setSelectedFile(null);
      setPreviewUrl(null);
      setCoords(null);
      setGpsStatus("idle");
      onComplete?.();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Proof upload error:", err);
      toast({ title: "Upload failed", description: err.message || "Could not upload proof photo", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setCoords(null);
    setGpsStatus("idle");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Upload Proof Photo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Asset info */}
          <div className="p-3 rounded-lg bg-muted/50 border text-sm space-y-1">
            <p className="font-mono font-semibold">{asset?.asset_id || "—"}</p>
            <p className="text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {asset?.location || "—"}, {asset?.area || ""}, {asset?.city || ""}
            </p>
          </div>

          {/* Proof tag selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Proof Type</Label>
            <Select value={proofTag} onValueChange={setProofTag}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROOF_TAGS.map((tag) => (
                  <SelectItem key={tag.value} value={tag.value}>
                    {tag.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* GPS status */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-2">
              <Navigation className={cn("h-4 w-4", gpsStatus === "success" ? "text-emerald-500" : "text-muted-foreground")} />
              <div>
                <p className="text-sm font-medium">GPS Location</p>
                {gpsStatus === "success" && coords && (
                  <p className="text-[11px] text-muted-foreground">
                    {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                  </p>
                )}
                {gpsStatus === "error" && (
                  <p className="text-[11px] text-destructive">Could not get location</p>
                )}
                {gpsStatus === "idle" && (
                  <p className="text-[11px] text-muted-foreground">Not captured yet</p>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchGps}
              disabled={gpsStatus === "fetching"}
              className="h-9"
            >
              {gpsStatus === "fetching" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : gpsStatus === "success" ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                "Get GPS"
              )}
            </Button>
          </div>

          {/* Photo capture / upload */}
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileSelect}
            />

            {previewUrl ? (
              <div className="relative rounded-lg overflow-hidden border">
                <img src={previewUrl} alt="Preview" className="w-full max-h-64 object-cover" />
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute bottom-2 right-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Retake
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full h-32 border-dashed flex flex-col gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Tap to capture or select photo</span>
              </Button>
            )}
          </div>

          {/* GPS warning */}
          {gpsStatus !== "success" && selectedFile && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              GPS not captured. Photo will be saved without location data.
            </div>
          )}

          {/* Submit */}
          <Button
            className="w-full h-12 text-base"
            disabled={!selectedFile || uploading}
            onClick={handleUpload}
          >
            {uploading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading…</>
            ) : (
              <><Upload className="h-4 w-4 mr-2" />Upload Proof</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
