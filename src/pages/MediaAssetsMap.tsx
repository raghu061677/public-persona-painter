import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface MediaAsset {
  id: string;
  location: string;
  area: string;
  city: string;
  media_type: string;
  latitude: number;
  longitude: number;
  dimensions: string;
  card_rate: number;
  status: string;
}

export default function MediaAssetsMap() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<MediaAsset[]>([]);
  const [locationSearch, setLocationSearch] = useState("");
  const [areaSearch, setAreaSearch] = useState("");
  const mapRef = useRef<any>(null);

  useEffect(() => {
    fetchAssets();
  }, []);

  useEffect(() => {
    filterAssets();
  }, [locationSearch, areaSearch, assets]);

  const fetchAssets = async () => {
    const { data, error } = await supabase
      .from("media_assets")
      .select("*")
      .not("latitude", "is", null)
      .not("longitude", "is", null);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch assets",
        variant: "destructive",
      });
    } else {
      const typedData = (data || []) as MediaAsset[];
      setAssets(typedData);
      setFilteredAssets(typedData);
    }
  };

  const filterAssets = () => {
    let filtered = [...assets];

    if (locationSearch) {
      filtered = filtered.filter((asset) =>
        asset.location.toLowerCase().includes(locationSearch.toLowerCase())
      );
    }

    if (areaSearch) {
      filtered = filtered.filter((asset) =>
        asset.area.toLowerCase().includes(areaSearch.toLowerCase())
      );
    }

    setFilteredAssets(filtered);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="flex-none px-6 py-6 border-b border-border">
        <div className="space-y-2 mb-6">
          <h1 className="text-3xl font-bold text-foreground">Media Assets on Map</h1>
          <p className="text-sm text-muted-foreground">
            A complete geographical overview of all your media assets.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-1">
              Asset Locations ({filteredAssets.length})
            </h2>
            <p className="text-sm text-muted-foreground">
              Filter assets by location or area. Click on any marker or cluster to see details.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              placeholder="Search by Location / Landmark..."
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              className="w-full"
            />
            <Input
              placeholder="Search by Area..."
              value={areaSearch}
              onChange={(e) => setAreaSearch(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        {filteredAssets.length > 0 ? (
          <MapContainer
            center={[
              filteredAssets[0].latitude,
              filteredAssets[0].longitude,
            ]}
            zoom={12}
            style={{ height: "100%", width: "100%" }}
            ref={mapRef}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MarkerClusterGroup>
              {filteredAssets.map((asset) => (
                <Marker
                  key={asset.id}
                  position={[asset.latitude, asset.longitude]}
                >
                  <Popup>
                    <div className="space-y-2 min-w-[200px]">
                      <h3 className="font-semibold text-base">{asset.location}</h3>
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="font-medium">Area:</span> {asset.area}
                        </p>
                        <p>
                          <span className="font-medium">City:</span> {asset.city}
                        </p>
                        <p>
                          <span className="font-medium">Type:</span> {asset.media_type}
                        </p>
                        <p>
                          <span className="font-medium">Dimensions:</span> {asset.dimensions}
                        </p>
                        <p>
                          <span className="font-medium">Rate:</span> ₹
                          {asset.card_rate?.toLocaleString("en-IN")}
                        </p>
                        <p>
                          <span className="font-medium">Status:</span>{" "}
                          <span
                            className={
                              asset.status === "Available"
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {asset.status}
                          </span>
                        </p>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MarkerClusterGroup>
          </MapContainer>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">
              {assets.length === 0
                ? "No geotagged assets found"
                : "No assets match your search criteria"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
