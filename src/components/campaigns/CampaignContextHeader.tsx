import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Building2, ChevronDown } from 'lucide-react';
import { useCompany } from '@/contexts/CompanyContext';
import { getCampaignStatusColor } from '@/utils/campaigns';
import { formatDate } from '@/utils/plans';

interface Campaign {
  id: string;
  campaign_name: string;
  client_name: string;
  status: string;
  start_date: string;
  end_date: string;
}

interface CampaignContextHeaderProps {
  className?: string;
}

/**
 * Sticky campaign context header that appears on all campaign-related pages.
 * Shows campaign info and allows quick switching between campaigns.
 */
export function CampaignContextHeader({ className }: CampaignContextHeaderProps) {
  const navigate = useNavigate();
  const params = useParams<{ campaignId?: string; id?: string }>();
  const location = useLocation();
  const { company } = useCompany();
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  // Resolve campaignId from multiple sources
  const getCampaignId = (): string | null => {
    if (params.campaignId) return params.campaignId;
    if (params.id) return params.id;
    
    const state = location.state as { campaignId?: string } | null;
    if (state?.campaignId) return state.campaignId;
    
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
      fetchCampaign();
    } else {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    if (company?.id) {
      fetchRecentCampaigns();
    }
  }, [company?.id]);

  const fetchCampaign = async () => {
    if (!campaignId) return;

    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, campaign_name, client_name, status, start_date, end_date')
        .eq('id', campaignId)
        .single();

      if (!error && data) {
        setCampaign(data);
      }
    } catch (err) {
      console.error('Failed to fetch campaign for header:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentCampaigns = async () => {
    if (!company?.id) return;

    try {
      const { data } = await supabase
        .from('campaigns')
        .select('id, campaign_name, client_name, status, start_date, end_date')
        .eq('company_id', company.id)
        .in('status', ['InProgress', 'Planned', 'Running'])
        .order('created_at', { ascending: false })
        .limit(10);

      setRecentCampaigns(data || []);
    } catch (err) {
      console.error('Failed to fetch recent campaigns:', err);
    }
  };

  const handleCampaignSwitch = (newCampaignId: string) => {
    if (newCampaignId === campaignId) return;
    
    // Navigate to the campaign detail page
    navigate(`/admin/campaigns/${newCampaignId}`);
  };

  // Don't render if no campaign context or still loading
  if (!campaignId || loading || !campaign) {
    return null;
  }

  const isRunning = campaign.status === 'InProgress' || campaign.status === 'Running';

  return (
    <div className={`sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b ${className}`}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Campaign Info */}
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <button
              onClick={() => navigate(`/admin/campaigns/${campaign.id}`)}
              className="font-semibold text-lg hover:text-primary transition-colors truncate max-w-[300px]"
              title={campaign.campaign_name}
            >
              {campaign.campaign_name}
            </button>
            
            <Badge className={getCampaignStatusColor(campaign.status)}>
              {campaign.status}
            </Badge>
            
            <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                <span className="truncate max-w-[150px]">{campaign.client_name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}</span>
              </div>
            </div>
          </div>

          {/* Campaign Switcher */}
          {recentCampaigns.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">Switch:</span>
              <Select value={campaignId} onValueChange={handleCampaignSwitch}>
                <SelectTrigger className="w-[200px] h-9">
                  <SelectValue placeholder="Select campaign" />
                </SelectTrigger>
                <SelectContent>
                  {recentCampaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[150px]">{c.campaign_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {c.status}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
