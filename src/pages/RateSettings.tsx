import { useState, useMemo, useEffect } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, DollarSign, Truck, Printer, ArrowDownToLine, History, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { getMinMarginThreshold, setMinMarginThreshold } from "@/hooks/useCampaignProfitability";
import { getProfitLockSettings, setProfitLockSettings } from "@/utils/profitability";

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

function MinMarginCard({ companyId }: { companyId?: string }) {
  const [margin, setMargin] = useState(15);
  const [enabled, setEnabled] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const settings = getProfitLockSettings(companyId);
    setMargin(settings.minMargin);
    setEnabled(settings.enabled);
  }, [companyId]);

  const handleSave = () => {
    if (companyId) {
      setProfitLockSettings(companyId, { minMargin: margin, enabled });
      setSaved(true);
      toast.success(`Profitability lock ${enabled ? 'enabled' : 'disabled'} — threshold: ${margin}%`);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <SettingsCard>
      <div className="flex items-center gap-3 mb-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <ShieldCheck className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">Profitability Lock</h3>
          <p className="text-xs text-muted-foreground">Minimum campaign margin % required before invoice generation</p>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Switch checked={enabled} onCheckedChange={setEnabled} id="profit-lock-toggle" />
          <Label htmlFor="profit-lock-toggle" className="text-sm">
            {enabled ? "Enabled — margin check enforced" : "Disabled — no margin check"}
          </Label>
        </div>
        {enabled && (
          <div className="flex items-end gap-3">
            <div className="flex-1 max-w-[200px]">
              <Label htmlFor="min-margin">Minimum Margin (%)</Label>
              <Input
                id="min-margin"
                type="number"
                min={0}
                max={100}
                value={margin}
                onChange={e => setMargin(Number(e.target.value))}
                className="mt-1"
              />
            </div>
            <Button onClick={handleSave} size="sm" variant={saved ? "outline" : "default"}>
              {saved ? "✓ Saved" : "Save"}
            </Button>
          </div>
        )}
        {!enabled && (
          <Button onClick={handleSave} size="sm" variant={saved ? "outline" : "default"} className="w-fit">
            {saved ? "✓ Saved" : "Save"}
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        If enabled and campaign margin falls below threshold, non-admin users will be blocked from generating invoices.
        Admins can override with a logged reason.
      </p>
    </SettingsCard>
  );
}

export default function RateSettings() {
  const { company } = useCompany();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

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
      queryClient.invalidateQueries({ queryKey: ["ops-report-data"] });
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
      queryClient.invalidateQueries({ queryKey: ["ops-report-data"] });
      toast.success("Rate deleted");
      setDeleteConfirm(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditId(null);
    setForm(emptyForm);
    setFormErrors({});
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
    setFormErrors({});
    setDialogOpen(true);
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (Number(form.rate_value) < 0) errors.rate_value = "Rate cannot be negative";
    if (!form.effective_from) errors.effective_from = "Effective date is required";
    if (form.threshold_days && Number(form.threshold_days) < 0) errors.threshold_days = "Threshold cannot be negative";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = () => {
    if (!companyId || !validate()) return;
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

  // Group by category
  const groupedByCategory = (group: "vendor" | "client" | "all") => {
    const filtered = group === "all" ? rates : rates.filter(r => {
      const cat = CATEGORIES.find(c => c.value === r.category);
      return cat?.group === group;
    });
    const map = new Map<string, RateSetting[]>();
    for (const r of filtered) {
      const arr = map.get(r.category) || [];
      arr.push(r);
      map.set(r.category, arr);
    }
    return map;
  };

  // History: all inactive rates
  const historyRates = useMemo(() => rates.filter(r => !r.is_active), [rates]);

  const showThreshold = form.category === "client_mounting_short";

  const renderTable = (grouped: Map<string, RateSetting[]>) => (
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
                            onClick={() => setDeleteConfirm(r.id)}
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
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rate Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure vendor payable rates and client billable rates. Changes apply to Ops Payables, Billables & Margin reports.
          </p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setEditId(null); setFormErrors({}); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Add Rate
        </Button>
      </div>

      {/* Minimum Margin Setting */}
      <MinMarginCard companyId={companyId} />

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : (
        <Tabs defaultValue="vendor">
          <TabsList>
            <TabsTrigger value="vendor"><Truck className="h-3.5 w-3.5 mr-1.5" /> Vendor Rates</TabsTrigger>
            <TabsTrigger value="client"><DollarSign className="h-3.5 w-3.5 mr-1.5" /> Client Charges</TabsTrigger>
            <TabsTrigger value="history"><History className="h-3.5 w-3.5 mr-1.5" /> Effective History</TabsTrigger>
          </TabsList>

          <TabsContent value="vendor" className="mt-4">
            {renderTable(groupedByCategory("vendor"))}
          </TabsContent>

          <TabsContent value="client" className="mt-4">
            {renderTable(groupedByCategory("client"))}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            {historyRates.length === 0 ? (
              <SettingsCard>
                <div className="text-center py-12 text-muted-foreground">
                  <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No expired/inactive rates</p>
                  <p className="text-sm mt-1">When you deactivate a rate, it appears here for audit.</p>
                </div>
              </SettingsCard>
            ) : (
              <SettingsCard>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/40 text-muted-foreground">
                        <th className="text-left py-2 font-medium">Category</th>
                        <th className="text-left py-2 font-medium">City</th>
                        <th className="text-left py-2 font-medium">Media Type</th>
                        <th className="text-right py-2 font-medium">Rate (₹)</th>
                        <th className="text-left py-2 font-medium">Effective From</th>
                        <th className="text-left py-2 font-medium">Notes</th>
                        <th className="text-right py-2 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyRates.map(r => (
                        <tr key={r.id} className="border-b border-border/20 hover:bg-muted/30 opacity-70">
                          <td className="py-2.5">{categoryLabel(r.category)}</td>
                          <td className="py-2.5">{r.city || "All"}</td>
                          <td className="py-2.5">{r.media_type || "All"}</td>
                          <td className="py-2.5 text-right font-mono">₹{Number(r.rate_value).toLocaleString("en-IN")}</td>
                          <td className="py-2.5">{format(new Date(r.effective_from), "dd MMM yyyy")}</td>
                          <td className="py-2.5 text-muted-foreground">{r.notes || "—"}</td>
                          <td className="py-2.5 text-right">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SettingsCard>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) closeDialog(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Rate" : "Add New Rate"}</DialogTitle>
            <DialogDescription>Configure rate values. City and media type overrides take priority over defaults.</DialogDescription>
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
                  min="0"
                  value={form.rate_value}
                  onChange={e => setForm(f => ({ ...f, rate_value: Number(e.target.value) }))}
                  className={formErrors.rate_value ? "border-destructive" : ""}
                />
                {formErrors.rate_value && <p className="text-xs text-destructive mt-1">{formErrors.rate_value}</p>}
              </div>
              {showThreshold && (
                <div>
                  <Label>Duration Threshold (days)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.threshold_days}
                    onChange={e => setForm(f => ({ ...f, threshold_days: e.target.value }))}
                    placeholder="90"
                    className={formErrors.threshold_days ? "border-destructive" : ""}
                  />
                  {formErrors.threshold_days && <p className="text-xs text-destructive mt-1">{formErrors.threshold_days}</p>}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Effective From *</Label>
                <Input
                  type="date"
                  value={form.effective_from}
                  onChange={e => setForm(f => ({ ...f, effective_from: e.target.value }))}
                  className={formErrors.effective_from ? "border-destructive" : ""}
                />
                {formErrors.effective_from && <p className="text-xs text-destructive mt-1">{formErrors.effective_from}</p>}
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={v => { if (!v) setDeleteConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this rate?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this rate setting. Reports will fall back to the next matching rate or hardcoded defaults.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirm && deleteMut.mutate(deleteConfirm)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
