import { AlertCircle } from "lucide-react";

export default function MediaAssetsValidation() {
  return (
    <div className="flex-1 space-y-4 p-8">
      <div className="flex items-start gap-4 p-6 bg-muted/50 rounded-lg border border-border">
        <AlertCircle className="h-6 w-6 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div>
          <h1 className="text-2xl font-semibold mb-2">
            Media Assets Validation (Under Maintenance)
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            This validation tool is temporarily disabled while we migrate to the new
            photo architecture (media_photos + primary_photo_url).
            Core media asset, marketplace, and export features are not affected.
          </p>
        </div>
      </div>
    </div>
  );
}
