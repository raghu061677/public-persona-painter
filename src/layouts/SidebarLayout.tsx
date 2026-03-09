import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/store/sidebarStore";
import {
  LayoutDashboard, Building2, Map, Layers, Briefcase, Users, TrendingUp,
  FileText, Receipt, Zap, UserCog, Palette, FileSpreadsheet,
  Bell, LogOut, User, Menu, Shield, DollarSign, Smartphone,
  Image, Settings, FileCheck, CreditCard, Globe, Mail, MessageSquare,
  Lock, Database, Upload, Download, HardDrive, Sparkles, ShoppingBag, BarChart3, Calendar, CalendarDays
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { useRBAC } from "@/hooks/useRBAC";
import { SidebarSection } from "@/components/sidebar/SidebarSection";
import { SidebarItem } from "@/components/sidebar/SidebarItem";
import { SidebarGroup } from "@/components/sidebar/SidebarGroup";
import { SidebarFooter } from "@/components/sidebar/SidebarFooter";
import { CompanySwitcher } from "@/components/sidebar/CompanySwitcher";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DesktopNavFromConfig } from "@/components/sidebar/DesktopNavFromConfig";

// All legacy hardcoded nav blocks removed - using config-driven nav only

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const { open, toggle } = useSidebarStore();
  const { user, isAdmin } = useAuth();
  const { company, isPlatformAdmin, companyUser } = useCompany();
  const navigate = useNavigate();
  const rbac = useRBAC();

  const isCompanyAdmin = companyUser?.role === 'admin' || isAdmin;
  const collapsed = !open;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <div className="flex h-[100dvh] w-full bg-background overflow-hidden app-viewport">
      {/* Overlay for mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={toggle}
        />
      )}

      {/* Sidebar - Fixed on Left */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 inset-y-0 left-0 z-50 flex flex-col bg-card border-r border-border shadow-sm transition-all duration-300 ease-in-out h-[100dvh]",
          collapsed ? "w-16" : "w-[280px]"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-border/40">
          {!collapsed && (
            <Link to="/admin/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">
                {company?.name || 'Go-Ads 360°'}
              </span>
            </Link>
          )}
          {collapsed && (
            <Link to="/admin/dashboard" className="mx-auto hover:opacity-80 transition-opacity cursor-pointer">
              <Shield className="h-5 w-5 text-primary" />
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            className={cn("h-8 w-8", !collapsed && "ml-auto")}
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>

        {/* Company Switcher */}
        {company && <CompanySwitcher collapsed={collapsed} />}

        <Separator className="my-2" />

        {/* Main Content */}
        <ScrollArea className="flex-1">
          <div className="pb-4">
            {/* CONFIG-DRIVEN DESKTOP NAV for tenant companies */}
            {company && company.type !== 'platform_admin' && (
              <DesktopNavFromConfig
                collapsed={collapsed}
                badges={{
                  pendingApprovals: 0,
                  proofUploads: 0,
                  outstanding: 0,
                }}
                onLogout={handleLogout}
              />
            )}

            {/* PLATFORM ADMINISTRATION - Only show when active company is platform_admin */}
            {isPlatformAdmin && company?.type === 'platform_admin' && (
              <>
                <SidebarSection label="Platform Administration" collapsed={collapsed}>
                  <SidebarItem
                    icon={LayoutDashboard}
                    label="Platform Dashboard"
                    href="/admin/platform"
                    collapsed={collapsed}
                  />
                  
                  <SidebarGroup icon={Building2} label="Companies Management" collapsed={collapsed}>
                    <SidebarItem
                      icon={Building2}
                      label="All Companies"
                      href="/admin/company-management"
                      collapsed={collapsed}
                    />
                    <SidebarItem
                      icon={Shield}
                      label="Approvals"
                      href="/admin/approve-companies"
                      collapsed={collapsed}
                    />
                  </SidebarGroup>

                  <SidebarGroup icon={UserCog} label="User Management" collapsed={collapsed}>
                    <SidebarItem
                      icon={UserCog}
                      label="Platform Users"
                      href="/admin/users"
                      collapsed={collapsed}
                    />
                    <SidebarItem
                      icon={Shield}
                      label="Roles & Permissions"
                      href="/admin/platform-roles"
                      collapsed={collapsed}
                    />
                  </SidebarGroup>

                  <SidebarItem
                    icon={DollarSign}
                    label="Billing & Subscriptions"
                    href="/admin/platform-reports/billing"
                    collapsed={collapsed}
                  />

                  <SidebarItem
                    icon={FileCheck}
                    label="Onboarding & QA"
                    href="/admin/onboarding"
                    collapsed={collapsed}
                  />

                  <SidebarGroup icon={BarChart3} label="Platform Reports & Analytics" collapsed={collapsed}>
                    <SidebarItem
                      icon={BarChart3}
                      label="Multi-Tenant Reports"
                      href="/admin/analytics-dashboard"
                      collapsed={collapsed}
                    />
                    <SidebarItem
                      icon={Building2}
                      label="Company Usage Analytics"
                      href="/admin/platform-reports/company-usage"
                      collapsed={collapsed}
                    />
                    <SidebarItem
                      icon={DollarSign}
                      label="Billing Reports"
                      href="/admin/platform-reports/billing"
                      collapsed={collapsed}
                    />
                    <SidebarItem
                      icon={Map}
                      label="Global Media Inventory"
                      href="/admin/platform-reports/media-inventory"
                      collapsed={collapsed}
                    />
                  </SidebarGroup>

                  <SidebarItem
                    icon={FileText}
                    label="Audit Logs"
                    href="/admin/audit-logs"
                    collapsed={collapsed}
                  />
                  <SidebarItem
                    icon={Settings}
                    label="Platform Settings"
                    href="/admin/platform-admin-setup"
                    collapsed={collapsed}
                  />
                </SidebarSection>
                <Separator className="my-4" />

                <SidebarSection label="My Account" collapsed={collapsed}>
                  <SidebarItem
                    icon={User}
                    label="My Profile"
                    href="/settings/profile"
                    collapsed={collapsed}
                  />
                  <SidebarItem
                    icon={Bell}
                    label="Notifications"
                    href="/settings/notifications"
                    collapsed={collapsed}
                  />
                  <button
                    onClick={handleLogout}
                    className={cn(
                      "flex items-center rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-all duration-200",
                      collapsed ? "justify-center w-full p-2.5 mx-1" : "gap-3 w-full px-4 py-2.5 mx-2"
                    )}
                    title={collapsed ? "Logout" : undefined}
                  >
                    <LogOut className="h-5 w-5 shrink-0" />
                    {!collapsed && <span className="truncate">Logout</span>}
                  </button>
                </SidebarSection>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <SidebarFooter collapsed={collapsed} />
      </aside>

      {/* Main Content Area - Full page scroll */}
      <div className={cn(
        "flex-1 min-w-0 min-h-0 overflow-hidden transition-all duration-300",
        collapsed ? "lg:ml-16" : "lg:ml-[280px]"
      )}>
        {children}
      </div>
    </div>
  );
}
