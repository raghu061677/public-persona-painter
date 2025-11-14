import * as React from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  noPadding?: boolean;
}

const maxWidthClasses = {
  sm: "max-w-screen-sm",
  md: "max-w-screen-md",
  lg: "max-w-screen-lg",
  xl: "max-w-screen-xl",
  "2xl": "max-w-screen-2xl",
  full: "max-w-full",
};

/**
 * A standardized page container that ensures consistent width, padding, and spacing
 * across all pages in the application.
 */
export const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(
  ({ className, maxWidth = "2xl", noPadding = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "w-full mx-auto",
          maxWidthClasses[maxWidth],
          !noPadding && "px-2 sm:px-4 md:px-6 lg:px-8",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

PageContainer.displayName = "PageContainer";

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

/**
 * A standardized page header with title, description, and action buttons
 */
export const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ className, title, description, actions, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col gap-4 md:flex-row md:items-center md:justify-between",
          "mb-6 md:mb-8",
          className
        )}
        {...props}
      >
        <div className="space-y-1 min-w-0 flex-1">
          {title && (
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground truncate">
              {title}
            </h1>
          )}
          {description && (
            <p className="text-sm md:text-base text-muted-foreground">
              {description}
            </p>
          )}
          {children}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {actions}
          </div>
        )}
      </div>
    );
  }
);

PageHeader.displayName = "PageHeader";

interface PageContentProps extends React.HTMLAttributes<HTMLDivElement> {
  loading?: boolean;
}

/**
 * A standardized page content wrapper with loading state
 */
export const PageContent = React.forwardRef<HTMLDivElement, PageContentProps>(
  ({ className, loading = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "space-y-4 md:space-y-6",
          loading && "opacity-50 pointer-events-none",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

PageContent.displayName = "PageContent";
