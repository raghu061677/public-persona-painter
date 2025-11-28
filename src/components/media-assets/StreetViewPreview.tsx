import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Copy, MapPin, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { buildStreetViewUrl, validateAndFixStreetViewUrl, isValidStreetViewUrl } from "@/lib/streetview";

interface StreetViewPreviewProps {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  streetViewUrl?: string | null;
  heading?: number;
  onUrlGenerated?: (url: string) => void;
  showPreview?: boolean;
}

export function StreetViewPreview({
  latitude,
  longitude,
  streetViewUrl,
  heading,
  onUrlGenerated,
  showPreview = true,
}: StreetViewPreviewProps) {
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    // Auto-fix or generate Street View URL on mount
    if (latitude && longitude) {
      const fixedUrl = validateAndFixStreetViewUrl(streetViewUrl, latitude, longitude, heading);
      if (fixedUrl && fixedUrl !== streetViewUrl) {
        setCurrentUrl(fixedUrl);
        onUrlGenerated?.(fixedUrl);
      } else if (fixedUrl) {
        setCurrentUrl(fixedUrl);
      }
    }
  }, [latitude, longitude, streetViewUrl, heading]);

  const handleGenerateUrl = () => {
    if (!latitude || !longitude) {
      toast({
        title: "Missing Coordinates",
        description: "Latitude and longitude are required to generate Street View URL",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const newUrl = buildStreetViewUrl(latitude, longitude, heading);
      setCurrentUrl(newUrl);
      onUrlGenerated?.(newUrl);
      
      toast({
        title: "Street View URL Generated",
        description: "URL has been created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate Street View URL",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyUrl = () => {
    if (currentUrl) {
      navigator.clipboard.writeText(currentUrl);
      toast({
        title: "Copied",
        description: "Street View URL copied to clipboard",
      });
    }
  };

  const handleOpenStreetView = () => {
    if (currentUrl) {
      window.open(currentUrl, '_blank');
    }
  };

  if (!latitude || !longitude) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4" />
            Street View
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Latitude and longitude required for Street View
          </p>
        </CardContent>
      </Card>
    );
  }

  const isUrlValid = isValidStreetViewUrl(currentUrl);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Google Street View
          </span>
          {!isUrlValid && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerateUrl}
              disabled={isGenerating}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
              Generate
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {showPreview && currentUrl && (
          <div className="aspect-video bg-muted rounded-lg overflow-hidden">
            <iframe
              src={currentUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              title="Google Street View"
            />
          </div>
        )}

        {currentUrl && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={handleOpenStreetView}
              className="flex-1"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Street View
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyUrl}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
          </div>
        )}

        {!currentUrl && (
          <p className="text-xs text-muted-foreground">
            Click "Generate" to create a Street View link for this location
          </p>
        )}

        {currentUrl && (
          <p className="text-xs text-muted-foreground break-all">
            {currentUrl}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
