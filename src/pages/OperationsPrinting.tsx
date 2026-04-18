import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FileCheck,
  MapPin,
  Calendar,
  IndianRupee,
  TrendingUp,
  Wallet,
  Settings2,
  ChevronDown,
  ChevronRight,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Filter,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import {
  getPrintingStatusBadge,
  normalizePrintingStatus,
} from "@/lib/printing/printingStatus";
import PanelEditorSheet from "@/components/operations/printing/PanelEditorSheet";
import type { PrintingPanel } from "@/lib/printing/printingDefaults";
import {
  DatePeriodFilter,
  type DatePeriodValue,
  type PeriodKey,
  getPeriodRange,
} from "@/components/common/DatePeriodFilter";
import type { DateRange } from "react-day-picker";

interface CampaignAsset {
  id: string;
  campaign_id: string;
  asset_id: string;
  city: string;
  area: string;
  location: string;
  media_type: string;
  status: string;
  printing_charges: number | null;
  printing_client_amount: number | null;
  printing_vendor_amount: number | null;
  printing_margin_amount: number | null;
  printing_costing_mode: string | null;
  campaigns: {
    campaign_name: string;
    client_name: string;
    start_date: string;
    company_id?: string | null;
  } | null;
}

type SortField =
  | "campaign"
  | "client"
  | "location"
  | "city"
  | "panels"
  | "client_amt"
  | "vendor_amt"
  | "margin_amt"
  | "start_date"
  | "status";
type SortDir = "asc" | "desc";

const STATUS_OPTIONS = ["Pending", "Assigned", "Installed", "Completed"];

