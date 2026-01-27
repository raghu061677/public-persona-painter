import { useState, useMemo } from "react";
import { TableHead } from "@/components/ui/table";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

interface SortableTableHeadProps {
  children: React.ReactNode;
  sortKey: string;
  currentSort: SortConfig | null;
  onSort: (key: string) => void;
  className?: string;
  align?: 'left' | 'right' | 'center';
}

export function SortableTableHead({
  children,
  sortKey,
  currentSort,
  onSort,
  className,
  align = 'left',
}: SortableTableHeadProps) {
  const isActive = currentSort?.key === sortKey;
  const direction = isActive ? currentSort.direction : null;

  const handleClick = () => {
    onSort(sortKey);
  };

  return (
    <TableHead
      className={cn(
        "px-4 py-3 font-semibold cursor-pointer select-none hover:bg-muted/50 transition-colors",
        align === 'right' && "text-right",
        align === 'center' && "text-center",
        align === 'left' && "text-left",
        isActive && "bg-muted/30",
        className
      )}
      onClick={handleClick}
    >
      <div className={cn(
        "flex items-center gap-1.5",
        align === 'right' && "justify-end",
        align === 'center' && "justify-center"
      )}>
        <span>{children}</span>
        <span className={cn(
          "transition-opacity",
          isActive ? "opacity-100" : "opacity-40 group-hover:opacity-70"
        )}>
          {direction === 'asc' ? (
            <ArrowUp className="h-3.5 w-3.5" />
          ) : direction === 'desc' ? (
            <ArrowDown className="h-3.5 w-3.5" />
          ) : (
            <ArrowUpDown className="h-3.5 w-3.5" />
          )}
        </span>
      </div>
    </TableHead>
  );
}

// Helper hook for sorting logic
export function useSortableData<T>(
  data: T[],
  initialSort: SortConfig | null = null
) {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(initialSort);

  const handleSort = (key: string) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        // Cycle: asc -> desc -> null
        if (current.direction === 'asc') {
          return { key, direction: 'desc' };
        }
        return null;
      }
      return { key, direction: 'asc' };
    });
  };

  const sortedData = useMemo(() => {
    if (!sortConfig || !sortConfig.direction) return data;

    return [...data].sort((a, b) => {
      const aVal = (a as any)[sortConfig.key];
      const bVal = (b as any)[sortConfig.key];

      // Handle null/undefined
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // Handle dates (ISO string format)
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const aDate = Date.parse(aVal);
        const bDate = Date.parse(bVal);
        if (!isNaN(aDate) && !isNaN(bDate)) {
          const comparison = aDate - bDate;
          return sortConfig.direction === 'asc' ? comparison : -comparison;
        }
      }

      // Handle numbers
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        const comparison = aVal - bVal;
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }

      // Handle strings
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      const comparison = aStr.localeCompare(bStr);
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [data, sortConfig]);

  return {
    sortedData,
    sortConfig,
    handleSort,
    setSortConfig,
  };
}

