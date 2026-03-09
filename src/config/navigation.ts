import type { ModuleName } from "@/hooks/useRBAC";
import {
  Database,
  Upload,
  Download,
  HardDrive,
  Activity,
  Lock,
  Mail,
  MessageSquare,
  UsersRound,
  ListChecks as ListChecksIcon,
  ClipboardList,
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
  Palette,
  Shield,
  UserCog,
  LogOut,
  User,
  Bell,
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
  * Complete navigation configuration for Go-Ads 360
  * This is the single source of truth for all sidebar navigation
  */
  export const NAV_CONFIG: NavConfig = {
    sections: [
      // Dashboard
      {
        id: "workspace",
        label: "Dashboard",
        icon: LayoutDashboard,
        items: [
          { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
        ],
      },

      // Media Inventory
      {
        id: "media-inventory",
        label: "Media Inventory",
        icon: Map,
        items: [
          { label: "Media Assets", href: "/admin/media-assets", icon: Map },
          { label: "Media Availability", href: "/admin/reports/vacant-media", icon: Calendar },
          { label: "Asset Validation", href: "/admin/media-assets-validation", icon: FileCheck },
        ],
      },

      // Sales & Campaigns
      {
        id: "sales-campaigns",
        label: "Sales & Campaigns",
        icon: Briefcase,
        items: [
          { label: "Leads", href: "/admin/leads", icon: UserPlus },
          { label: "Clients", href: "/admin/clients", icon: Users },
          { label: "Plans", href: "/admin/plans", icon: Layers },
          { label: "Campaigns", href: "/admin/campaigns", icon: Briefcase },
        ],
        children: [
          {
            id: "approvals",
            label: "Approvals",
            icon: CheckCircle2,
            items: [
              { label: "Pending Approvals", href: "/admin/approvals", icon: ListChecks, badge: "pendingApprovals" },
              { label: "Approval History", href: "/admin/approval-history", icon: History },
              { label: "Approval Rules", href: "/admin/approvals/rules", icon: Settings },
            ],
          },
        ],
      },

      // Operations
      {
        id: "operations",
        label: "Operations",
        icon: TrendingUp,
        requiresModule: "operations",
        items: [
          { label: "Operations", href: "/admin/operations", icon: TrendingUp },
          { label: "Creative Received", href: "/admin/operations/creatives", icon: Image },
          { label: "Printing Status", href: "/admin/operations/printing", icon: FileCheck },
          { label: "Proof Uploads", href: "/admin/operations/proof-uploads", icon: Image, badge: "proofUploads" },
          { label: "Proof Execution", href: "/admin/reports/proof-execution", icon: FileCheck },
        ],
      },

      // Finance
      {
        id: "finance",
        label: "Finance",
        icon: DollarSign,
        requiresModule: "finance",
        items: [
          { label: "Quotations", href: "/admin/estimations", icon: FileSpreadsheet },
          { label: "Sales Orders", href: "/admin/sales-orders", icon: FileText },
          { label: "Purchase Orders", href: "/admin/purchase-orders", icon: FileCheck },
          { label: "Proforma Invoice", href: "/admin/proformas", icon: FileText },
          { label: "Invoices", href: "/admin/invoices", icon: Receipt },
          { label: "Payments", href: "/admin/payments", icon: CreditCard },
          { label: "Expenses", href: "/admin/expenses", icon: DollarSign },
          { label: "Power Bills", href: "/admin/power-bills", icon: Zap },
          { label: "Month Close", href: "/admin/finance/month-close", icon: CalendarDays },
          { label: "Concession Allocation", href: "/admin/finance/concession-allocation", icon: Layers },
          { label: "Outstanding", href: "/admin/reports/outstanding", icon: Wallet, badge: "outstanding" },
          { label: "Aging Report", href: "/admin/reports/aging", icon: Clock },
        ],
        children: [
          {
            id: "payables",
            label: "Payables",
            icon: Wallet,
            items: [
              { label: "Generate Payables", href: "/admin/finance/generate-payables", icon: Zap },
              { label: "Vendor Ledger", href: "/admin/reports/vendor-ledger", icon: FileText },
              { label: "Printer Ledger", href: "/admin/reports/printer-ledger", icon: FileText },
              { label: "Ops Payables", href: "/admin/reports/ops-payables", icon: Wallet },
            ],
          },
        ],
      },

      // Reports
      {
        id: "reports",
        label: "Reports",
        icon: BarChart3,
        requiresModule: "reports",
        children: [
          {
            id: "booking-reports",
            label: "Booking Reports",
            icon: Users,
            items: [
              { label: "Client Bookings", href: "/admin/reports/client-bookings", icon: Users },
              { label: "Campaign Bookings", href: "/admin/reports/campaigns", icon: Briefcase },
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
              { label: "Campaign Profitability", href: "/admin/reports/campaign-profitability", icon: Briefcase },
              { label: "OOH KPIs", href: "/admin/reports/ooh-kpis", icon: TrendingUp },
            ],
          },
          {
            id: "financial-reports",
            label: "Financial Reports",
            icon: DollarSign,
            items: [
              { label: "Financial Summary", href: "/admin/reports/financial", icon: DollarSign },
              { label: "Cash Flow Forecast", href: "/admin/reports/cashflow-forecast", icon: Wallet },
              { label: "Expense Allocation", href: "/admin/reports/expense-allocation", icon: DollarSign },
              { label: "Concession Risk", href: "/admin/reports/concession-risk", icon: Layers },
              { label: "Aging by Client", href: "/admin/reports/aging-by-client", icon: Clock },
            ],
          },
          {
            id: "operations-reports",
            label: "Operations Reports",
            icon: TrendingUp,
            items: [
              { label: "Proof Execution", href: "/admin/reports/proof-execution", icon: FileCheck },
              { label: "Ops Billables", href: "/admin/reports/ops-billables", icon: Wallet },
              { label: "Ops Margin", href: "/admin/reports/ops-margin", icon: TrendingUp },
            ],
          },
        ],
        items: [
          { label: "Executive Dashboard", href: "/admin/reports/executive", icon: LayoutDashboard },
        ],
      },

      // Marketplace
      {
        id: "marketplace",
        label: "Marketplace",
        icon: Globe,
        items: [
          { label: "Browse Media", href: "/admin/marketplace", icon: Globe },
          { label: "My Listings", href: "/admin/marketplace/listings", icon: Layers },
          { label: "Booking Requests", href: "/admin/booking-requests", icon: ShoppingBag },
          { label: "Marketplace Requests", href: "/admin/marketplace/requests", icon: ShoppingBag },
          { label: "Transactions", href: "/admin/marketplace/transactions", icon: CreditCard },
        ],
      },

      // Tools & Intelligence
      {
        id: "tools",
        label: "Tools",
        icon: Sparkles,
        items: [
          { label: "AI Assistant", href: "/admin/ai-assistant", icon: Sparkles },
          { label: "Campaign Intelligence", href: "/admin/intelligence", icon: TrendingUp },
          { label: "Photo Library", href: "/admin/photo-library", icon: Image },
          { label: "Mobile Field App", href: "/mobile", icon: Smartphone },
        ],
      },

      // System / Settings
      {
        id: "settings",
        label: "System",
        icon: Settings,
        requiresAdmin: true,
        children: [
          {
            id: "organization",
            label: "Organization",
            icon: Building2,
            items: [
              { label: "Company Profile", href: "/admin/company-settings/profile", icon: Building2 },
              { label: "Branding & Logo", href: "/admin/company-settings/branding", icon: Palette },
              { label: "Email & Notifications", href: "/admin/company-settings/email-providers", icon: Mail },
              { label: "Reminders", href: "/admin/company-settings/reminders", icon: Bell },
              { label: "Alerts", href: "/admin/company-settings/alerts", icon: Bell },
            ],
          },
          {
            id: "users-access",
            label: "Users & Access",
            icon: UserCog,
            items: [
              { label: "User Management", href: "/admin/users", icon: Users },
              { label: "Activity & Audit Logs", href: "/admin/audit-logs", icon: Activity },
            ],
          },
          {
            id: "data-management",
            label: "Data Management",
            icon: Database,
            items: [
              { label: "Import / Export Data", href: "/admin/data-export-import", icon: Download },
            ],
          },
          {
            id: "automation-intelligence",
            label: "Automation & Intelligence",
            icon: Zap,
            items: [
              { label: "Automation Rules", href: "/admin/company-settings/automation", icon: Zap },
            ],
          },
          {
            id: "marketplace-integrations",
            label: "Marketplace & Integrations",
            icon: Globe,
            items: [
              { label: "Email Providers", href: "/admin/company-settings/email-providers", icon: Mail },
              { label: "Integrations", href: "/admin/company-settings/integrations", icon: Zap },
              { label: "API & Webhooks", href: "/admin/company-settings/developer", icon: Settings },
            ],
          },
        ],
      },
    ],
 
   // Account items (bottom pinned)
   accountItems: [
     { label: "Profile", href: "/settings/profile", icon: User },
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