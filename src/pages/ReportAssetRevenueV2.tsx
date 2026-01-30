import { useEffect, useState, useMemo, useCallback } from "react";
import { DateRange } from "react-day-picker";
import {
  TrendingUp,
  MapPin,
  DollarSign,
  Calendar,
  BarChart3,
  Percent,
  Building2,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { SortConfig, doesRangeOverlap, getPreviousPeriod, calculateTrendPercentage } from "@/components/reports/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface AssetRevenueData {
  asset_id: string;
  asset_code: string;
  location: string;
  city: string;
  area: string;
  media_type: string;
  dimensions: string;
  total_bookings: number;
  total_revenue: number;
  avg_rate: number;
  occupancy_percent: number;
  last_booked_date: string | null;
  total_days_booked: number;
}

interface BookingHistory {
  campaign_id: string;
  campaign_name: string;
  client_name: string;
  start_date: string;
  end_date: string;
  value: number;
  status: string;
}

// Date type options
const DATE_TYPES = [
  { value: "booking_start", label: "Booking Start Date" },
  { value: "booking_end", label: "Booking End Date" },
];

// Sort options
const SORT_OPTIONS = [
  { value: "total_revenue", label: "Total Revenue" },
  { value: "asset_code", label: "Asset Code" },
  { value: "location", label: "Location" },
  { value: "total_bookings", label: "Bookings Count" },
  { value: "occupancy_percent", label: "Occupancy %" },
  { value: "last_booked_date", label: "Last Booked" },
];

// Column configuration
const COLUMNS = [
  { key: "asset_code", label: "Asset Code", default: true },
  { key: "location", label: "Location", default: true },
  { key: "city", label: "City", default: true },
  { key: "media_type", label: "Media Type", default: true },
  { key: "total_bookings", label: "Bookings", default: true },
  { key: "total_revenue", label: "Total Revenue", default: true },
  { key: "avg_rate", label: "Avg Rate", default: true },
  { key: "occupancy_percent", label: "Occupancy %", default: false },
  { key: "last_booked_date", label: "Last Booked", default: true },
];

