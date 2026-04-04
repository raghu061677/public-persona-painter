import { 
  LayoutDashboard, 
  Image, 
  Users, 
  FileText, 
  Megaphone, 
  Wrench, 
  DollarSign, 
  BarChart3, 
  Settings,
  Sparkles,
  Receipt,
  ShoppingCart,
  BookOpen,
  Printer,
  CalendarCheck,
  CreditCard,
  TrendingUp,
  Wallet,
  Zap,
  Phone
} from "lucide-react";
import { SidebarSection } from "@/components/sidebar/SidebarSection";
import { SidebarItem } from "@/components/sidebar/SidebarItem";

interface CompanyWorkspaceSidebarProps {
  collapsed: boolean;
  activeModules: string[];
}

export function CompanyWorkspaceSidebar({ collapsed, activeModules }: CompanyWorkspaceSidebarProps) {
  const hasModule = (moduleName: string) => {
    return activeModules.includes(moduleName);
  };

  return (
    <div className="flex flex-col gap-2 p-2">
      {/* Overview */}
      <SidebarSection label="Overview" collapsed={collapsed}>
        <SidebarItem icon={LayoutDashboard} label="Dashboard" href="/admin/dashboard" collapsed={collapsed} />
      </SidebarSection>

      {/* Media Assets */}
      {hasModule('media_assets') && (
        <SidebarSection label="Inventory" collapsed={collapsed}>
          <SidebarItem icon={Image} label="Media Assets" href="/admin/media-assets" collapsed={collapsed} />
        </SidebarSection>
      )}

      {/* Sales */}
      <SidebarSection label="Sales" collapsed={collapsed}>
        {hasModule('clients') && (
          <SidebarItem icon={Users} label="Clients" href="/admin/clients" collapsed={collapsed} />
        )}
        {hasModule('plans') && (
          <SidebarItem icon={FileText} label="Plans" href="/admin/plans" collapsed={collapsed} />
        )}
        {hasModule('finance') && (
          <>
            <SidebarItem icon={Receipt} label="Estimations" href="/admin/estimations" collapsed={collapsed} />
            <SidebarItem icon={ShoppingCart} label="Sales Orders" href="/admin/sales-orders" collapsed={collapsed} />
            <SidebarItem icon={FileText} label="Proformas" href="/admin/proformas" collapsed={collapsed} />
          </>
        )}
      </SidebarSection>

      {/* Campaigns */}
      {hasModule('campaigns') && (
        <SidebarSection label="Campaigns" collapsed={collapsed}>
          <SidebarItem icon={Megaphone} label="Campaign List" href="/admin/campaigns" collapsed={collapsed} />
          <SidebarItem icon={TrendingUp} label="Profitability" href="/admin/reports/campaign-profitability" collapsed={collapsed} />
          <SidebarItem icon={BarChart3} label="Ops Margin" href="/admin/reports/ops-margin" collapsed={collapsed} />
        </SidebarSection>
      )}

      {/* Operations */}
      {hasModule('operations') && (
        <SidebarSection label="Operations" collapsed={collapsed}>
          <SidebarItem icon={Wrench} label="Operations" href="/admin/operations" collapsed={collapsed} />
        </SidebarSection>
      )}

      {/* Finance / Invoicing */}
      {hasModule('finance') && (
        <SidebarSection label="Finance" collapsed={collapsed}>
          <SidebarItem icon={DollarSign} label="Invoices" href="/finance/invoices" collapsed={collapsed} />
          <SidebarItem icon={Wallet} label="Expenses" href="/admin/expenses" collapsed={collapsed} />
          <SidebarItem icon={CreditCard} label="Payments" href="/admin/payments" collapsed={collapsed} />
          <SidebarItem icon={CalendarCheck} label="Month Close" href="/admin/finance/month-close" collapsed={collapsed} />
          <SidebarItem icon={Phone} label="Collections" href="/admin/finance/collections" collapsed={collapsed} />
        </SidebarSection>
      )}

      {/* Payables */}
      {hasModule('finance') && (
        <SidebarSection label="Payables" collapsed={collapsed}>
          <SidebarItem icon={Zap} label="Generate Payables" href="/admin/finance/generate-payables" collapsed={collapsed} />
          <SidebarItem icon={BookOpen} label="Vendor Ledger" href="/admin/reports/vendor-ledger" collapsed={collapsed} />
          <SidebarItem icon={Printer} label="Printer Ledger" href="/admin/reports/printer-ledger" collapsed={collapsed} />
          <SidebarItem icon={ShoppingCart} label="Ops Payables" href="/admin/reports/ops-payables" collapsed={collapsed} />
          <SidebarItem icon={ShoppingCart} label="Purchase Orders" href="/admin/purchase-orders" collapsed={collapsed} />
        </SidebarSection>
      )}

      {/* Reports */}
      {hasModule('reports') && (
        <SidebarSection label="Reports" collapsed={collapsed}>
          <SidebarItem icon={BarChart3} label="Reports Hub" href="/admin/reports-dashboard" collapsed={collapsed} />
          <SidebarItem icon={DollarSign} label="Revenue" href="/admin/reports/revenue" collapsed={collapsed} />
          <SidebarItem icon={Receipt} label="Aging" href="/admin/reports/aging" collapsed={collapsed} />
          <SidebarItem icon={BarChart3} label="Financial" href="/admin/reports/financial" collapsed={collapsed} />
        </SidebarSection>
      )}

      {/* AI Tools */}
      <SidebarSection label="AI Tools" collapsed={collapsed}>
        <SidebarItem icon={Sparkles} label="AI Assistant" href="/admin/assistant" collapsed={collapsed} />
      </SidebarSection>

      {/* Settings */}
      <SidebarSection label="Configuration" collapsed={collapsed}>
        <SidebarItem icon={Settings} label="Settings" href="/admin/settings" collapsed={collapsed} />
      </SidebarSection>
    </div>
  );
}