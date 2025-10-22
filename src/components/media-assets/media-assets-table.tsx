import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  GripVertical,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Layers,
} from "lucide-react";
import { DndProvider, useDrag, useDrop, type XYCoord } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useColumnPrefs } from "@/hooks/use-column-prefs";
import ColumnVisibilityButton from "@/components/common/column-visibility-button";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type RowSelectionState,
  type ColumnDef,
} from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import AddPlanFromAssetsModal from "./add-plan-from-assets-modal";
import { ActionCell, ImageCell } from "./asset-table-cells";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/utils/mediaAssets";
import "./media-assets-table.css";

interface Asset {
  id: string;
  media_type: string;
  location: string;
  area: string;
  city: string;
  district?: string;
  state?: string;
  dimensions: string;
  total_sqft?: number;
  card_rate: number;
  base_rent?: number;
  gst_percent?: number;
  status: string;
  image_urls?: string[];
  illumination?: string;
  direction?: string;
  ownership?: string;
  latitude?: number;
  longitude?: number;
  is_public?: boolean;
  media_id?: string;
}

const DraggableHeader = ({ header, table }: { header: any; table: any }) => {
  const { getState, setColumnOrder } = table;
  const { columnOrder } = getState();
  const { column } = header;

  const ref = useRef<HTMLTableCellElement>(null);

  const [, dropRef] = useDrop({
    accept: "column",
    hover(item: any, monitor) {
      const dragIndex = columnOrder.indexOf(item.id);
      const hoverIndex = columnOrder.indexOf(column.id);

      if (dragIndex === hoverIndex) {
        return;
      }

      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleX = (hoverBoundingRect!.right - hoverBoundingRect!.left) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientX = (clientOffset as XYCoord).x - hoverBoundingRect!.left;

      if (dragIndex < hoverIndex && hoverClientX < hoverMiddleX) {
        return;
      }

      if (dragIndex > hoverIndex && hoverClientX > hoverMiddleX) {
        return;
      }

      const newOrder = [...columnOrder];
      const [removed] = newOrder.splice(dragIndex, 1);
      newOrder.splice(hoverIndex, 0, removed);
      setColumnOrder(newOrder);
    },
  });

  const [{ isDragging }, dragRef] = useDrag({
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    item: () => ({ ...column, id: column.id }),
    type: "column",
  });

  dragRef(dropRef(ref));

  const isSorted = column.getIsSorted();
  const [canSort, setCanSort] = useState(false);

  useEffect(() => {
    setCanSort(header.column.getCanSort());
  }, [header.column]);

  return (
    <TableHead
      ref={ref}
      key={header.id}
      colSpan={header.colSpan}
      className="relative group cursor-grab whitespace-nowrap p-2"
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <div
        {...{
          className: cn("flex items-center gap-2", {
            "cursor-pointer select-none": canSort,
          }),
          onClick: header.column.getToggleSortingHandler(),
        }}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
        {flexRender(header.column.columnDef.header, header.getContext())}
        {isSorted && <ArrowUpDown className="h-4 w-4" />}
      </div>
    </TableHead>
  );
};

interface MediaAssetsTableProps {
  assets: Asset[];
  onRefresh: () => void;
}

