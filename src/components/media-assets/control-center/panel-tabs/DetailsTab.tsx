import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Ruler, IndianRupee, Lightbulb, Navigation } from "lucide-react";
import { formatCurrency, getStatusColor } from "@/utils/mediaAssets";

interface DetailsTabProps {
  asset?: any;
}

export function DetailsTab({ asset }: DetailsTabProps) {
  if (!asset) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Select an asset to view details</p>
      </div>
    );
  }

  const getAssetImage = (asset: any) => {
    return asset.primary_photo_url || "/placeholder.svg";
  };

  return (
    <div className="space-y-4">
      {/* Hero Image */}
      <div className="relative h-64 rounded-lg overflow-hidden bg-muted">
        <img
          src={getAssetImage(asset)}
          alt={asset.id}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-3 right-3">
          <Badge className={getStatusColor(asset.status)}>
            {asset.status}
          </Badge>
        </div>
      </div>

      {/* Asset Info */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div>
            <h3 className="font-bold text-lg">{asset.id}</h3>
            <p className="text-sm text-muted-foreground">{asset.media_type}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Location
              </p>
              <p className="text-sm font-medium">{asset.area}</p>
              <p className="text-xs text-muted-foreground">{asset.city}</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Ruler className="h-3 w-3" />
                Dimensions
              </p>
              <p className="text-sm font-medium">{asset.dimensions}</p>
              {asset.total_sqft && (
                <p className="text-xs text-muted-foreground">{asset.total_sqft} sqft</p>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <IndianRupee className="h-3 w-3" />
                Card Rate
              </p>
              <p className="text-sm font-medium">{formatCurrency(asset.card_rate)}</p>
              <p className="text-xs text-muted-foreground">per month</p>
            </div>

            {asset.illumination_type && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Lightbulb className="h-3 w-3" />
                  Illumination
                </p>
                <p className="text-sm font-medium">{asset.illumination_type}</p>
              </div>
            )}

            {asset.direction && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Navigation className="h-3 w-3" />
                  Direction
                </p>
                <p className="text-sm font-medium">{asset.direction}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Additional Info */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <h4 className="font-semibold text-sm mb-3">Additional Information</h4>
          
          {asset.district && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">District</span>
              <span className="font-medium">{asset.district}</span>
            </div>
          )}

          {asset.state && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">State</span>
              <span className="font-medium">{asset.state}</span>
            </div>
          )}

          {asset.ownership && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Ownership</span>
              <span className="font-medium">{asset.ownership}</span>
            </div>
          )}

          {asset.base_rate && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Base Rate</span>
              <span className="font-medium">{formatCurrency(asset.base_rate)}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
