import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { useRBAC } from "@/hooks/useRBAC";
import {
  LayoutDashboard, Building2, Map, UserCog, Shield, DollarSign,
  Settings, BarChart3, FileText, Menu,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroupLabel,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CompanySwitcher } from "@/components/sidebar/CompanySwitcher";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MobileAccordionNav } from "@/components/sidebar/MobileAccordionNav";
import { DesktopNavFromConfig } from "@/components/sidebar/DesktopNavFromConfig";
import { LogOut } from "lucide-react";

export function ResponsiveSidebar() {
  const location = useLocation();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const { company, isPlatformAdmin, companyUser } = useCompany();
  const rbac = useRBAC();
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [proofUploadsCount, setProofUploadsCount] = useState(0);

  const isCompanyAdmin = companyUser?.role === 'admin' || isAdmin;
  const collapsed = state === "collapsed";
  const isActive = (path: string) => location.pathname === path;

  // Fetch pending approvals count
  useEffect(() => {
    if (user && company) {
      fetchPendingApprovalsCount();
    }
  }, [user, company]);

  const fetchPendingApprovalsCount = async () => {
    try {
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user?.id);

      if (!userRoles || userRoles.length === 0) return;

      const roles = userRoles.map(ur => ur.role);

      const { count } = await supabase
        .from("plan_approvals")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")
        .in("required_role", roles);

      setPendingApprovalsCount(count || 0);
    } catch (error) {
      console.error("Error fetching pending approvals count:", error);
    }
  };

  // Close mobile drawer on navigation
  const handleMobileNavigate = useCallback(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [isMobile, setOpenMobile]);

  const handleLogout = async () => {
    handleMobileNavigate();
    await supabase.auth.signOut();
    navigate('/auth');
  };

  // Simple menu item for platform admin section
  const MenuItem = ({ icon: Icon, label, href }: { icon: any; label: string; href: string }) => {
    const active = isActive(href);
    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={active}>
                <Link to={href}><Icon /></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </TooltipTrigger>
          <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
      );
    }
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={active}>
          <Link to={href}><Icon /><span>{label}</span></Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  // Badge counts
  const badges: Record<string, number> = {
    pendingApprovals: pendingApprovalsCount,
    proofUploads: proofUploadsCount,
  };

  // Mobile header with company logo/branding
  const mobileHeader = (
    <div className="px-4 pb-2 border-b border-border/40 mb-2">
      <Link
        to="/admin/dashboard"
        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        onPointerUp={handleMobileNavigate}
      >
        {company?.logo_url ? (
          <img
            src={company.logo_url}
            alt={company.name}
            className="h-8 w-auto object-contain max-w-[140px] rounded"
          />
        ) : (
          <>
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">
              {company?.name || 'Go-Ads 360°'}
            </span>
          </>
        )}
      </Link>
      <p className="text-xs text-muted-foreground mt-1">
        {company?.type === 'media_owner' ? 'Media Owner' : company?.type === 'agency' ? 'Agency' : 'Workspace'}
      </p>
    </div>
  );

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-border"
      mobileContent={
        <MobileAccordionNav
          badges={badges}
          onLogout={handleLogout}
        />
      }
      mobileHeader={mobileHeader}
    >
      {/* Header with Logo and Toggle */}
      <SidebarHeader className="border-b border-border/40 p-4">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <Link to="/admin/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              {company?.logo_url ? (
                <img
                  src={company.logo_url}
                  alt={company.name}
                  className="h-8 w-auto object-contain max-w-[140px] rounded"
                />
              ) : (
                <>
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-foreground">
                    {company?.name || 'Go-Ads 360°'}
                  </span>
                </>
              )}
            </Link>
          )}
          {collapsed && (
            <Link to="/admin/dashboard" className="mx-auto hover:opacity-80 transition-opacity">
              {company?.logo_url ? (
                <img
                  src={company.logo_url}
                  alt={company.name}
                  className="h-8 w-8 object-contain rounded"
                />
              ) : (
                <Shield className="h-5 w-5 text-primary mx-auto" />
              )}
            </Link>
          )}
        </div>
        {company && !collapsed && <CompanySwitcher collapsed={collapsed} />}
      </SidebarHeader>

      {/* Main Content */}
      <SidebarContent>
        <ScrollArea className="flex-1 ios-scroll">
          {/* Platform Administration (special case — not in NAV_CONFIG) */}
          {isPlatformAdmin && company?.type === 'platform_admin' && (
            <>
              {!collapsed && <SidebarGroupLabel className="px-4">Platform Administration</SidebarGroupLabel>}
              <SidebarMenu>
                <MenuItem icon={LayoutDashboard} label="Platform Dashboard" href="/admin/platform" />
                <MenuItem icon={Building2} label="All Companies" href="/admin/company-management" />
                <MenuItem icon={Shield} label="Company Approvals" href="/admin/approve-companies" />
                <MenuItem icon={UserCog} label="Platform Users" href="/admin/users" />
                <MenuItem icon={Shield} label="Platform Roles" href="/admin/platform-roles" />
                <MenuItem icon={DollarSign} label="Billing & Subscriptions" href="/admin/platform-reports/billing" />
                <MenuItem icon={BarChart3} label="Multi-Tenant Reports" href="/admin/analytics-dashboard" />
                <MenuItem icon={FileText} label="Audit Logs" href="/admin/audit-logs" />
                <MenuItem icon={Settings} label="Platform Settings" href="/admin/platform-admin-setup" />
              </SidebarMenu>
              <Separator className="my-2" />
            </>
          )}

          {/* Tenant Company Navigation — driven entirely from NAV_CONFIG */}
          {company && company.type !== 'platform_admin' && (
            <DesktopNavFromConfig
              collapsed={collapsed}
              badges={badges}
              onLogout={handleLogout}
            />
          )}
        </ScrollArea>
      </SidebarContent>

      {/* Footer — Logout only */}
      <SidebarFooter className="border-t border-border/40 p-2">
        {!collapsed ? (
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/8"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="mx-auto text-muted-foreground hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Logout</TooltipContent>
          </Tooltip>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
