import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface OperationAsset {
  id: string;
  campaign_id: string;
  asset_id: string;
  location: string;
  city: string;
  area: string;
  status: string;
  installation_status: string;
  mounter_name: string | null;
  latitude: number | null;
  longitude: number | null;
  campaign_name?: string;
  client_name?: string;
}

interface OperationsMapViewProps {
  campaignId?: string;
}

export function OperationsMapView({ campaignId }: OperationsMapViewProps) {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<OperationAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    fetchOperations();
  }, [campaignId]);

  useEffect(() => {
    if (assets.length > 0 && mapContainerRef.current && !mapRef.current) {
      initializeMap();
    } else if (mapRef.current && assets.length > 0) {
      updateMarkers();
    }
  }, [assets]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const fetchOperations = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('campaign_assets')
        .select(`
          id,
          campaign_id,
          asset_id,
          location,
          city,
          area,
          status,
          installation_status,
          mounter_name,
          latitude,
          longitude,
          campaigns (campaign_name, client_name)
        `)
        .order('created_at', { ascending: false });

      if (campaignId) {
        query = query.eq('campaign_id', campaignId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const enrichedAssets = (data || []).map((item: any) => ({
        ...item,
        campaign_name: item.campaigns?.campaign_name,
        client_name: item.campaigns?.client_name,
      }));

      setAssets(enrichedAssets);
    } catch (error) {
      console.error('Error fetching operations for map:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeMap = () => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Filter assets with valid coordinates
    const validAssets = assets.filter(a => a.latitude && a.longitude);
    
    if (validAssets.length === 0) return;

    // Calculate center from valid assets
    const avgLat = validAssets.reduce((sum, a) => sum + (a.latitude || 0), 0) / validAssets.length;
    const avgLng = validAssets.reduce((sum, a) => sum + (a.longitude || 0), 0) / validAssets.length;

    // Create map
    const map = L.map(mapContainerRef.current).setView([avgLat || 17.385, avgLng || 78.4867], 12);
    
    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    mapRef.current = map;
    updateMarkers();
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Verified':
      case 'Completed':
        return '#10b981'; // green
      case 'Installed':
      case 'Mounted':
        return '#3b82f6'; // blue
      case 'Pending':
      case 'Assigned':
        return '#f59e0b'; // amber
      default:
        return '#6b7280'; // gray
    }
  };

  const updateMarkers = () => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    const validAssets = assets.filter(a => a.latitude && a.longitude);

    validAssets.forEach(asset => {
      const status = asset.installation_status || asset.status || 'Pending';
      const color = getStatusColor(status);

      // Create custom icon
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            width: 24px;
            height: 24px;
            background-color: ${color};
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          "></div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([asset.latitude!, asset.longitude!], { icon })
        .addTo(mapRef.current!);

      // Create popup content
      const popupContent = `
        <div style="min-width: 200px; font-family: system-ui, sans-serif;">
          <h4 style="margin: 0 0 8px 0; font-weight: 600;">${asset.asset_id}</h4>
          <p style="margin: 0 0 4px 0; font-size: 0.875rem; color: #666;">${asset.location}</p>
          <p style="margin: 0 0 8px 0; font-size: 0.75rem; color: #888;">${asset.city}, ${asset.area}</p>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="
              padding: 2px 8px;
              background-color: ${color}20;
              color: ${color};
              border-radius: 4px;
              font-size: 0.75rem;
              font-weight: 500;
            ">${status}</span>
            ${asset.mounter_name ? `<span style="font-size: 0.75rem; color: #666;">${asset.mounter_name}</span>` : ''}
          </div>
          ${asset.campaign_name ? `<p style="margin: 0; font-size: 0.75rem; color: #888;">Campaign: ${asset.campaign_name}</p>` : ''}
          <button 
            onclick="window.navigateToCampaign('${asset.campaign_id}')"
            style="
              margin-top: 8px;
              padding: 6px 12px;
              background-color: #3b82f6;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 0.75rem;
              width: 100%;
            "
          >View Campaign</button>
        </div>
      `;

      marker.bindPopup(popupContent);
      markersRef.current.push(marker);
    });

    // Fit bounds if we have markers
    if (validAssets.length > 0) {
      const bounds = L.latLngBounds(validAssets.map(a => [a.latitude!, a.longitude!]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  // Global function for popup button click
  useEffect(() => {
    (window as any).navigateToCampaign = (campaignId: string) => {
      navigate(`/admin/campaigns/${campaignId}`);
    };

    return () => {
      delete (window as any).navigateToCampaign;
    };
  }, [navigate]);

  const assetsWithGeo = assets.filter(a => a.latitude && a.longitude).length;
  const assetsMissingGeo = assets.length - assetsWithGeo;

  // Status counts
  const statusCounts = {
    verified: assets.filter(a => a.installation_status === 'Verified' || a.status === 'Completed').length,
    installed: assets.filter(a => a.installation_status === 'Installed' || a.status === 'Mounted').length,
    pending: assets.filter(a => a.installation_status === 'Pending' || a.status === 'Assigned' || !a.installation_status).length,
  };

  if (loading) {
    return (
      <div className="h-[600px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-muted-foreground">
        No operations found to display on map
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Legend and Stats */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-sm">Verified ({statusCounts.verified})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-sm">Installed ({statusCounts.installed})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className="text-sm">Pending ({statusCounts.pending})</span>
          </div>
        </div>
        
        {assetsMissingGeo > 0 && (
          <Badge variant="outline" className="text-amber-600">
            {assetsMissingGeo} assets missing geo-coordinates
          </Badge>
        )}
      </div>

      {/* Map Container */}
      <div 
        ref={mapContainerRef} 
        className="h-[600px] rounded-lg border overflow-hidden"
        style={{ zIndex: 0 }}
      />
    </div>
  );
}
