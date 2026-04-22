/**
 * Asset Cycle Billing — Phase 2: Preview + Invoice Generation
 */

import { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CalendarDays, Info, Clock, FileText, Loader2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/utils/mediaAssets";
import { generateAssetCycles, type GroupedCycleBucket } from "@/utils/generateAssetCycles";
import { buildRegistrationSnapshot } from "@/utils/invoiceRegistrationSnapshot";
import { generateDraftInvoiceId } from "@/utils/finance";
import { toast } from "@/hooks/use-toast";
import { useCampaignChargeItems } from "./charges/useCampaignChargeItems";
import { CycleChargesPanel } from "./charges/CycleChargesPanel";
import {
  CommercialEntryDialog,
  type CommercialAssetRow,
  type CommercialEntryResult,
} from "./CommercialEntryDialog";

interface CycleInvoice {
  id: string;
  cycle_start_date: string | null;
  cycle_end_date: string | null;
  total_amount: number;
  status: string;
  is_draft?: boolean;
}

interface AssetCycleBillingPreviewProps {
  campaignAssets: any[];
  gstPercent: number;
  campaignEndDate?: string;
  campaignId: string;
  clientId: string;
  clientName: string;
  companyId?: string;
  campaignName: string;
  taxType?: string;
  gstMode?: 'CGST_SGST' | 'IGST';
  onInvoiceGenerated?: () => void;
}

export function AssetCycleBillingPreview({
  campaignAssets,
  gstPercent,
  campaignEndDate,
  campaignId,
  clientId,
  clientName,
  companyId,
  campaignName,
  taxType,
  gstMode = 'CGST_SGST',
  onInvoiceGenerated,
}: AssetCycleBillingPreviewProps) {
  const navigate = useNavigate();
  const [cycleInvoices, setCycleInvoices] = useState<CycleInvoice[]>([]);
  const [generatingBucket, setGeneratingBucket] = useState<string | null>(null);
  const [commercialOpen, setCommercialOpen] = useState(false);
  const [pendingBucket, setPendingBucket] = useState<GroupedCycleBucket | null>(null);

  const { groupedBuckets, totalAmount, totalCycles, allCycles } = useMemo(
    () => generateAssetCycles(campaignAssets, campaignEndDate),
    [campaignAssets, campaignEndDate]
  );

  // Charge items (initial printing/mounting + ad-hoc reprints/remounts)
  const {
    items: chargeItems,
    addCharge,
    reassignCycle,
    deleteCharge,
    refetch: refetchCharges,
  } = useCampaignChargeItems(campaignId, campaignAssets, companyId, totalCycles);

  // Pending (uninvoiced) charges grouped by cycle
  const pendingChargesByCycle = useMemo(() => {
    const map = new Map<number, typeof chargeItems>();
    for (const it of chargeItems) {
      if (it.is_invoiced) continue;
      const c = it.billing_cycle_no || 1;
      const arr = map.get(c) || [];
      arr.push(it);
      map.set(c, arr);
    }
    return map;
  }, [chargeItems]);

  const totalGst = totalAmount * (gstPercent / 100);
  const grandTotal = totalAmount + totalGst;
  const uniqueAssets = new Set(allCycles.map((c) => c.campaignAssetId)).size;

  // Fetch existing cycle invoices for this campaign
  const fetchCycleInvoices = useCallback(async () => {
    const { data } = await supabase
      .from("invoices")
      .select("id, cycle_start_date, cycle_end_date, total_amount, status, is_draft")
      .eq("campaign_id", campaignId)
      .eq("billing_mode", "asset_cycle")
      .neq("status", "Cancelled");
    setCycleInvoices((data as CycleInvoice[]) || []);
  }, [campaignId]);

  useEffect(() => {
    fetchCycleInvoices();
  }, [fetchCycleInvoices]);

  // Find matching invoice for a bucket
  const findInvoiceForBucket = (bucket: GroupedCycleBucket): CycleInvoice | undefined => {
    const bStart = format(bucket.periodStart, "yyyy-MM-dd");
    const bEnd = format(bucket.periodEnd, "yyyy-MM-dd");
    return cycleInvoices.find(
      (inv) => inv.cycle_start_date === bStart && inv.cycle_end_date === bEnd
    );
  };

  // Open Commercial Entry dialog for a bucket (auto-pull seeds the form)
  const handleOpenCommercialEntry = (bucket: GroupedCycleBucket) => {
    setPendingBucket(bucket);
    setCommercialOpen(true);
  };

  // Build seed rows for the Commercial Entry dialog from the bucket + pending charges
  const buildSeedRows = useCallback(
    (bucket: GroupedCycleBucket | null): CommercialAssetRow[] => {
      if (!bucket) return [];
      const cycleCharges = pendingChargesByCycle.get(bucket.cycleNumber) || [];
      return bucket.assets.map((asset) => {
        const ca = campaignAssets.find((c) => c.id === asset.campaignAssetId);
        const printSeed = cycleCharges
          .filter(
            (ch) =>
              ch.campaign_asset_id === asset.campaignAssetId &&
              (ch.charge_type === "printing" || ch.charge_type === "reprinting"),
          )
          .reduce((s, ch) => s + Number(ch.amount || 0), 0);
        const mountSeed = cycleCharges
          .filter(
            (ch) =>
              ch.campaign_asset_id === asset.campaignAssetId &&
              (ch.charge_type === "mounting" || ch.charge_type === "remounting"),
          )
          .reduce((s, ch) => s + Number(ch.amount || 0), 0);
        return {
          key: asset.campaignAssetId,
          asset_code: ca?.asset_id || asset.assetId,
          city: ca?.city || asset.city,
          area: asset.area,
          location: asset.location,
          media_type: ca?.media_type || asset.mediaType,
          dimensions: ca?.dimensions || null,
          illumination_type: ca?.illumination_type || null,
          display_amount: Number(asset.cycleAmount || 0),
          printing_charges: printSeed,
          mounting_charges: mountSeed,
        };
      });
    },
    [campaignAssets, pendingChargesByCycle],
  );

  const seedRows = useMemo(() => buildSeedRows(pendingBucket), [buildSeedRows, pendingBucket]);

  // Generate invoice for a single cycle bucket using overrides from the dialog
  const handleGenerateCycleInvoice = async (
    bucket: GroupedCycleBucket,
    override: CommercialEntryResult,
  ) => {
    const bucketKey = `${bucket.cycleNumber}-${format(bucket.periodStart, "yyyyMMdd")}`;
    setGeneratingBucket(bucketKey);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      // Override window > bucket window (user can adjust dates per cycle)
      const bStart = override.billing_start_date || format(bucket.periodStart, "yyyy-MM-dd");
      const bEnd = override.billing_end_date || format(bucket.periodEnd, "yyyy-MM-dd");

      // Duplicate prevention using unified billing_window_key
      const windowKey = `cycle-${bucket.cycleNumber}`;
      const { data: existing } = await supabase
        .from("invoices")
        .select("id")
        .eq("campaign_id", campaignId)
        .eq("billing_mode", "asset_cycle")
        .eq("billing_window_key", windowKey)
        .neq("status", "Cancelled")
        .limit(1);

      if (existing && existing.length > 0) {
        toast({
          title: "Already Invoiced",
          description: `An invoice already exists for cycle ${bStart} → ${bEnd}`,
          variant: "destructive",
        });
        return;
      }

      // Registration snapshot
      const regSnapshot = await buildRegistrationSnapshot(campaignId);

      // Fetch media_asset_codes
      const assetIds = bucket.assets.map((a) => a.campaignAssetId).filter(Boolean);
      const campaignAssetIds = assetIds;
      // Get asset_id from campaignAssets for media_asset_code lookup
      const relevantCampaignAssets = campaignAssets.filter((ca) =>
        bucket.assets.some((ba) => ba.campaignAssetId === ca.id)
      );
      const rawAssetIds = relevantCampaignAssets.map((ca) => ca.asset_id).filter(Boolean);

      const { data: maData } = rawAssetIds.length > 0
        ? await supabase.from("media_assets").select("id, media_asset_code").in("id", rawAssetIds)
        : { data: [] };
      const maCodeMap = new Map((maData || []).map((m: any) => [m.id, m.media_asset_code || null]));

      // Build line items — apply per-asset display override if present
      const items: any[] = bucket.assets.map((asset, idx) => {
        const ca = campaignAssets.find((c) => c.id === asset.campaignAssetId);
        const resolvedCode = ca ? maCodeMap.get(ca.asset_id) || null : null;
        const ovr = override.rows?.[asset.campaignAssetId];
        const displayAmt = ovr ? Number(ovr.display_amount || 0) : Number(asset.cycleAmount || 0);
        return {
          sno: idx + 1,
          asset_id: ca?.asset_id || null,
          asset_code: resolvedCode,
          media_asset_code: resolvedCode,
          campaign_asset_id: asset.campaignAssetId,
          description: `${ca?.media_type || "Display"} - ${asset.location || ""}, ${asset.area || ""}, ${ca?.city || ""} [Cycle ${bStart} to ${bEnd}]`,
          location: asset.location || null,
          area: asset.area || null,
          direction: ca?.direction || null,
          media_type: ca?.media_type || null,
          illumination_type: ca?.illumination_type || null,
          dimensions: ca?.dimensions || null,
          total_sqft: ca?.total_sqft || 0,
          booking_start_date: bStart,
          booking_end_date: bEnd,
          booked_days: bucket.cycleDays,
          quantity: 1,
          rate: displayAmt,
          rent_amount: displayAmt,
          display_rate: asset.finalMonthlyRate,
          printing_charges: 0,
          mounting_charges: 0,
          amount: displayAmt,
          total: displayAmt,
          hsn_sac: "998361",
          is_overridden: !!ovr,
        };
      });

      // Pending one-time / ad-hoc charges assigned to this cycle
      const cycleCharges = pendingChargesByCycle.get(bucket.cycleNumber) || [];

      // Apply per-asset printing/mounting OVERRIDES directly to each row.
      // These replace the pending-charge auto-merge values from the seed —
      // user already saw the seed in the dialog and confirmed the final values.
      let sno = items.length;
      for (const it of items) {
        const ovr = override.rows?.[it.campaign_asset_id];
        if (!ovr) continue;
        const printAmt = Number(ovr.printing_charges || 0);
        const mountAmt = Number(ovr.mounting_charges || 0);
        if (printAmt > 0) it.printing_charges = printAmt;
        if (mountAmt > 0) it.mounting_charges = mountAmt;
        it.amount = Number(it.rent_amount || 0) + printAmt + mountAmt;
        it.total = it.amount;
        // Track which pending charges this row absorbs (for invoiced linkage)
        const absorbed = cycleCharges
          .filter(
            (ch) =>
              ch.campaign_asset_id === it.campaign_asset_id &&
              ((ch.charge_type === "printing" || ch.charge_type === "reprinting") ||
                (ch.charge_type === "mounting" || ch.charge_type === "remounting")),
          )
          .map((ch) => ch.id);
        if (absorbed.length) it.merged_charge_ids = absorbed;
      }

      // Append invoice-level misc charge (not tied to any asset)
      if (Number(override.misc_amount || 0) > 0) {
        sno += 1;
        const miscAmt = Number(override.misc_amount || 0);
        items.push({
          sno,
          campaign_asset_id: null,
          description: override.misc_description?.trim() || "Misc charge",
          quantity: 1,
          rate: miscAmt,
          amount: miscAmt,
          total: miscAmt,
          charge_type: "misc",
          hsn_sac: "998361",
        });
      }

      const taxableSubtotal = items.reduce((s, it) => s + Number(it.amount || 0), 0);
      const gstAmount = taxableSubtotal * (gstPercent / 100);
      const total = taxableSubtotal + gstAmount;

      const invoiceId = generateDraftInvoiceId();

      // Default invoice date = cycle period start date
      const invoiceDate = new Date(bStart);
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + 30);

      // GST mode — use the resolved gstMode from parent
      const isIGST = gstMode === 'IGST';
      const gstHalf = gstPercent / 2;

      const baseNote = `Asset Cycle Billing for ${campaignName} — Cycle #${bucket.cycleNumber} (${bStart} to ${bEnd})`;
      const finalNotes = override.notes?.trim()
        ? `${baseNote}\n${override.notes.trim()}`
        : baseNote;

      const { error } = await supabase.from("invoices").insert({
        id: invoiceId,
        invoice_no: invoiceId,
        campaign_id: campaignId,
        client_id: clientId,
        client_name: clientName,
        company_id: companyId,
        invoice_date: format(invoiceDate, "yyyy-MM-dd"),
        due_date: format(dueDate, "yyyy-MM-dd"),
        invoice_period_start: bStart,
        invoice_period_end: bEnd,
        billing_mode: "asset_cycle",
        billing_window_key: windowKey,
        cycle_start_date: bStart,
        cycle_end_date: bEnd,
        is_monthly_split: false,
        sub_total: taxableSubtotal,
        gst_percent: gstPercent,
        gst_amount: gstAmount,
        total_amount: total,
        balance_due: total,
        tax_type: isIGST ? 'igst' : 'cgst_sgst',
        gst_mode: gstMode,
        cgst_percent: isIGST ? 0 : gstHalf,
        sgst_percent: isIGST ? 0 : gstHalf,
        igst_percent: isIGST ? gstPercent : 0,
        cgst_amount: isIGST ? 0 : gstAmount / 2,
        sgst_amount: isIGST ? 0 : gstAmount / 2,
        igst_amount: isIGST ? gstAmount : 0,
        status: "Draft",
        is_draft: true,
        items,
        notes: finalNotes,
        created_by: userData.user.id,
        ...regSnapshot,
      });

      if (error) throw error;

      // Mark included charge items as invoiced and link them to this invoice
      if (cycleCharges.length > 0) {
        await supabase
          .from("campaign_charge_items")
          .update({ is_invoiced: true, invoice_id: invoiceId })
          .in(
            "id",
            cycleCharges.map((c) => c.id),
          );
        await refetchCharges();
      }

      toast({
        title: "Invoice Generated",
        description: `Invoice ${invoiceId} created for Cycle #${bucket.cycleNumber}`,
      });

      await fetchCycleInvoices();
      onInvoiceGenerated?.();
      setCommercialOpen(false);
      setPendingBucket(null);
    } catch (err: any) {
      console.error("Generate cycle invoice error:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to generate cycle invoice",
        variant: "destructive",
      });
    } finally {
      setGeneratingBucket(null);
    }
  };

  if (groupedBuckets.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Billing Cycles</h3>
          <p className="text-sm text-muted-foreground">
            No active assets with valid dates found for cycle billing.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Asset Cycle Billing Schedule
          </h3>
          <p className="text-sm text-muted-foreground">
            30-day cycles per asset • {uniqueAssets} asset{uniqueAssets !== 1 ? "s" : ""} • {totalCycles} billing window{totalCycles !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Total Cycles" value={String(totalCycles)} />
        <SummaryCard label="Final Amount (Before GST)" value={formatCurrency(totalAmount)} />
        <SummaryCard label={`GST (${gstPercent}%)`} value={formatCurrency(totalGst)} />
        <SummaryCard label="Grand Total" value={formatCurrency(grandTotal)} highlight />
      </div>

      {/* Charges panel — initial printing/mounting auto-seeded to Cycle 1, plus ad-hoc */}
      <CycleChargesPanel
        items={chargeItems}
        totalCycles={totalCycles}
        onAdd={addCharge}
        onReassign={reassignCycle}
        onDelete={deleteCharge}
        campaignAssets={campaignAssets}
      />

      {/* Cycle Schedule Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Cycle</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="text-center">Days</TableHead>
                <TableHead className="text-center">Assets</TableHead>
                <TableHead className="text-right">Final Amount (Before GST)</TableHead>
                <TableHead className="text-right">GST</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[140px] text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedBuckets.map((bucket) => {
                const bucketGst = bucket.totalAmount * (gstPercent / 100);
                const bucketTotal = bucket.totalAmount + bucketGst;
                const bucketKey = `${bucket.cycleNumber}-${format(bucket.periodStart, "yyyyMMdd")}`;
                const matchedInvoice = findInvoiceForBucket(bucket);
                const isInvoiced = !!matchedInvoice && !matchedInvoice.is_draft;
                const isDraft = !!matchedInvoice && matchedInvoice.is_draft;
                const isGenerating = generatingBucket === bucketKey;

                return (
                  <TableRow key={bucketKey}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1">
                        #{bucket.cycleNumber}
                        {bucket.isPartial && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Clock className="h-3.5 w-3.5 text-amber-500" />
                              </TooltipTrigger>
                              <TooltipContent>
                                Partial cycle ({bucket.cycleDays} days)
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {format(bucket.periodStart, "dd MMM yyyy")} →{" "}
                        {format(bucket.periodEnd, "dd MMM yyyy")}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={bucket.isPartial ? "outline" : "secondary"}>
                        {bucket.cycleDays}d
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="secondary">{bucket.assets.length}</Badge>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <div className="text-xs space-y-1">
                              {bucket.assets.map((a, i) => (
                                <div key={i}>
                                  {a.location}, {a.area} — {formatCurrency(a.cycleAmount)}
                                </div>
                              ))}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(bucket.totalAmount)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(bucketGst)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(bucketTotal)}
                    </TableCell>
                    <TableCell>
                      {isInvoiced ? (
                        <Badge variant="default" className="text-xs">
                          Invoiced
                        </Badge>
                      ) : isDraft ? (
                        <Badge variant="secondary" className="text-xs">
                          Draft
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Not Invoiced
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {(isInvoiced || isDraft) && matchedInvoice ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => navigate(`/admin/invoices/view/${encodeURIComponent(matchedInvoice.id)}`)}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="default"
                          className="text-xs"
                          disabled={isGenerating}
                          onClick={() => handleGenerateCycleInvoice(bucket)}
                        >
                          {isGenerating ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <FileText className="h-3 w-3 mr-1" />
                          )}
                          Generate
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Info note */}
      <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          Cycle invoices include 30-day display billing plus any pending one-time or ad-hoc
          charges assigned to that billing window.
        </span>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`p-3 rounded-lg border ${highlight ? "bg-primary/5 border-primary/20" : "bg-muted/50"}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`font-semibold ${highlight ? "text-primary text-lg" : ""}`}>{value}</div>
    </div>
  );
}
