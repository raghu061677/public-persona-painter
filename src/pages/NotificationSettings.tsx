import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NotificationSettings as NotificationSettingsComponent } from "@/components/settings/NotificationSettings";
import { Bell, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function NotificationSettings() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Bell className="h-8 w-8" />
          Notification Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure your notification preferences and alert settings
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Customize how and when you receive notifications about campaigns, invoices, and system updates.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>
            Manage your alert settings for different types of notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NotificationSettingsComponent />
        </CardContent>
      </Card>
    </div>
  );
}
