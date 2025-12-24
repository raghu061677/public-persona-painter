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
  Sparkles
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
      {/* Always show dashboard */}
      <SidebarSection label="Overview" collapsed={collapsed}>
        <SidebarItem 
          icon={LayoutDashboard} 
          label="Dashboard" 
          href="/admin/dashboard" 
          collapsed={collapsed}
        />
      </SidebarSection>

      {/* Core Modules */}
      <SidebarSection label="Business" collapsed={collapsed}>
        {hasModule('media_assets') && (
          <SidebarItem 
            icon={Image} 
            label="Media Assets" 
            href="/admin/media-assets" 
            collapsed={collapsed}
          />
        )}
        {hasModule('clients') && (
          <SidebarItem 
            icon={Users} 
            label="Clients" 
            href="/admin/clients" 
            collapsed={collapsed}
          />
        )}
        {hasModule('plans') && (
          <SidebarItem 
            icon={FileText} 
            label="Plans" 
            href="/admin/plans" 
            collapsed={collapsed}
          />
        )}
        {hasModule('campaigns') && (
          <SidebarItem 
            icon={Megaphone} 
            label="Campaigns" 
            href="/admin/campaigns" 
            collapsed={collapsed}
          />
        )}
      </SidebarSection>

      {/* Operations */}
      {hasModule('operations') && (
        <SidebarSection label="Operations" collapsed={collapsed}>
          <SidebarItem 
            icon={Wrench} 
            label="Operations" 
            href="/admin/operations" 
            collapsed={collapsed}
          />
        </SidebarSection>
      )}

      {/* Finance */}
      {hasModule('finance') && (
        <SidebarSection label="Finance" collapsed={collapsed}>
          <SidebarItem 
            icon={DollarSign} 
            label="Estimations" 
            href="/admin/estimations" 
            collapsed={collapsed}
          />
          <SidebarItem 
            icon={DollarSign} 
            label="Invoices" 
            href="/finance/invoices" 
            collapsed={collapsed}
          />
          <SidebarItem 
            icon={DollarSign} 
            label="Import Invoices" 
            href="/admin/invoices-import" 
            collapsed={collapsed}
          />
          <SidebarItem 
            icon={DollarSign} 
            label="Expenses" 
            href="/admin/expenses" 
            collapsed={collapsed}
          />
        </SidebarSection>
      )}

      {/* Reports */}
      {hasModule('reports') && (
        <SidebarSection label="Reports" collapsed={collapsed}>
          <SidebarItem 
            icon={BarChart3} 
            label="Reports" 
            href="/admin/reports-dashboard" 
            collapsed={collapsed}
          />
        </SidebarSection>
      )}

      {/* AI Tools */}
      <SidebarSection label="AI Tools" collapsed={collapsed}>
        <SidebarItem 
          icon={Sparkles} 
          label="AI Assistant" 
          href="/admin/assistant" 
          collapsed={collapsed}
        />
      </SidebarSection>

      {/* Settings */}
      <SidebarSection label="Configuration" collapsed={collapsed}>
        <SidebarItem 
          icon={Settings} 
          label="Settings" 
          href="/admin/settings" 
          collapsed={collapsed}
        />
      </SidebarSection>
    </div>
  );
}