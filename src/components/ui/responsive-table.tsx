import * as React from "react";
import { cn } from "@/lib/utils";
import { Table } from "@/components/ui/table";

interface ResponsiveTableProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const ResponsiveTable = React.forwardRef<HTMLDivElement, ResponsiveTableProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div 
        ref={ref}
        className={cn(
          "w-full overflow-x-auto",
          "-mx-4 sm:mx-0", // Extend to edges on mobile, normal margin on desktop
          "custom-scrollbar", // Add custom scrollbar styling
          className
        )}
        {...props}
      >
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden shadow-sm ring-1 ring-border/50 sm:rounded-lg">
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
}

export const ResponsiveTableCell = React.forwardRef<HTMLTableCellElement, ResponsiveTableCellProps>(
  ({ className, mobileLabel, children, ...props }, ref) => {
    return (
      <td
        ref={ref}
        className={cn(
          "px-3 py-4 sm:px-6",
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
