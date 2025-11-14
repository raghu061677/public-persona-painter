import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { SettingsCard, SectionHeader, InfoAlert, InputRow } from "@/components/settings/zoho-style";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Workflow, Plus, Play } from "lucide-react";

const WORKFLOWS = [
  {
    id: "1",
    name: "Auto-approve Small Plans",
    description: "Automatically approve plans under ₹50,000",
    trigger: "Plan Created",
    enabled: true,
    runs: 45
  },
  {
    id: "2",
    name: "Campaign Start Notification",
    description: "Send notifications when campaign starts",
    trigger: "Campaign Status Changed",
    enabled: true,
    runs: 128
  },
  {
    id: "3",
    name: "Invoice Overdue Reminder",
    description: "Send reminders for overdue invoices",
    trigger: "Scheduled Daily",
    enabled: true,
    runs: 1205
  },
  {
    id: "4",
    name: "Client Portal Auto-Invite",
    description: "Automatically invite clients to portal",
    trigger: "Client Created",
    enabled: false,
    runs: 32
  }
];

export default function CompanyWorkflows() {
  const { toast } = useToast();
  const [workflows, setWorkflows] = useState(WORKFLOWS);

  const handleToggle = (id: string) => {
    setWorkflows(workflows.map(w => 
      w.id === id ? { ...w, enabled: !w.enabled } : w
    ));
    toast({
      title: "Workflow Updated",
      description: "Workflow status has been changed.",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Workflows</h1>
        <p className="text-sm text-muted-foreground">
          Automate repetitive tasks with custom workflows
        </p>
      </div>

      <InfoAlert>
        <strong>Automation Power:</strong> Set up workflows to automate actions based on triggers like status changes, time schedules, or custom conditions.
      </InfoAlert>

      <SettingsCard>
        <SectionHeader
          title="Active Workflows"
          description="Manage your automation workflows"
          action={
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Workflow
            </Button>
          }
        />

        <div className="space-y-3">
          {workflows.map((workflow) => (
            <div
              key={workflow.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-medium">{workflow.name}</h3>
                  {workflow.enabled ? (
                    <Badge className="bg-green-500">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Disabled</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-2">{workflow.description}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Workflow className="h-3 w-3" />
                    Trigger: {workflow.trigger}
                  </span>
                  <span className="flex items-center gap-1">
                    <Play className="h-3 w-3" />
                    Runs: {workflow.runs}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={workflow.enabled}
                  onCheckedChange={() => handleToggle(workflow.id)}
                />
                <Button variant="outline" size="sm">
                  Edit
                </Button>
              </div>
            </div>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard>
        <SectionHeader
          title="Workflow Templates"
          description="Quick-start workflows for common tasks"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { name: "Lead Follow-up", description: "Auto-follow up on new leads after 24 hours" },
            { name: "Payment Reminder", description: "Send reminder before invoice due date" },
            { name: "Proof Review Alert", description: "Notify when proof is uploaded" },
            { name: "Monthly Report", description: "Generate and email monthly reports" }
          ].map((template, i) => (
            <div
              key={i}
              className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <h3 className="font-medium mb-1">{template.name}</h3>
              <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
              <Button variant="outline" size="sm" className="w-full">
                Use Template
              </Button>
            </div>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard>
        <SectionHeader
          title="Workflow Settings"
          description="Configure workflow behavior"
        />

        <InputRow label="Enable Workflows" description="Master switch for all workflows">
          <Switch defaultChecked />
        </InputRow>

        <InputRow label="Workflow Execution Logs" description="Keep logs of workflow runs">
          <Switch defaultChecked />
        </InputRow>

        <InputRow label="Error Notifications" description="Notify admins when workflows fail">
          <Switch defaultChecked />
        </InputRow>
      </SettingsCard>
    </div>
  );
}
