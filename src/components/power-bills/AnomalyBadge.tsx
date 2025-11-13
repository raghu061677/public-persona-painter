import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AnomalyBadgeProps {
  isAnomaly: boolean;
  anomalyType?: string | null;
  anomalyDetails?: any;
}

export function AnomalyBadge({ isAnomaly, anomalyType, anomalyDetails }: AnomalyBadgeProps) {
  if (!isAnomaly) return null;

  const getIcon = () => {
    if (anomalyType === 'high_spike') return <TrendingUp className="h-3 w-3" />;
    if (anomalyType === 'sudden_drop') return <TrendingDown className="h-3 w-3" />;
    return <AlertTriangle className="h-3 w-3" />;
  };

  const getLabel = () => {
    if (anomalyType === 'high_spike') return 'High Bill Alert';
    if (anomalyType === 'sudden_drop') return 'Unusual Drop';
    return 'Anomaly';
  };

  const getTooltipContent = () => {
    if (anomalyType === 'high_spike' && anomalyDetails) {
      return (
        <div className="space-y-1">
          <p className="font-semibold">High Bill Detected</p>
          <p>Current: ₹{anomalyDetails.currentAmount?.toLocaleString('en-IN')}</p>
          <p>Average: ₹{anomalyDetails.averageAmount?.toLocaleString('en-IN')}</p>
          <p className="text-red-400">+{anomalyDetails.percentageIncrease}% increase</p>
        </div>
      );
    }
    return 'Unusual bill amount detected';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="destructive" className="gap-1">
            {getIcon()}
            {getLabel()}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          {getTooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
