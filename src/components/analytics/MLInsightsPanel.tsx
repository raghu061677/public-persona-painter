import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, TrendingUp, AlertTriangle, Target } from 'lucide-react';
import { generateMLInsights } from '@/lib/analytics/ml-insights';
import { Skeleton } from '@/components/ui/skeleton';

interface MLInsight {
  type: 'trend' | 'anomaly' | 'prediction' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  data?: any;
}

interface MLInsightsPanelProps {
  analyticsData: {
    revenue: number[];
    campaigns: number[];
    clients: number[];
    occupancy: number[];
    expenses: number[];
    dates: string[];
  };
}

export function MLInsightsPanel({ analyticsData }: MLInsightsPanelProps) {
  const [insights, setInsights] = useState<MLInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInsights() {
      setLoading(true);
      try {
        const mlInsights = await generateMLInsights(analyticsData);
        setInsights(mlInsights);
      } catch (error) {
        console.error('Error generating ML insights:', error);
      } finally {
        setLoading(false);
      }
    }

    if (analyticsData.revenue.length > 0) {
      loadInsights();
    }
  }, [analyticsData]);

  const getIcon = (type: MLInsight['type']) => {
    switch (type) {
      case 'trend':
        return <TrendingUp className="h-5 w-5 text-blue-500" />;
      case 'anomaly':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'prediction':
        return <Target className="h-5 w-5 text-purple-500" />;
      case 'recommendation':
        return <Lightbulb className="h-5 w-5 text-green-500" />;
    }
  };

  const getVariant = (type: MLInsight['type']) => {
    switch (type) {
      case 'trend':
        return 'default';
      case 'anomaly':
        return 'destructive';
      case 'prediction':
        return 'secondary';
      case 'recommendation':
        return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI-Powered Insights</CardTitle>
          <CardDescription>Loading intelligent business insights...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          AI-Powered Insights
        </CardTitle>
        <CardDescription>
          Machine learning analysis of your business performance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No insights available yet. More data is needed for analysis.
          </p>
        ) : (
          insights.map((insight, index) => (
            <div
              key={index}
              className="flex gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex-shrink-0 mt-1">{getIcon(insight.type)}</div>
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-sm">{insight.title}</h4>
                  <Badge variant={getVariant(insight.type)} className="capitalize">
                    {insight.type}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{insight.description}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Confidence:</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${insight.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium">
                    {(insight.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
