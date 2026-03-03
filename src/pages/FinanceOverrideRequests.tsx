import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, CheckCircle2, XCircle, Clock, Play, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface OverrideRequest {
  id: string;
  company_id: string;
  requested_by: string;
  requested_by_role: string;
  reason: string;
  scope_table: string;
  scope_record_id: string;
  scope_action: string;
  payload: any;
  status: string;
  admin_decision_by: string | null;
  admin_decision_at: string | null;
  admin_decision_reason: string | null;
  created_at: string;
  executed_at: string | null;
}

const statusConfig: Record<string, { color: string; icon: any }> = {
  pending: { color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200", icon: Clock },
  approved: { color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", icon: CheckCircle2 },
  rejected: { color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", icon: XCircle },
  executed: { color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200", icon: CheckCircle2 },
  expired: { color: "bg-muted text-muted-foreground", icon: Clock },
};

export default function FinanceOverrideRequests() {
  const { company } = useCompany();
  const { isAdmin } = useAuth();
  const [requests, setRequests] = useState<OverrideRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");

  // Decision dialog
  const [decisionReq, setDecisionReq] = useState<OverrideRequest | null>(null);
  const [decisionAction, setDecisionAction] = useState<"approved" | "rejected">("approved");
  const [decisionReason, setDecisionReason] = useState("");
  const [deciding, setDeciding] = useState(false);

  // Execute dialog
  const [executeReq, setExecuteReq] = useState<OverrideRequest | null>(null);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    if (company?.id) loadRequests();
  }, [company?.id]);

  async function loadRequests() {
    if (!company?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("finance_override_requests" as any)
      .select("*")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load override requests:", error);
      toast.error("Failed to load override requests");
    } else {
      setRequests((data as any[]) || []);
    }
    setLoading(false);
  }

  async function handleDecision() {
    if (!decisionReq) return;
    if (decisionAction === "rejected" && !decisionReason.trim()) {
      toast.error("Rejection reason is required");
      return;
    }
    setDeciding(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-decide-override", {
        body: {
          request_id: decisionReq.id,
          decision: decisionAction,
          admin_decision_reason: decisionReason.trim() || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(decisionAction === "approved" ? "Override approved" : "Override rejected");
      setDecisionReq(null);
      setDecisionReason("");
      loadRequests();
    } catch (err: any) {
      toast.error(err.message || "Decision failed");
    } finally {
      setDeciding(false);
    }
  }

  async function handleExecute() {
    if (!executeReq) return;
    setExecuting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-execute-override", {
        body: { request_id: executeReq.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Override executed successfully");
      setExecuteReq(null);
      loadRequests();
    } catch (err: any) {
      toast.error(err.message || "Execution failed");
    } finally {
      setExecuting(false);
    }
  }

  const filtered = useMemo(() => {
    if (tab === "all") return requests;
    return requests.filter((r) => r.status === tab);
  }, [requests, tab]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Finance Override Requests
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isAdmin ? "Review, approve, and execute override requests for locked financial periods." : "Submit and track override requests for locked financial periods."}
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending{" "}
            <Badge variant="secondary" className="ml-1.5 text-xs">
              {requests.filter((r) => r.status === "pending").length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="executed">Executed</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No {tab === "all" ? "" : tab} requests found.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Table</TableHead>
                      <TableHead>Record</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r) => {
                      const cfg = statusConfig[r.status] || statusConfig.pending;
                      const Icon = cfg.icon;
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="text-xs whitespace-nowrap">{format(new Date(r.created_at), "dd MMM yy HH:mm")}</TableCell>
                          <TableCell><Badge variant="outline" className="font-mono text-xs">{r.scope_table}</Badge></TableCell>
                          <TableCell className="font-mono text-xs max-w-[120px] truncate">{r.scope_record_id}</TableCell>
                          <TableCell><Badge variant="secondary" className="text-xs">{r.scope_action}</Badge></TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm">{r.reason}</TableCell>
                          <TableCell>
                            <Badge className={`${cfg.color} gap-1`}>
                              <Icon className="h-3 w-3" /> {r.status}
                            </Badge>
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {r.status === "pending" && (
                                  <>
                                    <Button size="sm" variant="default" onClick={() => { setDecisionReq(r); setDecisionAction("approved"); }}>
                                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                                    </Button>
                                    <Button size="sm" variant="destructive" onClick={() => { setDecisionReq(r); setDecisionAction("rejected"); }}>
                                      <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                                    </Button>
                                  </>
                                )}
                                {r.status === "approved" && (
                                  <Button size="sm" variant="default" onClick={() => setExecuteReq(r)}>
                                    <Play className="h-3.5 w-3.5 mr-1" /> Execute
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Decision Dialog */}
      <Dialog open={!!decisionReq} onOpenChange={(open) => { if (!open) setDecisionReq(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{decisionAction === "approved" ? "Approve" : "Reject"} Override Request</DialogTitle>
          </DialogHeader>
          {decisionReq && (
            <div className="space-y-4">
              <div className="text-sm space-y-1">
                <p><span className="font-medium">Table:</span> {decisionReq.scope_table}</p>
                <p><span className="font-medium">Record:</span> {decisionReq.scope_record_id}</p>
                <p><span className="font-medium">Action:</span> {decisionReq.scope_action}</p>
                <p><span className="font-medium">Reason:</span> {decisionReq.reason}</p>
                {decisionReq.payload && (
                  <div>
                    <span className="font-medium">Payload:</span>
                    <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto max-h-32">{JSON.stringify(decisionReq.payload, null, 2)}</pre>
                  </div>
                )}
              </div>
              <Textarea
                placeholder={decisionAction === "rejected" ? "Rejection reason (required)" : "Admin notes (optional)"}
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecisionReq(null)}>Cancel</Button>
            <Button
              variant={decisionAction === "approved" ? "default" : "destructive"}
              onClick={handleDecision}
              disabled={deciding}
            >
              {deciding && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {decisionAction === "approved" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Execute Dialog */}
      <Dialog open={!!executeReq} onOpenChange={(open) => { if (!open) setExecuteReq(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Execute Override</DialogTitle>
          </DialogHeader>
          {executeReq && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">This will modify a locked financial record.</p>
                  <p className="text-muted-foreground mt-1">A 10-minute override permit will be created and the write will be executed immediately. This action is fully audit-logged.</p>
                </div>
              </div>
              <div className="text-sm space-y-1">
                <p><span className="font-medium">Table:</span> {executeReq.scope_table}</p>
                <p><span className="font-medium">Record:</span> {executeReq.scope_record_id}</p>
                <p><span className="font-medium">Action:</span> {executeReq.scope_action}</p>
                <p><span className="font-medium">Reason:</span> {executeReq.reason}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setExecuteReq(null)}>Cancel</Button>
            <Button onClick={handleExecute} disabled={executing}>
              {executing && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Confirm & Execute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
