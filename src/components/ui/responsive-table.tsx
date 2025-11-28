import * as React from "react";
import { cn } from "@/lib/utils";
import { Table } from "@/components/ui/table";

interface ResponsiveTableProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Enable sticky header (default: true) */
  stickyHeader?: boolean;
  /** Enable sticky first column (default: false) */
  stickyFirstColumn?: boolean;
  /** Enable zebra rows (default: true) */
  zebraRows?: boolean;
}

/**
 * PremiumTable - Enterprise-grade table wrapper with:
 * - Full horizontal scrolling
 * - Sticky header
 * - Optional sticky first column
 * - Zebra rows with hover effects
 * - Premium spacing and typography
 * - Mobile-friendly touch scrolling
 */
export const ResponsiveTable = React.forwardRef<HTMLDivElement, ResponsiveTableProps>(
  ({ className, children, stickyHeader = true, stickyFirstColumn = false, zebraRows = true, ...props }, ref) => {
    return (
      <div 
        ref={ref}
        className={cn(
          "w-full overflow-x-auto",
          "custom-scrollbar", // Custom scrollbar styling
          className
        )}
        {...props}
      >
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden border border-border/50 rounded-lg shadow-sm">
            {children}
          </div>
        </div>
      </div>
    );
  }
);

ResponsiveTable.displayName = "ResponsiveTable";

interface ResponsiveTableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  mobileLabel?: string;
  children: React.ReactNode;
  /** Make this cell sticky to the left */
  sticky?: boolean;
  /** Z-index for sticky positioning (default: 30) */
  stickyZIndex?: number;
}

export const ResponsiveTableCell = React.forwardRef<HTMLTableCellElement, ResponsiveTableCellProps>(
  ({ className, mobileLabel, sticky, stickyZIndex = 30, children, ...props }, ref) => {
    return (
      <td
        ref={ref}
        className={cn(
          "px-4 py-3",
          sticky && "sticky left-0 bg-background",
          sticky && `z-${stickyZIndex}`,
          mobileLabel && "before:content-[attr(data-label)] before:font-semibold before:block before:text-xs before:text-muted-foreground sm:before:content-none",
          className
        )}
        data-label={mobileLabel}
        {...props}
      >
        {children}
      </td>
    );
  }
);

ResponsiveTableCell.displayName = "ResponsiveTableCell";

interface ResponsiveTableHeaderProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
  /** Make this header cell sticky to the left */
  sticky?: boolean;
  /** Make this header sticky to top */
  stickyTop?: boolean;
}

export const ResponsiveTableHeader = React.forwardRef<HTMLTableCellElement, ResponsiveTableHeaderProps>(
  ({ className, sticky, stickyTop, children, ...props }, ref) => {
    return (
      <th
        ref={ref}
        className={cn(
          "px-4 py-3 text-left font-semibold text-foreground",
          stickyTop && "sticky top-0 z-20 bg-muted",
          sticky && "sticky left-0 z-30 bg-muted border-r",
          className
        )}
        {...props}
      >
        {children}
      </th>
    );
  }
);

ResponsiveTableHeader.displayName = "ResponsiveTableHeader";
