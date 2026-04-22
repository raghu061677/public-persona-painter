/**
 * Commercial Entry Dialog — Manual override layer that sits on top of the
 * existing billing flow (Calendar Monthly, Single Invoice, Asset Cycle).
 *
 * It does NOT change the billing-mode logic. It opens BEFORE invoice
 * generation, pre-fills with auto-pulled data, and lets admin/finance users
 * tweak commercial values (display amount, printing, mounting, dates, misc,
 * notes) for THIS invoice only. Overrides are stored inline on the generated
 * invoice (items[] + notes). Master data is untouched.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Calculator, Lock } from "lucide-react";
import { formatCurrency } from "@/utils/mediaAssets";
import { useRBAC } from "@/hooks/useRBAC";

export interface CommercialAssetRow {
  /** unique key for the row (campaign_asset_id) */
  key: string;
  /** read-only summary for the user */
  asset_code?: string | null;
  city?: string | null;
  area?: string | null;
  location?: string | null;
  media_type?: string | null;
  dimensions?: string | null;
  illumination_type?: string | null;
  /** auto-pulled defaults — used to seed the editable fields */
  display_amount: number;
  printing_charges: number;
  mounting_charges: number;
}

export interface CommercialEntryResult {
  rows: Record<
    string,
    {
      display_amount: number;
      printing_charges: number;
      mounting_charges: number;
    }
  >;
  billing_start_date: string;
  billing_end_date: string;
  misc_amount: number;
  misc_description: string;
  notes: string;
  gst_rate: number;
  subtotal: number;
  gst_amount: number;
  grand_total: number;
}

interface CommercialEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Title shown at top of dialog (e.g. "Generate Single Invoice") */
  title: string;
  /** Sub-title context (e.g. "CAM-202604-0024 • Apr 2026 • Calendar Monthly") */
  contextLabel: string;
  /** Default billing window — pre-filled and editable */
  defaultStartDate: string;
  defaultEndDate: string;
  /** Pre-filled asset rows (auto-pulled from campaign assets) */
  rows: CommercialAssetRow[];
  /** GST rate to use for live preview (e.g. 18) */
  gstRate: number;
  /** Existing manual discount (subtracted before GST) */
  discountAmount?: number;
  /** Called when user confirms — receives overrides for the caller to apply */
  onConfirm: (result: CommercialEntryResult) => void | Promise<void>;
  /** Show spinner on confirm button while caller persists */
  submitting?: boolean;
}

