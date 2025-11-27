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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  GripVertical,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Layers,
  Edit3,
  Save,
  Pin,
  PinOff,
  MoreVertical,
} from "lucide-react";
import { DndProvider, useDrag, useDrop, type XYCoord } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useColumnPrefs } from "@/hooks/use-column-prefs";
import { useTableDensity } from "@/hooks/use-table-density";
import { useFrozenColumns } from "@/hooks/use-frozen-columns";
import { useTableSettings, formatCurrency as formatCurrencyUtil, formatDate as formatDateUtil } from "@/hooks/use-table-settings";
import ColumnVisibilityButton from "@/components/common/column-visibility-button";
import { TableFilters } from "@/components/common/table-filters";
import { QuickFilterBar } from "@/components/common/quick-filter-bar";
import { BulkActionsDropdown, commonBulkActions } from "@/components/common/bulk-actions-dropdown";
import { highlightText } from "@/components/common/global-search";
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
  type ColumnResizeMode,
} from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import AddPlanFromAssetsModal from "./add-plan-from-assets-modal";
import { BulkEditDialog } from "./BulkEditDialog";
// import { TableViewsDialog } from "./TableViewsDialog"; // Temporarily disabled until Supabase types regenerate
import { ActionCell, ImageCell } from "./asset-table-cells";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/utils/mediaAssets";
import { isWithinInterval, parseISO } from "date-fns";
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
  created_at?: string;
  updated_at?: string;
}

