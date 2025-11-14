import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { SettingsCard, SectionHeader, InfoAlert } from "@/components/settings/zoho-style";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, CheckCircle2, XCircle } from "lucide-react";

const INTEGRATIONS = [
  {
    id: "zoho_crm",
    name: "Zoho CRM",
    description: "Sync leads and clients with Zoho CRM",
    status: "not_connected",
    icon: "🔗",
    category: "CRM"
  },
  {
    id: "zoho_books",
    name: "Zoho Books",
    description: "Sync invoices and expenses with Zoho Books",
    status: "not_connected",
    icon: "📚",
    category: "Accounting"
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    description: "Send notifications and updates via WhatsApp",
    status: "not_connected",
    icon: "💬",
    category: "Communication"
  },
  {
    id: "google_drive",
    name: "Google Drive",
    description: "Backup and sync documents to Google Drive",
    status: "not_connected",
    icon: "📁",
    category: "Storage"
  },
  {
    id: "slack",
    name: "Slack",
    description: "Get notifications in your Slack workspace",
    status: "not_connected",
    icon: "💼",
    category: "Communication"
  },
  {
    id: "gmail",
    name: "Gmail",
    description: "Parse leads from email and send notifications",
    status: "not_connected",
    icon: "📧",
    category: "Email"
  }
];

export default function CompanyIntegrations() {
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState(INTEGRATIONS);

  const handleConnect = (id: string) => {
    toast({
      title: "Integration",
      description: "Integration setup will be available soon.",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Integrations</h1>
        <p className="text-sm text-muted-foreground">
          Connect Go-Ads with your favorite tools and services
        </p>
      </div>

      <InfoAlert>
        <strong>Powerful Integrations:</strong> Connect your existing business tools to automate workflows and sync data seamlessly.
      </InfoAlert>

      <SettingsCard>
        <SectionHeader
          title="Available Integrations"
          description="Connect third-party services to extend functionality"
        />

        <div className="space-y-3">
          {integrations.map((integration) => (
            <div
              key={integration.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">{integration.icon}</span>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-medium">{integration.name}</h3>
                    <Badge variant="outline" className="text-xs">
                      {integration.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{integration.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {integration.status === "connected" ? (
                      <Badge className="bg-green-500">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <XCircle className="h-3 w-3 mr-1" />
                        Not Connected
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={integration.status === "connected" ? "outline" : "default"}
                  size="sm"
                  onClick={() => handleConnect(integration.id)}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  {integration.status === "connected" ? "Configure" : "Connect"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard>
        <SectionHeader
          title="Integration Settings"
          description="Configure how integrations sync data"
        />

        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium mb-2">Data Sync Frequency</h3>
            <select className="w-full h-9 rounded-md border border-input bg-background px-3">
              <option value="realtime">Real-time (Recommended)</option>
              <option value="hourly">Every Hour</option>
              <option value="daily">Once Daily</option>
              <option value="manual">Manual Only</option>
            </select>
          </div>

          <div className="p-4 border rounded-lg">
            <h3 className="font-medium mb-2">Conflict Resolution</h3>
            <select className="w-full h-9 rounded-md border border-input bg-background px-3">
              <option value="latest">Use Latest Data</option>
              <option value="source">Prefer Source System</option>
              <option value="manual">Manual Review</option>
            </select>
          </div>
        </div>
      </SettingsCard>
    </div>
  );
}
