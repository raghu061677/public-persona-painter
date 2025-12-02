import { Badge } from "@/components/ui/badge";
import { getCampaignStatusBadge } from "@/utils/statusHelpers";
import type { Database } from "@/integrations/supabase/types";

type CampaignStatus = Database['public']['Enums']['campaign_status'];

interface CampaignStatusBadgeProps {
  status: CampaignStatus;
  showDescription?: boolean;
}

export function CampaignStatusBadge({ status, showDescription = false }: CampaignStatusBadgeProps) {
  const config = getCampaignStatusBadge(status);

  return (
    <div className="inline-flex items-center gap-2">
      <Badge variant={config.variant} className="transition-smooth">
        {config.label}
      </Badge>
      {showDescription && (
        <span className="text-xs text-muted-foreground">{config.description}</span>
      )}
    </div>
  );
}