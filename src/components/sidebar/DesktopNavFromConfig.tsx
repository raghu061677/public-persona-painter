 import { useLocation } from "react-router-dom";
 import { LogOut } from "lucide-react";
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
  * Desktop sidebar navigation rendered from NAV_CONFIG
  * Mirrors the same structure as MobileAccordionNav for consistency
  */
 export function DesktopNavFromConfig({ 
   collapsed, 
   badges = {}, 
   onLogout 
 }: DesktopNavFromConfigProps) {
   const location = useLocation();
   const rbac = useRBAC();
   const { companyUser, isPlatformAdmin } = useCompany();
   const { isAdmin } = useAuth();
 
   const isCompanyAdmin = companyUser?.role === 'admin' || isAdmin || isPlatformAdmin;
 
   // Check if any item in the group is active (for auto-expanding groups)
   const isGroupActive = (items: NavItem[]): boolean => {
     return items.some(item => 
       location.pathname === item.href || 
       location.pathname.startsWith(item.href + "/")
     );
   };
 
   // Check if a section or its children contain the active route
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
 
   // Filter sections based on RBAC and admin requirements
   const shouldShowSection = (section: NavSection): boolean => {
     if (section.requiresAdmin && !isCompanyAdmin) return false;
     if (section.requiresModule && !rbac.canViewModule(section.requiresModule)) return false;
     return true;
   };
 
   // Render a single nav item
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
 
   // Render nested children (sub-groups within a section)
   const renderChildren = (children: NavSection[]) => {
     return children.map(child => {
       if (!shouldShowSection(child)) return null;
       
       const childActive = child.items ? isGroupActive(child.items) : false;
       
       // If child has its own children (deeply nested like Settings > Organization)
       if (child.children && child.children.length > 0) {
         return (
           <SidebarGroup
             key={child.id}
             icon={child.icon}
             label={child.label}
             collapsed={collapsed}
             defaultOpen={isSectionActive(child)}
           >
             {renderChildren(child.children)}
           </SidebarGroup>
         );
       }
       
       // Child with direct items
       if (child.items && child.items.length > 0) {
         return (
           <SidebarGroup
             key={child.id}
             icon={child.icon}
             label={child.label}
             collapsed={collapsed}
             defaultOpen={childActive}
           >
             {child.items.map(renderNavItem)}
           </SidebarGroup>
         );
       }
       
       return null;
     });
   };
 
   // Render a top-level section
   const renderSection = (section: NavSection) => {
     if (!shouldShowSection(section)) return null;
 
     const hasDirectItems = section.items && section.items.length > 0;
     const hasChildren = section.children && section.children.length > 0;
 
     // Section with only direct items (no nested groups)
     if (hasDirectItems && !hasChildren) {
       return (
         <SidebarSection key={section.id} label={section.label} collapsed={collapsed}>
           {section.items!.map(renderNavItem)}
         </SidebarSection>
       );
     }
 
     // Section with both direct items and children
     if (hasDirectItems && hasChildren) {
       return (
         <SidebarSection key={section.id} label={section.label} collapsed={collapsed}>
           {section.items!.map(renderNavItem)}
           {renderChildren(section.children!)}
         </SidebarSection>
       );
     }
 
     // Section with only children (nested groups)
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
     <div className="flex flex-col gap-1">
       {/* Main Navigation Sections */}
       {NAV_CONFIG.sections.map(renderSection)}
 
       {/* Account Section (pinned bottom) */}
       <SidebarSection label="My Account" collapsed={collapsed}>
         {NAV_CONFIG.accountItems.map(item => {
           // Handle logout specially
           if (item.href === "#logout") {
             return (
               <button
                 key="logout"
                 onClick={onLogout}
                 className={cn(
                   "flex items-center rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-all duration-200",
                   collapsed ? "justify-center w-full p-2.5 mx-1" : "gap-3 w-full px-4 py-2.5 mx-2"
                 )}
                 title={collapsed ? item.label : undefined}
               >
                 <LogOut className="h-5 w-5 shrink-0" />
                 {!collapsed && <span className="truncate">{item.label}</span>}
               </button>
             );
           }
           return renderNavItem(item);
         })}
       </SidebarSection>
     </div>
   );
 }