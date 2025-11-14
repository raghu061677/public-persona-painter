import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, TrendingUp, Layers, ShieldCheck, Map as MapIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ROUTES } from "@/lib/routes";
import { MediaAssetsTable } from "@/components/media-assets/media-assets-table";
import { ImportDialog } from "@/components/media-assets/import-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonTable } from "@/components/ui/loading-skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

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
    
    // Fetch media assets
    const { data: assetsData, error: assetsError } = await supabase
      .from('media_assets')
      .select('*')
      .order('id', { ascending: true });

    if (assetsError) {
      toast({
        title: "Error",
        description: "Failed to fetch media assets",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Fetch latest photos for each asset
    const { data: photosData } = await supabase
      .from('media_photos')
      .select('asset_id, photo_url, uploaded_at')
      .order('uploaded_at', { ascending: false });

    // Group photos by asset_id and get the latest one
    const latestPhotoMap = new Map();
    if (photosData) {
      photosData.forEach((photo) => {
        if (!latestPhotoMap.has(photo.asset_id)) {
          latestPhotoMap.set(photo.asset_id, photo.photo_url);
        }
      });
    }

    // Merge latest photos into assets data
    const enrichedAssets = (assetsData || []).map(asset => {
      const images = typeof asset.images === 'object' && asset.images !== null 
        ? asset.images as any 
        : {};
      
      const existingPhotos = Array.isArray(images.photos) ? images.photos : [];
      const latestPhoto = latestPhotoMap.get(asset.id);
      
      return {
        ...asset,
        images: {
          ...images,
          photos: latestPhoto 
            ? [{ url: latestPhoto, tag: 'Latest', uploaded_at: new Date().toISOString() }, ...existingPhotos]
            : existingPhotos
        }
      };
    });

    setAssets(enrichedAssets);
    setLoading(false);
  };

  // Calculate stats
  const totalAssets = assets.length;
  const availableAssets = assets.filter(a => a.status === 'Available').length;
  const uniqueCities = new Set(assets.map(a => a.city).filter(Boolean)).size;
  const totalValue = assets.reduce((sum, a) => sum + (Number(a.card_rate) || 0), 0);

  const statCards = [
    {
      title: "Total Assets",
      value: totalAssets,
      icon: Layers,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/20"
    },
    {
      title: "Available",
      value: availableAssets,
      icon: ShieldCheck,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950/20"
    },
    {
      title: "Cities",
      value: uniqueCities,
      icon: MapIcon,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950/20"
    },
    {
      title: "Total Value",
      value: totalValue,
      icon: TrendingUp,
      color: "text-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-950/20"
    }
  ];

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <div className="flex-none p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-32" />
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-hidden p-6">
          <SkeletonTable rows={15} columns={8} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <ImportDialog onImportComplete={fetchAssets} />

      {/* Header with Stats */}
      <div className="flex-none border-b bg-card">
        <div className="px-6 py-4 space-y-6">
          {/* Title and Actions */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Media Assets</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage and track all OOH advertising assets
              </p>
            </div>
            
            {isAdmin && (
              <Button onClick={() => navigate(ROUTES.MEDIA_ASSETS_NEW)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Asset
              </Button>
            )}
          </div>

          {/* Quick Stats - Horizontal */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={index} className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">
                          {stat.title}
                        </p>
                        <p className="text-2xl font-bold">
                          {stat.title === "Total Value" 
                            ? `₹${(stat.value / 100000).toFixed(1)}L`
                            : Number(stat.value).toLocaleString()
                          }
                        </p>
                      </div>
                      <div className={cn("p-2 rounded-lg", stat.bgColor)}>
                        <Icon className={cn("h-5 w-5", stat.color)} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Table Area */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto p-6">
          <MediaAssetsTable 
            assets={assets} 
            onRefresh={fetchAssets}
          />
        </div>
      </div>
    </div>
  );
}
