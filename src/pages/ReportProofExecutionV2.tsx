import { useEffect, useState, useMemo, useCallback } from "react";
import { DateRange } from "react-day-picker";
import { useNavigate } from "react-router-dom";
import {
  Image,
  CheckCircle,
  Clock,
  Camera,
  AlertTriangle,
  Calendar,
  Users,
  Building2,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { ReportControls, ReportKPICards, ReportEmptyState, ReportExportMenu } from "@/components/reports";
import { useReportFilters } from "@/hooks/useReportFilters";
import { SortConfig, doesRangeOverlap } from "@/components/reports/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ProofExecutionData {
  campaign_id: string;
  campaign_name: string;
  client_name: string;
  start_date: string;
  end_date: string;
  total_assets: number;
  mounted: number;
  proof_uploaded: number;
  verified: number;
  pending: number;
  progress_percent: number;
  latest_upload: string | null;
  sla_status: "on-time" | "delayed" | "pending";
}

interface AssetProofStatus {
  asset_id: string;
  asset_code: string;
  location: string;
  status: string;
  has_newspaper: boolean;
  has_geotag: boolean;
  has_traffic1: boolean;
  has_traffic2: boolean;
  mounter_name: string | null;
  completed_at: string | null;
}

// Date type options
const DATE_TYPES = [
  { value: "proof_upload", label: "Proof Upload Date" },
  { value: "campaign_start", label: "Campaign Start Date" },
  { value: "campaign_end", label: "Campaign End Date" },
];

// Sort options
const SORT_OPTIONS = [
  { value: "pending", label: "Pending First" },
  { value: "progress_percent", label: "Progress %" },
  { value: "campaign_name", label: "Campaign Name" },
  { value: "client_name", label: "Client Name" },
  { value: "start_date", label: "Start Date" },
  { value: "latest_upload", label: "Latest Upload" },
];

// Column configuration
const COLUMNS = [
  { key: "campaign_name", label: "Campaign", default: true },
  { key: "client_name", label: "Client", default: true },
  { key: "start_date", label: "Start Date", default: true },
  { key: "end_date", label: "End Date", default: true },
  { key: "total_assets", label: "Total Assets", default: true },
  { key: "mounted", label: "Mounted", default: false },
  { key: "proof_uploaded", label: "Uploaded", default: true },
  { key: "verified", label: "Verified", default: true },
  { key: "pending", label: "Pending", default: true },
  { key: "progress_percent", label: "Progress", default: true },
  { key: "sla_status", label: "SLA Status", default: false },
];

