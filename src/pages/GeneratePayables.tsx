import { useState, useMemo } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, CheckCircle2, AlertTriangle, IndianRupee, Zap,
  CalendarCheck, Printer, Hammer, ArrowDownToLine, ShieldCheck,
  Search, ArrowUpDown, ArrowUp, ArrowDown,
} from "lucide-react";
import { format, subMonths, endOfMonth } from "date-fns";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { computeOpsLines, RateSettingRow } from "@/lib/ops-rate-utils";

function generateMonthOptions() {
  const months: { label: string; value: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = subMonths(now, i);
    months.push({ label: format(d, "MMMM yyyy"), value: format(d, "yyyy-MM") });
  }
  return months;
}

type PayableEntry = {
  category: "Mounting" | "Printing" | "Unmounting";
  amount: number;
  campaignId: string;
  campaignName: string;
  clientName: string;
  assetId: string;
  location: string;
  city: string;
  mediaType: string;
  vendorName: string;
  month: string;
};

type SortField = "category" | "campaignName" | "clientName" | "assetId" | "location" | "amount";
type SortDir = "asc" | "desc";
type CategoryFilter = "All" | "Mounting" | "Printing" | "Unmounting";

export default function GeneratePayables() {
  const { company } = useCompany();
  const companyId = company?.id;
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(format(subMonths(new Date(), 0), "yyyy-MM"));
  const [generating, setGenerating] = useState(false);
  const [generatingCategory, setGeneratingCategory] = useState<string | null>(null);
  const monthOptions = useMemo(generateMonthOptions, []);

  // Filter & sort state
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("All");
  const [sortField, setSortField] = useState<SortField>("category");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Check if already generated
  const { data: existingBatch, isLoading: batchLoading } = useQuery({
    queryKey: ["payable-batch", companyId, selectedMonth],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase
        .from("payable_batches" as any)
        .select("*")
        .eq("company_id", companyId!)
        .eq("month_key", selectedMonth)
        .maybeSingle();
      return data as any;
    },
  });

  // Preview: compute lines for the month
  const { data: previewData, isLoading: previewLoading } = useQuery({
    queryKey: ["payable-preview", companyId, selectedMonth],
    enabled: !!companyId,
    queryFn: async () => {
      const monthStart = `${selectedMonth}-01`;
      const monthEnd = format(endOfMonth(new Date(monthStart)), "yyyy-MM-dd");

      const [caRes, campRes, ratesRes] = await Promise.all([
        supabase
          .from("campaign_assets")
          .select("campaign_id, asset_id, location, city, area, media_type, total_sqft, illumination_type, printing_cost, printing_charges, mounting_cost, mounting_charges, booking_start_date, booking_end_date, status"),
        supabase
          .from("campaigns")
          .select("id, campaign_name, client_name, start_date, end_date, status, company_id")
          .eq("company_id", companyId!)
          .is("is_deleted", false),
        supabase
          .from("rate_settings" as any)
          .select("*")
          .eq("company_id", companyId!)
          .eq("is_active", true),
      ]);

      const campaigns = new Map(
        (campRes.data ?? []).map((c: any) => [c.id, c])
      );
      const companyAssets = (caRes.data ?? []).filter((ca: any) => campaigns.has(ca.campaign_id));
      const rates = (ratesRes.data ?? []) as unknown as RateSettingRow[];
      const allLines = computeOpsLines(companyAssets, campaigns, rates);

      const entries: PayableEntry[] = [];

      for (const line of allLines) {
        if (line.mountingMonth === selectedMonth && line.mountingPayable > 0) {
          entries.push({
            category: "Mounting", amount: line.mountingPayable,
            campaignId: line.campaignId, campaignName: line.campaignName,
            clientName: line.clientName, assetId: line.assetId,
            location: line.location, city: line.city, mediaType: line.mediaType,
            vendorName: "Vendor (Mounter)", month: selectedMonth,
          });
        }
        if (line.mountingMonth === selectedMonth && line.printingRequired && line.printingPayable > 0) {
          entries.push({
            category: "Printing", amount: line.printingPayable,
            campaignId: line.campaignId, campaignName: line.campaignName,
            clientName: line.clientName, assetId: line.assetId,
            location: line.location, city: line.city, mediaType: line.mediaType,
            vendorName: "Vendor (Printer)", month: selectedMonth,
          });
        }
        if (line.unmountingMonth === selectedMonth && line.unmountingPayable > 0) {
          entries.push({
            category: "Unmounting", amount: line.unmountingPayable,
            campaignId: line.campaignId, campaignName: line.campaignName,
            clientName: line.clientName, assetId: line.assetId,
            location: line.location, city: line.city, mediaType: line.mediaType,
            vendorName: "Vendor (Mounter)", month: selectedMonth,
          });
        }
      }

      return entries;
    },
  });

  const allEntries = previewData ?? [];

  // Apply filters + search + sort
  const filteredEntries = useMemo(() => {
    let result = allEntries;

    // Category filter
    if (categoryFilter !== "All") {
      result = result.filter(e => e.category === categoryFilter);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        e.campaignName.toLowerCase().includes(q) ||
        e.clientName.toLowerCase().includes(q) ||
        e.assetId.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        e.city.toLowerCase().includes(q) ||
        e.vendorName.toLowerCase().includes(q)
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      let aVal: string | number = a[sortField] ?? "";
      let bVal: string | number = b[sortField] ?? "";
      if (sortField === "amount") {
        return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
      }
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [allEntries, categoryFilter, search, sortField, sortDir]);

  // Totals from allEntries (unfiltered for KPIs)
  const totalAmount = allEntries.reduce((s, e) => s + e.amount, 0);
  const mountEntries = allEntries.filter(e => e.category === "Mounting");
  const printEntries = allEntries.filter(e => e.category === "Printing");
  const unmountEntries = allEntries.filter(e => e.category === "Unmounting");
  const mountTotal = mountEntries.reduce((s, e) => s + e.amount, 0);
  const printTotal = printEntries.reduce((s, e) => s + e.amount, 0);
  const unmountTotal = unmountEntries.reduce((s, e) => s + e.amount, 0);

  // Filtered total for display
  const filteredTotal = filteredEntries.reduce((s, e) => s + e.amount, 0);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  }

  async function handleGenerate(filterCategory?: CategoryFilter) {
    if (!companyId) return;
    const entriesToGenerate = filterCategory && filterCategory !== "All"
      ? allEntries.filter(e => e.category === filterCategory)
      : allEntries;
    if (entriesToGenerate.length === 0) return;

    setGenerating(true);
    setGeneratingCategory(filterCategory || "All");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date().toISOString();
      const monthStart = `${selectedMonth}-01`;

      const expenseRows = entriesToGenerate.map((e, idx) => ({
        id: `EXP-PAY-${selectedMonth.replace("-", "")}-${filterCategory ? filterCategory.substring(0, 3).toUpperCase() : "ALL"}-${String(idx + 1).padStart(4, "0")}`,
        company_id: companyId,
        category: e.category === "Unmounting" ? "Mounting" : e.category,
        subcategory: e.category === "Unmounting" ? "Unmounting" : null,
        amount: e.amount,
        gst_amount: 0,
        gst_percent: 0,
        total_amount: e.amount,
        vendor_name: e.vendorName,
        campaign_id: e.campaignId,
        asset_id: e.assetId,
        bill_month: selectedMonth,
        expense_date: monthStart,
        allocation_type: "Campaign",
        payment_status: "Pending" as const,
        notes: `Auto-generated ${e.category} payable for ${e.assetId} - ${e.campaignName}`,
        created_by: user?.id ?? null,
        created_at: now,
      }));

      const { error: expError } = await supabase
        .from("expenses")
        .insert(expenseRows as any);
      if (expError) throw expError;

      // Record batch only if generating ALL
      if (!filterCategory || filterCategory === "All") {
        const { error: batchError } = await supabase
          .from("payable_batches" as any)
          .insert({
            company_id: companyId,
            month_key: selectedMonth,
            generated_by: user?.id ?? null,
            total_entries: entriesToGenerate.length,
            total_amount: entriesToGenerate.reduce((s, e) => s + e.amount, 0),
            notes: `Mounting: ${mountEntries.length}, Printing: ${printEntries.length}, Unmounting: ${unmountEntries.length}`,
          });
        if (batchError) throw batchError;
      }

      queryClient.invalidateQueries({ queryKey: ["payable-batch"] });
      queryClient.invalidateQueries({ queryKey: ["payable-preview"] });
      const label = filterCategory && filterCategory !== "All" ? filterCategory : "All";
      toast.success(`${entriesToGenerate.length} ${label} payable entries generated for ${format(new Date(monthStart), "MMMM yyyy")}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate payables");
    } finally {
      setGenerating(false);
      setGeneratingCategory(null);
    }
  }

  const isGenerated = !!existingBatch;
  const loading = batchLoading || previewLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6" />
            Generate Vendor Payables
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Auto-generate mounting, printing & unmounting expense entries from campaign data
          </p>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map(m => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Already Generated Banner */}
      {isGenerated && (
        <Alert className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <AlertTitle>Already Generated</AlertTitle>
          <AlertDescription>
            Payables for {format(new Date(`${selectedMonth}-01`), "MMMM yyyy")} were generated on{" "}
            {format(new Date((existingBatch as any)?.generated_at), "dd MMM yyyy, hh:mm a")} — {(existingBatch as any)?.total_entries} entries, ₹{((existingBatch as any)?.total_amount ?? 0).toLocaleString("en-IN")} total.
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}><CardContent className="pt-4 pb-3 space-y-2">
              <div className="h-3 w-20 bg-muted animate-pulse rounded" />
              <div className="h-7 w-16 bg-muted animate-pulse rounded" />
            </CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setCategoryFilter("All")}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <IndianRupee className="h-3.5 w-3.5" /> Total Payable
              </div>
              <p className="text-2xl font-bold">₹{totalAmount.toLocaleString("en-IN")}</p>
              <p className="text-xs text-muted-foreground">{allEntries.length} entries</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setCategoryFilter("Mounting")}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Hammer className="h-3.5 w-3.5" /> Mounting
              </div>
              <p className="text-2xl font-bold">{mountEntries.length}</p>
              <p className="text-xs text-muted-foreground">₹{mountTotal.toLocaleString("en-IN")}</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setCategoryFilter("Printing")}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Printer className="h-3.5 w-3.5" /> Printing
              </div>
              <p className="text-2xl font-bold">{printEntries.length}</p>
              <p className="text-xs text-muted-foreground">₹{printTotal.toLocaleString("en-IN")}</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setCategoryFilter("Unmounting")}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <ArrowDownToLine className="h-3.5 w-3.5" /> Unmounting
              </div>
              <p className="text-2xl font-bold">{unmountEntries.length}</p>
              <p className="text-xs text-muted-foreground">₹{unmountTotal.toLocaleString("en-IN")}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Preview Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Payable Preview</CardTitle>
              <CardDescription>
                {filteredEntries.length} of {allEntries.length} entries
                {categoryFilter !== "All" && ` — filtered by ${categoryFilter}`}
                {filteredEntries.length > 0 && ` — ₹${filteredTotal.toLocaleString("en-IN")}`}
              </CardDescription>
            </div>
          </div>

          {/* Toolbar: Tabs + Search */}
          <div className="flex flex-col sm:flex-row gap-3 mt-3">
            <Tabs value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as CategoryFilter)} className="flex-shrink-0">
              <TabsList className="h-9">
                <TabsTrigger value="All" className="text-xs px-3">All ({allEntries.length})</TabsTrigger>
                <TabsTrigger value="Mounting" className="text-xs px-3">
                  <Hammer className="h-3 w-3 mr-1" /> Mounting ({mountEntries.length})
                </TabsTrigger>
                <TabsTrigger value="Printing" className="text-xs px-3">
                  <Printer className="h-3 w-3 mr-1" /> Printing ({printEntries.length})
                </TabsTrigger>
                <TabsTrigger value="Unmounting" className="text-xs px-3">
                  <ArrowDownToLine className="h-3 w-3 mr-1" /> Unmount ({unmountEntries.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaign, client, asset, location..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-10 bg-muted animate-pulse rounded" />)}
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarCheck className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">
                {allEntries.length === 0 ? "No payables found for this month" : "No entries match your filter"}
              </p>
              <p className="text-sm mt-1">
                {allEntries.length === 0
                  ? "No mounting, printing, or unmounting events detected"
                  : "Try adjusting your search or category filter"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("category")}>
                      <span className="flex items-center">Category <SortIcon field="category" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("campaignName")}>
                      <span className="flex items-center">Campaign <SortIcon field="campaignName" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("clientName")}>
                      <span className="flex items-center">Client <SortIcon field="clientName" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("assetId")}>
                      <span className="flex items-center">Asset <SortIcon field="assetId" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("location")}>
                      <span className="flex items-center">Location <SortIcon field="location" /></span>
                    </TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort("amount")}>
                      <span className="flex items-center justify-end">Amount (₹) <SortIcon field="amount" /></span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((e, idx) => (
                    <TableRow key={idx} className={idx % 2 === 1 ? "bg-muted/30" : ""}>
                      <TableCell>
                        <Badge variant={
                          e.category === "Mounting" ? "default" :
                            e.category === "Printing" ? "secondary" : "outline"
                        }>
                          {e.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-sm">{e.campaignName}</TableCell>
                      <TableCell className="text-sm">{e.clientName}</TableCell>
                      <TableCell className="text-xs font-mono">{e.assetId}</TableCell>
                      <TableCell className="text-sm">{e.location || e.city}</TableCell>
                      <TableCell className="text-sm">{e.vendorName}</TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {e.amount.toLocaleString("en-IN")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate Actions */}
      {!isGenerated && allEntries.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              {/* Individual category buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {mountEntries.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => handleGenerate("Mounting")}
                    disabled={generating}
                    className="h-auto py-3 flex-col gap-1"
                  >
                    {generating && generatingCategory === "Mounting" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Hammer className="h-4 w-4" />
                    )}
                    <span className="text-sm font-medium">Generate Mounting</span>
                    <span className="text-xs text-muted-foreground">
                      {mountEntries.length} entries — ₹{mountTotal.toLocaleString("en-IN")}
                    </span>
                  </Button>
                )}
                {printEntries.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => handleGenerate("Printing")}
                    disabled={generating}
                    className="h-auto py-3 flex-col gap-1"
                  >
                    {generating && generatingCategory === "Printing" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Printer className="h-4 w-4" />
                    )}
                    <span className="text-sm font-medium">Generate Printing</span>
                    <span className="text-xs text-muted-foreground">
                      {printEntries.length} entries — ₹{printTotal.toLocaleString("en-IN")}
                    </span>
                  </Button>
                )}
                {unmountEntries.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => handleGenerate("Unmounting")}
                    disabled={generating}
                    className="h-auto py-3 flex-col gap-1"
                  >
                    {generating && generatingCategory === "Unmounting" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowDownToLine className="h-4 w-4" />
                    )}
                    <span className="text-sm font-medium">Generate Unmounting</span>
                    <span className="text-xs text-muted-foreground">
                      {unmountEntries.length} entries — ₹{unmountTotal.toLocaleString("en-IN")}
                    </span>
                  </Button>
                )}
              </div>

              {/* Generate All */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t">
                <div>
                  <h3 className="font-semibold">
                    Generate All {allEntries.length} Payable Entries
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    This will create expense records totaling ₹{totalAmount.toLocaleString("en-IN")}. Vendor Ledger will auto-update.
                  </p>
                </div>
                <Button size="lg" onClick={() => handleGenerate()} disabled={generating} className="min-w-[200px]">
                  {generating && generatingCategory === "All" ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                  ) : (
                    <><CheckCircle2 className="mr-2 h-4 w-4" /> Generate All Payables</>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
