import { Badge } from "@/components/ui/badge";
import { getMediaAssetStatusBadge } from "@/utils/statusHelpers";
import type { Database } from "@/integrations/supabase/types";

type MediaAssetStatus = Database['public']['Enums']['media_asset_status'];

interface MediaAssetStatusBadgeProps {
  status: MediaAssetStatus;
  showDescription?: boolean;
}

export function MediaAssetStatusBadge({ status, showDescription = false }: MediaAssetStatusBadgeProps) {
  const config = getMediaAssetStatusBadge(status);

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