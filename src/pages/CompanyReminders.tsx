import { useState, useEffect } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Loader2 } from "lucide-react";
import { SettingsCard, SettingsContentWrapper, SectionHeader, InputRow, InfoAlert } from "@/components/settings/zoho-style";

export default function CompanyReminders() {
  const { company } = useCompany();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    invoice_reminders_enabled: true,
    invoice_reminder_days_before: 3,
    invoice_reminder_days_after: 7,
    payment_reminders_enabled: true,
    payment_reminder_frequency: "weekly",
    campaign_deadline_reminders: true,
    campaign_reminder_days: 5,
    power_bill_reminders: true,
    power_bill_reminder_days: 5,
    operations_reminders: true,
    operations_reminder_hours: 24,
  });

  useEffect(() => {
    const loadSettings = async () => {
      if (!company) return;

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('notification_settings' as any)
          .select('*')
          .eq('company_id', company.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          const reminders = (data as any).reminders || {};
          setFormData({
            invoice_reminders_enabled: reminders.invoice_reminders_enabled !== false,
            invoice_reminder_days_before: reminders.invoice_reminder_days_before || 3,
            invoice_reminder_days_after: reminders.invoice_reminder_days_after || 7,
            payment_reminders_enabled: reminders.payment_reminders_enabled !== false,
            payment_reminder_frequency: reminders.payment_reminder_frequency || "weekly",
            campaign_deadline_reminders: reminders.campaign_deadline_reminders !== false,
            campaign_reminder_days: reminders.campaign_reminder_days || 5,
            power_bill_reminders: reminders.power_bill_reminders !== false,
            power_bill_reminder_days: reminders.power_bill_reminder_days || 5,
            operations_reminders: reminders.operations_reminders !== false,
            operations_reminder_hours: reminders.operations_reminder_hours || 24,
          });
        }
      } catch (error: any) {
        console.error("Error loading reminder settings:", error);
        toast({
          title: "Failed to load settings",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [company, toast]);

  const handleSave = async () => {
    if (!company) return;

    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from('notification_settings' as any)
        .select('id')
        .eq('company_id', company.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('notification_settings' as any)
          .update({
            reminders: formData,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('company_id', company.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('notification_settings' as any)
          .insert({
            company_id: company.id,
            reminders: formData,
          } as any);

        if (error) throw error;
      }

      toast({
        title: "Reminder settings updated",
        description: "Your reminder preferences have been saved successfully",
      });
    } catch (error: any) {
      console.error("Error updating reminders:", error);
      toast({
        title: "Failed to update settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && formData.invoice_reminder_days_before === 3 && formData.invoice_reminder_days_after === 7) {
    return (
      <SettingsContentWrapper>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SettingsContentWrapper>
    );
  }

  return (
    <SettingsContentWrapper>
      <SectionHeader
        title="Reminders"
        description="Configure automatic reminders for invoices, payments, and operations"
      />

      <InfoAlert variant="info">
        Reminders will be sent via email and in-app notifications based on your settings below.
      </InfoAlert>

      <SettingsCard
        title="Invoice Reminders"
        description="Automatic reminders for unpaid invoices"
      >
        <InputRow label="Enable Invoice Reminders" description="Send reminders for pending invoices">
          <Switch
            checked={formData.invoice_reminders_enabled}
            onCheckedChange={(checked) => setFormData({ ...formData, invoice_reminders_enabled: checked })}
          />
        </InputRow>

        {formData.invoice_reminders_enabled && (
          <>
            <InputRow 
              label="Reminder Before Due Date" 
              description="Send reminder X days before invoice due date"
            >
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="30"
                  value={formData.invoice_reminder_days_before}
                  onChange={(e) => setFormData({ ...formData, invoice_reminder_days_before: parseInt(e.target.value) || 3 })}
                  className="max-w-[120px]"
                />
                <span className="text-muted-foreground">days</span>
              </div>
            </InputRow>

            <InputRow 
              label="Reminder After Due Date" 
              description="Send reminder X days after invoice is overdue"
            >
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="30"
                  value={formData.invoice_reminder_days_after}
                  onChange={(e) => setFormData({ ...formData, invoice_reminder_days_after: parseInt(e.target.value) || 7 })}
                  className="max-w-[120px]"
                />
                <span className="text-muted-foreground">days</span>
              </div>
            </InputRow>
          </>
        )}
      </SettingsCard>

      <SettingsCard
        title="Payment Reminders"
        description="Follow-up reminders for pending payments"
      >
        <InputRow label="Enable Payment Reminders" description="Send regular payment follow-ups">
          <Switch
            checked={formData.payment_reminders_enabled}
            onCheckedChange={(checked) => setFormData({ ...formData, payment_reminders_enabled: checked })}
          />
        </InputRow>

        {formData.payment_reminders_enabled && (
          <InputRow label="Reminder Frequency" description="How often to send payment reminders">
            <Select
              value={formData.payment_reminder_frequency}
              onValueChange={(value) => setFormData({ ...formData, payment_reminder_frequency: value })}
            >
              <SelectTrigger className="max-w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Bi-weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </InputRow>
        )}
      </SettingsCard>

      <SettingsCard
        title="Campaign Reminders"
        description="Reminders for campaign deadlines and installations"
      >
        <InputRow label="Campaign Deadline Reminders" description="Notify before campaign start/end dates">
          <Switch
            checked={formData.campaign_deadline_reminders}
            onCheckedChange={(checked) => setFormData({ ...formData, campaign_deadline_reminders: checked })}
          />
        </InputRow>

        {formData.campaign_deadline_reminders && (
          <InputRow label="Reminder Days" description="Send reminder X days before deadline">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                max="30"
                value={formData.campaign_reminder_days}
                onChange={(e) => setFormData({ ...formData, campaign_reminder_days: parseInt(e.target.value) || 5 })}
                className="max-w-[120px]"
              />
              <span className="text-muted-foreground">days</span>
            </div>
          </InputRow>
        )}
      </SettingsCard>

      <SettingsCard
        title="Power Bill Reminders"
        description="Reminders for electricity bill due dates"
      >
        <InputRow label="Power Bill Reminders" description="Notify before bill due dates">
          <Switch
            checked={formData.power_bill_reminders}
            onCheckedChange={(checked) => setFormData({ ...formData, power_bill_reminders: checked })}
          />
        </InputRow>

        {formData.power_bill_reminders && (
          <InputRow label="Reminder Days" description="Send reminder X days before due date">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                max="15"
                value={formData.power_bill_reminder_days}
                onChange={(e) => setFormData({ ...formData, power_bill_reminder_days: parseInt(e.target.value) || 5 })}
                className="max-w-[120px]"
              />
              <span className="text-muted-foreground">days</span>
            </div>
          </InputRow>
        )}
      </SettingsCard>

      <SettingsCard
        title="Operations Reminders"
        description="Reminders for pending installations and proof uploads"
      >
        <InputRow label="Operations Reminders" description="Notify operations team about pending tasks">
          <Switch
            checked={formData.operations_reminders}
            onCheckedChange={(checked) => setFormData({ ...formData, operations_reminders: checked })}
          />
        </InputRow>

        {formData.operations_reminders && (
          <InputRow label="Reminder Interval" description="Send reminder after X hours of inactivity">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                max="72"
                value={formData.operations_reminder_hours}
                onChange={(e) => setFormData({ ...formData, operations_reminder_hours: parseInt(e.target.value) || 24 })}
                className="max-w-[120px]"
              />
              <span className="text-muted-foreground">hours</span>
            </div>
          </InputRow>
        )}
      </SettingsCard>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </SettingsContentWrapper>
  );
}
