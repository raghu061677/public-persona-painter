import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  MapPin, 
  Maximize2, 
  Navigation, 
  Sun, 
  Layers,
  ExternalLink 
} from "lucide-react";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface PublicAssetDetail {
  id: string;
  city: string;
  area: string;
  location: string;
  media_type: string;
  dimensions: string;
  total_sqft: number | null;
  direction: string | null;
  illumination: string | null;
  status: string;
  images: any;
  latitude: number | null;
  longitude: number | null;
  google_street_view_url: string | null;
  is_multi_face: boolean | null;
  faces: any;
  company_name: string;
}

export default function MarketplaceAssetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<PublicAssetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (id) {
      fetchAssetDetail(id);
    }
  }, [id]);

  useEffect(() => {
    if (asset?.latitude && asset?.longitude && mapRef.current && !mapInstanceRef.current) {
      // Initialize map
      const map = L.map(mapRef.current).setView([asset.latitude, asset.longitude], 16);
      
      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      // Add marker
      const icon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      L.marker([asset.latitude, asset.longitude], { icon })
        .addTo(map)
        .bindPopup(`<b>${asset.id}</b><br>${asset.location}`)
        .openPopup();

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [asset]);

  const fetchAssetDetail = async (assetId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('public_media_assets_safe')
        .select('*')
        .eq('id', assetId)
        .single();

      if (error) throw error;

      if (!data) {
        toast({
          title: "Not Found",
          description: "Asset not found in marketplace",
          variant: "destructive",
        });
        navigate('/marketplace');
        return;
      }

      setAsset(data);

      // Extract image URLs from images object
      const urls: string[] = [];
      if (data.images && typeof data.images === 'object' && 'photos' in data.images) {
        const photos = (data.images as any).photos;
        if (Array.isArray(photos)) {
          photos.forEach((photo: any) => {
            if (photo && typeof photo === 'object' && photo.url) {
              urls.push(photo.url);
            }
          });
        }
      }
      setImageUrls(urls);
    } catch (error: any) {
      console.error('Error fetching asset detail:', error);
      toast({
        title: "Error",
        description: "Failed to load asset details",
        variant: "destructive",
      });
      navigate('/marketplace');
    } finally {
      setLoading(false);
    }
  };

  const openStreetView = () => {
    if (asset?.latitude && asset?.longitude) {
      const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${asset.latitude},${asset.longitude}`;
      window.open(url, '_blank');
    }
  };

  const openGoogleMaps = () => {
    if (asset?.latitude && asset?.longitude) {
      const url = `https://www.google.com/maps/search/?api=1&query=${asset.latitude},${asset.longitude}`;
      window.open(url, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading asset details...</p>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted-foreground">Asset not found</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/marketplace')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-3xl font-bold tracking-tight">{asset.id}</h2>
          <p className="text-muted-foreground">
            {asset.media_type} • {asset.company_name}
          </p>
        </div>
        <Badge variant={asset.status === 'Available' ? 'default' : 'secondary'} className="text-base px-4 py-2">
          {asset.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Images */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image Carousel */}
          <Card>
            <CardContent className="p-6">
              {imageUrls.length > 0 ? (
                <Carousel className="w-full">
                  <CarouselContent>
                    {imageUrls.map((url, index) => (
                      <CarouselItem key={index}>
                        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                          <img
                            src={url}
                            alt={`${asset.id} - Image ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  {imageUrls.length > 1 && (
                    <>
                      <CarouselPrevious />
                      <CarouselNext />
                    </>
                  )}
                </Carousel>
              ) : (
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">No images available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Map & Street View */}
          {asset.latitude && asset.longitude && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Location Views
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex flex-col gap-2"
                    onClick={openGoogleMaps}
                  >
                    <MapPin className="h-8 w-8" />
                    <span className="text-sm">Open in Google Maps</span>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex flex-col gap-2"
                    onClick={openStreetView}
                  >
                    <Navigation className="h-8 w-8" />
                    <span className="text-sm">Street View</span>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Interactive Map with Marker */}
                <div 
                  ref={mapRef} 
                  className="aspect-video rounded-lg overflow-hidden border"
                  style={{ minHeight: '400px' }}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Details */}
        <div className="space-y-6">
          {/* Location Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">City</p>
                <p className="font-semibold">{asset.city}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Area</p>
                <p className="font-semibold">{asset.area}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-semibold">{asset.location}</p>
              </div>
              {asset.direction && (
                <div>
                  <p className="text-sm text-muted-foreground">Direction</p>
                  <p className="font-semibold">{asset.direction}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Specifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Maximize2 className="h-5 w-5" />
                Specifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Media Type</p>
                <p className="font-semibold">{asset.media_type}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dimensions</p>
                <p className="font-semibold">{asset.dimensions}</p>
              </div>
              {asset.total_sqft && (
                <div>
                  <p className="text-sm text-muted-foreground">Total Area</p>
                  <p className="font-semibold">{asset.total_sqft} sq ft</p>
                </div>
              )}
              {asset.latitude && asset.longitude && (
                <div>
                  <p className="text-sm text-muted-foreground">Geo-Coordinates</p>
                  <p className="font-semibold text-xs">
                    {asset.latitude.toFixed(6)}, {asset.longitude.toFixed(6)}
                  </p>
                </div>
              )}
              {asset.illumination && (
                <div>
                  <p className="text-sm text-muted-foreground">Illumination</p>
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    <p className="font-semibold">{asset.illumination}</p>
                  </div>
                </div>
              )}
              {asset.is_multi_face && asset.faces && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Faces</p>
                  <div className="space-y-2">
                    {Array.isArray(asset.faces) && asset.faces.map((face: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <Layers className="h-4 w-4" />
                        <span>
                          Face {idx + 1}: {face.width}x{face.height} ft
                          {face.sqft && ` (${face.sqft} sq ft)`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact CTA */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Interested in this asset?</h3>
                  <p className="text-sm text-muted-foreground">
                    Contact us for pricing and availability
                  </p>
                </div>
                <Button 
                  className="w-full"
                  onClick={() => navigate('/marketplace')}
                >
                  Back to Marketplace
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
