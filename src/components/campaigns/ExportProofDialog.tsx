import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Download, FileArchive, Presentation } from "lucide-react";
import PptxGenJS from "pptxgenjs";
import JSZip from "jszip";

interface ExportProofDialogProps {
  campaignId: string;
  campaignName: string;
  assets: any[];
}

export function ExportProofDialog({ campaignId, campaignName, assets }: ExportProofDialogProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const downloadImage = async (url: string): Promise<Blob> => {
    const response = await fetch(url);
    return await response.blob();
  };

  const handleExportZIP = async () => {
    setExporting(true);
    try {
      // Always fetch fresh proof data (do not rely on campaignAssets shape)
      const { data: campaignAssets, error: assetsError } = await supabase
        .from("campaign_assets")
        .select("id, asset_id, city, area, location")
        .eq("campaign_id", campaignId)
        .order("created_at");

      if (assetsError) throw assetsError;

      const campaignAssetIds = (campaignAssets || []).map((a) => a.id);

      const { data: photos, error: photosError } = await supabase
        .from("media_photos")
        .select("asset_id, category, photo_url, uploaded_at")
        .eq("campaign_id", campaignId)
        .in("asset_id", campaignAssetIds)
        .order("asset_id", { ascending: true })
        .order("uploaded_at", { ascending: true });

      if (photosError) throw photosError;

      const assetById = new Map<string, any>();
      (campaignAssets || []).forEach((a) => assetById.set(a.id, a));

      const grouped = (photos || []).reduce((acc, p) => {
        (acc[p.asset_id] ||= []).push(p);
        return acc;
      }, {} as Record<string, any[]>);

      const zip = new JSZip();
      const folder = zip.folder(campaignName);

      const missingAssets = (campaignAssets || []).filter((a) => !(grouped[a.id]?.length > 0));

      for (const [campaignAssetId, assetPhotos] of Object.entries(grouped)) {
        const asset = assetById.get(campaignAssetId);
        const safeFolderName = asset?.asset_id || campaignAssetId;
        const assetFolder = folder!.folder(safeFolderName);

        for (const p of assetPhotos) {
          try {
            const blob = await downloadImage(p.photo_url);
            const ext = p.photo_url.split(".").pop()?.split("?")[0] || "jpg";
            const safeCategory = String(p.category || "photo").replace(/[^a-z0-9_-]/gi, "_");
            assetFolder!.file(`${safeCategory}_${new Date(p.uploaded_at).getTime()}.${ext}`, blob);
          } catch (error) {
            console.error(`Failed to download photo for ${safeFolderName}`, error);
          }
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${campaignName}-Proofs.zip`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Exported",
        description: missingAssets.length
          ? `ZIP created. Missing photos for ${missingAssets.length} asset(s).`
          : "Proof photos exported as ZIP",
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportPPT = async () => {
    setExporting(true);
    try {
      // Fetch snapshot assets + uploaded photos.
      const { data: campaignAssets, error: assetsError } = await supabase
        .from("campaign_assets")
        .select("id, asset_id, city, area, location")
        .eq("campaign_id", campaignId)
        .order("created_at");

      if (assetsError) throw assetsError;

      const campaignAssetIds = (campaignAssets || []).map((a) => a.id);

      const { data: photos, error: photosError } = await supabase
        .from("media_photos")
        .select("asset_id, category, photo_url, uploaded_at")
        .eq("campaign_id", campaignId)
        .in("asset_id", campaignAssetIds)
        .order("asset_id", { ascending: true })
        .order("uploaded_at", { ascending: true });

      if (photosError) throw photosError;

      const assetById = new Map<string, any>();
      (campaignAssets || []).forEach((a) => assetById.set(a.id, a));

      const grouped = (photos || []).reduce((acc, p) => {
        (acc[p.asset_id] ||= []).push(p);
        return acc;
      }, {} as Record<string, any[]>);

      const assetsWithPhotos = Object.entries(grouped)
        .map(([campaignAssetId, assetPhotos]) => ({
          campaignAssetId,
          asset: assetById.get(campaignAssetId),
          photos: assetPhotos,
        }))
        .filter((x) => x.photos.length > 0);

      if (assetsWithPhotos.length === 0) {
        throw new Error("No proof photos found for this campaign");
      }

      const pptx = new PptxGenJS();
      pptx.layout = "LAYOUT_16x9";
      pptx.author = "Go-Ads 360°";
      pptx.company = "Go-Ads";
      pptx.title = `${campaignName} - Proof of Performance`;

      // IMPORTANT: User requested 2 images per slide and total slides based on assets.
      // So we generate ONLY proof slides (no cover/summary) to match expected slide count.
      for (const entry of assetsWithPhotos) {
        const assetCode = entry.asset?.asset_id || entry.campaignAssetId;
        const headerLine1 = `${assetCode} - ${entry.asset?.location || ""}`.trim();
        const headerLine2 = [entry.asset?.area, entry.asset?.city].filter(Boolean).join(", ");

        // 2 images per slide
        for (let i = 0; i < entry.photos.length; i += 2) {
          const slide = pptx.addSlide();

          slide.addText(headerLine1, {
            x: 0.5,
            y: 0.3,
            w: 12.3,
            h: 0.5,
            fontSize: 20,
            bold: true,
            color: "1E40AF",
          });

          if (headerLine2) {
            slide.addText(headerLine2, {
              x: 0.5,
              y: 0.8,
              w: 12.3,
              h: 0.3,
              fontSize: 14,
              color: "666666",
            });
          }

          const photoWidth = 5.9;
          const photoHeight = 5.4;
          const positions = [
            { x: 0.5, y: 1.4 },
            { x: 6.8, y: 1.4 },
          ];

          const batch = entry.photos.slice(i, i + 2);
          batch.forEach((p: any, index: number) => {
            const pos = positions[index];
            if (!pos) return;

            try {
              slide.addImage({
                path: p.photo_url,
                x: pos.x,
                y: pos.y,
                w: photoWidth,
                h: photoHeight,
                sizing: { type: "contain", w: photoWidth, h: photoHeight },
              });
            } catch (e) {
              console.warn("Could not add photo:", e);
              slide.addText("Photo Missing", {
                x: pos.x,
                y: pos.y,
                w: photoWidth,
                h: photoHeight,
                align: "center",
                valign: "middle",
              });
            }

            // Label
            slide.addText(p.category || "Photo", {
              x: pos.x,
              y: pos.y + photoHeight + 0.1,
              w: photoWidth,
              h: 0.3,
              fontSize: 10,
              align: "center",
              color: "666666",
            });
          });

          // Footer
          slide.addText("Powered by Go-Ads 360° — OOH Media Platform", {
            x: 0.5,
            y: 7.1,
            w: 12.3,
            h: 0.3,
            fontSize: 10,
            color: "94A3B8",
            align: "center",
          });
        }
      }

      await pptx.writeFile({ fileName: `${campaignName}-Proof-Report.pptx` });

      toast({
        title: "Exported",
        description: "PowerPoint generated with all uploaded proof photos (2 per slide).",
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Proofs
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Campaign Proofs</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Button
            className="w-full justify-start"
            variant="outline"
            size="lg"
            onClick={handleExportZIP}
            disabled={exporting}
          >
            <FileArchive className="mr-2 h-5 w-5" />
            <div className="text-left">
              <div className="font-semibold">Download as ZIP</div>
              <div className="text-sm text-muted-foreground">
                All photos organized by asset ID
              </div>
            </div>
          </Button>

          <Button
            className="w-full justify-start"
            variant="outline"
            size="lg"
            onClick={handleExportPPT}
            disabled={exporting}
          >
            <Presentation className="mr-2 h-5 w-5" />
            <div className="text-left">
              <div className="font-semibold">Export as PowerPoint</div>
              <div className="text-sm text-muted-foreground">
                Branded presentation with all photos
              </div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
