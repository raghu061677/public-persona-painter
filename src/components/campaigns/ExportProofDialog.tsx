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
        .select("id, asset_id, city, area, location, media_type, status")
        .eq("campaign_id", campaignId)
        .order("created_at");

      if (assetsError) throw assetsError;
      if (!campaignAssets || campaignAssets.length === 0) {
        throw new Error("No assets found for this campaign");
      }

      const campaignAssetIds = campaignAssets.map((a) => a.id);

      const { data: photos, error: photosError } = await supabase
        .from("media_photos")
        .select("asset_id, category, photo_url, uploaded_at")
        .eq("campaign_id", campaignId)
        .in("asset_id", campaignAssetIds)
        .order("asset_id", { ascending: true })
        .order("uploaded_at", { ascending: true });

      if (photosError) throw photosError;

      // Group photos by campaign_assets.id
      const photosByAsset = (photos || []).reduce((acc, p) => {
        (acc[p.asset_id] ||= []).push(p);
        return acc;
      }, {} as Record<string, any[]>);

      const pptx = new PptxGenJS();
      pptx.layout = "LAYOUT_16x9";
      pptx.author = "Go-Ads 360°";
      pptx.company = "Go-Ads";
      pptx.title = `${campaignName} - Proof of Performance`;

      // ========== SLIDE 1: Title/Cover ==========
      const titleSlide = pptx.addSlide();
      titleSlide.background = { color: "1E40AF" };
      titleSlide.addText(campaignName, {
        x: 0.5,
        y: 2.0,
        w: 12.3,
        h: 1.2,
        fontSize: 44,
        bold: true,
        color: "FFFFFF",
        align: "center",
      });
      titleSlide.addText("Proof of Performance Report", {
        x: 0.5,
        y: 3.3,
        w: 12.3,
        h: 0.6,
        fontSize: 24,
        color: "E0E7FF",
        align: "center",
      });
      titleSlide.addText(`Total Assets: ${campaignAssets.length}`, {
        x: 0.5,
        y: 4.2,
        w: 12.3,
        h: 0.5,
        fontSize: 18,
        color: "E0E7FF",
        align: "center",
      });
      titleSlide.addText("Powered by Go-Ads 360° — OOH Media Platform", {
        x: 0.5,
        y: 7.0,
        w: 12.3,
        h: 0.4,
        fontSize: 12,
        color: "94A3B8",
        align: "center",
      });

      // ========== SLIDE 2: Campaign Summary ==========
      const summarySlide = pptx.addSlide();
      summarySlide.addText("Campaign Summary", {
        x: 0.5,
        y: 0.5,
        w: 12.3,
        h: 0.8,
        fontSize: 32,
        bold: true,
        color: "1E40AF",
      });

      const verifiedCount = campaignAssets.filter((a) => a.status === "Verified" || a.status === "Completed").length;
      const installedCount = campaignAssets.filter((a) => a.status === "Installed").length;
      const totalPhotos = photos?.length || 0;
      const assetsWithPhotos = Object.keys(photosByAsset).length;

      const summaryData = [
        ["Metric", "Value"],
        ["Total Assets", campaignAssets.length.toString()],
        ["Assets with Photos", assetsWithPhotos.toString()],
        ["Total Photos Uploaded", totalPhotos.toString()],
        ["Verified Assets", verifiedCount.toString()],
        ["Installed Assets", installedCount.toString()],
        ["Completion Rate", `${Math.round((verifiedCount / campaignAssets.length) * 100)}%`],
      ];

      summarySlide.addTable(
        summaryData.map((row, idx) =>
          row.map((cell) => ({
            text: cell,
            options: {
              bold: idx === 0,
              fill: { color: idx === 0 ? "1E40AF" : "F8FAFC" },
              color: idx === 0 ? "FFFFFF" : "333333",
            },
          }))
        ),
        {
          x: 1.5,
          y: 1.8,
          w: 10.3,
          rowH: 0.6,
          fontSize: 16,
          border: { pt: 1, color: "DDDDDD" },
        }
      );

      summarySlide.addText("Powered by Go-Ads 360° — OOH Media Platform", {
        x: 0.5,
        y: 7.0,
        w: 12.3,
        h: 0.4,
        fontSize: 12,
        color: "94A3B8",
        align: "center",
      });

      // ========== ASSET SLIDES: Each asset with 2 photos per slide ==========
      for (const asset of campaignAssets) {
        const assetPhotos = photosByAsset[asset.id] || [];
        const assetCode = asset.asset_id || asset.id;
        const headerLine1 = `${assetCode} - ${asset.location || ""}`.trim();
        const headerLine2 = [asset.area, asset.city].filter(Boolean).join(", ");
        const mediaType = asset.media_type || "Media Asset";

        if (assetPhotos.length === 0) {
          // Create 1 slide for asset with no photos
          const slide = pptx.addSlide();
          
          // Header
          slide.addText(headerLine1, {
            x: 0.5,
            y: 0.3,
            w: 12.3,
            h: 0.5,
            fontSize: 20,
            bold: true,
            color: "1E40AF",
          });
          slide.addText(`${mediaType} | ${headerLine2}`, {
            x: 0.5,
            y: 0.85,
            w: 12.3,
            h: 0.35,
            fontSize: 14,
            color: "666666",
          });

          // No photos message
          slide.addShape(pptx.ShapeType.rect, {
            x: 2.0,
            y: 2.5,
            w: 9.3,
            h: 3.0,
            fill: { color: "FEF3C7" },
            line: { color: "F59E0B", width: 2 },
          });
          slide.addText("No proof photos uploaded for this asset", {
            x: 2.0,
            y: 3.5,
            w: 9.3,
            h: 0.8,
            fontSize: 18,
            color: "92400E",
            align: "center",
            valign: "middle",
          });

          // Footer
          slide.addText("Powered by Go-Ads 360° — OOH Media Platform", {
            x: 0.5,
            y: 7.0,
            w: 12.3,
            h: 0.4,
            fontSize: 12,
            color: "94A3B8",
            align: "center",
          });
        } else {
          // 2 images per slide
          for (let i = 0; i < assetPhotos.length; i += 2) {
            const slide = pptx.addSlide();

            // Header
            slide.addText(headerLine1, {
              x: 0.5,
              y: 0.3,
              w: 12.3,
              h: 0.5,
              fontSize: 20,
              bold: true,
              color: "1E40AF",
            });
            slide.addText(`${mediaType} | ${headerLine2}`, {
              x: 0.5,
              y: 0.85,
              w: 12.3,
              h: 0.35,
              fontSize: 14,
              color: "666666",
            });

            const photoWidth = 5.8;
            const photoHeight = 4.8;
            const positions = [
              { x: 0.5, y: 1.5 },
              { x: 6.8, y: 1.5 },
            ];

            const batch = assetPhotos.slice(i, i + 2);
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
                slide.addShape(pptx.ShapeType.rect, {
                  x: pos.x,
                  y: pos.y,
                  w: photoWidth,
                  h: photoHeight,
                  fill: { color: "F1F5F9" },
                  line: { color: "CBD5E1" },
                });
                slide.addText("Photo failed to load", {
                  x: pos.x,
                  y: pos.y + photoHeight / 2 - 0.2,
                  w: photoWidth,
                  h: 0.4,
                  fontSize: 12,
                  color: "64748B",
                  align: "center",
                });
              }

              // Label below photo
              slide.addText(p.category || "Photo", {
                x: pos.x,
                y: pos.y + photoHeight + 0.1,
                w: photoWidth,
                h: 0.35,
                fontSize: 11,
                align: "center",
                color: "666666",
                bold: true,
              });
            });

            // Footer
            slide.addText("Powered by Go-Ads 360° — OOH Media Platform", {
              x: 0.5,
              y: 7.0,
              w: 12.3,
              h: 0.4,
              fontSize: 12,
              color: "94A3B8",
              align: "center",
            });
          }
        }
      }

      await pptx.writeFile({ fileName: `${campaignName}-Proof-Report.pptx` });

      toast({
        title: "Exported",
        description: `PPT generated with ${campaignAssets.length} assets (${Object.keys(photosByAsset).length} with photos).`,
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
