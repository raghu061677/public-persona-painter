import { ChevronRight, Home } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";

interface BreadcrumbItem {
  label: string;
  path?: string;
}

export function BreadcrumbNav() {
  const location = useLocation();
  const { breadcrumbs: customBreadcrumbs } = useBreadcrumb();
  
  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [{ label: 'Home', path: '/dashboard' }];
    
    let currentPath = '';
    
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Map common segments to readable labels
      const labelMap: Record<string, string> = {
        'admin': 'Admin',
        'media-assets': 'Media Assets',
        'media-assets-map': 'Map View',
        'clients': 'Clients',
        'plans': 'Plans',
        'campaigns': 'Campaigns',
        'operations': 'Operations',
        'finance': 'Finance',
        'invoices': 'Invoices',
        'expenses': 'Expenses',
        'power-bills': 'Power Bills',
        'reports': 'Reports',
        'settings': 'Settings',
        'users': 'Users',
        'vendors': 'Vendors',
        'new': 'New',
        'edit': 'Edit',
        'analytics': 'Analytics',
        'dashboard': 'Dashboard',
        'assistant': 'AI Assistant',
        'marketplace': 'Marketplace',
        'proformas': 'Proformas',
        'estimations': 'Estimations',
        'tenant-analytics': 'Tenant Analytics',
        'photo-library': 'Photo Library',
        'vacant-media': 'Vacant Media',
        'comparison': 'Comparison',
        'import': 'Import',
        'export': 'Export',
        'audit-logs': 'Audit Logs',
        'code-management': 'Code Management',
        'organization-settings': 'Organization',
        'custom-dashboard': 'Custom Dashboard',
        'booking-requests': 'Booking Requests',
      };
      
      const label = labelMap[segment] || segment.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      // Don't link the last segment (current page)
      breadcrumbs.push({
        label,
        path: index === pathSegments.length - 1 ? undefined : currentPath
      });
    });
    
    return breadcrumbs;
  };
  
  // Use custom breadcrumbs if available, otherwise generate from URL
  const breadcrumbs = customBreadcrumbs 
    ? customBreadcrumbs.map((item, index, arr) => ({
        label: item.title,
        path: index === arr.length - 1 ? undefined : item.href
      }))
    : getBreadcrumbs();
  
  if (breadcrumbs.length <= 1) return null;
  
  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground mb-4">
      {breadcrumbs.map((breadcrumb, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && <ChevronRight className="h-4 w-4 mx-1" />}
          {breadcrumb.path ? (
            <Link
              to={breadcrumb.path}
              className="hover:text-foreground transition-colors flex items-center"
            >
              {index === 0 && <Home className="h-4 w-4 mr-1" />}
              {breadcrumb.label}
            </Link>
          ) : (
            <span className={cn("font-medium text-foreground flex items-center", index === 0 && "hidden")}>
              {breadcrumb.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
