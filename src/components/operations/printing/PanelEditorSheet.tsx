/**
 * PanelEditorSheet — side drawer to manage printing panels for one campaign asset.
 *
 * Real-time recalculation. Saves to campaign_asset_printing_panels.
 * Trigger on the table syncs aggregates back to campaign_assets.
 */
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  computePanel,
  getDefaultRates,
  sumPanels,
  type IlluminationType,
  type PrintingPanel,
} from "@/lib/printing/printingDefaults";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignAssetId: string | null;
  campaignId: string | null;
  companyId?: string | null;
  assetLabel?: string;
  canEdit: boolean;
  onSaved?: () => void;
}

export default function PanelEditorSheet({
  open,
  onOpenChange,
  campaignAssetId,
  campaignId,
  companyId,
  assetLabel,
  canEdit,
  onSaved,
}: Props) {
  const { toast } = useToast();
  const [panels, setPanels] = useState<PrintingPanel[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open || !campaignAssetId) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, campaignAssetId]);

  const load = async () => {
    if (!campaignAssetId) return;
    setLoading(true);
    setDeletedIds([]);
    try {
      const { data, error } = await supabase
        .from("campaign_asset_printing_panels")
        .select("*")
        .eq("campaign_asset_id", campaignAssetId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      setPanels((data || []).map((p) => computePanel(p as any)));
    } catch (e: any) {
      toast({ title: "Failed to load panels", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const updatePanel = (idx: number, patch: Partial<PrintingPanel>) => {
    setPanels((prev) => {
      const next = [...prev];
      const merged = { ...next[idx], ...patch };
      // If illumination changed, refresh rates from defaults
      if (patch.illumination_type && patch.illumination_type !== next[idx].illumination_type) {
        const defaults = getDefaultRates(patch.illumination_type as IlluminationType);
        merged.client_rate_per_sqft = defaults.client;
        merged.vendor_rate_per_sqft = defaults.vendor;
      }
      next[idx] = computePanel(merged);
      return next;
    });
  };

  const addPanel = () => {
    setPanels((prev) => [
      ...prev,
      computePanel({
        panel_name: `Panel ${prev.length + 1}`,
        width_ft: 0,
        height_ft: 0,
        illumination_type: "Non Lit",
        sort_order: prev.length,
      }),
    ]);
  };

  const removePanel = (idx: number) => {
    setPanels((prev) => {
      const target = prev[idx];
      if (target?.id) setDeletedIds((d) => [...d, target.id!]);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleSave = async () => {
    if (!campaignAssetId) return;
    setSaving(true);
    try {
      // Delete removed
      if (deletedIds.length) {
        const { error } = await supabase
          .from("campaign_asset_printing_panels")
          .delete()
          .in("id", deletedIds);
        if (error) throw error;
      }
      // Upsert remaining
      const payload = panels.map((p, idx) => ({
        id: p.id,
        campaign_asset_id: campaignAssetId,
        campaign_id: campaignId,
        company_id: companyId ?? null,
        panel_name: p.panel_name,
        width_ft: p.width_ft,
        height_ft: p.height_ft,
        sqft: p.sqft,
        illumination_type: p.illumination_type,
        client_rate_per_sqft: p.client_rate_per_sqft,
        vendor_rate_per_sqft: p.vendor_rate_per_sqft,
        client_amount: p.client_amount,
        vendor_amount: p.vendor_amount,
        margin_amount: p.margin_amount,
        printer_vendor_name: p.printer_vendor_name ?? null,
        printing_status: p.printing_status ?? "Pending",
        notes: p.notes ?? null,
        sort_order: idx,
      }));
      if (payload.length) {
        const { error } = await supabase
          .from("campaign_asset_printing_panels")
          .upsert(payload as any, { onConflict: "id" });
        if (error) throw error;
      }
      toast({ title: "Panels saved", description: "Printing totals updated." });
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const totals = sumPanels(panels);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Configure Printing Panels</SheetTitle>
          <SheetDescription>
            {assetLabel ?? "Asset"} · panel-wise client / vendor / margin breakup
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading panels…
            </div>
          ) : (
            <>
              {panels.length === 0 && (
                <Card>
                  <CardContent className="py-6 text-sm text-muted-foreground">
                    No panels yet. Add one to start panel-based costing. Until then, the
                    legacy <code className="text-xs">printing_charges</code> value is used as the
                    client amount.
                  </CardContent>
                </Card>
              )}

              {panels.map((p, idx) => (
                <Card key={p.id ?? `new-${idx}`}>
                  <CardContent className="space-y-3 pt-4">
                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-12 sm:col-span-4">
                        <Label className="text-xs">Panel name</Label>
                        <Input
                          value={p.panel_name}
                          disabled={!canEdit}
                          onChange={(e) => updatePanel(idx, { panel_name: e.target.value })}
                        />
                      </div>
                      <div className="col-span-6 sm:col-span-2">
                        <Label className="text-xs">Width (ft)</Label>
                        <Input
                          type="number"
                          value={p.width_ft || ""}
                          disabled={!canEdit}
                          onChange={(e) => updatePanel(idx, { width_ft: Number(e.target.value) })}
                        />
                      </div>
                      <div className="col-span-6 sm:col-span-2">
                        <Label className="text-xs">Height (ft)</Label>
                        <Input
                          type="number"
                          value={p.height_ft || ""}
                          disabled={!canEdit}
                          onChange={(e) => updatePanel(idx, { height_ft: Number(e.target.value) })}
                        />
                      </div>
                      <div className="col-span-6 sm:col-span-2">
                        <Label className="text-xs">Sqft</Label>
                        <Input value={p.sqft} disabled readOnly />
                      </div>
                      <div className="col-span-6 sm:col-span-2">
                        <Label className="text-xs">Illumination</Label>
                        <Select
                          value={p.illumination_type}
                          disabled={!canEdit}
                          onValueChange={(v) =>
                            updatePanel(idx, { illumination_type: v as IlluminationType })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Non Lit">Non Lit</SelectItem>
                            <SelectItem value="Back Lit">Back Lit</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-6 sm:col-span-2">
                        <Label className="text-xs">Client ₹/sqft</Label>
                        <Input
                          type="number"
                          value={p.client_rate_per_sqft}
                          disabled={!canEdit}
                          onChange={(e) =>
                            updatePanel(idx, { client_rate_per_sqft: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div className="col-span-6 sm:col-span-2">
                        <Label className="text-xs">Vendor ₹/sqft</Label>
                        <Input
                          type="number"
                          value={p.vendor_rate_per_sqft}
                          disabled={!canEdit}
                          onChange={(e) =>
                            updatePanel(idx, { vendor_rate_per_sqft: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <Label className="text-xs">Client ₹</Label>
                        <Input value={p.client_amount} disabled readOnly />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <Label className="text-xs">Vendor ₹</Label>
                        <Input value={p.vendor_amount} disabled readOnly />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <Label className="text-xs">Margin ₹</Label>
                        <Input value={p.margin_amount} disabled readOnly />
                      </div>
                      <div className="col-span-12 sm:col-span-2 flex items-end">
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => removePanel(idx)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" /> Remove
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-12 sm:col-span-6">
                        <Label className="text-xs">Printer vendor (optional)</Label>
                        <Input
                          value={p.printer_vendor_name ?? ""}
                          disabled={!canEdit}
                          onChange={(e) =>
                            updatePanel(idx, { printer_vendor_name: e.target.value })
                          }
                          placeholder="e.g. Sai Printers"
                        />
                      </div>
                      <div className="col-span-12 sm:col-span-6">
                        <Label className="text-xs">Notes</Label>
                        <Input
                          value={p.notes ?? ""}
                          disabled={!canEdit}
                          onChange={(e) => updatePanel(idx, { notes: e.target.value })}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {canEdit && (
                <Button variant="outline" onClick={addPanel} className="w-full">
                  <Plus className="h-4 w-4 mr-1" /> Add panel
                </Button>
              )}

              <Card className="bg-muted/30">
                <CardContent className="py-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Total sqft</div>
                    <div className="font-semibold">{totals.sqft}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Client ₹</div>
                    <div className="font-semibold">₹{totals.client.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Vendor ₹</div>
                    <div className="font-semibold">₹{totals.vendor.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Margin ₹</div>
                    <div className="font-semibold text-green-700">
                      ₹{totals.margin.toLocaleString()}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {canEdit && (
                <div className="flex justify-end gap-2 sticky bottom-0 bg-background pt-4 border-t">
                  <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-1" />
                    )}
                    Save panels
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
