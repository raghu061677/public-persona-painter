import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/store/sidebarStore";
import {
  LayoutDashboard, Building2, Map, Layers, Briefcase, Users, TrendingUp,
  FileText, Receipt, Zap, UserCog, Palette, FileSpreadsheet,
  Bell, LogOut, User, Menu, Shield, DollarSign, Smartphone,
  Image, Settings, FileCheck, CreditCard, Globe, Mail, MessageSquare,
  Lock, Database, Upload, Download, HardDrive, Sparkles, ShoppingBag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { SidebarSection } from "@/components/sidebar/SidebarSection";
import { SidebarItem } from "@/components/sidebar/SidebarItem";
import { SidebarGroup } from "@/components/sidebar/SidebarGroup";
import { SidebarFooter } from "@/components/sidebar/SidebarFooter";
import { CompanySwitcher } from "@/components/sidebar/CompanySwitcher";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const { open, toggle } = useSidebarStore();
  const { user, isAdmin } = useAuth();
  const { company, isPlatformAdmin, companyUser } = useCompany();
  const navigate = useNavigate();

  const isCompanyAdmin = companyUser?.role === 'admin' || isAdmin;
  const collapsed = !open;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Overlay for mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={toggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-card border-r border-border shadow-sm transition-all duration-300 ease-in-out",
          collapsed ? "w-16" : "w-[280px]"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-border/40">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">Go-Ads 360°</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            className={cn("h-8 w-8", collapsed && "mx-auto")}
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
            {/* PLATFORM ADMINISTRATION */}
            {isPlatformAdmin && (
              <>
                <SidebarSection label="Platform Administration" collapsed={collapsed}>
                  <SidebarItem
                    icon={LayoutDashboard}
                    label="Platform Dashboard"
                    href="/admin/platform"
                    collapsed={collapsed}
                  />
                  <SidebarItem
                    icon={Building2}
                    label="All Companies"
                    href="/admin/company-management"
                    collapsed={collapsed}
                  />
                  <SidebarItem
                    icon={Shield}
                    label="Approve Companies"
                    href="/admin/approve-companies"
                    collapsed={collapsed}
                  />
                  <SidebarItem
                    icon={UserCog}
                    label="Platform Users"
                    href="/admin/users"
                    collapsed={collapsed}
                  />
                  <SidebarItem
                    icon={DollarSign}
                    label="Billing & Usage"
                    href="/admin/tenant-analytics"
                    collapsed={collapsed}
                  />
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

            {/* COMPANY WORKSPACE */}
            {company && (
              <>
                <SidebarSection label="Company Workspace" collapsed={collapsed}>
                  <SidebarItem
                    icon={LayoutDashboard}
                    label="Overview"
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
                  <SidebarItem
                    icon={TrendingUp}
                    label="Operations"
                    href="/admin/operations"
                    collapsed={collapsed}
                  />
                  <SidebarItem
                    icon={Users}
                    label="Clients"
                    href="/admin/clients"
                    collapsed={collapsed}
                  />

                  {/* Finance Group */}
                  <SidebarGroup icon={DollarSign} label="Finance" collapsed={collapsed}>
                    <SidebarItem
                      icon={FileSpreadsheet}
                      label="Estimates"
                      href="/admin/estimations"
                      collapsed={collapsed}
                    />
                    <SidebarItem
                      icon={FileCheck}
                      label="Proformas"
                      href="/admin/proformas"
                      collapsed={collapsed}
                    />
                    <SidebarItem
                      icon={FileText}
                      label="Invoices"
                      href="/admin/invoices"
                      collapsed={collapsed}
                    />
                    <SidebarItem
                      icon={Receipt}
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
                    icon={Sparkles}
                    label="AI Assistant"
                    href="/admin/ai-assistant"
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
            {company && (isCompanyAdmin || isPlatformAdmin) && (
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

      {/* Main Content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
