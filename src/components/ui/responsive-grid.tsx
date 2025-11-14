import * as React from "react";
import { cn } from "@/lib/utils";

interface ResponsiveGridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    "2xl"?: number;
  };
  gap?: "none" | "xs" | "sm" | "md" | "lg" | "xl";
}

const gapClasses = {
  none: "gap-0",
  xs: "gap-2",
  sm: "gap-3 md:gap-4",
  md: "gap-4 md:gap-6",
  lg: "gap-6 md:gap-8",
  xl: "gap-8 md:gap-10",
};

/**
 * A responsive grid component that adapts column count based on screen size
 */
export const ResponsiveGrid = React.forwardRef<HTMLDivElement, ResponsiveGridProps>(
  (
    {
      className,
      cols = { default: 1, md: 2, lg: 3, xl: 4 },
      gap = "md",
      children,
      ...props
    },
    ref
  ) => {
    const gridCols = React.useMemo(() => {
      const classes: string[] = [];
      
      if (cols.default) classes.push(`grid-cols-${cols.default}`);
      if (cols.sm) classes.push(`sm:grid-cols-${cols.sm}`);
      if (cols.md) classes.push(`md:grid-cols-${cols.md}`);
      if (cols.lg) classes.push(`lg:grid-cols-${cols.lg}`);
      if (cols.xl) classes.push(`xl:grid-cols-${cols.xl}`);
      if (cols["2xl"]) classes.push(`2xl:grid-cols-${cols["2xl"]}`);
      
      return classes.join(" ");
    }, [cols]);

    return (
      <div
        ref={ref}
        className={cn(
          "grid w-full",
          gridCols,
          gapClasses[gap],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ResponsiveGrid.displayName = "ResponsiveGrid";

interface ResponsiveStackProps extends React.HTMLAttributes<HTMLDivElement> {
  spacing?: "none" | "xs" | "sm" | "md" | "lg" | "xl";
  divider?: boolean;
}

const spacingClasses = {
  none: "space-y-0",
  xs: "space-y-2",
  sm: "space-y-3 md:space-y-4",
  md: "space-y-4 md:space-y-6",
  lg: "space-y-6 md:space-y-8",
  xl: "space-y-8 md:space-y-10",
};

/**
 * A responsive vertical stack component with consistent spacing
 */
export const ResponsiveStack = React.forwardRef<HTMLDivElement, ResponsiveStackProps>(
  ({ className, spacing = "md", divider = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col w-full",
          spacingClasses[spacing],
          divider && "divide-y divide-border",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ResponsiveStack.displayName = "ResponsiveStack";
