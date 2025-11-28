import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, Loader2, Rocket } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface BulkConversionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPlanIds: string[];
  onComplete: () => void;
}

interface ConversionStatus {
  planId: string;
  planName: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  campaignId?: string;
  error?: string;
}

export function BulkConversionDialog({
  open,
  onOpenChange,
  selectedPlanIds,
  onComplete,
}: BulkConversionDialogProps) {
  const [converting, setConverting] = useState(false);
  const [statuses, setStatuses] = useState<ConversionStatus[]>([]);
  const [progress, setProgress] = useState(0);

  const handleBulkConversion = async () => {
    setConverting(true);
    setProgress(0);

    // Fetch plan details
    const { data: plans } = await supabase
      .from('plans')
      .select('id, plan_name, client_id, client_name, start_date, end_date, total_amount, gst_percent, gst_amount, grand_total')
      .in('id', selectedPlanIds);

    if (!plans) {
      toast({
        title: "Error",
        description: "Failed to fetch plan details",
        variant: "destructive",
      });
      setConverting(false);
      return;
    }

    // Initialize statuses
    const initialStatuses: ConversionStatus[] = plans.map(p => ({
      planId: p.id,
      planName: p.plan_name,
      status: 'pending'
    }));
    setStatuses(initialStatuses);

    // Convert each plan
    for (let i = 0; i < plans.length; i++) {
      const plan = plans[i];
      
      // Update status to processing
      setStatuses(prev => prev.map(s => 
        s.planId === plan.id ? { ...s, status: 'processing' } : s
      ));

      try {
        // Fetch plan items
        const { data: planItems } = await supabase
          .from('plan_items')
          .select('*')
          .eq('plan_id', plan.id);

        if (!planItems || planItems.length === 0) {
          throw new Error('No plan items found');
        }

        // Generate campaign ID
        const now = new Date();
        const year = now.getFullYear();
        const month = now.toLocaleString('en-US', { month: 'long' });
        
        const { data: existingCampaigns } = await supabase
          .from('campaigns')
          .select('id')
          .ilike('id', `CMP-${year}-${month}-%`)
          .order('id', { ascending: false })
          .limit(1);

        let nextNumber = 1;
        if (existingCampaigns && existingCampaigns.length > 0) {
          const lastId = existingCampaigns[0].id;
          const match = lastId.match(/-(\d+)$/);
          if (match) {
            nextNumber = parseInt(match[1]) + 1;
          }
        }

        const campaignId = `CMP-${year}-${month}-${String(nextNumber).padStart(3, '0')}`;

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Create campaign
        const { error: campaignError } = await supabase
          .from('campaigns')
          .insert({
            id: campaignId,
            campaign_name: plan.plan_name,
            client_id: plan.client_id,
            client_name: plan.client_name,
            plan_id: plan.id,
            start_date: plan.start_date,
            end_date: plan.end_date,
            status: 'Planned',
            total_assets: planItems.length,
            total_amount: plan.total_amount,
            gst_percent: plan.gst_percent,
            gst_amount: plan.gst_amount,
            grand_total: plan.grand_total,
            created_by: user.id,
          });

        if (campaignError) throw campaignError;

        // Create campaign assets
        const campaignAssets = planItems.map(item => ({
          campaign_id: campaignId,
          asset_id: item.asset_id,
          location: item.location,
          city: item.city,
          area: item.area,
          media_type: item.media_type,
          card_rate: item.card_rate,
          printing_charges: item.printing_charges || 0,
          mounting_charges: item.mounting_charges || 0,
          status: 'Pending' as const,
        }));

        const { error: assetsError } = await supabase
          .from('campaign_assets')
          .insert(campaignAssets);

        if (assetsError) throw assetsError;

        // Update plan status to Converted with tracking fields
        const { error: planUpdateError } = await supabase
          .from('plans')
          .update({ 
            status: 'converted',
            converted_to_campaign_id: campaignId,
            converted_at: new Date().toISOString()
          })
          .eq('id', plan.id);

        if (planUpdateError) throw planUpdateError;

        // Update media assets to Booked
        const assetIds = planItems.map(item => item.asset_id);
        await supabase
          .from('media_assets')
          .update({ status: 'Booked' })
          .in('id', assetIds);

        // Success
        setStatuses(prev => prev.map(s => 
          s.planId === plan.id ? { ...s, status: 'success', campaignId } : s
        ));

      } catch (error: any) {
        console.error('Conversion error:', error);
        setStatuses(prev => prev.map(s => 
          s.planId === plan.id ? { ...s, status: 'error', error: error.message } : s
        ));
      }

      // Update progress
      setProgress(((i + 1) / plans.length) * 100);
    }

    setConverting(false);
    
    const successCount = statuses.filter(s => s.status === 'success').length;
    const errorCount = statuses.filter(s => s.status === 'error').length;

    toast({
      title: "Bulk Conversion Complete",
      description: `Successfully converted ${successCount} plan(s). ${errorCount > 0 ? `${errorCount} failed.` : ''}`,
      variant: errorCount > 0 ? "destructive" : "default",
    });

    if (successCount > 0) {
      onComplete();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-green-600" />
            Bulk Plan to Campaign Conversion
          </DialogTitle>
          <DialogDescription>
            Converting {selectedPlanIds.length} approved plan(s) to campaigns
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Progress Bar */}
          {converting && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Status List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {statuses.map((status) => (
              <div
                key={status.planId}
                className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{status.planName}</span>
                    <Badge variant="outline" className="text-xs">
                      {status.planId}
                    </Badge>
                  </div>
                  {status.campaignId && (
                    <div className="text-xs text-muted-foreground">
                      Campaign ID: {status.campaignId}
                    </div>
                  )}
                  {status.error && (
                    <div className="text-xs text-destructive">
                      Error: {status.error}
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0 ml-4">
                  {status.status === 'pending' && (
                    <div className="h-5 w-5 rounded-full bg-slate-200 dark:bg-slate-700" />
                  )}
                  {status.status === 'processing' && (
                    <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                  )}
                  {status.status === 'success' && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                  {status.status === 'error' && (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            {!converting && statuses.length === 0 && (
              <>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleBulkConversion}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Rocket className="mr-2 h-4 w-4" />
                  Start Conversion
                </Button>
              </>
            )}
            {!converting && statuses.length > 0 && (
              <Button onClick={() => {
                onOpenChange(false);
                setStatuses([]);
                setProgress(0);
              }}>
                Close
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
