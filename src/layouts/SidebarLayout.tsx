import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/store/sidebarStore";
import {
  Home, Map, Layers, Briefcase, Users,
  Wallet, BarChart2, Image, Settings,
  Menu, ChevronDown, ChevronRight, TrendingUp,
  FileText, Building2, Smartphone,
  UserCog, FileSpreadsheet, Receipt, LayoutDashboard, Brain, Zap, Palette,
  Search, SlidersHorizontal, X, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NavLink } from "react-router-dom";
import { useState, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { useSwipe } from "@/hooks/use-swipe";
import { useMenuPreferences } from "@/hooks/useMenuPreferences";
import { MenuPersonalizationDialog } from "@/components/sidebar/MenuPersonalizationDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

interface MenuItem {
  label: string;
  icon: any;
  path: string;
  module?: string;
  action?: 'view' | 'create' | 'update' | 'delete';
  roles?: ('admin' | 'sales' | 'operations' | 'finance' | 'user')[];
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

// Platform Admin sections (only visible if isPlatformAdmin)
const PLATFORM_ADMIN_SECTIONS: MenuSection[] = [
  {
    title: "Platform Administration",
    items: [
      { label: "Platform Dashboard", icon: LayoutDashboard, path: "/admin/platform", module: "settings", roles: ['admin'] },
      { label: "Companies", icon: Building2, path: "/admin/companies", module: "settings", roles: ['admin'] },
      { label: "Platform Users", icon: UserCog, path: "/admin/users", module: "users", roles: ['admin'] },
      { label: "Global Settings", icon: Settings, path: "/admin/platform-admin-setup", module: "settings", roles: ['admin'] },
    ],
  },
  {
    title: "Platform Data",
    items: [
      { label: "Usage Analytics", icon: TrendingUp, path: "/admin/tenant-analytics", module: "reports", roles: ['admin'] },
      { label: "Audit Logs", icon: FileText, path: "/admin/audit-logs", module: "settings", roles: ['admin'] },
    ],
  },
];

// Company Workspace sections (visible when company is selected)
const COMPANY_WORKSPACE_SECTIONS: MenuSection[] = [
  {
    title: "Company Workspace",
    items: [
      { label: "Overview", icon: LayoutDashboard, path: "/admin/dashboard", module: "dashboard" },
      { label: "Media Assets", icon: Map, path: "/admin/media-assets", module: "media_assets" },
      { label: "Plans", icon: Layers, path: "/admin/plans", module: "plans" },
      { label: "Campaigns", icon: Briefcase, path: "/admin/campaigns", module: "campaigns" },
      { label: "Operations", icon: TrendingUp, path: "/admin/operations", module: "operations" },
      { label: "Clients", icon: Users, path: "/admin/clients", module: "clients" },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Finance Dashboard", icon: Wallet, path: "/admin/finance", module: "invoices" },
      { label: "Estimations", icon: FileSpreadsheet, path: "/admin/estimations", module: "invoices" },
      { label: "Invoices", icon: FileText, path: "/admin/invoices", module: "invoices" },
      { label: "Expenses", icon: Receipt, path: "/admin/expenses", module: "expenses" },
      { label: "Power Bills", icon: Zap, path: "/admin/power-bills", module: "expenses" },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Operations Board", icon: TrendingUp, path: "/admin/operations", module: "operations" },
      { label: "Mobile Field App", icon: Smartphone, path: "/mobile", module: "operations" },
      { label: "Photo Library", icon: Image, path: "/admin/photo-library", module: "media_assets" },
    ],
  },
];

// Company Settings (only visible for company admins)
const COMPANY_SETTINGS_SECTION: MenuSection = {
  title: "Company Settings",
  items: [
    { label: "Profile", icon: Building2, path: "/admin/company-settings/profile", module: "settings", roles: ['admin'] },
    { label: "Branding", icon: Palette, path: "/admin/company-settings/branding", module: "settings", roles: ['admin'] },
    { label: "Users & Roles", icon: UserCog, path: "/admin/users", module: "users", roles: ['admin'] },
    { label: "Taxes", icon: Receipt, path: "/admin/company-settings/taxes", module: "settings", roles: ['admin'] },
    { label: "General", icon: Settings, path: "/admin/company-settings/general", module: "settings", roles: ['admin'] },
    { label: "Integrations", icon: Zap, path: "/admin/company-settings/integrations", module: "settings", roles: ['admin'] },
  ],
};

// User General sections (visible to all authenticated users)
const USER_GENERAL_SECTIONS: MenuSection[] = [
  {
    title: "My Workspace",
    items: [
      { label: "My Dashboard", icon: Home, path: "/dashboard", module: "dashboard" },
      { label: "My Profile", icon: UserCog, path: "/settings/profile", module: "settings" },
      { label: "Analytics", icon: BarChart2, path: "/admin/analytics", module: "reports" },
      { label: "AI Assistant", icon: Brain, path: "/admin/assistant", module: "dashboard" },
    ],
  },
];

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const { open, toggle } = useSidebarStore();
  const { canView, hasAnyPermission, loading: permissionsLoading } = usePermissions();
  const { user, isAdmin, roles } = useAuth();
  const { company, isPlatformAdmin } = useCompany();
  
  const allSections = [
    ...PLATFORM_ADMIN_SECTIONS,
    ...COMPANY_WORKSPACE_SECTIONS,
    COMPANY_SETTINGS_SECTION,
    ...USER_GENERAL_SECTIONS,
  ];
  
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(allSections.map(s => s.title))
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [showPersonalization, setShowPersonalization] = useState(false);
  const { preferences } = useMenuPreferences();
  const hiddenItems = preferences.hidden_sections || [];
  const favoriteItems: string[] = [];

  const swipeHandlers = useSwipe({
    onSwipedLeft: () => { if (open) toggle(); },
    onSwipedRight: () => { if (!open) toggle(); },
  });

  const visibleSections = useMemo(() => {
    if (permissionsLoading) return [];
    const sections: MenuSection[] = [];
    if (isPlatformAdmin) sections.push(...PLATFORM_ADMIN_SECTIONS);
    if (company?.id) sections.push(...COMPANY_WORKSPACE_SECTIONS);
    if (company?.id && (isAdmin || isPlatformAdmin)) sections.push(COMPANY_SETTINGS_SECTION);
    sections.push(...USER_GENERAL_SECTIONS);
    return sections;
  }, [permissionsLoading, isPlatformAdmin, company, isAdmin]);

  const filteredSections = useMemo(() => {
    return visibleSections.map(section => ({
      ...section,
      items: section.items.filter(item => {
        if (hiddenItems.includes(item.path)) return false;
        if (searchQuery && !item.label.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (item.roles && item.roles.length > 0 && !item.roles.some(role => roles.includes(role))) return false;
        if (isAdmin || isPlatformAdmin) return true;
        if (item.module) return hasAnyPermission(item.module);
        return true;
      })
    })).filter(section => section.items.length > 0);
  }, [visibleSections, searchQuery, roles, isAdmin, isPlatformAdmin, hasAnyPermission, hiddenItems]);

  const favoriteMenuItems = useMemo(() => {
    return filteredSections.flatMap(section => section.items).filter(item => favoriteItems.includes(item.path));
  }, [filteredSections, favoriteItems]);

  const toggleSection = (title: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      newSet.has(title) ? newSet.delete(title) : newSet.add(title);
      return newSet;
    });
  };

  return (
    <div className="flex h-screen bg-background">
      {open && <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden" onClick={toggle} />}
      
      <aside {...swipeHandlers} className={cn("fixed lg:static inset-y-0 left-0 z-50 flex flex-col border-r border-border/40 bg-background transition-all duration-300 ease-in-out", open ? "w-64" : "w-0 lg:w-16")}>
        <div className="flex items-center justify-between h-14 px-4 border-b border-border/40">
          {open && <div className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /><span className="font-semibold text-foreground">Go-Ads 360°</span></div>}
          <Button variant="ghost" size="icon" onClick={toggle} className={cn("h-8 w-8", !open && "mx-auto")}><Menu className="h-4 w-4" /></Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 border-b border-border/40">
            {open && company && (
              <div className="mb-3 p-2 bg-muted/50 rounded-md">
                <div className="flex items-center gap-2">
                  {company.logo_url ? <img src={company.logo_url} alt={company.name} className="h-8 w-8 rounded object-cover" /> : <Building2 className="h-8 w-8 text-muted-foreground" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{company.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{company.type}</p>
                  </div>
                </div>
              </div>
            )}
            {open && (<>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-foreground">Menu</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowPersonalization(true)} className="h-8 w-8"><SlidersHorizontal className="h-4 w-4" /></Button>
              </div>
              <div className="relative mb-3">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search menu..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
                {searchQuery && <Button variant="ghost" size="icon" onClick={() => setSearchQuery("")} className="absolute right-1 top-1 h-7 w-7"><X className="h-3 w-3" /></Button>}
              </div>
            </>)}
          </div>

          {open && favoriteMenuItems.length > 0 && (
            <div className="px-3 py-2">
              <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Favorites</h3>
              <nav className="space-y-0.5">
                {favoriteMenuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink 
                      key={item.path} 
                      to={item.path} 
                      className={({ isActive }) => cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                        isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
              <Separator className="my-3" />
            </div>
          )}

          <div className="px-3 pb-4">
            {permissionsLoading ? (
              <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
            ) : (
              <nav className="space-y-2">
                {filteredSections.map((section, sectionIndex) => {
                  const isExpanded = expandedSections.has(section.title);
                  const isPlatformSection = section.title === "Platform Administration" || section.title === "Platform Data";
                  const isCompanySection = section.title === "Company Workspace" || section.title === "Finance" || section.title === "Operations";
                  const isSettingsSection = section.title === "Company Settings";
                  
                  return (
                    <div key={section.title} className="mb-2">
                      {sectionIndex > 0 && (isPlatformSection || isCompanySection || isSettingsSection) && open && <Separator className="my-4" />}
                      {open ? (
                        <button onClick={() => toggleSection(section.title)} className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors group">
                          <span>{section.title}</span>
                          {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" /> : <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />}
                        </button>
                      ) : <div className="h-px bg-border/40 my-2" />}
                      
                      {(isExpanded || !open) && (
                        <nav className="space-y-0.5 mt-1">
                          {section.items.map((item) => {
                            const Icon = item.icon;
                            const isFavorite = favoriteItems.includes(item.path);
                            return (
                              <TooltipProvider key={item.path}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <NavLink 
                                      to={item.path} 
                                      className={({ isActive }) => cn(
                                        "flex items-center rounded-md text-sm font-medium transition-colors relative",
                                        isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                                        open ? "gap-3 px-3 py-2.5" : "justify-center p-2.5 mx-1"
                                      )}
                                    >
                                      <Icon className="h-4 w-4 shrink-0" />
                                      {open && (
                                        <>
                                          <span className="flex-1 truncate">{item.label}</span>
                                          {isFavorite && <span className="text-yellow-500 text-xs">★</span>}
                                        </>
                                      )}
                                    </NavLink>
                                  </TooltipTrigger>
                                  {!open && <TooltipContent side="right"><p>{item.label}</p></TooltipContent>}
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })}
                        </nav>
                      )}
                    </div>
                  );
                })}
              </nav>
            )}
          </div>
        </ScrollArea>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
      <MenuPersonalizationDialog open={showPersonalization} onOpenChange={setShowPersonalization} sections={filteredSections} />
    </div>
  );
}
