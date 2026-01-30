import { useEffect, useState, useMemo, useCallback } from "react";
import { DateRange } from "react-day-picker";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  Calendar,
  DollarSign,
  MapPin,
  Camera,
  Users,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Building2,
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

interface CampaignBookingData {
  id: string;
  campaign_name: string;
  client_id: string;
  client_name: string;
  start_date: string;
  end_date: string;
  status: string;
  total_assets: number;
  total_value: number;
  proof_progress: number;
  cities: string[];
}

interface CampaignAssetRow {
  asset_id: string;
  asset_code: string;
  location: string;
  city: string;
  media_type: string;
  card_rate: number;
  status: string;
}

// Date type options
const DATE_TYPES = [
  { value: "campaign_start", label: "Campaign Start Date" },
  { value: "campaign_end", label: "Campaign End Date" },
  { value: "created", label: "Campaign Created Date" },
];

// Sort options
const SORT_OPTIONS = [
  { value: "start_date", label: "Start Date" },
  { value: "campaign_name", label: "Campaign Name" },
  { value: "client_name", label: "Client Name" },
  { value: "total_value", label: "Total Value" },
  { value: "total_assets", label: "Assets Count" },
  { value: "proof_progress", label: "Proof Progress" },
];

// Column configuration
const COLUMNS = [
  { key: "campaign_name", label: "Campaign", default: true },
  { key: "client_name", label: "Client", default: true },
  { key: "start_date", label: "Start Date", default: true },
  { key: "end_date", label: "End Date", default: true },
  { key: "cities", label: "City/Area", default: true },
  { key: "total_assets", label: "Assets", default: true },
  { key: "total_value", label: "Total Value", default: true },
  { key: "status", label: "Status", default: true },
  { key: "proof_progress", label: "Proof %", default: false },
];

