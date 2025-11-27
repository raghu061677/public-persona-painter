import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { QrCode, Download, Copy, Share2, RefreshCw, Loader2 } from 'lucide-react';
import { generateAssetQRCode, getLocationUrl, type QRCodeOptions } from '@/lib/qr/qrCodeGenerator';

interface QRCodeSectionProps {
  assetId: string;
  latitude?: number | null;
  longitude?: number | null;
  googleStreetViewUrl?: string | null;
  locationUrl?: string | null;
  qrCodeUrl?: string | null;
  onQRGenerated?: (url: string) => void;
}

export function QRCodeSection({
  assetId,
  latitude,
  longitude,
  googleStreetViewUrl,
  locationUrl,
  qrCodeUrl,
  onQRGenerated,
}: QRCodeSectionProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentQRUrl, setCurrentQRUrl] = useState(qrCodeUrl);

  const options: QRCodeOptions = {
    assetId,
    latitude,
    longitude,
    googleStreetViewUrl,
    locationUrl,
  };

  const finalLocationUrl = getLocationUrl(options);
  const hasLocationData = !!finalLocationUrl;

  const handleGenerateQR = async () => {
    if (!hasLocationData) {
      toast({
        title: 'No Location Data',
        description: 'Please add location coordinates or URL first',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const url = await generateAssetQRCode(options);
      setCurrentQRUrl(url);
      onQRGenerated?.(url);
      
      // Log activity
      const { logActivity } = await import('@/utils/activityLogger');
      await logActivity('create', 'media_asset', assetId, assetId, {
        action: 'qr_code_generated',
        qr_url: url
      });
      
      toast({
        title: 'Success',
        description: 'QR Code generated successfully',
      });
    } catch (error) {
      console.error('QR generation error:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate QR code',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!currentQRUrl) return;
    
    const link = document.createElement('a');
    link.href = currentQRUrl;
    link.download = `qr-${assetId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: 'Downloaded',
      description: 'QR code downloaded successfully',
    });
  };

  const handleCopyUrl = () => {
    if (!finalLocationUrl) return;
    
    navigator.clipboard.writeText(finalLocationUrl);
    toast({
      title: 'Copied',
      description: 'Location URL copied to clipboard',
    });
  };

  const handleShareWhatsApp = () => {
    if (!finalLocationUrl) return;
    
    const message = encodeURIComponent(`Media Location: ${finalLocationUrl}`);
    const whatsappUrl = `https://wa.me/?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          QR Code
        </CardTitle>
        <CardDescription>
          Generate QR code for easy location access
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* QR Code Preview */}
        {currentQRUrl && (
          <div className="flex flex-col items-center gap-2">
            <div className="flex justify-center p-6 bg-white rounded-lg border-2 border-primary/20 shadow-sm">
              <img
                src={currentQRUrl}
                alt="Asset QR Code"
                className="w-48 h-48 object-contain"
              />
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Scan to access location
            </p>
          </div>
        )}

        {/* Location URL Display */}
        {finalLocationUrl && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Location URL:</p>
            <p className="text-sm break-all font-mono">{finalLocationUrl}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          {!currentQRUrl ? (
            <Button
              onClick={handleGenerateQR}
              disabled={!hasLocationData || isGenerating}
              className="col-span-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <QrCode className="mr-2 h-4 w-4" />
                  Generate QR Code
                </>
              )}
            </Button>
          ) : (
            <>
              <Button
                onClick={handleGenerateQR}
                disabled={!hasLocationData || isGenerating}
                variant="outline"
              >
                {isGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Regenerate
              </Button>
              <Button onClick={handleDownload} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              <Button onClick={handleCopyUrl} variant="outline">
                <Copy className="mr-2 h-4 w-4" />
                Copy URL
              </Button>
              <Button onClick={handleShareWhatsApp} variant="outline">
                <Share2 className="mr-2 h-4 w-4" />
                WhatsApp
              </Button>
            </>
          )}
        </div>

        {!hasLocationData && (
          <p className="text-sm text-muted-foreground text-center">
            Add location coordinates or URL to generate QR code
          </p>
        )}
      </CardContent>
    </Card>
  );
}
