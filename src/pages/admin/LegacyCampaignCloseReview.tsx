import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { ModuleGuard } from "@/components/rbac/ModuleGuard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Archive, CheckCircle2, AlertTriangle, Shield, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDate } from "@/utils/plans";
import { formatINR } from "@/utils/finance";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

const LEGACY_CUTOFF = "2026-02-28";
const LEGACY_ACTIONS = [
  { value: "legacy_closed", label: "Legacy Closed", description: "Mark as historically closed — no further action needed." },
  { value: "legacy_invoicing_reviewed", label: "Invoicing Reviewed", description: "Invoicing has been reviewed and reconciled." },
  { value: "legacy_settlement_reviewed", label: "Settlement Reviewed", description: "Payment settlement has been reviewed." },
];

interface LegacyCampaign {
  id: string;
  campaign_name: string;
  client_name: string;
  client_id: string;
  start_date: string;
  end_date: string;
  status: string;
  total_amount: number;
  legacy_close_status: string | null;
  legacy_close_notes: string | null;
  invoice_count: number;
  invoiced_amount: number;
  paid_amount: number;
  balance_due: number;
}

export default function LegacyCampaignCloseReview() {
  const { company } = useCompany();
  const [campaigns, setCampaigns] = useState<LegacyCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{
    campaigns: LegacyCampaign[];
    action: string;
  } | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [applying, setApplying] = useState(false);
  const [auditLog, setAuditLog] = useState<any[]>([]);

  useEffect(() => {
    if (company?.id) {
      loadCampaigns();
      loadAuditLog();
    }
  }, [company?.id]);

  const loadCampaigns = async () => {
    if (!company?.id) return;
    setLoading(true);

    // Fetch campaigns ending before cutoff
    const { data: campaignData, error } = await supabase
      .from("campaigns")
      .select("id, campaign_name, client_name, client_id, start_date, end_date, status, total_amount, legacy_close_status, legacy_close_notes")
      .eq("company_id", company.id)
      .lte("end_date", LEGACY_CUTOFF)
      .order("end_date", { ascending: false });

    if (error) {
      toast({ title: "Error", description: "Failed to load campaigns", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Fetch invoice summaries for these campaigns
    const campaignIds = (campaignData || []).map((c: any) => c.id);
    let invoiceSummaries: Record<string, { count: number; invoiced: number; paid: number; balance: number }> = {};

    if (campaignIds.length > 0) {
      const { data: invoiceData } = await supabase
        .from("invoices")
        .select("campaign_id, total_amount, balance_due, status")
        .in("campaign_id", campaignIds)
        .neq("status", "Cancelled");

      (invoiceData || []).forEach((inv: any) => {
        const key = inv.campaign_id;
        if (!invoiceSummaries[key]) invoiceSummaries[key] = { count: 0, invoiced: 0, paid: 0, balance: 0 };
        invoiceSummaries[key].count++;
        invoiceSummaries[key].invoiced += inv.total_amount || 0;
        invoiceSummaries[key].balance += inv.balance_due || 0;
        invoiceSummaries[key].paid += (inv.total_amount || 0) - (inv.balance_due || 0);
      });
    }

    const rows: LegacyCampaign[] = (campaignData || []).map((c: any) => {
      const summary = invoiceSummaries[c.id] || { count: 0, invoiced: 0, paid: 0, balance: 0 };
      return {
        ...c,
        invoice_count: summary.count,
        invoiced_amount: summary.invoiced,
        paid_amount: summary.paid,
        balance_due: summary.balance,
      };
    });

    setCampaigns(rows);
    setLoading(false);
  };

  const loadAuditLog = async () => {
    if (!company?.id) return;
    const { data } = await supabase
      .from("finance_corrections_log")
      .select("*")
      .eq("company_id", company.id)
      .eq("entity_type", "campaign")
      .eq("action_type", "legacy_campaign_close")
      .order("performed_at", { ascending: false })
      .limit(50);
    setAuditLog(data || []);
  };

  const filtered = useMemo(() => {
    if (statusFilter === "all") return campaigns;
    if (statusFilter === "unreviewed") return campaigns.filter((c) => !c.legacy_close_status);
    if (statusFilter === "reviewed") return campaigns.filter((c) => !!c.legacy_close_status);
    return campaigns.filter((c) => c.status === statusFilter);
  }, [campaigns, statusFilter]);

  const stats = useMemo(() => ({
    total: campaigns.length,
    unreviewed: campaigns.filter((c) => !c.legacy_close_status).length,
    reviewed: campaigns.filter((c) => !!c.legacy_close_status).length,
    totalBalance: campaigns.reduce((s, c) => s + c.balance_due, 0),
  }), [campaigns]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((c) => c.id)));
    }
  };

  const openBulkAction = (action: string) => {
    const selected = campaigns.filter((c) => selectedIds.has(c.id));
    if (selected.length === 0) {
      toast({ title: "No Selection", description: "Select campaigns first.", variant: "destructive" });
      return;
    }
    setActionNotes("");
    setConfirmDialog({ campaigns: selected, action });
  };

  const handleConfirmAction = async () => {
    if (!confirmDialog || !company?.id) return;
    setApplying(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date().toISOString();

      for (const camp of confirmDialog.campaigns) {
        // Update campaign legacy flags
        await supabase
          .from("campaigns")
          .update({
            legacy_close_status: confirmDialog.action,
            legacy_close_notes: actionNotes || null,
            legacy_close_at: now,
            legacy_close_by: user?.id,
          } as any)
          .eq("id", camp.id);

        // Insert audit log
        await supabase.from("finance_corrections_log").insert({
          company_id: company.id,
          action_type: "legacy_campaign_close",
          entity_type: "campaign",
          entity_id: camp.id,
          old_value: {
            status: camp.status,
            legacy_close_status: camp.legacy_close_status,
            balance_due: camp.balance_due,
          },
          new_value: {
            legacy_close_status: confirmDialog.action,
            legacy_close_notes: actionNotes,
          },
          reason: actionNotes || `Marked as ${confirmDialog.action}`,
          status: "applied",
          performed_by: user?.id,
        } as any);
      }

      toast({
        title: "Success",
        description: `${confirmDialog.campaigns.length} campaign(s) marked as "${confirmDialog.action}".`,
      });
      setConfirmDialog(null);
      setSelectedIds(new Set());
      loadCampaigns();
      loadAuditLog();
    } catch (err) {
      toast({ title: "Error", description: "Failed to apply action", variant: "destructive" });
    } finally {
      setApplying(false);
    }
  };

  const actionLabel = LEGACY_ACTIONS.find((a) => a.value === confirmDialog?.action);

  return (
    <ModuleGuard module="finance">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Archive className="h-6 w-6 text-primary" />
            Legacy Campaign Close Review
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and close campaigns ending before {LEGACY_CUTOFF}. No automatic status changes — explicit admin confirmation required.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground">Legacy Campaigns</div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="border-amber-500/30">
            <CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground">Unreviewed</div>
              <div className="text-2xl font-bold text-amber-600">{stats.unreviewed}</div>
            </CardContent>
          </Card>
          <Card className="border-green-500/30">
            <CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground">Reviewed</div>
              <div className="text-2xl font-bold text-green-600">{stats.reviewed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground">Total Outstanding</div>
              <div className="text-2xl font-bold text-destructive">{formatINR(stats.totalBalance)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filter + Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Legacy</SelectItem>
              <SelectItem value="unreviewed">Unreviewed Only</SelectItem>
              <SelectItem value="reviewed">Reviewed Only</SelectItem>
              <SelectItem value="Running">Still Running</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{selectedIds.size} selected</Badge>
              {LEGACY_ACTIONS.map((action) => (
                <Button
                  key={action.value}
                  size="sm"
                  variant="outline"
                  onClick={() => openBulkAction(action.value)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Campaigns Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedIds.size === filtered.length && filtered.length > 0}
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Invoiced</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Legacy Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={10} className="text-center py-8">Loading...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={10} className="text-center py-8">No legacy campaigns found.</TableCell></TableRow>
                  ) : (
                    filtered.map((camp) => (
                      <TableRow key={camp.id} className={camp.legacy_close_status ? "bg-muted/30" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(camp.id)}
                            onCheckedChange={() => toggleSelect(camp.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-sm">{camp.id}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">{camp.campaign_name}</div>
                        </TableCell>
                        <TableCell className="text-sm">{camp.client_name}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {formatDate(camp.start_date)} → {formatDate(camp.end_date)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{camp.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{formatINR(camp.invoiced_amount)}</TableCell>
                        <TableCell className="text-sm">{formatINR(camp.paid_amount)}</TableCell>
                        <TableCell className={`text-sm font-medium ${camp.balance_due > 0 ? "text-destructive" : "text-green-600"}`}>
                          {formatINR(camp.balance_due)}
                        </TableCell>
                        <TableCell>
                          {camp.legacy_close_status ? (
                            <Badge className="bg-green-500/10 text-green-700 border-green-500/30">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              {camp.legacy_close_status.replace(/_/g, " ")}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-500/30">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedIds(new Set([camp.id]));
                              setActionNotes("");
                              setConfirmDialog({ campaigns: [camp], action: "legacy_closed" });
                            }}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Audit Trail */}
        {auditLog.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Legacy Close Audit Trail</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Old Status</TableHead>
                    <TableHead>New Status</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLog.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell>{formatDate(log.performed_at)}</TableCell>
                      <TableCell className="font-mono text-sm">{log.entity_id}</TableCell>
                      <TableCell>{(log.new_value as any)?.legacy_close_status || "—"}</TableCell>
                      <TableCell>{(log.old_value as any)?.legacy_close_status || "none"}</TableCell>
                      <TableCell>{(log.new_value as any)?.legacy_close_status || "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{log.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Confirmation Dialog */}
        <AlertDialog open={!!confirmDialog} onOpenChange={(open) => !open && setConfirmDialog(null)}>
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Confirm Legacy Close Action
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <div className="bg-muted p-3 rounded-lg text-sm space-y-2">
                    <div><strong>Action:</strong> {actionLabel?.label || confirmDialog?.action}</div>
                    <div className="text-xs text-muted-foreground">{actionLabel?.description}</div>
                    <div><strong>Affected campaigns:</strong> {confirmDialog?.campaigns.length}</div>
                    {confirmDialog?.campaigns.map((c) => (
                      <div key={c.id} className="flex justify-between text-xs border-t pt-1">
                        <span>{c.id} — {c.client_name}</span>
                        <span className={c.balance_due > 0 ? "text-destructive" : "text-green-600"}>
                          Balance: {formatINR(c.balance_due)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="border border-amber-500/30 bg-amber-50 p-3 rounded-lg text-sm space-y-1">
                    <strong>What this does:</strong>
                    <ul className="list-disc list-inside text-xs space-y-0.5">
                      <li>Sets <code>legacy_close_status</code> flag on selected campaigns</li>
                      <li>Does <strong>NOT</strong> change campaign status, invoice status, or payment records</li>
                      <li>Does <strong>NOT</strong> mark anything as "Paid" or "Fully Invoiced"</li>
                      <li>Creates an audit trail entry for each campaign</li>
                    </ul>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Reason / Notes (required):</label>
                    <Textarea
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                      placeholder="Why are these campaigns being marked as legacy closed?"
                    />
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmAction}
                disabled={applying || !actionNotes.trim()}
              >
                {applying ? "Applying..." : `Confirm: ${actionLabel?.label}`}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ModuleGuard>
  );
}
