import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin } from "lucide-react";

interface MarketplaceMapAsset {
  id: string;
  media_asset_code?: string | null;
  location: string;
  area: string;
  city: string;
  media_type: string;
  dimensions: string;
  direction?: string | null;
  illumination_type: string | null;
  status: string;
  latitude: number | null;
  longitude: number | null;
}

interface MarketplaceMapViewProps {
  assets: MarketplaceMapAsset[];
  onAssetClick: (asset: MarketplaceMapAsset) => void;
}

// Fix default marker icon (idempotent)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Explicit public status → marker color mapping.
// Keeps prior behavior for Available/Booked; documents the fallback for
// other public statuses (Blocked, Under Maintenance, Expired, etc.).
const STATUS_MARKER_COLOR: Record<string, string> = {
  Available: "green",
  Booked: "red",
  Blocked: "grey",
  "Under Maintenance": "orange",
  Maintenance: "orange",
  Expired: "grey",
};

const createMarkerIcon = (status: string) => {
  const color = STATUS_MARKER_COLOR[status] ?? "blue"; // unknown/other → blue
  return L.icon({
    iconUrl: `https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
};

const esc = (v: any) =>
  v === null || v === undefined || v === ""
    ? "—"
    : String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function MarketplaceMapView({ assets, onAssetClick }: MarketplaceMapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const validAssets = assets.filter(
    (a) =>
      a.latitude != null &&
      a.longitude != null &&
      !isNaN(Number(a.latitude)) &&
      !isNaN(Number(a.longitude)) &&
      Number(a.latitude) !== 0 &&
      Number(a.longitude) !== 0
  );

  // Init/update map and markers
  useEffect(() => {
    if (!mapContainerRef.current || validAssets.length === 0) return;

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView(
        [Number(validAssets[0].latitude), Number(validAssets[0].longitude)],
        12
      );
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

    const bounds: [number, number][] = [];
    validAssets.forEach((asset) => {
      const lat = Number(asset.latitude);
      const lng = Number(asset.longitude);
      const marker = L.marker([lat, lng], { icon: createMarkerIcon(asset.status) });

      const statusClass =
        asset.status === "Available"
          ? "background:#dcfce7;color:#166534;"
          : asset.status === "Booked"
          ? "background:#fee2e2;color:#991b1b;"
          : "background:#f3f4f6;color:#374151;";

      const popupContent = `
        <div style="min-width:220px;max-width:260px;font-family:inherit;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;">
            <h3 style="font-size:12px;font-weight:600;margin:0;line-height:1.2;">${esc(asset.media_asset_code || asset.id)}</h3>
            <span style="${statusClass}padding:2px 8px;font-size:10px;font-weight:600;border-radius:9999px;white-space:nowrap;">${esc(asset.status)}</span>
          </div>
          <div style="display:grid;grid-template-columns:auto 1fr;gap:4px 8px;font-size:11px;line-height:1.35;color:#1f2937;">
            <span style="color:#6b7280;">Location</span><span>${esc(asset.location)}</span>
            <span style="color:#6b7280;">Area</span><span>${esc(asset.area)}, ${esc(asset.city)}</span>
            <span style="color:#6b7280;">Media Type</span><span>${esc(asset.media_type)}</span>
            <span style="color:#6b7280;">Dimensions</span><span>${esc(asset.dimensions)}</span>
            ${asset.direction ? `<span style="color:#6b7280;">Direction</span><span>${esc(asset.direction)}</span>` : ""}
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

      bounds.push([lat, lng]);
    });

    if (bounds.length > 0) {
      mapRef.current.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [50, 50] });
    }
  }, [validAssets, onAssetClick]);

  // Destroy map on unmount only
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
      <div className="h-[600px] flex items-center justify-center bg-muted rounded-lg border">
        <div className="text-center p-8">
          <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Location Data</h3>
          <p className="text-sm text-muted-foreground">
            None of the matching assets have GPS coordinates available
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[600px] rounded-lg overflow-hidden border">
      <div ref={mapContainerRef} className="h-full w-full" />
    </div>
  );
}