import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Building2,
  Users,
  FileText,
  Settings,
  Palette,
  Receipt,
  Globe,
  Bell,
  DollarSign,
  ShoppingCart,
  Package,
  Boxes,
  Code2,
  Workflow,
  LayoutGrid,
  UserCog,
  Shield,
  Calculator,
  FileBarChart,
  Mail,
  MessageSquare,
  FileSignature,
  Hash,
  FileType,
  Calendar,
  CreditCard,
  Zap
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface NavItem {
  label: string;
  path: string;
  icon: any;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    title: "Organization Settings",
    items: [
      { label: "Profile", path: "/admin/company-settings/profile", icon: Building2 },
      { label: "Branding", path: "/admin/company-settings/branding", icon: Palette },
    ]
  },
  {
    title: "Users & Roles",
    items: [
      { label: "Company Users", path: "/admin/company-settings/users", icon: Users },
      { label: "User Management", path: "/admin/users", icon: UserCog },
      { label: "Roles", path: "/admin/company-settings/roles", icon: Shield },
    ]
  },
  {
    title: "Taxes & Compliance",
    items: [
      { label: "Taxes", path: "/admin/company-settings/taxes", icon: Calculator },
      { label: "Direct Taxes", path: "/admin/company-settings/direct-taxes", icon: FileBarChart },
      { label: "e-Invoicing", path: "/admin/company-settings/einvoicing", icon: Receipt },
    ]
  },
  {
    title: "Setup & Configurations",
    items: [
      { label: "General", path: "/admin/company-settings/general", icon: Settings },
      { label: "Currencies", path: "/admin/company-settings/currencies", icon: DollarSign },
      { label: "Reminders", path: "/admin/company-settings/reminders", icon: Bell },
      { label: "Client Portal", path: "/admin/company-settings/client-portal", icon: Globe },
    ]
  },
  {
    title: "Customization",
    items: [
      { label: "Number Series", path: "/admin/code-management", icon: Hash },
      { label: "PDF Templates", path: "/admin/company-settings/pdf-templates", icon: FileType },
      { label: "Email Notifications", path: "/admin/company-settings/email-notifications", icon: Mail },
      { label: "SMS Notifications", path: "/admin/company-settings/sms-notifications", icon: MessageSquare },
      { label: "Digital Signature", path: "/admin/company-settings/digital-signature", icon: FileSignature },
    ]
  },
  {
    title: "Module Settings",
    items: [
      { label: "General", path: "/admin/company-settings/module-general", icon: LayoutGrid },
      { label: "Online Payments", path: "/admin/company-settings/payments", icon: CreditCard },
      { label: "Sales", path: "/admin/company-settings/sales", icon: ShoppingCart },
      { label: "Operations", path: "/admin/operations-settings", icon: Package },
    ]
  },
  {
    title: "Developer & Extensions",
    items: [
      { label: "Integrations", path: "/admin/company-settings/integrations", icon: Zap },
      { label: "API & Webhooks", path: "/admin/company-settings/developer", icon: Code2 },
      { label: "Workflows", path: "/admin/company-settings/workflows", icon: Workflow },
    ]
  }
];

export function SettingsSidebar() {
  return (
    <div className="w-64 border-r border-border/40 bg-background h-full">
      <ScrollArea className="h-full">
        <div className="px-3 py-6 space-y-6">
          {navigationGroups.map((group, groupIndex) => (
            <div key={groupIndex}>
              <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {group.title}
              </h3>
              <nav className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
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
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
              {groupIndex < navigationGroups.length - 1 && (
                <Separator className="mt-4" />
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
