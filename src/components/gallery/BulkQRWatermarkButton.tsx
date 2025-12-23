/**
 * Bulk QR Watermark Button
 * Triggers the edge function to apply QR watermarks to existing images
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QrCode, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

interface WatermarkResult {
  total_images_scanned: number;
  watermarked_count: number;
  skipped_already_done: number;
  skipped_missing_qr: number;
  skipped_missing_image: number;
  failed_count: number;
  errors: string[];
  next_offset: number | null;
}

export function BulkQRWatermarkButton() {
  const [open, setOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [batchSize, setBatchSize] = useState(25);
  const [imageType, setImageType] = useState<"both" | "media_photos" | "campaign_assets">("both");
  const [forceReprocess, setForceReprocess] = useState(false);
  const [result, setResult] = useState<WatermarkResult | null>(null);
  const [progress, setProgress] = useState(0);

  const runWatermark = async () => {
    setProcessing(true);
    setResult(null);
    setProgress(0);

    try {
      const { data, error } = await supabase.functions.invoke('apply-qr-watermark-existing', {
        body: {
          batch_size: batchSize,
          offset: 0,
          image_type: imageType,
          force_reprocess: forceReprocess,
          dry_run: dryRun
        }
      });

      if (error) throw error;

      setResult(data);
      setProgress(100);

      if (dryRun) {
        toast({
          title: "Dry Run Complete",
          description: `Would watermark ${data.watermarked_count} images. Run again with dry run disabled to apply.`,
        });
      } else {
        toast({
          title: "Watermarking Complete",
          description: `Successfully watermarked ${data.watermarked_count} images.`,
        });
      }
    } catch (error: any) {
      console.error('Watermark error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to run watermark process",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const resetDialog = () => {
    setResult(null);
    setProgress(0);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetDialog(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <QrCode className="w-4 h-4 mr-2" />
          Bulk QR Watermark
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Bulk Apply QR Watermarks
          </DialogTitle>
          <DialogDescription>
            Apply existing QR codes as watermarks to all images. This uses the QR already stored for each media asset.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Image Type */}
          <div className="space-y-2">
            <Label>Image Type</Label>
            <Select value={imageType} onValueChange={(v) => setImageType(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Both (Media + Campaign)</SelectItem>
                <SelectItem value="media_photos">Media Photos Only</SelectItem>
                <SelectItem value="campaign_assets">Campaign Assets Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Batch Size */}
          <div className="space-y-2">
            <Label>Batch Size</Label>
            <Input
              type="number"
              value={batchSize}
              onChange={(e) => setBatchSize(Number(e.target.value))}
              min={1}
              max={100}
            />
            <p className="text-xs text-muted-foreground">
              Number of images to process per run
            </p>
          </div>

          {/* Dry Run */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Dry Run</Label>
              <p className="text-xs text-muted-foreground">
                Preview what would be processed without making changes
              </p>
            </div>
            <Switch checked={dryRun} onCheckedChange={setDryRun} />
          </div>

          {/* Force Reprocess */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Force Reprocess</Label>
              <p className="text-xs text-muted-foreground">
                Re-watermark images that were already processed
              </p>
            </div>
            <Switch checked={forceReprocess} onCheckedChange={setForceReprocess} />
          </div>

          {/* Progress */}
          {processing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-center text-muted-foreground">
                Processing...
              </p>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
              <div className="flex items-center gap-2 font-medium">
                {result.failed_count === 0 ? (
                  <CheckCircle className="w-4 h-4 text-success" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-warning" />
                )}
                Results {dryRun && "(Dry Run)"}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Scanned:</div>
                <div className="font-medium">{result.total_images_scanned}</div>
                <div>Watermarked:</div>
                <div className="font-medium text-success">{result.watermarked_count}</div>
                <div>Already Done:</div>
                <div className="font-medium">{result.skipped_already_done}</div>
                <div>Missing QR:</div>
                <div className="font-medium text-muted-foreground">{result.skipped_missing_qr}</div>
                <div>Missing Image:</div>
                <div className="font-medium text-muted-foreground">{result.skipped_missing_image}</div>
                <div>Failed:</div>
                <div className="font-medium text-destructive">{result.failed_count}</div>
              </div>
              {result.next_offset && (
                <p className="text-xs text-muted-foreground mt-2">
                  More images to process. Run again to continue.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button onClick={runWatermark} disabled={processing}>
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : dryRun ? (
              "Run Dry Test"
            ) : (
              "Apply Watermarks"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
