import { useState, useMemo } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Loader2, CheckCircle2, AlertTriangle, IndianRupee, Zap,
  CalendarCheck, Printer, Hammer, ArrowDownToLine, ShieldCheck
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { computeOpsLines, RateSettingRow, OpsMarginLine } from "@/lib/ops-rate-utils";

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

export default function GeneratePayables() {
  const { company } = useCompany();
  const companyId = company?.id;
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(format(subMonths(new Date(), 0), "yyyy-MM"));
  const [generating, setGenerating] = useState(false);
  const monthOptions = useMemo(generateMonthOptions, []);

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

      // Filter lines relevant to this month (mounting in month or unmounting in month)
      const entries: PayableEntry[] = [];

      for (const line of allLines) {
        // Mounting payable: if mounting month matches
        if (line.mountingMonth === selectedMonth && line.mountingPayable > 0) {
          entries.push({
            category: "Mounting",
            amount: line.mountingPayable,
            campaignId: line.campaignId,
            campaignName: line.campaignName,
            clientName: line.clientName,
            assetId: line.assetId,
            location: line.location,
            city: line.city,
            mediaType: line.mediaType,
            vendorName: "Vendor (Mounter)",
            month: selectedMonth,
          });
        }

        // Printing payable: if mounting month matches and printing required
        if (line.mountingMonth === selectedMonth && line.printingRequired && line.printingPayable > 0) {
          entries.push({
            category: "Printing",
            amount: line.printingPayable,
            campaignId: line.campaignId,
            campaignName: line.campaignName,
            clientName: line.clientName,
            assetId: line.assetId,
            location: line.location,
            city: line.city,
            mediaType: line.mediaType,
            vendorName: "Vendor (Printer)",
            month: selectedMonth,
          });
        }

        // Unmounting payable: if unmounting month matches
        if (line.unmountingMonth === selectedMonth && line.unmountingPayable > 0) {
          entries.push({
            category: "Unmounting",
            amount: line.unmountingPayable,
            campaignId: line.campaignId,
            campaignName: line.campaignName,
            clientName: line.clientName,
            assetId: line.assetId,
            location: line.location,
            city: line.city,
            mediaType: line.mediaType,
            vendorName: "Vendor (Mounter)",
            month: selectedMonth,
          });
        }
      }

      return entries;
    },
  });

  const entries = previewData ?? [];
  const totalAmount = entries.reduce((s, e) => s + e.amount, 0);
  const mountCount = entries.filter(e => e.category === "Mounting").length;
  const printCount = entries.filter(e => e.category === "Printing").length;
  const unmountCount = entries.filter(e => e.category === "Unmounting").length;

  async function handleGenerate() {
    if (!companyId || entries.length === 0) return;
    setGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date().toISOString();
      const monthStart = `${selectedMonth}-01`;

      // Create expense entries
      const expenseRows = entries.map((e, idx) => ({
        id: `EXP-PAY-${selectedMonth.replace("-", "")}-${String(idx + 1).padStart(4, "0")}`,
        company_id: companyId,
        category: e.category === "Unmounting" ? "Mounting" : e.category, // DB enum fallback
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

      // Record batch
      const { error: batchError } = await supabase
        .from("payable_batches" as any)
        .insert({
          company_id: companyId,
          month_key: selectedMonth,
          generated_by: user?.id ?? null,
          total_entries: entries.length,
          total_amount: totalAmount,
          notes: `Mounting: ${mountCount}, Printing: ${printCount}, Unmounting: ${unmountCount}`,
        });

      if (batchError) throw batchError;

      queryClient.invalidateQueries({ queryKey: ["payable-batch"] });
      queryClient.invalidateQueries({ queryKey: ["payable-preview"] });
      toast.success(`${entries.length} payable entries generated for ${format(new Date(monthStart), "MMMM yyyy")}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate payables");
    } finally {
      setGenerating(false);
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
          {[1,2,3,4].map(i => (
            <Card key={i}><CardContent className="pt-4 pb-3 space-y-2">
              <div className="h-3 w-20 bg-muted animate-pulse rounded" />
              <div className="h-7 w-16 bg-muted animate-pulse rounded" />
            </CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <IndianRupee className="h-3.5 w-3.5" /> Total Payable
              </div>
              <p className="text-2xl font-bold">₹{totalAmount.toLocaleString("en-IN")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Hammer className="h-3.5 w-3.5" /> Mounting
              </div>
              <p className="text-2xl font-bold">{mountCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Printer className="h-3.5 w-3.5" /> Printing
              </div>
              <p className="text-2xl font-bold">{printCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <ArrowDownToLine className="h-3.5 w-3.5" /> Unmounting
              </div>
              <p className="text-2xl font-bold">{unmountCount}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Preview Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payable Preview</CardTitle>
          <CardDescription>
            {entries.length} entries will be created as expense records
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-muted animate-pulse rounded" />)}
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarCheck className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No payables found for this month</p>
              <p className="text-sm mt-1">No mounting, printing, or unmounting events detected</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">Amount (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e, idx) => (
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

      {/* Generate Action */}
      {!isGenerated && entries.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold">
                  Generate {entries.length} Payable Entries
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  This will create expense records totaling ₹{totalAmount.toLocaleString("en-IN")}. Vendor Ledger will auto-update.
                </p>
              </div>
              <Button size="lg" onClick={handleGenerate} disabled={generating} className="min-w-[200px]">
                {generating ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                ) : (
                  <><CheckCircle2 className="mr-2 h-4 w-4" /> Generate Payables</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
