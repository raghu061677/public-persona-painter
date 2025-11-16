import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card } from "@/components/ui/card";
import { MapPin } from "lucide-react";

interface ProofLocation {
  id: string;
  location: string;
  latitude: number;
  longitude: number;
  photoCount: number;
  status: string;
}

interface ProofMapViewProps {
  locations: ProofLocation[];
  onLocationClick?: (locationId: string) => void;
}

export function ProofMapView({ locations, onLocationClick }: ProofMapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    // Initialize map centered on India
    const map = L.map(mapContainer.current).setView([20.5937, 78.9629], 5);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !locations.length) return;

    // Clear existing markers
    mapInstance.current.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        layer.remove();
      }
    });

    // Create custom icons based on status
    const getMarkerColor = (status: string) => {
      switch (status) {
        case 'verified':
          return '#10b981'; // green
        case 'proof_uploaded':
          return '#3b82f6'; // blue
        case 'installed':
          return '#f59e0b'; // amber
        default:
          return '#64748b'; // gray
      }
    };

    // Add markers for each location
    const bounds = L.latLngBounds([]);
    
    locations.forEach((loc) => {
      const color = getMarkerColor(loc.status);
      
      const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            background: ${color};
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
            font-size: 12px;
          ">
            ${loc.photoCount}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([loc.latitude, loc.longitude], { icon: customIcon })
        .addTo(mapInstance.current!)
        .bindPopup(`
          <div style="padding: 8px; min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-weight: 600; font-size: 14px;">${loc.location}</h3>
            <p style="margin: 4px 0; font-size: 12px; color: #64748b;">
              ${loc.photoCount} proof photo${loc.photoCount !== 1 ? 's' : ''}
            </p>
            <p style="margin: 4px 0; font-size: 12px;">
              Status: <span style="color: ${color}; font-weight: 500;">${loc.status.replace('_', ' ')}</span>
            </p>
          </div>
        `);

      if (onLocationClick) {
        marker.on('click', () => onLocationClick(loc.id));
      }

      bounds.extend([loc.latitude, loc.longitude]);
    });

    // Fit map to show all markers
    if (locations.length > 0) {
      mapInstance.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [locations, onLocationClick]);

  if (!locations.length) {
    return (
      <Card className="p-8 text-center">
        <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="font-semibold mb-2">No Location Data</h3>
        <p className="text-sm text-muted-foreground">
          Proof photos will appear on the map once they include GPS coordinates
        </p>
      </Card>
    );
  }

  return (
    <div className="relative">
      <div ref={mapContainer} className="w-full h-[500px] rounded-lg border border-border" />
      <div className="absolute top-4 right-4 bg-background/95 backdrop-blur p-3 rounded-lg border border-border shadow-lg">
        <div className="text-xs space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Verified</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span>Proof Uploaded</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span>Installed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
