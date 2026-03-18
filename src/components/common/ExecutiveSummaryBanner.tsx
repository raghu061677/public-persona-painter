import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, BarChart3 } from "lucide-react";

interface ExecutiveSummaryBannerProps {
  dateFrom?: string;
  dateTo?: string;
  extraLabel?: string;
  onClear: () => void;
}

export function ExecutiveSummaryBanner({ dateFrom, dateTo, extraLabel, onClear }: ExecutiveSummaryBannerProps) {
  const fmtDate = (iso?: string) => {
    if (!iso) return "";
    try { return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); } catch { return ""; }
  };

  const dateLabel = dateFrom && dateTo ? `${fmtDate(dateFrom)} – ${fmtDate(dateTo)}` : "";

  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/5 border border-primary/20">
      <BarChart3 className="h-4 w-4 text-primary shrink-0" />
      <Badge variant="secondary" className="bg-primary/10 text-primary font-medium text-xs">
        Filtered by Executive Summary
      </Badge>
      {dateLabel && (
        <span className="text-xs text-muted-foreground">{dateLabel}</span>
      )}
      {extraLabel && (
        <Badge variant="outline" className="text-xs">{extraLabel}</Badge>
      )}
      <Button variant="ghost" size="sm" className="ml-auto h-6 px-2 text-xs" onClick={onClear}>
        <X className="h-3 w-3 mr-1" /> Clear Filters
      </Button>
    </div>
  );
}
