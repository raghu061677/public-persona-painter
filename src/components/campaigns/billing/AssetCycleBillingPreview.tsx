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
import { getFYRange, generateDraftInvoiceId } from "@/utils/finance";
import { toast } from "@/hooks/use-toast";

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

  const { groupedBuckets, totalAmount, totalCycles, allCycles } = useMemo(
    () => generateAssetCycles(campaignAssets, campaignEndDate),
    [campaignAssets, campaignEndDate]
  );

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

  // Generate invoice for a single cycle bucket
  const handleGenerateCycleInvoice = async (bucket: GroupedCycleBucket) => {
    const bucketKey = `${bucket.cycleNumber}-${format(bucket.periodStart, "yyyyMMdd")}`;
    setGeneratingBucket(bucketKey);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const bStart = format(bucket.periodStart, "yyyy-MM-dd");
      const bEnd = format(bucket.periodEnd, "yyyy-MM-dd");

      // Duplicate prevention
      const { data: existing } = await supabase
        .from("invoices")
        .select("id")
        .eq("campaign_id", campaignId)
        .eq("billing_mode", "asset_cycle")
        .eq("cycle_start_date", bStart)
        .eq("cycle_end_date", bEnd)
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

      // Build line items
      const items: any[] = bucket.assets.map((asset, idx) => {
        const ca = campaignAssets.find((c) => c.id === asset.campaignAssetId);
        const resolvedCode = ca ? maCodeMap.get(ca.asset_id) || null : null;
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
          rate: asset.cycleAmount,
          rent_amount: asset.cycleAmount,
          display_rate: asset.finalMonthlyRate,
          printing_charges: 0,
          mounting_charges: 0,
          amount: asset.cycleAmount,
          total: asset.cycleAmount,
          hsn_sac: "998361",
        };
      });

      const subtotal = bucket.totalAmount;
      const gstAmount = subtotal * (gstPercent / 100);
      const total = subtotal + gstAmount;

      const invoiceId = generateDraftInvoiceId();

      // Smart date logic — dynamic FY boundary
      const currentFY = getFYRange(new Date());
      const cycleEnd = new Date(bEnd);
      const invoiceDate = cycleEnd < currentFY.start ? new Date(currentFY.start.getFullYear(), currentFY.start.getMonth() - 1, new Date(currentFY.start.getFullYear(), currentFY.start.getMonth(), 0).getDate()) : new Date();
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + 30);

      // GST mode — use the resolved gstMode from parent
      const isIGST = gstMode === 'IGST';
      const gstHalf = gstPercent / 2;

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
        cycle_start_date: bStart,
        cycle_end_date: bEnd,
        is_monthly_split: false,
        sub_total: subtotal,
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
        notes: `Asset Cycle Billing for ${campaignName} — Cycle #${bucket.cycleNumber} (${bStart} to ${bEnd})`,
        created_by: userData.user.id,
        ...regSnapshot,
      });

      if (error) throw error;

      toast({
        title: "Invoice Generated",
        description: `Invoice ${invoiceId} created for Cycle #${bucket.cycleNumber}`,
      });

      await fetchCycleInvoices();
      onInvoiceGenerated?.();
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
          Asset cycle billing generates invoices per 30-day window using each asset's final
          negotiated price. One-time charges (printing/mounting) are not included in cycle invoices.
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
