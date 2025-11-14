import { useState } from "react";
import { Filter, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface EnhancedFilterToggleProps {
  /** Whether filters are currently open */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Number of active filters (shown as badge) */
  activeFiltersCount?: number;
  /** Filter panel content */
  children: React.ReactNode;
  /** Additional CSS classes for the container */
  className?: string;
  /** Button variant */
  variant?: "default" | "outline" | "ghost";
  /** Button size */
  size?: "default" | "sm" | "lg";
  /** Show clear filters button */
  showClearButton?: boolean;
  /** Callback when clear filters is clicked */
  onClearFilters?: () => void;
  /** Custom trigger text */
  triggerText?: string;
}

/**
 * Enhanced reusable filter toggle component
 * Shows/hides filter panels with active filter count badge
 * Optimized for mobile with proper spacing and touch targets
 */
export function EnhancedFilterToggle({
  open: controlledOpen,
  onOpenChange,
  activeFiltersCount = 0,
  children,
  className,
  variant = "outline",
  size = "default",
  showClearButton = true,
  onClearFilters,
  triggerText = "Filters",
}: EnhancedFilterToggleProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Use controlled or uncontrolled state
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  return (
    <div className={cn("w-full space-y-3", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center gap-2 flex-wrap">
          <CollapsibleTrigger asChild>
            <Button
              variant={variant}
              size={size}
              className={cn(
                "gap-2 transition-all",
                isOpen && "bg-primary/10 border-primary"
              )}
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">{triggerText}</span>
              <span className="sm:hidden">Filter</span>
              {activeFiltersCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {activeFiltersCount}
                </Badge>
              )}
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  isOpen && "transform rotate-180"
                )}
              />
            </Button>
          </CollapsibleTrigger>

          {showClearButton && activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size={size}
              onClick={onClearFilters}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">Clear Filters</span>
              <span className="sm:hidden">Clear</span>
            </Button>
          )}
        </div>

        <CollapsibleContent className="space-y-3 pt-3">
          <div className="rounded-lg border bg-card p-3 sm:p-4 shadow-sm">
            {children}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
