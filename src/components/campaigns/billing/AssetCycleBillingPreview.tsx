/**
 * Asset Cycle Billing Preview (Phase 1 — read-only, no invoice generation)
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { CalendarDays, Info, Clock } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/utils/mediaAssets";
import { generateAssetCycles, type GroupedCycleBucket } from "@/utils/generateAssetCycles";

interface AssetCycleBillingPreviewProps {
  campaignAssets: any[];
  gstPercent: number;
  campaignEndDate?: string;
}

export function AssetCycleBillingPreview({
  campaignAssets,
  gstPercent,
  campaignEndDate,
}: AssetCycleBillingPreviewProps) {
  const { groupedBuckets, totalAmount, totalCycles, allCycles } = useMemo(
    () => generateAssetCycles(campaignAssets, campaignEndDate),
    [campaignAssets, campaignEndDate]
  );

  const totalGst = totalAmount * (gstPercent / 100);
  const grandTotal = totalAmount + totalGst;
  const uniqueAssets = new Set(allCycles.map((c) => c.campaignAssetId)).size;

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
            <Badge variant="secondary" className="ml-2">Preview</Badge>
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
                <TableHead className="w-[120px] text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedBuckets.map((bucket) => {
                const bucketGst = bucket.totalAmount * (gstPercent / 100);
                const bucketTotal = bucket.totalAmount + bucketGst;

                return (
                  <TableRow key={`${bucket.cycleNumber}-${format(bucket.periodStart, "yyyyMMdd")}`}>
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
                      <Badge variant="outline" className="text-xs">
                        Not Invoiced
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="outline" disabled className="text-xs">
                              Coming Soon
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Invoice generation will be enabled in Phase 2
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
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
          This is a <strong>preview</strong> of asset-level cycle billing. Cycles are calculated
          using each asset's final negotiated price divided into 30-day windows. Invoice generation
          from cycle billing will be available in a future update.
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
