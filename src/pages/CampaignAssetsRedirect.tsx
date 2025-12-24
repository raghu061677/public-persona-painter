import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

/**
 * Redirect component for /admin/operations/:campaignId/assets
 * Redirects to the campaign detail page which shows all assets
 */
export default function CampaignAssetsRedirect() {
  const { campaignId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (campaignId) {
      // Redirect to campaign detail page
      navigate(`/admin/campaigns/${campaignId}`, { replace: true });
    } else {
      // Fallback to operations dashboard
      navigate('/admin/operations', { replace: true });
    }
  }, [campaignId, navigate]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}
