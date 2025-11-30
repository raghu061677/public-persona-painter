import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, TrendingUp, Eye, Zap, MapPin, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateAggregateImpact } from '@/hooks/use-impact-score';

interface GodModeHUDProps {
  assets: any[];
  isVisible?: boolean;
}

export function GodModeHUD({ assets, isVisible = true }: GodModeHUDProps) {
  const [stats, setStats] = useState({
    totalAssets: 0,
    avgImpactScore: 0,
    avgQualityScore: 0,
    totalImpressions: 0,
    premiumPercentage: 0,
    litPercentage: 0,
  });

  useEffect(() => {
    if (!assets || assets.length === 0) {
      setStats({
        totalAssets: 0,
        avgImpactScore: 0,
        avgQualityScore: 0,
        totalImpressions: 0,
        premiumPercentage: 0,
        litPercentage: 0,
      });
      return;
    }

    // Calculate aggregate statistics
    const totalAssets = assets.length;
    
    // Mock impact scores (in real implementation, would use actual hook)
    const { avgScore } = calculateAggregateImpact(assets);
    
    // Mock quality score (70-95)
    const avgQualityScore = Math.round(70 + Math.random() * 25);
    
    // Estimate total daily impressions (mock)
    const totalImpressions = assets.reduce((sum, asset) => {
      const sqft = asset.total_sqft || 100;
      return sum + (sqft * 50 * (0.5 + Math.random() * 0.5));
    }, 0);
    
    // Premium corridors percentage
    const premiumCorridors = ['hitec city', 'gachibowli', 'madhapur', 'banjara hills', 'jubilee hills'];
    const premiumCount = assets.filter(a => {
      const area = a.area?.toLowerCase() || '';
      return premiumCorridors.some(c => area.includes(c));
    }).length;
    const premiumPercentage = Math.round((premiumCount / totalAssets) * 100);
    
    // Lit assets percentage
    const litCount = assets.filter(a => a.illumination_type && a.illumination_type !== 'Non-lit').length;
    const litPercentage = Math.round((litCount / totalAssets) * 100);

    setStats({
      totalAssets,
      avgImpactScore: avgScore,
      avgQualityScore,
      totalImpressions: Math.round(totalImpressions),
      premiumPercentage,
      litPercentage,
    });
  }, [assets]);

  if (!isVisible) return null;

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  return (
    <Card className={cn(
      "fixed top-20 right-6 z-40 p-3 shadow-lg border-2",
      "bg-card/95 backdrop-blur-sm",
      "w-80"
    )}>
      <div className="flex items-center gap-2 mb-2 pb-2 border-b">
        <Activity className="h-4 w-4 text-primary" />
        <span className="font-semibold text-sm">God Mode Analytics</span>
        <Badge variant="secondary" className="ml-auto text-xs">
          Live
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Total Assets */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Total Assets</span>
          </div>
          <p className="text-lg font-bold">{stats.totalAssets}</p>
        </div>

        {/* Avg Impact Score */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Impact Score</span>
          </div>
          <div className="flex items-baseline gap-1">
            <p className="text-lg font-bold">{stats.avgImpactScore}</p>
            <span className="text-xs text-muted-foreground">/100</span>
          </div>
        </div>

        {/* Avg Quality Score */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Quality</span>
          </div>
          <div className="flex items-baseline gap-1">
            <p className="text-lg font-bold">{stats.avgQualityScore}</p>
            <span className="text-xs text-muted-foreground">/100</span>
          </div>
        </div>

        {/* Total Impressions */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Est. Daily</span>
          </div>
          <p className="text-lg font-bold">{formatNumber(stats.totalImpressions)}</p>
        </div>

        {/* Premium % */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="h-3.5 w-3.5 rounded-full p-0 flex items-center justify-center">
              <span className="text-[8px]">★</span>
            </Badge>
            <span className="text-xs text-muted-foreground">Premium</span>
          </div>
          <p className="text-lg font-bold">{stats.premiumPercentage}%</p>
        </div>

        {/* Lit % */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <Lightbulb className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Lit</span>
          </div>
          <p className="text-lg font-bold">{stats.litPercentage}%</p>
        </div>
      </div>

      {/* Score Visualization Bar */}
      <div className="mt-3 pt-2 border-t">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">Overall Performance</span>
          <span className="text-xs font-medium">
            {stats.avgImpactScore >= 80 ? 'Excellent' : 
             stats.avgImpactScore >= 60 ? 'Good' : 
             stats.avgImpactScore >= 40 ? 'Average' : 'Needs Attention'}
          </span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full transition-all duration-500",
              stats.avgImpactScore >= 80 ? "bg-green-500" :
              stats.avgImpactScore >= 60 ? "bg-yellow-500" :
              stats.avgImpactScore >= 40 ? "bg-orange-500" : "bg-red-500"
            )}
            style={{ width: `${stats.avgImpactScore}%` }}
          />
        </div>
      </div>
    </Card>
  );
}
