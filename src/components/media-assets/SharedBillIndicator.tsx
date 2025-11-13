import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link2, AlertCircle, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SharedBillIndicatorProps {
  sharedAssets?: Array<{
    asset_id: string;
    share_percentage: number;
  }>;
  sharePercentage?: number;
  isPrimaryBill?: boolean;
  uniqueServiceNumber?: string;
}

export function SharedBillIndicator({
  sharedAssets,
  sharePercentage = 100,
  isPrimaryBill = true,
  uniqueServiceNumber,
}: SharedBillIndicatorProps) {
  const navigate = useNavigate();
  const isShared = sharedAssets && sharedAssets.length > 0;

  if (!isShared && sharePercentage === 100) {
    return null;
  }

  const handleViewSharing = () => {
    navigate("/admin/power-bills-sharing");
  };

  return (
    <Alert className="mt-4">
      <Link2 className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">
              {isPrimaryBill ? "Primary Shared Bill" : "Shared Power Connection"}
            </span>
            <Badge variant="secondary" className="ml-2">
              <Users className="h-3 w-3 mr-1" />
              {isShared ? sharedAssets.length + 1 : 2} Assets
            </Badge>
            <Badge variant="outline">
              {sharePercentage.toFixed(1)}% of total
            </Badge>
          </div>
          {isShared && (
            <p className="text-sm text-muted-foreground mt-1">
              Sharing with:{" "}
              {sharedAssets.map((a) => `${a.asset_id} (${a.share_percentage.toFixed(1)}%)`).join(", ")}
            </p>
          )}
          {uniqueServiceNumber && (
            <p className="text-xs text-muted-foreground">
              USN: {uniqueServiceNumber}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleViewSharing}>
          Manage Sharing
        </Button>
      </AlertDescription>
    </Alert>
  );
}
