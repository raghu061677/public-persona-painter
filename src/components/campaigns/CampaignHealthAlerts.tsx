import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Clock, DollarSign, CheckCircle2, Bell, Info } from "lucide-react";
import { formatDate } from "@/utils/plans";
import { formatCurrency } from "@/utils/mediaAssets";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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

interface BudgetBreakdown {
  assetId: string;
  monthlyRate: number;
  proRata: number;
  printing: number;
  mounting: number;
  total: number;
}

export function CampaignHealthAlerts({ campaignId }: CampaignHealthAlertsProps) {
  const { company } = useCompany();
  const [alerts, setAlerts] = useState<HealthAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [budgetBreakdowns, setBudgetBreakdowns] = useState<Map<string, BudgetBreakdown[]>>(new Map());
  const [alertThresholds, setAlertThresholds] = useState({
    budgetVariance: 10,
    scheduleWarning: 7,
    scheduleCritical: 3,
    verificationLag: 20,
    verificationWarningDays: 3,
    verificationCriticalDays: 7,
  });

  useEffect(() => {
    loadAlertSettings();
    checkCampaignHealth();
    
    // Refresh every 5 minutes
    const interval = setInterval(checkCampaignHealth, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [campaignId, company]);

  const loadAlertSettings = async () => {
    try {
      const { data } = await supabase
        .from("alert_settings" as any)
        .select("*")
        .single();

      if (data) {
        setAlertThresholds({
          budgetVariance: (data as any).budget_variance_threshold || 10,
          scheduleWarning: (data as any).schedule_warning_days || 7,
          scheduleCritical: (data as any).schedule_critical_days || 3,
          verificationLag: (data as any).verification_lag_threshold || 20,
          verificationWarningDays: (data as any).verification_delay_warning_days || 3,
          verificationCriticalDays: (data as any).verification_delay_critical_days || 7,
        });
      }
    } catch (error) {
      console.error("Error loading alert settings:", error);
    }
  };

  const checkCampaignHealth = async () => {
    setLoading(true);
    const detectedAlerts: HealthAlert[] = [];
    const breakdowns = new Map<string, BudgetBreakdown[]>();

    try {
      // Get user's company ID for multi-tenant filtering
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: companyUserData } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (!companyUserData) {
        setLoading(false);
        return;
      }

      // Use selected company from localStorage if available (for platform admins)
      const selectedCompanyId = localStorage.getItem('selected_company_id') || companyUserData.company_id;

      // Fetch campaigns to check - FILTER BY COMPANY_ID
      let query = supabase
        .from("campaigns")
        .select("*")
        .eq("company_id", selectedCompanyId);

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
        if (campaign.status === 'Planned' && daysUntilStart <= alertThresholds.scheduleWarning && daysUntilStart > 0) {
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

        if (campaign.status === 'Assigned' && daysUntilStart <= alertThresholds.scheduleCritical && daysUntilStart > 0) {
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
          
          if (verificationRate < campaignProgress - alertThresholds.verificationLag) {
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
          
          if (daysPending > alertThresholds.verificationWarningDays) {
            detectedAlerts.push({
              id: `${campaign.id}-verification-delay`,
              type: 'verification',
              severity: daysPending > alertThresholds.verificationCriticalDays ? 'error' : 'warning',
              message: `${pendingVerification.length} assets awaiting verification`,
              details: `Oldest pending for ${daysPending} days`,
              campaignId: campaign.id,
              campaignName: campaign.campaign_name,
            });
          }
        }

        // 3. Check Budget Overruns - use negotiated_rate (actual agreed price) for campaign duration
        const breakdown: BudgetBreakdown[] = [];
        const estimatedCosts = assets.reduce((sum, a) => {
          // Use negotiated_rate (actual price) falling back to card_rate only if no negotiation
          const monthlyRate = a.negotiated_rate || a.card_rate || 0;
          // Use per-asset booking dates if available, otherwise campaign duration
          const assetStart = a.booking_start_date ? new Date(a.booking_start_date) : startDate;
          const assetEnd = a.booking_end_date ? new Date(a.booking_end_date) : endDate;
          const assetDays = Math.max(1, Math.ceil((assetEnd.getTime() - assetStart.getTime()) / (1000 * 60 * 60 * 24)));
          const proRataRate = (monthlyRate / 30) * assetDays;
          const printing = a.printing_charges || 0;
          const mounting = a.mounting_charges || 0;
          const totalCost = proRataRate + printing + mounting;
          
          breakdown.push({
            assetId: a.asset_id,
            monthlyRate,
            proRata: proRataRate,
            printing,
            mounting,
            total: totalCost,
          });
          
          return sum + totalCost;
        }, 0);
        
        breakdowns.set(campaign.id, breakdown);
        
        const budgetVariance = campaign.total_amount > 0 
          ? ((estimatedCosts - campaign.total_amount) / campaign.total_amount) * 100 
          : 0;
        
        if (budgetVariance > alertThresholds.budgetVariance && campaign.total_amount > 0) {
          detectedAlerts.push({
            id: `${campaign.id}-budget-warn`,
            type: 'budget',
            severity: budgetVariance > alertThresholds.budgetVariance * 2 ? 'error' : 'warning',
            message: 'Budget overrun detected',
            details: `Estimated costs ${formatCurrency(estimatedCosts)} exceed budget by ${Math.round(budgetVariance)}%`,
            campaignId: campaign.id,
            campaignName: campaign.campaign_name,
          });
        }
      }

      setAlerts(detectedAlerts);
      setBudgetBreakdowns(breakdowns);
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
                <div className="flex items-center gap-2">
                  <AlertDescription className="text-xs opacity-80">
                    {alert.details}
                  </AlertDescription>
                  {alert.type === 'budget' && budgetBreakdowns.has(alert.campaignId) && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <Info className="h-3 w-3" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80" align="start">
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm">Cost Breakdown</h4>
                          <div className="text-xs space-y-1">
                            {budgetBreakdowns.get(alert.campaignId)?.map((item, idx) => (
                              <div key={idx} className="border-b pb-2 last:border-0">
                                <p className="font-medium">{item.assetId}</p>
                                <div className="grid grid-cols-2 gap-1 text-muted-foreground mt-1">
                                  <span>Pro-rata ({Math.round((item.proRata / item.monthlyRate) * 30)}d):</span>
                                  <span className="text-right">{formatCurrency(item.proRata)}</span>
                                  <span>Printing:</span>
                                  <span className="text-right">{formatCurrency(item.printing)}</span>
                                  <span>Mounting:</span>
                                  <span className="text-right">{formatCurrency(item.mounting)}</span>
                                  <span className="font-medium">Total:</span>
                                  <span className="text-right font-medium">{formatCurrency(item.total)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
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