export default function ReportProofExecutionV2() {
  const { company } = useCompany();
  const { toast } = useToast();
  const navigate = useNavigate();

  // States
  const [loading, setLoading] = useState(false);
  const [proofData, setProofData] = useState<ProofExecutionData[]>([]);

  // Drilldown state
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<ProofExecutionData | null>(null);
  const [assetProofStatus, setAssetProofStatus] = useState<AssetProofStatus[]>([]);
  const [showPendingOnly, setShowPendingOnly] = useState(false);

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
    defaultDateType: "proof_upload",
    defaultSortField: "pending",
    defaultSortDirection: "desc",
    reportKey: "proof-execution-report",
  });

  // Visible columns
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    COLUMNS.filter((c) => c.default).map((c) => c.key)
  );

  // Filter options
  const filterOptions = useMemo(() => {
    const statuses = new Set<string>();
    const clients = new Map<string, number>();

    proofData.forEach((p) => {
      statuses.add(p.sla_status);
      clients.set(p.client_name, (clients.get(p.client_name) || 0) + 1);
    });

    return {
      statuses: Array.from(statuses).map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) })),
      clients: Array.from(clients.entries()).map(([name, count]) => ({
        value: name,
        label: name,
        count,
      })),
    };
  }, [proofData]);

  // Load data
  const loadData = useCallback(async () => {
    if (!company?.id) return;

    setLoading(true);
    try {
      // Fetch campaigns
      const { data: campaigns, error: campaignsError } = await supabase
        .from("campaigns")
        .select("id, campaign_name, client_name, start_date, end_date, company_id, created_at")
        .eq("company_id", company.id);

      if (campaignsError) throw campaignsError;

      // Filter by date range
      const filteredCampaigns = (campaigns || []).filter((c) => {
        if (!dateRange?.from || !dateRange?.to) return true;

        const startDate = new Date(c.start_date);
        const endDate = new Date(c.end_date);

        switch (dateType) {
          case "campaign_start":
            return startDate >= dateRange.from && startDate <= dateRange.to;
          case "campaign_end":
            return endDate >= dateRange.from && endDate <= dateRange.to;
          default:
            return doesRangeOverlap(startDate, endDate, dateRange.from, dateRange.to);
        }
      });

      // Fetch campaign assets
      const campaignIds = filteredCampaigns.map((c) => c.id);
      let assetData: { campaign_id: string; status: string; completed_at: string | null }[] = [];

      if (campaignIds.length > 0) {
        const { data: assets } = await supabase
          .from("campaign_assets")
          .select("campaign_id, status, completed_at")
          .in("campaign_id", campaignIds);
        assetData = assets || [];
      }

      // Build proof execution data
      const proofList: ProofExecutionData[] = filteredCampaigns.map((campaign) => {
        const campaignAssets = assetData.filter((a) => a.campaign_id === campaign.id);
        const totalAssets = campaignAssets.length;
        const mounted = campaignAssets.filter((a) => a.status === "Mounted").length;
        const proofUploaded = campaignAssets.filter((a) => a.status === "PhotoUploaded").length;
        const verified = campaignAssets.filter((a) => a.status === "Verified" || a.status === "Completed").length;
        const pending = campaignAssets.filter((a) => a.status === "Assigned" || a.status === "Pending").length;
        const progressPercent = totalAssets > 0 ? Math.round(((verified + proofUploaded) / totalAssets) * 100) : 0;

        // Find latest upload
        const completedDates = campaignAssets
          .filter((a) => a.completed_at)
          .map((a) => a.completed_at as string)
          .sort()
          .reverse();
        const latestUpload = completedDates[0] || null;

        // SLA status: if end date is past and pending > 0, delayed
        const endDate = new Date(campaign.end_date);
        const now = new Date();
        let slaStatus: "on-time" | "delayed" | "pending" = "pending";
        if (progressPercent === 100) {
          slaStatus = "on-time";
        } else if (endDate < now && pending > 0) {
          slaStatus = "delayed";
        }

        return {
          campaign_id: campaign.id,
          campaign_name: campaign.campaign_name,
          client_name: campaign.client_name,
          start_date: campaign.start_date,
          end_date: campaign.end_date,
          total_assets: totalAssets,
          mounted,
          proof_uploaded: proofUploaded,
          verified,
          pending,
          progress_percent: progressPercent,
          latest_upload: latestUpload,
          sla_status: slaStatus,
        };
      });

      setProofData(proofList);
    } catch (error: any) {
      console.error("Error loading proof execution data:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load proof execution data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [company?.id, dateRange, dateType, toast]);

  // Load asset proof status for drilldown
  const loadAssetProofStatus = async (campaignId: string) => {
    try {
      const { data, error } = await supabase
        .from("campaign_assets")
        .select("asset_id, status, mounter_name, completed_at, photos")
        .eq("campaign_id", campaignId);

      if (error) throw error;

      // Get asset codes
      const assetIds = (data || []).map((a) => a.asset_id);
      let mediaAssetMap = new Map<string, { code: string; location: string }>();

      if (assetIds.length > 0) {
        const { data: mediaAssets } = await supabase
          .from("media_assets")
          .select("id, media_asset_code, location")
          .in("id", assetIds);

        mediaAssets?.forEach((ma) => {
          mediaAssetMap.set(ma.id, {
            code: ma.media_asset_code || ma.id,
            location: ma.location || "",
          });
        });
      }

      setAssetProofStatus(
        (data || []).map((a) => {
          const photos = a.photos as Record<string, string> | null;
          return {
            asset_id: a.asset_id,
            asset_code: mediaAssetMap.get(a.asset_id)?.code || a.asset_id,
            location: mediaAssetMap.get(a.asset_id)?.location || "",
            status: a.status,
            has_newspaper: !!photos?.newspaper,
            has_geotag: !!photos?.geotag,
            has_traffic1: !!photos?.traffic1,
            has_traffic2: !!photos?.traffic2,
            mounter_name: a.mounter_name,
            completed_at: a.completed_at,
          };
        })
      );
    } catch (error) {
      console.error("Error loading asset proof status:", error);
    }
  };

  // Initial load
  useEffect(() => {
    loadData();
  }, []);

  // Filtered and sorted data
  const filteredData = useMemo(() => {
    let result = [...proofData];

    // Search filter
    if (searchValue) {
      const term = searchValue.toLowerCase();
      result = result.filter(
        (p) =>
          p.campaign_name.toLowerCase().includes(term) ||
          p.client_name.toLowerCase().includes(term) ||
          p.campaign_id.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (selectedFilters.statuses.length > 0) {
      result = result.filter((p) => selectedFilters.statuses.includes(p.sla_status));
    }

    // Client filter
    if (selectedFilters.clients.length > 0) {
      result = result.filter((p) => selectedFilters.clients.includes(p.client_name));
    }

    // Sorting
    result.sort((a, b) => {
      if (sortConfig.field === "pending") {
        // Custom: pending first (desc), then oldest
        if (sortConfig.direction === "desc") {
          if (a.pending !== b.pending) return b.pending - a.pending;
          return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
        }
        if (a.pending !== b.pending) return a.pending - b.pending;
        return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
      }

      const aVal = a[sortConfig.field as keyof ProofExecutionData];
      const bVal = b[sortConfig.field as keyof ProofExecutionData];

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortConfig.direction === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });

    return result;
  }, [proofData, searchValue, selectedFilters, sortConfig]);

  // Filtered asset proof status
  const filteredAssetStatus = useMemo(() => {
    if (showPendingOnly) {
      return assetProofStatus.filter((a) => a.status === "Pending" || a.status === "Assigned");
    }
    return assetProofStatus;
  }, [assetProofStatus, showPendingOnly]);

  // KPIs
  const kpis = useMemo(() => {
    const totalCampaigns = filteredData.length;
    const totalAssets = filteredData.reduce((sum, p) => sum + p.total_assets, 0);
    const totalVerified = filteredData.reduce((sum, p) => sum + p.verified, 0);
    const totalPending = filteredData.reduce((sum, p) => sum + p.pending, 0);
    const completionRate = totalAssets > 0 ? Math.round((totalVerified / totalAssets) * 100) : 0;
    const delayedCount = filteredData.filter((p) => p.sla_status === "delayed").length;

    return [
      {
        label: "Total Campaigns",
        value: totalCampaigns,
        icon: <Building2 className="h-5 w-5" />,
      },
      {
        label: "Total Assets",
        value: totalAssets,
        icon: <Image className="h-5 w-5" />,
      },
      {
        label: "Verified",
        value: totalVerified,
        icon: <CheckCircle className="h-5 w-5" />,
        color: "success" as const,
      },
      {
        label: "Pending",
        value: totalPending,
        icon: <Clock className="h-5 w-5" />,
        color: totalPending > 0 ? ("warning" as const) : ("default" as const),
      },
      {
        label: "Completion Rate",
        value: `${completionRate}%`,
        icon: <Camera className="h-5 w-5" />,
        color: completionRate >= 80 ? ("success" as const) : completionRate >= 50 ? ("default" as const) : ("warning" as const),
      },
      {
        label: "SLA Delayed",
        value: delayedCount,
        icon: <AlertTriangle className="h-5 w-5" />,
        color: delayedCount > 0 ? ("danger" as const) : ("success" as const),
      },
    ];
  }, [filteredData]);

  // Handle campaign click
  const handleCampaignClick = (campaign: ProofExecutionData) => {
    setSelectedCampaign(campaign);
    loadAssetProofStatus(campaign.campaign_id);
    setDrilldownOpen(true);
  };

  // SLA badge
  const getSLABadge = (status: string) => {
    switch (status) {
      case "on-time":
        return <Badge variant="default" className="bg-emerald-500">On Time</Badge>;
      case "delayed":
        return <Badge variant="destructive">Delayed</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  // Export functions
  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Proof Execution");

    const headers = COLUMNS.filter((c) => visibleColumns.includes(c.key)).map((c) => c.label);
    sheet.addRow(headers);
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };

    filteredData.forEach((proof) => {
      const row: any[] = [];
      COLUMNS.filter((c) => visibleColumns.includes(c.key)).forEach((col) => {
        switch (col.key) {
          case "campaign_name": row.push(proof.campaign_name); break;
          case "client_name": row.push(proof.client_name); break;
          case "start_date": row.push(new Date(proof.start_date).toLocaleDateString()); break;
          case "end_date": row.push(new Date(proof.end_date).toLocaleDateString()); break;
          case "total_assets": row.push(proof.total_assets); break;
          case "mounted": row.push(proof.mounted); break;
          case "proof_uploaded": row.push(proof.proof_uploaded); break;
          case "verified": row.push(proof.verified); break;
          case "pending": row.push(proof.pending); break;
          case "progress_percent": row.push(`${proof.progress_percent}%`); break;
          case "sla_status": row.push(proof.sla_status); break;
        }
      });
      sheet.addRow(row);
    });

    sheet.columns.forEach((col) => { col.width = 16; });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Proof_Execution_Report_${new Date().toISOString().split("T")[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Proof Execution Report", 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

    autoTable(doc, {
      head: [COLUMNS.filter((c) => visibleColumns.includes(c.key)).map((c) => c.label)],
      body: filteredData.map((proof) => {
        const row: string[] = [];
        COLUMNS.filter((c) => visibleColumns.includes(c.key)).forEach((col) => {
          switch (col.key) {
            case "campaign_name": row.push(proof.campaign_name); break;
            case "client_name": row.push(proof.client_name); break;
            case "start_date": row.push(new Date(proof.start_date).toLocaleDateString()); break;
            case "end_date": row.push(new Date(proof.end_date).toLocaleDateString()); break;
            case "total_assets": row.push(String(proof.total_assets)); break;
            case "mounted": row.push(String(proof.mounted)); break;
            case "proof_uploaded": row.push(String(proof.proof_uploaded)); break;
            case "verified": row.push(String(proof.verified)); break;
            case "pending": row.push(String(proof.pending)); break;
            case "progress_percent": row.push(`${proof.progress_percent}%`); break;
            case "sla_status": row.push(proof.sla_status); break;
          }
        });
        return row;
      }),
      startY: 38,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 64, 175] },
    });

    doc.save(`Proof_Execution_Report_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  return (
    <div className="h-full flex flex-col">
      <ReportControls
        reportKey="proof-execution-report"
        reportTitle="Proof Execution Report"
        dateTypes={DATE_TYPES}
        selectedDateType={dateType}
        onDateTypeChange={setDateType}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
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
            <h1 className="text-3xl font-bold tracking-tight">Proof-of-Execution Reports</h1>
            <p className="text-muted-foreground">Track installation and proof photo submission</p>
          </div>
          <ReportExportMenu onExportExcel={handleExportExcel} onExportPDF={handleExportPDF} />
        </div>

        <ReportKPICards kpis={kpis} />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Execution Proof Analytics
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
                title="No proof execution data"
                description="No campaigns found for the selected filters"
                onClearFilters={resetFilters}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {visibleColumns.includes("campaign_name") && <TableHead>Campaign</TableHead>}
                    {visibleColumns.includes("client_name") && <TableHead>Client</TableHead>}
                    {visibleColumns.includes("start_date") && <TableHead>Start</TableHead>}
                    {visibleColumns.includes("end_date") && <TableHead>End</TableHead>}
                    {visibleColumns.includes("total_assets") && <TableHead>Total</TableHead>}
                    {visibleColumns.includes("mounted") && <TableHead>Mounted</TableHead>}
                    {visibleColumns.includes("proof_uploaded") && <TableHead>Uploaded</TableHead>}
                    {visibleColumns.includes("verified") && <TableHead>Verified</TableHead>}
                    {visibleColumns.includes("pending") && <TableHead>Pending</TableHead>}
                    {visibleColumns.includes("progress_percent") && <TableHead>Progress</TableHead>}
                    {visibleColumns.includes("sla_status") && <TableHead>SLA</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((proof) => (
                    <TableRow
                      key={proof.campaign_id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleCampaignClick(proof)}
                    >
                      {visibleColumns.includes("campaign_name") && (
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {proof.campaign_name}
                            <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.includes("client_name") && <TableCell>{proof.client_name}</TableCell>}
                      {visibleColumns.includes("start_date") && (
                        <TableCell>{new Date(proof.start_date).toLocaleDateString()}</TableCell>
                      )}
                      {visibleColumns.includes("end_date") && (
                        <TableCell>{new Date(proof.end_date).toLocaleDateString()}</TableCell>
                      )}
                      {visibleColumns.includes("total_assets") && <TableCell>{proof.total_assets}</TableCell>}
                      {visibleColumns.includes("mounted") && <TableCell>{proof.mounted}</TableCell>}
                      {visibleColumns.includes("proof_uploaded") && <TableCell>{proof.proof_uploaded}</TableCell>}
                      {visibleColumns.includes("verified") && (
                        <TableCell className="text-emerald-600 font-medium">{proof.verified}</TableCell>
                      )}
                      {visibleColumns.includes("pending") && (
                        <TableCell className={proof.pending > 0 ? "text-orange-600 font-medium" : ""}>
                          {proof.pending}
                        </TableCell>
                      )}
                      {visibleColumns.includes("progress_percent") && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={proof.progress_percent} className="w-16 h-2" />
                            <span className="text-sm">{proof.progress_percent}%</span>
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.includes("sla_status") && <TableCell>{getSLABadge(proof.sla_status)}</TableCell>}
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
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              {selectedCampaign?.campaign_name} - Proof Status
            </DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="checklist" className="flex-1 overflow-hidden">
            <TabsList>
              <TabsTrigger value="checklist">Asset Checklist</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
            </TabsList>
            <TabsContent value="checklist" className="mt-4 overflow-auto max-h-[500px]">
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant={showPendingOnly ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowPendingOnly(!showPendingOnly)}
                >
                  {showPendingOnly ? "Show All" : "Show Pending Only"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/admin/photo-gallery?campaignId=${selectedCampaign?.campaign_id}`)}
                >
                  <Camera className="h-4 w-4 mr-1" />
                  Open Photo Library
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset Code</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Newspaper</TableHead>
                    <TableHead className="text-center">Geotag</TableHead>
                    <TableHead className="text-center">Traffic 1</TableHead>
                    <TableHead className="text-center">Traffic 2</TableHead>
                    <TableHead>Mounter</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssetStatus.map((asset, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{asset.asset_code}</TableCell>
                      <TableCell>{asset.location}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{asset.status}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {asset.has_newspaper ? (
                          <CheckCircle className="h-4 w-4 text-emerald-600 mx-auto" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {asset.has_geotag ? (
                          <CheckCircle className="h-4 w-4 text-emerald-600 mx-auto" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {asset.has_traffic1 ? (
                          <CheckCircle className="h-4 w-4 text-emerald-600 mx-auto" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {asset.has_traffic2 ? (
                          <CheckCircle className="h-4 w-4 text-emerald-600 mx-auto" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground mx-auto" />
                        )}
                      </TableCell>
                      <TableCell>{asset.mounter_name || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="summary" className="mt-4 space-y-4">
              {selectedCampaign && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Total Assets</p>
                      <p className="text-2xl font-bold">{selectedCampaign.total_assets}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Verified</p>
                      <p className="text-2xl font-bold text-emerald-600">{selectedCampaign.verified}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Pending</p>
                      <p className="text-2xl font-bold text-orange-600">{selectedCampaign.pending}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Progress</p>
                      <p className="text-2xl font-bold">{selectedCampaign.progress_percent}%</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
