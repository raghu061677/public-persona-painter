import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Eye } from "lucide-react";

interface MapViewProps {
  assets: any[];
  onAssetClick: (asset: any) => void;
}

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom marker icons based on status
const createMarkerIcon = (status: string) => {
  const color = status === "Available" ? "green" : status === "Booked" ? "red" : "blue";
  return L.icon({
    iconUrl: `https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
};

export function MapView({ assets, onAssetClick }: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!mapContainerRef.current || validAssets.length === 0) return;

    // Initialize map
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView(
        [validAssets[0].latitude, validAssets[0].longitude],
        12
      );

      // Add tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(mapRef.current);
    }

    // Clear existing markers
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        mapRef.current?.removeLayer(layer);
      }
    });

    // Add markers for each asset
    const bounds: L.LatLngBoundsExpression = [];
    validAssets.forEach((asset) => {
      const marker = L.marker([asset.latitude, asset.longitude], {
        icon: createMarkerIcon(asset.status),
      });

      // Create popup content
      const popupContent = `
        <div class="min-w-[250px] p-2">
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-bold text-sm">${asset.id}</h3>
            <span class="px-2 py-1 text-xs rounded ${
              asset.status === "Available"
                ? "bg-green-100 text-green-800"
                : asset.status === "Booked"
                ? "bg-red-100 text-red-800"
                : "bg-gray-100 text-gray-800"
            }">${asset.status}</span>
          </div>
          <div class="space-y-1 text-xs">
            <p><span class="font-semibold">Area:</span> ${asset.area}</p>
            <p><span class="font-semibold">Location:</span> ${asset.location}</p>
            <p><span class="font-semibold">City:</span> ${asset.city}</p>
            <p><span class="font-semibold">Type:</span> ${asset.media_type}</p>
            <p><span class="font-semibold">Size:</span> ${asset.dimensions}</p>
            ${asset.direction ? `<p><span class="font-semibold">Direction:</span> ${asset.direction}</p>` : ""}
            ${asset.illumination_type ? `<p><span class="font-semibold">Lighting:</span> ${asset.illumination_type}</p>` : ""}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on("click", () => onAssetClick(asset));
      marker.addTo(mapRef.current!);

      bounds.push([asset.latitude, asset.longitude]);
    });

    // Fit bounds to show all markers
    if (bounds.length > 0) {
      mapRef.current.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [50, 50] });
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [validAssets, onAssetClick]);

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

  return (
    <div className="h-full rounded-lg overflow-hidden border">
      <div ref={mapContainerRef} className="h-full w-full" />
    </div>
  );
}
