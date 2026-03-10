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
  LayoutGrid,
  Shield,
  Hash,
  FileType,
  MessageSquare,
  FileSignature,
  Inbox,
  Send,
  Clock,
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
    title: "Organization",
    items: [
      { label: "Company Profile", path: "/admin/company-settings/profile", icon: Building2 },
      { label: "Branding & Logo", path: "/admin/company-settings/branding", icon: Palette },
    ]
  },
  {
    title: "Email & Notifications",
    items: [
      { label: "Email Providers", path: "/admin/company-settings/email-providers", icon: Mail },
      { label: "Email Templates", path: "/admin/company-settings/email-templates", icon: FileText },
      { label: "Email Outbox & Logs", path: "/admin/company-settings/email-outbox", icon: Send },
      { label: "Alerts", path: "/admin/company-settings/alerts", icon: Bell },
      { label: "Reminders", path: "/admin/company-settings/reminders", icon: Clock },
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
    title: "Module Settings",
    items: [
      { label: "General", path: "/admin/company-settings/general", icon: Settings },
      { label: "Currencies", path: "/admin/company-settings/currencies", icon: DollarSign },
      { label: "Client Portal", path: "/admin/company-settings/client-portal", icon: Globe },
      { label: "Online Payments", path: "/admin/company-settings/payments", icon: CreditCard },
      { label: "Sales", path: "/admin/company-settings/sales", icon: ShoppingCart },
      { label: "Operations", path: "/admin/operations-settings", icon: Package },
      { label: "Rate Settings", path: "/admin/company-settings/rate-settings", icon: Calculator },
      { label: "Concession Contracts", path: "/admin/company-settings/concession-contracts", icon: Boxes },
    ]
  },
  {
    title: "Customization",
    items: [
      { label: "Number Series", path: "/admin/code-management", icon: Hash },
      { label: "PDF Templates", path: "/admin/company-settings/pdf-templates", icon: FileType },
      { label: "SMS Notifications", path: "/admin/company-settings/sms-notifications", icon: MessageSquare },
      { label: "Digital Signature", path: "/admin/company-settings/digital-signature", icon: FileSignature },
    ]
  },
  {
    title: "Automation & Integrations",
    items: [
      { label: "Automation Rules", path: "/admin/company-settings/automation", icon: Zap },
      { label: "Workflows", path: "/admin/company-settings/workflows", icon: Workflow },
      { label: "Integrations", path: "/admin/company-settings/integrations", icon: Zap },
      { label: "API & Webhooks", path: "/admin/company-settings/developer", icon: Code2 },
    ]
  }
];

export function SettingsSidebar() {
  return (
    <div className="w-64 border-r border-border/40 bg-background h-full overflow-hidden flex flex-col">
      <ScrollArea className="flex-1 min-h-0">
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
