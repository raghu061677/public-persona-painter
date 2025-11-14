import * as React from "react";
import { cn } from "@/lib/utils";

interface MobileContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  noPadding?: boolean;
}

/**
 * Container component optimized for mobile layouts
 * Provides appropriate padding and constraints for different screen sizes
 */
export const MobileContainer = React.forwardRef<HTMLDivElement, MobileContainerProps>(
  ({ className, children, noPadding = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "w-full mx-auto",
          !noPadding && "px-4 sm:px-6 lg:px-8",
          "max-w-7xl", // Maximum width on large screens
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

MobileContainer.displayName = "MobileContainer";

interface MobileStackProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  spacing?: "tight" | "normal" | "loose";
}

/**
 * Stack component that adjusts spacing based on screen size
 */
export const MobileStack = React.forwardRef<HTMLDivElement, MobileStackProps>(
  ({ className, children, spacing = "normal", ...props }, ref) => {
    const spacingClasses = {
      tight: "space-y-2 md:space-y-3",
      normal: "space-y-4 md:space-y-6",
      loose: "space-y-6 md:space-y-8 lg:space-y-10",
    };

    return (
      <div
        ref={ref}
        className={cn(spacingClasses[spacing], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

MobileStack.displayName = "MobileStack";

interface ResponsiveGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4;
}

/**
 * Grid component that adapts to screen size
 */
export const ResponsiveGrid = React.forwardRef<HTMLDivElement, ResponsiveGridProps>(
  ({ className, children, cols = 3, ...props }, ref) => {
    const gridClasses = {
      1: "grid grid-cols-1",
      2: "grid grid-cols-1 md:grid-cols-2",
      3: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
      4: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    };

    return (
      <div
        ref={ref}
        className={cn(
          gridClasses[cols],
          "gap-4 md:gap-6",
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