export default function OperationsPrinting() {
  const [assets, setAssets] = useState<CampaignAsset[]>([]);
  const [panelsByAsset, setPanelsByAsset] = useState<Record<string, PrintingPanel[]>>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<CampaignAsset | null>(null);
  const { toast } = useToast();
  const { isAdmin, hasRole } = useAuth();

  // Filters & sorting
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [costingMode, setCostingMode] = useState<string>("all");
  const [period, setPeriod] = useState<PeriodKey>("current_month");
  const [dateRange, setDateRange] = useState<DatePeriodValue | undefined>(() =>
    getPeriodRange("current_month")
  );
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [sortField, setSortField] = useState<SortField>("start_date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const canEdit =
    isAdmin || hasRole("finance") || hasRole("operations") || hasRole("operations_manager");
  const canSeeVendor = canEdit;

  useEffect(() => {
    void loadPrintingQueue();
  }, []);

  const loadPrintingQueue = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("campaign_assets")
        .select(
          `
          id, campaign_id, asset_id, city, area, location, media_type, status,
          printing_charges, printing_client_amount, printing_vendor_amount,
          printing_margin_amount, printing_costing_mode,
          campaigns ( campaign_name, client_name, start_date, company_id )
        `
        )
        .in("status", ["Assigned", "Pending", "Installed", "Completed"])
        .order("campaigns(start_date)", { ascending: true });

      if (error) throw error;
      const list = (data || []) as unknown as CampaignAsset[];
      setAssets(list);

      const ids = list.map((a) => a.id);
      if (ids.length) {
        const { data: pData, error: pErr } = await supabase
          .from("campaign_asset_printing_panels")
          .select("*")
          .in("campaign_asset_id", ids)
          .order("sort_order", { ascending: true });
        if (pErr) throw pErr;
        const grouped: Record<string, PrintingPanel[]> = {};
        (pData || []).forEach((row: any) => {
          (grouped[row.campaign_asset_id] ||= []).push(row as PrintingPanel);
        });
        setPanelsByAsset(grouped);
      } else {
        setPanelsByAsset({});
      }
    } catch (error: any) {
      console.error("Error loading printing queue:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load printing queue",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Distinct city / client lists for filter dropdowns
  const cities = useMemo(
    () =>
      Array.from(new Set(assets.map((a) => a.city).filter(Boolean))).sort(),
    [assets]
  );
  const clients = useMemo(
    () =>
      Array.from(
        new Set(assets.map((a) => a.campaigns?.client_name).filter(Boolean) as string[])
      ).sort(),
    [assets]
  );

  // Apply filters
  const filteredAssets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets.filter((a) => {
      // Search across campaign, client, location, area, city, asset code
      if (q) {
        const hay = [
          a.campaigns?.campaign_name,
          a.campaigns?.client_name,
          a.location,
          a.area,
          a.city,
          a.asset_id,
          a.media_type,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (statusFilter !== "all") {
        if (normalizePrintingStatus(a.status) !== normalizePrintingStatus(statusFilter))
          return false;
      }
      if (cityFilter !== "all" && a.city !== cityFilter) return false;
      if (clientFilter !== "all" && a.campaigns?.client_name !== clientFilter)
        return false;
      if (costingMode !== "all") {
        const panels = panelsByAsset[a.id] || [];
        const mode = panels.length > 0 ? "panel_based" : "legacy";
        if (mode !== costingMode) return false;
      }
      if (dateRange?.from && dateRange?.to && a.campaigns?.start_date) {
        const sd = a.campaigns.start_date;
        if (sd < dateRange.from || sd > dateRange.to) return false;
      }
      return true;
    });
  }, [
    assets,
    search,
    statusFilter,
    cityFilter,
    clientFilter,
    costingMode,
    dateRange,
    panelsByAsset,
  ]);

  // Apply sort
  const sortedAssets = useMemo(() => {
    const arr = [...filteredAssets];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      const get = (x: CampaignAsset): string | number => {
        switch (sortField) {
          case "campaign":
            return (x.campaigns?.campaign_name || "").toLowerCase();
          case "client":
            return (x.campaigns?.client_name || "").toLowerCase();
          case "location":
            return (x.location || "").toLowerCase();
          case "city":
            return (x.city || "").toLowerCase();
          case "panels":
            return (panelsByAsset[x.id] || []).length;
          case "client_amt":
            return Number(x.printing_client_amount || x.printing_charges || 0);
          case "vendor_amt":
            return Number(x.printing_vendor_amount || 0);
          case "margin_amt":
            return Number(x.printing_margin_amount || 0);
          case "start_date":
            return x.campaigns?.start_date || "";
          case "status":
            return normalizePrintingStatus(x.status);
          default:
            return "";
        }
      };
      const va = get(a);
      const vb = get(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    return arr;
  }, [filteredAssets, sortField, sortDir, panelsByAsset]);

  const totals = useMemo(() => {
    return sortedAssets.reduce(
      (acc, a) => {
        const client = Number(a.printing_client_amount || a.printing_charges || 0);
        const vendor = Number(a.printing_vendor_amount || 0);
        const margin = Number(a.printing_margin_amount || 0);
        const ns = normalizePrintingStatus(a.status);
        return {
          client: acc.client + client,
          vendor: acc.vendor + vendor,
          margin: acc.margin + margin,
          pending: acc.pending + (ns === "Pending" || ns === "Assigned" ? 1 : 0),
        };
      },
      { client: 0, vendor: 0, margin: 0, pending: 0 }
    );
  }, [sortedAssets]);

  const toggleExpand = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const openEditor = (asset: CampaignAsset) => {
    setEditingAsset(asset);
    setEditorOpen(true);
  };

  const renderStatus = (status: string) => {
    const meta = getPrintingStatusBadge(status);
    return (
      <Badge variant={meta.variant} className={meta.className}>
        {meta.label}
      </Badge>
    );
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3 ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1" />
    );
  };

  const SortableHead = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead>
      <button
        type="button"
        onClick={() => handleSort(field)}
        className="flex items-center hover:text-foreground transition-colors"
      >
        {children}
        <SortIcon field={field} />
      </button>
    </TableHead>
  );

  const handlePeriodChange = (
    p: PeriodKey,
    range: DatePeriodValue | undefined,
    custom?: DateRange
  ) => {
    setPeriod(p);
    setDateRange(range);
    if (custom) setCustomRange(custom);
  };

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setCityFilter("all");
    setClientFilter("all");
    setCostingMode("all");
    setPeriod("all");
    setDateRange(undefined);
    setCustomRange(undefined);
  };

  const activeFilterCount =
    (search ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    (cityFilter !== "all" ? 1 : 0) +
    (clientFilter !== "all" ? 1 : 0) +
    (costingMode !== "all" ? 1 : 0) +
    (period !== "all" ? 1 : 0);

  return (
    <div className="h-full flex flex-col space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Printing Status</h1>
        <p className="text-muted-foreground">
          Monitor printing progress, panel-wise costing, and vendor payables
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          icon={<IndianRupee className="h-4 w-4" />}
          label="Total Client Printing"
          value={`₹${totals.client.toLocaleString()}`}
        />
        {canSeeVendor && (
          <SummaryCard
            icon={<Wallet className="h-4 w-4" />}
            label="Total Printer Payable"
            value={`₹${totals.vendor.toLocaleString()}`}
          />
        )}
        {canSeeVendor && (
          <SummaryCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Total Printing Margin"
            value={`₹${totals.margin.toLocaleString()}`}
            highlight
          />
        )}
        <SummaryCard
          icon={<FileCheck className="h-4 w-4" />}
          label="Pending Jobs"
          value={String(totals.pending)}
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[220px]">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Campaign, client, location, asset code…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 pl-8"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Period (Campaign Start)
              </label>
              <DatePeriodFilter
                value={period}
                customRange={customRange}
                onChange={handlePeriodChange}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Status
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                City
              </label>
              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger className="h-9 w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {cities.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Client
              </label>
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="h-9 w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Costing Mode
              </label>
              <Select value={costingMode} onValueChange={setCostingMode}>
                <SelectTrigger className="h-9 w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modes</SelectItem>
                  <SelectItem value="panel_based">Panel-based</SelectItem>
                  <SelectItem value="legacy">Legacy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-9 gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                Clear ({activeFilterCount})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Printing Queue ({sortedAssets.length}
            {sortedAssets.length !== assets.length && ` of ${assets.length}`})
          </CardTitle>
          <CardDescription>
            Track printing status and configure panel-wise client/vendor costs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : sortedAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Filter className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">
                {assets.length === 0
                  ? "No printing jobs in queue"
                  : "No jobs match your filters"}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {assets.length === 0
                  ? "Printing tasks will appear here once campaigns start"
                  : "Try adjusting filters or clear them to see all jobs"}
              </p>
              {activeFilterCount > 0 && (
                <Button variant="outline" size="sm" onClick={resetFilters} className="mt-4">
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <SortableHead field="campaign">Campaign</SortableHead>
                  <SortableHead field="client">Client</SortableHead>
                  <SortableHead field="location">Asset Location</SortableHead>
                  <SortableHead field="panels">Panels</SortableHead>
                  <SortableHead field="client_amt">Client ₹</SortableHead>
                  {canSeeVendor && <SortableHead field="vendor_amt">Vendor ₹</SortableHead>}
                  {canSeeVendor && <SortableHead field="margin_amt">Margin ₹</SortableHead>}
                  <SortableHead field="start_date">Start</SortableHead>
                  <SortableHead field="status">Status</SortableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAssets.map((asset) => {
                  const panels = panelsByAsset[asset.id] || [];
                  const isOpen = !!expanded[asset.id];
                  const clientAmt = Number(
                    asset.printing_client_amount || asset.printing_charges || 0
                  );
                  const vendorAmt = Number(asset.printing_vendor_amount || 0);
                  const marginAmt = Number(asset.printing_margin_amount || 0);
                  return (
                    <>
                      <TableRow key={asset.id}>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => toggleExpand(asset.id)}
                            disabled={panels.length === 0}
                          >
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">
                          {asset.campaigns?.campaign_name}
                        </TableCell>
                        <TableCell>{asset.campaigns?.client_name}</TableCell>
                        <TableCell>
                          <div className="flex items-start gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
                            <div className="text-sm">
                              <div>{asset.location}</div>
                              <div className="text-xs text-muted-foreground">
                                {asset.area}, {asset.city}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {panels.length > 0 ? (
                            <Badge variant="secondary">{panels.length} panel(s)</Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Legacy
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>₹{clientAmt.toLocaleString()}</TableCell>
                        {canSeeVendor && (
                          <TableCell>
                            {vendorAmt ? `₹${vendorAmt.toLocaleString()}` : "—"}
                          </TableCell>
                        )}
                        {canSeeVendor && (
                          <TableCell className="text-green-700">
                            {marginAmt ? `₹${marginAmt.toLocaleString()}` : "—"}
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {asset.campaigns?.start_date
                              ? new Date(asset.campaigns.start_date).toLocaleDateString("en-IN")
                              : "—"}
                          </div>
                        </TableCell>
                        <TableCell>{renderStatus(asset.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditor(asset)}
                            disabled={!canEdit}
                          >
                            <Settings2 className="h-4 w-4 mr-1" />
                            {panels.length ? "Edit panels" : "Configure"}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {isOpen && panels.length > 0 && (
                        <TableRow key={`${asset.id}-panels`} className="bg-muted/30">
                          <TableCell />
                          <TableCell colSpan={canSeeVendor ? 10 : 8}>
                            <div className="py-2">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Panel</TableHead>
                                    <TableHead>Size</TableHead>
                                    <TableHead>Sqft</TableHead>
                                    <TableHead>Illumination</TableHead>
                                    <TableHead>Client ₹/sqft</TableHead>
                                    {canSeeVendor && <TableHead>Vendor ₹/sqft</TableHead>}
                                    <TableHead>Client ₹</TableHead>
                                    {canSeeVendor && <TableHead>Vendor ₹</TableHead>}
                                    {canSeeVendor && <TableHead>Margin ₹</TableHead>}
                                    {canSeeVendor && <TableHead>Vendor</TableHead>}
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {panels.map((p) => (
                                    <TableRow key={p.id}>
                                      <TableCell className="font-medium">{p.panel_name}</TableCell>
                                      <TableCell>{`${p.width_ft} × ${p.height_ft}`}</TableCell>
                                      <TableCell>{p.sqft}</TableCell>
                                      <TableCell>
                                        <Badge variant="outline">{p.illumination_type}</Badge>
                                      </TableCell>
                                      <TableCell>₹{p.client_rate_per_sqft}</TableCell>
                                      {canSeeVendor && (
                                        <TableCell>₹{p.vendor_rate_per_sqft}</TableCell>
                                      )}
                                      <TableCell>₹{p.client_amount}</TableCell>
                                      {canSeeVendor && <TableCell>₹{p.vendor_amount}</TableCell>}
                                      {canSeeVendor && (
                                        <TableCell className="text-green-700">
                                          ₹{p.margin_amount}
                                        </TableCell>
                                      )}
                                      {canSeeVendor && (
                                        <TableCell>{p.printer_vendor_name || "—"}</TableCell>
                                      )}
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PanelEditorSheet
        open={editorOpen}
        onOpenChange={setEditorOpen}
        campaignAssetId={editingAsset?.id ?? null}
        campaignId={editingAsset?.campaign_id ?? null}
        companyId={editingAsset?.campaigns?.company_id ?? null}
        assetLabel={
          editingAsset
            ? `${editingAsset.location} · ${editingAsset.area}, ${editingAsset.city}`
            : undefined
        }
        canEdit={canEdit}
        onSaved={loadPrintingQueue}
      />
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon}
          {label}
        </div>
        <div
          className={`text-2xl font-bold mt-1 ${highlight ? "text-green-700" : ""}`}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
