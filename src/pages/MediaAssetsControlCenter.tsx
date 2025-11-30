import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AnimatedSidebar } from "@/components/media-assets/control-center/AnimatedSidebar";
import { HeaderBar, type ViewMode, type ThemeMode } from "@/components/media-assets/control-center/HeaderBar";
import { SummaryCards } from "@/components/media-assets/control-center/SummaryCards";
import { GalleryView } from "@/components/media-assets/control-center/GalleryView";
import { MapView } from "@/components/media-assets/control-center/MapView";
import { RightPanel } from "@/components/media-assets/control-center/RightPanel";
import { CommandPalette } from "@/components/media-assets/control-center/CommandPalette";
import { MediaAssetsTable } from "@/components/media-assets/media-assets-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { BulkQRGenerationButton } from "@/components/media-assets/BulkQRGenerationButton";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { GodModeHUD } from "@/components/media-assets/god-mode/GodModeHUD";
import { debounce } from "@/lib/performance";

export default function MediaAssetsControlCenter() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<ViewMode>("table");
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>("light");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isGodModeVisible, setIsGodModeVisible] = useState(false);

  useEffect(() => {
    fetchAssets();
    
    // Load theme from localStorage
    const savedTheme = localStorage.getItem("media-assets-theme") as ThemeMode;
    if (savedTheme) {
      setCurrentTheme(savedTheme);
      applyTheme(savedTheme);
    }

    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command Palette (Ctrl/Cmd + K)
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandOpen(true);
      }

      // Search focus (/)
      if (e.key === "/" && e.target === document.body) {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('input[placeholder*="Search"]')?.focus();
      }

      // View switching (v)
      if (e.key === "v" && e.target === document.body) {
        e.preventDefault();
        const views: ViewMode[] = ["table", "map", "gallery"];
        const currentIndex = views.indexOf(currentView);
        const nextIndex = (currentIndex + 1) % views.length;
        setCurrentView(views[nextIndex]);
      }

      // Panel (p)
      if (e.key === "p" && e.target === document.body) {
        e.preventDefault();
        setIsPanelOpen(!isPanelOpen);
      }

      // Escape
      if (e.key === "Escape") {
        setIsPanelOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentView, isPanelOpen]);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    
    // Get current user's company
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({
        title: "Error",
        description: "Not authenticated",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Get user's company from company_users
    const { data: companyUserData } = await supabase
      .from('company_users')
      .select('company_id, companies(type)')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .maybeSingle();

    let query = supabase
      .from('media_assets')
      .select('id, city, area, location, media_type, status, card_rate, dimensions, latitude, longitude, illumination_type, created_at, primary_photo_url, company_id');

    // Filter by company_id unless platform admin viewing all
    if (companyUserData?.company_id) {
      // Check if user is platform admin
      const { data: isPlatformAdmin } = await supabase.rpc('is_platform_admin', { _user_id: session.user.id });
      
      // Only filter by company if not platform admin OR if explicitly set
      const selectedCompanyId = localStorage.getItem('selected_company_id');
      if (!isPlatformAdmin || selectedCompanyId) {
        query = query.eq('company_id', selectedCompanyId || companyUserData.company_id);
      }
    }

    const { data: assetsData, error: assetsError } = await query
      .order('id', { ascending: true })
      .limit(1000);

    if (assetsError) {
      toast({
        title: "Error",
        description: "Failed to fetch media assets",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { data: photosData } = await supabase
      .from('media_photos')
      .select('asset_id, photo_url, uploaded_at')
      .order('uploaded_at', { ascending: false });

    const latestPhotoMap = new Map();
    if (photosData) {
      photosData.forEach((photo) => {
        if (!latestPhotoMap.has(photo.asset_id)) {
          latestPhotoMap.set(photo.asset_id, photo.photo_url);
        }
      });
    }

    const enrichedAssets = (assetsData || []).map(asset => {
      const latestPhoto = latestPhotoMap.get(asset.id);
      
      return {
        ...asset,
        primary_photo_url: latestPhoto || asset.primary_photo_url || null,
      };
    });

    setAssets(enrichedAssets);
    setLoading(false);
  }, []);

  const applyTheme = useCallback((theme: ThemeMode) => {
    const root = document.documentElement;
    root.classList.remove("light", "dark", "classic", "modern");
    root.classList.add(theme);
    localStorage.setItem("media-assets-theme", theme);
  }, []);

  const handleThemeChange = useCallback((theme: ThemeMode) => {
    setCurrentTheme(theme);
    applyTheme(theme);
  }, [applyTheme]);

  // Memoized filtered assets for performance
  const filteredAssets = useMemo(() => {
    if (!searchQuery) return assets;
    const query = searchQuery.toLowerCase();
    return assets.filter((asset) => 
      asset.id?.toLowerCase().includes(query) ||
      asset.location?.toLowerCase().includes(query) ||
      asset.area?.toLowerCase().includes(query) ||
      asset.city?.toLowerCase().includes(query) ||
      asset.media_type?.toLowerCase().includes(query)
    );
  }, [assets, searchQuery]);

  // Memoized statistics calculation
  const stats = useMemo(() => ({
    totalAssets: filteredAssets.length,
    availableAssets: filteredAssets.filter(a => a.status === 'Available').length,
    bookedAssets: filteredAssets.filter(a => a.status === 'Booked').length,
    uniqueCities: new Set(filteredAssets.map(a => a.city).filter(Boolean)).size,
    litAssets: filteredAssets.filter(a => a.illumination_type && a.illumination_type !== 'Non-lit').length,
    totalValue: filteredAssets.reduce((sum, a) => sum + (Number(a.card_rate) || 0), 0),
    newThisMonth: 0,
  }), [filteredAssets]);

  const handleSelectAsset = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }, []);

  const handleViewDetails = useCallback((asset: any) => {
    setSelectedAsset(asset);
    setIsPanelOpen(true);
  }, []);

  const handleAddToPlan = useCallback((asset: any) => {
    setSelectedIds((prev) =>
      prev.includes(asset.id) ? prev : [...prev, asset.id]
    );
    toast({
      title: "Asset added",
      description: `${asset.id} added to plan builder`,
    });
  }, []);

  const selectedAssetObjects = useMemo(
    () => assets.filter((a) => selectedIds.includes(a.id)),
    [assets, selectedIds]
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Sidebar */}
      <AnimatedSidebar />

      {/* Main Content */}
      <div className="flex-1 pl-14 pt-14">
        <div className="flex flex-col h-[calc(100vh-3.5rem)]">
          {/* Header */}
          <HeaderBar
            currentView={currentView}
            onViewChange={setCurrentView}
            currentTheme={currentTheme}
            onThemeChange={handleThemeChange}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onAIFilterClick={() => setIsPanelOpen(true)}
            isGodModeVisible={isGodModeVisible}
            onToggleGodMode={() => setIsGodModeVisible(!isGodModeVisible)}
          />

          {/* Content Area */}
          <div className="flex-1 overflow-hidden relative">
            <div className="h-full overflow-auto pr-6 py-1 space-y-2">
              {/* Summary Cards */}
              <SummaryCards
                totalAssets={stats.totalAssets}
                availableAssets={stats.availableAssets}
                bookedAssets={stats.bookedAssets}
                uniqueCities={stats.uniqueCities}
                litAssets={stats.litAssets}
                newThisMonth={stats.newThisMonth}
                totalValue={stats.totalValue}
              />

              {/* Action Buttons */}
              <div className="flex gap-2 flex-wrap">
                <BulkQRGenerationButton />
                <Button onClick={() => navigate("/media-assets/new")} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add New Asset
                </Button>
              </div>

              {/* View Content */}
              {currentView === "table" && (
                <div className="bg-card rounded-lg border">
                  <MediaAssetsTable 
                    key={`table-${filteredAssets.length}-${loading}`}
                    assets={filteredAssets} 
                    onRefresh={fetchAssets} 
                  />
                </div>
              )}

              {currentView === "gallery" && (
                <GalleryView
                  assets={filteredAssets}
                  selectedIds={selectedIds}
                  onSelectAsset={handleSelectAsset}
                  onViewDetails={handleViewDetails}
                  onAddToPlan={handleAddToPlan}
                />
              )}

              {currentView === "map" && (
                <div className="h-[600px] bg-card rounded-lg border overflow-hidden">
                  <MapView
                    assets={filteredAssets}
                    onAssetClick={handleViewDetails}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <RightPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        selectedAsset={selectedAsset}
        selectedAssets={selectedAssetObjects}
        onRemoveFromSelection={(id) =>
          setSelectedIds((prev) => prev.filter((i) => i !== id))
        }
      />

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandOpen}
        onOpenChange={setIsCommandOpen}
        onViewChange={setCurrentView}
      />

      {/* God Mode HUD */}
      <GodModeHUD assets={filteredAssets} isVisible={isGodModeVisible} />
    </div>
  );
}
