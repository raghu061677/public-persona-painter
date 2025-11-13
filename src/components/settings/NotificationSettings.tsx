import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, BellOff, TestTube, Smartphone } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { Badge } from "@/components/ui/badge";

export const NotificationSettings = () => {
  const { 
    permission, 
    isSupported, 
    subscription, 
    requestPermission, 
    unsubscribe, 
    sendTestNotification 
  } = useNotifications();

  const getPermissionBadge = () => {
    switch (permission) {
      case "granted":
        return <Badge className="bg-green-500">Enabled</Badge>;
      case "denied":
        return <Badge variant="destructive">Denied</Badge>;
      default:
        return <Badge variant="secondary">Not Set</Badge>;
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="w-5 h-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Push notifications are not supported in your browser. Please use a modern browser like Chrome, Firefox, or Edge.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Get real-time updates about campaigns, approvals, and operations directly on your device.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label>Notification Status</Label>
            <p className="text-sm text-muted-foreground">
              {permission === "granted" 
                ? "Notifications are enabled and working" 
                : permission === "denied"
                ? "Notifications have been blocked. Please enable them in your browser settings."
                : "Enable notifications to receive real-time updates"}
            </p>
          </div>
          {getPermissionBadge()}
        </div>

        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="notifications-enabled">Enable Push Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Receive notifications for campaign updates, approvals, and operations
            </p>
          </div>
          <Switch
            id="notifications-enabled"
            checked={permission === "granted"}
            onCheckedChange={(checked) => {
              if (checked) {
                requestPermission();
              } else {
                unsubscribe();
              }
            }}
            disabled={permission === "denied"}
          />
        </div>

        {/* Subscription Status */}
        {subscription && (
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <div className="flex items-start gap-3">
              <Smartphone className="w-5 h-5 text-primary mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Device Registered</p>
                <p className="text-xs text-muted-foreground">
                  This device is registered to receive push notifications
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {permission === "granted" && (
            <Button 
              variant="outline" 
              onClick={sendTestNotification}
              className="gap-2"
            >
              <TestTube className="w-4 h-4" />
              Send Test Notification
            </Button>
          )}
          
          {permission === "default" && (
            <Button onClick={requestPermission} className="gap-2">
              <Bell className="w-4 h-4" />
              Enable Notifications
            </Button>
          )}
        </div>

        {/* Information */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20 p-4">
          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
            What you'll receive notifications for:
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Campaign approvals and status changes</li>
            <li>• New plan assignments and updates</li>
            <li>• Operations tasks and photo uploads</li>
            <li>• Invoice payments and financial updates</li>
            <li>• System alerts and reminders</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
