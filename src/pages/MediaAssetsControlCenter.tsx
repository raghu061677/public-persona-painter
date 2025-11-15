import { useEffect, useState, useCallback } from "react";
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
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

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

  const fetchAssets = async () => {
    setLoading(true);
    
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

  const applyTheme = (theme: ThemeMode) => {
    const root = document.documentElement;
    root.classList.remove("light", "dark", "classic", "modern");
    root.classList.add(theme);
    localStorage.setItem("media-assets-theme", theme);
  };

  const handleThemeChange = (theme: ThemeMode) => {
    setCurrentTheme(theme);
    applyTheme(theme);
  };

  const filteredAssets = assets.filter((asset) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      asset.id?.toLowerCase().includes(query) ||
      asset.location?.toLowerCase().includes(query) ||
      asset.area?.toLowerCase().includes(query) ||
      asset.city?.toLowerCase().includes(query) ||
      asset.media_type?.toLowerCase().includes(query)
    );
  });

  // Calculate stats
  const totalAssets = filteredAssets.length;
  const availableAssets = filteredAssets.filter(a => a.status === 'Available').length;
  const bookedAssets = filteredAssets.filter(a => a.status === 'Booked').length;
  const uniqueCities = new Set(filteredAssets.map(a => a.city).filter(Boolean)).size;
  const litAssets = filteredAssets.filter(a => a.illumination === 'Lit').length;
  const totalValue = filteredAssets.reduce((sum, a) => sum + (Number(a.card_rate) || 0), 0);
  
  // Calculate new this month (mock data for now)
  const newThisMonth = 0;

  const handleSelectAsset = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleViewDetails = (asset: any) => {
    setSelectedAsset(asset);
    setIsPanelOpen(true);
  };

  const handleAddToPlan = (asset: any) => {
    setSelectedIds((prev) =>
      prev.includes(asset.id) ? prev : [...prev, asset.id]
    );
    toast({
      title: "Asset added",
      description: `${asset.id} added to plan builder`,
    });
  };

  const selectedAssetObjects = assets.filter((a) => selectedIds.includes(a.id));

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
          />

          {/* Content Area */}
          <div className="flex-1 overflow-hidden relative">
            <div className="h-full overflow-auto pr-6 py-1 space-y-2">
              {/* Summary Cards */}
              <SummaryCards
                totalAssets={totalAssets}
                availableAssets={availableAssets}
                bookedAssets={bookedAssets}
                uniqueCities={uniqueCities}
                litAssets={litAssets}
                newThisMonth={newThisMonth}
                totalValue={totalValue}
              />

              {/* Add New Button */}
              <div>
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
    </div>
  );
}
