import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface BackToCampaignButtonProps {
  className?: string;
  variant?: 'default' | 'ghost' | 'outline' | 'secondary' | 'destructive' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

/**
 * Smart "Back to Campaign" button that maintains campaign context.
 * Resolves campaignId from:
 * 1. Route params (campaignId or id)
 * 2. Navigation state
 * 
 * NEVER redirects to /admin/operations or /admin/campaigns list.
 * Only navigates to specific campaign page.
 */
export function BackToCampaignButton({ 
  className, 
  variant = 'ghost',
  size = 'default'
}: BackToCampaignButtonProps) {
  const navigate = useNavigate();
  const params = useParams<{ campaignId?: string; id?: string }>();
  const location = useLocation();

  // Resolve campaignId from multiple sources
  const getCampaignId = (): string | null => {
    // 1. Check route params (campaignId takes priority)
    if (params.campaignId) return params.campaignId;
    if (params.id) return params.id;
    
    // 2. Check navigation state
    const state = location.state as { campaignId?: string } | null;
    if (state?.campaignId) return state.campaignId;
    
    // 3. Try to extract from current path
    const pathMatch = location.pathname.match(/\/campaigns\/([^\/]+)/);
    if (pathMatch?.[1]) return pathMatch[1];
    
    const opsMatch = location.pathname.match(/\/operations\/([^\/]+)/);
    if (opsMatch?.[1] && opsMatch[1] !== 'map' && opsMatch[1] !== 'creatives' && opsMatch[1] !== 'printing') {
      return opsMatch[1];
    }
    
    return null;
  };

  const campaignId = getCampaignId();

  // Don't render if no campaignId can be resolved
  if (!campaignId) {
    console.warn('BackToCampaignButton: Could not resolve campaignId, button hidden');
    return null;
  }

  const handleClick = () => {
    // Always navigate to the specific campaign page
    navigate(`/admin/campaigns/${campaignId}`);
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={className}
    >
      <ArrowLeft className="mr-2 h-4 w-4" />
      Back to Campaign
    </Button>
  );
}
