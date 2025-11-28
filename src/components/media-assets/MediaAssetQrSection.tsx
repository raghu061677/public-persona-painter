import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Link2, QrCode, Download, RefreshCw, Share2, Loader2 } from "lucide-react";
import { useGenerateQrForAsset } from "@/hooks/useGenerateQrForAsset";

type MediaAssetQrSectionProps = {
  assetId: string;
  qrCodeUrl?: string | null;
  locationUrl?: string | null;
  onQrGenerated?: (qrUrl: string) => void;
};

export const MediaAssetQrSection = ({
  assetId,
  qrCodeUrl,
  locationUrl,
  onQrGenerated,
}: MediaAssetQrSectionProps) => {
  const { toast } = useToast();
  const { loading, error, qrUrl, setQrUrl, generateSingle } = useGenerateQrForAsset(assetId);
  const [displayQr, setDisplayQr] = useState<string | null>(null);

  useEffect(() => {
    const currentQr = qrUrl || qrCodeUrl;
    if (currentQr) {
      setDisplayQr(currentQr);
      if (qrUrl && onQrGenerated) {
        onQrGenerated(qrUrl);
      }
    }
  }, [qrUrl, qrCodeUrl, onQrGenerated]);

  const handleCopyLocation = async () => {
    if (!locationUrl) return;
    await navigator.clipboard.writeText(locationUrl);
    toast({ 
      title: "Copied!", 
      description: "Location URL copied to clipboard" 
    });
  };

  const handleDownloadQr = async () => {
    if (!displayQr) return;
    try {
      const res = await fetch(displayQr);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Detect file extension from URL or blob type
      const extension = displayQr.endsWith('.svg') || blob.type.includes('svg') ? 'svg' : 'png';
      a.download = `${assetId}-qr.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Downloaded!", description: "QR code saved" });
    } catch (err) {
      console.error('QR download error:', err);
      toast({ 
        title: "Download Failed", 
        description: "Could not download QR code",
        variant: "destructive" 
      });
    }
  };

  const handleShareWhatsApp = () => {
    const msg = encodeURIComponent(
      `🏢 Go-Ads Asset: ${assetId}\n📍 Location: ${locationUrl || 'Not available'}\n\n📱 Scan QR at site:\n${displayQr || 'QR not generated yet'}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const handleGenerate = async () => {
    const result = await generateSingle();
    if (result?.qr_code_url) {
      setDisplayQr(result.qr_code_url);
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <QrCode className="w-5 h-5 text-primary" />
          Asset QR Code
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Controls */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Location URL
              </label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={locationUrl || "No location URL configured"}
                  className="text-xs font-mono"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLocation}
                  disabled={!locationUrl}
                  title="Copy location URL"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={handleGenerate} 
                disabled={loading}
                size="sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : displayQr ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4 mr-2" />
                    Generate QR
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadQr}
                disabled={!displayQr}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleShareWhatsApp}
                disabled={!displayQr && !locationUrl}
              >
                <Share2 className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-xs text-destructive">⚠️ {error}</p>
              </div>
            )}

            <div className="p-3 bg-muted rounded-md">
              <p className="text-xs text-muted-foreground">
                💡 <strong>Tip:</strong> QR codes link to the asset's location (Google Maps or Street View). 
                Field teams can scan on-site for instant access.
              </p>
            </div>
          </div>

          {/* Right Column: QR Display */}
          <div className="flex flex-col items-center justify-center bg-muted/30 rounded-lg p-6 min-h-[240px]">
            {displayQr ? (
              <div className="space-y-3 flex flex-col items-center">
                <img
                  src={displayQr}
                  alt={`${assetId} QR code`}
                  className="border-2 border-border rounded-lg p-3 bg-white shadow-sm max-w-[200px] max-h-[200px]"
                />
                <span className="text-xs text-center text-muted-foreground max-w-[200px]">
                  📱 Scan this QR code at the site to open location details
                </span>
              </div>
            ) : (
              <div className="text-center space-y-2">
                <QrCode className="w-16 h-16 mx-auto text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  No QR code generated yet
                </p>
                <p className="text-xs text-muted-foreground/60 max-w-[200px]">
                  Click "Generate QR" to create a scannable code for this asset
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
