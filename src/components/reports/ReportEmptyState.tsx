import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FileX, Search, Calendar } from "lucide-react";

interface ReportEmptyStateProps {
  icon?: ReactNode;
  title?: string;
  description?: string;
  filterSummary?: string;
  onClearFilters?: () => void;
  suggestions?: string[];
}

export function ReportEmptyState({
  icon,
  title = "No data available",
  description = "No results match your current filters",
  filterSummary,
  onClearFilters,
  suggestions = [
    "Try expanding the date range",
    "Remove some filters",
    "Check if data exists for this period"
  ],
}: ReportEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        {icon || <FileX className="h-10 w-10 text-muted-foreground" />}
      </div>
      
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md">{description}</p>
      
      {filterSummary && (
        <div className="mt-4 px-4 py-2 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            Current filters: <span className="font-medium text-foreground">{filterSummary}</span>
          </p>
        </div>
      )}
      
      {suggestions.length > 0 && (
        <div className="mt-6 space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Suggestions:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            {suggestions.map((s, i) => (
              <li key={i} className="flex items-center gap-2 justify-center">
                <span className="text-muted-foreground">•</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {onClearFilters && (
        <Button variant="outline" className="mt-6" onClick={onClearFilters}>
          Clear all filters
        </Button>
      )}
    </div>
  );
}
