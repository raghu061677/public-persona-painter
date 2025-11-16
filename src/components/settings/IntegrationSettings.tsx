import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MessageSquare, Mail, Phone, DollarSign, FileText, CheckCircle2, XCircle } from "lucide-react";

const integrations = [
  {
    id: "whatsapp",
    name: "WhatsApp Cloud API",
    description: "Capture leads and send campaign proofs via WhatsApp",
    icon: MessageSquare,
    status: "disconnected",
    features: ["Lead capture", "Proof sharing", "Status updates"],
  },
  {
    id: "gmail",
    name: "Gmail API",
    description: "Parse incoming leads from email inquiries",
    icon: Mail,
    status: "disconnected",
    features: ["Email parsing", "Auto lead creation", "Attachment handling"],
  },
  {
    id: "zoho_crm",
    name: "Zoho CRM",
    description: "Sync leads, clients, and opportunities with Zoho CRM",
    icon: FileText,
    status: "disconnected",
    features: ["Bi-directional sync", "Lead scoring", "Activity tracking"],
  },
  {
    id: "zoho_books",
    name: "Zoho Books",
    description: "Sync invoices, expenses, and payment data",
    icon: DollarSign,
    status: "disconnected",
    features: ["Invoice sync", "Payment tracking", "Expense management"],
  },
  {
    id: "razorpay",
    name: "Razorpay",
    description: "Accept online payments for invoices and subscriptions",
    icon: DollarSign,
    status: "disconnected",
    features: ["Payment gateway", "Subscription billing", "Payment links"],
  },
];

export function IntegrationSettings() {
  return (
    <div className="space-y-6">
      {integrations.map((integration) => (
        <Card key={integration.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <integration.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    {integration.name}
                    {integration.status === "connected" ? (
                      <Badge className="bg-green-500">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <XCircle className="mr-1 h-3 w-3" />
                        Not Connected
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>{integration.description}</CardDescription>
                </div>
              </div>
              <Button variant={integration.status === "connected" ? "outline" : "default"}>
                {integration.status === "connected" ? "Configure" : "Connect"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Features</h4>
                <div className="flex flex-wrap gap-2">
                  {integration.features.map((feature) => (
                    <Badge key={feature} variant="outline">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>

              {integration.status === "connected" && (
                <div className="pt-4 border-t space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable auto-sync</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically sync data every hour
                      </p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Send notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified on sync events
                      </p>
                    </div>
                    <Switch />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
