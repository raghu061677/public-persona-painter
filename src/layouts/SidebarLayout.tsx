import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/store/sidebarStore";
import {
  Home, Map, MapPin, Filter, Layers, Briefcase, Users,
  Wallet, BarChart2, Image, Upload, Download, Settings,
  Menu, ChevronDown, ChevronRight, Target, TrendingUp,
  FileText, Building2, CreditCard, Smartphone, MessageSquare,
  UserCog, FileSpreadsheet, Receipt, LayoutDashboard, Brain
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavLink } from "react-router-dom";
import { useState, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";

interface MenuItem {
  label: string;
  icon: any;
  path: string;
  module?: string; // Permission module name
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
    ],
  },
  {
    title: "Administration",
    items: [
      { label: "Organization Settings", icon: Settings, path: "/admin/organization-settings", module: "settings" },
      { label: "User Management", icon: UserCog, path: "/admin/users", module: "users" },
      { label: "Vendors", icon: Building2, path: "/admin/vendors", module: "settings" },
      { label: "Documents", icon: FileText, path: "/admin/documents", module: "settings" },
      { label: "Rate Cards", icon: CreditCard, path: "/admin/rate-cards", module: "settings" },
    ],
  },
  {
    title: "Analytics & Tools",
    items: [
      { label: "AI Assistant", icon: Brain, path: "/admin/assistant", module: "dashboard" },
      { label: "Reports", icon: BarChart2, path: "/reports", module: "reports" },
      { label: "Import", icon: Upload, path: "/admin/import", module: "settings", roles: ['admin'] },
      { label: "Export", icon: Download, path: "/admin/export", module: "settings", roles: ['admin'] },
    ],
  },
];

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const { open, toggle } = useSidebarStore();
  const { canView, loading: permLoading } = usePermissions();
  const { isAdmin, roles } = useAuth();
  const [expandedSections, setExpandedSections] = useState<string[]>([
    "Main", "Inventory", "Sales & Marketing", "Execution", "Finance", "Administration", "Analytics & Tools"
  ]);

  // Filter menu items based on permissions
  const filteredSections = useMemo(() => {
    if (permLoading) return [];
    
    return MENU_SECTIONS.map(section => ({
      ...section,
      items: section.items.filter(item => {
        // Check role requirement if specified
        if (item.roles && !isAdmin) {
          const hasRequiredRole = item.roles.some(role => roles.includes(role));
          if (!hasRequiredRole) return false;
        }
        
        // Check module permission
        if (item.module) {
          const action = item.action || 'view';
          return canView(item.module);
        }
        
        // Show if no permission requirement
        return true;
      })
    })).filter(section => section.items.length > 0); // Remove empty sections
  }, [canView, isAdmin, roles, permLoading]);

  const toggleSection = (title: string) => {
    setExpandedSections((prev) =>
      prev.includes(title) ? prev.filter((s) => s !== title) : [...prev, title]
    );
  };

  return (
    <>
      <aside
        className={cn(
          "h-screen transition-all duration-300 bg-sidebar-background border-r border-sidebar-border flex flex-col",
          open ? "w-60" : "w-16"
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-sidebar-border">
          <Button variant="ghost" size="icon" onClick={toggle} className="shrink-0">
            <Menu className="w-5 h-5" />
          </Button>
          {open && (
            <span className="text-lg font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Go-Ads
            </span>
          )}
        </div>
        
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
                    {section.items.map(({ label, icon: Icon, path }) => (
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
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Settings at bottom of nav */}
            <div className="pt-4 border-t border-sidebar-border">
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
                {open && <span className="truncate">Settings</span>}
              </NavLink>
            </div>
          </nav>
        </ScrollArea>
      </aside>
      
      {/* Main content area */}
      {children}
    </>
  );
}
