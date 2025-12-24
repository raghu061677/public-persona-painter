import { useEffect, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface CampaignBreadcrumbsProps {
  additionalItems?: BreadcrumbItem[];
  className?: string;
}

/**
 * Dynamic campaign-aware breadcrumbs that maintain navigation context.
 * Automatically resolves campaign name and builds appropriate trail.
 */
export function CampaignBreadcrumbs({ additionalItems = [], className }: CampaignBreadcrumbsProps) {
  const params = useParams<{ campaignId?: string; id?: string; assetId?: string }>();
  const location = useLocation();
  const [campaignName, setCampaignName] = useState<string | null>(null);

  // Resolve campaignId
  const getCampaignId = (): string | null => {
    if (params.campaignId) return params.campaignId;
    if (params.id) return params.id;
    
    const pathMatch = location.pathname.match(/\/campaigns\/([^\/]+)/);
    if (pathMatch?.[1] && !['edit', 'create', 'new'].includes(pathMatch[1])) {
      return pathMatch[1];
    }
    
    const opsMatch = location.pathname.match(/\/operations\/([^\/]+)/);
    if (opsMatch?.[1] && !['map', 'creatives', 'printing', 'calendar', 'analytics'].includes(opsMatch[1])) {
      return opsMatch[1];
    }
    
    return null;
  };

  const campaignId = getCampaignId();

  useEffect(() => {
    if (campaignId) {
      fetchCampaignName();
    }
  }, [campaignId]);

  const fetchCampaignName = async () => {
    if (!campaignId) return;

    try {
      const { data } = await supabase
        .from('campaigns')
        .select('campaign_name')
        .eq('id', campaignId)
        .single();

      if (data) {
        setCampaignName(data.campaign_name);
      }
    } catch (err) {
      console.error('Failed to fetch campaign name for breadcrumbs:', err);
    }
  };

  // Build breadcrumb items based on current path
  const buildBreadcrumbs = (): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [
      { label: 'Home', href: '/dashboard' },
      { label: 'Campaigns', href: '/admin/campaigns' },
    ];

    if (campaignId && campaignName) {
      items.push({
        label: campaignName,
        href: `/admin/campaigns/${campaignId}`,
      });
    } else if (campaignId) {
      items.push({
        label: campaignId,
        href: `/admin/campaigns/${campaignId}`,
      });
    }

    // Add context-specific items based on path
    const path = location.pathname;

    if (path.includes('/operations/') && campaignId) {
      items.push({
        label: 'Operations',
        href: `/admin/campaigns/${campaignId}`,
      });

      if (params.assetId) {
        items.push({
          label: 'Asset Proof',
        });
      }
    }

    if (path.includes('/budget')) {
      items.push({ label: 'Budget Tracker' });
    }

    if (path.includes('/edit')) {
      items.push({ label: 'Edit' });
    }

    // Add any additional custom items
    items.push(...additionalItems);

    return items;
  };

  const breadcrumbs = buildBreadcrumbs();

  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav className={`flex items-center text-sm text-muted-foreground mb-4 ${className}`}>
      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1;
        
        return (
          <div key={index} className="flex items-center">
            {index === 0 ? (
              <Home className="h-4 w-4 mr-1" />
            ) : (
              <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground/50" />
            )}
            
            {item.href && !isLast ? (
              <Link
                to={item.href}
                className="hover:text-foreground transition-colors truncate max-w-[150px]"
                title={item.label}
              >
                {item.label}
              </Link>
            ) : (
              <span 
                className={`truncate max-w-[200px] ${isLast ? 'text-foreground font-medium' : ''}`}
                title={item.label}
              >
                {item.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
