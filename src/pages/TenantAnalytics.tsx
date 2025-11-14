import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/ui/page-container";
import { Building2, TrendingUp, DollarSign, Users, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface CompanyMetrics {
  company_id: string;
  company_name: string;
  company_type: string;
  total_revenue: number;
  total_assets: number;
  booked_assets: number;
  asset_utilization: number;
  total_campaigns: number;
  active_campaigns: number;
  total_clients: number;
  pending_invoices: number;
}

export default function TenantAnalytics() {
  const { isPlatformAdmin } = useCompany();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<CompanyMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isPlatformAdmin === false) {
      toast({
        title: "Access Denied",
        description: "Only platform administrators can view tenant analytics",
        variant: "destructive",
      });
      navigate('/admin/dashboard');
      return;
    }

    if (isPlatformAdmin === true) {
      loadAnalytics();
    }
  }, [isPlatformAdmin, navigate, toast]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      const { data: companies } = await supabase
        .from('companies' as any)
        .select('id, name, type')
        .eq('status', 'active')
        .order('name');

      if (!companies || companies.length === 0) {
        setMetrics([]);
        return;
      }

      const metricsPromises = companies.map(async (company: any) => {
        const { data: invoices } = await supabase
          .from('invoices' as any)
          .select('total_amount')
          .eq('company_id', company.id);

        const { data: assets } = await supabase
          .from('media_assets' as any)
          .select('id, status')
          .eq('company_id', company.id);

        const { data: campaigns } = await supabase
          .from('campaigns' as any)
          .select('id, status')
          .eq('company_id', company.id);

        const { data: clients } = await supabase
          .from('clients' as any)
          .select('id')
          .eq('company_id', company.id);

        const totalRevenue = invoices?.reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0) || 0;
        const totalAssets = assets?.length || 0;
        const bookedAssets = assets?.filter((a: any) => a.status === 'Booked').length || 0;
        const assetUtilization = totalAssets > 0 ? (bookedAssets / totalAssets) * 100 : 0;
        const totalCampaigns = campaigns?.length || 0;
        const activeCampaigns = campaigns?.filter((c: any) => c.status === 'Running' || c.status === 'Planned').length || 0;

        return {
          company_id: company.id,
          company_name: company.name,
          company_type: company.type,
          total_revenue: totalRevenue,
          total_assets: totalAssets,
          booked_assets: bookedAssets,
          asset_utilization: assetUtilization,
          total_campaigns: totalCampaigns,
          active_campaigns: activeCampaigns,
          total_clients: clients?.length || 0,
          pending_invoices: 0,
        };
      });

      const calculatedMetrics = await Promise.all(metricsPromises);
      setMetrics(calculatedMetrics);

    } catch (error: any) {
      console.error('Error loading analytics:', error);
      toast({
        title: "Error loading analytics",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (isPlatformAdmin === false) {
    return null;
  }

  const totalRevenue = metrics.reduce((sum, m) => sum + m.total_revenue, 0);
  const totalAssets = metrics.reduce((sum, m) => sum + m.total_assets, 0);
  const totalBookedAssets = metrics.reduce((sum, m) => sum + m.booked_assets, 0);
  const overallUtilization = totalAssets > 0 ? (totalBookedAssets / totalAssets) * 100 : 0;

  return (
    <PageContainer title="Tenant Analytics">
      {/* Overall Platform Metrics */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.filter(m => m.company_type === 'media_owner').length} Owners, {metrics.filter(m => m.company_type === 'agency').length} Agencies
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all tenants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Asset Utilization</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallUtilization.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalBookedAssets} of {totalAssets} booked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.reduce((sum, m) => sum + m.active_campaigns, 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.reduce((sum, m) => sum + m.total_campaigns, 0)} total campaigns
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Per-Company Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Company Performance Comparison</CardTitle>
          <CardDescription>Detailed metrics for each tenant</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading analytics...</p>
          ) : metrics.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No active companies found</p>
          ) : (
            <div className="space-y-4">
              {metrics.map((metric) => (
                <Card key={metric.company_id} className="border-l-4" style={{ borderLeftColor: 'hsl(var(--primary))' }}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{metric.company_name}</CardTitle>
                        <CardDescription>
                          <Badge variant="outline" className="mt-1">
                            {metric.company_type === 'media_owner' ? 'Media Owner' : 'Agency'}
                          </Badge>
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Revenue</p>
                        <p className="text-lg font-semibold">₹{metric.total_revenue.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Assets</p>
                        <p className="text-lg font-semibold">{metric.total_assets}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Utilization</p>
                        <p className="text-lg font-semibold">
                          {metric.asset_utilization.toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Campaigns</p>
                        <p className="text-lg font-semibold">{metric.total_campaigns}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Active</p>
                        <p className="text-lg font-semibold">{metric.active_campaigns}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Clients</p>
                        <p className="text-lg font-semibold">{metric.total_clients}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Pending Inv.</p>
                        <p className="text-lg font-semibold">{metric.pending_invoices}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
