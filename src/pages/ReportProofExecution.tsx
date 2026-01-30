import { useEffect, useState, useMemo, useCallback } from "react";
import { DateRange } from "react-day-picker";
import { useNavigate } from "react-router-dom";
import {
  Image,
  CheckCircle,
  Clock,
  Camera,
  AlertTriangle,
  Building2,
  Search,
  SortAsc,
  SortDesc,
  RotateCcw,
  Download,
  Calendar,
  Filter,
  ExternalLink,
  ChevronDown,
  MapPin,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, subDays, startOfWeek, endOfWeek, startOfQuarter, endOfQuarter } from "date-fns";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Types
interface ProofExecutionData {
  campaign_id: string;
  campaign_name: string;
  client_name: string;
  city: string;
  area: string;
  start_date: string;
  end_date: string;
  status: string;
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
  city: string;
  area: string;
  status: string;
  has_newspaper: boolean;
  has_geotag: boolean;
  has_traffic1: boolean;
  has_traffic2: boolean;
  mounter_name: string | null;
  completed_at: string | null;
}

interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

// Date presets
const DATE_PRESETS = [
  { label: "Today", getValue: () => ({ from: new Date(), to: new Date() }) },
  { label: "This Week", getValue: () => ({ from: startOfWeek(new Date()), to: endOfWeek(new Date()) }) },
  { label: "This Month", getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: "Last 30 Days", getValue: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { label: "This Quarter", getValue: () => ({ from: startOfQuarter(new Date()), to: endOfQuarter(new Date()) }) },
];

// Date type options
const DATE_TYPES = [
  { value: "proof_upload", label: "Proof Upload Date" },
  { value: "campaign_start", label: "Campaign Start Date" },
  { value: "campaign_end", label: "Campaign End Date" },
];

// Sort options
const SORT_OPTIONS = [
  { value: "pending", label: "Pending Proofs" },
  { value: "start_date", label: "Campaign Start Date" },
  { value: "end_date", label: "Campaign End Date" },
  { value: "latest_upload", label: "Latest Upload Date" },
  { value: "progress_percent", label: "Progress %" },
  { value: "campaign_name", label: "Campaign Name" },
  { value: "client_name", label: "Client Name" },
];

// Proof status options
const PROOF_STATUS_OPTIONS = [
  { value: "completed", label: "Completed (100%)" },
  { value: "partial", label: "Partially Uploaded" },
  { value: "pending", label: "Pending" },
];

// Campaign status options
const CAMPAIGN_STATUS_OPTIONS = [
  { value: "Running", label: "Running" },
  { value: "Completed", label: "Completed" },
  { value: "Upcoming", label: "Upcoming" },
];

export default function ReportProofExecution() {
  const { company } = useCompany();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Data state
  const [loading, setLoading] = useState(false);
  const [proofData, setProofData] = useState<ProofExecutionData[]>([]);

  // Filter states
  const [searchValue, setSearchValue] = useState("");
  const [dateType, setDateType] = useState("proof_upload");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [selectedCampaignStatus, setSelectedCampaignStatus] = useState<string[]>([]);
  const [selectedProofStatus, setSelectedProofStatus] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: "pending", direction: "desc" });

  // Drilldown state
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<ProofExecutionData | null>(null);
  const [assetProofStatus, setAssetProofStatus] = useState<AssetProofStatus[]>([]);
  const [drilldownLoading, setDrilldownLoading] = useState(false);

  // Derive filter options from data
  const filterOptions = useMemo(() => {
    const clients = new Map<string, number>();
    const cities = new Map<string, number>();
    const areas = new Map<string, number>();
    
    proofData.forEach(p => {
      clients.set(p.client_name, (clients.get(p.client_name) || 0) + 1);
      if (p.city) cities.set(p.city, (cities.get(p.city) || 0) + 1);
      if (p.area) areas.set(p.area, (areas.get(p.area) || 0) + 1);
    });

    return {
      clients: Array.from(clients.entries()).map(([name, count]) => ({ value: name, label: name, count })),
      cities: Array.from(cities.entries()).map(([name, count]) => ({ value: name, label: name, count })),
      areas: Array.from(areas.entries()).map(([name, count]) => ({ value: name, label: name, count })),
    };
  }, [proofData]);

  // Load data
  const loadData = useCallback(async () => {
    if (!company?.id) return;

    setLoading(true);
    try {
      // Fetch campaigns with related data
      const { data: campaigns, error: campaignsError } = await supabase
        .from("campaigns")
        .select(`
          id, 
          campaign_name, 
          client_name, 
          start_date, 
          end_date, 
          status,
          company_id
        `)
        .eq("company_id", company.id)
        .eq("is_deleted", false);

      if (campaignsError) throw campaignsError;

      // Filter by date range
      const filteredCampaigns = (campaigns || []).filter(c => {
        if (!dateRange?.from || !dateRange?.to) return true;

        const startDate = new Date(c.start_date);
        const endDate = new Date(c.end_date);

        switch (dateType) {
          case "campaign_start":
            return startDate >= dateRange.from && startDate <= dateRange.to;
          case "campaign_end":
            return endDate >= dateRange.from && endDate <= dateRange.to;
          default:
            // Default: overlapping with date range
            return startDate <= dateRange.to && endDate >= dateRange.from;
        }
      });

      // Fetch campaign assets
      const campaignIds = filteredCampaigns.map(c => c.id);
      let assetData: any[] = [];

      if (campaignIds.length > 0) {
        const { data: assets } = await supabase
          .from("campaign_assets")
          .select("campaign_id, status, completed_at, city, area")
          .in("campaign_id", campaignIds);
        assetData = assets || [];
      }

      // Build proof execution data
      const proofList: ProofExecutionData[] = filteredCampaigns.map(campaign => {
        const campaignAssets = assetData.filter(a => a.campaign_id === campaign.id);
        const totalAssets = campaignAssets.length;
        const mounted = campaignAssets.filter(a => a.status === "Mounted" || a.status === "Installed").length;
        const proofUploaded = campaignAssets.filter(a => a.status === "PhotoUploaded").length;
        const verified = campaignAssets.filter(a => a.status === "Verified" || a.status === "Completed").length;
        const pending = campaignAssets.filter(a => a.status === "Assigned" || a.status === "Pending").length;
        const progressPercent = totalAssets > 0 ? Math.round(((verified + proofUploaded) / totalAssets) * 100) : 0;

        // Find latest upload
        const completedDates = campaignAssets
          .filter(a => a.completed_at)
          .map(a => a.completed_at as string)
          .sort()
          .reverse();
        const latestUpload = completedDates[0] || null;

        // Derive city/area from first asset
        const firstAsset = campaignAssets[0];
        const city = firstAsset?.city || "";
        const area = firstAsset?.area || "";

        // SLA status
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
          city,
          area,
          start_date: campaign.start_date,
          end_date: campaign.end_date,
          status: campaign.status,
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
    setDrilldownLoading(true);
    try {
      const { data, error } = await supabase
        .from("campaign_assets")
        .select("asset_id, status, mounter_name, completed_at, photos, city, area, location")
        .eq("campaign_id", campaignId);

      if (error) throw error;

      // Get asset codes
      const assetIds = (data || []).map(a => a.asset_id);
      let mediaAssetMap = new Map<string, { code: string; location: string }>();

      if (assetIds.length > 0) {
        const { data: mediaAssets } = await supabase
          .from("media_assets")
          .select("id, media_asset_code, location")
          .in("id", assetIds);

        mediaAssets?.forEach(ma => {
          mediaAssetMap.set(ma.id, {
            code: ma.media_asset_code || ma.id.slice(0, 8),
            location: ma.location || "",
          });
        });
      }

      setAssetProofStatus(
        (data || []).map(a => {
          const photos = a.photos as Record<string, string> | null;
          return {
            asset_id: a.asset_id,
            asset_code: mediaAssetMap.get(a.asset_id)?.code || a.asset_id.slice(0, 8),
            location: a.location || mediaAssetMap.get(a.asset_id)?.location || "",
            city: a.city || "",
            area: a.area || "",
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
    } finally {
      setDrilldownLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered and sorted data
  const filteredData = useMemo(() => {
    let result = [...proofData];

    // Search filter
    if (searchValue) {
      const term = searchValue.toLowerCase();
      result = result.filter(
        p =>
          p.campaign_name.toLowerCase().includes(term) ||
          p.client_name.toLowerCase().includes(term) ||
          p.campaign_id.toLowerCase().includes(term) ||
          p.city?.toLowerCase().includes(term) ||
          p.area?.toLowerCase().includes(term)
      );
    }

    // Client filter
    if (selectedClients.length > 0) {
      result = result.filter(p => selectedClients.includes(p.client_name));
    }

    // City filter
    if (selectedCities.length > 0) {
      result = result.filter(p => selectedCities.includes(p.city));
    }

    // Area filter
    if (selectedAreas.length > 0) {
      result = result.filter(p => selectedAreas.includes(p.area));
    }

    // Campaign status filter
    if (selectedCampaignStatus.length > 0) {
      result = result.filter(p => selectedCampaignStatus.includes(p.status));
    }

    // Proof status filter
    if (selectedProofStatus.length > 0) {
      result = result.filter(p => {
        const proofStatus = p.progress_percent === 100 ? "completed" : p.progress_percent > 0 ? "partial" : "pending";
        return selectedProofStatus.includes(proofStatus);
      });
    }

    // Sorting
    result.sort((a, b) => {
      if (sortConfig.field === "pending") {
        if (sortConfig.direction === "desc") {
          if (a.pending !== b.pending) return b.pending - a.pending;
          return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
        }
        if (a.pending !== b.pending) return a.pending - b.pending;
        return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
      }

      const aVal = a[sortConfig.field as keyof ProofExecutionData];
      const bVal = b[sortConfig.field as keyof ProofExecutionData];

      if (aVal === null || aVal === undefined) return sortConfig.direction === "asc" ? 1 : -1;
      if (bVal === null || bVal === undefined) return sortConfig.direction === "asc" ? -1 : 1;

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortConfig.direction === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });

    return result;
  }, [proofData, searchValue, selectedClients, selectedCities, selectedAreas, selectedCampaignStatus, selectedProofStatus, sortConfig]);

  // KPIs
  const kpis = useMemo(() => {
    const totalCampaigns = filteredData.length;
    const totalAssets = filteredData.reduce((sum, p) => sum + p.total_assets, 0);
    const totalVerified = filteredData.reduce((sum, p) => sum + p.verified, 0);
    const totalPending = filteredData.reduce((sum, p) => sum + p.pending, 0);
    const completionRate = totalAssets > 0 ? Math.round((totalVerified / totalAssets) * 100) : 0;
    const delayedCount = filteredData.filter(p => p.sla_status === "delayed").length;

    return { totalCampaigns, totalAssets, totalVerified, totalPending, completionRate, delayedCount };
  }, [filteredData]);

  // Reset filters
  const resetFilters = () => {
    setSearchValue("");
    setDateType("proof_upload");
    setDateRange({ from: subDays(new Date(), 30), to: new Date() });
    setSelectedClients([]);
    setSelectedCities([]);
    setSelectedAreas([]);
    setSelectedCampaignStatus([]);
    setSelectedProofStatus([]);
    setSortConfig({ field: "pending", direction: "desc" });
  };

  const hasActiveFilters = searchValue || selectedClients.length > 0 || selectedCities.length > 0 || selectedAreas.length > 0 || selectedCampaignStatus.length > 0 || selectedProofStatus.length > 0;

  // Handle campaign click
  const handleCampaignClick = (campaign: ProofExecutionData) => {
    setSelectedCampaign(campaign);
    loadAssetProofStatus(campaign.campaign_id);
    setDrilldownOpen(true);
  };

  // Get status badge
  const getStatusBadge = (proof: ProofExecutionData) => {
    if (proof.progress_percent === 100) {
      return <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">Complete</Badge>;
    } else if (proof.progress_percent > 50) {
      return <Badge variant="secondary">In Progress</Badge>;
    } else if (proof.progress_percent > 0) {
      return <Badge variant="outline" className="border-amber-500 text-amber-600">Started</Badge>;
    }
    return <Badge variant="outline" className="border-red-500 text-red-600">Pending</Badge>;
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

  // Export Excel
  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Proof Execution");

    // Header
    sheet.addRow(["Proof Execution Report"]);
    sheet.addRow([`Generated: ${new Date().toLocaleString()}`]);
    sheet.addRow([`Date Range: ${dateRange?.from ? format(dateRange.from, "dd MMM yyyy") : ""} - ${dateRange?.to ? format(dateRange.to, "dd MMM yyyy") : ""}`]);
    sheet.addRow([]);

    // Columns
    const headers = ["Campaign ID", "Client", "Campaign Name", "Start Date", "End Date", "City / Area", "Total Assets", "Uploaded", "Verified", "Pending", "Progress %", "Status"];
    sheet.addRow(headers);
    sheet.getRow(5).font = { bold: true };
    sheet.getRow(5).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };

    filteredData.forEach(proof => {
      sheet.addRow([
        proof.campaign_id,
        proof.client_name,
        proof.campaign_name,
        format(new Date(proof.start_date), "dd MMM yyyy"),
        format(new Date(proof.end_date), "dd MMM yyyy"),
        `${proof.city} / ${proof.area}`,
        proof.total_assets,
        proof.proof_uploaded,
        proof.verified,
        proof.pending,
        `${proof.progress_percent}%`,
        proof.progress_percent === 100 ? "Complete" : proof.progress_percent > 0 ? "In Progress" : "Pending",
      ]);
    });

    sheet.columns.forEach(col => { col.width = 16; });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Proof_Execution_Report_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: "Exported", description: "Excel file downloaded successfully" });
  };

  // Export PDF
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Proof Execution Report", 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Date Range: ${dateRange?.from ? format(dateRange.from, "dd MMM yyyy") : ""} - ${dateRange?.to ? format(dateRange.to, "dd MMM yyyy") : ""}`, 14, 36);

    autoTable(doc, {
      startY: 42,
      head: [["Campaign", "Client", "Start", "End", "Assets", "Uploaded", "Verified", "Pending", "Progress", "Status"]],
      body: filteredData.map(proof => [
        proof.campaign_name,
        proof.client_name,
        format(new Date(proof.start_date), "dd/MM/yy"),
        format(new Date(proof.end_date), "dd/MM/yy"),
        proof.total_assets,
        proof.proof_uploaded,
        proof.verified,
        proof.pending,
        `${proof.progress_percent}%`,
        proof.progress_percent === 100 ? "Complete" : proof.progress_percent > 0 ? "In Progress" : "Pending",
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 64, 175] },
    });

    doc.save(`Proof_Execution_Report_${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast({ title: "Exported", description: "PDF file downloaded successfully" });
  };

  // Multi-select filter component
  const MultiSelectFilter = ({ 
    label, 
    options, 
    selected, 
    onSelect 
  }: { 
    label: string; 
    options: { value: string; label: string; count?: number }[]; 
    selected: string[]; 
    onSelect: (values: string[]) => void;
  }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1">
          {label}
          {selected.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {selected.length}
            </Badge>
          )}
          <ChevronDown className="h-3.5 w-3.5 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <ScrollArea className="h-64">
          <div className="p-2 space-y-1">
            {options.map(option => (
              <label
                key={option.value}
                className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted cursor-pointer"
              >
                <Checkbox
                  checked={selected.includes(option.value)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onSelect([...selected, option.value]);
                    } else {
                      onSelect(selected.filter(v => v !== option.value));
                    }
                  }}
                />
                <span className="flex-1 text-sm">{option.label}</span>
                {option.count !== undefined && (
                  <span className="text-xs text-muted-foreground">{option.count}</span>
                )}
              </label>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="h-full flex flex-col p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Proof-of-Execution Report</h1>
          <p className="text-muted-foreground">
            Campaign execution and proof photo analytics
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportExcel}>
            <Download className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* Filter Bar - Sticky */}
      <div className="bg-card border rounded-lg p-4 space-y-4 sticky top-0 z-10">
        {/* Row 1: Search + Date */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search Campaign / Client / Asset Code"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Date Type */}
          <Select value={dateType} onValueChange={setDateType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_TYPES.map(dt => (
                <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Range */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="min-w-[220px] justify-start">
                <Calendar className="mr-2 h-4 w-4" />
                {dateRange?.from && dateRange?.to ? (
                  <>
                    {format(dateRange.from, "dd MMM")} - {format(dateRange.to, "dd MMM yyyy")}
                  </>
                ) : (
                  "Select date range"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="flex">
                <div className="border-r p-2 space-y-1">
                  {DATE_PRESETS.map(preset => (
                    <Button
                      key={preset.label}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => setDateRange(preset.getValue())}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
                <CalendarComponent
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  className="p-3 pointer-events-auto"
                />
              </div>
            </PopoverContent>
          </Popover>

          <Button variant="default" onClick={loadData} disabled={loading}>
            Apply
          </Button>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          )}
        </div>

        {/* Row 2: Filters + Sorting */}
        <div className="flex flex-wrap gap-3 items-center">
          <MultiSelectFilter
            label="Client"
            options={filterOptions.clients}
            selected={selectedClients}
            onSelect={setSelectedClients}
          />
          <MultiSelectFilter
            label="City"
            options={filterOptions.cities}
            selected={selectedCities}
            onSelect={setSelectedCities}
          />
          <MultiSelectFilter
            label="Area"
            options={filterOptions.areas}
            selected={selectedAreas}
            onSelect={setSelectedAreas}
          />
          <MultiSelectFilter
            label="Campaign Status"
            options={CAMPAIGN_STATUS_OPTIONS}
            selected={selectedCampaignStatus}
            onSelect={setSelectedCampaignStatus}
          />
          <MultiSelectFilter
            label="Proof Status"
            options={PROOF_STATUS_OPTIONS}
            selected={selectedProofStatus}
            onSelect={setSelectedProofStatus}
          />

          <Separator orientation="vertical" className="h-8" />

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort:</span>
            <Select value={sortConfig.field} onValueChange={(val) => setSortConfig({ ...sortConfig, field: val })}>
              <SelectTrigger className="w-[170px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => setSortConfig({ ...sortConfig, direction: sortConfig.direction === "asc" ? "desc" : "asc" })}
            >
              {sortConfig.direction === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalCampaigns}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Image className="h-4 w-4 text-muted-foreground" />
              Total Assets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalAssets}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              Verified
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{kpis.totalVerified}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{kpis.totalPending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Camera className="h-4 w-4 text-muted-foreground" />
              Completion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.completionRate}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className={cn("h-4 w-4", kpis.delayedCount > 0 ? "text-red-600" : "text-emerald-600")} />
              SLA Delayed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", kpis.delayedCount > 0 ? "text-red-600" : "text-emerald-600")}>
              {kpis.delayedCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Execution Proof Analytics
          </CardTitle>
          <CardDescription>
            Track installation completion and proof photo submission rates ({filteredData.length} campaigns)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Image className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No data available</p>
              <p className="text-sm text-muted-foreground mt-2">
                Try adjusting your filters or date range
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Campaign ID</TableHead>
                    <TableHead className="font-semibold">Client</TableHead>
                    <TableHead className="font-semibold">Start Date</TableHead>
                    <TableHead className="font-semibold">End Date</TableHead>
                    <TableHead className="font-semibold">City / Area</TableHead>
                    <TableHead className="font-semibold text-center">Total</TableHead>
                    <TableHead className="font-semibold text-center">Uploaded</TableHead>
                    <TableHead className="font-semibold text-center">Pending</TableHead>
                    <TableHead className="font-semibold">Progress</TableHead>
                    <TableHead className="font-semibold text-center">Latest Upload</TableHead>
                    <TableHead className="font-semibold text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((proof) => (
                    <TableRow 
                      key={proof.campaign_id} 
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleCampaignClick(proof)}
                    >
                      <TableCell>
                        <Button variant="link" className="p-0 h-auto font-mono text-sm text-primary">
                          {proof.campaign_id.slice(0, 12)}...
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{proof.client_name}</TableCell>
                      <TableCell className="text-sm">{format(new Date(proof.start_date), "dd MMM yyyy")}</TableCell>
                      <TableCell className="text-sm">{format(new Date(proof.end_date), "dd MMM yyyy")}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {proof.city && proof.area ? `${proof.city} / ${proof.area}` : proof.city || proof.area || "-"}
                      </TableCell>
                      <TableCell className="text-center">{proof.total_assets}</TableCell>
                      <TableCell className="text-center text-emerald-600">{proof.proof_uploaded + proof.verified}</TableCell>
                      <TableCell className="text-center text-amber-600">{proof.pending}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={proof.progress_percent} className="h-2 w-20" />
                          <span className="text-sm font-medium">{proof.progress_percent}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {proof.latest_upload ? format(new Date(proof.latest_upload), "dd MMM") : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(proof)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drilldown Dialog */}
      <Dialog open={drilldownOpen} onOpenChange={setDrilldownOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              {selectedCampaign?.campaign_name || "Campaign Details"}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="summary">Proof Summary</TabsTrigger>
              <TabsTrigger value="assets">Asset-wise Checklist</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="mt-4 space-y-4">
              {selectedCampaign && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">Client</p>
                      <p className="font-semibold">{selectedCampaign.client_name}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">Period</p>
                      <p className="font-semibold">
                        {format(new Date(selectedCampaign.start_date), "dd MMM")} - {format(new Date(selectedCampaign.end_date), "dd MMM yyyy")}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">Total Assets</p>
                      <p className="font-semibold">{selectedCampaign.total_assets}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">Completion</p>
                      <p className="font-semibold text-emerald-600">{selectedCampaign.progress_percent}%</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 p-4 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm">Verified</span>
                      </div>
                      <p className="text-2xl font-bold text-emerald-600">{selectedCampaign.verified}</p>
                    </div>
                    <div className="flex-1 p-4 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <Camera className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">Uploaded</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">{selectedCampaign.proof_uploaded}</p>
                    </div>
                    <div className="flex-1 p-4 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-amber-600" />
                        <span className="text-sm">Pending</span>
                      </div>
                      <p className="text-2xl font-bold text-amber-600">{selectedCampaign.pending}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">SLA Status:</span>
                    {getSLABadge(selectedCampaign.sla_status)}
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="assets" className="mt-4">
              <ScrollArea className="h-[400px]">
                {drilldownLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Asset Code</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead className="text-center">Newspaper</TableHead>
                        <TableHead className="text-center">Geo</TableHead>
                        <TableHead className="text-center">Traffic 1</TableHead>
                        <TableHead className="text-center">Traffic 2</TableHead>
                        <TableHead>Last Uploaded</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assetProofStatus.map((asset) => (
                        <TableRow key={asset.asset_id}>
                          <TableCell className="font-mono text-sm">{asset.asset_code}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{asset.location}</TableCell>
                          <TableCell className="text-center">
                            {asset.has_newspaper ? (
                              <CheckCircle className="h-4 w-4 text-emerald-600 mx-auto" />
                            ) : (
                              <span className="text-muted-foreground">✖</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {asset.has_geotag ? (
                              <CheckCircle className="h-4 w-4 text-emerald-600 mx-auto" />
                            ) : (
                              <span className="text-muted-foreground">✖</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {asset.has_traffic1 ? (
                              <CheckCircle className="h-4 w-4 text-emerald-600 mx-auto" />
                            ) : (
                              <span className="text-muted-foreground">✖</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {asset.has_traffic2 ? (
                              <CheckCircle className="h-4 w-4 text-emerald-600 mx-auto" />
                            ) : (
                              <span className="text-muted-foreground">✖</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {asset.completed_at ? format(new Date(asset.completed_at), "dd MMM HH:mm") : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="actions" className="mt-4 space-y-4">
              <div className="flex flex-col gap-3">
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => {
                    if (selectedCampaign) {
                      navigate(`/admin/gallery?campaign_id=${selectedCampaign.campaign_id}`);
                    }
                  }}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Photo Library (Filtered)
                </Button>
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => {
                    if (selectedCampaign) {
                      navigate(`/admin/campaigns/${selectedCampaign.campaign_id}/proofs`);
                    }
                  }}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  View Campaign Proofs
                </Button>
                <Button
                  variant="default"
                  className="justify-start"
                  onClick={() => {
                    toast({ title: "Coming Soon", description: "PPT export for this campaign" });
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Proof PPT
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
