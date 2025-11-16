import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, PlayCircle, RotateCcw, Info, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";

interface DemoModeSettingsProps {
  companyId: string;
}

export function DemoModeSettings({ companyId }: DemoModeSettingsProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);

  const handleSeedDemoData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('seed-demo-data', {
        body: {
          companyId,
          userId: user.id
        }
      });

      if (error) throw error;

      toast({
        title: "Demo data created",
        description: `Successfully seeded ${data.data.clients} clients, ${data.data.assets} media assets, ${data.data.plans} plan, ${data.data.campaigns} campaign, and ${data.data.leads} leads`,
      });

      setDemoMode(true);
    } catch (error: any) {
      console.error('Error seeding demo data:', error);
      toast({
        title: "Error seeding demo data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClearDemoData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('clear-demo-data', {
        body: {
          companyId,
          userId: user.id
        }
      });

      if (error) throw error;

      toast({
        title: "Demo data cleared",
        description: `Removed ${data.deleted.clients} clients, ${data.deleted.assets} assets, ${data.deleted.plans} plans, ${data.deleted.campaigns} campaigns, and ${data.deleted.leads} leads`,
      });

      setDemoMode(false);
    } catch (error: any) {
      console.error('Error clearing demo data:', error);
      toast({
        title: "Error clearing demo data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5" />
            Demo Mode
          </CardTitle>
          <CardDescription>
            Populate your system with sample data to explore features and workflows
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Demo mode creates sample clients, media assets, plans, campaigns, and leads. 
              All demo data is clearly labeled with "DEMO" in their IDs for easy identification.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Demo Mode Status</Label>
                <p className="text-sm text-muted-foreground">
                  {demoMode ? "Demo data is active" : "No demo data loaded"}
                </p>
              </div>
              {demoMode && (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              )}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleSeedDemoData}
                disabled={loading || demoMode}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Seeding...
                  </>
                ) : (
                  <>
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Load Demo Data
                  </>
                )}
              </Button>

              <Button
                onClick={handleClearDemoData}
                disabled={loading || !demoMode}
                variant="outline"
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Clearing...
                  </>
                ) : (
                  <>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Clear Demo Data
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t">
            <h4 className="font-medium">Demo Data Includes:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                3 Sample Clients (ABC Beverages, XYZ Electronics, Matrix Real Estate)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                4 Media Assets (Bus Shelters, Hoardings, Unipole) across Hyderabad
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                1 Approved Plan (Summer Campaign 2025)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                1 Running Campaign with assigned assets
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                2 Fresh Leads (New Startup and Fashion Brand)
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tutorial Settings</CardTitle>
          <CardDescription>
            Configure guided walkthrough for new users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="tutorial-toggle">Show Tutorial on Login</Label>
              <p className="text-sm text-muted-foreground">
                Display interactive guide for first-time users
              </p>
            </div>
            <Switch
              id="tutorial-toggle"
              checked={showTutorial}
              onCheckedChange={setShowTutorial}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
