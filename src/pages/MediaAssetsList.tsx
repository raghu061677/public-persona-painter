import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Upload, Filter, Eye, Edit, MapPin, Trash2, ChevronDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function MediaAssetsList() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Filter states
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [mediaTypeFilter, setMediaTypeFilter] = useState<string>("all");

  useEffect(() => {
    checkAdminStatus();
    fetchAssets();
    
    const channel = supabase
      .channel('media-assets-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'media_assets'
        },
        () => {
          fetchAssets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      setIsAdmin(data?.role === 'admin');
    }
  };

  const fetchAssets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('media_assets')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch media assets",
        variant: "destructive",
      });
    } else {
      setAssets(data || []);
    }
    setLoading(false);
  };

  const filteredAssets = assets.filter(asset => {
    if (cityFilter && cityFilter !== "all" && asset.city !== cityFilter) return false;
    if (statusFilter && statusFilter !== "all" && asset.status !== statusFilter) return false;
    if (mediaTypeFilter && mediaTypeFilter !== "all" && asset.media_type !== mediaTypeFilter) return false;
    return true;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAssets(filteredAssets.map(a => a.id));
    } else {
      setSelectedAssets([]);
    }
  };

  const handleSelectAsset = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedAssets([...selectedAssets, id]);
    } else {
      setSelectedAssets(selectedAssets.filter(assetId => assetId !== id));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this asset?")) return;

    const { error } = await supabase
      .from('media_assets')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete asset",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Asset deleted successfully",
      });
      fetchAssets();
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Available':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'Booked':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
      case 'Maintenance':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
      case 'Blocked':
        return 'bg-red-100 text-red-800 hover:bg-red-100';
      default:
        return '';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getImageUrl = (asset: any) => {
    if (asset.images && typeof asset.images === 'object' && asset.images.main) {
      return asset.images.main;
    }
    if (asset.image_urls && asset.image_urls.length > 0) {
      return asset.image_urls[0];
    }
    return null;
  };

  // Get unique values for filters
  const cities = [...new Set(assets.map(a => a.city).filter(Boolean))];
  const statuses = [...new Set(assets.map(a => a.status).filter(Boolean))];
  const mediaTypes = [...new Set(assets.map(a => a.media_type).filter(Boolean))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Media Assets</h1>
          <p className="text-muted-foreground mt-1">
            Manage your complete media inventory.
          </p>
        </div>
        <div className="flex gap-3">
          {isAdmin && (
            <Button variant="outline" onClick={() => navigate('/admin/media-assets/import')}>
              <Upload className="mr-2 h-4 w-4" />
              Import Excel
            </Button>
          )}
          {isAdmin && (
            <Button onClick={() => navigate('/admin/media-assets/new')}>
              <Plus className="mr-2 h-4 w-4" />
              New Asset
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm font-medium"
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
          <Button variant="link" size="sm" onClick={() => setShowFilters(!showFilters)}>
            {showFilters ? "Hide" : "Toggle"}
          </Button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">City</label>
              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Cities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {cities.map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statuses.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Media Type</label>
              <Select value={mediaTypeFilter} onValueChange={setMediaTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {mediaTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedAssets.length === filteredAssets.length && filteredAssets.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Asset ID</TableHead>
              <TableHead>Image</TableHead>
              <TableHead>Location / Landmark</TableHead>
              <TableHead>Media Type</TableHead>
              <TableHead>Dimensions</TableHead>
              <TableHead className="text-right">Total Sq. Ft.</TableHead>
              <TableHead className="text-right">Card Rate</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredAssets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  No media assets found
                </TableCell>
              </TableRow>
            ) : (
              filteredAssets.map((asset) => {
                const imageUrl = getImageUrl(asset);
                return (
                  <TableRow key={asset.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedAssets.includes(asset.id)}
                        onCheckedChange={(checked) => handleSelectAsset(asset.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{asset.id}</TableCell>
                    <TableCell>
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={asset.location}
                          className="w-16 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-16 h-12 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                          No image
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate" title={asset.location}>
                        {asset.location}
                      </div>
                      {asset.area && (
                        <div className="text-xs text-muted-foreground">{asset.area}</div>
                      )}
                    </TableCell>
                    <TableCell>{asset.media_type || '-'}</TableCell>
                    <TableCell>{asset.dimensions || '-'}</TableCell>
                    <TableCell className="text-right">
                      {asset.total_sqft ? asset.total_sqft.toFixed(2) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(asset.card_rate)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(asset.status)}>
                        {asset.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/admin/media-assets/${asset.id}`)}
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/admin/media-assets/${asset.id}`)}
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {asset.latitude && asset.longitude && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.open(`https://www.google.com/maps?q=${asset.latitude},${asset.longitude}`, '_blank')}
                                title="View on Map"
                              >
                                <MapPin className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(asset.id)}
                              title="Delete"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Selected count */}
      {selectedAssets.length > 0 && (
        <div className="fixed bottom-6 right-6 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg">
          {selectedAssets.length} asset{selectedAssets.length > 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  );
}
