import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, Loader2, LayoutGrid, List, FileText } from "lucide-react";
import { generatePhotoReportPDF } from "@/lib/reports/generatePhotoReportPDF";
import { toast } from "@/hooks/use-toast";

interface PhotoData {
  id: string;
  asset_id: string;
  campaign_id: string | null;
  client_id: string | null;
  photo_url: string;
  category: string;
  uploaded_at: string;
}

interface PhotoExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPhotos: PhotoData[];
}

export function PhotoExportDialog({ open, onOpenChange, selectedPhotos }: PhotoExportDialogProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [title, setTitle] = useState("Photo Report");
  const [groupBy, setGroupBy] = useState<'asset' | 'campaign' | 'client' | 'category'>('asset');
  const [layout, setLayout] = useState<'grid' | 'list' | 'detailed'>('grid');
  const [photosPerPage, setPhotosPerPage] = useState(9);
  const [includeMetadata, setIncludeMetadata] = useState(true);

  const handleExport = async () => {
    if (selectedPhotos.length === 0) {
      toast({
        title: "No photos selected",
        description: "Please select at least one photo to export",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const doc = await generatePhotoReportPDF(selectedPhotos, {
        groupBy,
        layout,
        photosPerPage,
        includeMetadata,
        title,
      });

      const filename = `photo-report-${new Date().getTime()}.pdf`;
      doc.save(filename);

      toast({
        title: "Export successful",
        description: `${selectedPhotos.length} photos exported to ${filename}`,
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: error.message || "Failed to generate PDF report",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export Photo Report</DialogTitle>
          <DialogDescription>
            Customize your PDF report with {selectedPhotos.length} selected photo(s)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Report Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Report Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter report title"
            />
          </div>

          {/* Group By */}
          <div className="space-y-2">
            <Label>Organize Photos By</Label>
            <Select value={groupBy} onValueChange={(value: any) => setGroupBy(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asset">Asset ID</SelectItem>
                <SelectItem value="campaign">Campaign</SelectItem>
                <SelectItem value="client">Client</SelectItem>
                <SelectItem value="category">Category</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Layout Style */}
          <div className="space-y-3">
            <Label>Layout Style</Label>
            <RadioGroup value={layout} onValueChange={(value: any) => setLayout(value)}>
              <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-accent cursor-pointer">
                <RadioGroupItem value="grid" id="grid" />
                <Label htmlFor="grid" className="flex items-center gap-2 cursor-pointer flex-1">
                  <LayoutGrid className="h-4 w-4" />
                  <div>
                    <div className="font-medium">Grid Layout</div>
                    <div className="text-sm text-muted-foreground">
                      3 photos per row with minimal metadata
                    </div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-accent cursor-pointer">
                <RadioGroupItem value="list" id="list" />
                <Label htmlFor="list" className="flex items-center gap-2 cursor-pointer flex-1">
                  <List className="h-4 w-4" />
                  <div>
                    <div className="font-medium">List Layout</div>
                    <div className="text-sm text-muted-foreground">
                      Thumbnail with metadata in rows
                    </div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-accent cursor-pointer">
                <RadioGroupItem value="detailed" id="detailed" />
                <Label htmlFor="detailed" className="flex items-center gap-2 cursor-pointer flex-1">
                  <FileText className="h-4 w-4" />
                  <div>
                    <div className="font-medium">Detailed Layout</div>
                    <div className="text-sm text-muted-foreground">
                      Large photo with complete metadata table
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Photos Per Page */}
          {layout === 'grid' && (
            <div className="space-y-2">
              <Label htmlFor="photosPerPage">Photos Per Page (Grid)</Label>
              <Select 
                value={photosPerPage.toString()} 
                onValueChange={(value) => setPhotosPerPage(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6 photos</SelectItem>
                  <SelectItem value="9">9 photos</SelectItem>
                  <SelectItem value="12">12 photos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Include Metadata */}
          <div className="flex items-center justify-between space-x-2 border rounded-lg p-3">
            <div className="space-y-0.5">
              <Label htmlFor="metadata">Include Metadata</Label>
              <div className="text-sm text-muted-foreground">
                Add upload dates and additional details
              </div>
            </div>
            <Switch
              id="metadata"
              checked={includeMetadata}
              onCheckedChange={setIncludeMetadata}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                Export PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
