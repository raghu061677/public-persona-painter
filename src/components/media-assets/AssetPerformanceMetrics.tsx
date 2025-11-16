import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Calendar, DollarSign, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface PerformanceMetrics {
  totalCampaigns: number;
  occupancyRate: number;
  averageRate: number;
  totalRevenue: number;
  daysBooked: number;
  lastCampaignDate: string | null;
}

interface AssetPerformanceMetricsProps {
  assetId: string;
}

export function AssetPerformanceMetrics({ assetId }: AssetPerformanceMetricsProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, [assetId]);

  const loadMetrics = async () => {
    try {
      setLoading(true);

      // Get campaigns for this asset
      const { data: campaignAssets, error } = await supabase
        .from('campaign_assets')
        .select('*, campaigns(start_date, end_date, total_amount)')
        .eq('asset_id', assetId);

      if (error) throw error;

      // Calculate metrics
      const totalCampaigns = campaignAssets?.length || 0;
      
      let totalRevenue = 0;
      let daysBooked = 0;
      let lastDate: string | null = null;
      let sumRates = 0;

      campaignAssets?.forEach(ca => {
        if (ca.campaigns) {
          const campaign = Array.isArray(ca.campaigns) ? ca.campaigns[0] : ca.campaigns;
          
          // Calculate days
          const start = new Date(campaign.start_date);
          const end = new Date(campaign.end_date);
          const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          daysBooked += days;

          // Track last date
          if (!lastDate || campaign.end_date > lastDate) {
            lastDate = campaign.end_date;
          }

          // Sum revenue (approximate per asset)
          totalRevenue += campaign.total_amount / (campaignAssets.length || 1);
        }

        sumRates += ca.card_rate;
      });

      const averageRate = totalCampaigns > 0 ? sumRates / totalCampaigns : 0;

      // Calculate occupancy (last 365 days)
      const occupancyRate = (daysBooked / 365) * 100;

      setMetrics({
        totalCampaigns,
        occupancyRate: Math.min(occupancyRate, 100),
        averageRate,
        totalRevenue,
        daysBooked,
        lastCampaignDate: lastDate,
      });
    } catch (error: any) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalCampaigns}</div>
          <p className="text-xs text-muted-foreground">All-time usage</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.occupancyRate.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground">{metrics.daysBooked} days booked</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Rate</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₹{metrics.averageRate.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">Per campaign</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₹{metrics.totalRevenue.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            {metrics.lastCampaignDate ? `Last: ${new Date(metrics.lastCampaignDate).toLocaleDateString()}` : 'No campaigns yet'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
