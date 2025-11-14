/**
 * Layout utility functions for consistent spacing and sizing across the application
 */

/**
 * Standard container max-widths for different content types
 */
export const CONTAINER_WIDTHS = {
  sm: "max-w-screen-sm",    // 640px - forms, narrow content
  md: "max-w-screen-md",    // 768px - articles, medium content
  lg: "max-w-screen-lg",    // 1024px - dashboards
  xl: "max-w-screen-xl",    // 1280px - wide dashboards
  "2xl": "max-w-screen-2xl", // 1536px - full-width tables
  full: "max-w-full",       // 100% - no constraint
} as const;

/**
 * Standard padding values for different screen sizes
 */
export const CONTAINER_PADDING = {
  mobile: "px-3 py-3",
  tablet: "sm:px-4 sm:py-4",
  desktop: "md:px-6 md:py-6",
  large: "lg:px-8 lg:py-8",
} as const;

/**
 * Standard spacing scale
 */
export const SPACING = {
  none: "gap-0",
  xs: "gap-2",
  sm: "gap-3 md:gap-4",
  md: "gap-4 md:gap-6",
  lg: "gap-6 md:gap-8",
  xl: "gap-8 md:gap-10",
} as const;

/**
 * Generates responsive padding classes
 */
export function getResponsivePadding(size: "sm" | "md" | "lg" = "md"): string {
  const paddingMap = {
    sm: "p-2 sm:p-3 md:p-4",
    md: "p-3 sm:p-4 md:p-6 lg:p-8",
    lg: "p-4 sm:p-6 md:p-8 lg:p-10",
  };
  return paddingMap[size];
}

/**
 * Generates responsive gap classes
 */
export function getResponsiveGap(size: "sm" | "md" | "lg" = "md"): string {
  const gapMap = {
    sm: "gap-2 md:gap-3",
    md: "gap-3 md:gap-4 lg:gap-6",
    lg: "gap-4 md:gap-6 lg:gap-8",
  };
  return gapMap[size];
}

/**
 * Generates grid column classes based on breakpoints
 */
export function getGridColumns(config: {
  default?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
}): string {
  const classes: string[] = [];
  
  if (config.default) classes.push(`grid-cols-${config.default}`);
  if (config.sm) classes.push(`sm:grid-cols-${config.sm}`);
  if (config.md) classes.push(`md:grid-cols-${config.md}`);
  if (config.lg) classes.push(`lg:grid-cols-${config.lg}`);
  if (config.xl) classes.push(`xl:grid-cols-${config.xl}`);
  
  return classes.join(" ");
}

/**
 * Standard header heights
 */
export const HEADER_HEIGHTS = {
  mobile: "h-14",
  desktop: "md:h-16",
  combined: "h-14 md:h-16",
} as const;

/**
 * Standard sidebar widths
 */
export const SIDEBAR_WIDTHS = {
  collapsed: "w-16",
  expanded: "w-64",
  mobile: "w-0 md:w-16",
} as const;
