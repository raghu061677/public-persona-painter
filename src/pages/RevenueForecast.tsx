import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, DollarSign, AlertTriangle, Lightbulb, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ForecastData {
  company_id: string;
  generated_at: string;
  historical_analysis: any;
  asset_analysis: any;
  upcoming_revenue: any;
  ai_forecast: {
    forecast_30_days: number;
    forecast_90_days: number;
    forecast_180_days: number;
    forecast_fy: number;
    confidence_level: string;
    growth_trend: string;
    recommendations: string[];
    risk_factors: string[];
    opportunities: string[];
  };
}

export default function RevenueForecast() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ForecastData | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    generateForecast();
  }, []);

  const generateForecast = async () => {
    try {
      setLoading(true);

      // Get user's company
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data: companyData } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', userData.user.id)
        .eq('status', 'active')
        .single();

      if (!companyData) throw new Error('No company association found');

      // Call AI forecast function
      const { data: forecastData, error } = await supabase.functions.invoke('revenue-forecast-ai', {
        body: { company_id: companyData.company_id }
      });

      if (error) throw error;
      setData(forecastData);

      toast({
        title: "Forecast Generated",
        description: "AI-powered revenue forecast has been generated successfully"
      });
    } catch (error: any) {
      console.error('Forecast error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceBadge = (level: string) => {
    const colors = {
      low: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-green-100 text-green-800'
    };
    return <Badge className={colors[level as keyof typeof colors] || colors.medium}>{level.toUpperCase()}</Badge>;
  };

  const getTrendBadge = (trend: string) => {
    const colors = {
      declining: 'bg-red-100 text-red-800',
      stable: 'bg-blue-100 text-blue-800',
      growing: 'bg-green-100 text-green-800'
    };
    return <Badge className={colors[trend as keyof typeof colors] || colors.stable}>{trend.toUpperCase()}</Badge>;
  };

  if (loading && !data) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Revenue Forecast</h1>
          <p className="text-muted-foreground mt-1">
            Intelligent revenue projections powered by AI
          </p>
        </div>
        <Button onClick={generateForecast} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Regenerate Forecast
        </Button>
      </div>

      {data && (
        <>
          {/* Forecast Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">30-Day Forecast</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₹{(data.ai_forecast.forecast_30_days / 100000).toFixed(2)}L
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Next month projection
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">90-Day Forecast</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₹{(data.ai_forecast.forecast_90_days / 100000).toFixed(2)}L
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Next quarter projection
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">180-Day Forecast</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₹{(data.ai_forecast.forecast_180_days / 100000).toFixed(2)}L
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  6-month projection
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">FY Forecast</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₹{(data.ai_forecast.forecast_fy / 100000).toFixed(2)}L
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Financial year projection
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Confidence & Trend */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Forecast Confidence</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Confidence Level</span>
                    {getConfidenceBadge(data.ai_forecast.confidence_level)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Growth Trend</span>
                    {getTrendBadge(data.ai_forecast.growth_trend)}
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Generated: {new Date(data.generated_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upcoming Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Confirmed Bookings</p>
                    <p className="text-2xl font-bold">{data.upcoming_revenue.confirmed_bookings}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Confirmed Value</p>
                    <p className="text-2xl font-bold">
                      ₹{(data.upcoming_revenue.confirmed_value / 100000).toFixed(2)}L
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                AI Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {data.ai_forecast.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Risk Factors & Opportunities */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  Risk Factors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.ai_forecast.risk_factors.map((risk, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-yellow-600">⚠</span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.ai_forecast.opportunities.map((opp, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-green-600">✓</span>
                      <span>{opp}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Asset Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Asset Performance Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Assets</p>
                  <p className="text-2xl font-bold">{data.asset_analysis.total_assets}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Underutilized</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {data.asset_analysis.underutilized_count}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">High Performing</p>
                  <p className="text-2xl font-bold text-green-600">
                    {data.asset_analysis.high_performing_count}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}