export function CommercialEntryDialog({
  open,
  onOpenChange,
  title,
  contextLabel,
  defaultStartDate,
  defaultEndDate,
  rows,
  gstRate,
  discountAmount = 0,
  onConfirm,
  submitting = false,
}: CommercialEntryDialogProps) {
  const { isPlatformAdmin, hasCompanyRole } = useRBAC();
  const canEdit = isPlatformAdmin || hasCompanyRole(["admin", "finance"]);

  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [miscAmount, setMiscAmount] = useState(0);
  const [miscDescription, setMiscDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [rowState, setRowState] = useState<
    Record<string, { display_amount: number; printing_charges: number; mounting_charges: number }>
  >({});

  // Re-seed when dialog (re)opens or row set changes
  useEffect(() => {
    if (!open) return;
    setStartDate(defaultStartDate);
    setEndDate(defaultEndDate);
    setMiscAmount(0);
    setMiscDescription("");
    setNotes("");
    const seed: Record<string, { display_amount: number; printing_charges: number; mounting_charges: number }> = {};
    for (const r of rows) {
      seed[r.key] = {
        display_amount: Number(r.display_amount || 0),
        printing_charges: Number(r.printing_charges || 0),
        mounting_charges: Number(r.mounting_charges || 0),
      };
    }
    setRowState(seed);
  }, [open, defaultStartDate, defaultEndDate, rows]);

  const setRowField = (
    key: string,
    field: "display_amount" | "printing_charges" | "mounting_charges",
    value: number,
  ) => {
    setRowState((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: Number.isFinite(value) ? value : 0 },
    }));
  };

  const totals = useMemo(() => {
    let display = 0;
    let print = 0;
    let mount = 0;
    for (const r of rows) {
      const s = rowState[r.key] || { display_amount: 0, printing_charges: 0, mounting_charges: 0 };
      display += Number(s.display_amount || 0);
      print += Number(s.printing_charges || 0);
      mount += Number(s.mounting_charges || 0);
    }
    const itemsTotal = display + print + mount + Number(miscAmount || 0);
    const subtotal = Math.max(0, itemsTotal - Number(discountAmount || 0));
    const gst = gstRate > 0 ? Math.round(subtotal * gstRate) / 100 : 0;
    const grand = Math.round((subtotal + gst) * 100) / 100;
    return { display, print, mount, itemsTotal, subtotal, gst, grand };
  }, [rows, rowState, miscAmount, discountAmount, gstRate]);

  const handleConfirm = async () => {
    await onConfirm({
      rows: rowState,
      billing_start_date: startDate,
      billing_end_date: endDate,
      misc_amount: Number(miscAmount || 0),
      misc_description: miscDescription.trim(),
      notes: notes.trim(),
      gst_rate: gstRate,
      subtotal: totals.subtotal,
      gst_amount: totals.gst,
      grand_total: totals.grand,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 flex-wrap">
            <span>{contextLabel}</span>
            {!canEdit && (
              <Badge variant="outline" className="text-xs">
                <Lock className="h-3 w-3 mr-1" /> Read-only — admin/finance can edit
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-5">
            {/* Billing window */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ce-start">Billing Start Date</Label>
                <Input
                  id="ce-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={!canEdit || submitting}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ce-end">Billing End Date</Label>
                <Input
                  id="ce-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={!canEdit || submitting}
                />
              </div>
            </div>

            <Separator />

            {/* Per-asset editable rows */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold">Per-Asset Commercial Values</h4>
                <span className="text-xs text-muted-foreground">
                  {rows.length} asset{rows.length !== 1 ? "s" : ""} • auto-pulled from campaign
                </span>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="px-3 py-2 font-medium">Asset</th>
                      <th className="px-3 py-2 font-medium text-right w-[140px]">Display ₹</th>
                      <th className="px-3 py-2 font-medium text-right w-[120px]">Printing ₹</th>
                      <th className="px-3 py-2 font-medium text-right w-[120px]">Mounting ₹</th>
                      <th className="px-3 py-2 font-medium text-right w-[130px]">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const s = rowState[r.key] || {
                        display_amount: 0,
                        printing_charges: 0,
                        mounting_charges: 0,
                      };
                      const lineTotal =
                        Number(s.display_amount || 0) +
                        Number(s.printing_charges || 0) +
                        Number(s.mounting_charges || 0);
                      return (
                        <tr key={r.key} className="border-t">
                          <td className="px-3 py-2 align-top">
                            <div className="font-medium">{r.asset_code || "—"}</div>
                            <div className="text-xs text-muted-foreground">
                              {[r.media_type, r.dimensions, r.illumination_type]
                                .filter(Boolean)
                                .join(" • ")}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {[r.location, r.area, r.city].filter(Boolean).join(", ")}
                            </div>
                          </td>
                          <td className="px-2 py-2 align-top">
                            <Input
                              type="number"
                              step="0.01"
                              className="text-right h-9"
                              value={s.display_amount}
                              onChange={(e) =>
                                setRowField(r.key, "display_amount", parseFloat(e.target.value || "0"))
                              }
                              disabled={!canEdit || submitting}
                            />
                          </td>
                          <td className="px-2 py-2 align-top">
                            <Input
                              type="number"
                              step="0.01"
                              className="text-right h-9"
                              value={s.printing_charges}
                              onChange={(e) =>
                                setRowField(r.key, "printing_charges", parseFloat(e.target.value || "0"))
                              }
                              disabled={!canEdit || submitting}
                            />
                          </td>
                          <td className="px-2 py-2 align-top">
                            <Input
                              type="number"
                              step="0.01"
                              className="text-right h-9"
                              value={s.mounting_charges}
                              onChange={(e) =>
                                setRowField(r.key, "mounting_charges", parseFloat(e.target.value || "0"))
                              }
                              disabled={!canEdit || submitting}
                            />
                          </td>
                          <td className="px-3 py-2 text-right align-top font-medium">
                            {formatCurrency(lineTotal)}
                          </td>
                        </tr>
                      );
                    })}
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                          No assets to bill in this window.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <Separator />

            {/* Invoice-level extras */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="ce-misc-desc">Misc Charge Description</Label>
                <Input
                  id="ce-misc-desc"
                  placeholder="e.g. Transport, ad-hoc charge"
                  value={miscDescription}
                  onChange={(e) => setMiscDescription(e.target.value)}
                  disabled={!canEdit || submitting}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ce-misc-amt">Misc Amount ₹</Label>
                <Input
                  id="ce-misc-amt"
                  type="number"
                  step="0.01"
                  className="text-right"
                  value={miscAmount}
                  onChange={(e) => setMiscAmount(parseFloat(e.target.value || "0"))}
                  disabled={!canEdit || submitting}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ce-notes">Invoice Notes / Remarks</Label>
              <Textarea
                id="ce-notes"
                rows={2}
                placeholder="Optional notes printed on the invoice"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={!canEdit || submitting}
              />
            </div>
          </div>
        </ScrollArea>

        {/* Live totals */}
        <div className="border-t pt-3 mt-2">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
            <SummaryStat label="Display" value={formatCurrency(totals.display)} />
            <SummaryStat label="Printing" value={formatCurrency(totals.print)} />
            <SummaryStat label="Mounting" value={formatCurrency(totals.mount)} />
            <SummaryStat
              label={`GST (${gstRate}%)`}
              value={formatCurrency(totals.gst)}
            />
            <SummaryStat label="Grand Total" value={formatCurrency(totals.grand)} highlight />
          </div>
          {discountAmount > 0 && (
            <div className="text-xs text-muted-foreground mt-2">
              Discount before GST: −{formatCurrency(discountAmount)}
            </div>
          )}
        </div>

        <DialogFooter className="mt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={submitting || rows.length === 0}>
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Confirm & Generate Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-2 rounded-md border ${
        highlight ? "bg-primary/5 border-primary/30" : "bg-muted/40"
      }`}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`font-semibold ${highlight ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}