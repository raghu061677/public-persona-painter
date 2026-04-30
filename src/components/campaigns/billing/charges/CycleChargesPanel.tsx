import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Receipt, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/utils/mediaAssets";
import { toast } from "@/hooks/use-toast";
import type { CampaignChargeItem } from "./useCampaignChargeItems";

interface Props {
  items: CampaignChargeItem[];
  totalCycles: number;
  onAdd: (input: {
    charge_type: CampaignChargeItem["charge_type"];
    amount: number;
    description?: string;
    billing_cycle_no?: number | null;
    campaign_asset_id?: string | null;
  }) => Promise<void>;
  onReassign: (id: string, cycle: number) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  campaignAssets: any[];
}

const TYPE_LABEL: Record<string, string> = {
  printing: "Printing",
  mounting: "Mounting",
  reprinting: "Re-printing",
  remounting: "Re-mounting",
  misc: "Misc",
  display: "Display",
};

const GROUP_ORDER = ["printing", "mounting", "reprinting", "remounting", "misc", "display"];

export function CycleChargesPanel({
  items,
  totalCycles,
  onAdd,
  onReassign,
  onDelete,
  campaignAssets,
}: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    charge_type: "reprinting" as CampaignChargeItem["charge_type"],
    amount: "",
    description: "",
    cycle: "auto",
    campaign_asset_id: "none",
  });

  const cycleOptions = useMemo(
    () => Array.from({ length: Math.max(1, totalCycles) }, (_, i) => i + 1),
    [totalCycles],
  );

  const totalsByCycle = useMemo(() => {
    const map = new Map<number, { count: number; amount: number; pending: number }>();
    for (const it of items) {
      const c = it.billing_cycle_no || 1;
      const cur = map.get(c) || { count: 0, amount: 0, pending: 0 };
      cur.count += 1;
      cur.amount += Number(it.amount || 0);
      if (!it.is_invoiced) cur.pending += Number(it.amount || 0);
      map.set(c, cur);
    }
    return map;
  }, [items]);

  // Group items by charge_type for collapsible display
  const groupedItems = useMemo(() => {
    const groups = new Map<string, { items: CampaignChargeItem[]; total: number; pending: number }>();
    for (const it of items) {
      const key = it.charge_type;
      const cur = groups.get(key) || { items: [], total: 0, pending: 0 };
      cur.items.push(it);
      cur.total += Number(it.amount || 0);
      if (!it.is_invoiced) cur.pending += Number(it.amount || 0);
      groups.set(key, cur);
    }
    return Array.from(groups.entries()).sort(
      (a, b) => GROUP_ORDER.indexOf(a[0]) - GROUP_ORDER.indexOf(b[0]),
    );
  }, [items]);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const toggleGroup = (key: string) =>
    setExpandedGroups((s) => ({ ...s, [key]: !s[key] }));

  const handleAdd = async () => {
    const amt = Number(form.amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast({ title: "Invalid amount", description: "Enter a positive amount", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await onAdd({
        charge_type: form.charge_type,
        amount: amt,
        description: form.description || undefined,
        billing_cycle_no: form.cycle === "auto" ? null : Number(form.cycle),
        campaign_asset_id: form.campaign_asset_id === "none" ? null : form.campaign_asset_id,
      });
      setForm({ charge_type: "reprinting", amount: "", description: "", cycle: "auto", campaign_asset_id: "none" });
      setOpen(false);
      toast({ title: "Charge added", description: "Will be included in the assigned cycle invoice." });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message || "Could not add charge", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            One-time & Ad-hoc Charges
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Initial printing/mounting auto-attached to Cycle 1. Add reprints, remounts or misc charges to any cycle.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen((o) => !o)}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Charge
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {open && (
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2 p-3 border rounded-lg bg-muted/30">
            <div className="md:col-span-1">
              <Label className="text-xs">Type</Label>
              <Select value={form.charge_type} onValueChange={(v: any) => setForm((f) => ({ ...f, charge_type: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="reprinting">Re-printing</SelectItem>
                  <SelectItem value="remounting">Re-mounting</SelectItem>
                  <SelectItem value="printing">Printing</SelectItem>
                  <SelectItem value="mounting">Mounting</SelectItem>
                  <SelectItem value="misc">Misc</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-1">
              <Label className="text-xs">Amount (₹)</Label>
              <Input
                type="number"
                className="h-8 text-xs"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div className="md:col-span-1">
              <Label className="text-xs">Cycle</Label>
              <Select value={form.cycle} onValueChange={(v) => setForm((f) => ({ ...f, cycle: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Next uninvoiced</SelectItem>
                  {cycleOptions.map((c) => (
                    <SelectItem key={c} value={String(c)}>Cycle {c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-1">
              <Label className="text-xs">Asset (optional)</Label>
              <Select value={form.campaign_asset_id} onValueChange={(v) => setForm((f) => ({ ...f, campaign_asset_id: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {campaignAssets.filter((a) => !a.is_removed).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {(a.location || a.asset_id || "").toString().slice(0, 40)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-1">
              <Label className="text-xs">Description</Label>
              <Input
                className="h-8 text-xs"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Creative change…"
              />
            </div>
            <div className="md:col-span-1 flex items-end">
              <Button size="sm" className="w-full" onClick={handleAdd} disabled={busy}>
                {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            No one-time or ad-hoc charges yet.
          </p>
        ) : (
          <div className="space-y-2">
            {groupedItems.map(([type, group]) => {
              const isOpen = !!expandedGroups[type];
              return (
                <div key={type} className="border rounded-md overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleGroup(type)}
                    className="w-full flex items-center gap-2 p-2 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
                  >
                    {isOpen ? (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <Badge variant="outline" className="text-[10px]">
                      {TYPE_LABEL[type] || type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {group.items.length} item{group.items.length === 1 ? "" : "s"}
                    </span>
                    <span className="ml-auto font-medium text-sm">
                      {formatCurrency(group.total)}
                    </span>
                    {group.pending > 0 && group.pending !== group.total && (
                      <span className="text-[11px] text-amber-600">
                        ({formatCurrency(group.pending)} pending)
                      </span>
                    )}
                  </button>
                  {isOpen && (
                    <div className="divide-y">
                      {group.items.map((it) => (
                        <div
                          key={it.id}
                          className="flex flex-wrap items-center gap-2 p-2 text-sm"
                        >
                          <Badge
                            variant={it.is_invoiced ? "default" : "outline"}
                            className="text-[10px]"
                          >
                            {TYPE_LABEL[it.charge_type] || it.charge_type}
                          </Badge>
                          <span className="font-medium">{formatCurrency(Number(it.amount))}</span>
                          <span className="text-xs text-muted-foreground truncate max-w-[260px]">
                            {it.description || "—"}
                          </span>
                          <div className="ml-auto flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Cycle</span>
                            <Select
                              value={String(it.billing_cycle_no || 1)}
                              disabled={it.is_invoiced}
                              onValueChange={(v) => onReassign(it.id, Number(v))}
                            >
                              <SelectTrigger className="h-7 w-[110px] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {cycleOptions.map((c) => (
                                  <SelectItem key={c} value={String(c)}>
                                    Cycle {c}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {it.is_invoiced ? (
                              <Badge variant="secondary" className="text-[10px]">
                                Invoiced
                              </Badge>
                            ) : (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => onDelete(it.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {totalsByCycle.size > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {Array.from(totalsByCycle.entries()).sort((a, b) => a[0] - b[0]).map(([c, t]) => (
              <Badge key={c} variant="outline" className="text-xs">
                Cycle {c}: {formatCurrency(t.amount)}
                {t.pending > 0 && t.pending !== t.amount && (
                  <span className="ml-1 text-amber-600">({formatCurrency(t.pending)} pending)</span>
                )}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}