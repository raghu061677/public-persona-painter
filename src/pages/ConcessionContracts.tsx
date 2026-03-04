import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Play, Eye, Pencil, Loader2 } from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";

interface ContractForm {
  authority_name: string;
  contract_name: string;
  contract_ref: string;
  start_date: string;
  end_date: string;
  billing_cycle: string;
  total_fee: string;
  fee_type: string;
  annual_escalation_percent: string;
  advertisement_fee: string;
  base_year_fee: string;
  allocation_method: string;
  applies_to: string;
  filter_json: string;
  active: boolean;
  asset_count: string;
  gst_inclusive: boolean;
  gst_percent: string;
  rcm_applicable: boolean;
}

const emptyForm: ContractForm = {
  authority_name: "",
  contract_name: "",
  contract_ref: "",
  start_date: "",
  end_date: "",
  billing_cycle: "monthly",
  total_fee: "",
  fee_type: "concession",
  annual_escalation_percent: "5",
  advertisement_fee: "0",
  base_year_fee: "",
  allocation_method: "per_asset",
  applies_to: "all_assets",
  filter_json: "",
  active: true,
  asset_count: "50",
  gst_inclusive: true,
  gst_percent: "18",
  rcm_applicable: true,
};

/** Extract base value from GST-inclusive amount */
function extractGST(inclusive: number, gstPercent: number) {
  const base = Math.round((inclusive / (1 + gstPercent / 100)) * 100) / 100;
  const gst = Math.round((inclusive - base) * 100) / 100;
  return { base, gst };
}

/** Calculate escalated fee for a given FY based on base_year_fee and escalation % */
function getEscalatedFee(baseYearFee: number, escalationPercent: number, contractStartDate: string, forDate?: string): { currentFee: number; yearNumber: number } {
  const start = new Date(contractStartDate);
  const now = forDate ? new Date(forDate) : new Date();
  // Calculate FY years elapsed (April-March FY cycle)
  const startFY = start.getMonth() >= 3 ? start.getFullYear() : start.getFullYear() - 1;
  const nowFY = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const yearNumber = Math.max(0, nowFY - startFY);
  const currentFee = baseYearFee * Math.pow(1 + escalationPercent / 100, yearNumber);
  return { currentFee: Math.round(currentFee), yearNumber: yearNumber + 1 };
}