export default function ReportAssetRevenueV2() {
  const { company } = useCompany();
  const { toast } = useToast();

  // States
  const [loading, setLoading] = useState(false);
  const [assetData, setAssetData] = useState<AssetRevenueData[]>([]);
  const [previousPeriodData, setPreviousPeriodData] = useState<AssetRevenueData[]>([]);

  // Drilldown state
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetRevenueData | null>(null);
  const [bookingHistory, setBookingHistory] = useState<BookingHistory[]>([]);

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
    comparisonEnabled,
    setComparisonEnabled,
    resetFilters,
    hasActiveFilters,
  } = useReportFilters({
    defaultDateType: "booking_start",
    defaultSortField: "total_revenue",
    defaultSortDirection: "desc",
    reportKey: "asset-revenue-report",
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

    assetData.forEach((a) => {
      if (a.city) cities.add(a.city);
      if (a.area) areas.add(a.area);
      if (a.media_type) mediaTypes.add(a.media_type);
    });

    return {
      cities: Array.from(cities).map((c) => ({ value: c, label: c })),
      areas: Array.from(areas).map((a) => ({ value: a, label: a })),
      mediaTypes: Array.from(mediaTypes).map((t) => ({ value: t, label: t })),
    };
  }, [assetData]);

  // Load data
  const loadData = useCallback(async () => {
    if (!company?.id) return;

    setLoading(true);
    try {
      // Fetch campaign assets with campaign details
      const { data: campaignAssets, error } = await supabase
        .from("campaign_assets")
        .select(`
          id,
          asset_id,
          campaign_id,
          location,
          city,
          area,
          media_type,
          dimensions,
          card_rate,
          negotiated_rate,
          total_price,
          start_date,
          end_date,
          booking_start_date,
          booking_end_date,
          campaigns!campaign_assets_campaign_id_fkey (
            id,
            campaign_name,
            client_name,
            start_date,
            end_date,
            status,
            company_id
          )
        `);

      if (error) throw error;

      // Filter by company
      const companyAssets = (campaignAssets || []).filter(
        (a) => a.campaigns?.company_id === company.id
      );

      // Filter by date range
      const filteredAssets = companyAssets.filter((a) => {
        if (!dateRange?.from || !dateRange?.to) return true;

        const startDate = new Date(a.booking_start_date || a.start_date || a.campaigns?.start_date);
        const endDate = new Date(a.booking_end_date || a.end_date || a.campaigns?.end_date);

        switch (dateType) {
          case "booking_start":
            return startDate >= dateRange.from && startDate <= dateRange.to;
          case "booking_end":
            return endDate >= dateRange.from && endDate <= dateRange.to;
          default:
            return doesRangeOverlap(startDate, endDate, dateRange.from, dateRange.to);
        }
      });

      // Fetch media assets for codes
      const assetIds = [...new Set(filteredAssets.map((a) => a.asset_id))];
      let mediaAssetMap = new Map<string, { media_asset_code: string }>();

      if (assetIds.length > 0) {
        const { data: mediaAssets } = await supabase
          .from("media_assets")
          .select("id, media_asset_code")
          .in("id", assetIds);

        mediaAssets?.forEach((ma) => {
          mediaAssetMap.set(ma.id, { media_asset_code: ma.media_asset_code || ma.id });
        });
      }

      // Aggregate by asset
      const assetMap = new Map<string, AssetRevenueData>();
      const periodDays = dateRange?.from && dateRange?.to
        ? Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1
        : 30;

      filteredAssets.forEach((asset) => {
        const assetId = asset.asset_id;
        const existing = assetMap.get(assetId);
        const revenue = asset.total_price || asset.negotiated_rate || asset.card_rate || 0;
        const startDate = new Date(asset.booking_start_date || asset.start_date || asset.campaigns?.start_date);
        const endDate = new Date(asset.booking_end_date || asset.end_date || asset.campaigns?.end_date);
        const bookedDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        if (existing) {
          existing.total_bookings += 1;
          existing.total_revenue += revenue;
          existing.total_days_booked += bookedDays;

          const assetEndDate = asset.booking_end_date || asset.end_date;
          if (!existing.last_booked_date || (assetEndDate && assetEndDate > existing.last_booked_date)) {
            existing.last_booked_date = assetEndDate;
          }
        } else {
          assetMap.set(assetId, {
            asset_id: assetId,
            asset_code: mediaAssetMap.get(assetId)?.media_asset_code || assetId,
            location: asset.location,
            city: asset.city,
            area: asset.area,
            media_type: asset.media_type,
            dimensions: asset.dimensions || "",
            total_bookings: 1,
            total_revenue: revenue,
            avg_rate: revenue,
            occupancy_percent: 0,
            last_booked_date: asset.booking_end_date || asset.end_date,
            total_days_booked: bookedDays,
          });
        }
      });

      // Calculate averages and occupancy
      const assetList = Array.from(assetMap.values()).map((a) => ({
        ...a,
        avg_rate: a.total_bookings > 0 ? a.total_revenue / a.total_bookings : 0,
        occupancy_percent: periodDays > 0 ? Math.min(100, Math.round((a.total_days_booked / periodDays) * 100)) : 0,
      }));

      setAssetData(assetList);

      // Load previous period data for comparison
      if (comparisonEnabled && dateRange?.from && dateRange?.to) {
        const prevPeriod = getPreviousPeriod(dateRange.from, dateRange.to);
        const prevFiltered = companyAssets.filter((a) => {
          const startDate = new Date(a.booking_start_date || a.start_date || a.campaigns?.start_date);
          return startDate >= prevPeriod.from && startDate <= prevPeriod.to;
        });

        const prevAssetMap = new Map<string, AssetRevenueData>();
        prevFiltered.forEach((asset) => {
          const assetId = asset.asset_id;
          const existing = prevAssetMap.get(assetId);
          const revenue = asset.total_price || asset.negotiated_rate || asset.card_rate || 0;

          if (existing) {
            existing.total_bookings += 1;
            existing.total_revenue += revenue;
          } else {
            prevAssetMap.set(assetId, {
              asset_id: assetId,
              asset_code: assetId,
              location: asset.location,
              city: asset.city,
              area: asset.area,
              media_type: asset.media_type,
              dimensions: "",
              total_bookings: 1,
              total_revenue: revenue,
              avg_rate: 0,
              occupancy_percent: 0,
              last_booked_date: null,
              total_days_booked: 0,
            });
          }
        });

        setPreviousPeriodData(Array.from(prevAssetMap.values()));
      }
    } catch (error: any) {
      console.error("Error loading asset revenue data:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load asset revenue data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [company?.id, dateRange, dateType, comparisonEnabled, toast]);

  // Load booking history for drilldown
  const loadBookingHistory = async (assetId: string) => {
    try {
      const { data, error } = await supabase
        .from("campaign_assets")
        .select(`
          campaign_id,
          total_price,
          negotiated_rate,
          card_rate,
          booking_start_date,
          booking_end_date,
          campaigns!campaign_assets_campaign_id_fkey (
            campaign_name,
            client_name,
            start_date,
            end_date,
            status
          )
        `)
        .eq("asset_id", assetId)
        .order("booking_start_date", { ascending: false });

      if (error) throw error;

      setBookingHistory(
        (data || []).map((b) => ({
          campaign_id: b.campaign_id,
          campaign_name: b.campaigns?.campaign_name || "",
          client_name: b.campaigns?.client_name || "",
          start_date: b.booking_start_date || b.campaigns?.start_date || "",
          end_date: b.booking_end_date || b.campaigns?.end_date || "",
          value: b.total_price || b.negotiated_rate || b.card_rate || 0,
          status: b.campaigns?.status || "",
        }))
      );
    } catch (error) {
      console.error("Error loading booking history:", error);
    }
  };

  // Initial load
  useEffect(() => {
    loadData();
  }, []);

  // Filtered and sorted data
  const filteredData = useMemo(() => {
    let result = [...assetData];

    // Search filter
    if (searchValue) {
      const term = searchValue.toLowerCase();
      result = result.filter(
        (a) =>
          a.asset_code.toLowerCase().includes(term) ||
          a.location.toLowerCase().includes(term) ||
          a.city.toLowerCase().includes(term) ||
          a.area.toLowerCase().includes(term)
      );
    }

    // City filter
    if (selectedFilters.cities.length > 0) {
      result = result.filter((a) => selectedFilters.cities.includes(a.city));
    }

    // Area filter
    if (selectedFilters.areas.length > 0) {
      result = result.filter((a) => selectedFilters.areas.includes(a.area));
    }

    // Media type filter
    if (selectedFilters.mediaTypes.length > 0) {
      result = result.filter((a) => selectedFilters.mediaTypes.includes(a.media_type));
    }

    // Sorting
    result.sort((a, b) => {
      const aVal = a[sortConfig.field as keyof AssetRevenueData];
      const bVal = b[sortConfig.field as keyof AssetRevenueData];

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortConfig.direction === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });

    return result;
  }, [assetData, searchValue, selectedFilters, sortConfig]);

  // KPIs
  const kpis = useMemo(() => {
    const totalAssets = filteredData.length;
    const totalBookings = filteredData.reduce((sum, a) => sum + a.total_bookings, 0);
    const totalRevenue = filteredData.reduce((sum, a) => sum + a.total_revenue, 0);
    const avgRate = totalBookings > 0 ? totalRevenue / totalBookings : 0;
    const avgOccupancy = totalAssets > 0
      ? Math.round(filteredData.reduce((sum, a) => sum + a.occupancy_percent, 0) / totalAssets)
      : 0;

    // Previous period calculations
    const prevTotalRevenue = previousPeriodData.reduce((sum, a) => sum + a.total_revenue, 0);
    const prevTotalBookings = previousPeriodData.reduce((sum, a) => sum + a.total_bookings, 0);

    const revenueTrend = comparisonEnabled && prevTotalRevenue > 0
      ? calculateTrendPercentage(totalRevenue, prevTotalRevenue)
      : undefined;
    const bookingsTrend = comparisonEnabled && prevTotalBookings > 0
      ? calculateTrendPercentage(totalBookings, prevTotalBookings)
      : undefined;

    // Top city by revenue
    const cityRevenue = new Map<string, number>();
    filteredData.forEach((a) => {
      cityRevenue.set(a.city, (cityRevenue.get(a.city) || 0) + a.total_revenue);
    });
    const topCity = [...cityRevenue.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "-";

    return [
      {
        label: "Total Assets",
        value: totalAssets,
        icon: <Building2 className="h-5 w-5" />,
      },
      {
        label: "Total Bookings",
        value: totalBookings,
        icon: <Calendar className="h-5 w-5" />,
        trend: bookingsTrend !== undefined
          ? { value: bookingsTrend, direction: bookingsTrend >= 0 ? "up" as const : "down" as const }
          : undefined,
      },
      {
        label: "Total Revenue",
        value: formatCurrency(totalRevenue),
        icon: <DollarSign className="h-5 w-5" />,
        trend: revenueTrend !== undefined
          ? { value: revenueTrend, direction: revenueTrend >= 0 ? "up" as const : "down" as const }
          : undefined,
        color: "success" as const,
      },
      {
        label: "Avg Revenue/Booking",
        value: formatCurrency(avgRate),
        icon: <TrendingUp className="h-5 w-5" />,
      },
      {
        label: "Avg Occupancy",
        value: `${avgOccupancy}%`,
        icon: <Percent className="h-5 w-5" />,
      },
      {
        label: "Top Revenue City",
        value: topCity,
        icon: <MapPin className="h-5 w-5" />,
      },
    ];
  }, [filteredData, previousPeriodData, comparisonEnabled]);

  // Handle asset click for drilldown
  const handleAssetClick = (asset: AssetRevenueData) => {
    setSelectedAsset(asset);
    loadBookingHistory(asset.asset_id);
    setDrilldownOpen(true);
  };

  // Export functions
  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Asset Revenue");

    const headers = COLUMNS.filter((c) => visibleColumns.includes(c.key)).map((c) => c.label);
    sheet.addRow(headers);
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };

    filteredData.forEach((asset) => {
      const row: any[] = [];
      COLUMNS.filter((c) => visibleColumns.includes(c.key)).forEach((col) => {
        switch (col.key) {
          case "asset_code": row.push(asset.asset_code); break;
          case "location": row.push(asset.location); break;
          case "city": row.push(asset.city); break;
          case "media_type": row.push(asset.media_type); break;
          case "total_bookings": row.push(asset.total_bookings); break;
          case "total_revenue": row.push(asset.total_revenue); break;
          case "avg_rate": row.push(asset.avg_rate); break;
          case "occupancy_percent": row.push(`${asset.occupancy_percent}%`); break;
          case "last_booked_date":
            row.push(asset.last_booked_date ? new Date(asset.last_booked_date).toLocaleDateString() : "-");
            break;
        }
      });
      sheet.addRow(row);
    });

    sheet.columns.forEach((col) => { col.width = 18; });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Asset_Revenue_Report_${new Date().toISOString().split("T")[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Asset Revenue Report", 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

    autoTable(doc, {
      head: [COLUMNS.filter((c) => visibleColumns.includes(c.key)).map((c) => c.label)],
      body: filteredData.map((asset) => {
        const row: string[] = [];
        COLUMNS.filter((c) => visibleColumns.includes(c.key)).forEach((col) => {
          switch (col.key) {
            case "asset_code": row.push(asset.asset_code); break;
            case "location": row.push(asset.location); break;
            case "city": row.push(asset.city); break;
            case "media_type": row.push(asset.media_type); break;
            case "total_bookings": row.push(String(asset.total_bookings)); break;
            case "total_revenue": row.push(formatCurrency(asset.total_revenue)); break;
            case "avg_rate": row.push(formatCurrency(asset.avg_rate)); break;
            case "occupancy_percent": row.push(`${asset.occupancy_percent}%`); break;
            case "last_booked_date":
              row.push(asset.last_booked_date ? new Date(asset.last_booked_date).toLocaleDateString() : "-");
              break;
          }
        });
        return row;
      }),
      startY: 38,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 64, 175] },
    });

    doc.save(`Asset_Revenue_Report_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  return (
    <div className="h-full flex flex-col">
      <ReportControls
        reportKey="asset-revenue-report"
        reportTitle="Asset Revenue Report"
        dateTypes={DATE_TYPES}
        selectedDateType={dateType}
        onDateTypeChange={setDateType}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        showComparison
        comparisonEnabled={comparisonEnabled}
        onComparisonChange={setComparisonEnabled}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="Search assets, location, city..."
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
            <h1 className="text-3xl font-bold tracking-tight">Asset-wise Revenue</h1>
            <p className="text-muted-foreground">Analyze revenue generation by media asset</p>
          </div>
          <ReportExportMenu onExportExcel={handleExportExcel} onExportPDF={handleExportPDF} />
        </div>

        <ReportKPICards kpis={kpis} />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Asset Revenue Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredData.length === 0 ? (
              <ReportEmptyState
                title="No asset revenue data"
                description="No assets found for the selected filters"
                onClearFilters={resetFilters}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {visibleColumns.includes("asset_code") && <TableHead>Asset Code</TableHead>}
                    {visibleColumns.includes("location") && <TableHead>Location</TableHead>}
                    {visibleColumns.includes("city") && <TableHead>City</TableHead>}
                    {visibleColumns.includes("media_type") && <TableHead>Media Type</TableHead>}
                    {visibleColumns.includes("total_bookings") && <TableHead>Bookings</TableHead>}
                    {visibleColumns.includes("total_revenue") && <TableHead>Total Revenue</TableHead>}
                    {visibleColumns.includes("avg_rate") && <TableHead>Avg Rate</TableHead>}
                    {visibleColumns.includes("occupancy_percent") && <TableHead>Occupancy</TableHead>}
                    {visibleColumns.includes("last_booked_date") && <TableHead>Last Booked</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((asset) => (
                    <TableRow
                      key={asset.asset_id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleAssetClick(asset)}
                    >
                      {visibleColumns.includes("asset_code") && (
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {asset.asset_code}
                            <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.includes("location") && (
                        <TableCell>
                          <div className="flex items-start gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
                            <div className="text-sm">
                              <div>{asset.location}</div>
                              <div className="text-xs text-muted-foreground">{asset.area}</div>
                            </div>
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.includes("city") && <TableCell>{asset.city}</TableCell>}
                      {visibleColumns.includes("media_type") && <TableCell>{asset.media_type}</TableCell>}
                      {visibleColumns.includes("total_bookings") && <TableCell>{asset.total_bookings}</TableCell>}
                      {visibleColumns.includes("total_revenue") && (
                        <TableCell className="font-medium text-emerald-600">
                          {formatCurrency(asset.total_revenue)}
                        </TableCell>
                      )}
                      {visibleColumns.includes("avg_rate") && (
                        <TableCell>{formatCurrency(asset.avg_rate)}</TableCell>
                      )}
                      {visibleColumns.includes("occupancy_percent") && (
                        <TableCell>
                          <Badge
                            variant={asset.occupancy_percent > 70 ? "default" : asset.occupancy_percent > 30 ? "secondary" : "outline"}
                          >
                            {asset.occupancy_percent}%
                          </Badge>
                        </TableCell>
                      )}
                      {visibleColumns.includes("last_booked_date") && (
                        <TableCell>
                          {asset.last_booked_date
                            ? new Date(asset.last_booked_date).toLocaleDateString()
                            : "-"}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Asset Drilldown Dialog */}
      <Dialog open={drilldownOpen} onOpenChange={setDrilldownOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {selectedAsset?.asset_code} - Asset Details
            </DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="overview" className="flex-1 overflow-hidden">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="bookings">Booking History</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="mt-4 space-y-4">
              {selectedAsset && (
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
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="font-medium text-emerald-600">{formatCurrency(selectedAsset.total_revenue)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Bookings</p>
                    <p className="font-medium">{selectedAsset.total_bookings}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Occupancy</p>
                    <p className="font-medium">{selectedAsset.occupancy_percent}%</p>
                  </div>
                </div>
              )}
            </TabsContent>
            <TabsContent value="bookings" className="mt-4 overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookingHistory.map((booking, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{booking.campaign_name}</TableCell>
                      <TableCell>{booking.client_name}</TableCell>
                      <TableCell>{new Date(booking.start_date).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(booking.end_date).toLocaleDateString()}</TableCell>
                      <TableCell>{formatCurrency(booking.value)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{booking.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
