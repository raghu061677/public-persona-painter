import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Bell, TrendingUp, Clock, CheckCircle2 } from "lucide-react";

export function AlertThresholdSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  const [budgetThreshold, setBudgetThreshold] = useState(10);
  const [scheduleWarningDays, setScheduleWarningDays] = useState(7);
  const [scheduleCriticalDays, setScheduleCriticalDays] = useState(3);
  const [verificationLagThreshold, setVerificationLagThreshold] = useState(20);
  const [verificationWarningDays, setVerificationWarningDays] = useState(3);
  const [verificationCriticalDays, setVerificationCriticalDays] = useState(7);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("alert_settings")
        .select("*")
        .single();

      if (data) {
        setSettings(data);
        setBudgetThreshold(data.budget_variance_threshold || 10);
        setScheduleWarningDays(data.schedule_warning_days || 7);
        setScheduleCriticalDays(data.schedule_critical_days || 3);
        setVerificationLagThreshold(data.verification_lag_threshold || 20);
        setVerificationWarningDays(data.verification_delay_warning_days || 3);
        setVerificationCriticalDays(data.verification_delay_critical_days || 7);
      }
    } catch (error) {
      console.error("Error loading alert settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const payload = {
        budget_variance_threshold: budgetThreshold,
        schedule_warning_days: scheduleWarningDays,
        schedule_critical_days: scheduleCriticalDays,
        verification_lag_threshold: verificationLagThreshold,
        verification_delay_warning_days: verificationWarningDays,
        verification_delay_critical_days: verificationCriticalDays,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      };

      if (settings?.id) {
        // Update existing
        const { error } = await supabase
          .from("alert_settings")
          .update(payload)
          .eq("id", settings.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("alert_settings")
          .insert([payload]);

        if (error) throw error;
      }

      toast({
        title: "Settings saved",
        description: "Alert threshold settings have been updated successfully.",
      });

      await loadSettings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Loading settings...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <CardTitle>Campaign Alert Thresholds</CardTitle>
        </div>
        <CardDescription>
          Configure when health alerts are triggered for campaigns
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Budget Alerts */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-amber-600" />
            <h3 className="font-semibold">Budget Variance</h3>
          </div>
          <div className="space-y-2">
            <Label htmlFor="budgetThreshold">
              Warning Threshold (%)
            </Label>
            <Input
              id="budgetThreshold"
              type="number"
              min="0"
              max="100"
              value={budgetThreshold}
              onChange={(e) => setBudgetThreshold(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Alert when costs exceed budget by this percentage
            </p>
          </div>
        </div>

        {/* Schedule Alerts */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600" />
            <h3 className="font-semibold">Schedule Delays</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduleWarning">
                Warning (days before start)
              </Label>
              <Input
                id="scheduleWarning"
                type="number"
                min="1"
                value={scheduleWarningDays}
                onChange={(e) => setScheduleWarningDays(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scheduleCritical">
                Critical (days before start)
              </Label>
              <Input
                id="scheduleCritical"
                type="number"
                min="1"
                value={scheduleCriticalDays}
                onChange={(e) => setScheduleCriticalDays(Number(e.target.value))}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Alert when campaign starts soon and assets are not assigned/mounted
          </p>
        </div>

        {/* Verification Alerts */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <h3 className="font-semibold">Verification Delays</h3>
          </div>
          <div className="space-y-2">
            <Label htmlFor="verificationLag">
              Lag Threshold (%)
            </Label>
            <Input
              id="verificationLag"
              type="number"
              min="0"
              max="100"
              value={verificationLagThreshold}
              onChange={(e) => setVerificationLagThreshold(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Alert when verification rate falls behind campaign progress by this percentage
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="verificationWarning">
                Warning (days pending)
              </Label>
              <Input
                id="verificationWarning"
                type="number"
                min="1"
                value={verificationWarningDays}
                onChange={(e) => setVerificationWarningDays(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="verificationCritical">
                Critical (days pending)
              </Label>
              <Input
                id="verificationCritical"
                type="number"
                min="1"
                value={verificationCriticalDays}
                onChange={(e) => setVerificationCriticalDays(Number(e.target.value))}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Alert when photos have been uploaded but not verified for this many days
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
