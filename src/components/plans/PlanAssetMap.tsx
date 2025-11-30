import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import { formatCurrency } from '@/utils/mediaAssets';

interface Asset {
  id: string;
  location: string;
  area: string;
  city: string;
  media_type: string;
  dimensions: string;
  direction?: string;
  illumination_type?: string;
  total_sqft?: number;
  latitude?: number;
  longitude?: number;
}

interface PlanAssetMapProps {
  assets: Asset[];
  planItems?: any[];
}

// Custom marker icon
const customIcon = new Icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapBoundsUpdater({ assets }: { assets: Asset[] }) {
  const map = useMap();

  useEffect(() => {
    const validAssets = assets.filter(a => a.latitude && a.longitude);
    if (validAssets.length > 0) {
      const bounds = validAssets.map(a => [a.latitude!, a.longitude!] as [number, number]);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      // Default to Hyderabad if no coordinates
      map.setView([17.385, 78.4867], 12);
    }
  }, [assets, map]);

  return null;
}

export function PlanAssetMap({ assets, planItems }: PlanAssetMapProps) {
  const [assetsWithCoords, setAssetsWithCoords] = useState<Asset[]>([]);

  useEffect(() => {
    // Filter assets that have valid coordinates
    const validAssets = assets.filter(a => 
      a.latitude && a.longitude && 
      !isNaN(a.latitude) && !isNaN(a.longitude) &&
      a.latitude !== 0 && a.longitude !== 0
    );
    setAssetsWithCoords(validAssets);
  }, [assets]);

  // Get pricing info for an asset from plan items
  const getAssetPrice = (assetId: string) => {
    if (!planItems) return null;
    const item = planItems.find(i => i.asset_id === assetId);
    return item ? item.total_with_gst : null;
  };

  if (assetsWithCoords.length === 0) {
    return (
      <div className="w-full h-[400px] bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">No assets with location data available</p>
          <p className="text-sm text-muted-foreground mt-2">Assets need GPS coordinates to display on map</p>
        </div>
      </div>
    );
  }

  // Use first valid asset's coordinates as default center
  const defaultCenter: [number, number] = [
    assetsWithCoords[0].latitude || 17.385,
    assetsWithCoords[0].longitude || 78.4867
  ];

  return (
    <div className="w-full h-[500px] rounded-lg overflow-hidden border">
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
        <MapBoundsUpdater assets={assetsWithCoords} />
        
        <MarkerClusterGroup chunkedLoading>
          {assetsWithCoords.map((asset) => (
            <Marker
              key={asset.id}
              position={[asset.latitude!, asset.longitude!]}
              icon={customIcon}
            >
              <Popup>
                <div className="min-w-[200px] p-2">
                  <h3 className="font-bold text-sm mb-2">{asset.id}</h3>
                  <div className="space-y-1 text-xs">
                    <p><span className="font-semibold">Area:</span> {asset.area}</p>
                    <p><span className="font-semibold">Location:</span> {asset.location}</p>
                    <p><span className="font-semibold">City:</span> {asset.city}</p>
                    <p><span className="font-semibold">Type:</span> {asset.media_type}</p>
                    <p><span className="font-semibold">Size:</span> {asset.dimensions}</p>
                    {asset.total_sqft && (
                      <p><span className="font-semibold">Sq.Ft:</span> {asset.total_sqft}</p>
                    )}
                    {asset.direction && (
                      <p><span className="font-semibold">Direction:</span> {asset.direction}</p>
                    )}
                    {asset.illumination_type && (
                      <p><span className="font-semibold">Lighting:</span> {asset.illumination_type}</p>
                    )}
                    {getAssetPrice(asset.id) && (
                      <p className="mt-2 pt-2 border-t">
                        <span className="font-semibold">Amount:</span> {formatCurrency(getAssetPrice(asset.id))}
                      </p>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