export default function ConcessionContracts() {
  const { company } = useCompany();
  const companyId = company?.id;
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ContractForm>(emptyForm);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [runMonth, setRunMonth] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const { data: contracts, isLoading } = useQuery({
    queryKey: ["concession-contracts", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("concession_contracts" as any)
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!companyId,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editId) {
        const { error } = await supabase
          .from("concession_contracts" as any)
          .update(payload)
          .eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("concession_contracts" as any)
          .insert({ ...payload, company_id: companyId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editId ? "Contract updated" : "Contract created");
      qc.invalidateQueries({ queryKey: ["concession-contracts"] });
      setShowForm(false);
      setEditId(null);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSave = () => {
    if (!form.contract_name || !form.start_date || !form.total_fee || !form.billing_cycle) {
      toast.error("Fill required fields");
      return;
    }
    let filterJson = null;
    if (form.filter_json) {
      try {
        filterJson = JSON.parse(form.filter_json);
      } catch {
        toast.error("Invalid filter JSON");
        return;
      }
    }
    const baseYearFee = form.base_year_fee ? parseFloat(form.base_year_fee) : parseFloat(form.total_fee);
    saveMutation.mutate({
      authority_name: form.authority_name || null,
      contract_name: form.contract_name,
      contract_ref: form.contract_ref || null,
      start_date: form.start_date,
      end_date: form.end_date || null,
      billing_cycle: form.billing_cycle,
      total_fee: parseFloat(form.total_fee),
      fee_type: form.fee_type,
      annual_escalation_percent: parseFloat(form.annual_escalation_percent) || 0,
      advertisement_fee: parseFloat(form.advertisement_fee) || 0,
      base_year_fee: baseYearFee,
      allocation_method: form.allocation_method,
      applies_to: form.applies_to,
      filter_json: filterJson,
      active: form.active,
      asset_count: parseInt(form.asset_count) || 0,
      gst_inclusive: form.gst_inclusive,
      gst_percent: parseFloat(form.gst_percent) || 18,
      rcm_applicable: form.rcm_applicable,
    });
  };

  const openEdit = (c: any) => {
    setEditId(c.id);
    setForm({
      authority_name: c.authority_name || "",
      contract_name: c.contract_name,
      contract_ref: c.contract_ref || "",
      start_date: c.start_date,
      end_date: c.end_date || "",
      billing_cycle: c.billing_cycle,
      total_fee: String(c.total_fee),
      fee_type: c.fee_type || "concession",
      annual_escalation_percent: String(c.annual_escalation_percent ?? 0),
      advertisement_fee: String(c.advertisement_fee ?? 0),
      base_year_fee: String(c.base_year_fee ?? c.total_fee),
      allocation_method: c.allocation_method,
      applies_to: c.applies_to,
      filter_json: c.filter_json ? JSON.stringify(c.filter_json, null, 2) : "",
      active: c.active,
      asset_count: String(c.asset_count ?? 0),
      gst_inclusive: c.gst_inclusive ?? true,
      gst_percent: String(c.gst_percent ?? 18),
      rcm_applicable: c.rcm_applicable ?? true,
    });
    setShowForm(true);
  };

  const runAllocation = async (dryRun: boolean) => {
    const [y, m] = runMonth.split("-").map(Number);
    setPreviewLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "run-concession-allocation",
        {
          body: {
            company_id: companyId,
            period_year: y,
            period_month: m,
            dry_run: dryRun,
          },
        }
      );
      if (error) throw error;
      if (dryRun) {
        setPreviewData(data);
        setShowPreview(true);
      } else {
        toast.success(
          `Allocation complete: ${data.results?.length || 0} contracts processed`
        );
        qc.invalidateQueries({ queryKey: ["concession-contracts"] });
      }
    } catch (e: any) {
      toast.error(e.message || "Allocation failed");
    } finally {
      setPreviewLoading(false);
    }
  };

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Concession Contracts</h1>
          <p className="text-sm text-muted-foreground">
            Manage authority concession fees and allocate costs to assets
          </p>
        </div>
        <Button onClick={() => { setEditId(null); setForm(emptyForm); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-1" /> New Contract
        </Button>
      </div>

      {/* Run Allocation Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Run Allocation</CardTitle>
          <CardDescription className="text-xs">
            Allocate concession fees to assets for a specific month. Locked periods are automatically skipped.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div>
              <Label className="text-xs">Period (YYYY-MM)</Label>
              <Input
                type="month"
                value={runMonth}
                onChange={(e) => setRunMonth(e.target.value)}
                className="w-44"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={previewLoading}
              onClick={() => runAllocation(true)}
            >
              {previewLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              Preview
            </Button>
            <Button
              size="sm"
              disabled={previewLoading}
              onClick={() => runAllocation(false)}
            >
              <Play className="h-4 w-4 mr-1" /> Run Now
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contracts Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contract</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Authority</TableHead>
                <TableHead className="text-right">Yr Fee (Incl.)</TableHead>
                <TableHead className="text-right">Base (Ex-GST)</TableHead>
                <TableHead className="text-right">GST (RCM)</TableHead>
                <TableHead className="text-right">Monthly</TableHead>
                <TableHead className="text-center">Assets</TableHead>
                <TableHead className="text-right">Per Asset/Mo</TableHead>
                <TableHead>Escalation</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">Loading…</TableCell>
                </TableRow>
              ) : !contracts?.length ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">No contracts yet</TableCell>
                </TableRow>
              ) : (
                contracts.map((c: any) => {
                  const escalation = c.annual_escalation_percent ?? 0;
                  const baseYearFee = c.base_year_fee ?? c.total_fee;
                  const { currentFee, yearNumber } = c.start_date && escalation > 0
                    ? getEscalatedFee(baseYearFee, escalation, c.start_date)
                    : { currentFee: c.total_fee, yearNumber: 1 };
                  const gstPct = c.gst_percent ?? 18;
                  const isGstInclusive = c.gst_inclusive ?? true;
                  const { base: yearlyBase, gst: yearlyGst } = isGstInclusive
                    ? extractGST(currentFee, gstPct)
                    : { base: currentFee, gst: Math.round(currentFee * gstPct / 100) };
                  const monthlyBase = Math.round(yearlyBase / 12);
                  const assetCount = c.asset_count || 0;
                  const perAssetMonth = assetCount > 0 ? Math.round(monthlyBase / assetCount) : 0;
                  return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium">{c.contract_name}</div>
                      {yearNumber > 1 && <span className="text-xs text-muted-foreground">Year {yearNumber}</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">{c.fee_type || "concession"}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{c.authority_name || "—"}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(currentFee)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(yearlyBase)}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-orange-600">
                      {fmt(yearlyGst)}
                      {(c.rcm_applicable ?? true) && <Badge variant="outline" className="text-[10px] ml-1">RCM</Badge>}
                    </TableCell>
                    <TableCell className="text-right font-mono text-primary font-semibold">{fmt(monthlyBase)}</TableCell>
                    <TableCell className="text-center font-mono">{assetCount || "—"}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold">
                      {assetCount > 0 ? fmt(perAssetMonth) : "—"}
                    </TableCell>
                    <TableCell className="text-xs">{escalation > 0 ? `${escalation}%/yr` : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={c.active ? "default" : "secondary"} className="text-xs">
                        {c.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                   </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Contract" : "New Concession Contract"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Contract Name *</Label>
                <Input value={form.contract_name} onChange={(e) => setForm({ ...form, contract_name: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Authority</Label>
                <Input value={form.authority_name} onChange={(e) => setForm({ ...form, authority_name: e.target.value })} placeholder="GHMC / Municipality" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Contract Ref</Label>
              <Input value={form.contract_ref} onChange={(e) => setForm({ ...form, contract_ref: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Start Date *</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">End Date</Label>
                <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Fee Type *</Label>
                <Select value={form.fee_type} onValueChange={(v) => setForm({ ...form, fee_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="concession">Concession Fee</SelectItem>
                    <SelectItem value="advertisement">Advertisement Fee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Billing Cycle *</Label>
                <Select value={form.billing_cycle} onValueChange={(v) => setForm({ ...form, billing_cycle: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* GST & RCM Settings */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex items-center gap-2">
                <Switch checked={form.gst_inclusive} onCheckedChange={(v) => setForm({ ...form, gst_inclusive: v })} />
                <Label className="text-xs">GST Inclusive</Label>
              </div>
              <div>
                <Label className="text-xs">GST %</Label>
                <Input type="number" value={form.gst_percent} onChange={(e) => setForm({ ...form, gst_percent: e.target.value })} className="h-8" />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.rcm_applicable} onCheckedChange={(v) => setForm({ ...form, rcm_applicable: v })} />
                <Label className="text-xs">RCM (Reverse Charge)</Label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Base Year Fee (₹/Year, GST Incl.) *</Label>
                <Input
                  type="number"
                  value={form.base_year_fee || form.total_fee}
                  onChange={(e) => setForm({ ...form, base_year_fee: e.target.value, total_fee: e.target.value || form.total_fee })}
                  placeholder="Yearly fee including GST"
                />
              </div>
              <div>
                <Label className="text-xs">Annual Escalation (%)</Label>
                <Input
                  type="number"
                  value={form.annual_escalation_percent}
                  onChange={(e) => setForm({ ...form, annual_escalation_percent: e.target.value })}
                  placeholder="e.g. 5 for 5%"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Current Year Fee (₹/Year) *</Label>
                <Input type="number" value={form.total_fee} onChange={(e) => setForm({ ...form, total_fee: e.target.value })} placeholder="Fee for current FY" />
                {form.base_year_fee && parseFloat(form.annual_escalation_percent) > 0 && form.start_date && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Auto: {fmt(getEscalatedFee(parseFloat(form.base_year_fee), parseFloat(form.annual_escalation_percent), form.start_date).currentFee)}/yr (Year {getEscalatedFee(parseFloat(form.base_year_fee), parseFloat(form.annual_escalation_percent), form.start_date).yearNumber})
                  </p>
                )}
              </div>
              <div>
                <Label className="text-xs">Advertisement Fee (₹/Year)</Label>
                <Input
                  type="number"
                  value={form.advertisement_fee}
                  onChange={(e) => setForm({ ...form, advertisement_fee: e.target.value })}
                  placeholder="Yearly ad fee (GST incl.)"
                />
              </div>
            </div>

            {/* Asset Count */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">No. of Assets in Package *</Label>
                <Input
                  type="number"
                  value={form.asset_count}
                  onChange={(e) => setForm({ ...form, asset_count: e.target.value })}
                  placeholder="e.g. 50"
                />
              </div>
              <div>
                <Label className="text-xs">Allocation Method</Label>
                <Select value={form.allocation_method} onValueChange={(v) => setForm({ ...form, allocation_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_asset">Per Asset (Equal)</SelectItem>
                    <SelectItem value="per_asset_day">Per Asset Day</SelectItem>
                    <SelectItem value="per_revenue">Per Revenue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Live Breakdown Preview */}
            {form.total_fee && parseInt(form.asset_count) > 0 && (() => {
              const yearlyFee = parseFloat(form.total_fee) || 0;
              const gstPct = parseFloat(form.gst_percent) || 18;
              const assetCt = parseInt(form.asset_count) || 1;
              const { base: yearBase, gst: yearGst } = form.gst_inclusive ? extractGST(yearlyFee, gstPct) : { base: yearlyFee, gst: Math.round(yearlyFee * gstPct / 100) };
              const monthBase = Math.round(yearBase / 12);
              const monthGst = Math.round(yearGst / 12);
              const perAssetMonth = Math.round(monthBase / assetCt);
              const adFee = parseFloat(form.advertisement_fee) || 0;
              const { base: adBase } = adFee > 0 && form.gst_inclusive ? extractGST(adFee, gstPct) : { base: adFee };
              const adPerAssetMonth = assetCt > 0 ? Math.round((adBase / 12) / assetCt) : 0;
              return (
                <Card className="bg-muted/50 border-dashed">
                  <CardContent className="pt-3 pb-3 px-4 space-y-1">
                    <p className="text-xs font-semibold text-foreground mb-2">💰 Breakdown Preview</p>
                    <div className="grid grid-cols-2 text-xs gap-y-1">
                      <span className="text-muted-foreground">Yearly (Incl. GST):</span>
                      <span className="text-right font-mono">{fmt(yearlyFee)}</span>
                      <span className="text-muted-foreground">Base (Ex-GST):</span>
                      <span className="text-right font-mono">{fmt(yearBase)}</span>
                      <span className="text-muted-foreground">GST {form.rcm_applicable ? "(RCM - Claimable)" : ""}:</span>
                      <span className="text-right font-mono text-orange-600">{fmt(yearGst)}</span>
                      <span className="text-muted-foreground">Monthly Base:</span>
                      <span className="text-right font-mono font-semibold text-primary">{fmt(monthBase)}</span>
                      <span className="text-muted-foreground">Monthly GST:</span>
                      <span className="text-right font-mono">{fmt(monthGst)}</span>
                      <span className="text-muted-foreground font-semibold">Per Asset/Month ({assetCt} assets):</span>
                      <span className="text-right font-mono font-bold text-primary">{fmt(perAssetMonth)}</span>
                      {adFee > 0 && (
                        <>
                          <span className="text-muted-foreground">Ad Fee Per Asset/Month:</span>
                          <span className="text-right font-mono">{fmt(adPerAssetMonth)}</span>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Applies To</Label>
                <Select value={form.applies_to} onValueChange={(v) => setForm({ ...form, applies_to: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_assets">All Assets</SelectItem>
                    <SelectItem value="asset_list">Specific Assets</SelectItem>
                    <SelectItem value="media_type">By Media Type</SelectItem>
                    <SelectItem value="zone">By Zone/City/Area</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.applies_to !== "all_assets" && (
              <div>
                <Label className="text-xs">Filter JSON</Label>
                <Textarea
                  value={form.filter_json}
                  onChange={(e) => setForm({ ...form, filter_json: e.target.value })}
                  placeholder='{"asset_ids":["HYD-BSQ-001"]} or {"media_type":["bus_shelter"]} or {"city":["Hyderabad"]}'
                  rows={3}
                  className="font-mono text-xs"
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              <Label className="text-xs">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {editId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Allocation Preview (Dry Run)</DialogTitle>
          </DialogHeader>
          {previewData && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Period: <strong>{previewData.period}</strong>
              </p>
              {previewData.errors?.length > 0 && (
                <div className="text-xs text-destructive space-y-1">
                  {previewData.errors.map((e: string, i: number) => (
                    <p key={i}>⚠ {e}</p>
                  ))}
                </div>
              )}
              {previewData.results?.map((r: any) => (
                <Card key={r.contract_id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{r.contract_name}</CardTitle>
                    <CardDescription className="text-xs">
                      Method: {r.method} · Total Fee: {fmt(r.total_fee)} · Assets: {r.asset_count}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Asset ID</TableHead>
                          <TableHead className="text-xs text-right">Basis</TableHead>
                          <TableHead className="text-xs text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {r.postings_preview?.slice(0, 20).map((p: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="text-xs font-mono">{p.asset_id}</TableCell>
                            <TableCell className="text-xs text-right">{p.basis_value}</TableCell>
                            <TableCell className="text-xs text-right font-mono">{fmt(p.allocated_amount)}</TableCell>
                          </TableRow>
                        ))}
                        {(r.postings_preview?.length || 0) > 20 && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-xs text-muted-foreground text-center">
                              ...and {r.postings_preview.length - 20} more
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
