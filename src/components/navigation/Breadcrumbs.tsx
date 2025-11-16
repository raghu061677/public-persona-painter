import { ChevronRight, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs() {
  const location = useLocation();
  
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const paths = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', href: '/admin/dashboard' }
    ];

    let currentPath = '';
    
    paths.forEach((path, index) => {
      // Skip 'admin' in breadcrumbs
      if (path === 'admin') return;
      
      currentPath += `/${path}`;
      
      // Format the label
      let label = path
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      // Special cases for better labels
      const labelMap: Record<string, string> = {
        'media-assets': 'Media Assets',
        'company-settings': 'Company Settings',
        'power-bills': 'Power Bills',
        'client-portal': 'Client Portal',
        'ai-assistant': 'AI Assistant',
        'booking-requests': 'Booking Requests',
      };
      
      if (labelMap[path]) {
        label = labelMap[path];
      }
      
      // Don't make the last item clickable
      if (index === paths.length - 1) {
        breadcrumbs.push({ label });
      } else {
        breadcrumbs.push({ label, href: `/admin${currentPath}` });
      }
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  // Don't show breadcrumbs on home page or public pages
  if (location.pathname === '/' || 
      location.pathname === '/auth' || 
      location.pathname === '/admin/dashboard' ||
      location.pathname.startsWith('/portal')) {
    return null;
  }

  return (
    <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
      {breadcrumbs.map((crumb, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && <ChevronRight className="w-4 h-4 mx-2" />}
          {crumb.href ? (
            <Link 
              to={crumb.href} 
              className="hover:text-foreground transition-colors flex items-center gap-1"
            >
              {index === 0 && <Home className="w-4 h-4" />}
              {crumb.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium flex items-center gap-1">
              {index === 0 && <Home className="w-4 h-4" />}
              {crumb.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
