import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Icon, LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Eye } from "lucide-react";

interface MapViewProps {
  assets: any[];
  onAssetClick: (asset: any) => void;
}

// Custom marker icons based on status
const getMarkerIcon = (status: string) => {
  const color = status === "Available" ? "green" : status === "Booked" ? "red" : "blue";
  return new Icon({
    iconUrl: `https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
};

// Component to fit map bounds to all markers
function MapBoundsUpdater({ assets }: { assets: any[] }) {
  const map = useMap();

  useEffect(() => {
    if (assets.length > 0) {
      const bounds = assets.map((a) => [a.latitude, a.longitude] as [number, number]);
      map.fitBounds(bounds as LatLngBoundsExpression, { padding: [50, 50] });
    } else {
      // Default to Hyderabad if no assets
      map.setView([17.385, 78.4867], 12);
    }
  }, [assets, map]);

  return null;
}

export function MapView({ assets, onAssetClick }: MapViewProps) {
  // Filter assets with valid coordinates
  const validAssets = assets.filter(
    (asset) =>
      asset.latitude &&
      asset.longitude &&
      !isNaN(asset.latitude) &&
      !isNaN(asset.longitude) &&
      asset.latitude !== 0 &&
      asset.longitude !== 0
  );

  if (validAssets.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-muted rounded-lg">
        <div className="text-center p-8">
          <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Location Data</h3>
          <p className="text-sm text-muted-foreground">
            No assets have GPS coordinates available for map display
          </p>
        </div>
      </div>
    );
  }

  // Use first asset's coordinates as default center
  const defaultCenter: [number, number] = [validAssets[0].latitude, validAssets[0].longitude];

  return (
    <div className="h-full rounded-lg overflow-hidden border">
      <MapContainer
        center={defaultCenter}
        zoom={12}
        className="h-full w-full"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBoundsUpdater assets={validAssets} />

        {validAssets.map((asset) => (
          <Marker
            key={asset.id}
            position={[asset.latitude, asset.longitude]}
            icon={getMarkerIcon(asset.status)}
          >
            <Popup>
              <div className="min-w-[250px] p-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-sm">{asset.id}</h3>
                  <Badge
                    variant={
                      asset.status === "Available"
                        ? "default"
                        : asset.status === "Booked"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {asset.status}
                  </Badge>
                </div>
                <div className="space-y-1 text-xs">
                  <p>
                    <span className="font-semibold">Area:</span> {asset.area}
                  </p>
                  <p>
                    <span className="font-semibold">Location:</span> {asset.location}
                  </p>
                  <p>
                    <span className="font-semibold">City:</span> {asset.city}
                  </p>
                  <p>
                    <span className="font-semibold">Type:</span> {asset.media_type}
                  </p>
                  <p>
                    <span className="font-semibold">Size:</span> {asset.dimensions}
                  </p>
                  {asset.direction && (
                    <p>
                      <span className="font-semibold">Direction:</span> {asset.direction}
                    </p>
                  )}
                  {asset.illumination && (
                    <p>
                      <span className="font-semibold">Lighting:</span> {asset.illumination}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  className="w-full mt-3"
                  onClick={() => onAssetClick(asset)}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View Details
                </Button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