export function MediaAssetsTable({ assets, onRefresh }: MediaAssetsTableProps) {
  const navigate = useNavigate();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<string | null>(null);

  const openDeleteDialog = (id: string) => {
    setAssetToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!assetToDelete) return;

    const { error } = await supabase
      .from("media_assets")
      .delete()
      .eq("id", assetToDelete);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete asset",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Asset deleted successfully",
      });
      onRefresh();
    }

    setIsDeleteDialogOpen(false);
    setAssetToDelete(null);
  };

  const columns: ColumnDef<Asset>[] = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "id",
        header: "Asset ID",
        cell: ({ row }) => (
          <button
            onClick={() => navigate(`/admin/media-assets/${row.original.id}`)}
            className="hover:underline font-mono text-xs text-left"
          >
            {row.original.id}
          </button>
        ),
      },
      {
        id: "images",
        header: "Image",
        cell: ImageCell,
        enableSorting: false,
      },
      { accessorKey: "media_id", header: "Municipal ID" },
      {
        accessorKey: "location",
        header: "Location / Landmark",
        cell: ({ row }) => (
          <button
            onClick={() => navigate(`/admin/media-assets/${row.original.id}`)}
            className="hover:underline w-48 truncate block text-left"
            title={row.original.location}
          >
            {row.original.location}
          </button>
        ),
      },
      { accessorKey: "area", header: "Area" },
      { accessorKey: "city", header: "City" },
      { accessorKey: "district", header: "District" },
      { accessorKey: "state", header: "State" },
      { accessorKey: "media_type", header: "Media Type" },
      { accessorKey: "dimensions", header: "Dimensions" },
      {
        accessorKey: "total_sqft",
        header: "Total Sq. Ft.",
        cell: ({ row }) => {
          const value = row.original.total_sqft;
          return value ? value.toFixed(2) : '0.00';
        },
      },
      { accessorKey: "illumination", header: "Illumination" },
      { accessorKey: "direction", header: "Direction" },
      {
        accessorKey: "card_rate",
        header: "Card Rate",
        cell: ({ row }) => formatCurrency(row.original.card_rate),
      },
      {
        accessorKey: "base_rent",
        header: "Base Rent",
        cell: ({ row }) => formatCurrency(row.original.base_rent),
      },
      { accessorKey: "gst_percent", header: "GST %" },
      { accessorKey: "status", header: "Status" },
      {
        accessorKey: "is_public",
        header: "Is Public",
        cell: ({ row }) => (row.original.is_public ? "Yes" : "No"),
      },
      { accessorKey: "ownership", header: "Ownership" },
      { accessorKey: "latitude", header: "Latitude" },
      { accessorKey: "longitude", header: "Longitude" },
      {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => <ActionCell row={row} onDelete={openDeleteDialog} />,
      },
    ],
    [navigate]
  );

  const allColumnKeys = useMemo(
    () => columns.map((c) => c.id || (c as any).accessorKey) as string[],
    [columns]
  );

  const {
    isReady,
    visibleKeys,
    setVisibleKeys,
    columnOrder,
    setColumnOrder,
    reset: resetColumnPrefs,
  } = useColumnPrefs("media-assets", allColumnKeys, [
    "select",
    "id",
    "images",
    "location",
    "city",
    "media_type",
    "dimensions",
    "total_sqft",
    "status",
    "card_rate",
    "actions",
  ]);

  const columnVisibility: VisibilityState = useMemo(() => {
    return allColumnKeys.reduce((acc, key) => {
      acc[key] = visibleKeys.includes(key);
      return acc;
    }, {} as VisibilityState);
  }, [visibleKeys, allColumnKeys]);

  const table = useReactTable({
    data: assets,
    columns,
    state: {
      sorting,
      columnVisibility,
      columnOrder,
      columnFilters,
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: (updater) => {
      const newVisibility =
        typeof updater === "function" ? updater(columnVisibility) : updater;
      const newVisibleKeys = Object.entries(newVisibility)
        .filter(([, val]) => val)
        .map(([key]) => key);
      setVisibleKeys(newVisibleKeys);
    },
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize: 25,
      },
    },
  });

  const handleLocationFilterChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      table.getColumn("location")?.setFilterValue(event.target.value);
    },
    [table]
  );

  const handleAreaFilterChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      table.getColumn("area")?.setFilterValue(event.target.value);
    },
    [table]
  );

  const handleMediaTypeFilterChange = useCallback(
    (value: string) => {
      table.getColumn("media_type")?.setFilterValue(value === "all" ? "" : value);
    },
    [table]
  );

  const handlePageSizeChange = useCallback(
    (value: string) => {
      table.setPageSize(Number(value));
    },
    [table]
  );

  const allColumnsForVisibilityButton = useMemo(() => {
    return columns
      .filter((c) => {
        // Only include columns that can be hidden
        const col = table.getColumn(c.id || (c as any).accessorKey);
        return col?.getCanHide() !== false;
      })
      .map((c) => {
        const colId = c.id || (c as any).accessorKey;
        const header = c.header;
        // Convert header to readable label
        let label = typeof header === "string" ? header : colId;
        
        // If no custom header, convert column id to readable format
        if (label === colId) {
          label = colId
            .split('_')
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        }
        
        return {
          key: colId,
          label: label,
        };
      });
  }, [columns, table]);

  const selectedAssetIds = useMemo(() => {
    return table.getSelectedRowModel().rows.map((row) => row.original.id);
  }, [rowSelection, table]);

  // Get unique media types for filter
  const mediaTypes = useMemo(() => {
    const types = new Set(assets.map((a) => a.media_type).filter(Boolean));
    return Array.from(types).sort();
  }, [assets]);

  if (!isReady) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <DndProvider backend={HTML5Backend}>
        {/* Filters Section - Always Visible */}
        <Card className="border-2 mb-4">
          <CardHeader className="p-4 sm:p-6 bg-muted/20 border-b">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Filter className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg font-semibold">Filters</CardTitle>
              <Button 
                variant="link" 
                size="sm" 
                className="ml-auto text-primary"
                onClick={() => {
                  table.getColumn("location")?.setFilterValue("");
                  table.getColumn("area")?.setFilterValue("");
                  table.getColumn("media_type")?.setFilterValue("");
                }}
              >
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-end gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <Label className="text-sm font-medium mb-2">Location</Label>
                <Input
                  placeholder="Search location..."
                  value={(table.getColumn("location")?.getFilterValue() as string) ?? ""}
                  onChange={handleLocationFilterChange}
                  className="w-full"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <Label className="text-sm font-medium mb-2">Area</Label>
                <Input
                  placeholder="Search area..."
                  value={(table.getColumn("area")?.getFilterValue() as string) ?? ""}
                  onChange={handleAreaFilterChange}
                  className="w-full"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <Label className="text-sm font-medium mb-2">Media Type</Label>
                <Select
                  value={(table.getColumn("media_type")?.getFilterValue() as string) ?? "all"}
                  onValueChange={handleMediaTypeFilterChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Media Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="all">All Media Types</SelectItem>
                    {mediaTypes.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-shrink-0">
                <Label className="text-sm font-medium mb-2 opacity-0 select-none">.</Label>
                <div>
                  <ColumnVisibilityButton
                    allColumns={allColumnsForVisibilityButton}
                    visibleKeys={visibleKeys}
                    onChange={setVisibleKeys}
                    onReset={resetColumnPrefs}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedAssetIds.length > 0 && (
          <Card className="mb-4 bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-lg font-bold text-primary-foreground">{selectedAssetIds.length}</span>
                </div>
                <div>
                  <p className="font-semibold">Assets Selected</p>
                  <p className="text-sm text-muted-foreground">Ready to add to a plan</p>
                </div>
              </div>
              <Button onClick={() => setIsPlanModalOpen(true)} size="lg">
                Add to Plan
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="overflow-hidden border-2 shadow-lg">
          <CardContent className="p-0">
            {/* Horizontal scroll wrapper with custom scrollbar */}
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-500px)] custom-scrollbar">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="hover:bg-transparent">
                      {headerGroup.headers.map((header) => (
                        <DraggableHeader key={header.id} header={header} table={table} />
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow 
                        key={row.id}
                        className="hover:bg-muted/50 transition-colors"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="whitespace-nowrap px-4 py-3">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={table.getAllColumns().length} className="h-32 text-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Layers className="h-12 w-12 opacity-20" />
                          <p className="text-lg font-medium">No assets found</p>
                          <p className="text-sm">Try adjusting your filters</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardContent className="p-4 border-t bg-muted/20">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground font-medium">
                Showing {table.getRowModel().rows.length} of {table.getFilteredRowModel().rows.length} total assets
              </div>
              <div className="flex items-center space-x-4 lg:space-x-8">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium">Rows</p>
                  <Select
                    value={`${table.getState().pagination.pageSize}`}
                    onValueChange={handlePageSizeChange}
                  >
                    <SelectTrigger className="h-9 w-[70px] bg-background">
                      <SelectValue placeholder={table.getState().pagination.pageSize} />
                    </SelectTrigger>
                    <SelectContent side="top">
                      {[10, 25, 50, 100].map((pageSize) => (
                        <SelectItem key={pageSize} value={`${pageSize}`}>
                          {pageSize}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex w-[120px] items-center justify-center text-sm font-medium">
                  Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    className="hidden h-9 w-9 p-0 lg:flex"
                    onClick={() => table.setPageIndex(0)}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <span className="sr-only">Go to first page</span>
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9 w-9 p-0"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <span className="sr-only">Go to previous page</span>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9 w-9 p-0"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    <span className="sr-only">Go to next page</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="hidden h-9 w-9 p-0 lg:flex"
                    onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                    disabled={!table.getCanNextPage()}
                  >
                    <span className="sr-only">Go to last page</span>
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </DndProvider>

      <AddPlanFromAssetsModal
        open={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        assetIds={selectedAssetIds}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the asset.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
