import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Building2,
  Users,
  Settings,
  Palette,
  Bell,
  Mail,
  FileText,
  Zap,
  Globe,
  Code2,
  Calculator,
  FileBarChart,
  Receipt,
  DollarSign,
  CreditCard,
  ShoppingCart,
  Package,
  Boxes,
  Workflow,
  Shield,
  Hash,
  FileType,
  MessageSquare,
  FileSignature,
  Send,
  Clock,
  Lock,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useEnterpriseRBAC } from "@/hooks/useEnterpriseRBAC";
import { canAccessSettingsSection, type SettingsSection } from "@/components/rbac/SettingsGuard";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface NavItem {
  label: string;
  path: string;
  icon: any;
  section: SettingsSection;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    title: "Organization",
    items: [
      { label: "Company Profile", path: "/admin/company-settings/profile", icon: Building2, section: "profile" },
      { label: "Branding & Logo", path: "/admin/company-settings/branding", icon: Palette, section: "branding" },
    ]
  },
  {
    title: "Email & Notifications",
    items: [
      { label: "Email Providers", path: "/admin/company-settings/email-providers", icon: Mail, section: "email_providers" },
      { label: "Email Templates", path: "/admin/company-settings/email-templates", icon: FileText, section: "email_templates" },
      { label: "Email Outbox & Logs", path: "/admin/company-settings/email-outbox", icon: Send, section: "email_outbox" },
      { label: "Alerts", path: "/admin/company-settings/alerts", icon: Bell, section: "alerts" },
      { label: "Reminders", path: "/admin/company-settings/reminders", icon: Clock, section: "reminders" },
    ]
  },
  {
    title: "Taxes & Compliance",
    items: [
      { label: "Taxes", path: "/admin/company-settings/taxes", icon: Calculator, section: "taxes" },
      { label: "e-Invoicing", path: "/admin/company-settings/einvoicing", icon: Receipt, section: "einvoicing" },
    ]
  },
  {
    title: "Module Settings",
    items: [
      { label: "General", path: "/admin/company-settings/general", icon: Settings, section: "general" },
      { label: "Currencies", path: "/admin/company-settings/currencies", icon: DollarSign, section: "currencies" },
      { label: "Client Portal", path: "/admin/company-settings/client-portal", icon: Globe, section: "client_portal" },
      { label: "Online Payments", path: "/admin/company-settings/payments", icon: CreditCard, section: "payments" },
      { label: "Sales", path: "/admin/company-settings/sales", icon: ShoppingCart, section: "sales" },
      { label: "Operations", path: "/admin/company-settings/operations-settings", icon: Package, section: "general" },
      { label: "Rate Settings", path: "/admin/company-settings/rate-settings", icon: Calculator, section: "rate_settings" },
      { label: "Concession Contracts", path: "/admin/company-settings/concession-contracts", icon: Boxes, section: "concession_contracts" },
    ]
  },
  {
    title: "Customization",
    items: [
      { label: "Number Series", path: "/admin/company-settings/number-series", icon: Hash, section: "general" },
      { label: "PDF Templates", path: "/admin/company-settings/pdf-templates", icon: FileType, section: "pdf_templates" },
      { label: "SMS Notifications", path: "/admin/company-settings/sms-notifications", icon: MessageSquare, section: "sms_notifications" },
      { label: "Digital Signature", path: "/admin/company-settings/digital-signature", icon: FileSignature, section: "digital_signature" },
    ]
  },
  {
    title: "Users & Access",
    items: [
      { label: "User Management", path: "/admin/company-settings/users", icon: Users, section: "users" },
      { label: "Roles & Permissions", path: "/admin/company-settings/roles", icon: Shield, section: "roles" },
    ]
  },
  {
    title: "Automation & Integrations",
    items: [
      { label: "Automation Rules", path: "/admin/company-settings/automation", icon: Zap, section: "automation" },
      { label: "Workflows", path: "/admin/company-settings/workflows", icon: Workflow, section: "workflows" },
      { label: "Integrations", path: "/admin/company-settings/integrations", icon: Zap, section: "integrations" },
      { label: "API & Webhooks", path: "/admin/company-settings/developer", icon: Code2, section: "developer" },
    ]
  }
];

export function SettingsSidebar() {
  const { isCompanyAdmin, canViewModule, canEdit } = useEnterpriseRBAC();
  const canView = canViewModule('settings');
  const canEditSettings = canEdit('settings');

  return (
    <div className="w-64 border-r border-border/40 bg-background h-full overflow-hidden flex flex-col">
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-3 py-6 space-y-6">
          {navigationGroups.map((group, groupIndex) => {
            // Filter items by access
            const accessibleItems = group.items.filter(item =>
              canAccessSettingsSection(item.section, isCompanyAdmin, canView, canEditSettings)
            );

            if (accessibleItems.length === 0) return null;

            return (
              <div key={groupIndex}>
                <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.title}
                </h3>
                <nav className="space-y-0.5">
                  {accessibleItems.map((item) => {
                    const Icon = item.icon;
                    const isAdminOnly = ['email_providers', 'taxes', 'direct_taxes', 'einvoicing', 'integrations', 'developer', 'users', 'roles'].includes(item.section);

                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 px-3 py-2.5 text-sm rounded-md transition-colors",
                            isActive
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                          )
                        }
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {isAdminOnly && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Lock className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              <p className="text-xs">Admin only</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </NavLink>
                    );
                  })}
                </nav>
                {groupIndex < navigationGroups.length - 1 && (
                  <Separator className="mt-4" />
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
