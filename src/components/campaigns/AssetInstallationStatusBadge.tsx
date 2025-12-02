import { Badge } from "@/components/ui/badge";
import { getAssetInstallationStatusBadge } from "@/utils/statusHelpers";
import type { Database } from "@/integrations/supabase/types";

type AssetInstallationStatus = Database['public']['Enums']['asset_installation_status'];

interface AssetInstallationStatusBadgeProps {
  status: AssetInstallationStatus;
  showDescription?: boolean;
}

export function AssetInstallationStatusBadge({ status, showDescription = false }: AssetInstallationStatusBadgeProps) {
  const config = getAssetInstallationStatusBadge(status);

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