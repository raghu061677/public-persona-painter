import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/store/sidebarStore";
import {
  LayoutDashboard, Building2, Map, Layers, Briefcase, Users, TrendingUp,
  FileText, Receipt, Zap, UserCog, Palette, FileSpreadsheet,
  Bell, LogOut, User, Menu, Shield, DollarSign, Smartphone,
  Image, Settings, FileCheck, CreditCard, Globe, Mail, MessageSquare,
  Lock, Database, Upload, Download, HardDrive, Sparkles, ShoppingBag, BarChart3
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
    <div className="flex min-h-screen w-full bg-background">
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
          "fixed lg:sticky top-0 inset-y-0 left-0 z-50 flex flex-col bg-card border-r border-border shadow-sm transition-all duration-300 ease-in-out h-screen",
          collapsed ? "w-16" : "w-[280px]"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-border/40">
          {!collapsed && (
            <Link to="/admin/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
              {company?.logo_url ? (
                <img 
                  src={company.logo_url} 
                  alt={company.name}
                  className="h-8 w-auto object-contain max-w-[120px] rounded"
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
            <Link to="/admin/dashboard" className="mx-auto hover:opacity-80 transition-opacity cursor-pointer">
              {company?.logo_url ? (
                <img 
                  src={company.logo_url} 
                  alt={company.name}
                  className="h-8 w-8 object-contain rounded"
                />
              ) : (
                <Shield className="h-5 w-5 text-primary" />
              )}
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
                  
                  {/* Companies Management Group */}
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

                  {/* User Management Group */}
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

                  {/* Platform Reports & Analytics Group */}
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
              </>
            )}

            {/* COMPANY WORKSPACE - Tenant Companies */}
            {company && company.type !== 'platform_admin' && (
              <>
                <SidebarSection label="Company Workspace" collapsed={collapsed}>
                  <SidebarItem
                    icon={LayoutDashboard}
                    label="Dashboard"
                    href="/admin/dashboard"
                    collapsed={collapsed}
                  />
                  <SidebarItem
                    icon={Map}
                    label="Media Assets"
                    href="/admin/media-assets"
                    collapsed={collapsed}
                  />
                  <SidebarItem
                    icon={Users}
                    label="Clients"
                    href="/admin/clients"
                    collapsed={collapsed}
                  />
                  <SidebarItem
                    icon={Layers}
                    label="Plans"
                    href="/admin/plans"
                    collapsed={collapsed}
                  />
                  <SidebarItem
                    icon={Briefcase}
                    label="Campaigns"
                    href="/admin/campaigns"
                    collapsed={collapsed}
                  />
                  {/* Operations Group - Operations & Admin */}
                  {rbac.canViewModule('operations') && (
                    <SidebarGroup icon={TrendingUp} label="Operations" collapsed={collapsed}>
                      <SidebarItem
                        icon={Image}
                        label="Creative Received"
                        href="/admin/operations/creatives"
                        collapsed={collapsed}
                      />
                      <SidebarItem
                        icon={FileCheck}
                        label="Printing Status"
                        href="/admin/operations/printing"
                        collapsed={collapsed}
                      />
                      <SidebarItem
                        icon={TrendingUp}
                        label="Mounting Assignment"
                        href="/admin/operations"
                        collapsed={collapsed}
                      />
                      <SidebarItem
                        icon={Image}
                        label="Proof Photo Uploads"
                        href="/admin/operations/proof-uploads"
                        collapsed={collapsed}
                      />
                    </SidebarGroup>
                  )}

                  {/* Finance Group - Finance & Admin only */}
                  {rbac.canViewModule('finance') && (
                    <SidebarGroup icon={DollarSign} label="Finance" collapsed={collapsed}>
                      <SidebarItem
                        icon={FileSpreadsheet}
                        label="Quotations"
                        href="/admin/estimations"
                        collapsed={collapsed}
                      />
                      <SidebarItem
                        icon={FileText}
                        label="Sales Orders"
                        href="/admin/sales-orders"
                        collapsed={collapsed}
                      />
                      <SidebarItem
                        icon={FileCheck}
                        label="Purchase Orders"
                        href="/admin/purchase-orders"
                        collapsed={collapsed}
                      />
                      <SidebarItem
                        icon={FileCheck}
                        label="Proforma Invoice"
                        href="/admin/proformas"
                        collapsed={collapsed}
                      />
                      <SidebarItem
                        icon={Receipt}
                        label="Invoices"
                        href="/admin/invoices"
                        collapsed={collapsed}
                      />
                      <SidebarItem
                        icon={CreditCard}
                        label="Payments"
                        href="/admin/payments"
                        collapsed={collapsed}
                      />
                      <SidebarItem
                        icon={DollarSign}
                        label="Expenses"
                        href="/admin/expenses"
                        collapsed={collapsed}
                      />
                      <SidebarItem
                        icon={Zap}
                        label="Power Bills"
                        href="/admin/power-bills"
                        collapsed={collapsed}
                      />
                    </SidebarGroup>
                  )}

                  {/* Workspace Reports Group - All can view reports */}
                  {rbac.canViewModule('reports') && (
                    <SidebarGroup icon={BarChart3} label="Workspace Reports" collapsed={collapsed}>
                      <SidebarItem
                        icon={Map}
                        label="Media Availability"
                        href="/admin/reports/vacant-media"
                        collapsed={collapsed}
                      />
                      <SidebarItem
                        icon={Users}
                        label="Client-wise Bookings"
                        href="/admin/reports/clients"
                        collapsed={collapsed}
                      />
                      <SidebarItem
                        icon={Briefcase}
                        label="Campaign-wise Bookings"
                        href="/admin/reports/campaigns"
                        collapsed={collapsed}
                      />
                      <SidebarItem
                        icon={TrendingUp}
                        label="Asset-wise Revenue"
                        href="/admin/reports/revenue"
                        collapsed={collapsed}
                      />
                      <SidebarItem
                        icon={DollarSign}
                        label="Financial Summary"
                        href="/admin/reports/financial"
                        collapsed={collapsed}
                      />
                      <SidebarItem
                        icon={Image}
                        label="Proof-of-Execution"
                        href="/admin/reports/proof-execution"
                        collapsed={collapsed}
                      />
                    </SidebarGroup>
                  )}

                </SidebarSection>
                <Separator className="my-4" />
              </>
            )}

            {/* TOOLS & UTILITIES */}
            {company && company.type !== 'platform_admin' && (
              <>
                <SidebarSection label="Tools" collapsed={collapsed}>
                  <SidebarItem
                    icon={Sparkles}
                    label="AI Assistant"
                    href="/admin/ai-assistant"
                    collapsed={collapsed}
                  />
                  <SidebarItem
                    icon={Smartphone}
                    label="Mobile Field App"
                    href="/mobile"
                    collapsed={collapsed}
                  />
                  <SidebarItem
                    icon={Image}
                    label="Photo Library"
                    href="/admin/photo-library"
                    collapsed={collapsed}
                  />
                  <SidebarItem
                    icon={Globe}
                    label="Marketplace"
                    href="/marketplace"
                    collapsed={collapsed}
                  />
                  <SidebarItem
                    icon={ShoppingBag}
                    label="Booking Requests"
                    href="/admin/booking-requests"
                    collapsed={collapsed}
                  />
                </SidebarSection>
                <Separator className="my-4" />
              </>
            )}

            {/* COMPANY SETTINGS */}
            {company && company.type !== 'platform_admin' && (isCompanyAdmin || isPlatformAdmin) && (
              <>
                <SidebarSection label="Company Settings" collapsed={collapsed}>
                  {/* Organization Settings */}
                  <SidebarGroup icon={Building2} label="Organization" collapsed={collapsed}>
                    <SidebarItem
                      icon={Building2}
                      label="Profile"
                      href="/admin/company-settings/profile"
                      collapsed={collapsed}
                    />
                    <SidebarItem
                      icon={Palette}
                      label="Branding"
                      href="/admin/company-settings/branding"
                      collapsed={collapsed}
                    />
                    <SidebarItem
                      icon={CreditCard}
                      label="Subscription"
                      href="/admin/company-settings"
                      collapsed={collapsed}
                    />
                  </SidebarGroup>

                  {/* Users & Access */}
                  <SidebarGroup icon={UserCog} label="Users & Access" collapsed={collapsed}>
                    <SidebarItem
                      icon={Users}
                      label="Users"
                      href="/admin/users"
                      collapsed={collapsed}
                    />
                    <SidebarItem
                      icon={Shield}
                      label="Roles & Permissions"
                      href="/admin/company-settings/roles"
                      collapsed={collapsed}
                    />
                  </SidebarGroup>

                  {/* Compliance */}
                  <SidebarGroup icon={FileCheck} label="Compliance" collapsed={collapsed}>
                    <SidebarItem
                      icon={Receipt}
                      label="Taxes"
                      href="/admin/company-settings/taxes"
                      collapsed={collapsed}
                    />
                    <SidebarItem
                      icon={FileText}
                      label="e-Invoicing"
                      href="/admin/company-settings/e-invoicing"
                      collapsed={collapsed}
                    />
                  </SidebarGroup>

                  {/* Configuration */}
                  <SidebarGroup icon={Settings} label="Configuration" collapsed={collapsed}>
                    <SidebarItem
                      icon={Settings}
                      label="General"
                      href="/admin/company-settings/general"
                      collapsed={collapsed}
                    />
                    <SidebarItem
                      icon={Globe}
                      label="Currencies"
                      href="/admin/company-settings/currencies"
                      collapsed={collapsed}
                    />
                    <SidebarItem
                      icon={Bell}
                      label="Reminders"
                      href="/admin/company-settings/reminders"
                      collapsed={collapsed}
                    />
                    <SidebarItem
                      icon={Users}
                      label="Client Portal"
                      href="/admin/company-settings/client-portal"
                      collapsed={collapsed}
                    />
                  </SidebarGroup>

                  {/* Customization */}
                  <SidebarGroup icon={Palette} label="Customization" collapsed={collapsed}>
                    <SidebarItem
                      icon={FileText}
                      label="PDF Templates"
                      href="/admin/company-settings/pdf-templates"
                      collapsed={collapsed}
                    />
                    <SidebarItem
                      icon={Mail}
                      label="Email Notifications"
                      href="/admin/company-settings/email-notifications"
                      collapsed={collapsed}
                    />
                    <SidebarItem
                      icon={MessageSquare}
                      label="SMS Notifications"
                      href="/admin/company-settings/sms-notifications"
                      collapsed={collapsed}
                    />
                    <SidebarItem
                      icon={Lock}
                      label="Digital Signature"
                      href="/admin/company-settings/digital-signature"
                      collapsed={collapsed}
                    />
                  </SidebarGroup>

                  {/* Data Management */}
                  <SidebarGroup icon={Database} label="Data Management" collapsed={collapsed}>
                    <SidebarItem
                      icon={Upload}
                      label="Import Data"
                      href="/admin/import-data"
                      collapsed={collapsed}
                    />
                    <SidebarItem
                      icon={Download}
                      label="Export Data"
                      href="/admin/export-data"
                      collapsed={collapsed}
                    />
                    <SidebarItem
                      icon={HardDrive}
                      label="Storage Usage"
                      href="/admin/company-settings"
                      collapsed={collapsed}
                    />
                  </SidebarGroup>

                  <SidebarItem
                    icon={Zap}
                    label="Integrations"
                    href="/admin/company-settings/integrations"
                    collapsed={collapsed}
                  />
                </SidebarSection>
                <Separator className="my-4" />
              </>
            )}

            {/* USER PERSONAL MENU */}
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
              <SidebarItem
                icon={Palette}
                label="Theme Picker"
                href="/settings/theme"
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
          </div>
        </ScrollArea>

        {/* Footer */}
        <SidebarFooter collapsed={collapsed} />
      </aside>

      {/* Main Content Area - Full page scroll */}
      <div className={cn(
        "flex-1 min-w-0 transition-all duration-300",
        collapsed ? "lg:ml-16" : "lg:ml-[280px]"
      )}>
        {children}
      </div>
    </div>
  );
}