export default function ReportCampaignBookingsV2() {
  const { company } = useCompany();
  const { toast } = useToast();
  const navigate = useNavigate();

  // States
  const [loading, setLoading] = useState(false);
  const [campaignData, setCampaignData] = useState<CampaignBookingData[]>([]);
  const [previousPeriodData, setPreviousPeriodData] = useState<CampaignBookingData[]>([]);

  // Drilldown state
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignBookingData | null>(null);
  const [campaignAssets, setCampaignAssets] = useState<CampaignAssetRow[]>([]);

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
    defaultDateType: "campaign_start",
    defaultSortField: "start_date",
    defaultSortDirection: "desc",
    reportKey: "campaign-bookings-report",
  });

  // Visible columns
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    COLUMNS.filter((c) => c.default).map((c) => c.key)
  );

  // Filter options derived from data
  const filterOptions = useMemo(() => {
    const cities = new Set<string>();
    const statuses = new Set<string>();
    const clients = new Map<string, number>();

    campaignData.forEach((c) => {
      c.cities.forEach((city) => cities.add(city));
      statuses.add(c.status);
      clients.set(c.client_name, (clients.get(c.client_name) || 0) + 1);
    });

    return {
      cities: Array.from(cities).map((c) => ({ value: c, label: c })),
      statuses: Array.from(statuses).map((s) => ({ value: s, label: s })),
      clients: Array.from(clients.entries()).map(([name, count]) => ({
        value: name,
        label: name,
        count,
      })),
    };
  }, [campaignData]);

  // Load data
  const loadData = useCallback(async () => {
    if (!company?.id) return;

    setLoading(true);
    try {
      // Fetch campaigns with assets
      const { data: campaigns, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("company_id", company.id)
        .order("start_date", { ascending: false });

      if (error) throw error;

      // Filter by date range
      const filteredCampaigns = (campaigns || []).filter((c) => {
        if (!dateRange?.from || !dateRange?.to) return true;

        const startDate = new Date(c.start_date);
        const endDate = new Date(c.end_date);
        const createdAt = new Date(c.created_at);

        switch (dateType) {
          case "campaign_start":
            return startDate >= dateRange.from && startDate <= dateRange.to;
          case "campaign_end":
            return endDate >= dateRange.from && endDate <= dateRange.to;
          case "created":
            return createdAt >= dateRange.from && createdAt <= dateRange.to;
          default:
            return doesRangeOverlap(startDate, endDate, dateRange.from, dateRange.to);
        }
      });

      // Fetch campaign assets for proof progress and cities
      const campaignIds = filteredCampaigns.map((c) => c.id);
      let assetData: { campaign_id: string; status: string; city: string }[] = [];

      if (campaignIds.length > 0) {
        const { data: assets } = await supabase
          .from("campaign_assets")
          .select("campaign_id, status, city")
          .in("campaign_id", campaignIds);
        assetData = assets || [];
      }

      // Build campaign data
      const campaignList: CampaignBookingData[] = filteredCampaigns.map((campaign) => {
        const assets = assetData.filter((a) => a.campaign_id === campaign.id);
        const totalAssets = assets.length;
        const verifiedAssets = assets.filter((a) => a.status === "Verified" || a.status === "PhotoUploaded").length;
        const proofProgress = totalAssets > 0 ? Math.round((verifiedAssets / totalAssets) * 100) : 0;
        const cities = [...new Set(assets.map((a) => a.city).filter(Boolean))];

        return {
          id: campaign.id,
          campaign_name: campaign.campaign_name,
          client_id: campaign.client_id,
          client_name: campaign.client_name,
          start_date: campaign.start_date,
          end_date: campaign.end_date,
          status: campaign.status,
          total_assets: campaign.total_assets || totalAssets,
          total_value: campaign.grand_total || 0,
          proof_progress: proofProgress,
          cities,
        };
      });

      setCampaignData(campaignList);

      // Previous period data
      if (comparisonEnabled && dateRange?.from && dateRange?.to) {
        const prevPeriod = getPreviousPeriod(dateRange.from, dateRange.to);
        const prevFiltered = (campaigns || []).filter((c) => {
          const startDate = new Date(c.start_date);
          return startDate >= prevPeriod.from && startDate <= prevPeriod.to;
        });

        setPreviousPeriodData(
          prevFiltered.map((c) => ({
            id: c.id,
            campaign_name: c.campaign_name,
            client_id: c.client_id,
            client_name: c.client_name,
            start_date: c.start_date,
            end_date: c.end_date,
            status: c.status,
            total_assets: c.total_assets || 0,
            total_value: c.grand_total || 0,
            proof_progress: 0,
            cities: [],
          }))
        );
      }
    } catch (error: any) {
      console.error("Error loading campaign bookings:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load campaign bookings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [company?.id, dateRange, dateType, comparisonEnabled, toast]);

  // Load campaign assets for drilldown
  const loadCampaignAssets = async (campaignId: string) => {
    try {
      const { data, error } = await supabase
        .from("campaign_assets")
        .select("asset_id, location, city, media_type, card_rate, status")
        .eq("campaign_id", campaignId);

      if (error) throw error;

      // Get asset codes
      const assetIds = (data || []).map((a) => a.asset_id);
      let mediaAssetMap = new Map<string, string>();

      if (assetIds.length > 0) {
        const { data: mediaAssets } = await supabase
          .from("media_assets")
          .select("id, media_asset_code")
          .in("id", assetIds);

        mediaAssets?.forEach((ma) => {
          mediaAssetMap.set(ma.id, ma.media_asset_code || ma.id);
        });
      }

      setCampaignAssets(
        (data || []).map((a) => ({
          asset_id: a.asset_id,
          asset_code: mediaAssetMap.get(a.asset_id) || a.asset_id,
          location: a.location,
          city: a.city,
          media_type: a.media_type,
          card_rate: a.card_rate,
          status: a.status,
        }))
      );
    } catch (error) {
      console.error("Error loading campaign assets:", error);
    }
  };

  // Initial load
  useEffect(() => {
    loadData();
  }, []);

  // Filtered and sorted data
  const filteredData = useMemo(() => {
    let result = [...campaignData];

    // Search filter
    if (searchValue) {
      const term = searchValue.toLowerCase();
      result = result.filter(
        (c) =>
          c.campaign_name.toLowerCase().includes(term) ||
          c.client_name.toLowerCase().includes(term) ||
          c.id.toLowerCase().includes(term)
      );
    }

    // City filter
    if (selectedFilters.cities.length > 0) {
      result = result.filter((c) => c.cities.some((city) => selectedFilters.cities.includes(city)));
    }

    // Status filter
    if (selectedFilters.statuses.length > 0) {
      result = result.filter((c) => selectedFilters.statuses.includes(c.status));
    }

    // Client filter
    if (selectedFilters.clients.length > 0) {
      result = result.filter((c) => selectedFilters.clients.includes(c.client_name));
    }

    // Sorting
    result.sort((a, b) => {
      const aVal = a[sortConfig.field as keyof CampaignBookingData];
      const bVal = b[sortConfig.field as keyof CampaignBookingData];

      if (sortConfig.field === "start_date" || sortConfig.field === "end_date") {
        const aDate = new Date(aVal as string).getTime();
        const bDate = new Date(bVal as string).getTime();
        return sortConfig.direction === "asc" ? aDate - bDate : bDate - aDate;
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortConfig.direction === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });

    return result;
  }, [campaignData, searchValue, selectedFilters, sortConfig]);

  // KPIs
  const kpis = useMemo(() => {
    const totalCampaigns = filteredData.length;
    const activeCampaigns = filteredData.filter((c) =>
      ["InProgress", "Running", "Active", "Planned"].includes(c.status)
    ).length;
    const totalValue = filteredData.reduce((sum, c) => sum + c.total_value, 0);
    const totalAssets = filteredData.reduce((sum, c) => sum + c.total_assets, 0);
    const avgProofProgress =
      totalCampaigns > 0
        ? Math.round(filteredData.reduce((sum, c) => sum + c.proof_progress, 0) / totalCampaigns)
        : 0;

    // Previous period calculations
    const prevTotalValue = previousPeriodData.reduce((sum, c) => sum + c.total_value, 0);
    const prevTotalCampaigns = previousPeriodData.length;

    const valueTrend =
      comparisonEnabled && prevTotalValue > 0
        ? calculateTrendPercentage(totalValue, prevTotalValue)
        : undefined;
    const campaignTrend =
      comparisonEnabled && prevTotalCampaigns > 0
        ? calculateTrendPercentage(totalCampaigns, prevTotalCampaigns)
        : undefined;

    return [
      {
        label: "Total Campaigns",
        value: totalCampaigns,
        icon: <Briefcase className="h-5 w-5" />,
        trend:
          campaignTrend !== undefined
            ? { value: campaignTrend, direction: campaignTrend >= 0 ? ("up" as const) : ("down" as const) }
            : undefined,
      },
      {
        label: "Active Campaigns",
        value: activeCampaigns,
        icon: <Clock className="h-5 w-5" />,
      },
      {
        label: "Total Revenue",
        value: formatCurrency(totalValue),
        icon: <DollarSign className="h-5 w-5" />,
        trend:
          valueTrend !== undefined
            ? { value: valueTrend, direction: valueTrend >= 0 ? ("up" as const) : ("down" as const) }
            : undefined,
        color: "success" as const,
      },
      {
        label: "Total Assets",
        value: totalAssets,
        icon: <Building2 className="h-5 w-5" />,
      },
      {
        label: "Avg Proof Progress",
        value: `${avgProofProgress}%`,
        icon: <Camera className="h-5 w-5" />,
        color: avgProofProgress >= 80 ? ("success" as const) : avgProofProgress >= 50 ? ("warning" as const) : ("destructive" as const),
      },
      {
        label: "Unique Clients",
        value: new Set(filteredData.map((c) => c.client_id)).size,
        icon: <Users className="h-5 w-5" />,
      },
    ];
  }, [filteredData, previousPeriodData, comparisonEnabled]);

  // Handle campaign click for drilldown
  const handleCampaignClick = (campaign: CampaignBookingData) => {
    setSelectedCampaign(campaign);
    loadCampaignAssets(campaign.id);
    setDrilldownOpen(true);
  };

  // Status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "InProgress":
      case "Running":
      case "Active":
        return <Badge variant="default">{status}</Badge>;
      case "Completed":
        return <Badge variant="outline" className="border-emerald-500 text-emerald-600">{status}</Badge>;
      case "Planned":
        return <Badge variant="secondary">{status}</Badge>;
      case "Cancelled":
        return <Badge variant="destructive">{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Export functions
  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Campaign Bookings");

    const headers = COLUMNS.filter((c) => visibleColumns.includes(c.key)).map((c) => c.label);
    sheet.addRow(headers);
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };

    filteredData.forEach((campaign) => {
      const row: any[] = [];
      COLUMNS.filter((c) => visibleColumns.includes(c.key)).forEach((col) => {
        switch (col.key) {
          case "campaign_name": row.push(campaign.campaign_name); break;
          case "client_name": row.push(campaign.client_name); break;
          case "start_date": row.push(new Date(campaign.start_date).toLocaleDateString()); break;
          case "end_date": row.push(new Date(campaign.end_date).toLocaleDateString()); break;
          case "cities": row.push(campaign.cities.join(", ")); break;
          case "total_assets": row.push(campaign.total_assets); break;
          case "total_value": row.push(campaign.total_value); break;
          case "status": row.push(campaign.status); break;
          case "proof_progress": row.push(`${campaign.proof_progress}%`); break;
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
    a.download = `Campaign_Bookings_Report_${new Date().toISOString().split("T")[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Campaign Bookings Report", 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

    autoTable(doc, {
      head: [COLUMNS.filter((c) => visibleColumns.includes(c.key)).map((c) => c.label)],
      body: filteredData.map((campaign) => {
        const row: string[] = [];
        COLUMNS.filter((c) => visibleColumns.includes(c.key)).forEach((col) => {
          switch (col.key) {
            case "campaign_name": row.push(campaign.campaign_name); break;
            case "client_name": row.push(campaign.client_name); break;
            case "start_date": row.push(new Date(campaign.start_date).toLocaleDateString()); break;
            case "end_date": row.push(new Date(campaign.end_date).toLocaleDateString()); break;
            case "cities": row.push(campaign.cities.join(", ")); break;
            case "total_assets": row.push(String(campaign.total_assets)); break;
            case "total_value": row.push(formatCurrency(campaign.total_value)); break;
            case "status": row.push(campaign.status); break;
            case "proof_progress": row.push(`${campaign.proof_progress}%`); break;
          }
        });
        return row;
      }),
      startY: 38,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 64, 175] },
    });

    doc.save(`Campaign_Bookings_Report_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  return (
    <div className="h-full flex flex-col">
      <ReportControls
        reportKey="campaign-bookings-report"
        reportTitle="Campaign Bookings Report"
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
        searchPlaceholder="Search campaigns, clients..."
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
            <h1 className="text-3xl font-bold tracking-tight">Campaign-wise Bookings</h1>
            <p className="text-muted-foreground">Analyze bookings by campaign</p>
          </div>
          <ReportExportMenu onExportExcel={handleExportExcel} onExportPDF={handleExportPDF} />
        </div>

        <ReportKPICards kpis={kpis} />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Campaign Booking Analytics
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
                title="No campaign bookings"
                description="No campaigns found for the selected filters"
                onClearFilters={resetFilters}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {visibleColumns.includes("campaign_name") && <TableHead>Campaign</TableHead>}
                    {visibleColumns.includes("client_name") && <TableHead>Client</TableHead>}
                    {visibleColumns.includes("start_date") && <TableHead>Start Date</TableHead>}
                    {visibleColumns.includes("end_date") && <TableHead>End Date</TableHead>}
                    {visibleColumns.includes("cities") && <TableHead>City/Area</TableHead>}
                    {visibleColumns.includes("total_assets") && <TableHead>Assets</TableHead>}
                    {visibleColumns.includes("total_value") && <TableHead>Revenue</TableHead>}
                    {visibleColumns.includes("status") && <TableHead>Status</TableHead>}
                    {visibleColumns.includes("proof_progress") && <TableHead>Proof %</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((campaign) => (
                    <TableRow
                      key={campaign.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleCampaignClick(campaign)}
                    >
                      {visibleColumns.includes("campaign_name") && (
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {campaign.campaign_name}
                            <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.includes("client_name") && <TableCell>{campaign.client_name}</TableCell>}
                      {visibleColumns.includes("start_date") && (
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {new Date(campaign.start_date).toLocaleDateString()}
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.includes("end_date") && (
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {new Date(campaign.end_date).toLocaleDateString()}
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.includes("cities") && (
                        <TableCell>{campaign.cities.slice(0, 2).join(", ")}{campaign.cities.length > 2 ? "..." : ""}</TableCell>
                      )}
                      {visibleColumns.includes("total_assets") && <TableCell>{campaign.total_assets}</TableCell>}
                      {visibleColumns.includes("total_value") && (
                        <TableCell className="font-medium">{formatCurrency(campaign.total_value)}</TableCell>
                      )}
                      {visibleColumns.includes("status") && <TableCell>{getStatusBadge(campaign.status)}</TableCell>}
                      {visibleColumns.includes("proof_progress") && (
                        <TableCell>
                          <Badge
                            variant={
                              campaign.proof_progress >= 100
                                ? "default"
                                : campaign.proof_progress >= 50
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {campaign.proof_progress}%
                          </Badge>
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

      {/* Campaign Drilldown Dialog */}
      <Dialog open={drilldownOpen} onOpenChange={setDrilldownOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              {selectedCampaign?.campaign_name}
            </DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="overview" className="flex-1 overflow-hidden">
            <TabsList>
              <TabsTrigger value="overview">Summary</TabsTrigger>
              <TabsTrigger value="assets">Assets ({campaignAssets.length})</TabsTrigger>
              <TabsTrigger value="proof">Proof Progress</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="mt-4 space-y-4">
              {selectedCampaign && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Client</p>
                    <p className="font-medium">{selectedCampaign.client_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    {getStatusBadge(selectedCampaign.status)}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Start Date</p>
                    <p className="font-medium">{new Date(selectedCampaign.start_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">End Date</p>
                    <p className="font-medium">{new Date(selectedCampaign.end_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Assets</p>
                    <p className="font-medium">{selectedCampaign.total_assets}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Value</p>
                    <p className="font-medium text-emerald-600">{formatCurrency(selectedCampaign.total_value)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Cities</p>
                    <p className="font-medium">{selectedCampaign.cities.join(", ") || "-"}</p>
                  </div>
                </div>
              )}
              <div className="flex gap-2 mt-4">
                <Button size="sm" onClick={() => navigate(`/admin/campaigns/${selectedCampaign?.id}`)}>
                  View Campaign
                </Button>
                <Button size="sm" variant="outline" onClick={() => navigate(`/admin/photo-gallery?campaignId=${selectedCampaign?.id}`)}>
                  <Camera className="h-4 w-4 mr-1" />
                  Open Photo Library
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="assets" className="mt-4 overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset Code</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Media Type</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaignAssets.map((asset, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{asset.asset_code}</TableCell>
                      <TableCell>{asset.location}</TableCell>
                      <TableCell>{asset.city}</TableCell>
                      <TableCell>{asset.media_type}</TableCell>
                      <TableCell>{formatCurrency(asset.card_rate)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{asset.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="proof" className="mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">Proof Progress</p>
                    <p className="text-sm text-muted-foreground">
                      {campaignAssets.filter((a) => a.status === "Verified" || a.status === "PhotoUploaded").length} of{" "}
                      {campaignAssets.length} assets have proofs
                    </p>
                  </div>
                  <div className="text-3xl font-bold">
                    {selectedCampaign?.proof_progress || 0}%
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        <span className="text-sm text-muted-foreground">Verified</span>
                      </div>
                      <p className="text-2xl font-bold mt-1">
                        {campaignAssets.filter((a) => a.status === "Verified").length}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-orange-600" />
                        <span className="text-sm text-muted-foreground">Pending</span>
                      </div>
                      <p className="text-2xl font-bold mt-1">
                        {campaignAssets.filter((a) => a.status === "Pending" || a.status === "Assigned").length}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
