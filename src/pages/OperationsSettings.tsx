import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, MapPin, CheckCircle, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function OperationsSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [gpsTolerance, setGpsTolerance] = useState(100);
  const [requireApproval, setRequireApproval] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('organization_settings')
        .select('*')
        .single();

      if (error) throw error;

      if (data) {
        setSettings(data);
        setGpsTolerance(data.gps_tolerance_meters || 100);
        setRequireApproval(data.require_proof_approval ?? true);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    if (gpsTolerance < 10 || gpsTolerance > 1000) {
      toast({
        title: "Invalid Value",
        description: "GPS tolerance must be between 10 and 1000 meters",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('organization_settings')
        .update({
          gps_tolerance_meters: gpsTolerance,
          require_proof_approval: requireApproval,
        })
        .eq('id', settings.id);

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "Operations settings updated successfully",
      });
      
      loadSettings();
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/settings')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Settings
        </Button>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Operations Settings</h1>
            <p className="text-muted-foreground mt-2">
              Configure GPS validation and proof approval workflow
            </p>
          </div>

          {/* GPS Tolerance Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <CardTitle>GPS Tolerance</CardTitle>
              </div>
              <CardDescription>
                Maximum allowed distance from asset location for geo-tagged photos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gps-tolerance">Tolerance Radius (meters)</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="gps-tolerance"
                    type="number"
                    min="10"
                    max="1000"
                    value={gpsTolerance}
                    onChange={(e) => setGpsTolerance(parseInt(e.target.value) || 100)}
                    className="max-w-32"
                  />
                  <Badge variant="secondary">{gpsTolerance}m</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Field staff must be within this distance to upload geo-tagged photos
                </p>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium">Recommended Values:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>50m:</strong> Strict validation (urban areas)</li>
                  <li>• <strong>100m:</strong> Standard (default, most cases)</li>
                  <li>• <strong>200m:</strong> Relaxed (rural areas, GPS accuracy issues)</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Proof Approval Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                <CardTitle>Proof Approval Workflow</CardTitle>
              </div>
              <CardDescription>
                Require manager approval before marking assets as verified
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="require-approval" className="text-base">
                    Require Approval
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    When enabled, uploaded photos must be reviewed and approved by operations manager
                  </p>
                </div>
                <Switch
                  id="require-approval"
                  checked={requireApproval}
                  onCheckedChange={setRequireApproval}
                />
              </div>

              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium">
                  {requireApproval ? "Approval Workflow Enabled" : "Direct Verification Enabled"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {requireApproval 
                    ? "Photos will be marked as 'PhotoUploaded' and require manager approval to change status to 'Verified'"
                    : "Photos will be automatically marked as 'Verified' after all 4 photos are uploaded"
                  }
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end gap-2 sticky bottom-0 bg-background py-4 border-t">
            <Button
              variant="outline"
              onClick={() => navigate('/settings')}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
