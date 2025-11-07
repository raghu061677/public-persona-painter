import { useState, useEffect } from "react";
import SidebarLayout from "@/layouts/SidebarLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Save, Settings } from "lucide-react";

export default function ApprovalSettings() {
  const [approvalSettings, setApprovalSettings] = useState<any[]>([]);
  const [reminderSettings, setReminderSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data: approvals } = await supabase
      .from("approval_settings")
      .select("*")
      .order("min_amount");

    const { data: reminders } = await supabase
      .from("reminder_settings")
      .select("*");

    setApprovalSettings(approvals || []);
    setReminderSettings(reminders || []);
  };

  const saveApprovalSetting = async (setting: any) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("approval_settings")
        .upsert(setting);

      if (error) throw error;
      toast.success("Approval setting saved");
      loadSettings();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const saveReminderSetting = async (setting: any) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("reminder_settings")
        .upsert(setting);

      if (error) throw error;
      toast.success("Reminder setting saved");
      loadSettings();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteApprovalSetting = async (id: string) => {
    if (!confirm("Are you sure you want to delete this approval setting?")) return;

    const { error } = await supabase
      .from("approval_settings")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Approval setting deleted");
      loadSettings();
    }
  };

  return (
    <SidebarLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Approval & Reminder Settings</h1>
            <p className="text-muted-foreground">
              Configure approval workflows and automated reminders
            </p>
          </div>
          <Settings className="h-8 w-8 text-muted-foreground" />
        </div>

        {/* Approval Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Approval Workflow Settings</CardTitle>
            <CardDescription>
              Configure multi-level approval requirements based on plan type and amount
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {approvalSettings.map((setting) => (
              <div key={setting.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Plan Type</Label>
                        <Select
                          value={setting.plan_type}
                          onValueChange={(value) => {
                            const updated = { ...setting, plan_type: value };
                            saveApprovalSetting(updated);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Quotation">Quotation</SelectItem>
                            <SelectItem value="Proposal">Proposal</SelectItem>
                            <SelectItem value="Estimate">Estimate</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Min Amount</Label>
                        <Input
                          type="number"
                          value={setting.min_amount}
                          onChange={(e) => {
                            const updated = { ...setting, min_amount: parseFloat(e.target.value) };
                            saveApprovalSetting(updated);
                          }}
                        />
                      </div>
                      <div>
                        <Label>Max Amount</Label>
                        <Input
                          type="number"
                          value={setting.max_amount || ""}
                          placeholder="No limit"
                          onChange={(e) => {
                            const updated = { ...setting, max_amount: e.target.value ? parseFloat(e.target.value) : null };
                            saveApprovalSetting(updated);
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={setting.is_active}
                        onCheckedChange={(checked) => {
                          const updated = { ...setting, is_active: checked };
                          saveApprovalSetting(updated);
                        }}
                      />
                      <Label>Active</Label>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Approval Levels: {JSON.stringify(setting.approval_levels)}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteApprovalSetting(setting.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Reminder Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Automated Reminder Settings</CardTitle>
            <CardDescription>
              Configure when to send automatic email reminders
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {reminderSettings.map((setting) => (
              <div key={setting.id} className="border rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Reminder Type</Label>
                    <Input value={setting.reminder_type} disabled />
                  </div>
                  <div>
                    <Label>Days Before/After</Label>
                    <Input
                      type="number"
                      value={setting.days_before}
                      onChange={(e) => {
                        const updated = { ...setting, days_before: parseInt(e.target.value) };
                        saveReminderSetting(updated);
                      }}
                    />
                  </div>
                </div>
                <div>
                  <Label>Email Template</Label>
                  <Textarea
                    value={setting.email_template}
                    onChange={(e) => {
                      const updated = { ...setting, email_template: e.target.value };
                      setReminderSettings(prev =>
                        prev.map(s => s.id === setting.id ? updated : s)
                      );
                    }}
                    onBlur={() => saveReminderSetting(setting)}
                    placeholder="Use {{plan_name}}, {{plan_id}}, {{client_name}}, {{days}} as placeholders"
                    className="min-h-[80px]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={setting.is_active}
                    onCheckedChange={(checked) => {
                      const updated = { ...setting, is_active: checked };
                      saveReminderSetting(updated);
                    }}
                  />
                  <Label>Active</Label>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>Note:</strong> Reminder emails are sent automatically based on the configured schedules.</p>
              <p>• <strong>Pending Approval:</strong> Reminds approvers about plans waiting for their review.</p>
              <p>• <strong>Expiring Quotation:</strong> Alerts about quotations nearing their expiration date.</p>
              <p>• Template placeholders: Use <code>{'{{plan_name}}'}</code>, <code>{'{{plan_id}}'}</code>, <code>{'{{client_name}}'}</code>, <code>{'{{days}}'}</code></p>
            </div>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
