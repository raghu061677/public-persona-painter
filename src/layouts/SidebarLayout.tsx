import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/store/sidebarStore";
import {
  Home, Map, MapPin, Filter, Layers, Briefcase, Users,
  Wallet, BarChart2, Image, Upload, Download, Settings,
  Menu, ChevronDown, ChevronRight, Target, TrendingUp,
  FileText, Building2, CreditCard, Smartphone, MessageSquare,
  UserCog, FileSpreadsheet, Receipt, LayoutDashboard, Brain, Zap, Palette,
  Search, SlidersHorizontal, X
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

const MENU_SECTIONS: MenuSection[] = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard", module: "dashboard" },
    ],
  },
  {
    title: "Inventory",
    items: [
      { label: "Media Assets", icon: Map, path: "/admin/media-assets", module: "media_assets" },
      { label: "Map View", icon: MapPin, path: "/admin/media-assets-map", module: "media_assets" },
      { label: "Vacant", icon: Filter, path: "/reports/vacant-media", module: "reports" },
      { label: "Photo Library", icon: Image, path: "/admin/photo-library", module: "media_assets" },
    ],
  },
  {
    title: "Sales & Marketing",
    items: [
      { label: "Plans", icon: Layers, path: "/admin/plans", module: "plans" },
      { label: "Clients", icon: Users, path: "/admin/clients", module: "clients" },
      { label: "Leads", icon: Target, path: "/admin/leads", module: "clients" },
    ],
  },
  {
    title: "Execution",
    items: [
      { label: "Campaigns", icon: Briefcase, path: "/admin/campaigns", module: "campaigns" },
      { label: "Operations", icon: TrendingUp, path: "/admin/operations", module: "operations" },
      { label: "Mobile Field App", icon: Smartphone, path: "/admin/mobile-upload", module: "operations" },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Finance", icon: Wallet, path: "/finance", module: "invoices" },
      { label: "Invoices", icon: FileText, path: "/finance/invoices", module: "invoices" },
      { label: "Estimations", icon: FileSpreadsheet, path: "/finance/estimations", module: "invoices" },
      { label: "Expenses", icon: Receipt, path: "/finance/expenses", module: "expenses" },
      { label: "Power Bills", icon: Zap, path: "/admin/power-bills", module: "expenses" },
      { label: "Bill Sharing", icon: Users, path: "/admin/power-bills-sharing", module: "expenses" },
    ],
  },
  {
    title: "Administration",
    items: [
      { label: "Company Settings", icon: Building2, path: "/admin/company-settings", module: "settings", roles: ['admin'] },
      { label: "Organization Settings", icon: Settings, path: "/admin/organization-settings", module: "settings" },
      { label: "User Management", icon: UserCog, path: "/admin/users", module: "users" },
      { label: "Vendors", icon: Building2, path: "/admin/vendors", module: "settings" },
      { label: "Documents", icon: FileText, path: "/admin/documents", module: "settings" },
      { label: "Rate Cards", icon: CreditCard, path: "/admin/rate-cards", module: "settings" },
    ],
  },
  {
    title: "Platform Admin",
    items: [
      { label: "Platform Dashboard", icon: LayoutDashboard, path: "/admin/platform", module: "settings", roles: ['admin'] },
      { label: "Companies", icon: Building2, path: "/admin/companies", module: "settings", roles: ['admin'] },
    ],
  },
  {
    title: "Analytics & Tools",
    items: [
      { label: "AI Assistant", icon: Brain, path: "/admin/assistant", module: "dashboard" },
      { label: "Reports", icon: BarChart2, path: "/reports", module: "reports" },
      { label: "UI Components", icon: Palette, path: "/admin/ui-showcase", module: "dashboard" },
      { label: "Dashboard Builder", icon: LayoutDashboard, path: "/admin/dashboard-builder", module: "dashboard" },
      { label: "Import", icon: Upload, path: "/admin/import", module: "settings", roles: ['admin'] },
      { label: "Export/Import", icon: Download, path: "/admin/data-export-import", module: "settings", roles: ['admin'] },
    ],
  },
];

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const { open, toggle } = useSidebarStore();
  const [expandedSections, setExpandedSections] = useState<string[]>([
    "Main", "Inventory", "Sales & Marketing", "Execution", "Finance", "Administration", "Analytics & Tools"
  ]);
  const [searchQuery, setSearchQuery] = useState("");
  const [personalizationOpen, setPersonalizationOpen] = useState(false);
  
  const swipeHandlers = useSwipe({
    onSwipedLeft: () => {
      if (open && window.innerWidth < 768) {
        toggle();
      }
    },
    onSwipedRight: () => {
      if (!open && window.innerWidth < 768) {
        toggle();
      }
    },
  });
  
  const { canView, loading: permLoading } = usePermissions();
  const { isAdmin, roles } = useAuth();
  const { isPlatformAdmin } = useCompany();
  const { preferences, loading: prefsLoading } = useMenuPreferences();

  // Filter menu items based on permissions, search, and personalization
  const filteredSections = useMemo(() => {
    if (permLoading) return [];
    
    let sections = MENU_SECTIONS.map(section => ({
      ...section,
      items: section.items.filter(item => {
        // Hide Platform Admin section for non-platform admins
        if (section.title === "Platform Admin" && !isPlatformAdmin) {
          return false;
        }
        
        // Check role requirement if specified
        if (item.roles && !isAdmin) {
          const hasRequiredRole = item.roles.some(role => roles.includes(role));
          if (!hasRequiredRole) return false;
        }
        
        // Check module permission
        if (item.module && !canView(item.module)) {
          return false;
        }
        
        return true;
      })
    })).filter(section => section.items.length > 0);

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      sections = sections.map(section => ({
        ...section,
        items: section.items.filter(item => 
          item.label.toLowerCase().includes(query) ||
          section.title.toLowerCase().includes(query)
        )
      })).filter(section => section.items.length > 0);
    }

    // Filter hidden sections
    if (!prefsLoading && preferences.hidden_sections.length > 0) {
      sections = sections.filter(section => 
        !preferences.hidden_sections.includes(section.title)
      );
    }

    // Apply custom ordering
    if (!prefsLoading && preferences.section_order.length > 0) {
      const orderedSections = preferences.section_order
        .map(title => sections.find(s => s.title === title))
        .filter(Boolean) as typeof sections;
      
      sections.forEach(section => {
        if (!preferences.section_order.includes(section.title)) {
          orderedSections.push(section);
        }
      });
      
      return orderedSections;
    }

    return sections;
  }, [canView, isAdmin, roles, permLoading, searchQuery, preferences, prefsLoading]);

  const toggleSection = (title: string) => {
    setExpandedSections((prev) =>
      prev.includes(title) ? prev.filter((s) => s !== title) : [...prev, title]
    );
  };

  return (
    <>
      <TooltipProvider delayDuration={0}>
        {/* Mobile backdrop overlay */}
        {open && (
          <div
            className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in"
            onClick={toggle}
            aria-hidden="true"
          />
        )}
        
        <aside
          ref={swipeHandlers.ref}
          className={cn(
            "h-screen transition-all duration-300 bg-sidebar-background border-r border-sidebar-border flex flex-col z-50 shrink-0",
            "fixed md:relative left-0 top-0",
            open ? "w-60 translate-x-0" : "w-60 md:w-16 -translate-x-full md:translate-x-0"
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-sidebar-border shrink-0">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggle} 
              className="shrink-0"
              aria-label={open ? "Close sidebar" : "Open sidebar"}
            >
              <Menu className="w-5 h-5" />
            </Button>
            {open && (
              <span className="text-lg font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent whitespace-nowrap">
                Go-Ads
              </span>
            )}
          </div>

          {/* Search & Personalization (only when expanded) */}
          {open && (
            <div className="p-3 space-y-2 border-b border-sidebar-border shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search menu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9 h-9"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => setPersonalizationOpen(true)}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Customize Menu
              </Button>
            </div>
          )}
          
          {/* Navigation */}
          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="space-y-6">
              {filteredSections.map((section) => (
                <div key={section.title}>
                  {open && (
                    <button
                      onClick={() => toggleSection(section.title)}
                      className="flex items-center justify-between w-full px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                    >
                      <span>{section.title}</span>
                      {expandedSections.includes(section.title) ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                    </button>
                  )}
                  
                  {(open ? expandedSections.includes(section.title) : true) && (
                    <div className="mt-1 space-y-0.5">
                      {section.items.map(({ label, icon: Icon, path }) => {
                        const linkContent = (
                          <NavLink
                            key={path}
                            to={path}
                            className={({ isActive }) =>
                              cn(
                                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                isActive
                                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                  : "text-sidebar-foreground"
                              )
                            }
                          >
                            <Icon className="w-4 h-4 shrink-0" />
                            {open && <span className="truncate">{label}</span>}
                          </NavLink>
                        );

                        // Show tooltip in collapsed/mini mode
                        if (!open) {
                          return (
                            <Tooltip key={path}>
                              <TooltipTrigger asChild>
                                {linkContent}
                              </TooltipTrigger>
                              <TooltipContent side="right">
                                {label}
                              </TooltipContent>
                            </Tooltip>
                          );
                        }

                        return linkContent;
                      })}
                    </div>
                  )}
                </div>
              ))}

              {/* Settings at bottom of nav */}
              <div className="pt-4 border-t border-sidebar-border">
                {open ? (
                  <NavLink
                    to="/settings"
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground"
                      )
                    }
                  >
                    <Settings className="w-4 h-4 shrink-0" />
                    <span className="truncate">Settings</span>
                  </NavLink>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <NavLink
                        to="/settings"
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                            "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                            isActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground"
                              : "text-sidebar-foreground"
                          )
                        }
                      >
                        <Settings className="w-4 h-4 shrink-0" />
                      </NavLink>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      Settings
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </nav>
          </ScrollArea>
        </aside>
      </TooltipProvider>
      
      {/* Main content area */}
      <div className="flex-1 w-full md:w-auto overflow-hidden">
        {children}
      </div>

      {/* Menu Personalization Dialog */}
      <MenuPersonalizationDialog
        open={personalizationOpen}
        onOpenChange={setPersonalizationOpen}
        sections={MENU_SECTIONS}
      />
    </>
  );
}
