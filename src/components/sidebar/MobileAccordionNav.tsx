 import { useState, useEffect, useCallback } from "react";
 import { Link, useLocation } from "react-router-dom";
 import { ChevronDown } from "lucide-react";
 import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";
 import {
   Accordion,
   AccordionContent,
   AccordionItem,
   AccordionTrigger,
 } from "@/components/ui/accordion";
 import { NAV_CONFIG, findActiveSections, type NavSection, type NavItem } from "@/config/navigation";
 import { useRBAC } from "@/hooks/useRBAC";
 import { useCompany } from "@/contexts/CompanyContext";
 import { useAuth } from "@/contexts/AuthContext";
 
 interface MobileAccordionNavProps {
   badges?: Record<string, number>;
   onLogout?: () => void;
 }
 
 const ACCORDION_STATE_KEY = "go-ads-mobile-nav-state";
 
 export function MobileAccordionNav({ badges = {}, onLogout }: MobileAccordionNavProps) {
   const location = useLocation();
  const { setOpenMobile, openMobile } = useSidebar();
   const rbac = useRBAC();
   const { companyUser, isPlatformAdmin } = useCompany();
   const { isAdmin } = useAuth();
 
   const isCompanyAdmin = companyUser?.role === "admin" || isAdmin || isPlatformAdmin;
 
   // Initialize accordion state from localStorage or active route
   const [openSections, setOpenSections] = useState<string[]>(() => {
     try {
       const saved = localStorage.getItem(ACCORDION_STATE_KEY);
       if (saved) return JSON.parse(saved);
     } catch {}
     return findActiveSections(location.pathname);
   });
 
  // Close drawer on ANY route change (back/forward/programmatic)
   useEffect(() => {
    // Close the mobile drawer whenever the route changes
    setOpenMobile(false);
   }, [location.pathname]);
 
  // Update accordion state when route changes - active route wins (no accumulation)
  useEffect(() => {
    const activeSections = findActiveSections(location.pathname);
    if (activeSections.length > 0) {
      // Active route wins - replace, don't merge
      setOpenSections(activeSections);
    }
    // If no active sections found, keep current state (persisted)
  }, [location.pathname]);

   // Persist accordion state
   useEffect(() => {
     try {
       localStorage.setItem(ACCORDION_STATE_KEY, JSON.stringify(openSections));
     } catch {}
   }, [openSections]);
 
   const handleLogout = useCallback(() => {
     setOpenMobile(false);
     onLogout?.();
   }, [setOpenMobile, onLogout]);
 
   // Check if section should be visible based on permissions
   const shouldShowSection = (section: NavSection): boolean => {
     if (section.requiresAdmin && !isCompanyAdmin) return false;
     if (section.requiresModule && !rbac.canViewModule(section.requiresModule)) return false;
     return true;
   };
 
   // Check if item is active
   const isActiveItem = (href: string) =>
     location.pathname === href || location.pathname.startsWith(href + "/");
 
   // Render a single nav item
   const renderNavItem = (item: NavItem, nested = false) => {
     const Icon = item.icon;
     const badge = item.badge ? badges[item.badge] : undefined;
     const active = isActiveItem(item.href);
 
     return (
       <Link
         key={item.href}
         to={item.href}
         className={cn(
           "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
           "min-h-[44px] touch-manipulation select-none pointer-events-auto",
           "hover:bg-accent hover:text-accent-foreground",
           "active:scale-[0.98]",
           nested && "ml-4",
           active && "bg-primary/10 text-primary border-l-2 border-primary font-semibold"
         )}
       >
         {Icon && <Icon className="h-4 w-4 shrink-0" />}
         <span className="flex-1 truncate">{item.label}</span>
         {badge !== undefined && badge > 0 && (
           <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
             {badge > 99 ? "99+" : badge}
           </span>
         )}
       </Link>
     );
   };
 
   // Render nested accordion (for Approvals, Settings sub-groups)
   const renderNestedSection = (section: NavSection, level = 1) => {
     if (!shouldShowSection(section)) return null;
 
     const Icon = section.icon;
     const hasItems = section.items && section.items.length > 0;
     const hasChildren = section.children && section.children.length > 0;
 
     if (!hasItems && !hasChildren) return null;
 
     return (
       <AccordionItem key={section.id} value={section.id} className="border-none">
         <AccordionTrigger
           className={cn(
             "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
             "min-h-[44px] touch-manipulation hover:bg-accent hover:no-underline",
             "data-[state=open]:bg-muted/50",
             level > 0 && "ml-4"
           )}
         >
           <Icon className="h-4 w-4 shrink-0" />
           <span className="flex-1 text-left">{section.label}</span>
         </AccordionTrigger>
         <AccordionContent className="pb-0 pt-1">
           <div className="space-y-0.5">
             {section.items?.map((item) => renderNavItem(item, true))}
             {section.children?.map((child) => (
               <Accordion
                 key={child.id}
                 type="multiple"
                 value={openSections}
                 onValueChange={setOpenSections}
                 className="ml-2"
               >
                 {renderNestedSection(child, level + 1)}
               </Accordion>
             ))}
           </div>
         </AccordionContent>
       </AccordionItem>
     );
   };
 
   // Render a top-level section
   const renderSection = (section: NavSection) => {
     if (!shouldShowSection(section)) return null;
 
     const Icon = section.icon;
     const hasItems = section.items && section.items.length > 0;
     const hasChildren = section.children && section.children.length > 0;
 
     // If section has only one item and no children, render as direct link
     if (hasItems && section.items!.length === 1 && !hasChildren) {
       return (
         <div key={section.id} className="px-2">
           {renderNavItem(section.items![0])}
         </div>
       );
     }
 
     return (
       <AccordionItem key={section.id} value={section.id} className="border-none px-2">
         <AccordionTrigger
           className={cn(
             "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold",
             "min-h-[44px] touch-manipulation hover:bg-accent hover:no-underline",
             "text-muted-foreground data-[state=open]:text-foreground",
             "data-[state=open]:bg-muted/50"
           )}
         >
           <Icon className="h-4 w-4 shrink-0" />
           <span className="flex-1 text-left">{section.label}</span>
         </AccordionTrigger>
         <AccordionContent className="pb-2 pt-1">
           <div className="space-y-0.5">
             {section.items?.map((item) => renderNavItem(item, true))}
             {section.children && (
               <Accordion
                 type="multiple"
                 value={openSections}
                 onValueChange={setOpenSections}
               >
                 {section.children.map((child) => renderNestedSection(child))}
               </Accordion>
             )}
           </div>
         </AccordionContent>
       </AccordionItem>
     );
   };
 
   return (
     <div className="flex flex-col h-full overflow-hidden">
       {/* Scrollable content */}
       <div className="flex-1 overflow-y-auto overscroll-contain py-2">
         <Accordion
           type="multiple"
           value={openSections}
           onValueChange={setOpenSections}
           className="space-y-1"
         >
           {NAV_CONFIG.sections.map(renderSection)}
         </Accordion>
       </div>
 
       {/* Account section - pinned to bottom */}
       <div className="border-t border-border/50 pt-2 pb-4 px-2 mt-auto space-y-0.5">
         {NAV_CONFIG.accountItems.map((item) => {
           if (item.href === "#logout") {
             const Icon = item.icon;
             return (
               <button
                 key="logout"
                 type="button"
                 onPointerUp={(e) => {
                   e.preventDefault();
                   e.stopPropagation();
                   handleLogout();
                 }}
                 className={cn(
                   "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full",
                   "min-h-[44px] touch-manipulation select-none pointer-events-auto",
                   "hover:bg-destructive/10 hover:text-destructive",
                   "active:scale-[0.98] text-left"
                 )}
               >
                 {Icon && <Icon className="h-4 w-4 shrink-0" />}
                 <span>{item.label}</span>
               </button>
             );
           }
           return renderNavItem(item);
         })}
       </div>
     </div>
   );
 }