/**
 * ML-powered analytics insights using Lovable AI
 */

interface AnalyticsData {
  revenue: number[];
  campaigns: number[];
  clients: number[];
  occupancy: number[];
  expenses: number[];
  dates: string[];
}

interface MLInsight {
  type: 'trend' | 'anomaly' | 'prediction' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  data?: any;
}

export async function generateMLInsights(data: AnalyticsData): Promise<MLInsight[]> {
  const insights: MLInsight[] = [];

  // Revenue trend analysis
  const revenueTrend = analyzeTrend(data.revenue);
  if (revenueTrend.isSignificant) {
    insights.push({
      type: 'trend',
      title: `Revenue ${revenueTrend.direction === 'up' ? 'Growth' : 'Decline'} Detected`,
      description: `Revenue has ${revenueTrend.direction === 'up' ? 'increased' : 'decreased'} by ${revenueTrend.percentage.toFixed(1)}% over the last period`,
      confidence: revenueTrend.confidence,
      data: { trend: revenueTrend },
    });
  }

  // Anomaly detection
  const anomalies = detectAnomalies(data.revenue);
  anomalies.forEach((anomaly) => {
    insights.push({
      type: 'anomaly',
      title: 'Unusual Revenue Pattern',
      description: `Detected ${anomaly.type} on ${data.dates[anomaly.index]}`,
      confidence: anomaly.confidence,
      data: { anomaly },
    });
  });

  // Occupancy optimization
  const avgOccupancy = data.occupancy.reduce((a, b) => a + b, 0) / data.occupancy.length;
  if (avgOccupancy < 70) {
    insights.push({
      type: 'recommendation',
      title: 'Low Asset Utilization',
      description: `Current occupancy rate is ${avgOccupancy.toFixed(1)}%. Consider targeted marketing or pricing adjustments to increase bookings.`,
      confidence: 0.85,
      data: { avgOccupancy },
    });
  }

  // Revenue prediction
  const prediction = predictNextPeriod(data.revenue);
  insights.push({
    type: 'prediction',
    title: 'Revenue Forecast',
    description: `Expected revenue for next period: ₹${prediction.value.toLocaleString('en-IN')} (±${prediction.margin.toFixed(1)}%)`,
    confidence: prediction.confidence,
    data: { prediction },
  });

  // Cost optimization
  const expenseRatio = data.expenses[data.expenses.length - 1] / data.revenue[data.revenue.length - 1];
  if (expenseRatio > 0.4) {
    insights.push({
      type: 'recommendation',
      title: 'High Expense Ratio',
      description: `Operating expenses are ${(expenseRatio * 100).toFixed(1)}% of revenue. Review cost optimization opportunities.`,
      confidence: 0.9,
      data: { expenseRatio },
    });
  }

  return insights;
}

function analyzeTrend(data: number[]): {
  direction: 'up' | 'down' | 'stable';
  percentage: number;
  isSignificant: boolean;
  confidence: number;
} {
  if (data.length < 2) {
    return { direction: 'stable', percentage: 0, isSignificant: false, confidence: 0 };
  }

  const first = data.slice(0, Math.floor(data.length / 2));
  const second = data.slice(Math.floor(data.length / 2));

  const avgFirst = first.reduce((a, b) => a + b, 0) / first.length;
  const avgSecond = second.reduce((a, b) => a + b, 0) / second.length;

  const percentage = ((avgSecond - avgFirst) / avgFirst) * 100;
  const isSignificant = Math.abs(percentage) > 10;

  return {
    direction: percentage > 0 ? 'up' : percentage < 0 ? 'down' : 'stable',
    percentage: Math.abs(percentage),
    isSignificant,
    confidence: Math.min(0.95, 0.5 + Math.abs(percentage) / 100),
  };
}

function detectAnomalies(data: number[]): Array<{
  index: number;
  type: 'spike' | 'drop';
  confidence: number;
}> {
  const anomalies: Array<{ index: number; type: 'spike' | 'drop'; confidence: number }> = [];

  if (data.length < 3) return anomalies;

  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const stdDev = Math.sqrt(
    data.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / data.length
  );

  data.forEach((value, index) => {
    const zScore = Math.abs((value - mean) / stdDev);
    if (zScore > 2) {
      anomalies.push({
        index,
        type: value > mean ? 'spike' : 'drop',
        confidence: Math.min(0.95, zScore / 3),
      });
    }
  });

  return anomalies;
}

function predictNextPeriod(data: number[]): {
  value: number;
  margin: number;
  confidence: number;
} {
  if (data.length < 2) {
    return { value: data[0] || 0, margin: 50, confidence: 0.3 };
  }

  // Simple linear regression
  const n = data.length;
  const xMean = (n - 1) / 2;
  const yMean = data.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;

  data.forEach((y, x) => {
    numerator += (x - xMean) * (y - yMean);
    denominator += Math.pow(x - xMean, 2);
  });

  const slope = numerator / denominator;
  const intercept = yMean - slope * xMean;

  const prediction = slope * n + intercept;
  const variance = data.reduce((sum, value) => sum + Math.pow(value - yMean, 2), 0) / n;
  const margin = (Math.sqrt(variance) / yMean) * 100;

  return {
    value: Math.max(0, prediction),
    margin: Math.min(50, margin),
    confidence: Math.max(0.5, 1 - margin / 100),
  };
}

export async function generateAIRecommendations(
  campaignData: any[],
  assetData: any[]
): Promise<string[]> {
  const recommendations: string[] = [];

  // Analyze campaign performance
  const completedCampaigns = campaignData.filter((c) => c.status === 'Completed');
  const avgCampaignValue =
    completedCampaigns.length > 0
      ? completedCampaigns.reduce((sum, c) => sum + (Number(c.total_amount) || 0), 0) /
        completedCampaigns.length
      : 0;

  if (avgCampaignValue > 0) {
    recommendations.push(
      `Focus on campaigns valued above ₹${(avgCampaignValue * 1.2).toLocaleString('en-IN')} for better ROI`
    );
  }

  // Asset optimization
  const lowPerformingAssets = assetData.filter((a) => {
    const bookingRate = (Number(a.total_bookings) || 0) / 12;
    return bookingRate < 0.3;
  });

  if (lowPerformingAssets.length > 0) {
    recommendations.push(
      `${lowPerformingAssets.length} assets have low utilization. Consider repricing or targeted marketing.`
    );
  }

  // Seasonal patterns
  const monthlyRevenue = campaignData.reduce((acc, campaign) => {
    const month = new Date(campaign.start_date).getMonth();
    acc[month] = (acc[month] || 0) + (Number(campaign.total_amount) || 0);
    return acc;
  }, {} as Record<number, number>);

  const peakMonths = Object.entries(monthlyRevenue)
    .sort(([, a], [, b]) => Number(b) - Number(a))
    .slice(0, 3)
    .map(([month]) => new Date(2000, parseInt(month), 1).toLocaleString('en-IN', { month: 'long' }));

  if (peakMonths.length > 0) {
    recommendations.push(
      `Peak booking months are ${peakMonths.join(', ')}. Plan inventory and campaigns accordingly.`
    );
  }

  return recommendations;
}
