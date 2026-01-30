import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Bell, Mail, MessageSquare, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface ReminderSettings {
  id: string;
  company_id: string;
  enabled: boolean;
  whatsapp_enabled: boolean;
  email_enabled: boolean;
  buckets_enabled: number[];
  last_run_at: string | null;
}

const AGING_BUCKETS = [
  { value: 7, label: '7 days overdue' },
  { value: 15, label: '15 days overdue' },
  { value: 30, label: '30 days overdue' },
  { value: 45, label: '45+ days overdue' },
];

export function AutoReminderSettings({ companyId }: { companyId: string }) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('auto_reminder_settings')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data);
      } else {
        // Create default settings
        const { data: newSettings, error: insertError } = await supabase
          .from('auto_reminder_settings')
          .insert({
            company_id: companyId,
            enabled: false,
            whatsapp_enabled: true,
            email_enabled: true,
            buckets_enabled: [7, 15, 30, 45],
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setSettings(newSettings);
      }
    } catch (error) {
      console.error('Error fetching reminder settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchSettings();
    }
  }, [companyId]);

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('auto_reminder_settings')
        .update({
          enabled: settings.enabled,
          whatsapp_enabled: settings.whatsapp_enabled,
          email_enabled: settings.email_enabled,
          buckets_enabled: settings.buckets_enabled,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settings.id);

      if (error) throw error;

      toast({
        title: 'Settings Saved',
        description: 'Auto-reminder settings updated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunNow = async () => {
    setIsRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-invoice-reminders', {
        body: { company_id: companyId },
      });

      if (error) throw error;

      toast({
        title: 'Reminders Sent',
        description: `${data.reminders_sent || 0} reminders processed`,
      });

      fetchSettings();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to run reminders',
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const toggleBucket = (bucket: number) => {
    if (!settings) return;
    const current = settings.buckets_enabled || [];
    const updated = current.includes(bucket)
      ? current.filter((b) => b !== bucket)
      : [...current, bucket].sort((a, b) => a - b);
    setSettings({ ...settings, buckets_enabled: updated });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!settings) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Auto Payment Reminders
        </CardTitle>
        <CardDescription>
          Automatically send reminders for overdue invoices based on aging buckets
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Master Toggle */}
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
          <div className="space-y-1">
            <Label className="text-base font-medium">Enable Auto Reminders</Label>
            <p className="text-sm text-muted-foreground">
              Turn on to automatically send payment reminders
            </p>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
          />
        </div>

        {settings.enabled && (
          <>
            {/* Channel Toggles */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Reminder Channels</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <MessageSquare className="h-5 w-5 text-green-600" />
                  <div className="flex-1">
                    <Label>WhatsApp</Label>
                    <p className="text-xs text-muted-foreground">Primary channel</p>
                  </div>
                  <Switch
                    checked={settings.whatsapp_enabled}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, whatsapp_enabled: checked })
                    }
                  />
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <div className="flex-1">
                    <Label>Email</Label>
                    <p className="text-xs text-muted-foreground">At 15+ days</p>
                  </div>
                  <Switch
                    checked={settings.email_enabled}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, email_enabled: checked })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Aging Buckets */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Aging Buckets</Label>
              <div className="grid grid-cols-2 gap-2">
                {AGING_BUCKETS.map((bucket) => (
                  <div
                    key={bucket.value}
                    className="flex items-center gap-2 p-2 border rounded hover:bg-muted/30"
                  >
                    <Checkbox
                      checked={settings.buckets_enabled?.includes(bucket.value)}
                      onCheckedChange={() => toggleBucket(bucket.value)}
                    />
                    <Label className="text-sm cursor-pointer">{bucket.label}</Label>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Last Run Info */}
        {settings.last_run_at && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Last run: {format(new Date(settings.last_run_at), 'dd MMM yyyy, hh:mm a')}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
          {settings.enabled && (
            <Button variant="outline" onClick={handleRunNow} disabled={isRunning}>
              {isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Run Now
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
