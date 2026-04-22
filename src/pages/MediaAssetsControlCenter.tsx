import { useEffect, useState, useCallback, useMemo } from "react";
import { useExecutiveDrillDown } from "@/hooks/useExecutiveDrillDown";
import { ExecutiveSummaryBanner } from "@/components/common/ExecutiveSummaryBanner";
import { ModuleGuard } from "@/components/rbac/ModuleGuard";
import { ActionGuard } from "@/components/rbac/ActionGuard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { HeaderBar, type ViewMode, type ThemeMode } from "@/components/media-assets/control-center/HeaderBar";
import { SummaryCards } from "@/components/media-assets/control-center/SummaryCards";
import { GalleryView } from "@/components/media-assets/control-center/GalleryView";
import { MapView } from "@/components/media-assets/control-center/MapView";
import { RightPanel } from "@/components/media-assets/control-center/RightPanel";
import { CommandPalette } from "@/components/media-assets/control-center/CommandPalette";
import { MediaAssetsTable } from "@/components/media-assets/media-assets-table";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { MediaAssetsCustomExportDialog } from "@/components/media-assets/MediaAssetsCustomExportDialog";
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
  const [customExportOpen, setCustomExportOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const { isFromExecutive, drillState, alreadyApplied, markApplied, clearDrillState } = useExecutiveDrillDown();
  const [showDrillBanner, setShowDrillBanner] = useState(false);

  useEffect(() => {
    fetchAssets();

    // Apply executive summary drill-down on first load
    if (isFromExecutive && !alreadyApplied && drillState) {
      markApplied();
      setShowDrillBanner(true);
    }
    
    
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
      .select('id, media_asset_code, city, area, district, state, location, direction, media_type, status, card_rate, dimensions, latitude, longitude, illumination_type, created_at, primary_photo_url, company_id, total_sqft, is_public, ownership, qr_code_url, municipal_id, municipal_authority, consumer_name, service_number, unique_service_number, ero, section_name');

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

    // Unified availability: campaign_assets (effective dates) + holds overlapping today
    const today = new Date().toISOString().split('T')[0];
    const allAssetIds = (assetsData || []).map(a => a.id);

    // Fetch BOTH currently-overlapping AND upcoming campaign_assets / holds.
    // We deliberately pull only what we need to compute current + next item per asset.
    const [{ data: campaignRows }, { data: holdRows }] = await Promise.all([
      allAssetIds.length > 0
        ? supabase
            .from('campaign_assets')
            .select('asset_id, effective_start_date, effective_end_date, campaigns:campaign_id!inner(id, name, client_name, status, is_deleted)')
            .in('asset_id', allAssetIds)
            .eq('is_removed', false)
            .gte('effective_end_date', today)
            .order('effective_start_date', { ascending: true })
        : Promise.resolve({ data: [] }),
      allAssetIds.length > 0
        ? supabase
            .from('asset_holds')
            .select('asset_id, hold_type, client_name, start_date, end_date, status')
            .in('asset_id', allAssetIds)
            .eq('status', 'ACTIVE')
            .gte('end_date', today)
            .order('start_date', { ascending: true })
        : Promise.resolve({ data: [] }),
    ]);

    type Item = {
      kind: 'campaign' | 'hold';
      start: string;
      end: string;
      campaign_name?: string | null;
      client_name?: string | null;
      hold_type?: string | null;
    };

    const itemsByAsset = new Map<string, Item[]>();
    (campaignRows as any[] || []).forEach((b: any) => {
      const c = b.campaigns;
      if (!c || c.is_deleted) return;
      if (!['Draft', 'Upcoming', 'Running'].includes(c.status)) return;
      const list = itemsByAsset.get(b.asset_id) || [];
      list.push({
        kind: 'campaign',
        start: b.effective_start_date,
        end: b.effective_end_date,
        campaign_name: c.name || null,
        client_name: c.client_name || null,
      });
      itemsByAsset.set(b.asset_id, list);
    });
    (holdRows as any[] || []).forEach((h: any) => {
      const list = itemsByAsset.get(h.asset_id) || [];
      list.push({
        kind: 'hold',
        start: h.start_date,
        end: h.end_date,
        client_name: h.client_name || null,
        hold_type: h.hold_type || null,
      });
      itemsByAsset.set(h.asset_id, list);
    });

    const addDays = (iso: string, n: number): string => {
      const d = new Date(iso + 'T00:00:00');
      d.setDate(d.getDate() + n);
      return d.toISOString().slice(0, 10);
    };

    const enrichedAssets = (assetsData || []).map(asset => {
      const latestPhoto = latestPhotoMap.get(asset.id);
      const items = (itemsByAsset.get(asset.id) || []).sort((a, b) => a.start.localeCompare(b.start));

      // Current = first item that overlaps today (start<=today<=end)
      const current = items.find(i => i.start <= today && i.end >= today) || null;
      // Next = first item starting strictly after the current's end (or after today if none current)
      const cutoff = current ? current.end : today;
      const next = items.find(i => i.start > cutoff) || null;

      const dynamicStatus = current
        ? (current.kind === 'hold' ? 'Booked' : 'Booked') // keep existing badge semantics
        : 'Available';

      // Next available date: day after current.end if currently blocked
      let nextAvailable: string | null = null;
      if (current) {
        nextAvailable = addDays(current.end, 1);
      }

      const booking_hover_info = {
        current_status: current
          ? (current.kind === 'hold' ? 'Held' : 'Booked')
          : 'Available',
        current_booking_type: current ? current.kind : null,
        current_campaign_name: current?.campaign_name ?? null,
        current_client_name: current?.client_name ?? null,
        current_hold_type: current?.hold_type ?? null,
        current_start_date: current?.start ?? null,
        current_end_date: current?.end ?? null,
        next_booking_type: next ? next.kind : null,
        next_campaign_name: next?.campaign_name ?? null,
        next_client_name: next?.client_name ?? null,
        next_hold_type: next?.hold_type ?? null,
        next_start_date: next?.start ?? null,
        next_end_date: next?.end ?? null,
        next_available_date: nextAvailable,
      };

      return {
        ...asset,
        status: dynamicStatus,
        primary_photo_url: latestPhoto || asset.primary_photo_url || null,
        booking_hover_info,
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
    let result = assets;
    if (statusFilter) {
      result = result.filter(a => a.status === statusFilter);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((asset) => 
        asset.id?.toLowerCase().includes(query) ||
        asset.location?.toLowerCase().includes(query) ||
        asset.area?.toLowerCase().includes(query) ||
        asset.city?.toLowerCase().includes(query) ||
        asset.media_type?.toLowerCase().includes(query)
      );
    }
    return result;
  }, [assets, searchQuery, statusFilter]);

  const statusOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    assets.forEach(a => {
      const s = a.status || 'Unknown';
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [assets]);

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
      description: `${asset.media_asset_code || asset.id} added to plan builder`,
    });
  }, []);

  const selectedAssetObjects = useMemo(
    () => assets.filter((a) => selectedIds.includes(a.id)),
    [assets, selectedIds]
  );

  return (
    <ModuleGuard module="media_assets">
    <div className="min-h-screen flex flex-col bg-background">
      {showDrillBanner && (
        <div className="px-6 pt-4">
          <ExecutiveSummaryBanner
            dateFrom={drillState?.dateFrom}
            dateTo={drillState?.dateTo}
            onClear={() => { setShowDrillBanner(false); clearDrillState(); }}
          />
        </div>
      )}
      {/* Main Content */}
      <div
        className={cn(
          "flex-1 transition-[padding] duration-300 ease-out",
          isPanelOpen && "lg:pr-[480px]"
        )}
      >
        <div className="flex flex-col h-[calc(100vh-3.5rem)]">
          {/* Header */}
          <HeaderBar
            currentView={currentView}
            onViewChange={setCurrentView}
            currentTheme={currentTheme}
            onThemeChange={handleThemeChange}
            onAIFilterClick={() => setIsPanelOpen(true)}
            isGodModeVisible={isGodModeVisible}
            onToggleGodMode={() => setIsGodModeVisible(!isGodModeVisible)}
          />

          {/* Content Area */}
          <div className="flex-1 overflow-hidden relative">
            <div className="h-full overflow-auto pl-6 pr-6 py-3 space-y-3">
              {/* Page Search Bar */}
              <div className="relative max-w-2xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search assets, location, area, code, media type… (Press / to focus)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 h-10 bg-card"
                />
              </div>

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

              {/* View Content */}
              {currentView === "table" && (
                <MediaAssetsTable
                  key={`table-${filteredAssets.length}-${loading}`}
                  assets={filteredAssets}
                  onRefresh={fetchAssets}
                  onOpenCustomExport={() => setCustomExportOpen(true)}
                />
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

      {/* Custom Export Dialog */}
      <MediaAssetsCustomExportDialog
        open={customExportOpen}
        onOpenChange={setCustomExportOpen}
        rows={filteredAssets}
      />
    </div>
    </ModuleGuard>
  );
}
