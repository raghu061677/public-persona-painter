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
      const zip = new JSZip();
      const folder = zip.folder(campaignName);

      for (const asset of assets) {
        const photos = asset.photos || {};
        const assetFolder = folder!.folder(asset.asset_id);

        const photoTypes = ['newspaperPhoto', 'geoTaggedPhoto', 'trafficPhoto1', 'trafficPhoto2'];
        
        for (const photoType of photoTypes) {
          if (photos[photoType]?.url) {
            try {
              const blob = await downloadImage(photos[photoType].url);
              const ext = photos[photoType].url.split('.').pop()?.split('?')[0] || 'jpg';
              assetFolder!.file(`${photoType}.${ext}`, blob);
            } catch (error) {
              console.error(`Failed to download ${photoType} for ${asset.asset_id}`, error);
            }
          }
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${campaignName}-Proofs.zip`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Proof photos exported as ZIP",
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
      const pptx = new PptxGenJS();
      pptx.layout = "LAYOUT_16x9";
      pptx.author = "Go-Ads 360°";
      pptx.company = "Go-Ads";
      pptx.title = `${campaignName} - Proof of Performance`;

      // Title Slide
      const titleSlide = pptx.addSlide();
      titleSlide.background = { color: "1E40AF" };
      titleSlide.addText(campaignName, {
        x: 0.5,
        y: 2.5,
        w: "90%",
        h: 1,
        fontSize: 44,
        bold: true,
        color: "FFFFFF",
        align: "center",
      });
      titleSlide.addText("Proof of Performance Report", {
        x: 0.5,
        y: 3.5,
        w: "90%",
        h: 0.5,
        fontSize: 24,
        color: "FFFFFF",
        align: "center",
      });

      // Asset slides
      for (const asset of assets) {
        const photos = asset.photos || {};
        const photoTypes = [
          { key: 'newspaperPhoto', label: 'Newspaper Photo' },
          { key: 'geoTaggedPhoto', label: 'Geo-Tagged Photo' },
          { key: 'trafficPhoto1', label: 'Traffic View 1' },
          { key: 'trafficPhoto2', label: 'Traffic View 2' },
        ];

        const availablePhotos = photoTypes.filter(pt => photos[pt.key]?.url);
        
        if (availablePhotos.length > 0) {
          const slide = pptx.addSlide();
          
          // Asset header
          slide.addText(`${asset.asset_id} - ${asset.location}`, {
            x: 0.5,
            y: 0.3,
            w: "90%",
            h: 0.5,
            fontSize: 20,
            bold: true,
            color: "1E40AF",
          });
          
          slide.addText(`${asset.area}, ${asset.city}`, {
            x: 0.5,
            y: 0.8,
            w: "90%",
            h: 0.3,
            fontSize: 14,
            color: "666666",
          });

          // Photos grid (2x2)
          const photoWidth = 4.2;
          const photoHeight = 2.8;
          const positions = [
            { x: 0.5, y: 1.5 },
            { x: 5.3, y: 1.5 },
            { x: 0.5, y: 4.7 },
            { x: 5.3, y: 4.7 },
          ];

          availablePhotos.slice(0, 4).forEach((photoType, index) => {
            const pos = positions[index];
            slide.addImage({
              path: photos[photoType.key].url,
              x: pos.x,
              y: pos.y,
              w: photoWidth,
              h: photoHeight,
              sizing: { type: "contain", w: photoWidth, h: photoHeight },
            });
            
            // Label
            slide.addText(photoType.label, {
              x: pos.x,
              y: pos.y + photoHeight + 0.1,
              w: photoWidth,
              h: 0.3,
              fontSize: 10,
              align: "center",
              color: "666666",
            });
          });
        }
      }

      // Summary slide
      const summarySlide = pptx.addSlide();
      summarySlide.addText("Campaign Summary", {
        x: 0.5,
        y: 0.5,
        w: "90%",
        h: 0.7,
        fontSize: 32,
        bold: true,
        color: "1E40AF",
      });

      const verifiedCount = assets.filter(a => a.status === 'Verified').length;
      const summaryData = [
        ["Total Assets", assets.length.toString()],
        ["Verified Assets", verifiedCount.toString()],
        ["Completion Rate", `${Math.round((verifiedCount / assets.length) * 100)}%`],
      ];

      summarySlide.addTable(
        summaryData.map(row => row.map(cell => ({ text: cell }))),
        {
          x: 2,
          y: 2,
          w: 6,
          rowH: 0.7,
          fontSize: 18,
          border: { pt: 1, color: "DDDDDD" },
          fill: { color: "F8FAFC" },
        }
      );

      await pptx.writeFile({ fileName: `${campaignName}-Proof-Report.pptx` });

      toast({
        title: "Success",
        description: "Proof presentation exported successfully",
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
