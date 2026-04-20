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

      // Escape helper to keep popup safe from unexpected characters
      const esc = (v: any) =>
        v === null || v === undefined || v === ""
          ? "—"
          : String(v)
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;");

      const statusClass =
        asset.status === "Available"
          ? "background:#dcfce7;color:#166534;"
          : asset.status === "Booked"
          ? "background:#fee2e2;color:#991b1b;"
          : "background:#f3f4f6;color:#374151;";

      // Compact hover-card popup
      const popupContent = `
        <div style="min-width:220px;max-width:260px;font-family:inherit;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;">
            <h3 style="font-size:12px;font-weight:600;margin:0;line-height:1.2;">${esc(asset.media_asset_code || asset.id)}</h3>
            <span style="${statusClass}padding:2px 8px;font-size:10px;font-weight:600;border-radius:9999px;white-space:nowrap;">${esc(asset.status)}</span>
          </div>
          <div style="display:grid;grid-template-columns:auto 1fr;gap:4px 8px;font-size:11px;line-height:1.35;color:#1f2937;">
            <span style="color:#6b7280;">Location</span><span>${esc(asset.location)}</span>
            <span style="color:#6b7280;">Area</span><span>${esc(asset.area)}</span>
            <span style="color:#6b7280;">Direction</span><span>${esc(asset.direction)}</span>
            <span style="color:#6b7280;">Dimensions</span><span>${esc(asset.dimensions)}</span>
            <span style="color:#6b7280;">Illumination</span><span>${esc(asset.illumination_type)}</span>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        autoPan: false,
        closeButton: false,
        offset: L.point(0, -10),
        className: "ma-hover-popup",
      });
      marker.on("mouseover", () => marker.openPopup());
      marker.on("mouseout", () => marker.closePopup());
      marker.on("click", () => onAssetClick(asset));
      marker.addTo(mapRef.current!);

      bounds.push([asset.latitude, asset.longitude]);
    });

    // Fit bounds to show all markers
    if (bounds.length > 0) {
      mapRef.current.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [50, 50] });
    }

  }, [validAssets, onAssetClick]);

  // Destroy map only on unmount to avoid Leaflet `_leaflet_pos` errors on re-render
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

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
