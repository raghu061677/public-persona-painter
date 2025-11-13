import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { PhotoValidationResult } from "@/lib/photoValidation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PhotoValidationBadgeProps {
  validation?: PhotoValidationResult;
}

export function PhotoValidationBadge({ validation }: PhotoValidationBadgeProps) {
  if (!validation) return null;

  const getIcon = () => {
    if (validation.quality === "excellent" || validation.quality === "good") {
      return <CheckCircle className="h-3 w-3" />;
    }
    if (validation.quality === "acceptable") {
      return <AlertCircle className="h-3 w-3" />;
    }
    return <XCircle className="h-3 w-3" />;
  };

  const getVariant = () => {
    if (validation.quality === "excellent" || validation.quality === "good") {
      return "default";
    }
    if (validation.quality === "acceptable") {
      return "secondary";
    }
    return "destructive";
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={getVariant()} className="gap-1">
            {getIcon()}
            {validation.score}%
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <p className="font-semibold">Quality: {validation.quality}</p>
            {validation.issues.length > 0 && (
              <div>
                <p className="text-xs font-medium">Issues:</p>
                <ul className="text-xs list-disc pl-4">
                  {validation.issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
            {validation.suggestions.length > 0 && (
              <div>
                <p className="text-xs font-medium">Suggestions:</p>
                <ul className="text-xs list-disc pl-4">
                  {validation.suggestions.map((suggestion, i) => (
                    <li key={i}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
