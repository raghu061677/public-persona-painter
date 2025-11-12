import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Clock, DollarSign, CheckCircle2, Bell } from "lucide-react";
import { formatDate } from "@/utils/plans";
import { formatCurrency } from "@/utils/mediaAssets";

interface HealthAlert {
  id: string;
  type: 'schedule' | 'verification' | 'budget';
  severity: 'warning' | 'error';
  message: string;
  details: string;
  campaignId: string;
  campaignName: string;
}

interface CampaignHealthAlertsProps {
  campaignId?: string;
}

export function CampaignHealthAlerts({ campaignId }: CampaignHealthAlertsProps) {
  const [alerts, setAlerts] = useState<HealthAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkCampaignHealth();
    
    // Refresh every 5 minutes
    const interval = setInterval(checkCampaignHealth, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [campaignId]);

  const checkCampaignHealth = async () => {
    setLoading(true);
    const detectedAlerts: HealthAlert[] = [];

    try {
      // Fetch campaigns to check
      let query = supabase
        .from("campaigns")
        .select("*");

      if (campaignId) {
        query = query.eq("id", campaignId);
      } else {
        query = query.in("status", ["Planned", "Assigned", "InProgress"]);
      }

      const { data: campaigns } = await query;

      if (!campaigns) {
        setLoading(false);
        return;
      }

      // Check each campaign
      for (const campaign of campaigns) {
        // Fetch assets for this campaign
        const { data: assets } = await supabase
          .from("campaign_assets")
          .select("*")
          .eq("campaign_id", campaign.id);

        if (!assets) continue;

        const today = new Date();
        const startDate = new Date(campaign.start_date);
        const endDate = new Date(campaign.end_date);
        const daysUntilStart = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const daysUntilEnd = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const campaignDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const campaignProgress = Math.max(0, Math.min(100, ((today.getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime())) * 100));

        // 1. Check Schedule Delays
        if (campaign.status === 'Planned' && daysUntilStart <= 7 && daysUntilStart > 0) {
          const unassignedAssets = assets.filter(a => !a.mounter_name).length;
          if (unassignedAssets > 0) {
            detectedAlerts.push({
              id: `${campaign.id}-schedule-warn`,
              type: 'schedule',
              severity: 'warning',
              message: `Campaign starting in ${daysUntilStart} days`,
              details: `${unassignedAssets} assets not yet assigned to mounters`,
              campaignId: campaign.id,
              campaignName: campaign.campaign_name,
            });
          }
        }

        if (campaign.status === 'Assigned' && daysUntilStart <= 3 && daysUntilStart > 0) {
          const notMountedAssets = assets.filter(a => a.status === 'Pending' || a.status === 'Assigned').length;
          if (notMountedAssets > assets.length * 0.5) {
            detectedAlerts.push({
              id: `${campaign.id}-schedule-error`,
              type: 'schedule',
              severity: 'error',
              message: `Critical: Campaign starts in ${daysUntilStart} days`,
              details: `${notMountedAssets} of ${assets.length} assets not mounted yet`,
              campaignId: campaign.id,
              campaignName: campaign.campaign_name,
            });
          }
        }

        // 2. Check Verification Delays
        if (campaign.status === 'InProgress' && campaignProgress > 50) {
          const verifiedAssets = assets.filter(a => a.status === 'Verified').length;
          const verificationRate = (verifiedAssets / assets.length) * 100;
          
          if (verificationRate < campaignProgress - 20) {
            detectedAlerts.push({
              id: `${campaign.id}-verification-warn`,
              type: 'verification',
              severity: 'warning',
              message: 'Verification lagging behind schedule',
              details: `Only ${Math.round(verificationRate)}% verified, but campaign is ${Math.round(campaignProgress)}% complete`,
              campaignId: campaign.id,
              campaignName: campaign.campaign_name,
            });
          }
        }

        // Check for old photo uploads pending verification
        const pendingVerification = assets.filter(a => a.status === 'PhotoUploaded');
        if (pendingVerification.length > 0) {
          const oldestPending = pendingVerification.sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )[0];
          
          const daysPending = Math.ceil((today.getTime() - new Date(oldestPending.created_at).getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysPending > 3) {
            detectedAlerts.push({
              id: `${campaign.id}-verification-delay`,
              type: 'verification',
              severity: daysPending > 7 ? 'error' : 'warning',
              message: `${pendingVerification.length} assets awaiting verification`,
              details: `Oldest pending for ${daysPending} days`,
              campaignId: campaign.id,
              campaignName: campaign.campaign_name,
            });
          }
        }

        // 3. Check Budget Overruns - use pro-rated costs for campaign duration
        const estimatedCosts = assets.reduce((sum, a) => {
          // Calculate pro-rata rate: (monthly_rate / 30) * campaign_days
          const monthlyRate = a.negotiated_price || a.card_rate || 0;
          const proRataRate = (monthlyRate / 30) * campaignDuration;
          const totalCost = proRataRate + (a.printing_charges || 0) + (a.mounting_charges || 0);
          return sum + totalCost;
        }, 0);
        
        const budgetVariance = campaign.total_amount > 0 
          ? ((estimatedCosts - campaign.total_amount) / campaign.total_amount) * 100 
          : 0;
        
        if (budgetVariance > 10 && campaign.total_amount > 0) {
          detectedAlerts.push({
            id: `${campaign.id}-budget-warn`,
            type: 'budget',
            severity: budgetVariance > 20 ? 'error' : 'warning',
            message: 'Budget overrun detected',
            details: `Estimated costs ${formatCurrency(estimatedCosts)} exceed budget by ${Math.round(budgetVariance)}%`,
            campaignId: campaign.id,
            campaignName: campaign.campaign_name,
          });
        }
      }

      setAlerts(detectedAlerts);
    } catch (error) {
      console.error("Error checking campaign health:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && alerts.length === 0) {
    return null;
  }

  if (alerts.length === 0) {
    return campaignId ? (
      <Card className="border-green-500/20 bg-green-500/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            <div>
              <p className="font-medium">Campaign Health: Good</p>
              <p className="text-sm text-muted-foreground">No issues detected</p>
            </div>
          </div>
        </CardContent>
      </Card>
    ) : null;
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'schedule': return <Clock className="h-4 w-4" />;
      case 'verification': return <CheckCircle2 className="h-4 w-4" />;
      case 'budget': return <DollarSign className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <Card className="border-amber-500/20 bg-amber-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-600">
          <Bell className="h-5 w-5" />
          Health Alerts ({alerts.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert) => (
          <Alert
            key={alert.id}
            variant={alert.severity === 'error' ? 'destructive' : 'default'}
            className={alert.severity === 'warning' ? 'border-amber-500/50 bg-amber-500/10' : ''}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 ${alert.severity === 'error' ? 'text-destructive' : 'text-amber-600'}`}>
                {getAlertIcon(alert.type)}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <AlertDescription className="font-medium">
                    {alert.message}
                  </AlertDescription>
                  <Badge variant={alert.severity === 'error' ? 'destructive' : 'secondary'} className="text-xs">
                    {alert.type}
                  </Badge>
                </div>
                <AlertDescription className="text-xs opacity-80">
                  {alert.details}
                </AlertDescription>
                {!campaignId && (
                  <AlertDescription className="text-xs opacity-60">
                    Campaign: {alert.campaignName}
                  </AlertDescription>
                )}
              </div>
            </div>
          </Alert>
        ))}
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={checkCampaignHealth}
          className="w-full mt-4"
        >
          Refresh Alerts
        </Button>
      </CardContent>
    </Card>
  );
}
