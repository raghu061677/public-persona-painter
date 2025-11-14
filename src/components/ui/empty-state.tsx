import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: "default" | "compact";
}

/**
 * A standardized empty state component for when there's no data to display
 */
export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      className,
      icon: Icon,
      title,
      description,
      action,
      variant = "default",
      ...props
    },
    ref
  ) => {
    const isCompact = variant === "compact";

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center text-center",
          isCompact ? "py-8 px-4" : "py-12 px-4 md:py-16",
          className
        )}
        {...props}
      >
        {Icon && (
          <div
            className={cn(
              "rounded-full bg-muted flex items-center justify-center mb-4",
              isCompact ? "w-12 h-12" : "w-16 h-16 md:w-20 md:h-20"
            )}
          >
            <Icon
              className={cn(
                "text-muted-foreground",
                isCompact ? "w-6 h-6" : "w-8 h-8 md:w-10 md:h-10"
              )}
            />
          </div>
        )}
        <h3
          className={cn(
            "font-semibold text-foreground mb-2",
            isCompact ? "text-base md:text-lg" : "text-lg md:text-xl"
          )}
        >
          {title}
        </h3>
        {description && (
          <p
            className={cn(
              "text-muted-foreground max-w-md mx-auto mb-4",
              isCompact ? "text-sm" : "text-sm md:text-base"
            )}
          >
            {description}
          </p>
        )}
        {action && (
          <Button onClick={action.onClick} size={isCompact ? "sm" : "default"}>
            {action.label}
          </Button>
        )}
      </div>
    );
  }
);

EmptyState.displayName = "EmptyState";
