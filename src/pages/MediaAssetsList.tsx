import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Building2, MapPin, TrendingUp, Layers, ShieldCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ROUTES } from "@/lib/routes";
import { MediaAssetsTable } from "@/components/media-assets/media-assets-table";
import { ImportDialog } from "@/components/media-assets/import-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";

export default function MediaAssetsList() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchAssets();
  }, []);

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

  // Calculate stats
  const totalAssets = assets.length;
  const availableAssets = assets.filter(a => a.status === 'Available').length;
  const uniqueCities = new Set(assets.map(a => a.city).filter(Boolean)).size;
  const totalValue = assets.reduce((sum, a) => sum + (a.card_rate || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
          {/* Header Skeleton */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-5 w-96" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
          
          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          
          {/* Table Skeleton */}
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="w-full px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Media Assets
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Manage your complete outdoor advertising inventory
            </p>
          </div>
          
          {/* Combined Stats Box */}
          <Card className="w-full lg:w-auto border-l-4 border-l-blue-500 shadow-sm bg-gradient-to-br from-blue-50/50 to-blue-100/30 dark:from-blue-950/20 dark:to-blue-900/20">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4 lg:flex lg:gap-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Layers className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Assets</p>
                    <p className="text-xl font-bold">{totalAssets}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Available</p>
                    <p className="text-xl font-bold">{availableAssets}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cities</p>
                    <p className="text-xl font-bold">{uniqueCities}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Value</p>
                    <p className="text-xl font-bold">₹{(totalValue / 100000).toFixed(1)}L</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant="outline"
            onClick={() => navigate('/admin/media-assets/map')}
          >
            <MapPin className="mr-2 h-4 w-4" />
            Map View
          </Button>
          {isAdmin && (
            <>
              <Button
                variant="outline"
                onClick={() => navigate(ROUTES.MEDIA_ASSETS_VALIDATION)}
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                Validate Assets
              </Button>
              <ImportDialog onImportComplete={fetchAssets} />
              <Button 
                onClick={() => navigate('/admin/media-assets/new')}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Asset
              </Button>
            </>
          )}
        </div>

        {/* Table Section with full width */}
        <div className="w-full">
          <MediaAssetsTable assets={assets} onRefresh={fetchAssets} />
        </div>
      </div>
    </div>
  );
}
