import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  data?: any;
}

export default function WorkflowTest() {
  const navigate = useNavigate();
  const [campaignId, setCampaignId] = useState("");
  const [results, setResults] = useState<TestResult[]>([]);

  const updateResult = (name: string, updates: Partial<TestResult>) => {
    setResults(prev => {
      const existing = prev.find(r => r.name === name);
      if (existing) {
        return prev.map(r => r.name === name ? { ...r, ...updates } : r);
      }
      return [...prev, { name, status: 'pending', ...updates }];
    });
  };

  const testAutoInvoice = async () => {
    updateResult('auto-generate-invoice', { status: 'running' });
    try {
      const { data, error } = await supabase.functions.invoke('auto-generate-invoice', {
        body: { campaign_id: campaignId }
      });

      if (error) throw error;

      updateResult('auto-generate-invoice', {
        status: 'success',
        message: `Invoice ${data.invoice_id} created`,
        data
      });
    } catch (error: any) {
      updateResult('auto-generate-invoice', {
        status: 'error',
        message: error.message
      });
    }
  };

  const testAutoExpenses = async () => {
    updateResult('auto-record-expenses', { status: 'running' });
    try {
      const { data, error } = await supabase.functions.invoke('auto-record-expenses', {
        body: { campaign_id: campaignId }
      });

      if (error) throw error;

      updateResult('auto-record-expenses', {
        status: 'success',
        message: `${data.expenses_created} expenses created`,
        data
      });
    } catch (error: any) {
      updateResult('auto-record-expenses', {
        status: 'error',
        message: error.message
      });
    }
  };

  const testAutoTasks = async () => {
    updateResult('auto-create-mounting-tasks', { status: 'running' });
    try {
      const { data, error } = await supabase.functions.invoke('auto-create-mounting-tasks', {
        body: { campaign_id: campaignId }
      });

      if (error) throw error;

      updateResult('auto-create-mounting-tasks', {
        status: 'success',
        message: `${data.tasks_created} tasks created`,
        data
      });
    } catch (error: any) {
      updateResult('auto-create-mounting-tasks', {
        status: 'error',
        message: error.message
      });
    }
  };

  const testPaymentReminders = async () => {
    updateResult('send-payment-reminders', { status: 'running' });
    try {
      const { data, error } = await supabase.functions.invoke('send-payment-reminders');

      if (error) throw error;

      updateResult('send-payment-reminders', {
        status: 'success',
        message: `${data.reminders_sent} reminders sent`,
        data
      });
    } catch (error: any) {
      updateResult('send-payment-reminders', {
        status: 'error',
        message: error.message
      });
    }
  };

  const testCampaignWorkflow = async () => {
    if (!campaignId) {
      toast({
        title: "Campaign ID Required",
        description: "Please enter a campaign ID to test workflows",
        variant: "destructive",
      });
      return;
    }

    // Verify campaign exists
    updateResult('verify-campaign', { status: 'running' });
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      updateResult('verify-campaign', {
        status: 'error',
        message: 'Campaign not found'
      });
      return;
    }

    updateResult('verify-campaign', {
      status: 'success',
      message: `Found: ${campaign.campaign_name}`,
      data: campaign
    });

    // Test all workflows
    await testAutoTasks();
    await testAutoExpenses();
    await testAutoInvoice();
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin/dashboard')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Workflow Testing</h1>
            <p className="text-muted-foreground mt-2">
              Test automated workflows and edge functions
            </p>
          </div>

          {/* Campaign Workflow Test */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Workflow Test</CardTitle>
              <CardDescription>
                Test complete campaign automation workflow
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="campaignId">Campaign ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="campaignId"
                    placeholder="CAM-2024-January-001"
                    value={campaignId}
                    onChange={(e) => setCampaignId(e.target.value)}
                  />
                  <Button onClick={testCampaignWorkflow} disabled={!campaignId}>
                    <Play className="mr-2 h-4 w-4" />
                    Test Workflow
                  </Button>
                </div>
              </div>

              {results.length > 0 && (
                <div className="space-y-2 border-t pt-4">
                  <h3 className="font-semibold">Test Results</h3>
                  {results.map((result) => (
                    <div
                      key={result.name}
                      className="flex items-start justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-start gap-3 flex-1">
                        {getStatusIcon(result.status)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{result.name}</p>
                            <Badge className={getStatusColor(result.status)}>
                              {result.status}
                            </Badge>
                          </div>
                          {result.message && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {result.message}
                            </p>
                          )}
                          {result.data && (
                            <details className="mt-2">
                              <summary className="text-xs text-muted-foreground cursor-pointer">
                                View data
                              </summary>
                              <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-auto">
                                {JSON.stringify(result.data, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Individual Function Tests */}
          <Card>
            <CardHeader>
              <CardTitle>Individual Function Tests</CardTitle>
              <CardDescription>
                Test each edge function independently
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                <Button
                  variant="outline"
                  onClick={testAutoInvoice}
                  disabled={!campaignId}
                  className="justify-start"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Test Auto-Generate Invoice
                </Button>
                <Button
                  variant="outline"
                  onClick={testAutoExpenses}
                  disabled={!campaignId}
                  className="justify-start"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Test Auto-Record Expenses
                </Button>
                <Button
                  variant="outline"
                  onClick={testAutoTasks}
                  disabled={!campaignId}
                  className="justify-start"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Test Auto-Create Tasks
                </Button>
                <Button
                  variant="outline"
                  onClick={testPaymentReminders}
                  className="justify-start"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Test Payment Reminders (No Campaign ID Needed)
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Documentation */}
          <Card>
            <CardHeader>
              <CardTitle>Workflow Documentation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Auto-Invoice Trigger</h4>
                <p className="text-sm text-muted-foreground">
                  Triggered when: Campaign status changes to "Completed"
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Auto-Tasks Trigger</h4>
                <p className="text-sm text-muted-foreground">
                  Triggered when: Campaign status changes to "InProgress"
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Auto-Expenses Trigger</h4>
                <p className="text-sm text-muted-foreground">
                  Triggered when: Campaign asset status changes to "Installed"
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Payment Reminders</h4>
                <p className="text-sm text-muted-foreground">
                  Runs for all overdue invoices with escalation logic
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
