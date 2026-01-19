import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/utils/mediaAssets";
import { formatDate, getPlanStatusColor } from "@/utils/plans";

export default function PlanComparison() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState<any[]>([]);
  const [planItems, setPlanItems] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const planIds = searchParams.get('plans')?.split(',') || [];
    if (planIds.length === 0) {
      toast({
        title: "No Plans Selected",
        description: "Please select plans to compare",
        variant: "destructive",
      });
      navigate('/admin/plans');
      return;
    }
    fetchPlansForComparison(planIds);
  }, [searchParams]);

  const fetchPlansForComparison = async (planIds: string[]) => {
    setLoading(true);
    
    // Fetch plans
    const { data: plansData, error: plansError } = await supabase
      .from('plans')
      .select('*')
      .in('id', planIds);

    if (plansError) {
      toast({
        title: "Error",
        description: "Failed to fetch plans",
        variant: "destructive",
      });
      return;
    }

    setPlans(plansData || []);

    // Fetch plan items for each plan with media_asset_code
    const itemsMap: Record<string, any[]> = {};
    for (const plan of plansData || []) {
      const { data: items } = await supabase
        .from('plan_items')
        .select('*, media_assets(id, media_asset_code)')
        .eq('plan_id', plan.id);
      
      // Enrich items with media_asset_code
      itemsMap[plan.id] = (items || []).map(item => ({
        ...item,
        media_asset_code: (item.media_assets as any)?.media_asset_code || item.asset_id
      }));
    }
    setPlanItems(itemsMap);
    setLoading(false);
  };

  const exportComparison = () => {
    toast({
      title: "Export Coming Soon",
      description: "Excel export functionality will be available soon",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading comparison...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/admin/plans')}
            className="hover:bg-muted"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Plans
          </Button>
          <Button onClick={exportComparison} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Comparison
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Plan Comparison</h1>
          <p className="text-muted-foreground mt-1">
            Comparing {plans.length} {plans.length === 1 ? 'plan' : 'plans'} side-by-side
          </p>
        </div>

        {/* Comparison Grid */}
        <div className="grid grid-cols-1 gap-6 overflow-x-auto">
          {/* Header Row - Basic Info */}
          <div className={`grid grid-cols-${plans.length} gap-4`} style={{ gridTemplateColumns: `repeat(${plans.length}, minmax(300px, 1fr))` }}>
            {plans.map((plan) => (
              <Card key={plan.id} className="border-2">
                <CardHeader className="border-b bg-muted/30">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{plan.plan_name}</CardTitle>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => navigate(`/admin/plans/${plan.id}`)}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                  <Badge className={getPlanStatusColor(plan.status)}>
                    {plan.status}
                  </Badge>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Plan ID</p>
                    <p className="font-medium">{plan.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Client</p>
                    <p className="font-medium">{plan.client_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-medium">{plan.plan_type}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Campaign Duration */}
          <Card>
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="text-lg">Campaign Duration</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className={`grid grid-cols-${plans.length} gap-4`} style={{ gridTemplateColumns: `repeat(${plans.length}, minmax(300px, 1fr))` }}>
                {plans.map((plan) => (
                  <div key={plan.id} className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Start Date</p>
                      <p className="font-medium">{formatDate(new Date(plan.start_date))}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">End Date</p>
                      <p className="font-medium">{formatDate(new Date(plan.end_date))}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Duration</p>
                      <p className="text-2xl font-bold text-primary">{plan.duration_days} days</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Assets Count */}
          <Card>
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="text-lg">Media Assets</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className={`grid grid-cols-${plans.length} gap-4`} style={{ gridTemplateColumns: `repeat(${plans.length}, minmax(300px, 1fr))` }}>
                {plans.map((plan) => {
                  const items = planItems[plan.id] || [];
                  const cities = [...new Set(items.map(i => i.city))];
                  const mediaTypes = [...new Set(items.map(i => i.media_type))];
                  
                  return (
                    <div key={plan.id} className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Assets</p>
                        <p className="text-3xl font-bold text-primary">{items.length}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Cities</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {cities.map(city => (
                            <Badge key={city} variant="secondary" className="text-xs">
                              {city}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Media Types</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {mediaTypes.map(type => (
                            <Badge key={type} variant="outline" className="text-xs">
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Financial Comparison */}
          <Card>
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="text-lg">Financial Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className={`grid grid-cols-${plans.length} gap-4`} style={{ gridTemplateColumns: `repeat(${plans.length}, minmax(300px, 1fr))` }}>
                {plans.map((plan) => (
                  <div key={plan.id} className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Amount</p>
                      <p className="font-medium">{formatCurrency(plan.total_amount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">GST ({plan.gst_percent}%)</p>
                      <p className="font-medium">{formatCurrency(plan.gst_amount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Grand Total</p>
                      <p className="text-3xl font-bold text-green-600">
                        {formatCurrency(plan.grand_total)}
                      </p>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground">Cost per Day</p>
                      <p className="text-lg font-semibold text-blue-600">
                        {formatCurrency(plan.grand_total / plan.duration_days)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Cost per Asset per Day</p>
                      <p className="text-lg font-semibold text-purple-600">
                        {formatCurrency(plan.grand_total / plan.duration_days / (planItems[plan.id]?.length || 1))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Asset Details Comparison */}
          <Card>
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="text-lg">Asset Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className={`grid grid-cols-${plans.length} gap-4`} style={{ gridTemplateColumns: `repeat(${plans.length}, minmax(300px, 1fr))` }}>
                {plans.map((plan) => {
                  const items = planItems[plan.id] || [];
                  
                  return (
                    <div key={plan.id} className="space-y-2 max-h-96 overflow-y-auto">
                      {items.map((item, idx) => (
                        <div key={idx} className="p-3 border rounded-lg bg-muted/20">
                          <p className="font-medium text-sm text-primary font-mono">{item.media_asset_code || item.asset_id}</p>
                          <p className="text-xs text-muted-foreground">{item.location}</p>
                          <p className="text-xs text-muted-foreground">{item.media_type} - {item.dimensions}</p>
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-xs text-muted-foreground">Rate:</span>
                            <span className="font-semibold text-sm">{formatCurrency(item.sales_price)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
