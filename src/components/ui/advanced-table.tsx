import * as React from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown, Download, Settings2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Input } from "./input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Checkbox } from "./checkbox";
import { Badge } from "./badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "./dropdown-menu";
import { useAdvancedTable, AdvancedTableColumn } from "@/hooks/use-advanced-table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "./pagination";

interface AdvancedTableProps<T> {
  data: T[];
  columns: AdvancedTableColumn<T>[];
  tableKey: string;
  enableSorting?: boolean;
  enableFiltering?: boolean;
  enablePagination?: boolean;
  enableSelection?: boolean;
  enableExport?: boolean;
  enableColumnResize?: boolean;
  defaultPageSize?: number;
  onRowClick?: (row: T) => void;
  className?: string;
}

export function AdvancedTable<T extends Record<string, any>>({
  data,
  columns,
  tableKey,
  enableSorting = true,
  enableFiltering = true,
  enablePagination = true,
  enableSelection = true,
  enableExport = true,
  enableColumnResize = true,
  defaultPageSize = 10,
  onRowClick,
  className,
}: AdvancedTableProps<T>) {
  const {
    data: paginatedData,
    allData,
    sortConfig,
    filters,
    currentPage,
    pageSize,
    totalPages,
    selectedRows,
    columnWidths,
    density,
    setDensity,
    getRowClassName,
    getCellClassName,
    visibleKeys,
    setVisibleKeys,
    handleSort,
    handleFilter,
    handlePageChange,
    handlePageSizeChange,
    handleSelectRow,
    handleSelectAll,
    handleColumnResize,
    exportToCSV,
    reset,
    stats,
    isReady,
  } = useAdvancedTable({
    data,
    columns,
    tableKey,
    enableSorting,
    enableFiltering,
    enablePagination,
    enableSelection,
    enableExport,
    enableColumnResize,
    defaultPageSize,
  });

  const visibleColumns = React.useMemo(
    () => columns.filter(col => visibleKeys.includes(col.key)),
    [columns, visibleKeys]
  );

  const [resizing, setResizing] = React.useState<{ key: string; startX: number; startWidth: number } | null>(null);

  const handleResizeStart = (e: React.MouseEvent, key: string, currentWidth: number) => {
    e.preventDefault();
    setResizing({ key, startX: e.clientX, startWidth: currentWidth });
  };

  React.useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - resizing.startX;
      const newWidth = Math.max(100, resizing.startWidth + diff);
      handleColumnResize(resizing.key, newWidth);
    };

    const handleMouseUp = () => {
      setResizing(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing, handleColumnResize]);

  if (!isReady) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">Loading table...</p>
      </div>
    );
  }

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline">
            {stats.filtered.toLocaleString()} of {stats.total.toLocaleString()} rows
          </Badge>
          {stats.selected > 0 && (
            <Badge variant="secondary">{stats.selected} selected</Badge>
          )}
          {Object.keys(filters).length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFilter('', '')}
              className="h-8 px-2"
            >
              <X className="h-4 w-4 mr-1" />
              Clear filters
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {enableExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              className="h-8"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Settings2 className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Table Density</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setDensity('compact')}>
                {density === 'compact' && '✓ '}Compact
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDensity('normal')}>
                {density === 'normal' && '✓ '}Normal
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDensity('comfortable')}>
                {density === 'comfortable' && '✓ '}Comfortable
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Columns</DropdownMenuLabel>
              {columns.map(col => (
                <DropdownMenuCheckboxItem
                  key={col.key}
                  checked={visibleKeys.includes(col.key)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setVisibleKeys([...visibleKeys, col.key]);
                    } else {
                      setVisibleKeys(visibleKeys.filter(k => k !== col.key));
                    }
                  }}
                >
                  {col.header}
                </DropdownMenuCheckboxItem>
              ))}
              
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={reset}>
                Reset to defaults
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr className={getRowClassName()}>
                {enableSelection && (
                  <th className={cn(getCellClassName(), "w-12")}>
                    <Checkbox
                      checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                )}
                {visibleColumns.map((column) => (
                  <th
                    key={column.key}
                    className={cn(
                      getCellClassName(),
                      "font-semibold text-left group relative",
                      column.sortable !== false && enableSorting && "cursor-pointer hover:bg-muted/80"
                    )}
                    style={{
                      width: columnWidths[column.key] || column.width,
                      minWidth: column.minWidth,
                      maxWidth: column.maxWidth,
                    }}
                    onClick={() => column.sortable !== false && handleSort(column.key)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{column.header}</span>
                      {column.sortable !== false && enableSorting && (
                        <span className="flex-shrink-0">
                          {sortConfig?.key === column.key ? (
                            sortConfig.direction === 'asc' ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )
                          ) : (
                            <ChevronsUpDown className="h-4 w-4 opacity-50 group-hover:opacity-100" />
                          )}
                        </span>
                      )}
                    </div>
                    {enableColumnResize && column.resizable !== false && (
                      <div
                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 active:bg-primary"
                        onMouseDown={(e) => handleResizeStart(e, column.key, columnWidths[column.key] || column.width || 150)}
                      />
                    )}
                  </th>
                ))}
              </tr>
              {enableFiltering && (
                <tr className={getRowClassName()}>
                  {enableSelection && <th className={getCellClassName()} />}
                  {visibleColumns.map((column) => (
                    <th key={column.key} className={getCellClassName()}>
                      {column.filterable !== false && (
                        <Input
                          placeholder={`Filter ${column.header.toLowerCase()}...`}
                          value={filters[column.key] || ''}
                          onChange={(e) => handleFilter(column.key, e.target.value)}
                          className="h-8 text-xs"
                        />
                      )}
                    </th>
                  ))}
                </tr>
              )}
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length + (enableSelection ? 1 : 0)}
                    className={cn(getCellClassName(), "text-center text-muted-foreground")}
                  >
                    No data available
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className={cn(
                      getRowClassName(),
                      "border-b border-border hover:bg-muted/50 transition-colors",
                      selectedRows.has(rowIndex) && "bg-muted",
                      onRowClick && "cursor-pointer"
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {enableSelection && (
                      <td className={getCellClassName()}>
                        <Checkbox
                          checked={selectedRows.has(rowIndex)}
                          onCheckedChange={() => handleSelectRow(rowIndex)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                    )}
                    {visibleColumns.map((column) => (
                      <td key={column.key} className={getCellClassName()}>
                        {column.cell
                          ? column.cell(row)
                          : column.accessorKey
                          ? String(row[column.accessorKey] || '')
                          : ''}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {enablePagination && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page:</span>
            <Select value={String(pageSize)} onValueChange={(v) => handlePageSizeChange(Number(v))}>
              <SelectTrigger className="h-8 w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => handlePageChange(currentPage - 1)}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>

              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => handlePageChange(pageNum)}
                      isActive={currentPage === pageNum}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}

              {totalPages > 5 && currentPage < totalPages - 2 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}

              <PaginationItem>
                <PaginationNext
                  onClick={() => handlePageChange(currentPage + 1)}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
