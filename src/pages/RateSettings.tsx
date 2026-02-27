import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { SettingsCard } from "@/components/settings/zoho-style";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, DollarSign, Truck, Printer, ArrowDownToLine } from "lucide-react";
import { format } from "date-fns";

interface RateSetting {
  id: string;
  company_id: string;
  category: string;
  city: string | null;
  media_type: string | null;
  rate_value: number;
  threshold_days: number | null;
  effective_from: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

const CATEGORIES = [
  { value: "vendor_mounting", label: "Vendor — Mounting", group: "vendor", icon: Truck },
  { value: "vendor_unmounting", label: "Vendor — Unmounting", group: "vendor", icon: ArrowDownToLine },
  { value: "vendor_print_nonlit", label: "Vendor — Printing (Non-Lit)", group: "vendor", icon: Printer },
  { value: "vendor_print_backlit", label: "Vendor — Printing (Backlit)", group: "vendor", icon: Printer },
  { value: "client_mounting_short", label: "Client — Mounting (Short Campaign)", group: "client", icon: DollarSign },
  { value: "client_printing_markup", label: "Client — Printing Markup %", group: "client", icon: DollarSign },
  { value: "client_unmounting", label: "Client — Unmounting Charge", group: "client", icon: DollarSign },
] as const;

const categoryLabel = (cat: string) => CATEGORIES.find(c => c.value === cat)?.label ?? cat;
const categoryUnit = (cat: string) => {
  if (cat.includes("print") && !cat.includes("markup")) return "/sqft";
  if (cat.includes("markup")) return "%";
  return "/asset";
};

const emptyForm = {
  category: "vendor_mounting",
  city: "",
  media_type: "",
  rate_value: 0,
  threshold_days: "",
  effective_from: new Date().toISOString().slice(0, 10),
  is_active: true,
  notes: "",
};

export default function RateSettings() {
  const { company } = useCompany();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filterGroup, setFilterGroup] = useState<"all" | "vendor" | "client">("all");

  const companyId = company?.id;

