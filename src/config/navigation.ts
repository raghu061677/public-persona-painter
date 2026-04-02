import type { ModuleName } from "@/hooks/useRBAC";
import {
  Database,
  Activity,
  Mail,
  LayoutDashboard,
  Map,
  Calendar,
  CalendarDays,
  FileCheck,
  UserPlus,
  Users,
  ShoppingBag,
  FileText,
  Layers,
  CheckCircle2,
  ListChecks,
  History,
  Settings,
  Briefcase,
  Image,
  TrendingUp,
  DollarSign,
  FileSpreadsheet,
  Receipt,
  CreditCard,
  Zap,
  Clock,
  Wallet,
  BarChart3,
  Sparkles,
  Smartphone,
  Globe,
  Building2,
  Shield,
  LogOut,
  User,
  Wrench,
  Camera,
  Printer,
  Package,
  BookOpen,
  PieChart,
  Megaphone,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon?: LucideIcon;
  badge?: string; // badge key for dynamic counts
}

export interface NavSection {
  id: string;
  label: string;
  icon: LucideIcon;
  items?: NavItem[];
  children?: NavSection[]; // nested accordion groups
  requiresAdmin?: boolean;
  requiresModule?: ModuleName;
}

export interface NavConfig {
  sections: NavSection[];
  accountItems: NavItem[];
}

/**
 * Complete navigation configuration for Go-Ads 360°
 * Single source of truth — drives desktop sidebar, mobile accordion, and breadcrumbs.
 *
 * Structure follows enterprise ERP conventions:
 *   Dashboard → Media → Sales → Campaigns & Ops → Finance → Reports → Tools → Admin
 */
