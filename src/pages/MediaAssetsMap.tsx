import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Filter, X, Navigation, Layers } from "lucide-react";
import { formatCurrency } from "@/utils/mediaAssets";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
// @ts-ignore
import "leaflet.heat";

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
  total_sqft?: number;
  card_rate: number;
  status: string;
  direction?: string;
  illumination?: string;
  image_urls?: string[];
  images?: {
    frontView?: string;
    backView?: string;
    leftView?: string;
    rightView?: string;
    [key: string]: string | undefined;
  };
}

type AssetStatus = 'Available' | 'Booked' | 'Blocked' | 'Maintenance' | 'Pending Compliance';

interface StatusFilter {
  status: AssetStatus;
  color: string;
  enabled: boolean;
  count: number;
}

export default function MediaAssetsMap() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<MediaAsset[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [statusFilters, setStatusFilters] = useState<StatusFilter[]>([
    { status: 'Available', color: '#10b981', enabled: true, count: 0 },
    { status: 'Booked', color: '#3b82f6', enabled: true, count: 0 },
    { status: 'Blocked', color: '#ef4444', enabled: true, count: 0 },
    { status: 'Maintenance', color: '#f59e0b', enabled: true, count: 0 },
    { status: 'Pending Compliance', color: '#9ca3af', enabled: true, count: 0 },
  ]);
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const markerClusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const heatLayerRef = useRef<L.Layer | null>(null);

  useEffect(() => {
    fetchAssets();
  }, []);

  useEffect(() => {
    // Update counts when assets change
    const newFilters = statusFilters.map(filter => ({
      ...filter,
      count: assets.filter(a => a.status === filter.status).length
    }));
    setStatusFilters(newFilters);
  }, [assets]);

  useEffect(() => {
    filterAssets();
  }, [searchTerm, statusFilters, assets]);

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

  useEffect(() => {
    if (mapRef.current) {
      updateHeatmap();
    }
  }, [showHeatmap]);

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

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((asset) =>
        asset.location.toLowerCase().includes(term) ||
        asset.area.toLowerCase().includes(term) ||
        asset.city.toLowerCase().includes(term)
      );
    }

    // Apply status filters
    const enabledStatuses = statusFilters
      .filter(f => f.enabled)
      .map(f => f.status);
    
    if (enabledStatuses.length < statusFilters.length) {
      filtered = filtered.filter((asset) =>
        enabledStatuses.includes(asset.status as AssetStatus)
      );
    }

    setFilteredAssets(filtered);
  };

  const toggleStatusFilter = (status: AssetStatus) => {
    setStatusFilters(prev =>
      prev.map(f =>
        f.status === status ? { ...f, enabled: !f.enabled } : f
      )
    );
  };

  const getMarkerIcon = (status: string) => {
    const filter = statusFilters.find(f => f.status === status);
    const color = filter?.color || '#9ca3af';
    
    const svgIcon = `
      <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.163 0 0 7.163 0 16c0 13 16 26 16 26s16-13 16-26c0-8.837-7.163-16-16-16z" 
              fill="${color}" stroke="white" stroke-width="2"/>
        <circle cx="16" cy="16" r="6" fill="white"/>
      </svg>
    `;

    return L.divIcon({
      html: svgIcon,
      className: 'custom-marker',
      iconSize: [32, 42],
      iconAnchor: [16, 42],
      popupAnchor: [0, -42]
    });
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

    // Initialize marker cluster group
    markerClusterGroupRef.current = L.markerClusterGroup({
      maxClusterRadius: 80,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: true,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        let size = 'small';
        if (count > 10) size = 'medium';
        if (count > 50) size = 'large';
        
        return L.divIcon({
          html: `<div class="cluster-icon cluster-${size}">${count}</div>`,
          className: 'custom-cluster-icon',
          iconSize: L.point(40, 40),
        });
      }
    });
    mapRef.current.addLayer(markerClusterGroupRef.current);

    // Add markers
    updateMarkers();
  };

  const updateMarkers = () => {
    if (!mapRef.current || !markerClusterGroupRef.current) return;

    // Clear existing markers
    markerClusterGroupRef.current.clearLayers();
    markersRef.current = [];

    // Add new markers
    filteredAssets.forEach((asset) => {
      // Get all available images
      let imageUrls: string[] = [];
      
      // Try image_urls array first
      if (asset.image_urls && asset.image_urls.length > 0) {
        imageUrls = asset.image_urls.map(url => {
          // If it's a Supabase storage path, get the public URL
          if (url.startsWith('media-assets/')) {
            const { data } = supabase.storage.from('media-assets').getPublicUrl(url);
            return data.publicUrl;
          }
          return url;
        });
      } 
      // Then try images object
      else if (asset.images) {
        const imageKeys = ['frontView', 'backView', 'leftView', 'rightView'];
        imageUrls = imageKeys
          .map(key => {
            const url = asset.images?.[key];
            if (!url) return null;
            // If it's a Supabase storage path, get the public URL
            if (url.startsWith('media-assets/')) {
              const { data } = supabase.storage.from('media-assets').getPublicUrl(url);
              return data.publicUrl;
            }
            return url;
          })
          .filter((url): url is string => !!url);
      }

      const firstImageUrl = imageUrls[0] || "";
      const filter = statusFilters.find(f => f.status === asset.status);
      const statusColor = filter?.color || '#9ca3af';

      const popupContent = `
        <div style="min-width: 300px; max-width: 350px; font-family: system-ui;">
          ${firstImageUrl ? `
            <div style="margin-bottom: 12px; position: relative;">
              <img src="${firstImageUrl}" alt="${asset.location}" 
                   style="width: 100%; height: 180px; object-fit: cover; border-radius: 8px;" 
                   onerror="this.style.display='none'" />
              ${imageUrls.length > 1 ? `
                <div style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.7); color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem;">
                  +${imageUrls.length - 1} photos
                </div>
              ` : ''}
            </div>
          ` : ''}
          <h3 style="font-weight: 700; font-size: 1.1rem; margin-bottom: 4px; color: #1f2937;">${asset.location}</h3>
          <p style="font-size: 0.875rem; color: #6b7280; margin-bottom: 12px;">${asset.area}</p>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; font-size: 0.875rem;">
            <div>
              <div style="font-weight: 500; color: #6b7280; font-size: 0.75rem;">Dimensions</div>
              <div style="font-weight: 600; color: #1f2937;">${asset.dimensions}</div>
            </div>
            ${asset.total_sqft ? `
              <div>
                <div style="font-weight: 500; color: #6b7280; font-size: 0.75rem;">Sq. Ft.</div>
                <div style="font-weight: 600; color: #1f2937;">${asset.total_sqft.toFixed(2)}</div>
              </div>
            ` : ''}
          </div>

          ${asset.illumination || asset.direction ? `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; font-size: 0.875rem;">
              ${asset.illumination ? `
                <div>
                  <div style="font-weight: 500; color: #6b7280; font-size: 0.75rem;">Illumination</div>
                  <div style="font-weight: 600; color: #1f2937;">${asset.illumination}</div>
                </div>
              ` : ''}
              ${asset.direction ? `
                <div>
                  <div style="font-weight: 500; color: #6b7280; font-size: 0.75rem;">Direction</div>
                  <div style="font-weight: 600; color: #1f2937;">${asset.direction}</div>
                </div>
              ` : ''}
            </div>
          ` : ''}

          <div style="padding: 12px; background: #f9fafb; border-radius: 8px; margin-bottom: 12px;">
            <div style="font-size: 1.5rem; font-weight: 700; color: #1f2937;">
              ${formatCurrency(asset.card_rate)}
            </div>
            <div style="font-size: 0.75rem; color: #6b7280; margin-top: 2px;">per month</div>
          </div>

          <div style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; background: ${statusColor}15; border-radius: 6px;">
            <div style="width: 8px; height: 8px; border-radius: 50%; background: ${statusColor};"></div>
            <span style="font-weight: 600; font-size: 0.875rem; color: ${statusColor};">${asset.status}</span>
          </div>
        </div>
      `;

      const marker = L.marker([asset.latitude, asset.longitude], {
        icon: getMarkerIcon(asset.status)
      })
        .bindPopup(popupContent, {
          maxWidth: 350,
          className: 'custom-popup'
        });

      markerClusterGroupRef.current!.addLayer(marker);
      markersRef.current.push(marker);
    });

    // Update heatmap if enabled
    updateHeatmap();

    // Fit map to markers if we have any
    if (markersRef.current.length > 0) {
      const bounds = markerClusterGroupRef.current!.getBounds();
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds.pad(0.1));
      }
    }
  };

  const updateHeatmap = () => {
    if (!mapRef.current) return;

    // Remove existing heatmap
    if (heatLayerRef.current) {
      mapRef.current.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    // Add new heatmap if enabled
    if (showHeatmap && filteredAssets.length > 0) {
      const heatData = filteredAssets.map(asset => [
        asset.latitude,
        asset.longitude,
        0.5 // intensity
      ]);

      // @ts-ignore - leaflet.heat types
      heatLayerRef.current = L.heatLayer(heatData, {
        radius: 25,
        blur: 15,
        maxZoom: 13,
        gradient: {
          0.0: '#3b82f6',
          0.5: '#f59e0b',
          1.0: '#ef4444'
        }
      }).addTo(mapRef.current);
    }
  };

  const centerOnUserLocation = () => {
    if (!mapRef.current) return;

    if ('geolocation' in navigator) {
      toast({
        title: "Locating...",
        description: "Finding your current location",
      });

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          mapRef.current?.setView([latitude, longitude], 15);

          // Add temporary marker for user location
          const userMarker = L.marker([latitude, longitude], {
            icon: L.divIcon({
              html: `<div style="background: #3b82f6; border: 3px solid white; border-radius: 50%; width: 20px; height: 20px; box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);"></div>`,
              className: 'user-location-marker',
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            })
          }).addTo(mapRef.current!);

          setTimeout(() => userMarker.remove(), 5000);

          toast({
            title: "Location Found",
            description: "Map centered on your location",
          });
        },
        (error) => {
          toast({
            title: "Location Error",
            description: error.message || "Could not get your location",
            variant: "destructive",
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    } else {
      toast({
        title: "Not Supported",
        description: "Geolocation is not supported by your browser",
        variant: "destructive",
      });
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
      {/* Header */}
      <div className="flex-none px-6 py-6 border-b border-border bg-card">
        <div className="space-y-2 mb-6">
          <h1 className="text-3xl font-bold text-foreground">Media Assets on Map</h1>
          <p className="text-sm text-muted-foreground">
            A complete geographical overview of all your media assets.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">
              Asset Locations ({filteredAssets.length})
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              {showFilters ? 'Hide' : 'Show'} Filters
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Filter assets by location or area. Click on any marker or cluster to see details.
          </p>

          <Input
            placeholder="Search by Location / Landmark..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-md"
          />
        </div>
      </div>

      {/* Map Container with Filters Overlay */}
      <div className="flex-1 relative">
        {filteredAssets.length > 0 ? (
          <>
            <div ref={mapContainerRef} className="absolute inset-0" />
            
            {/* Filters & Legend Card */}
            {showFilters && (
              <Card className="absolute top-4 right-4 z-[1000] w-60 shadow-lg">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      Filters
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setShowFilters(false)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Heatmap Toggle */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-accent/30 border border-border">
                    <Label htmlFor="heatmap-toggle" className="text-xs font-medium cursor-pointer flex items-center gap-1.5">
                      <Layers className="h-3 w-3 text-primary" />
                      Heatmap
                    </Label>
                    <Switch
                      id="heatmap-toggle"
                      checked={showHeatmap}
                      onCheckedChange={setShowHeatmap}
                      className="scale-75"
                    />
                  </div>

                  {/* Status Filters */}
                  <div className="space-y-2">
                    {statusFilters.map((filter) => (
                      <div
                        key={filter.status}
                        className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => toggleStatusFilter(filter.status)}
                      >
                        <Checkbox
                          checked={filter.enabled}
                          onCheckedChange={() => toggleStatusFilter(filter.status)}
                          className="pointer-events-none"
                        />
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: filter.color }}
                        />
                        <span className="font-medium text-sm flex-1">{filter.status}</span>
                        <Badge variant="secondary" className="text-xs">
                          {filter.count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* My Location Button */}
            <Button
              onClick={centerOnUserLocation}
              size="icon"
              className="absolute bottom-24 right-4 z-[1000] h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90"
              title="Center on my location"
            >
              <Navigation className="h-5 w-5" />
            </Button>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <p className="text-lg font-medium text-muted-foreground">
                {assets.length === 0
                  ? "No geotagged assets found"
                  : "No assets match your search criteria"}
              </p>
              {searchTerm && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchTerm("")}
                >
                  Clear Search
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .custom-marker {
          background: transparent;
          border: none;
        }
        .custom-popup .leaflet-popup-content-wrapper {
          padding: 0;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        }
        .custom-popup .leaflet-popup-content {
          margin: 0;
          width: auto !important;
        }
        .custom-popup .leaflet-popup-tip {
          background: white;
        }
        .custom-cluster-icon {
          background: transparent;
          border: none;
        }
        .cluster-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          font-weight: 700;
          color: white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          border: 3px solid white;
        }
        .cluster-small {
          background: #10b981;
          width: 40px;
          height: 40px;
          font-size: 14px;
        }
        .cluster-medium {
          background: #f59e0b;
          width: 50px;
          height: 50px;
          font-size: 16px;
        }
        .cluster-large {
          background: #ef4444;
          width: 60px;
          height: 60px;
          font-size: 18px;
        }
        .user-location-marker {
          background: transparent;
          border: none;
        }
      `}</style>
    </div>
  );
}
