import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ConflictWarningProps {
  conflicts: Array<{
    campaign_id: string;
    campaign_name: string;
    client_name: string;
    start_date: string;
    end_date: string;
    status: string;
  }>;
}

export function ConflictWarning({ conflicts }: ConflictWarningProps) {
  if (conflicts.length === 0) return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Booking Conflict Detected</AlertTitle>
      <AlertDescription>
        <p className="mb-2">
          This asset is already booked during the selected period:
        </p>
        <div className="space-y-2">
          {conflicts.map((conflict) => (
            <div
              key={conflict.campaign_id}
              className="flex items-center gap-2 text-sm bg-background/50 p-2 rounded"
            >
              <Badge variant="outline">{conflict.status}</Badge>
              <span className="font-medium">{conflict.campaign_name}</span>
              <span className="text-muted-foreground">
                ({conflict.client_name})
              </span>
              <span className="text-xs">
                {new Date(conflict.start_date).toLocaleDateString()} -{" "}
                {new Date(conflict.end_date).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </AlertDescription>
    </Alert>
  );
}