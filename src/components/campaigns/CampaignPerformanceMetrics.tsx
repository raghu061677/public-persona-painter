import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatCurrency } from "@/utils/mediaAssets";
import { DollarSign, Clock, CheckCircle } from "lucide-react";

interface CampaignPerformanceMetricsProps {
  campaign: any;
  campaignAssets: any[];
}

export function CampaignPerformanceMetrics({ campaign, campaignAssets }: CampaignPerformanceMetricsProps) {
  // Calculate metrics
  const totalAssets = campaignAssets.length;
  const verifiedAssets = campaignAssets.filter(a => a.status === 'Verified').length;
  const completionRate = totalAssets > 0 ? (verifiedAssets / totalAssets) * 100 : 0;

  // Cost per asset (use total_amount which is the base amount without GST)
  const costPerAsset = totalAssets > 0 ? campaign.total_amount / totalAssets : 0;

  // Average verification time (in days)
  const verificationTimes = campaignAssets
    .filter(a => a.assigned_at && (a.completed_at || a.status === 'Verified'))
    .map(a => {
      const assigned = new Date(a.assigned_at);
      const completed = new Date(a.completed_at || new Date());
      return Math.ceil((completed.getTime() - assigned.getTime()) / (1000 * 60 * 60 * 24));
    });

  const avgVerificationTime = verificationTimes.length > 0
    ? verificationTimes.reduce((sum, time) => sum + time, 0) / verificationTimes.length
    : 0;

  // Status distribution - include "Installed" status
  const statusData = [
    { name: 'Verified', value: campaignAssets.filter(a => a.status === 'Verified').length, color: '#10b981' },
    { name: 'Photo Uploaded', value: campaignAssets.filter(a => a.status === 'PhotoUploaded').length, color: '#8b5cf6' },
    { name: 'Installed', value: campaignAssets.filter(a => a.status === 'Installed').length, color: '#22c55e' },
    { name: 'Mounted', value: campaignAssets.filter(a => a.status === 'Mounted').length, color: '#f59e0b' },
    { name: 'Assigned', value: campaignAssets.filter(a => a.status === 'Assigned').length, color: '#3b82f6' },
    { name: 'Pending', value: campaignAssets.filter(a => a.status === 'Pending').length, color: '#64748b' },
  ].filter(s => s.value > 0);

  // City-wise breakdown
  const cityData = Object.entries(
    campaignAssets.reduce((acc, asset) => {
      acc[asset.city] = (acc[asset.city] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([city, count]) => ({ city, count }));

  return (
    <Card className="shadow-sm h-full">
      <CardHeader className="pb-3 border-b bg-gradient-to-r from-primary/5 to-primary/10">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <BarChart className="h-4 w-4 text-primary" />
          Performance Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {/* Key Metrics - Compact */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-lg p-3 border border-blue-500/20">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
              <div className="p-1.5 bg-blue-500/20 rounded">
                <DollarSign className="h-3 w-3" />
              </div>
              <span className="text-xs font-semibold">Cost per Asset</span>
            </div>
            <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
              {formatCurrency(costPerAsset)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1 font-medium">
              Total: {formatCurrency(campaign.grand_total)}
            </p>
          </div>

          <div className="relative overflow-hidden bg-gradient-to-br from-amber-500/10 to-amber-600/5 rounded-lg p-3 border border-amber-500/20">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
              <div className="p-1.5 bg-amber-500/20 rounded">
                <Clock className="h-3 w-3" />
              </div>
              <span className="text-xs font-semibold">Avg. Verification</span>
            </div>
            <p className="text-xl font-bold text-amber-700 dark:text-amber-300">
              {avgVerificationTime > 0 ? `${Math.round(avgVerificationTime)}d` : 'N/A'}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1 font-medium">
              Assignment to verification
            </p>
          </div>

          <div className="relative overflow-hidden bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-lg p-3 border border-green-500/20">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
              <div className="p-1.5 bg-green-500/20 rounded">
                <CheckCircle className="h-3 w-3" />
              </div>
              <span className="text-xs font-semibold">Completion Rate</span>
            </div>
            <p className="text-xl font-bold text-green-700 dark:text-green-300">
              {Math.round(completionRate)}%
            </p>
            <p className="text-[10px] text-muted-foreground mt-1 font-medium">
              {verifiedAssets} of {totalAssets} assets verified
            </p>
          </div>
        </div>

        {/* Charts - Reduced size */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Status Distribution */}
          <div>
            <h4 className="text-xs font-semibold mb-2">Status Distribution</h4>
            <ChartContainer
              config={statusData.reduce((acc, item) => {
                acc[item.name.toLowerCase().replace(' ', '_')] = {
                  label: item.name,
                  color: item.color,
                };
                return acc;
              }, {} as any)}
              className="h-[160px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name.substring(0, 3)} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={50}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

          {/* City-wise Breakdown */}
          <div>
            <h4 className="text-xs font-semibold mb-2">Assets by City</h4>
            <ChartContainer
              config={{
                count: {
                  label: "Assets",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[160px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cityData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="city" fontSize={10} />
                  <YAxis fontSize={10} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
