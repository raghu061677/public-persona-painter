import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Layers } from "lucide-react";

interface MapViewProps {
  assets: any[];
  onAssetClick: (asset: any) => void;
}

export function MapView({ assets, onAssetClick }: MapViewProps) {
  const [mapError, setMapError] = useState<string | null>(null);

  // Filter assets with valid coordinates
  const validAssets = assets.filter(
    (asset) =>
      asset.latitude &&
      asset.longitude &&
      !isNaN(asset.latitude) &&
      !isNaN(asset.longitude)
  );

  return (
    <div className="relative h-full">
      {/* Map Placeholder */}
      <div className="absolute inset-0 bg-muted flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Map View</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Interactive map view with asset markers and clustering
          </p>
          <div className="space-y-2 text-left text-sm">
            <p className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <span>{validAssets.length} assets with coordinates</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Map integration requires Mapbox or Google Maps API
            </p>
          </div>
          <Button className="mt-4" variant="outline">
            Configure Map Integration
          </Button>
        </Card>
      </div>
    </div>
  );
}
