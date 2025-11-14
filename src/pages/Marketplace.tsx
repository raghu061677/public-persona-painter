import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, MapPin, Building2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/contexts/CompanyContext";

interface MarketplaceAsset {
  id: string;
  city: string;
  area: string;
  location: string;
  media_type: string;
  dimensions: string;
  card_rate: number;
  status: string;
  image_urls: string[];
  company_id: string;
  company_name?: string;
  company_type?: string;
}

export default function Marketplace() {
  const navigate = useNavigate();
  const { company, isPlatformAdmin } = useCompany();
  const [assets, setAssets] = useState<MarketplaceAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedMediaType, setSelectedMediaType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("Available");

  useEffect(() => {
    fetchMarketplaceAssets();
  }, [selectedCity, selectedMediaType, selectedStatus]);

  const fetchMarketplaceAssets = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('media_assets')
        .select(`
          *,
          companies:company_id (
            name,
            type
          )
        `)
        .eq('is_public', true);

      if (selectedCity !== "all") {
        query = query.eq('city', selectedCity);
      }
      if (selectedMediaType !== "all") {
        query = query.eq('media_type', selectedMediaType);
      }
      if (selectedStatus !== "all") {
        query = query.eq('status', selectedStatus as any);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      const formattedAssets = data?.map((asset: any) => ({
        ...asset,
        company_name: asset.companies?.name,
        company_type: asset.companies?.type,
      })) || [];

      setAssets(formattedAssets);
    } catch (error: any) {
      console.error('Error fetching marketplace assets:', error);
      toast({
        title: "Error",
        description: "Failed to load marketplace assets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredAssets = assets.filter(asset => {
    const searchLower = searchQuery.toLowerCase();
    return (
      asset.id.toLowerCase().includes(searchLower) ||
      asset.location.toLowerCase().includes(searchLower) ||
      asset.area.toLowerCase().includes(searchLower) ||
      asset.city.toLowerCase().includes(searchLower) ||
      asset.company_name?.toLowerCase().includes(searchLower)
    );
  });

  const cities = Array.from(new Set(assets.map(a => a.city))).sort();
  const mediaTypes = Array.from(new Set(assets.map(a => a.media_type))).sort();

  const canRequestBooking = company?.type === 'agency' || isPlatformAdmin;

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-8 pt-6">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Marketplace</h2>
          <p className="text-muted-foreground">
            Browse and book public OOH media assets from multiple media owners
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by location, area, city, or owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={selectedCity} onValueChange={setSelectedCity}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="City" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {cities.map(city => (
                <SelectItem key={city} value={city}>{city}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedMediaType} onValueChange={setSelectedMediaType}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Media Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {mediaTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Available">Available</SelectItem>
              <SelectItem value="Booked">Booked</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading marketplace assets...</p>
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No assets found matching your criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssets.map((asset) => (
            <Card key={asset.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="p-0">
                {asset.image_urls?.[0] ? (
                  <img
                    src={asset.image_urls[0]}
                    alt={asset.location}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                ) : (
                  <div className="w-full h-48 bg-muted flex items-center justify-center rounded-t-lg">
                    <Building2 className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{asset.id}</h3>
                    <p className="text-sm text-muted-foreground">{asset.media_type}</p>
                  </div>
                  <Badge variant={asset.status === 'Available' ? 'default' : 'secondary'}>
                    {asset.status}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{asset.area}, {asset.city}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {asset.company_name || 'Unknown Owner'}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{asset.location}</p>
                  <p className="font-semibold">Dimensions: {asset.dimensions}</p>
                  <p className="text-lg font-bold text-primary">
                    ₹{asset.card_rate.toLocaleString()}/month
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate(`/admin/media-assets/${asset.id}`)}
                  >
                    View Details
                  </Button>
                  {canRequestBooking && asset.status === 'Available' && (
                    <Button
                      className="flex-1"
                      onClick={() => {
                        toast({
                          title: "Booking Request",
                          description: "Contact the media owner to book this asset",
                        });
                      }}
                    >
                      Request Booking
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
