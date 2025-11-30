import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Plus, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, getStatusColor } from "@/utils/mediaAssets";
import { useImpactScore } from "@/hooks/use-impact-score";
import { useTrafficData } from "@/hooks/use-traffic-data";
import { TrafficBadge } from "../god-mode/TrafficBadge";
import { ImpactScoreBadge } from "../god-mode/ImpactScoreBadge";

interface GalleryAssetCardProps {
  asset: any;
  isSelected: boolean;
  onSelect: () => void;
  onViewDetails: () => void;
  onAddToPlan: () => void;
}

export function GalleryAssetCard({
  asset,
  isSelected,
  onSelect,
  onViewDetails,
  onAddToPlan,
}: GalleryAssetCardProps) {
  const impactScore = useImpactScore(asset);
  const trafficData = useTrafficData(asset);

  const getAssetImage = () => {
    return asset.primary_photo_url || "/placeholder.svg";
  };

  return (
    <Card
      className={cn(
        "group overflow-hidden cursor-pointer transition-all duration-200",
        "hover:shadow-lg hover:scale-[1.02]",
        isSelected && "ring-2 ring-primary"
      )}
      onClick={onSelect}
    >
      <div className="relative">
        <div className="h-48 overflow-hidden bg-muted">
          <img
            src={getAssetImage()}
            alt={asset.id}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails();
            }}
          >
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              onAddToPlan();
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        {/* Top Badges Row */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1">
          <div className="flex items-center gap-1">
            <ImpactScoreBadge score={impactScore.overall} size="sm" />
          </div>
          <Badge className={getStatusColor(asset.status)}>
            {asset.status}
          </Badge>
        </div>

        {/* Bottom Badges Row */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1">
          <TrafficBadge band={trafficData.trafficBand} size="sm" />
        </div>
      </div>

      <CardContent className="p-3 space-y-2">
        <div>
          <h3 className="font-bold text-sm truncate">{asset.id}</h3>
          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {asset.area}, {asset.city}
          </p>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{asset.dimensions}</span>
          {asset.illumination_type && (
            <Badge variant="outline" className="text-xs">
              {asset.illumination_type}
            </Badge>
          )}
        </div>

        {/* AI Insights Row */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t">
          <span title="Estimated Daily Impressions">
            👁️ {(trafficData.impressionsPerDay / 1000).toFixed(1)}K
          </span>
          <span className="text-muted-foreground/50">•</span>
          <span title="Quality Rating">
            {impactScore.rating}
          </span>
        </div>

        <div className="flex items-center justify-between pt-1 border-t">
          <span className="text-xs text-muted-foreground">Card Rate</span>
          <span className="font-semibold text-sm">
            {formatCurrency(asset.card_rate)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
