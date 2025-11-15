import { useMemo } from 'react';

export type TrafficBand = 'Low' | 'Medium' | 'High' | 'Very High';

export interface TrafficData {
  trafficBand: TrafficBand;
  impressionsPerDay: number;
  footfallScore: number;
  peakHours: string[];
}

// Mock traffic data based on asset characteristics
export function useTrafficData(asset: any): TrafficData {
  return useMemo(() => {
    if (!asset) {
      return {
        trafficBand: 'Low',
        impressionsPerDay: 0,
        footfallScore: 0,
        peakHours: [],
      };
    }

    // Mock algorithm based on area, city, and media type
    let trafficWeight = 0;
    let impressions = 0;

    // City weights
    const cityWeights: Record<string, number> = {
      'hyderabad': 0.8,
      'bangalore': 0.9,
      'mumbai': 1.0,
      'delhi': 0.95,
      'chennai': 0.75,
    };

    // Area keywords that indicate high traffic
    const highTrafficKeywords = ['hitec', 'gachibowli', 'madhapur', 'banjara', 'kukatpally', 'begumpet', 'ameerpet', 'miyapur', 'junction', 'main road', 'highway'];
    const mediumTrafficKeywords = ['colony', 'nagar', 'metro', 'bus stop', 'station'];

    const city = asset.city?.toLowerCase() || '';
    const area = asset.area?.toLowerCase() || '';
    const location = asset.location?.toLowerCase() || '';

    // Calculate base traffic
    trafficWeight = cityWeights[city] || 0.5;

    // Area-based adjustments
    if (highTrafficKeywords.some(keyword => area.includes(keyword) || location.includes(keyword))) {
      trafficWeight += 0.3;
    } else if (mediumTrafficKeywords.some(keyword => area.includes(keyword) || location.includes(keyword))) {
      trafficWeight += 0.15;
    }

    // Media type adjustments
    const mediaType = asset.media_type?.toLowerCase() || '';
    if (mediaType.includes('unipole') || mediaType.includes('gantry')) {
      trafficWeight += 0.2;
    } else if (mediaType.includes('bus shelter')) {
      trafficWeight += 0.15;
    }

    // Illumination bonus (lit assets get more evening impressions)
    if (asset.illumination === 'Lit') {
      trafficWeight += 0.1;
    }

    // Cap at 1.0
    trafficWeight = Math.min(trafficWeight, 1.0);

    // Calculate impressions (based on size and traffic)
    const sqft = asset.total_sqft || 100;
    const baseImpressions = sqft * 50; // Base impressions per sqft
    impressions = Math.round(baseImpressions * trafficWeight * (1 + Math.random() * 0.3));

    // Determine traffic band
    let trafficBand: TrafficBand;
    if (trafficWeight >= 0.8) {
      trafficBand = 'Very High';
    } else if (trafficWeight >= 0.6) {
      trafficBand = 'High';
    } else if (trafficWeight >= 0.4) {
      trafficBand = 'Medium';
    } else {
      trafficBand = 'Low';
    }

    // Mock peak hours based on location type
    let peakHours: string[];
    if (area.includes('it') || area.includes('tech') || area.includes('hitec') || area.includes('gachibowli')) {
      peakHours = ['8-10 AM', '6-9 PM'];
    } else if (area.includes('commercial') || area.includes('market')) {
      peakHours = ['11 AM-2 PM', '5-8 PM'];
    } else if (area.includes('residential')) {
      peakHours = ['7-9 AM', '7-10 PM'];
    } else {
      peakHours = ['9 AM-12 PM', '5-8 PM'];
    }

    return {
      trafficBand,
      impressionsPerDay: impressions,
      footfallScore: Math.round(trafficWeight * 100),
      peakHours,
    };
  }, [asset]);
}

// Get traffic band color
export function getTrafficBandColor(band: TrafficBand): string {
  switch (band) {
    case 'Very High':
      return '#d50000';
    case 'High':
      return '#ff9100';
    case 'Medium':
      return '#ffd600';
    case 'Low':
      return '#00c853';
    default:
      return '#9e9e9e';
  }
}

// Get traffic band text color (for contrast)
export function getTrafficBandTextColor(band: TrafficBand): string {
  return band === 'Medium' ? '#000000' : '#ffffff';
}
