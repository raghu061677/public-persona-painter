import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Loader2, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { generateProofPDF } from '@/lib/reports/generateProofPDF';
import { Badge } from '@/components/ui/badge';

interface ExportProofPDFDialogProps {
  campaignId: string;
  campaignName: string;
}

export function ExportProofPDFDialog({ campaignId, campaignName }: ExportProofPDFDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [assets, setAssets] = useState<any[]>([]);

  const loadAssets = async () => {
    try {
      // Load campaign details
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (campaignError) throw campaignError;

      // Load campaign assets with photos
      const { data: campaignAssets, error: assetsError } = await supabase
        .from('campaign_assets')
        .select('*')
        .eq('campaign_id', campaignId);

      if (assetsError) throw assetsError;

      // Load all photos for these assets
      const assetIds = campaignAssets.map((a) => a.asset_id);
      const { data: photosData, error: photosError } = await supabase
        .from('media_photos')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('photo_type', 'operations_proof')
        .in('asset_id', assetIds)
        .order('uploaded_at', { ascending: false });

      if (photosError) throw photosError;

      // Group photos by asset
      const assetsWithPhotos = campaignAssets.map((asset) => ({
        ...asset,
        photos: photosData?.filter((p) => p.asset_id === asset.asset_id) || [],
      }));

      setAssets(assetsWithPhotos);

      // Auto-select all photos
      const allPhotoUrls = new Set(photosData?.map((p) => p.photo_url) || []);
      setSelectedPhotos(allPhotoUrls);
    } catch (error: any) {
      console.error('Error loading assets:', error);
      toast({
        title: 'Error',
        description: 'Failed to load campaign data',
        variant: 'destructive',
      });
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      loadAssets();
    }
  };

  const togglePhoto = (photoUrl: string) => {
    const newSelection = new Set(selectedPhotos);
    if (newSelection.has(photoUrl)) {
      newSelection.delete(photoUrl);
    } else {
      newSelection.add(photoUrl);
    }
    setSelectedPhotos(newSelection);
  };

  const selectAllForAsset = (assetId: string) => {
    const asset = assets.find((a) => a.asset_id === assetId);
    if (!asset) return;

    const newSelection = new Set(selectedPhotos);
    asset.photos.forEach((photo: any) => {
      newSelection.add(photo.photo_url);
    });
    setSelectedPhotos(newSelection);
  };

  const deselectAllForAsset = (assetId: string) => {
    const asset = assets.find((a) => a.asset_id === assetId);
    if (!asset) return;

    const newSelection = new Set(selectedPhotos);
    asset.photos.forEach((photo: any) => {
      newSelection.delete(photo.photo_url);
    });
    setSelectedPhotos(newSelection);
  };

  const handleExport = async () => {
    if (selectedPhotos.size === 0) {
      toast({
        title: 'No photos selected',
        description: 'Please select at least one photo to include in the report',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Load campaign data
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (campaignError) throw campaignError;

      // Load organization settings
      const { data: orgSettings } = await supabase
        .from('organization_settings')
        .select('*')
        .limit(1)
        .single();

      // Generate PDF
      const pdfBlob = await generateProofPDF(
        {
          ...campaign,
          assets,
        },
        selectedPhotos,
        orgSettings || {}
      );

      // Download
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Proof_of_Performance_${campaignId}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'PDF Generated',
        description: 'Proof of performance report downloaded successfully',
      });

      setOpen(false);
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Export Failed',
        description: error.message || 'Failed to generate PDF report',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const totalPhotos = assets.reduce((sum, asset) => sum + (asset.photos?.length || 0), 0);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileText className="h-4 w-4 mr-2" />
          Export Proof PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Proof of Performance PDF</DialogTitle>
          <DialogDescription>
            Select photos to include in the professional proof report for {campaignName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="font-medium">
                {selectedPhotos.size} of {totalPhotos} photos selected
              </p>
              <p className="text-sm text-muted-foreground">
                {assets.length} assets with proof photos
              </p>
            </div>
          </div>

          {assets.map((asset) => {
            const assetPhotos = asset.photos || [];
            const selectedCount = assetPhotos.filter((p: any) =>
              selectedPhotos.has(p.photo_url)
            ).length;

            return (
              <div key={asset.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">{asset.asset_id}</h4>
                    <p className="text-sm text-muted-foreground">
                      {asset.location}, {asset.city}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={selectedCount === assetPhotos.length ? 'default' : 'secondary'}>
                      {selectedCount}/{assetPhotos.length}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        selectedCount === assetPhotos.length
                          ? deselectAllForAsset(asset.asset_id)
                          : selectAllForAsset(asset.asset_id)
                      }
                    >
                      {selectedCount === assetPhotos.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  {assetPhotos.map((photo: any) => (
                    <div key={photo.id} className="relative group">
                      <div
                        className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                          selectedPhotos.has(photo.photo_url)
                            ? 'border-primary'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => togglePhoto(photo.photo_url)}
                      >
                        <img
                          src={photo.photo_url}
                          alt={photo.tag}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2">
                          <Checkbox
                            checked={selectedPhotos.has(photo.photo_url)}
                            onCheckedChange={() => togglePhoto(photo.photo_url)}
                            className="bg-background/80 backdrop-blur"
                          />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1">
                          <p className="text-xs text-white truncate">{photo.tag}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={loading || selectedPhotos.size === 0}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export PDF ({selectedPhotos.size} photos)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
