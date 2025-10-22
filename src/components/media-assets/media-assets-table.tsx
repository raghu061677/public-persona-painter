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
        cell: ({ row }) => (row.original.total_sqft || 0).toFixed(2),
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
    return table.getAllLeafColumns().map((c) => {
      const header = c.columnDef.header;
      // Convert header to readable label
      let label = typeof header === "string" ? header : c.id;
      
      // If no custom header, convert column id to readable format
      if (label === c.id) {
        label = c.id
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
      
      return {
        key: c.id,
        label: label,
      };
    });
  }, [table]);

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
        <Collapsible className="mb-4">
          <Card>
            <CardHeader className="p-4 border-b">
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between w-full cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    <CardTitle className="text-lg">Filters</CardTitle>
                  </div>
                  <span className="text-sm text-primary hover:underline">Toggle</span>
                </div>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="p-4 flex items-center gap-4 flex-wrap">
                <div className="relative">
                  <Label>Location</Label>
                  <Input
                    placeholder="Search location..."
                    value={(table.getColumn("location")?.getFilterValue() as string) ?? ""}
                    onChange={handleLocationFilterChange}
                    className="max-w-sm"
                  />
                </div>
                <div className="relative">
                  <Label>Area</Label>
                  <Input
                    placeholder="Search area..."
                    value={(table.getColumn("area")?.getFilterValue() as string) ?? ""}
                    onChange={handleAreaFilterChange}
                    className="max-w-sm"
                  />
                </div>
                <div>
                  <Label>Media Type</Label>
                  <Select
                    value={(table.getColumn("media_type")?.getFilterValue() as string) ?? "all"}
                    onValueChange={handleMediaTypeFilterChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Media Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Media Types</SelectItem>
                      {mediaTypes.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="ml-auto">
                  <ColumnVisibilityButton
                    allColumns={allColumnsForVisibilityButton}
                    visibleKeys={visibleKeys}
                    onChange={setVisibleKeys}
                    onReset={resetColumnPrefs}
                  />
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {selectedAssetIds.length > 0 && (
          <div className="mb-4">
            <Button onClick={() => setIsPlanModalOpen(true)}>
              Add {selectedAssetIds.length} Asset(s) to Plan
            </Button>
          </div>
        )}

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <DraggableHeader key={header.id} header={header} table={table} />
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="whitespace-nowrap px-2 py-1">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={table.getAllColumns().length} className="h-24 text-center">
                        No results.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardContent className="p-4 border-t">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {table.getFilteredRowModel().rows.length} rows
              </div>
              <div className="flex items-center space-x-6 lg:space-x-8">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium">Rows per page</p>
                  <Select
                    value={`${table.getState().pagination.pageSize}`}
                    onValueChange={handlePageSizeChange}
                  >
                    <SelectTrigger className="h-8 w-[70px]">
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
                <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                  Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    className="hidden h-8 w-8 p-0 lg:flex"
                    onClick={() => table.setPageIndex(0)}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <span className="sr-only">Go to first page</span>
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <span className="sr-only">Go to previous page</span>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    <span className="sr-only">Go to next page</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="hidden h-8 w-8 p-0 lg:flex"
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