export const NAV_CONFIG: NavConfig = {
  sections: [
    // ─── Dashboard ───────────────────────────────────────────
    {
      id: "dashboard",
      label: "Overview",
      icon: LayoutDashboard,
      items: [
        { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
        { label: "Executive Summary", href: "/admin/reports/executive", icon: PieChart },
      ],
    },

    // ─── Media ───────────────────────────────────────────────
    {
      id: "media",
      label: "Media",
      icon: Map,
      items: [
        { label: "Media Assets", href: "/admin/media-assets", icon: Map },
        { label: "Availability", href: "/admin/reports/vacant-media", icon: Calendar },
        { label: "Asset Validation", href: "/admin/media-assets-validation", icon: FileCheck },
        { label: "Photo Library", href: "/admin/photo-library", icon: Image },
      ],
    },

    // ─── Sales ───────────────────────────────────────────────
    {
      id: "sales",
      label: "Sales",
      icon: Briefcase,
      items: [
        { label: "Leads", href: "/admin/leads", icon: UserPlus },
        { label: "Clients", href: "/admin/clients", icon: Users },
        { label: "Booking Requests", href: "/admin/booking-requests", icon: ShoppingBag },
        { label: "Plans", href: "/admin/plans", icon: Layers },
        { label: "Quotations", href: "/admin/estimations", icon: FileSpreadsheet },
        { label: "Sales Orders", href: "/admin/sales-orders", icon: FileText },
      ],
      children: [
        {
          id: "approvals",
          label: "Approvals",
          icon: CheckCircle2,
          items: [
            { label: "Pending", href: "/admin/approvals", icon: ListChecks, badge: "pendingApprovals" },
            { label: "History", href: "/admin/approval-history", icon: History },
            { label: "Rules", href: "/admin/approvals/rules", icon: Settings },
          ],
        },
      ],
    },

    // ─── Campaigns & Operations ──────────────────────────────
    {
      id: "campaigns-operations",
      label: "Campaigns & Ops",
      icon: Megaphone,
      requiresModule: "operations",
      items: [
        { label: "Campaigns", href: "/admin/campaigns", icon: Megaphone },
        { label: "Operations", href: "/admin/operations", icon: Wrench },
        { label: "Creatives", href: "/admin/operations/creatives", icon: Image },
        { label: "Printing", href: "/admin/operations/printing", icon: Printer },
        { label: "Proof Uploads", href: "/admin/operations/proof-uploads", icon: Camera, badge: "proofUploads" },
        { label: "Proof Execution", href: "/admin/reports/proof-execution", icon: FileCheck },
        { label: "Field App", href: "/mobile", icon: Smartphone },
      ],
    },

    // ─── Finance ─────────────────────────────────────────────
    {
      id: "finance",
      label: "Finance",
      icon: DollarSign,
      requiresModule: "finance",
      items: [
        { label: "Proforma Invoices", href: "/admin/proformas", icon: FileText },
        { label: "Invoices", href: "/admin/invoices", icon: Receipt },
        { label: "Payments", href: "/admin/payments", icon: CreditCard },
        { label: "Expenses", href: "/admin/expenses", icon: DollarSign },
        { label: "Power Bills", href: "/admin/power-bills", icon: Zap },
        { label: "Purchase Orders", href: "/admin/purchase-orders", icon: Package },
      ],
      children: [
        {
          id: "receivables",
          label: "Receivables",
          icon: Wallet,
          items: [
            { label: "Outstanding", href: "/admin/reports/outstanding", icon: Wallet, badge: "outstanding" },
            { label: "Aging Report", href: "/admin/reports/aging", icon: Clock },
          ],
        },
        {
          id: "payables",
          label: "Payables",
          icon: BookOpen,
          items: [
            { label: "Generate Payables", href: "/admin/finance/generate-payables", icon: Zap },
            { label: "Vendor Ledger", href: "/admin/reports/vendor-ledger", icon: FileText },
            { label: "Printer Ledger", href: "/admin/reports/printer-ledger", icon: Printer },
            { label: "Ops Payables", href: "/admin/reports/ops-payables", icon: Wallet },
          ],
        },
        {
          id: "period-close",
          label: "Period Close",
          icon: CalendarDays,
          items: [
            { label: "Month Close", href: "/admin/finance/month-close", icon: CalendarDays },
            { label: "Concessions", href: "/admin/finance/concession-allocation", icon: Layers },
            { label: "GST Reports", href: "/admin/finance/gst-reports", icon: FileText },
          ],
        },
      ],
    },

    // ─── Reports ─────────────────────────────────────────────
    {
      id: "reports",
      label: "Reports",
      icon: BarChart3,
      requiresModule: "reports",
      children: [
        {
          id: "booking-reports",
          label: "Bookings",
          icon: Users,
          items: [
            { label: "Client Bookings", href: "/admin/reports/client-bookings", icon: Users },
            { label: "Campaign Bookings", href: "/admin/reports/campaigns", icon: Megaphone },
            { label: "Booked Media", href: "/admin/reports/booked-media", icon: Map },
            { label: "Monthly Campaigns", href: "/admin/reports/monthly-campaigns", icon: CalendarDays },
          ],
        },
        {
          id: "revenue-profitability",
          label: "Revenue & Profitability",
          icon: TrendingUp,
          items: [
            { label: "Revenue Center", href: "/admin/reports/revenue", icon: TrendingUp },
            { label: "OOH Revenue", href: "/admin/reports/ooh-revenue", icon: DollarSign },
            { label: "Asset Profitability", href: "/admin/reports/profitability", icon: BarChart3 },
            { label: "Campaign Profitability", href: "/admin/reports/campaign-profitability", icon: Megaphone },
            { label: "OOH KPIs", href: "/admin/reports/ooh-kpis", icon: TrendingUp },
          ],
        },
        {
          id: "financial-reports",
          label: "Financial",
          icon: DollarSign,
          items: [
            { label: "Summary", href: "/admin/reports/financial", icon: DollarSign },
            { label: "Cash Flow Forecast", href: "/admin/reports/cashflow-forecast", icon: Wallet },
            { label: "Expense Allocation", href: "/admin/reports/expense-allocation", icon: DollarSign },
            { label: "Concession Risk", href: "/admin/reports/concession-risk", icon: Layers },
            { label: "Aging by Client", href: "/admin/reports/aging-by-client", icon: Clock },
            { label: "TDS Dashboard", href: "/admin/reports/tds", icon: Receipt },
          ],
        },
        {
          id: "operations-reports",
          label: "Operations",
          icon: Wrench,
          items: [
            { label: "Ops Billables", href: "/admin/reports/ops-billables", icon: Wallet },
            { label: "Ops Margin", href: "/admin/reports/ops-margin", icon: TrendingUp },
          ],
        },
      ],
    },

    // ─── Tools ───────────────────────────────────────────────
    {
      id: "tools",
      label: "Tools",
      icon: Sparkles,
      items: [
        { label: "AI Assistant", href: "/admin/ai-assistant", icon: Sparkles },
        { label: "Marketplace", href: "/marketplace", icon: Globe },
        { label: "Email Monitoring", href: "/admin/reports/email-monitoring", icon: Mail },
      ],
    },

    // ─── Admin & Settings ────────────────────────────────────
    {
      id: "admin-settings",
      label: "Admin & Settings",
      icon: Settings,
      requiresAdmin: true,
      items: [
        { label: "Company Settings", href: "/admin/company-settings", icon: Building2 },
        { label: "User Management", href: "/admin/company-settings/users", icon: Users },
        { label: "Roles & Permissions", href: "/admin/company-settings/roles", icon: Shield },
        { label: "Import / Export", href: "/admin/data-export-import", icon: Database },
        { label: "Integrations", href: "/admin/company-settings/integrations", icon: Globe },
        { label: "API & Webhooks", href: "/admin/company-settings/developer", icon: Settings },
        { label: "Subscription", href: "/admin/subscription", icon: CreditCard },
      ],
    },
  ],

  // Account items (pinned to footer — rendered separately, NOT as a nav section)
  accountItems: [
    { label: "My Profile", href: "/settings/profile", icon: User },
    { label: "Logout", href: "#logout", icon: LogOut },
  ],
};

/**
 * Find which section contains the current route
 * Used for auto-expanding accordion sections
 */
export function findActiveSections(pathname: string): string[] {
  const activeSections: string[] = [];

  const checkSection = (section: NavSection, parentIds: string[] = []): boolean => {
    let hasActiveItem = false;

    // Check direct items
    if (section.items?.some((item) => pathname === item.href || pathname.startsWith(item.href + "/"))) {
      hasActiveItem = true;
    }

    // Check nested children
    if (section.children) {
      for (const child of section.children) {
        if (checkSection(child, [...parentIds, section.id])) {
          hasActiveItem = true;
        }
      }
    }

    if (hasActiveItem) {
      activeSections.push(section.id);
      parentIds.forEach((id) => {
        if (!activeSections.includes(id)) activeSections.push(id);
      });
    }

    return hasActiveItem;
  };

  NAV_CONFIG.sections.forEach((section) => checkSection(section));

  return activeSections;
}
