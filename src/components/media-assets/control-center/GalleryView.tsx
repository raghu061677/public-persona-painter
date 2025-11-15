import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Plus, MapPin, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, getStatusColor } from "@/utils/mediaAssets";

interface GalleryViewProps {
  assets: any[];
  selectedIds: string[];
  onSelectAsset: (id: string) => void;
  onViewDetails: (asset: any) => void;
  onAddToPlan: (asset: any) => void;
}

export function GalleryView({
  assets,
  selectedIds,
  onSelectAsset,
  onViewDetails,
  onAddToPlan,
}: GalleryViewProps) {
  const getAssetImage = (asset: any) => {
    if (asset.images?.photos?.[0]?.url) {
      return asset.images.photos[0].url;
    }
    return "/placeholder.svg";
  };

  return (
    <div className="p-6 overflow-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
        {assets.map((asset) => (
          <Card
            key={asset.id}
            className={cn(
              "group overflow-hidden cursor-pointer transition-all duration-200",
              "hover:shadow-lg hover:scale-[1.02]",
              selectedIds.includes(asset.id) && "ring-2 ring-primary"
            )}
            onClick={() => onSelectAsset(asset.id)}
          >
            <div className="relative">
              <div className="h-48 overflow-hidden bg-muted">
                <img
                  src={getAssetImage(asset)}
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
                    onViewDetails(asset);
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
                    onAddToPlan(asset);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>

              {/* Status Badge */}
              <div className="absolute top-2 right-2">
                <Badge className={getStatusColor(asset.status)}>
                  {asset.status}
                </Badge>
              </div>
            </div>

            <CardContent className="p-4 space-y-2">
              <div>
                <h3 className="font-bold text-sm truncate">{asset.id}</h3>
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {asset.area}, {asset.city}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{asset.dimensions}</span>
                {asset.illumination && (
                  <Badge variant="outline" className="text-xs">
                    {asset.illumination}
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-xs text-muted-foreground">Card Rate</span>
                <span className="font-semibold text-sm">
                  {formatCurrency(asset.card_rate)}
                </span>
              </div>

              {asset.total_sqft && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Total Sqft</span>
                  <span>{asset.total_sqft}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {assets.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No assets found matching your criteria</p>
        </div>
      )}
    </div>
  );
}
