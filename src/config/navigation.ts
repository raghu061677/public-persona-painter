 import type { ModuleName } from "@/hooks/useRBAC";
import {
  LayoutDashboard,
  Map,
  Calendar,
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
     // Workspace
     {
       id: "workspace",
       label: "Workspace",
       icon: LayoutDashboard,
       items: [
         { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
       ],
     },
 
     // Inventory
     {
       id: "inventory",
       label: "Inventory",
       icon: Map,
       items: [
         { label: "Media Assets", href: "/admin/media-assets", icon: Map },
         { label: "Media Availability", href: "/admin/reports/vacant-media", icon: Calendar },
         { label: "Asset Validation", href: "/admin/media-assets-validation", icon: FileCheck },
       ],
     },
 
     // Leads & Clients
     {
       id: "leads-clients",
       label: "Leads & Clients",
       icon: Users,
       items: [
         { label: "Leads", href: "/admin/leads", icon: UserPlus },
         { label: "Clients", href: "/admin/clients", icon: Users },
         { label: "Booking Requests", href: "/admin/booking-requests", icon: ShoppingBag },
       ],
     },
 
     // Plans & Approvals
     {
       id: "plans-approvals",
       label: "Plans & Approvals",
       icon: Layers,
       items: [
         { label: "Plans", href: "/admin/plans", icon: Layers },
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
 
     // Campaigns
     {
       id: "campaigns",
       label: "Campaigns",
       icon: Briefcase,
       items: [
         { label: "Campaigns", href: "/admin/campaigns", icon: Briefcase },
       ],
     },
 
     // Operations
     {
       id: "operations",
       label: "Operations",
       icon: TrendingUp,
       requiresModule: "operations",
       items: [
         { label: "Creative Received", href: "/admin/operations/creatives", icon: Image },
         { label: "Printing Status", href: "/admin/operations/printing", icon: FileCheck },
         { label: "Mounting Assignment", href: "/admin/operations", icon: TrendingUp },
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
         { label: "Outstanding", href: "/admin/reports/outstanding", icon: Wallet, badge: "outstanding" },
         { label: "Aging Report", href: "/admin/reports/aging", icon: Clock },
       ],
     },
 
     // Reports
     {
       id: "reports",
       label: "Reports",
       icon: BarChart3,
       requiresModule: "reports",
       items: [
         { label: "Client Bookings", href: "/admin/reports/clients", icon: Users },
         { label: "Campaign Bookings", href: "/admin/reports/campaigns", icon: Briefcase },
         { label: "Asset Revenue", href: "/admin/reports/revenue", icon: TrendingUp },
         { label: "Financial Summary", href: "/admin/reports/financial", icon: DollarSign },
       ],
     },
 
     // Tools
     {
       id: "tools",
       label: "Tools",
       icon: Sparkles,
       items: [
         { label: "AI Assistant", href: "/admin/ai-assistant", icon: Sparkles },
         { label: "Photo Library", href: "/admin/photo-library", icon: Image },
         { label: "Mobile Field App", href: "/mobile", icon: Smartphone },
         { label: "Marketplace", href: "/marketplace", icon: Globe },
       ],
     },
 
     // Settings
     {
       id: "settings",
       label: "Settings",
       icon: Settings,
       requiresAdmin: true,
       children: [
          {
            id: "organization",
            label: "Organization",
            icon: Building2,
            items: [
              { label: "Organization", href: "/admin/company-settings/profile", icon: Building2 },
              { label: "Branding", href: "/admin/company-settings/branding", icon: Palette },
              { label: "Subscription", href: "/admin/company-settings", icon: CreditCard },
              { label: "Email & WhatsApp Alerts", href: "/admin/company-settings/alerts", icon: Bell },
            ],
          },
         {
           id: "users-access",
           label: "Users & Access",
           icon: UserCog,
           items: [
             { label: "Users", href: "/admin/users", icon: Users },
             { label: "Roles", href: "/admin/company-settings/roles", icon: Shield },
           ],
         },
         {
           id: "data-management",
           label: "Data Management",
           icon: Settings,
           items: [
             { label: "Asset Validation", href: "/admin/media-assets-validation", icon: FileCheck },
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