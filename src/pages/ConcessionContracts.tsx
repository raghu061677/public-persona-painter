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
  allocation_method: string;
  applies_to: string;
  filter_json: string;
  active: boolean;
}

const emptyForm: ContractForm = {
  authority_name: "",
  contract_name: "",
  contract_ref: "",
  start_date: "",
  end_date: "",
  billing_cycle: "monthly",
  total_fee: "",
  allocation_method: "per_asset",
  applies_to: "all_assets",
  filter_json: "",
  active: true,
};

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
    saveMutation.mutate({
      authority_name: form.authority_name || null,
      contract_name: form.contract_name,
      contract_ref: form.contract_ref || null,
      start_date: form.start_date,
      end_date: form.end_date || null,
      billing_cycle: form.billing_cycle,
      total_fee: parseFloat(form.total_fee),
      allocation_method: form.allocation_method,
      applies_to: form.applies_to,
      filter_json: filterJson,
      active: form.active,
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
      allocation_method: c.allocation_method,
      applies_to: c.applies_to,
      filter_json: c.filter_json ? JSON.stringify(c.filter_json, null, 2) : "",
      active: c.active,
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
                <TableHead>Authority</TableHead>
                <TableHead>Cycle</TableHead>
                <TableHead className="text-right">Fee</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : !contracts?.length ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No contracts yet
                  </TableCell>
                </TableRow>
              ) : (
                contracts.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.contract_name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{c.authority_name || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">{c.billing_cycle}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{fmt(c.total_fee)}</TableCell>
                    <TableCell className="text-xs">{c.allocation_method.replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-xs">{c.applies_to.replace(/_/g, " ")}</TableCell>
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
                ))
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
              <div>
                <Label className="text-xs">Total Fee (₹) *</Label>
                <Input type="number" value={form.total_fee} onChange={(e) => setForm({ ...form, total_fee: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
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
