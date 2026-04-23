import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * WorkspaceContainer
 *
 * Full-width responsive wrapper for workspace-style admin pages
 * (builders, dense tables, editors). Unlike the document-style
 * `PageContainer`, this does NOT center content with max-width —
 * it lets the page expand to the full main-area width provided
 * by the app shell, which already caps at ~1800px.
 *
 * Use this for: plan/campaign editors, invoice/quotation builders,
 * media asset editors, dense list pages with many columns.
 *
 * Do NOT use for: settings, profile, simple forms, or reading-oriented
 * detail pages — keep those on `PageContainer` / centered layouts.
 */
interface WorkspaceContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Vertical padding preset.
   * - `default`: py-6 sm:py-8 (matches PlanEdit/PlanNew)
   * - `compact`: py-4 sm:py-6 (for list/table pages)
   * - `none`: no vertical padding
   */
  paddingY?: "default" | "compact" | "none";
}

const paddingYClasses: Record<NonNullable<WorkspaceContainerProps["paddingY"]>, string> = {
  default: "py-6 sm:py-8",
  compact: "py-4 sm:py-6",
  none: "",
};

export const WorkspaceContainer = React.forwardRef<HTMLDivElement, WorkspaceContainerProps>(
  ({ className, paddingY = "default", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "w-full min-w-0 px-3 sm:px-4 lg:px-6",
          paddingYClasses[paddingY],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

WorkspaceContainer.displayName = "WorkspaceContainer";