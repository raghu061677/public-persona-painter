import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, MapPin, TrendingUp, Layers, ShieldCheck, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ROUTES } from "@/lib/routes";
import { MediaAssetsTable } from "@/components/media-assets/media-assets-table";
import { ImportDialog } from "@/components/media-assets/import-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonTable } from "@/components/ui/loading-skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { FloatingActionButton } from "@/components/ui/floating-action-button";

export default function MediaAssetsList() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();
  
  // Sidebar collapse state - default collapsed on smaller screens
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('media-assets-sidebar-collapsed');
    return saved !== null ? JSON.parse(saved) : window.innerWidth < 1366;
  });

  useEffect(() => {
    fetchAssets();
  }, []);

  useEffect(() => {
    localStorage.setItem('media-assets-sidebar-collapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

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
  const totalValue = assets.reduce((sum, a) => sum + (a.card_rate || 0), 0);

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
      icon: MapPin,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950/20"
    },
    {
      title: "Total Value",
      value: `₹${(totalValue / 100000).toFixed(1)}L`,
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
    <div className="h-screen w-full flex flex-col bg-background overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex-none border-b bg-card">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="shrink-0"
              title={sidebarCollapsed ? "Show Sidebar" : "Hide Sidebar"}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Media Assets</h1>
              <p className="text-sm text-muted-foreground">
                Manage and track all OOH advertising assets
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ImportDialog onImportComplete={fetchAssets} />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Collapsible Sidebar */}
        <aside
          className={cn(
            "flex-none border-r bg-card transition-all duration-300 overflow-y-auto",
            sidebarCollapsed ? "w-0 border-r-0" : "w-80"
          )}
        >
          <div className={cn("p-6 space-y-6", sidebarCollapsed && "hidden")}>
            {/* Stats Cards */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Quick Stats</h3>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {statCards.map((stat, index) => (
                  <Card key={index} className="shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground font-medium">
                            {stat.title}
                          </p>
                          <p className="text-2xl font-bold mt-1">{stat.value}</p>
                        </div>
                        <div className={cn("p-3 rounded-lg", stat.bgColor)}>
                          <stat.icon className={cn("h-5 w-5", stat.color)} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Info Section */}
            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Filter Info</h3>
              </div>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>• Use table filters for advanced search</p>
                <p>• Click column headers to sort</p>
                <p>• Toggle columns with the settings icon</p>
                <p>• Select rows for bulk actions</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Table Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto py-4">
            <MediaAssetsTable 
              assets={assets} 
              onRefresh={fetchAssets}
            />
          </div>
        </main>
      </div>

      {/* Floating Quick Add Button */}
      {isAdmin && (
        <FloatingActionButton
          onClick={() => navigate(ROUTES.MEDIA_ASSETS_NEW)}
          label="Add Asset"
          aria-label="Add new media asset"
        />
      )}
    </div>
  );
}