  const { data: rates = [], isLoading } = useQuery({
    queryKey: ["rate_settings", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rate_settings" as any)
        .select("*")
        .eq("company_id", companyId!)
        .order("category")
        .order("effective_from", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as RateSetting[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (payload: any) => {
      if (editId) {
        const { error } = await supabase
          .from("rate_settings" as any)
          .update(payload)
          .eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("rate_settings" as any)
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rate_settings"] });
      toast.success(editId ? "Rate updated" : "Rate created");
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("rate_settings" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rate_settings"] });
      toast.success("Rate deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditId(null);
    setForm(emptyForm);
  };

  const openEdit = (r: RateSetting) => {
    setEditId(r.id);
    setForm({
      category: r.category,
      city: r.city ?? "",
      media_type: r.media_type ?? "",
      rate_value: r.rate_value,
      threshold_days: r.threshold_days?.toString() ?? "",
      effective_from: r.effective_from,
      is_active: r.is_active,
      notes: r.notes ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!companyId) return;
    upsert.mutate({
      ...(editId ? {} : { company_id: companyId }),
      category: form.category,
      city: form.city || null,
      media_type: form.media_type || null,
      rate_value: Number(form.rate_value),
      threshold_days: form.threshold_days ? Number(form.threshold_days) : null,
      effective_from: form.effective_from,
      is_active: form.is_active,
      notes: form.notes || null,
    });
  };

  const filtered = useMemo(() => {
    if (filterGroup === "all") return rates;
    return rates.filter(r => {
      const cat = CATEGORIES.find(c => c.value === r.category);
      return cat?.group === filterGroup;
    });
  }, [rates, filterGroup]);

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, RateSetting[]>();
    for (const r of filtered) {
      const arr = map.get(r.category) || [];
      arr.push(r);
      map.set(r.category, arr);
    }
    return map;
  }, [filtered]);

  const showThreshold = form.category === "client_mounting_short";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rate Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure vendor payable rates and client billable rates for mounting, printing & unmounting.
          </p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setEditId(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Add Rate
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["all", "vendor", "client"] as const).map(g => (
          <Button
            key={g}
            variant={filterGroup === g ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterGroup(g)}
          >
            {g === "all" ? "All Rates" : g === "vendor" ? "Vendor Payable" : "Client Billable"}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {[...grouped.entries()].map(([category, items]) => {
            const catMeta = CATEGORIES.find(c => c.value === category);
            const Icon = catMeta?.icon ?? DollarSign;
            return (
              <SettingsCard key={category}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{categoryLabel(category)}</h3>
                    <p className="text-xs text-muted-foreground">Unit: {categoryUnit(category)}</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/40 text-muted-foreground">
                        <th className="text-left py-2 font-medium">City</th>
                        <th className="text-left py-2 font-medium">Media Type</th>
                        <th className="text-right py-2 font-medium">Rate (₹)</th>
                        {category === "client_mounting_short" && (
                          <th className="text-right py-2 font-medium">Threshold (days)</th>
                        )}
                        <th className="text-left py-2 font-medium">Effective From</th>
                        <th className="text-center py-2 font-medium">Active</th>
                        <th className="text-left py-2 font-medium">Notes</th>
                        <th className="text-right py-2 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(r => (
                        <tr key={r.id} className="border-b border-border/20 hover:bg-muted/30">
                          <td className="py-2.5">{r.city || <span className="text-muted-foreground italic">All</span>}</td>
                          <td className="py-2.5">{r.media_type || <span className="text-muted-foreground italic">All</span>}</td>
                          <td className="py-2.5 text-right font-mono font-medium">₹{Number(r.rate_value).toLocaleString("en-IN")}</td>
                          {category === "client_mounting_short" && (
                            <td className="py-2.5 text-right">{r.threshold_days ?? "—"}</td>
                          )}
                          <td className="py-2.5">{format(new Date(r.effective_from), "dd MMM yyyy")}</td>
                          <td className="py-2.5 text-center">
                            <Badge variant={r.is_active ? "default" : "secondary"} className="text-xs">
                              {r.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="py-2.5 text-muted-foreground max-w-[200px] truncate">{r.notes || "—"}</td>
                          <td className="py-2.5 text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={() => {
                                  if (confirm("Delete this rate?")) deleteMut.mutate(r.id);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SettingsCard>
            );
          })}

          {grouped.size === 0 && (
            <SettingsCard>
              <div className="text-center py-12 text-muted-foreground">
                <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No rates configured</p>
                <p className="text-sm mt-1">Click "Add Rate" to get started.</p>
              </div>
            </SettingsCard>
          )}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) closeDialog(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Rate" : "Add New Rate"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem disabled value="__vendor_header" className="font-semibold text-xs text-muted-foreground">
                    VENDOR PAYABLE
                  </SelectItem>
                  {CATEGORIES.filter(c => c.group === "vendor").map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                  <SelectItem disabled value="__client_header" className="font-semibold text-xs text-muted-foreground">
                    CLIENT BILLABLE
                  </SelectItem>
                  {CATEGORIES.filter(c => c.group === "client").map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>City <span className="text-muted-foreground text-xs">(blank = all)</span></Label>
                <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="e.g. Hyderabad" />
              </div>
              <div>
                <Label>Media Type <span className="text-muted-foreground text-xs">(blank = all)</span></Label>
                <Input value={form.media_type} onChange={e => setForm(f => ({ ...f, media_type: e.target.value }))} placeholder="e.g. bus_shelter" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Rate Value (₹) *</Label>
                <Input
                  type="number"
                  value={form.rate_value}
                  onChange={e => setForm(f => ({ ...f, rate_value: Number(e.target.value) }))}
                />
              </div>
              {showThreshold && (
                <div>
                  <Label>Duration Threshold (days)</Label>
                  <Input
                    type="number"
                    value={form.threshold_days}
                    onChange={e => setForm(f => ({ ...f, threshold_days: e.target.value }))}
                    placeholder="90"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Effective From</Label>
                <Input
                  type="date"
                  value={form.effective_from}
                  onChange={e => setForm(f => ({ ...f, effective_from: e.target.value }))}
                />
              </div>
              <div className="flex items-end gap-3 pb-1">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))}
                />
                <Label>Active</Label>
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Input
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSave} disabled={upsert.isPending}>
              {upsert.isPending ? "Saving…" : editId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
