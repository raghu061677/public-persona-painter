import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { QrCode, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { generateAssetQRCode, type QRCodeOptions } from '@/lib/qr/qrCodeGenerator';

interface QRCodeButtonProps {
  assetId: string;
  latitude?: number | null;
  longitude?: number | null;
  googleStreetViewUrl?: string | null;
  locationUrl?: string | null;
  qrCodeUrl?: string | null;
  onQRGenerated?: (url: string) => void;
  size?: 'sm' | 'default' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
}

export function QRCodeButton({
  assetId,
  latitude,
  longitude,
  googleStreetViewUrl,
  locationUrl,
  qrCodeUrl,
  onQRGenerated,
  size = 'icon',
  variant = 'outline',
}: QRCodeButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateQR = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click in table

    if (!latitude && !longitude && !googleStreetViewUrl && !locationUrl) {
      toast({
        title: 'No Location Data',
        description: 'This asset has no location information',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const options: QRCodeOptions = {
        assetId,
        latitude,
        longitude,
        googleStreetViewUrl,
        locationUrl,
      };

      const url = await generateAssetQRCode(options);
      onQRGenerated?.(url);
      
      toast({
        title: 'Success',
        description: qrCodeUrl ? 'QR Code regenerated' : 'QR Code generated',
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

  return (
    <Button
      size={size}
      variant={variant}
      onClick={handleGenerateQR}
      disabled={isGenerating}
      title={qrCodeUrl ? 'Regenerate QR Code' : 'Generate QR Code'}
    >
      {isGenerating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <QrCode className="h-4 w-4" />
      )}
    </Button>
  );
}
