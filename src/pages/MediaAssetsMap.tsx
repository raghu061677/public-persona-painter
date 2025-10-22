import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
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
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    fetchAssets();
  }, []);

  useEffect(() => {
    filterAssets();
  }, [locationSearch, areaSearch, assets]);

  useEffect(() => {
    if (filteredAssets.length > 0 && mapContainerRef.current && !mapRef.current) {
      initializeMap();
    }
  }, [filteredAssets]);

  useEffect(() => {
    if (mapRef.current) {
      updateMarkers();
    }
  }, [filteredAssets]);

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

  const initializeMap = () => {
    if (!mapContainerRef.current || filteredAssets.length === 0) return;

    // Create map
    mapRef.current = L.map(mapContainerRef.current).setView(
      [filteredAssets[0].latitude, filteredAssets[0].longitude],
      12
    );

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(mapRef.current);

    // Add markers
    updateMarkers();
  };

  const updateMarkers = () => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add new markers
    filteredAssets.forEach((asset) => {
      const marker = L.marker([asset.latitude, asset.longitude])
        .bindPopup(`
          <div style="min-width: 200px;">
            <h3 style="font-weight: 600; font-size: 1rem; margin-bottom: 8px;">${asset.location}</h3>
            <div style="font-size: 0.875rem; line-height: 1.5;">
              <p><strong>Area:</strong> ${asset.area}</p>
              <p><strong>City:</strong> ${asset.city}</p>
              <p><strong>Type:</strong> ${asset.media_type}</p>
              <p><strong>Dimensions:</strong> ${asset.dimensions}</p>
              <p><strong>Rate:</strong> ₹${asset.card_rate?.toLocaleString("en-IN")}</p>
              <p><strong>Status:</strong> <span style="color: ${
                asset.status === "Available" ? "#16a34a" : "#dc2626"
              }">${asset.status}</span></p>
            </div>
          </div>
        `)
        .addTo(mapRef.current!);

      markersRef.current.push(marker);
    });

    // Fit map to markers if we have any
    if (markersRef.current.length > 0) {
      const group = L.featureGroup(markersRef.current);
      mapRef.current.fitBounds(group.getBounds().pad(0.1));
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

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
              Filter assets by location or area. Click on any marker to see details.
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
          <div ref={mapContainerRef} className="absolute inset-0" />
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
