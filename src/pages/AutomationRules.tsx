import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/hooks/use-toast";
import { SectionHeader } from "@/components/ui/section-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Zap, History, PlayCircle, PauseCircle, Settings2 } from "lucide-react";
import { format } from "date-fns";
import type { Json } from "@/integrations/supabase/types";

const TRIGGER_EVENTS = [
  { group: "Plans", events: [
    { value: "plan_created", label: "Plan Created" },
    { value: "plan_submitted", label: "Plan Submitted" },
    { value: "plan_approved", label: "Plan Approved" },
    { value: "plan_rejected", label: "Plan Rejected" },
    { value: "plan_converted_campaign", label: "Plan Converted to Campaign" },
  ]},
  { group: "Campaigns", events: [
    { value: "campaign_created", label: "Campaign Created" },
    { value: "campaign_started", label: "Campaign Started" },
    { value: "campaign_ending", label: "Campaign Ending Soon" },
    { value: "campaign_completed", label: "Campaign Completed" },
  ]},
  { group: "Operations", events: [
    { value: "mounting_assigned", label: "Mounting Assigned" },
    { value: "mounting_completed", label: "Mounting Completed" },
    { value: "proof_uploaded", label: "Proof Uploaded" },
    { value: "proof_verified", label: "Proof Verified" },
  ]},
  { group: "Finance", events: [
    { value: "invoice_created", label: "Invoice Created" },
    { value: "payment_received", label: "Payment Received" },
    { value: "payment_overdue", label: "Payment Overdue" },
  ]},
];

const ACTION_TYPES = [
  { value: "send_email", label: "Send Email", icon: "📧" },
  { value: "create_task", label: "Create Task", icon: "📋" },
  { value: "notify_user", label: "Notify User", icon: "🔔" },
  { value: "send_client_notification", label: "Send Client Notification", icon: "📤" },
];

interface ActionConfig {
  type: string;
  config: Record<string, string>;
}

