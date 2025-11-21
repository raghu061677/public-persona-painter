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
    <div className="flex-1 space-y-8 p-4 sm:p-8 pt-8 bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/marketplace')}
          className="hover:bg-primary/10"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {asset.id}
          </h1>
          <p className="text-lg text-muted-foreground mt-2 font-medium">
            {asset.media_type} • {asset.company_name}
          </p>
        </div>
        <Badge 
          variant={asset.status === 'Available' ? 'default' : 'secondary'} 
          className="text-base px-6 py-2 font-semibold"
        >
          {asset.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Images */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image Carousel */}
          <Card className="border-2 shadow-lg">
            <CardContent className="p-6">
              {imageUrls.length > 0 ? (
                <Carousel className="w-full">
                  <CarouselContent>
                    {imageUrls.map((url, index) => (
                      <CarouselItem key={index}>
                        <div className="relative aspect-video bg-muted rounded-xl overflow-hidden shadow-md">
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
                      <CarouselPrevious className="left-4" />
                      <CarouselNext className="right-4" />
                    </>
                  )}
                </Carousel>
              ) : (
                <div className="aspect-video bg-muted rounded-xl flex items-center justify-center shadow-inner">
                  <p className="text-muted-foreground text-lg">No images available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Map & Street View */}
          {asset.latitude && asset.longitude && (
            <Card className="border-2 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <MapPin className="h-6 w-6 text-primary" />
                  Location Views
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    className="h-auto py-6 flex flex-col gap-2 hover:bg-primary/5 hover:border-primary transition-all"
                    onClick={openGoogleMaps}
                  >
                    <MapPin className="h-8 w-8 text-primary" />
                    <span className="text-sm font-semibold">Open in Google Maps</span>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-6 flex flex-col gap-2 hover:bg-primary/5 hover:border-primary transition-all"
                    onClick={openStreetView}
                  >
                    <Navigation className="h-8 w-8 text-primary" />
                    <span className="text-sm font-semibold">Street View</span>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
                
                {/* Interactive Map with Marker */}
                <div 
                  ref={mapRef} 
                  className="aspect-video rounded-xl overflow-hidden border-2 shadow-md"
                  style={{ minHeight: '400px' }}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Details */}
        <div className="space-y-6">
          {/* Location Details */}
          <Card className="border-2 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3 bg-primary/5">
              <CardTitle className="flex items-center gap-2 text-xl">
                <MapPin className="h-6 w-6 text-primary" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div>
                <p className="text-sm text-muted-foreground font-medium">City</p>
                <p className="font-bold text-lg">{asset.city}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Area</p>
                <p className="font-bold text-lg">{asset.area}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Location</p>
                <p className="font-bold text-lg">{asset.location}</p>
              </div>
              {asset.direction && (
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Direction</p>
                  <p className="font-bold text-lg">{asset.direction}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Specifications */}
          <Card className="border-2 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3 bg-primary/5">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Maximize2 className="h-6 w-6 text-primary" />
                Specifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Media Type</p>
                <Badge variant="secondary" className="mt-1 text-base font-semibold">
                  {asset.media_type}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Dimensions</p>
                <p className="font-bold text-lg">{asset.dimensions}</p>
              </div>
              {asset.total_sqft && (
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total Area</p>
                  <p className="font-bold text-lg text-primary">{asset.total_sqft} sq ft</p>
                </div>
              )}
              {asset.latitude && asset.longitude && (
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Geo-Coordinates</p>
                  <p className="font-mono text-sm font-semibold bg-muted px-2 py-1 rounded">
                    {asset.latitude.toFixed(6)}, {asset.longitude.toFixed(6)}
                  </p>
                </div>
              )}
              {asset.illumination && (
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Illumination</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Sun className="h-5 w-5 text-yellow-500" />
                    <p className="font-bold text-lg">{asset.illumination}</p>
                  </div>
                </div>
              )}
              {asset.is_multi_face && asset.faces && (
                <div>
                  <p className="text-sm text-muted-foreground font-medium mb-2">Faces</p>
                  <div className="space-y-2">
                    {Array.isArray(asset.faces) && asset.faces.map((face: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                        <Layers className="h-5 w-5 text-primary" />
                        <span className="font-semibold">
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
          <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-2 border-primary/30 shadow-lg">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div>
                  <h3 className="font-bold text-xl mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Interested in this asset?
                  </h3>
                  <p className="text-muted-foreground font-medium">
                    Contact us for pricing and availability
                  </p>
                </div>
                <Button 
                  className="w-full py-6 text-base font-semibold shadow-md hover:shadow-lg transition-all"
                  onClick={() => navigate('/marketplace')}
                >
                  Back to Marketplace
                  <ArrowLeft className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