const DraggableHeader = ({ header, table, isFrozen, onToggleFreeze }: { 
  header: any; 
  table: any; 
  isFrozen: boolean;
  onToggleFreeze: () => void;
}) => {
  const { getState, setColumnOrder } = table;
  const { columnOrder } = getState();
  const { column } = header;

  const ref = useRef<HTMLTableCellElement>(null);

  const [isResizing, setIsResizing] = useState(false);

  const [, dropRef] = useDrop({
    accept: "column",
    hover(item: any, monitor) {
      if (isResizing) return; // Don't reorder while resizing
      
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
    type: "column",
    item: () => ({ id: column.id }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: () => !isResizing,
  });

  dragRef(dropRef(ref));

  return (
    <TableHead
      ref={ref}
      colSpan={header.colSpan}
      style={{ 
        opacity: isDragging ? 0.5 : 1,
        width: header.getSize(),
        position: isFrozen ? 'sticky' : 'relative',
        left: isFrozen ? 0 : undefined,
        zIndex: isFrozen ? 30 : 20,
        backgroundColor: 'hsl(var(--background))',
        boxShadow: isFrozen ? '2px 0 4px rgba(0,0,0,0.1)' : undefined,
      }}
      className={cn(
        "cursor-move select-none",
        isFrozen && "bg-muted/30"
      )}
    >
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={onToggleFreeze}>
              {isFrozen ? (
                <>
                  <PinOff className="mr-2 h-4 w-4" />
                  Unfreeze Column
                </>
              ) : (
                <>
                  <Pin className="mr-2 h-4 w-4" />
                  Freeze Column
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={header.column.getToggleSortingHandler()}>
              <ArrowUpDown className="mr-2 h-4 w-4" />
              Sort
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <GripVertical className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center flex-1">
          {flexRender(header.column.columnDef.header, header.getContext())}
          {isFrozen && <Pin className="ml-2 h-3 w-3 text-primary" />}
        </div>
      </div>
      {/* Column Resize Handle */}
      <div
        onMouseDown={header.getResizeHandler()}
        onTouchStart={header.getResizeHandler()}
        onMouseEnter={() => setIsResizing(false)}
        onMouseLeave={() => setIsResizing(false)}
        className={cn(
          "absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none",
          "hover:bg-primary/50 active:bg-primary",
          header.column.getIsResizing() && "bg-primary"
        )}
        style={{
          transform: header.column.getIsResizing() ? 'scaleX(2)' : undefined,
          userSelect: 'none',
        }}
      />
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
  const [globalSearchFiltered, setGlobalSearchFiltered] = useState<Asset[]>(assets);
  
  // Bulk Edit Dialog
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  
  // Table Views Dialog - Temporarily disabled
  // const [isTableViewsOpen, setIsTableViewsOpen] = useState(false);
  
  // Advanced filter states
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<any>();
  const [quickFilterStatus, setQuickFilterStatus] = useState<string>("");
  const [quickFilterCity, setQuickFilterCity] = useState<string>("");

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

  const handleBulkAction = async (actionId: string) => {
    const selectedIds = table.getSelectedRowModel().rows.map(row => row.original.id);
    
    if (actionId === "delete") {
      const { error } = await supabase
        .from("media_assets")
        .delete()
        .in("id", selectedIds);

      if (error) throw error;
      
      onRefresh();
      table.resetRowSelection();
    } else if (actionId === "export") {
      const selectedAssets = table.getSelectedRowModel().rows.map(row => row.original);
      // Export logic here - you can use existing export utilities
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(selectedAssets);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Assets");
      XLSX.writeFile(wb, "media-assets-export.xlsx");
    } else if (actionId === "addToPlan") {
      setIsPlanModalOpen(true);
    }
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
        cell: ({ row, table }) => {
          const globalFilter = (table.getState() as any).globalFilter || "";
          return (
            <button
              onClick={() => navigate(`/admin/media-assets/${row.original.id}`)}
              className="hover:underline font-mono text-xs text-left"
            >
              {highlightText(row.original.id, globalFilter)}
            </button>
          );
        },
      },
      {
        id: "images",
        header: "Image",
        cell: ImageCell,
        enableSorting: false,
      },
      {
        id: "qr_code",
        header: "QR Code",
        cell: ({ row }) => {
          const qrUrl = (row.original as any).qr_code_url;
          return qrUrl ? (
            <div className="flex justify-center">
              <img
                src={qrUrl}
                alt="QR Code"
                className="w-12 h-12 object-contain border border-border rounded"
              />
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          );
        },
        enableSorting: false,
      },
      { 
        accessorKey: "media_id", 
        header: "Municipal ID",
        cell: ({ row, table }) => {
          const globalFilter = (table.getState() as any).globalFilter || "";
          return row.original.media_id ? highlightText(row.original.media_id, globalFilter) : "-";
        },
      },
      {
        accessorKey: "location",
        header: "Location / Landmark",
        cell: ({ row, table }) => {
          const globalFilter = (table.getState() as any).globalFilter || "";
          return (
            <button
              onClick={() => navigate(`/admin/media-assets/${row.original.id}`)}
              className="hover:underline w-48 truncate block text-left"
              title={row.original.location}
            >
              {highlightText(row.original.location, globalFilter)}
            </button>
          );
        },
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
        cell: ({ row }) => {
          if (!settingsReady) return formatCurrency(row.original.card_rate);
          return formatCurrencyUtil(
            row.original.card_rate,
            settings.currencyFormat,
            settings.currencySymbol,
            settings.compactNumbers
          );
        },
      },
      {
        accessorKey: "base_rent",
        header: "Base Rent",
        cell: ({ row }) => {
          if (!settingsReady) return formatCurrency(row.original.base_rent);
          return formatCurrencyUtil(
            row.original.base_rent,
            settings.currencyFormat,
            settings.currencySymbol,
            settings.compactNumbers
          );
        },
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
        cell: ({ row }) => <ActionCell row={row} onDelete={openDeleteDialog} onQRGenerated={onRefresh} />,
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
    "actions",
    "images",
    "location",
    "area",
    "city",
    "media_type",
    "dimensions",
    "total_sqft",
    "status",
    "card_rate",
  ]);

  const { density, setDensity, getRowClassName, getCellClassName } = useTableDensity("media-assets");
  
  const { 
    frozenColumns, 
    toggleFrozen,
    isFrozen,
    isReady: frozenReady 
  } = useFrozenColumns("media-assets");
  
  const { 
    settings, 
    updateSettings, 
    resetSettings,
    isReady: settingsReady 
  } = useTableSettings("media-assets");

  // Auto-refresh functionality
  useEffect(() => {
    if (!settingsReady || settings.autoRefreshInterval === 0) return;

    const interval = setInterval(() => {
      onRefresh();
    }, settings.autoRefreshInterval * 1000);

    return () => clearInterval(interval);
  }, [settings.autoRefreshInterval, settingsReady, onRefresh]);

  // Apply advanced filters
  const filteredData = useMemo(() => {
    let filtered = globalSearchFiltered;

    // Multi-select status filter
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter((asset) => selectedStatuses.includes(asset.status));
    }

    // Date range filter
    if (dateRange?.from) {
      filtered = filtered.filter((asset) => {
        if (!asset.created_at) return false;
        const assetDate = parseISO(asset.created_at);
        if (dateRange.to) {
          return isWithinInterval(assetDate, { start: dateRange.from, end: dateRange.to });
        }
        return assetDate >= dateRange.from;
      });
    }

    return filtered;
  }, [globalSearchFiltered, selectedStatuses, dateRange]);

  const columnVisibility: VisibilityState = useMemo(() => {
    return allColumnKeys.reduce((acc, key) => {
      acc[key] = visibleKeys.includes(key);
      return acc;
    }, {} as VisibilityState);
  }, [visibleKeys, allColumnKeys]);

  const columnResizeMode: ColumnResizeMode = "onChange";

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnVisibility,
      columnOrder,
      columnFilters,
      rowSelection,
      globalFilter: "", // For tracking in cells
    } as any,
    enableRowSelection: true,
    enableColumnResizing: true,
    columnResizeMode,
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
        pageSize: settingsReady ? settings.defaultPageSize : 50,
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

  // Get unique media types, statuses, and cities for filters
  const mediaTypes = useMemo(() => {
    const types = new Set(assets.map((a) => a.media_type).filter(Boolean));
    return Array.from(types).sort();
  }, [assets]);

  const statusOptions = useMemo(() => {
    const statuses = new Set(assets.map((a) => a.status).filter(Boolean));
    return Array.from(statuses).sort();
  }, [assets]);

  const cityOptions = useMemo(() => {
    const cities = new Set(assets.map((a) => a.city).filter(Boolean));
    return Array.from(cities).sort();
  }, [assets]);

  const getCurrentTableConfig = () => ({
    columnOrder,
    columnVisibility,
    sorting,
    columnSizes: table.getAllColumns().reduce((acc, col) => {
      acc[col.id] = col.getSize();
      return acc;
    }, {} as Record<string, number>),
    frozenColumns,
    density,
  });

  const handleLoadTableView = (config: any) => {
    if (config.columnOrder) setColumnOrder(config.columnOrder);
    if (config.sorting) setSorting(config.sorting);
    if (config.density) setDensity(config.density);
    
    // Note: Column sizes are stored but need to be reapplied manually after table remounts
    // The column resize state is managed by TanStack Table internally
    toast({
      title: "View Loaded",
      description: "Table configuration has been applied",
    });
  };

  if (!isReady || !settingsReady || !frozenReady) {
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

  const filterConfigs: any[] = [
    {
      key: "location",
      label: "Location",
      type: "text",
      placeholder: "Search location...",
    },
    {
      key: "area",
      label: "Area",
      type: "text",
      placeholder: "Search area...",
    },
    {
      key: "media_type",
      label: "Media Type",
      type: "select",
      options: mediaTypes,
    },
    {
      key: "status",
      label: "Status",
      type: "multi-select",
      options: statusOptions,
      placeholder: "Select statuses...",
    },
    {
      key: "created_at",
      label: "Created Date",
      type: "date-range",
      placeholder: "Pick a date range...",
    },
  ];

  const filterValues = {
    location: (table.getColumn("location")?.getFilterValue() as string) ?? "",
    area: (table.getColumn("area")?.getFilterValue() as string) ?? "",
    media_type: (table.getColumn("media_type")?.getFilterValue() as string) ?? "",
    status: selectedStatuses,
    created_at: dateRange,
  };

  const handleFilterChange = (key: string, value: any) => {
    if (key === "location") handleLocationFilterChange({ target: { value } } as any);
    else if (key === "area") handleAreaFilterChange({ target: { value } } as any);
    else if (key === "media_type") handleMediaTypeFilterChange(value);
    else if (key === "status") setSelectedStatuses(value);
    else if (key === "created_at") setDateRange(value);
  };

  const handleClearFilters = () => {
    table.getColumn("location")?.setFilterValue("");
    table.getColumn("area")?.setFilterValue("");
    table.getColumn("media_type")?.setFilterValue("");
    setSelectedStatuses([]);
    setDateRange(undefined);
    setQuickFilterStatus("");
    setQuickFilterCity("");
  };

  const handleQuickFilterStatusChange = (status: string) => {
    setQuickFilterStatus(status);
    if (status) {
      setSelectedStatuses([status]);
    } else {
      setSelectedStatuses([]);
    }
  };

  const handleQuickFilterCityChange = (city: string) => {
    setQuickFilterCity(city);
    table.getColumn("city")?.setFilterValue(city);
  };

  const handleQuickClearAll = () => {
    setQuickFilterStatus("");
    setQuickFilterCity("");
    handleClearFilters();
  };

  return (
    <>
      <DndProvider backend={HTML5Backend}>
        {/* Quick Filter Bar */}
        <QuickFilterBar
          statusOptions={statusOptions}
          cityOptions={cityOptions}
          selectedStatus={quickFilterStatus}
          selectedCity={quickFilterCity}
          onStatusChange={handleQuickFilterStatusChange}
          onCityChange={handleQuickFilterCityChange}
          onClearAll={handleQuickClearAll}
          activeFiltersCount={Object.values(filterValues).filter(v => 
            Array.isArray(v) ? v.length > 0 : v !== "" && v !== undefined
          ).length}
        />

        {/* Advanced Filters */}
        <TableFilters
          filters={filterConfigs}
          filterValues={filterValues}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          allColumns={allColumnsForVisibilityButton}
          visibleColumns={visibleKeys}
          onColumnVisibilityChange={setVisibleKeys}
          onResetColumns={resetColumnPrefs}
          density={density}
          onDensityChange={setDensity}
          tableKey="media-assets"
          settings={settings}
          onUpdateSettings={updateSettings}
          onResetSettings={resetSettings}
        />

        {selectedAssetIds.length > 0 && (
          <Card className="mb-4 bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-lg font-bold text-primary-foreground">{selectedAssetIds.length}</span>
                </div>
                <div>
                  <p className="font-semibold">Assets Selected</p>
                  <p className="text-sm text-muted-foreground">Ready for bulk actions</p>
                </div>
              </div>
              <BulkActionsDropdown
                selectedCount={selectedAssetIds.length}
                actions={[
                  { id: "bulkEdit", label: "Bulk Edit", icon: Edit3 },
                  commonBulkActions.addToPlan,
                  commonBulkActions.export,
                  commonBulkActions.delete,
                ]}
                onAction={handleBulkAction}
              />
            </CardContent>
          </Card>
        )}

        <Card className="h-full flex flex-col overflow-hidden border-2 shadow-lg">
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            {/* Scrollable table area */}
            <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 380px)' }}>
              <Table style={{ width: table.getCenterTotalSize() }}>
                <TableHeader className="sticky top-0 z-20 bg-background shadow-sm">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead
                            key={header.id}
                            colSpan={header.colSpan}
                            style={{
                              width: header.getSize(),
                              minWidth: header.column.columnDef.minSize,
                              maxWidth: header.column.columnDef.maxSize,
                            }}
                            className={cn(
                              getCellClassName(),
                              "group relative",
                              isFrozen(header.column.id) && "bg-muted/30"
                            )}
                          >
                            {header.isPlaceholder ? null : (
                              <div className="flex items-center gap-2">
                                {header.column.getCanSort() ? (
                                  <div
                                    className={cn(
                                      "flex-1 flex items-center gap-2 cursor-pointer select-none",
                                      header.column.getIsSorted() && "text-primary font-semibold"
                                    )}
                                    onClick={header.column.getToggleSortingHandler()}
                                  >
                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                    {{
                                      asc: " ↑",
                                      desc: " ↓",
                                    }[header.column.getIsSorted() as string] ?? null}
                                  </div>
                                ) : (
                                  <div className="flex-1">
                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                  </div>
                                )}
                              </div>
                            )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() && "selected"}
                          className={cn(
                            getRowClassName(),
                            "cursor-pointer hover:bg-muted/50 transition-colors"
                          )}
                          onClick={() => navigate(`/admin/media-assets/${row.original.id}`)}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell
                              key={cell.id}
                              style={{
                                width: cell.column.getSize(),
                                minWidth: cell.column.columnDef.minSize,
                                maxWidth: cell.column.columnDef.maxSize,
                              }}
                              className={cn(
                                getCellClassName(),
                                isFrozen(cell.column.id) && "bg-muted/30"
                              )}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="h-24 text-center">
                          No results.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
          </CardContent>
          <CardContent className="flex-none p-4 border-t bg-muted/30">
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
                      {[10, 25, 50, 100, 200].map((pageSize) => (
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

      <BulkEditDialog
        open={isBulkEditOpen}
        onOpenChange={setIsBulkEditOpen}
        selectedAssetIds={selectedAssetIds}
        onSuccess={() => {
          onRefresh();
          setRowSelection({});
        }}
      />

      {/* Temporarily disabled until Supabase types regenerate
      <TableViewsDialog
        open={isTableViewsOpen}
        onOpenChange={setIsTableViewsOpen}
        tableKey="media-assets"
        currentConfig={getCurrentTableConfig()}
        onLoadView={handleLoadTableView}
      />
      */}

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
