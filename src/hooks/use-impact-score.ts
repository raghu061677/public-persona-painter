import { useMemo } from 'react';
import { useTrafficData } from './use-traffic-data';

export interface ImpactScore {
  overall: number;
  breakdown: {
    qualityScore: number;
    trafficWeight: number;
    illuminationBonus: number;
    corridorPriority: number;
    visibilityScore: number;
  };
  rating: 'Excellent' | 'Good' | 'Average' | 'Poor';
  color: string;
}

// Calculate AI Impact Score (0-100) based on multiple factors
export function useImpactScore(asset: any): ImpactScore {
  const trafficData = useTrafficData(asset);

  return useMemo(() => {
    if (!asset) {
      return {
        overall: 0,
        breakdown: {
          qualityScore: 0,
          trafficWeight: 0,
          illuminationBonus: 0,
          corridorPriority: 0,
          visibilityScore: 0,
        },
        rating: 'Poor',
        color: '#e74c3c',
      };
    }

    // 1. Quality Score (0-30 points) - based on image availability
    let qualityScore = 0;
    if (asset.primary_photo_url) {
      qualityScore = 20 + Math.random() * 10; // Mock: 20-30 points
    } else {
      qualityScore = 10; // No images = low quality
    }

    // 2. Traffic Weight (0-30 points)
    const trafficWeightMap = {
      'Very High': 30,
      'High': 23,
      'Medium': 16,
      'Low': 8,
    };
    const trafficWeight = trafficWeightMap[trafficData.trafficBand] || 8;

    // 3. Illumination Bonus (0-15 points)
    const illuminationBonus = asset.illumination_type && asset.illumination_type !== 'Non-lit' ? 15 : 5;

    // 4. Corridor Priority (0-15 points)
    let corridorPriority = 0;
    const area = asset.area?.toLowerCase() || '';
    const premiumCorridors = ['hitec city', 'gachibowli', 'madhapur', 'banjara hills', 'jubilee hills', 'begumpet', 'ameerpet'];
    
    if (premiumCorridors.some(corridor => area.includes(corridor))) {
      corridorPriority = 15;
    } else if (area.includes('main road') || area.includes('junction')) {
      corridorPriority = 10;
    } else {
      corridorPriority = 5;
    }

    // 5. Visibility Score (0-10 points) - based on direction, size
    let visibilityScore = 5;
    const mediaType = asset.media_type?.toLowerCase() || '';
    if (mediaType.includes('unipole') || mediaType.includes('gantry')) {
      visibilityScore += 5; // High visibility formats
    } else if (mediaType.includes('bus shelter')) {
      visibilityScore += 3;
    }

    // Calculate overall score
    const overall = Math.min(
      Math.round(qualityScore + trafficWeight + illuminationBonus + corridorPriority + visibilityScore),
      100
    );

    // Determine rating
    let rating: 'Excellent' | 'Good' | 'Average' | 'Poor';
    let color: string;
    
    if (overall >= 80) {
      rating = 'Excellent';
      color = '#2ecc71';
    } else if (overall >= 60) {
      rating = 'Good';
      color = '#f1c40f';
    } else if (overall >= 40) {
      rating = 'Average';
      color = '#e67e22';
    } else {
      rating = 'Poor';
      color = '#e74c3c';
    }

    return {
      overall,
      breakdown: {
        qualityScore: Math.round(qualityScore),
        trafficWeight,
        illuminationBonus,
        corridorPriority,
        visibilityScore: Math.round(visibilityScore),
      },
      rating,
      color,
    };
  }, [asset, trafficData.trafficBand]);
}

// Calculate aggregate impact score for multiple assets
export function calculateAggregateImpact(assets: any[]): {
  avgScore: number;
  excellentCount: number;
  goodCount: number;
  averageCount: number;
  poorCount: number;
} {
  if (!assets || assets.length === 0) {
    return {
      avgScore: 0,
      excellentCount: 0,
      goodCount: 0,
      averageCount: 0,
      poorCount: 0,
    };
  }

  let totalScore = 0;
  let excellentCount = 0;
  let goodCount = 0;
  let averageCount = 0;
  let poorCount = 0;

  // Note: This is a simplified version - in real implementation, 
  // we'd use the actual hook for each asset
  assets.forEach(asset => {
    // Mock score calculation
    const score = 50 + Math.random() * 40; // 50-90
    totalScore += score;

    if (score >= 80) excellentCount++;
    else if (score >= 60) goodCount++;
    else if (score >= 40) averageCount++;
    else poorCount++;
  });

  return {
    avgScore: Math.round(totalScore / assets.length),
    excellentCount,
    goodCount,
    averageCount,
    poorCount,
  };
}