export default function AutomationRules() {
  const { company } = useCompany();
  const { toast } = useToast();
  const [rules, setRules] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState("rules");

  const [ruleName, setRuleName] = useState("");
  const [triggerEvent, setTriggerEvent] = useState("");
  const [actions, setActions] = useState<ActionConfig[]>([]);

  useEffect(() => {
    if (company?.id) {
      fetchRules();
      fetchLogs();
    }
  }, [company?.id]);

  const fetchRules = async () => {
    if (!company?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("automation_rules")
      .select("*")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false });
    if (!error && data) setRules(data);
    setLoading(false);
  };

  const fetchLogs = async () => {
    if (!company?.id) return;
    const { data } = await supabase
      .from("automation_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setLogs(data);
  };

  const openNewRule = () => {
    setEditingRule(null);
    setRuleName("");
    setTriggerEvent("");
    setActions([]);
    setShowDialog(true);
  };

  const openEditRule = (rule: any) => {
    setEditingRule(rule);
    setRuleName(rule.rule_name);
    setTriggerEvent(rule.trigger_event);
    const ruleActions = Array.isArray(rule.actions) ? rule.actions : [];
    setActions(ruleActions.map((a: any) => ({ type: a.type || "notify_user", config: a.config || {} })));
    setShowDialog(true);
  };

  const addAction = () => {
    setActions([...actions, { type: "notify_user", config: { title: "", message: "" } }]);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const updateAction = (index: number, field: string, value: string) => {
    const updated = [...actions];
    if (field === "type") {
      updated[index] = { type: value, config: updated[index].config };
    } else {
      updated[index] = { ...updated[index], config: { ...updated[index].config, [field]: value } };
    }
    setActions(updated);
  };

  const saveRule = async () => {
    if (!company?.id || !ruleName || !triggerEvent) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }

    const payload = {
      company_id: company.id,
      rule_name: ruleName,
      trigger_event: triggerEvent,
      conditions: {} as Json,
      actions: actions as unknown as Json,
      is_active: true,
    };

    let error;
    if (editingRule) {
      ({ error } = await supabase.from("automation_rules").update(payload).eq("id", editingRule.id));
    } else {
      ({ error } = await supabase.from("automation_rules").insert(payload));
    }

    if (error) {
      toast({ title: "Error saving rule", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingRule ? "Rule updated" : "Rule created" });
      setShowDialog(false);
      fetchRules();
    }
  };

  const toggleRule = async (rule: any) => {
    const { error } = await supabase
      .from("automation_rules")
      .update({ is_active: !rule.is_active })
      .eq("id", rule.id);
    if (!error) {
      fetchRules();
      toast({ title: `Rule ${rule.is_active ? "disabled" : "enabled"}` });
    }
  };

  const deleteRule = async (id: string) => {
    const { error } = await supabase.from("automation_rules").delete().eq("id", id);
    if (!error) { fetchRules(); toast({ title: "Rule deleted" }); }
  };

  const getTriggerLabel = (event: string) => {
    for (const group of TRIGGER_EVENTS) {
      const found = group.events.find(e => e.value === event);
      if (found) return found.label;
    }
    return event;
  };

  const getRuleActions = (rule: any): ActionConfig[] => {
    return Array.isArray(rule.actions) ? rule.actions : [];
  };

  return (
    <div className="space-y-6 p-6">
      <SectionHeader
        title="Automation Rules"
        description="Create workflow automation rules triggered by business events"
        actions={<Button onClick={openNewRule}><Plus className="h-4 w-4 mr-2" /> New Rule</Button>}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="rules"><Settings2 className="h-4 w-4 mr-2" /> Rules ({rules.length})</TabsTrigger>
          <TabsTrigger value="logs"><History className="h-4 w-4 mr-2" /> Execution Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          {loading ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Loading...</CardContent></Card>
          ) : rules.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Zap className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">No automation rules yet</h3>
                <p className="text-muted-foreground mb-4">Create your first rule to automate business workflows</p>
                <Button onClick={openNewRule}><Plus className="h-4 w-4 mr-2" /> Create Rule</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {rules.map((rule) => (
                <Card key={rule.id} className={!rule.is_active ? "opacity-60" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {rule.is_active ? <PlayCircle className="h-5 w-5 text-emerald-500" /> : <PauseCircle className="h-5 w-5 text-muted-foreground" />}
                          <div>
                            <h4 className="font-medium">{rule.rule_name}</h4>
                            <p className="text-sm text-muted-foreground">
                              When: <Badge variant="secondary">{getTriggerLabel(rule.trigger_event)}</Badge>
                              {" → "}
                              {getRuleActions(rule).map((a: ActionConfig, i: number) => (
                                <Badge key={i} variant="outline" className="ml-1">
                                  {ACTION_TYPES.find(t => t.value === a.type)?.label || a.type}
                                </Badge>
                              ))}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={rule.is_active} onCheckedChange={() => toggleRule(rule)} />
                        <Button variant="ghost" size="sm" onClick={() => openEditRule(rule)}>Edit</Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteRule(rule.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Execution Time</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No automation logs yet</TableCell></TableRow>
                  ) : logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">{format(new Date(log.created_at), "MMM dd, HH:mm:ss")}</TableCell>
                      <TableCell><span className="text-sm">{log.entity_type}/{log.entity_id}</span></TableCell>
                      <TableCell>
                        <Badge variant={log.status === "success" ? "default" : log.status === "skipped" ? "secondary" : "destructive"}>
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{log.execution_time ? `${log.execution_time}ms` : "-"}</TableCell>
                      <TableCell className="text-sm text-destructive max-w-[200px] truncate">{log.error_message || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingRule ? "Edit Rule" : "Create Automation Rule"}</DialogTitle></DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Rule Name *</Label>
              <Input value={ruleName} onChange={(e) => setRuleName(e.target.value)} placeholder="e.g., Notify on plan approval" />
            </div>
            <div className="space-y-2">
              <Label>Trigger Event *</Label>
              <Select value={triggerEvent} onValueChange={setTriggerEvent}>
                <SelectTrigger><SelectValue placeholder="Select trigger event" /></SelectTrigger>
                <SelectContent>
                  {TRIGGER_EVENTS.map((group) => (
                    <div key={group.group}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{group.group}</div>
                      {group.events.map((event) => (
                        <SelectItem key={event.value} value={event.value}>{event.label}</SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Actions</Label>
                <Button variant="outline" size="sm" onClick={addAction}><Plus className="h-4 w-4 mr-1" /> Add Action</Button>
              </div>
              {actions.map((action, index) => (
                <Card key={index}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Select value={action.type} onValueChange={(v) => updateAction(index, "type", v)}>
                        <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ACTION_TYPES.map((at) => (<SelectItem key={at.value} value={at.value}>{at.icon} {at.label}</SelectItem>))}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="sm" onClick={() => removeAction(index)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    <div className="space-y-2">
                      <Input placeholder="Title / Subject" value={action.config.title || ""} onChange={(e) => updateAction(index, "title", e.target.value)} />
                      <Textarea placeholder="Message body (use {{variable}} for dynamic values)" value={action.config.message || ""} onChange={(e) => updateAction(index, "message", e.target.value)} rows={2} />
                      {action.type === "send_email" && (
                        <Input placeholder="Template key (e.g., plan_approved)" value={action.config.template_key || ""} onChange={(e) => updateAction(index, "template_key", e.target.value)} />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {actions.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Add at least one action to execute when the trigger fires</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={saveRule}>{editingRule ? "Update Rule" : "Create Rule"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
