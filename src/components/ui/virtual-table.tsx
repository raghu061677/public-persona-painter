import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface VirtualTableProps<T> {
  data: T[];
  columns: {
    key: string;
    header: string;
    render: (item: T) => React.ReactNode;
    className?: string;
  }[];
  estimateSize?: number;
  overscan?: number;
  className?: string;
  onRowClick?: (item: T) => void;
}

export function VirtualTable<T>({
  data,
  columns,
  estimateSize = 60,
  overscan = 5,
  className,
  onRowClick,
}: VirtualTableProps<T>) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  const items = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className={cn(
        "w-full overflow-auto",
        "h-[calc(100vh-16rem)] md:h-[calc(100vh-12rem)]",
        className
      )}
    >
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background">
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} className={column.className}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          <tr style={{ height: `${virtualizer.getTotalSize()}px` }}>
            <td />
          </tr>
          {items.map((virtualRow) => {
            const item = data[virtualRow.index];
            return (
              <TableRow
                key={virtualRow.index}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className={onRowClick ? "cursor-pointer" : ""}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((column) => (
                  <TableCell key={column.key} className={column.className}>
                    {column.render(item)}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
