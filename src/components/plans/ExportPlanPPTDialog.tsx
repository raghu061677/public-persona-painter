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
import { Presentation, Loader2, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { generatePlanPPT } from '@/lib/plans/generatePlanPPT';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatAssetDisplayCode } from '@/lib/assets/formatAssetDisplayCode';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface ExportPlanPPTDialogProps {
  planId: string;
  planName: string;
}

export function ExportPlanPPTDialog({ planId, planName }: ExportPlanPPTDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [assetCount, setAssetCount] = useState(0);
  const [includeQR, setIncludeQR] = useState(false);

  const loadPlanData = async () => {
    try {
      const { data: items, error } = await supabase
        .from('plan_items')
        .select('id')
        .eq('plan_id', planId);

      if (error) throw error;
      setAssetCount(items?.length || 0);
    } catch (error: any) {
      console.error('Error loading plan data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load plan data',
        variant: 'destructive',
      });
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      loadPlanData();
    }
  };

  const handleExport = async () => {
    if (assetCount === 0) {
      toast({
        title: 'No assets',
        description: 'This plan has no assets to export',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: plan, error: planError } = await supabase
        .from('plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (planError) throw planError;

      const { data: planItems, error: itemsError } = await supabase
        .from('plan_items')
        .select('*, asset:media_assets(*)')
        .eq('plan_id', planId);

      if (itemsError) throw itemsError;

      if (!planItems || planItems.length === 0) {
        toast({
          title: 'No assets',
          description: 'This plan has no assets to export',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const { data: orgSettings } = await supabase
        .from('organization_settings')
        .select('*')
        .limit(1)
        .single();

      const { data: codeSettings } = await supabase
        .from('company_code_settings')
        .select('use_custom_asset_codes, asset_code_prefix')
        .eq('company_id', plan.company_id)
        .maybeSingle();

      const assetIds = planItems.map((i: any) => i.asset?.id).filter(Boolean);
      const { data: photoRows } = await supabase
        .from('media_photos')
        .select('asset_id, photo_url, uploaded_at')
        .in('asset_id', assetIds)
        .order('uploaded_at', { ascending: false });

      const latestPhotoByAsset = new Map<string, string>();
      (photoRows || []).forEach((r: any) => {
        if (!latestPhotoByAsset.has(r.asset_id) && r.photo_url) latestPhotoByAsset.set(r.asset_id, r.photo_url);
      });

      const assets = planItems.map((item: any) => {
        const displayCode = formatAssetDisplayCode({
          mediaAssetCode: item.asset?.media_asset_code,
          fallbackId: item.asset?.id,
          companyPrefix: codeSettings?.asset_code_prefix,
        });

        return {
          asset_id: displayCode,
          db_asset_id: item.asset?.id,
          area: item.asset?.area || '',
          city: item.asset?.city || '',
          location: item.asset?.location || '',
          direction: item.asset?.direction || '',
          dimensions: item.asset?.dimensions || '',
          total_sqft: item.asset?.total_sqft || 0,
          illumination_type: item.asset?.illumination_type || '',
          card_rate: item.card_rate || item.asset?.card_rate || 0,
          media_type: item.asset?.media_type || '',
          latitude: item.asset?.latitude,
          longitude: item.asset?.longitude,
          primary_photo_url: item.asset?.primary_photo_url || latestPhotoByAsset.get(item.asset?.id) || undefined,
        };
      });

      const pptBlob = await generatePlanPPT(
        {
          ...plan,
          assets,
        },
        orgSettings || {},
        { includeQR }
      );

      const url = URL.createObjectURL(pptBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${planId}_presentation.pptx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'PPT Generated',
        description: 'Media plan presentation downloaded successfully',
      });

      setOpen(false);
    } catch (error: any) {
      console.error('Error generating PPT:', error);
      toast({
        title: 'Export Failed',
        description: error.message || 'Failed to generate PPT presentation',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Presentation className="h-4 w-4 mr-2" />
          Export Plan PPT
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Media Plan Presentation</DialogTitle>
          <DialogDescription>
            Generate a professional PowerPoint presentation for {planName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <Presentation className="h-4 w-4" />
            <AlertDescription>
              This will create a client-facing proposal with 2 slides per asset:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Slide 1: Two high-quality images with asset identification</li>
                <li>Slide 2: Complete technical and commercial details</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium">Presentation Details:</p>
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              <p>• Total Assets: {assetCount}</p>
              <p>• Total Slides: {assetCount * 2 + 1} (including cover)</p>
              <p>• Format: Professional branded PowerPoint</p>
              <p>• Includes: Photos, GPS data, pricing, specifications</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 p-3 border rounded-lg">
            <Checkbox
              id="include-qr"
              checked={includeQR}
              onCheckedChange={(checked) => setIncludeQR(checked === true)}
            />
            <Label htmlFor="include-qr" className="text-sm cursor-pointer">
              Include QR codes on photos
            </Label>
            <span className="text-xs text-muted-foreground ml-auto">
              {includeQR ? 'Photos will include QR watermarks' : 'Clean photos without QR overlays'}
            </span>
          </div>

          {assetCount === 0 && (
            <Alert variant="destructive">
              <AlertDescription>
                This plan has no assets. Please add assets before exporting.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={loading || assetCount === 0}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating PPT...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Generate PPT
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
