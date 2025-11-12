import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, Play, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export default function PowerBillsScheduler() {
  const [loading, setLoading] = useState(false);
  const [lastRun, setLastRun] = useState<any>(null);

  const handleManualRun = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-monthly-power-bills');

      if (error) throw error;

      if (data?.success) {
        setLastRun(data.summary);
        toast({
          title: "Bills Fetch Completed",
          description: `Processed ${data.summary.totalAssets} assets. ${data.summary.successCount} successful, ${data.summary.failureCount} failed.`,
        });
      } else {
        throw new Error(data?.error || 'Failed to fetch bills');
      }
    } catch (error) {
      console.error('Error running manual fetch:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch bills",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Power Bills Scheduler</h2>
          <p className="text-muted-foreground">
            Automated monthly bill fetching configuration
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Scheduled Job
                </CardTitle>
                <CardDescription>Automatic monthly bill fetch</CardDescription>
              </div>
              <Badge variant="default" className="bg-green-500">
                <CheckCircle className="h-3 w-3 mr-1" />
                Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Schedule:</span>
                <span className="font-medium">Monthly (1st day at 2:00 AM)</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Frequency:</span>
                <span className="font-medium">Every month</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Next Run:</span>
                <span className="font-medium flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1, 2, 0).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h4 className="text-sm font-semibold mb-2">What happens during scheduled run:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Fetches all assets with configured service numbers</li>
                <li>Retrieves current month bills from TGSPDCL portal</li>
                <li>Stores bill details in database automatically</li>
                <li>Sends summary email to all admin users</li>
                <li>Triggers payment reminder notifications</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Manual Run
            </CardTitle>
            <CardDescription>Test or run immediately</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Click the button below to manually trigger the bill fetching process. This will run the same automated job immediately.
            </p>

            <Button 
              onClick={handleManualRun} 
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Fetching Bills...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Now
                </>
              )}
            </Button>

            {lastRun && (
              <div className="pt-4 border-t space-y-2">
                <h4 className="text-sm font-semibold">Last Manual Run:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-muted p-2 rounded">
                    <p className="text-muted-foreground text-xs">Total</p>
                    <p className="font-semibold text-lg">{lastRun.totalAssets}</p>
                  </div>
                  <div className="bg-green-50 p-2 rounded">
                    <p className="text-muted-foreground text-xs">Success</p>
                    <p className="font-semibold text-lg text-green-600">{lastRun.successCount}</p>
                  </div>
                  <div className="bg-red-50 p-2 rounded">
                    <p className="text-muted-foreground text-xs">Failed</p>
                    <p className="font-semibold text-lg text-red-600">{lastRun.failureCount}</p>
                  </div>
                  <div className="bg-blue-50 p-2 rounded">
                    <p className="text-muted-foreground text-xs">Rate</p>
                    <p className="font-semibold text-lg text-blue-600">{lastRun.completionRate}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Important Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-xs">
              1
            </div>
            <div>
              <p className="font-medium text-foreground">Email Notifications</p>
              <p>All users with 'admin' role will receive automated email notifications with detailed fetch results.</p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-xs">
              2
            </div>
            <div>
              <p className="font-medium text-foreground">Service Numbers Required</p>
              <p>Only assets with configured unique_service_number will be processed during the automated run.</p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-xs">
              3
            </div>
            <div>
              <p className="font-medium text-foreground">Rate Limiting</p>
              <p>The system includes 2-second delays between requests to avoid overwhelming the TGSPDCL portal.</p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-xs">
              4
            </div>
            <div>
              <p className="font-medium text-foreground">Payment Reminders</p>
              <p>After successful bill fetches, automatic payment reminder notifications are sent for pending bills approaching due dates.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
