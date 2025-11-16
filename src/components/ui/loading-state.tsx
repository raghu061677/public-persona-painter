import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface LoadingStateProps {
  message?: string;
  fullHeight?: boolean;
}

export function LoadingState({ message = "Loading...", fullHeight = true }: LoadingStateProps) {
  return (
    <div className={`flex items-center justify-center ${fullHeight ? 'min-h-[400px]' : 'py-12'} animate-fade-in`}>
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground text-sm">{message}</p>
      </div>
    </div>
  );
}

interface LoadingCardProps {
  message?: string;
}

export function LoadingCard({ message = "Loading..." }: LoadingCardProps) {
  return (
    <Card className="animate-fade-in">
      <CardContent className="pt-6">
        <LoadingState message={message} fullHeight={false} />
      </CardContent>
    </Card>
  );
}
