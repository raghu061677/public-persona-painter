import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { SettingsCard, SectionHeader, InfoAlert, InputRow } from "@/components/settings/zoho-style";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Code2, Plus, Copy, Eye, EyeOff, Trash2 } from "lucide-react";

const API_KEYS = [
  { id: "1", name: "Production API", key: "pk_live_••••••••••••1234", created: "2024-01-15", lastUsed: "2 hours ago" },
  { id: "2", name: "Development API", key: "pk_test_••••••••••••5678", created: "2024-02-20", lastUsed: "5 days ago" },
];

const WEBHOOKS = [
  { id: "1", url: "https://api.example.com/webhooks/campaign", events: ["campaign.started", "campaign.completed"], status: "active" },
  { id: "2", url: "https://api.example.com/webhooks/invoice", events: ["invoice.created", "invoice.paid"], status: "active" },
];

export default function CompanyDeveloper() {
  const { toast } = useToast();
  const [showKey, setShowKey] = useState<string | null>(null);

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({
      title: "Copied!",
      description: "API key copied to clipboard",
    });
  };

  const handleGenerateKey = () => {
    toast({
      title: "API Key Generated",
      description: "New API key has been created. Make sure to copy it now as it won't be shown again.",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">API & Webhooks</h1>
        <p className="text-sm text-muted-foreground">
          Manage API access and webhook integrations
        </p>
      </div>

      <InfoAlert>
        <strong>Developer Access:</strong> Use our REST API to integrate Go-Ads with your custom applications. Full API documentation available at{" "}
        <a href="#" className="text-primary underline">docs.goads.com/api</a>
      </InfoAlert>

      <SettingsCard>
        <SectionHeader
          title="API Keys"
          description="Generate and manage API keys for programmatic access"
          action={
            <Button onClick={handleGenerateKey} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Generate Key
            </Button>
          }
        />

        <div className="space-y-3">
          {API_KEYS.map((apiKey) => (
            <div
              key={apiKey.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-medium">{apiKey.name}</h3>
                  <Badge variant="outline" className="text-xs">
                    {apiKey.key.startsWith("pk_live") ? "Production" : "Test"}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="font-mono">
                    {showKey === apiKey.id ? apiKey.key : apiKey.key.replace(/\d/g, "•")}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowKey(showKey === apiKey.id ? null : apiKey.id)}
                  >
                    {showKey === apiKey.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyKey(apiKey.key)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                  <span>Created: {apiKey.created}</span>
                  <span>Last used: {apiKey.lastUsed}</span>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard>
        <SectionHeader
          title="Webhooks"
          description="Configure webhook endpoints to receive real-time events"
          action={
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Webhook
            </Button>
          }
        />

        <div className="space-y-3">
          {WEBHOOKS.map((webhook) => (
            <div
              key={webhook.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                    {webhook.url}
                  </code>
                  <Badge className="bg-green-500">Active</Badge>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {webhook.events.map((event) => (
                    <Badge key={event} variant="outline" className="text-xs">
                      {event}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Test
                </Button>
                <Button variant="ghost" size="sm">
                  Edit
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard>
        <SectionHeader
          title="API Settings"
          description="Configure API behavior and limits"
        />

        <InputRow label="Rate Limiting" description="Maximum API calls per minute">
          <Input type="number" defaultValue="100" className="w-32" />
        </InputRow>

        <InputRow label="Enable CORS" description="Allow cross-origin requests">
          <Switch defaultChecked />
        </InputRow>

        <InputRow label="Allowed Origins" description="Whitelist domains for CORS">
          <Input placeholder="https://example.com, https://app.example.com" />
        </InputRow>

        <InputRow label="API Version" description="Default API version for requests">
          <select className="w-full h-9 rounded-md border border-input bg-background px-3">
            <option value="v2">v2 (Latest)</option>
            <option value="v1">v1 (Deprecated)</option>
          </select>
        </InputRow>
      </SettingsCard>
    </div>
  );
}
