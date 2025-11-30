import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { useRBAC } from "@/hooks/useRBAC";
import {
  LayoutDashboard, Building2, Map, Layers, Briefcase, Users, TrendingUp,
  FileText, Receipt, Zap, UserCog, Palette, FileSpreadsheet,
  Shield, DollarSign, Smartphone, Image, Settings, FileCheck, 
  CreditCard, Globe, ShoppingBag, BarChart3, Sparkles, Menu
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CompanySwitcher } from "@/components/sidebar/CompanySwitcher";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function ResponsiveSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const { company, isPlatformAdmin, companyUser } = useCompany();
  const rbac = useRBAC();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  
  const isCompanyAdmin = companyUser?.role === 'admin' || isAdmin;
  const collapsed = state === "collapsed";
  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const MenuItem = ({ icon: Icon, label, href }: { icon: any; label: string; href: string }) => {
    const active = isActive(href);
    
    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={active}>
                <Link to={href}>
                  <Icon />
                </Link>
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
          <Link to={href}>
            <Icon />
            <span>{label}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  const MenuGroup = ({ 
    icon: Icon, 
    label, 
    children 
  }: { 
    icon: any; 
    label: string; 
    children: React.ReactNode 
  }) => {
    if (collapsed) {
      return <>{children}</>;
    }

    return (
      <Collapsible defaultOpen className="group/collapsible">
        <SidebarGroup>
          <CollapsibleTrigger asChild>
            <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded-md px-2 py-1.5 transition-colors">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </div>
              <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
            </SidebarGroupLabel>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarGroupContent>
              <SidebarMenu className="ml-3 mt-1 space-y-1">
                {children}
              </SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
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
        <ScrollArea className="flex-1">
          {/* Platform Administration */}
          {isPlatformAdmin && company?.type === 'platform_admin' && (
            <>
              {!collapsed && <SidebarGroupLabel className="px-4">Platform Administration</SidebarGroupLabel>}
              <SidebarMenu>
                <MenuItem icon={LayoutDashboard} label="Platform Dashboard" href="/admin/platform" />
                
                <MenuGroup icon={Building2} label="Companies">
                  <MenuItem icon={Building2} label="All Companies" href="/admin/company-management" />
                  <MenuItem icon={Shield} label="Approvals" href="/admin/approve-companies" />
                </MenuGroup>

                <MenuGroup icon={UserCog} label="Users">
                  <MenuItem icon={UserCog} label="Platform Users" href="/admin/users" />
                  <MenuItem icon={Shield} label="Roles & Permissions" href="/admin/platform-roles" />
                </MenuGroup>

                <MenuItem icon={DollarSign} label="Billing & Subscriptions" href="/admin/platform-reports/billing" />
                <MenuItem icon={FileCheck} label="Onboarding & QA" href="/admin/onboarding" />
                
                <MenuGroup icon={BarChart3} label="Platform Reports">
                  <MenuItem icon={BarChart3} label="Multi-Tenant Reports" href="/admin/analytics-dashboard" />
                  <MenuItem icon={Building2} label="Company Usage" href="/admin/platform-reports/company-usage" />
                  <MenuItem icon={DollarSign} label="Billing Reports" href="/admin/platform-reports/billing" />
                  <MenuItem icon={Map} label="Global Inventory" href="/admin/platform-reports/media-inventory" />
                </MenuGroup>

                <MenuItem icon={FileText} label="Audit Logs" href="/admin/audit-logs" />
                <MenuItem icon={Settings} label="Platform Settings" href="/admin/platform-admin-setup" />
              </SidebarMenu>
              <Separator className="my-2" />
            </>
          )}

          {/* Company Workspace */}
          {company && company.type !== 'platform_admin' && (
            <>
              {!collapsed && <SidebarGroupLabel className="px-4">Company Workspace</SidebarGroupLabel>}
              <SidebarMenu>
                <MenuItem icon={LayoutDashboard} label="Dashboard" href="/admin/dashboard" />
                <MenuItem icon={Map} label="Media Assets" href="/admin/media-assets" />
                <MenuItem icon={Users} label="Clients" href="/admin/clients" />
                
                <MenuGroup icon={Layers} label="Plans">
                  <MenuItem icon={Layers} label="All Plans" href="/admin/plans" />
                  {(isCompanyAdmin || isPlatformAdmin) && (
                    <MenuItem icon={FileText} label="Plan Templates" href="/admin/plan-templates" />
                  )}
                </MenuGroup>
                
                <MenuItem icon={Briefcase} label="Campaigns" href="/admin/campaigns" />

                {rbac.canViewModule('operations') && (
                  <MenuGroup icon={TrendingUp} label="Operations">
                    <MenuItem icon={Image} label="Creative Received" href="/admin/operations/creatives" />
                    <MenuItem icon={FileCheck} label="Printing Status" href="/admin/operations/printing" />
                    <MenuItem icon={TrendingUp} label="Mounting Assignment" href="/admin/operations" />
                    <MenuItem icon={Image} label="Proof Uploads" href="/admin/operations/proof-uploads" />
                  </MenuGroup>
                )}

                {rbac.canViewModule('finance') && (
                  <MenuGroup icon={DollarSign} label="Finance">
                    <MenuItem icon={FileSpreadsheet} label="Quotations" href="/admin/estimations" />
                    <MenuItem icon={FileText} label="Sales Orders" href="/admin/sales-orders" />
                    <MenuItem icon={FileCheck} label="Purchase Orders" href="/admin/purchase-orders" />
                    <MenuItem icon={FileCheck} label="Proforma Invoice" href="/admin/proformas" />
                    <MenuItem icon={Receipt} label="Invoices" href="/admin/invoices" />
                    <MenuItem icon={CreditCard} label="Payments" href="/admin/payments" />
                    <MenuItem icon={DollarSign} label="Expenses" href="/admin/expenses" />
                    <MenuItem icon={Zap} label="Power Bills" href="/admin/power-bills" />
                  </MenuGroup>
                )}

                {rbac.canViewModule('reports') && (
                  <MenuGroup icon={BarChart3} label="Reports">
                    <MenuItem icon={Map} label="Media Availability" href="/admin/reports/vacant-media" />
                    <MenuItem icon={Users} label="Client Bookings" href="/admin/reports/clients" />
                    <MenuItem icon={Briefcase} label="Campaign Bookings" href="/admin/reports/campaigns" />
                    <MenuItem icon={TrendingUp} label="Asset Revenue" href="/admin/reports/revenue" />
                    <MenuItem icon={DollarSign} label="Financial Summary" href="/admin/reports/financial" />
                    <MenuItem icon={Image} label="Proof Execution" href="/admin/reports/proof-execution" />
                  </MenuGroup>
                )}
              </SidebarMenu>
              <Separator className="my-2" />

              {/* Tools */}
              {!collapsed && <SidebarGroupLabel className="px-4">Tools</SidebarGroupLabel>}
              <SidebarMenu>
                <MenuItem icon={Sparkles} label="AI Assistant" href="/admin/ai-assistant" />
                <MenuItem icon={Smartphone} label="Mobile Field App" href="/mobile" />
                <MenuItem icon={Image} label="Photo Library" href="/admin/photo-library" />
                <MenuItem icon={Globe} label="Marketplace" href="/marketplace" />
                <MenuItem icon={ShoppingBag} label="Booking Requests" href="/admin/booking-requests" />
              </SidebarMenu>
              <Separator className="my-2" />

              {/* Company Settings */}
              {(isCompanyAdmin || isPlatformAdmin) && (
                <>
                  {!collapsed && <SidebarGroupLabel className="px-4">Settings</SidebarGroupLabel>}
                  <SidebarMenu>
                    <MenuGroup icon={Building2} label="Organization">
                      <MenuItem icon={Building2} label="Profile" href="/admin/company-settings/profile" />
                      <MenuItem icon={Palette} label="Branding" href="/admin/company-settings/branding" />
                      <MenuItem icon={CreditCard} label="Subscription" href="/admin/company-settings" />
                    </MenuGroup>

                    <MenuGroup icon={UserCog} label="Users & Access">
                      <MenuItem icon={Users} label="Users" href="/admin/users" />
                      <MenuItem icon={Shield} label="Roles" href="/admin/company-settings/roles" />
                    </MenuGroup>
                  </SidebarMenu>
                </>
              )}
            </>
          )}
        </ScrollArea>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-border/40 p-2">
        {!collapsed ? (
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start gap-2"
          >
            <Shield className="h-4 w-4" />
            <span>Logout</span>
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="mx-auto"
              >
                <Shield className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Logout</TooltipContent>
          </Tooltip>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
