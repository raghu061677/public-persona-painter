import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  MapPin, Camera, User, Calendar, Navigation, ChevronRight,
  CheckCircle2, Clock, Wrench, Eye, AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveAssetDisplayCode } from "@/lib/assets/getAssetDisplayCode";
import { OpsProofCompleteness } from "./OpsProofCompleteness";

interface OpsTaskCardProps {
  asset: any;
  onViewDetails?: (asset: any) => void;
  onUploadProof?: (asset: any) => void;
  compact?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; icon: any; variant: string; borderColor: string }> = {
  Pending: { label: "Pending", icon: Clock, variant: "outline", borderColor: "border-l-muted-foreground" },
  Assigned: { label: "Assigned", icon: User, variant: "secondary", borderColor: "border-l-amber-500" },
  Installed: { label: "Installed", icon: Wrench, variant: "secondary", borderColor: "border-l-blue-500" },
  Mounted: { label: "Mounted", icon: Wrench, variant: "secondary", borderColor: "border-l-blue-500" },
  PhotoUploaded: { label: "Proof Uploaded", icon: Camera, variant: "secondary", borderColor: "border-l-cyan-500" },
  Verified: { label: "Verified", icon: CheckCircle2, variant: "default", borderColor: "border-l-emerald-500" },
  Completed: { label: "Completed", icon: CheckCircle2, variant: "default", borderColor: "border-l-emerald-500" },
};

export function OpsTaskCard({ asset, onViewDetails, onUploadProof, compact }: OpsTaskCardProps) {
  const status = asset.status || "Pending";
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.Pending;
  const displayCode = resolveAssetDisplayCode(asset);
  const hasGps = !!(asset.latitude || asset.longitude || asset.media_assets?.latitude || asset.media_assets?.longitude);
  const campaignName = asset.campaign?.campaign_name || asset.campaigns?.campaign_name || "—";
  const clientName = asset.campaign?.client_name || asset.campaigns?.client_name || "";

  return (
    <Card className={cn("border-l-4 transition-shadow hover:shadow-md", config.borderColor)}>
      <CardContent className={cn("p-4 sm:p-5", compact && "p-3")}>
        <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
          {/* Left: info */}
          <div className="flex-1 min-w-0 space-y-2 w-full">
            {/* Asset code + status */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-semibold truncate">{displayCode}</span>
              <Badge variant={config.variant as any} className="text-[10px] gap-1 shrink-0">
                <config.icon className="h-3 w-3" />
                {config.label}
              </Badge>
              {hasGps && (
                <Badge variant="outline" className="text-[10px] gap-1 shrink-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                  <Navigation className="h-2.5 w-2.5" />
                  GPS
                </Badge>
              )}
              {!hasGps && (
                <Badge variant="outline" className="text-[10px] gap-1 shrink-0 bg-destructive/10 text-destructive border-destructive/30">
                  <Navigation className="h-2.5 w-2.5" />
                  No GPS
                </Badge>
              )}
            </div>

            {/* Campaign & client */}
            <p className="text-xs text-muted-foreground truncate">
              {campaignName}{clientName ? ` · ${clientName}` : ""}
            </p>

            {/* Location */}
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{asset.location || "—"}, {asset.area || ""}, {asset.city || ""}</span>
            </p>

            {/* Mounter + date row */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              {asset.mounter_name && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {asset.mounter_name}
                </span>
              )}
              {asset.assigned_at && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(asset.assigned_at).toLocaleDateString()}
                </span>
              )}
            </div>

            {/* Proof completeness - always show */}
            {!compact && (
              <div className="pt-1">
                <OpsProofCompleteness photos={asset.photos} hasGps={hasGps} />
              </div>
            )}
          </div>

          {/* Right: actions - larger buttons for mobile */}
          <div className="flex sm:flex-col gap-2 shrink-0 w-full sm:w-auto">
            {onUploadProof && status !== "Verified" && status !== "Completed" && (
              <Button
                size="default"
                variant="default"
                className="flex-1 sm:flex-none h-11 sm:h-9 text-sm sm:text-xs gap-1.5 font-medium"
                onClick={() => onUploadProof(asset)}
              >
                <Camera className="h-4 w-4" />
                Upload Proof
              </Button>
            )}
            {onViewDetails && (
              <Button
                size="default"
                variant="outline"
                className="flex-1 sm:flex-none h-11 sm:h-9 text-sm sm:text-xs gap-1"
                onClick={() => onViewDetails(asset)}
              >
                Details
                <ChevronRight className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
