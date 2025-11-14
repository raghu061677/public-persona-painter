import * as React from "react";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface FilterToggleProps {
  isOpen: boolean;
  onToggle: () => void;
  filterCount?: number;
  children: React.ReactNode;
  className?: string;
}

/**
 * A reusable filter toggle component that shows/hides filter panels
 * Displays a badge with active filter count
 */
export const FilterToggle = React.forwardRef<HTMLDivElement, FilterToggleProps>(
  ({ isOpen, onToggle, filterCount = 0, children, className }, ref) => {
    return (
      <div ref={ref} className={cn("w-full", className)}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters</span>
            {filterCount > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-xs font-medium rounded-full bg-primary text-primary-foreground">
                {filterCount}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-8"
          >
            {isOpen ? (
              <>
                <X className="h-4 w-4 mr-1" />
                Hide Filters
              </>
            ) : (
              <>
                <Filter className="h-4 w-4 mr-1" />
                Show Filters
              </>
            )}
          </Button>
        </div>
        
        <Collapsible open={isOpen}>
          <CollapsibleContent className="space-y-4">
            {children}
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  }
);

FilterToggle.displayName = "FilterToggle";
