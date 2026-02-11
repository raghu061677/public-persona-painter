import { useEffect, useState, useMemo, useCallback } from "react";
import { DateRange } from "react-day-picker";
import { format, addMonths } from "date-fns";
import {
  CheckCircle2,
  XCircle,
  ArrowUpDown,
  Clock,
  AlertTriangle,
  MapPin,
  Search,
  RefreshCw,
  Building2,
  DollarSign,
  Calendar,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/utils/mediaAssets";
import { ReportControls, ReportKPICards, ReportEmptyState, ReportExportMenu } from "@/components/reports";
import { useReportFilters } from "@/hooks/useReportFilters";
import { SortConfig } from "@/components/reports/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface BookingInfo {
  campaign_id: string;
  campaign_name: string;
  client_name: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface VacantAsset {
  id: string;
  asset_code: string;
  city: string;
  area: string;
  location: string;
  direction: string;
  media_type: string;
  dimensions: string;
  total_sqft: number;
  illumination: string;
  card_rate: number;
  status: "available" | "booked" | "available_soon";
  next_available_from: string | null;
  current_booking: BookingInfo | null;
}

// Date type options
const DATE_TYPES = [
  { value: "availability", label: "Availability Date" },
  { value: "next_available", label: "Next Available Date" },
];

// Sort options
const SORT_OPTIONS = [
  { value: "location", label: "Location A-Z" },
  { value: "area", label: "Area A-Z" },
  { value: "city", label: "City" },
  { value: "card_rate", label: "Card Rate" },
  { value: "total_sqft", label: "Size (Sq.Ft)" },
];

// Column configuration - 11 standard columns
const COLUMNS = [
  { key: "sno", label: "S.No", default: true },
  { key: "media_type", label: "Media Type", default: true },
  { key: "city", label: "City", default: true },
  { key: "area", label: "Area", default: true },
  { key: "location", label: "Location", default: true },
  { key: "direction", label: "Direction", default: true },
  { key: "dimensions", label: "Dimensions", default: true },
  { key: "total_sqft", label: "Sq.Ft", default: true },
  { key: "illumination", label: "Illumination", default: true },
  { key: "card_rate", label: "Card Rate", default: true },
  { key: "status", label: "Status", default: true },
];

export default function VacantMediaReportV2() {
  const { company } = useCompany();
  const { toast } = useToast();

  // States
  const [loading, setLoading] = useState(false);
  const [allAssets, setAllAssets] = useState<VacantAsset[]>([]);
  const [activeTab, setActiveTab] = useState<"available" | "booked" | "soon">("available");

  // Drilldown state
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<VacantAsset | null>(null);

  // Filters from hook
  const {
    dateType,
    setDateType,
    dateRange,
    setDateRange,
    searchValue,
    setSearchValue,
    selectedFilters,
    handleFilterChange,
    sortConfig,
    setSortConfig,
    resetFilters,
    hasActiveFilters,
  } = useReportFilters({
    defaultDateType: "availability",
    defaultSortField: "location",
    defaultSortDirection: "asc",
    reportKey: "vacant-media-report",
  });

  // Visible columns
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    COLUMNS.filter((c) => c.default).map((c) => c.key)
  );

  // Filter options derived from data
  const filterOptions = useMemo(() => {
    const cities = new Set<string>();
    const areas = new Set<string>();
    const mediaTypes = new Set<string>();

    allAssets.forEach((a) => {
      if (a.city) cities.add(a.city);
      if (a.area) areas.add(a.area);
      if (a.media_type) mediaTypes.add(a.media_type);
    });

    return {
      cities: Array.from(cities).map((c) => ({ value: c, label: c })),
      areas: Array.from(areas).map((a) => ({ value: a, label: a })),
      mediaTypes: Array.from(mediaTypes).map((t) => ({ value: t, label: t })),
    };
  }, [allAssets]);

  // Load data via edge function
  const loadData = useCallback(async () => {
    if (!company?.id) return;

    setLoading(true);
    try {
      const startDate = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
      const endDate = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : format(addMonths(new Date(), 1), "yyyy-MM-dd");

      const { data, error } = await supabase.functions.invoke("get-media-availability", {
        body: {
          company_id: company.id,
          start_date: startDate,
          end_date: endDate,
          city: selectedFilters.cities.length === 1 ? selectedFilters.cities[0] : undefined,
          media_type: selectedFilters.mediaTypes.length === 1 ? selectedFilters.mediaTypes[0] : undefined,
        },
      });

      if (error) throw new Error(error.message || "Failed to fetch availability");

      // Process available assets
      const availableAssets: VacantAsset[] = (data?.available_assets || []).map((a: any) => ({
        id: a.id,
        asset_code: a.media_asset_code || a.id,
        city: a.city,
        area: a.area,
        location: a.location,
        direction: a.direction || "",
        media_type: a.media_type,
        dimensions: a.dimensions || "",
        total_sqft: a.total_sqft || 0,
        illumination: a.illumination_type || "",
        card_rate: a.card_rate || 0,
        status: "available" as const,
        next_available_from: null,
        current_booking: null,
      }));

      // Process booked assets
      const bookedAssets: VacantAsset[] = (data?.booked_assets || []).map((a: any) => ({
        id: a.id,
        asset_code: a.media_asset_code || a.id,
        city: a.city,
        area: a.area,
        location: a.location,
        direction: a.direction || "",
        media_type: a.media_type,
        dimensions: a.dimensions || "",
        total_sqft: a.total_sqft || 0,
        illumination: a.illumination_type || "",
        card_rate: a.card_rate || 0,
        status: "booked" as const,
        next_available_from: a.available_from,
        current_booking: a.current_booking,
      }));

      // Process available soon assets
      const availableSoonAssets: VacantAsset[] = (data?.available_soon_assets || []).map((a: any) => ({
        id: a.id,
        asset_code: a.media_asset_code || a.id,
        city: a.city,
        area: a.area,
        location: a.location,
        direction: a.direction || "",
        media_type: a.media_type,
        dimensions: a.dimensions || "",
        total_sqft: a.total_sqft || 0,
        illumination: a.illumination_type || "",
        card_rate: a.card_rate || 0,
        status: "available_soon" as const,
        next_available_from: a.available_from || a.next_available_from,
        current_booking: a.current_booking,
      }));

      setAllAssets([...availableAssets, ...bookedAssets, ...availableSoonAssets]);

      toast({
        title: "Report Updated",
        description: `Found ${availableAssets.length} available, ${bookedAssets.length} booked, ${availableSoonAssets.length} available soon`,
      });
    } catch (error) {
      console.error("Error loading availability:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load availability report",
        variant: "destructive",
      });
      setAllAssets([]);
    } finally {
      setLoading(false);
    }
  }, [company?.id, dateRange, selectedFilters.cities, selectedFilters.mediaTypes, toast]);

  // Initial load
  useEffect(() => {
    if (company?.id) {
      loadData();
    }
  }, [company?.id]);

  // Filtered and sorted data by tab
  const { availableAssets, bookedAssets, availableSoonAssets } = useMemo(() => {
    let assets = [...allAssets];

    // Search filter
    if (searchValue) {
      const term = searchValue.toLowerCase();
      assets = assets.filter(
        (a) =>
          a.asset_code.toLowerCase().includes(term) ||
          a.location.toLowerCase().includes(term) ||
          a.city.toLowerCase().includes(term) ||
          a.area.toLowerCase().includes(term)
      );
    }

    // City filter
    if (selectedFilters.cities.length > 0) {
      assets = assets.filter((a) => selectedFilters.cities.includes(a.city));
    }

    // Area filter
    if (selectedFilters.areas.length > 0) {
      assets = assets.filter((a) => selectedFilters.areas.includes(a.area));
    }

    // Media type filter
    if (selectedFilters.mediaTypes.length > 0) {
      assets = assets.filter((a) => selectedFilters.mediaTypes.includes(a.media_type));
    }

    // Sorting
    assets.sort((a, b) => {
      const aVal = a[sortConfig.field as keyof VacantAsset];
      const bVal = b[sortConfig.field as keyof VacantAsset];

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortConfig.direction === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });

    return {
      availableAssets: assets.filter((a) => a.status === "available"),
      bookedAssets: assets.filter((a) => a.status === "booked"),
      availableSoonAssets: assets.filter((a) => a.status === "available_soon"),
    };
  }, [allAssets, searchValue, selectedFilters, sortConfig]);

  // Current tab assets
  const currentAssets = useMemo(() => {
    switch (activeTab) {
      case "available":
        return availableAssets;
      case "booked":
        return bookedAssets;
      case "soon":
        return availableSoonAssets;
      default:
        return availableAssets;
    }
  }, [activeTab, availableAssets, bookedAssets, availableSoonAssets]);

  // KPIs
  const kpis = useMemo(() => {
    const totalAvailable = availableAssets.length;
    const totalBooked = bookedAssets.length;
    const totalSoon = availableSoonAssets.length;
    const totalSqft = availableAssets.reduce((sum, a) => sum + a.total_sqft, 0);
    const potentialRevenue = availableAssets.reduce((sum, a) => sum + a.card_rate, 0);

    return [
      {
        label: "Available",
        value: totalAvailable,
        icon: <CheckCircle2 className="h-5 w-5" />,
        color: "success" as const,
      },
      {
        label: "Booked",
        value: totalBooked,
        icon: <XCircle className="h-5 w-5" />,
        color: "danger" as const,
      },
      {
        label: "Available Soon",
        value: totalSoon,
        icon: <Clock className="h-5 w-5" />,
        color: "warning" as const,
      },
      {
        label: "Total Sq.Ft Available",
        value: totalSqft.toLocaleString(),
        icon: <Building2 className="h-5 w-5" />,
      },
      {
        label: "Potential Revenue",
        value: formatCurrency(potentialRevenue),
        icon: <DollarSign className="h-5 w-5" />,
        color: "success" as const,
      },
      {
        label: "Total Inventory",
        value: allAssets.length,
        icon: <MapPin className="h-5 w-5" />,
      },
    ];
  }, [availableAssets, bookedAssets, availableSoonAssets, allAssets]);

  // Handle asset click
  const handleAssetClick = (asset: VacantAsset) => {
    setSelectedAsset(asset);
    setDrilldownOpen(true);
  };

  // Status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Available
          </Badge>
        );
      case "booked":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Booked
          </Badge>
        );
      case "available_soon":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Available Soon
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Export functions
  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Vacant Media");

    // Standard 11-column headers
    const headers = ["S.No", "Media Type", "City", "Area", "Location", "Direction", "Dimensions", "Sq.Ft", "Illumination", "Card Rate", "Status"];
    sheet.addRow(headers);
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };

    currentAssets.forEach((asset, index) => {
      sheet.addRow([
        index + 1,
        asset.media_type,
        asset.city,
        asset.area,
        asset.location,
        asset.direction,
        asset.dimensions,
        asset.total_sqft,
        asset.illumination,
        asset.card_rate,
        asset.status === "available" ? "Available" : asset.status === "booked" ? "Booked" : "Available Soon",
      ]);
    });

    sheet.columns.forEach((col) => { col.width = 16; });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Vacant_Media_Report_${new Date().toISOString().split("T")[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(18);
    doc.text("Vacant Media Report", 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Date Range: ${dateRange?.from ? format(dateRange.from, "dd MMM yyyy") : "-"} to ${dateRange?.to ? format(dateRange.to, "dd MMM yyyy") : "-"}`, 14, 36);

    autoTable(doc, {
      head: [["S.No", "Media Type", "City", "Area", "Location", "Direction", "Dimensions", "Sq.Ft", "Illumination", "Card Rate", "Status"]],
      body: currentAssets.map((asset, index) => [
        index + 1,
        asset.media_type,
        asset.city,
        asset.area,
        asset.location.substring(0, 30),
        asset.direction,
        asset.dimensions,
        asset.total_sqft,
        asset.illumination,
        `Rs. ${asset.card_rate.toLocaleString()}`,
        asset.status === "available" ? "Available" : asset.status === "booked" ? "Booked" : "Available Soon",
      ]),
      startY: 42,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [30, 64, 175] },
    });

    doc.save(`Vacant_Media_Report_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  return (
    <div className="h-full flex flex-col">
      <ReportControls
        reportKey="vacant-media-report"
        reportTitle="Vacant Media Report"
        dateTypes={DATE_TYPES}
        selectedDateType={dateType}
        onDateTypeChange={setDateType}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="Search by ID, location, city, area..."
        filters={filterOptions}
        selectedFilters={selectedFilters}
        onFilterChange={handleFilterChange}
        sortOptions={SORT_OPTIONS}
        sortConfig={sortConfig}
        onSortChange={setSortConfig}
        columns={COLUMNS}
        visibleColumns={visibleColumns}
        onColumnsChange={setVisibleColumns}
        onApply={loadData}
        onReset={async () => resetFilters()}
        loading={loading}
      />

      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Vacant Media Report</h1>
            <p className="text-muted-foreground">Check asset availability for specific date ranges</p>
          </div>
          <ReportExportMenu 
            onExportExcel={handleExportExcel} 
            onExportPDF={handleExportPDF}
            metadata={{
              reportName: "Vacant Media Report",
              generatedAt: new Date(),
              dateRange: dateRange?.from && dateRange?.to ? { from: dateRange.from, to: dateRange.to } : undefined,
              filtersApplied: [
                searchValue && `Search: ${searchValue}`,
                selectedFilters.cities.length > 0 && `Cities: ${selectedFilters.cities.join(", ")}`,
                selectedFilters.areas.length > 0 && `Areas: ${selectedFilters.areas.join(", ")}`,
                selectedFilters.mediaTypes.length > 0 && `Types: ${selectedFilters.mediaTypes.join(", ")}`,
                selectedFilters.statuses.length > 0 && `Statuses: ${selectedFilters.statuses.join(", ")}`,
              ].filter(Boolean) as string[],
            }}
          />
        </div>

        <ReportKPICards kpis={kpis} />

        <Card>
          <CardContent className="pt-6">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="mb-4">
                <TabsTrigger value="available" className="gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Available ({availableAssets.length})
                </TabsTrigger>
                <TabsTrigger value="booked" className="gap-2">
                  <XCircle className="h-4 w-4" />
                  Booked ({bookedAssets.length})
                </TabsTrigger>
                <TabsTrigger value="soon" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Available Soon ({availableSoonAssets.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab}>
                {loading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : currentAssets.length === 0 ? (
                  <ReportEmptyState
                    title={`No ${activeTab === "soon" ? "available soon" : activeTab} assets`}
                    description="Click 'Check Availability' to load results or adjust your filters"
                    onClearFilters={resetFilters}
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">S.No</TableHead>
                          {[
                            { key: "media_type", label: "Media Type" },
                            { key: "city", label: "City" },
                            { key: "area", label: "Area" },
                            { key: "location", label: "Location" },
                            { key: "direction", label: "Direction" },
                            { key: "dimensions", label: "Dimensions" },
                            { key: "total_sqft", label: "Sq.Ft" },
                            { key: "illumination", label: "Illumination" },
                            { key: "card_rate", label: "Card Rate" },
                            { key: "status", label: "Status" },
                          ].map((col) => (
                            <TableHead
                              key={col.key}
                              className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                              onClick={() => setSortConfig({
                                field: col.key,
                                direction: sortConfig.field === col.key && sortConfig.direction === "asc" ? "desc" : "asc",
                              })}
                            >
                              <div className="flex items-center gap-1">
                                <span>{col.label}</span>
                                {sortConfig.field === col.key ? (
                                  <span className="text-xs">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
                                ) : (
                                  <ArrowUpDown className="h-3 w-3 opacity-40" />
                                )}
                              </div>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentAssets.map((asset, index) => (
                          <TableRow
                            key={asset.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleAssetClick(asset)}
                          >
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{asset.media_type}</TableCell>
                            <TableCell>{asset.city}</TableCell>
                            <TableCell>{asset.area}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                {asset.location}
                              </div>
                            </TableCell>
                            <TableCell>{asset.direction || "-"}</TableCell>
                            <TableCell>{asset.dimensions || "-"}</TableCell>
                            <TableCell>{asset.total_sqft}</TableCell>
                            <TableCell>{asset.illumination || "-"}</TableCell>
                            <TableCell className="font-medium">{formatCurrency(asset.card_rate)}</TableCell>
                            <TableCell>{getStatusBadge(asset.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Asset Drilldown Dialog */}
      <Dialog open={drilldownOpen} onOpenChange={setDrilldownOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {selectedAsset?.asset_code} - Asset Details
            </DialogTitle>
          </DialogHeader>
          {selectedAsset && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{selectedAsset.location}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">City / Area</p>
                  <p className="font-medium">{selectedAsset.city} / {selectedAsset.area}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Media Type</p>
                  <p className="font-medium">{selectedAsset.media_type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Direction</p>
                  <p className="font-medium">{selectedAsset.direction || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Dimensions</p>
                  <p className="font-medium">{selectedAsset.dimensions || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Sq.Ft</p>
                  <p className="font-medium">{selectedAsset.total_sqft}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Card Rate</p>
                  <p className="font-medium">{formatCurrency(selectedAsset.card_rate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedAsset.status)}
                </div>
              </div>

              {selectedAsset.current_booking && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Current Booking</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Campaign</p>
                      <p>{selectedAsset.current_booking.campaign_name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Client</p>
                      <p>{selectedAsset.current_booking.client_name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Start Date</p>
                      <p>{new Date(selectedAsset.current_booking.start_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">End Date</p>
                      <p>{new Date(selectedAsset.current_booking.end_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedAsset.next_available_from && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Next available from: <strong>{new Date(selectedAsset.next_available_from).toLocaleDateString()}</strong>
                  </span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
