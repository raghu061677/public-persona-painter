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
import { SkeletonStats, SkeletonTable } from "@/components/ui/loading-skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { PageCustomization, PageCustomizationOption } from "@/components/ui/page-customization";

export default function MediaAssetsList() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();
  
  // Page customization state
  const [showStats, setShowStats] = useState(true);
  const [showHeader, setShowHeader] = useState(true);
  const [showActionButtons, setShowActionButtons] = useState(true);

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
  
  // Customization options
  const customizationOptions: PageCustomizationOption[] = [
    {
      id: 'show-header',
      label: 'Page Header',
      description: 'Show page title and description',
      enabled: showHeader,
      onChange: setShowHeader,
    },
    {
      id: 'show-stats',
      label: 'Statistics Cards',
      description: 'Display summary statistics',
      enabled: showStats,
      onChange: setShowStats,
    },
    {
      id: 'show-actions',
      label: 'Action Buttons',
      description: 'Show add and import buttons',
      enabled: showActionButtons,
      onChange: setShowActionButtons,
    },
  ];

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
          <SkeletonStats count={4} />
          
          {/* Table Skeleton */}
          <SkeletonTable rows={10} columns={6} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/20">
      <div className="flex-none px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Header Section with Customization */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {showHeader && (
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
                Media Assets Inventory
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-2 flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Complete management of your outdoor advertising portfolio
              </p>
            </div>
          )}
          
          <div className="flex items-center gap-2 flex-wrap">
            <PageCustomization options={customizationOptions} />
          
            {showActionButtons && isAdmin && (
              <>
                <ImportDialog onImportComplete={fetchAssets} />
                <Button
                  size="default"
                  onClick={() => navigate(ROUTES.MEDIA_ASSETS_NEW)}
                  className="shadow-lg hover:shadow-xl transition-shadow gap-2"
                >
                  <Plus className="h-5 w-5" />
                  <span className="hidden sm:inline">Add New Asset</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Enhanced Stats Cards */}
        {showStats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="border-l-4 border-l-primary shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                    <Layers className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl sm:text-2xl font-bold truncate">{totalAssets}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Total Assets</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-accent shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-accent/5 to-accent/10">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl sm:text-2xl font-bold truncate">{availableAssets}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Available</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-blue-500/5 to-blue-500/10">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl sm:text-2xl font-bold truncate">{uniqueCities}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Cities</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-green-500/5 to-green-500/10">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-green-500/20 flex items-center justify-center shrink-0">
                    <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-xl font-bold truncate">₹{(totalValue / 100000).toFixed(1)}L</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Total Value</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Table Section - Full height with scroll */}
      <div className="flex-1 px-6 pb-6 overflow-hidden">
        <MediaAssetsTable assets={assets} onRefresh={fetchAssets} />
      </div>
    </div>
  );
}
