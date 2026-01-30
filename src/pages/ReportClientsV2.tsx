import { useEffect, useState, useMemo, useCallback } from "react";
import { DateRange } from "react-day-picker";
import {
  Users,
  TrendingUp,
  Calendar,
  Briefcase,
  DollarSign,
  Camera,
  MapPin,
  Building2,
  ArrowUpRight,
  AlertCircle,
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
import { ReportControls } from "@/components/reports/ReportControls";
import { ReportKPICards } from "@/components/reports/ReportKPICards";
import { ReportEmptyState } from "@/components/reports/ReportEmptyState";
import { ReportExportMenu } from "@/components/reports/ReportExportMenu";
import { ClientDrilldownDialog } from "@/components/reports/ClientDrilldownDialog";
import { useReportFilters } from "@/hooks/useReportFilters";
import { SortConfig, doesRangeOverlap, getPreviousPeriod, calculateTrendPercentage } from "@/components/reports/types";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ClientBookingData {
  client_id: string;
  client_name: string;
  client_company: string;
  total_campaigns: number;
  active_campaigns: number;
  completed_campaigns: number;
  total_assets: number;
  total_value: number;
  avg_booking_value: number;
  pending_proofs: number;
  last_booking_date: string | null;
  cities: string[];
}

interface CampaignRow {
  id: string;
  client_id: string;
  client_name: string;
  campaign_name: string;
  start_date: string;
  end_date: string;
  status: string;
  total_assets: number;
  grand_total: number;
  company_id: string;
}

// Date type options for clients report
const DATE_TYPES = [
  { value: "booking_start", label: "Booking Start Date" },
  { value: "booking_end", label: "Booking End Date" },
  { value: "created", label: "Campaign Created Date" },
];

// Sort options
const SORT_OPTIONS = [
  { value: "client_name", label: "Client Name" },
  { value: "total_value", label: "Total Value" },
  { value: "total_campaigns", label: "Total Campaigns" },
  { value: "total_assets", label: "Assets Booked" },
  { value: "last_booking_date", label: "Last Booking" },
];

// Column configuration
const COLUMNS = [
  { key: "client_name", label: "Client Name", default: true },
  { key: "total_campaigns", label: "Total Campaigns", default: true },
  { key: "total_value", label: "Total Booking Value", default: true },
  { key: "total_assets", label: "Assets Booked", default: true },
  { key: "active_campaigns", label: "Active Campaigns", default: true },
  { key: "completed_campaigns", label: "Completed", default: false },
  { key: "pending_proofs", label: "Pending Proofs", default: true },
  { key: "avg_booking_value", label: "Avg Booking", default: false },
  { key: "last_booking_date", label: "Last Booking", default: true },
];

export default function ReportClientsV2() {
  const { company } = useCompany();
  const { toast } = useToast();

  // States
  const [loading, setLoading] = useState(false);
  const [clientData, setClientData] = useState<ClientBookingData[]>([]);
  const [allCampaigns, setAllCampaigns] = useState<CampaignRow[]>([]);
  const [previousPeriodData, setPreviousPeriodData] = useState<ClientBookingData[]>([]);

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
    filterSummary,
  } = useReportFilters({
    defaultDateType: "booking_start",
    defaultSortField: "client_name",
    defaultSortDirection: "asc",
    reportKey: "clients-report",
  });

  // Drilldown state
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<{ id: string; name: string } | null>(null);

  // Visible columns
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    COLUMNS.filter((c) => c.default).map((c) => c.key)
  );

  // Filter options derived from data
  const filterOptions = useMemo(() => {
    const cities = new Set<string>();
    const statuses = new Set<string>();
    const clients = new Map<string, number>();

    allCampaigns.forEach((c) => {
      statuses.add(c.status);
      clients.set(c.client_name, (clients.get(c.client_name) || 0) + 1);
    });

    clientData.forEach((c) => {
      c.cities.forEach((city) => cities.add(city));
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
  }, [allCampaigns, clientData]);

  // Load data
  const loadData = useCallback(async () => {
    if (!company?.id) return;

    setLoading(true);
    try {
      // Fetch all campaigns for the company
      const { data: campaigns, error } = await supabase
        .from("campaigns")
        .select("id, client_id, client_name, campaign_name, start_date, end_date, status, total_assets, grand_total, company_id, created_at")
        .eq("company_id", company.id)
        .order("start_date", { ascending: false });

      if (error) throw error;

      setAllCampaigns(campaigns || []);

      // Filter campaigns by date range
      const filteredCampaigns = (campaigns || []).filter((c) => {
        if (!dateRange?.from || !dateRange?.to) return true;

        const startDate = new Date(c.start_date);
        const endDate = new Date(c.end_date);
        const createdAt = new Date(c.created_at);

        switch (dateType) {
          case "booking_start":
            return startDate >= dateRange.from && startDate <= dateRange.to;
          case "booking_end":
            return endDate >= dateRange.from && endDate <= dateRange.to;
          case "created":
            return createdAt >= dateRange.from && createdAt <= dateRange.to;
          default:
            // Overlap logic
            return doesRangeOverlap(startDate, endDate, dateRange.from, dateRange.to);
        }
      });

      // Get campaign assets for pending proofs
      const campaignIds = filteredCampaigns.map((c) => c.id);
      let assetData: { campaign_id: string; status: string; city: string }[] = [];
      
      if (campaignIds.length > 0) {
        const { data: assets } = await supabase
          .from("campaign_assets")
          .select("campaign_id, status, city")
          .in("campaign_id", campaignIds);
        assetData = assets || [];
      }

      // Aggregate by client
      const clientMap = new Map<string, ClientBookingData>();

      filteredCampaigns.forEach((campaign) => {
        const existing = clientMap.get(campaign.client_id);
        const campaignAssets = assetData.filter((a) => a.campaign_id === campaign.id);
        const pendingProofs = campaignAssets.filter(
          (a) => a.status === "Pending" || a.status === "Assigned"
        ).length;
        const cities = [...new Set(campaignAssets.map((a) => a.city).filter(Boolean))];

        const isActive = ["InProgress", "Running", "Active", "Planned"].includes(campaign.status);
        const isCompleted = campaign.status === "Completed";

        if (existing) {
          existing.total_campaigns += 1;
          existing.total_value += campaign.grand_total || 0;
          existing.total_assets += campaign.total_assets || 0;
          existing.pending_proofs += pendingProofs;
          existing.active_campaigns += isActive ? 1 : 0;
          existing.completed_campaigns += isCompleted ? 1 : 0;
          existing.cities = [...new Set([...existing.cities, ...cities])];
          
          if (!existing.last_booking_date || campaign.start_date > existing.last_booking_date) {
            existing.last_booking_date = campaign.start_date;
          }
        } else {
          clientMap.set(campaign.client_id, {
            client_id: campaign.client_id,
            client_name: campaign.client_name,
            client_company: "",
            total_campaigns: 1,
            active_campaigns: isActive ? 1 : 0,
            completed_campaigns: isCompleted ? 1 : 0,
            total_assets: campaign.total_assets || 0,
            total_value: campaign.grand_total || 0,
            avg_booking_value: campaign.grand_total || 0,
            pending_proofs: pendingProofs,
            last_booking_date: campaign.start_date,
            cities,
          });
        }
      });

      // Calculate averages
      const clientList = Array.from(clientMap.values()).map((c) => ({
        ...c,
        avg_booking_value: c.total_campaigns > 0 ? c.total_value / c.total_campaigns : 0,
      }));

      setClientData(clientList);

      // Load previous period data for comparison
      if (comparisonEnabled && dateRange?.from && dateRange?.to) {
        const prevPeriod = getPreviousPeriod(dateRange.from, dateRange.to);
        
        const prevFiltered = (campaigns || []).filter((c) => {
          const startDate = new Date(c.start_date);
          return startDate >= prevPeriod.from && startDate <= prevPeriod.to;
        });

        const prevClientMap = new Map<string, ClientBookingData>();
        prevFiltered.forEach((campaign) => {
          const existing = prevClientMap.get(campaign.client_id);
          if (existing) {
            existing.total_campaigns += 1;
            existing.total_value += campaign.grand_total || 0;
          } else {
            prevClientMap.set(campaign.client_id, {
              client_id: campaign.client_id,
              client_name: campaign.client_name,
              client_company: "",
              total_campaigns: 1,
              active_campaigns: 0,
              completed_campaigns: 0,
              total_assets: campaign.total_assets || 0,
              total_value: campaign.grand_total || 0,
              avg_booking_value: 0,
              pending_proofs: 0,
              last_booking_date: null,
              cities: [],
            });
          }
        });

        setPreviousPeriodData(Array.from(prevClientMap.values()));
      }
    } catch (error: any) {
      console.error("Error loading client data:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load client booking data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [company?.id, dateRange, dateType, comparisonEnabled, toast]);

  // Initial load
  useEffect(() => {
    loadData();
  }, []);

  // Filtered and sorted data
  const filteredData = useMemo(() => {
    let result = [...clientData];

    // Search filter
    if (searchValue) {
      const term = searchValue.toLowerCase();
      result = result.filter(
        (c) =>
          c.client_name.toLowerCase().includes(term) ||
          c.client_company.toLowerCase().includes(term) ||
          c.cities.some((city) => city.toLowerCase().includes(term))
      );
    }

    // City filter
    if (selectedFilters.cities.length > 0) {
      result = result.filter((c) =>
        c.cities.some((city) => selectedFilters.cities.includes(city))
      );
    }

    // Sorting
    result.sort((a, b) => {
      const aVal = a[sortConfig.field as keyof ClientBookingData];
      const bVal = b[sortConfig.field as keyof ClientBookingData];

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortConfig.direction === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });

    return result;
  }, [clientData, searchValue, selectedFilters, sortConfig]);

  // KPIs
  const kpis = useMemo(() => {
    const totalClients = filteredData.length;
    const totalCampaigns = filteredData.reduce((sum, c) => sum + c.total_campaigns, 0);
    const totalValue = filteredData.reduce((sum, c) => sum + c.total_value, 0);
    const avgValue = totalClients > 0 ? totalValue / totalClients : 0;
    const pendingProofs = filteredData.reduce((sum, c) => sum + c.pending_proofs, 0);
    const totalAssets = filteredData.reduce((sum, c) => sum + c.total_assets, 0);

    // Previous period calculations for trends
    const prevTotalValue = previousPeriodData.reduce((sum, c) => sum + c.total_value, 0);
    const prevTotalCampaigns = previousPeriodData.reduce((sum, c) => sum + c.total_campaigns, 0);

    const valueTrend = comparisonEnabled && prevTotalValue > 0
      ? calculateTrendPercentage(totalValue, prevTotalValue)
      : undefined;
    const campaignTrend = comparisonEnabled && prevTotalCampaigns > 0
      ? calculateTrendPercentage(totalCampaigns, prevTotalCampaigns)
      : undefined;

    // Top city
    const cityCount = new Map<string, number>();
    filteredData.forEach((c) => {
      c.cities.forEach((city) => {
        cityCount.set(city, (cityCount.get(city) || 0) + 1);
      });
    });
    const topCity = [...cityCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "-";

    return [
      {
        label: "Total Clients",
        value: totalClients,
        icon: <Users className="h-5 w-5" />,
        color: "default" as const,
      },
      {
        label: "Total Campaigns",
        value: totalCampaigns,
        icon: <Briefcase className="h-5 w-5" />,
        trend: campaignTrend !== undefined
          ? { value: campaignTrend, direction: campaignTrend >= 0 ? "up" as const : "down" as const }
          : undefined,
      },
      {
        label: "Total Booking Value",
        value: formatCurrency(totalValue),
        icon: <DollarSign className="h-5 w-5" />,
        trend: valueTrend !== undefined
          ? { value: valueTrend, direction: valueTrend >= 0 ? "up" as const : "down" as const }
          : undefined,
        color: "success" as const,
      },
      {
        label: "Avg Value / Client",
        value: formatCurrency(avgValue),
        icon: <TrendingUp className="h-5 w-5" />,
      },
      {
        label: "Pending Proofs",
        value: pendingProofs,
        icon: <Camera className="h-5 w-5" />,
        color: pendingProofs > 0 ? "warning" as const : "default" as const,
      },
      {
        label: "Most Booked City",
        value: topCity,
        icon: <MapPin className="h-5 w-5" />,
      },
    ];
  }, [filteredData, previousPeriodData, comparisonEnabled]);

  // Export functions
  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Client Bookings");

    // Add headers
    const headers = COLUMNS.filter((c) => visibleColumns.includes(c.key)).map((c) => c.label);
    sheet.addRow(headers);

    // Style header row
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    // Add data
    filteredData.forEach((client) => {
      const row: any[] = [];
      COLUMNS.filter((c) => visibleColumns.includes(c.key)).forEach((col) => {
        switch (col.key) {
          case "client_name":
            row.push(client.client_name);
            break;
          case "total_campaigns":
            row.push(client.total_campaigns);
            break;
          case "total_value":
            row.push(client.total_value);
            break;
          case "total_assets":
            row.push(client.total_assets);
            break;
          case "active_campaigns":
            row.push(client.active_campaigns);
            break;
          case "completed_campaigns":
            row.push(client.completed_campaigns);
            break;
          case "pending_proofs":
            row.push(client.pending_proofs);
            break;
          case "avg_booking_value":
            row.push(client.avg_booking_value);
            break;
          case "last_booking_date":
            row.push(client.last_booking_date ? new Date(client.last_booking_date).toLocaleDateString() : "-");
            break;
        }
      });
      sheet.addRow(row);
    });

    // Auto-width columns
    sheet.columns.forEach((col) => {
      col.width = 18;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `client-bookings-${new Date().toISOString().split("T")[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Client Booking Report", 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Filters: ${filterSummary}`, 14, 36);

    const tableData = filteredData.map((c) => [
      c.client_name,
      c.total_campaigns.toString(),
      formatCurrency(c.total_value),
      c.total_assets.toString(),
      c.pending_proofs.toString(),
      c.last_booking_date ? new Date(c.last_booking_date).toLocaleDateString() : "-",
    ]);

    autoTable(doc, {
      head: [["Client", "Campaigns", "Total Value", "Assets", "Pending Proofs", "Last Booking"]],
      body: tableData,
      startY: 42,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 64, 175] },
    });

    doc.save(`client-bookings-${new Date().toISOString().split("T")[0]}.pdf`);
  };

  // Handle client click
  const handleClientClick = (client: ClientBookingData) => {
    setSelectedClient({ id: client.client_id, name: client.client_name });
    setDrilldownOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Report Controls */}
      <ReportControls
        reportKey="clients-report"
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
        searchPlaceholder="Search clients, companies, cities..."
        filters={{
          cities: filterOptions.cities,
          statuses: filterOptions.statuses,
        }}
        selectedFilters={selectedFilters}
        onFilterChange={handleFilterChange}
        sortOptions={SORT_OPTIONS}
        sortConfig={sortConfig}
        onSortChange={setSortConfig}
        columns={COLUMNS}
        visibleColumns={visibleColumns}
        onColumnsChange={setVisibleColumns}
        onApply={loadData}
        onReset={resetFilters}
        loading={loading}
      />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Client-wise Bookings</h1>
            <p className="text-muted-foreground">
              Analyze booking patterns and revenue by client
            </p>
          </div>
          <ReportExportMenu
            onExportExcel={handleExportExcel}
            onExportPDF={handleExportPDF}
            metadata={{
              reportName: "Client Bookings Report",
              generatedAt: new Date(),
              dateRange: dateRange?.from && dateRange?.to
                ? { from: dateRange.from, to: dateRange.to }
                : undefined,
              filtersApplied: Object.values(selectedFilters).flat(),
              companyName: company?.name,
            }}
            disabled={loading || filteredData.length === 0}
          />
        </div>

        {/* KPI Cards */}
        <ReportKPICards kpis={kpis} columns={6} />

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Client Booking Analytics
              <Badge variant="secondary" className="ml-2">
                {filteredData.length} clients
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredData.length === 0 ? (
              <ReportEmptyState
                title="No clients found"
                description="No client bookings match your current filters"
                filterSummary={filterSummary}
                onClearFilters={resetFilters}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {COLUMNS.filter((c) => visibleColumns.includes(c.key)).map((col) => (
                      <TableHead key={col.key}>{col.label}</TableHead>
                    ))}
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((client) => (
                    <TableRow
                      key={client.client_id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleClientClick(client)}
                    >
                      {visibleColumns.includes("client_name") && (
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            {client.client_name}
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.includes("total_campaigns") && (
                        <TableCell>{client.total_campaigns}</TableCell>
                      )}
                      {visibleColumns.includes("total_value") && (
                        <TableCell className="font-medium">
                          {formatCurrency(client.total_value)}
                        </TableCell>
                      )}
                      {visibleColumns.includes("total_assets") && (
                        <TableCell>{client.total_assets}</TableCell>
                      )}
                      {visibleColumns.includes("active_campaigns") && (
                        <TableCell>
                          {client.active_campaigns > 0 ? (
                            <Badge variant="default">{client.active_campaigns}</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.includes("completed_campaigns") && (
                        <TableCell>{client.completed_campaigns}</TableCell>
                      )}
                      {visibleColumns.includes("pending_proofs") && (
                        <TableCell>
                          {client.pending_proofs > 0 ? (
                            <Badge variant="outline" className="gap-1 text-amber-600 border-amber-200">
                              <AlertCircle className="h-3 w-3" />
                              {client.pending_proofs}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.includes("avg_booking_value") && (
                        <TableCell>{formatCurrency(client.avg_booking_value)}</TableCell>
                      )}
                      {visibleColumns.includes("last_booking_date") && (
                        <TableCell>
                          {client.last_booking_date ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              {new Date(client.last_booking_date).toLocaleDateString()}
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Client Drilldown Dialog */}
      {selectedClient && (
        <ClientDrilldownDialog
          open={drilldownOpen}
          onOpenChange={setDrilldownOpen}
          clientId={selectedClient.id}
          clientName={selectedClient.name}
          dateRange={dateRange?.from && dateRange?.to ? { from: dateRange.from, to: dateRange.to } : undefined}
        />
      )}
    </div>
  );
}
