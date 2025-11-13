import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, MessageCircle, Upload, CheckCircle } from "lucide-react";

interface NotificationSettingsProps {
  campaignId: string;
}

export function NotificationSettings({ campaignId }: NotificationSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    email_notifications: true,
    whatsapp_notifications: true,
    notify_on_upload: true,
    notify_on_verification: true,
  });

  useEffect(() => {
    fetchSettings();
  }, [campaignId]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('campaigns')
        .select('notification_settings')
        .eq('id', campaignId)
        .single();

      if (error) throw error;

      if (data?.notification_settings) {
        const dbSettings = data.notification_settings as any;
        setSettings({
          email_notifications: dbSettings.email_notifications ?? true,
          whatsapp_notifications: dbSettings.whatsapp_notifications ?? true,
          notify_on_upload: dbSettings.notify_on_upload ?? true,
          notify_on_verification: dbSettings.notify_on_verification ?? true,
        });
      }
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      toast({
        title: "Error",
        description: "Failed to load notification settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('campaigns')
        .update({ notification_settings: settings })
        .eq('id', campaignId);

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "Notification preferences updated successfully",
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save notification settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof typeof settings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Loading settings...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Settings</CardTitle>
        <CardDescription>
          Configure when and how clients receive proof upload notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Notifications */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="email-notifications" className="cursor-pointer">
                Email Notifications
              </Label>
            </div>
            <Switch
              id="email-notifications"
              checked={settings.email_notifications}
              onCheckedChange={(checked) => updateSetting('email_notifications', checked)}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Send email notifications to client when photos are uploaded or verified
          </p>
        </div>

        {/* WhatsApp Notifications */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="whatsapp-notifications" className="cursor-pointer">
                WhatsApp Notifications
              </Label>
            </div>
            <Switch
              id="whatsapp-notifications"
              checked={settings.whatsapp_notifications}
              onCheckedChange={(checked) => updateSetting('whatsapp_notifications', checked)}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Send WhatsApp messages to client (requires WhatsApp Business API setup)
          </p>
        </div>

        <div className="border-t pt-6 space-y-4">
          <h4 className="font-medium text-sm">Notification Triggers</h4>

          {/* Upload Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="notify-upload" className="cursor-pointer">
                Notify on Photo Upload
              </Label>
            </div>
            <Switch
              id="notify-upload"
              checked={settings.notify_on_upload}
              onCheckedChange={(checked) => updateSetting('notify_on_upload', checked)}
            />
          </div>

          {/* Verification Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="notify-verification" className="cursor-pointer">
                Notify on Photo Verification
              </Label>
            </div>
            <Switch
              id="notify-verification"
              checked={settings.notify_on_verification}
              onCheckedChange={(checked) => updateSetting('notify_on_verification', checked)}
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
