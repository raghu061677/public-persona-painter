import { Building2, Users, Shield, CreditCard, BarChart3, Settings, Code } from "lucide-react";
import { SidebarSection } from "@/components/sidebar/SidebarSection";
import { SidebarItem } from "@/components/sidebar/SidebarItem";

interface PlatformAdminSidebarProps {
  collapsed: boolean;
}

export function PlatformAdminSidebar({ collapsed }: PlatformAdminSidebarProps) {
  return (
    <div className="flex flex-col gap-2 p-2">
      <SidebarSection label="Platform" collapsed={collapsed}>
        <SidebarItem 
          icon={BarChart3} 
          label="Dashboard" 
          href="/admin/dashboard" 
          collapsed={collapsed}
        />
      </SidebarSection>

      <SidebarSection label="Company Management" collapsed={collapsed}>
        <SidebarItem 
          icon={Building2} 
          label="All Companies" 
          href="/admin/companies" 
          collapsed={collapsed}
        />
        <SidebarItem 
          icon={Building2} 
          label="Approvals" 
          href="/admin/approve-companies" 
          collapsed={collapsed}
        />
      </SidebarSection>

      <SidebarSection label="User Management" collapsed={collapsed}>
        <SidebarItem 
          icon={Users} 
          label="Platform Users" 
          href="/admin/platform/users" 
          collapsed={collapsed}
        />
        <SidebarItem 
          icon={Users} 
          label="Company Users" 
          href="/admin/company-management" 
          collapsed={collapsed}
        />
      </SidebarSection>

      <SidebarSection label="System" collapsed={collapsed}>
        <SidebarItem 
          icon={Shield} 
          label="Roles & Permissions" 
          href="/admin/platform-roles" 
          collapsed={collapsed}
        />
        <SidebarItem 
          icon={CreditCard} 
          label="Subscriptions" 
          href="/admin/subscriptions" 
          collapsed={collapsed}
        />
        <SidebarItem 
          icon={Code} 
          label="Code Management" 
          href="/admin/code-management" 
          collapsed={collapsed}
        />
        <SidebarItem 
          icon={BarChart3} 
          label="Platform Reports" 
          href="/admin/platform-reports" 
          collapsed={collapsed}
        />
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