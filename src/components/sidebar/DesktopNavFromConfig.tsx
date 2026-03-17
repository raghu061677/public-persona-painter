import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { NAV_CONFIG, NavSection, NavItem } from "@/config/navigation";
import { SidebarSection } from "@/components/sidebar/SidebarSection";
import { SidebarGroup } from "@/components/sidebar/SidebarGroup";
import { SidebarItem } from "@/components/sidebar/SidebarItem";
import { useRBAC } from "@/hooks/useRBAC";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";

interface DesktopNavFromConfigProps {
  collapsed: boolean;
  badges?: Record<string, number>;
  onLogout?: () => void;
}

/**
 * Desktop sidebar navigation rendered from NAV_CONFIG.
 * Logout is rendered in the SidebarFooter of ResponsiveSidebar.
 */
export function DesktopNavFromConfig({ 
  collapsed, 
  badges = {}, 
}: DesktopNavFromConfigProps) {
  const location = useLocation();
  const rbac = useRBAC();
  const { companyUser, isPlatformAdmin } = useCompany();
  const { isAdmin } = useAuth();

  const isCompanyAdmin = companyUser?.role === 'admin' || isAdmin || isPlatformAdmin;

  const isGroupActive = (items: NavItem[]): boolean => {
    return items.some(item => 
      location.pathname === item.href || 
      location.pathname.startsWith(item.href + "/")
    );
  };

  const isSectionActive = (section: NavSection): boolean => {
    if (section.items && isGroupActive(section.items)) return true;
    if (section.children) {
      return section.children.some(child => {
        if (child.items && isGroupActive(child.items)) return true;
        if (child.children) {
          return child.children.some(grandchild => 
            grandchild.items && isGroupActive(grandchild.items)
          );
        }
        return false;
      });
    }
    return false;
  };

  const shouldShowSection = (section: NavSection): boolean => {
    if (section.requiresAdmin && !isCompanyAdmin) return false;
    if (section.requiresModule && !rbac.canViewModule(section.requiresModule)) return false;
    return true;
  };

  const renderNavItem = (item: NavItem) => {
    const badge = item.badge ? badges[item.badge] : undefined;
    return (
      <SidebarItem
        key={item.href}
        icon={item.icon!}
        label={item.label}
        href={item.href}
        collapsed={collapsed}
        badge={badge}
      />
    );
  };

  const renderChildren = (children: NavSection[]) => {
    return children.map(child => {
      if (!shouldShowSection(child)) return null;
      
      if (child.children && child.children.length > 0) {
        return (
          <SidebarGroup
            key={child.id}
            icon={child.icon}
            label={child.label}
            collapsed={collapsed}
            defaultOpen={isSectionActive(child)}
          >
            {child.items?.map(renderNavItem)}
            {renderChildren(child.children)}
          </SidebarGroup>
        );
      }
      
      if (child.items && child.items.length > 0) {
        return (
          <SidebarGroup
            key={child.id}
            icon={child.icon}
            label={child.label}
            collapsed={collapsed}
            defaultOpen={child.items ? isGroupActive(child.items) : false}
          >
            {child.items.map(renderNavItem)}
          </SidebarGroup>
        );
      }
      
      return null;
    });
  };

  const renderSection = (section: NavSection) => {
    if (!shouldShowSection(section)) return null;

    const hasDirectItems = section.items && section.items.length > 0;
    const hasChildren = section.children && section.children.length > 0;

    if (hasDirectItems && !hasChildren) {
      return (
        <SidebarSection key={section.id} label={section.label} collapsed={collapsed}>
          {section.items!.map(renderNavItem)}
        </SidebarSection>
      );
    }

    if (hasDirectItems && hasChildren) {
      return (
        <SidebarSection key={section.id} label={section.label} collapsed={collapsed}>
          {section.items!.map(renderNavItem)}
          {renderChildren(section.children!)}
        </SidebarSection>
      );
    }

    if (!hasDirectItems && hasChildren) {
      return (
        <SidebarSection key={section.id} label={section.label} collapsed={collapsed}>
          {renderChildren(section.children!)}
        </SidebarSection>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col">
      {NAV_CONFIG.sections.map(renderSection)}
    </div>
  );
}
