/**
 * Effective Pricing Utility - Single Source of Truth for Go-Ads 360° Pricing
 * 
 * This module provides a consistent way to determine the effective selling price
 * across all modules: Plans, Campaigns, Exports, and Finance.
 * 
 * Priority Order:
 * 1. negotiated_price / negotiated_rate (if > 0)
 * 2. sales_price (if > 0) 
 * 3. final_price (if > 0)
 * 4. card_rate (fallback)
 */

/**
 * Interface for plan item pricing fields
 */
export interface PlanItemPricing {
  card_rate?: number | null;
  sales_price?: number | null;
  negotiated_price?: number | null;
  negotiated_rate?: number | null;
  final_price?: number | null;
}

/**
 * Interface for campaign item pricing fields
 */
export interface CampaignItemPricing {
  card_rate?: number | null;
  negotiated_rate?: number | null;
  final_price?: number | null;
  total_price?: number | null;
}

/**
 * Interface for asset pricing state (used in UI)
 */
export interface AssetPricingState {
  negotiated_price?: number;
  sales_price?: number;
  printing_charges?: number;
  mounting_charges?: number;
  discount_value?: number;
  discount_percent?: number;
  discount_amount?: number;
  pro_rata?: number;
  profit_value?: number;
  profit_percent?: number;
}

/**
 * Get the effective selling price from a plan item
 * Priority: negotiated_price > sales_price > card_rate
 */
export function getEffectivePlanPrice(item: PlanItemPricing): number {
  // Check negotiated_price first (UI state field name)
  if (item.negotiated_price != null && item.negotiated_price > 0) {
    return item.negotiated_price;
  }
  // Check negotiated_rate (alternative field name)
  if (item.negotiated_rate != null && item.negotiated_rate > 0) {
    return item.negotiated_rate;
  }
  // Check sales_price (database field name)
  if (item.sales_price != null && item.sales_price > 0) {
    return item.sales_price;
  }
  // Fallback to card_rate
  return item.card_rate || 0;
}

/**
 * Get the effective selling price from a campaign item
 * Priority: negotiated_rate > final_price > card_rate
 */
export function getEffectiveCampaignPrice(item: CampaignItemPricing): number {
  // Check negotiated_rate first (main campaign field)
  if (item.negotiated_rate != null && item.negotiated_rate > 0) {
    return item.negotiated_rate;
  }
  // Check final_price
  if (item.final_price != null && item.final_price > 0) {
    return item.final_price;
  }
  // Fallback to card_rate
  return item.card_rate || 0;
}

/**
 * Get the effective price from UI pricing state
 * Normalizes different field names used in React state
 */
export function getEffectiveUIPrice(
  pricing: AssetPricingState | undefined,
  fallbackCardRate: number
): number {
  if (!pricing) return fallbackCardRate;
  
  // Check negotiated_price first (primary UI field)
  if (pricing.negotiated_price != null && pricing.negotiated_price > 0) {
    return pricing.negotiated_price;
  }
  // Check sales_price (alternative field name)
  if (pricing.sales_price != null && pricing.sales_price > 0) {
    return pricing.sales_price;
  }
  // Fallback to card rate
  return fallbackCardRate;
}

/**
 * Normalize pricing state to use consistent field names
 * Call this when loading plan items from database
 */
export function normalizePricingState(
  dbItem: PlanItemPricing,
  cardRate: number
): AssetPricingState {
  const effectivePrice = getEffectivePlanPrice({ ...dbItem, card_rate: cardRate });
  
  return {
    // Set both field names for compatibility
    negotiated_price: effectivePrice,
    sales_price: effectivePrice,
    printing_charges: 0,
    mounting_charges: 0,
    discount_value: 0,
    discount_amount: 0,
  };
}

/**
 * Convert UI pricing state to database format for plan_items
 * Ensures sales_price is correctly set
 */
export function toDatabasePricing(
  pricing: AssetPricingState | undefined,
  cardRate: number
): {
  sales_price: number;
  card_rate: number;
  printing_charges: number;
  mounting_charges: number;
} {
  const effectivePrice = getEffectiveUIPrice(pricing, cardRate);
  
  return {
    sales_price: effectivePrice, // This is the canonical DB field
    card_rate: cardRate,
    printing_charges: pricing?.printing_charges || 0,
    mounting_charges: pricing?.mounting_charges || 0,
  };
}

// =============================================================================
// PRINTING COST CALCULATION - SINGLE SOURCE OF TRUTH
// =============================================================================

/**
 * Interface for asset with size information
 */
export interface AssetWithSize {
  total_sqft?: number | null;
  areaSqft?: number | null;
  width?: number | null;
  height?: number | null;
  dimensions?: string | null;
}

/**
 * Result of printing cost calculation
 */
export interface PrintingCostResult {
  sqft: number;
  rate: number;
  cost: number;
  error: string | null;
}

/**
 * Parse dimensions string to calculate total square feet
 * Supports formats: "40x20", "40 X 20", "25x5 - 12x3" (multi-face)
 */
export function parseDimensionsToSqft(dimensions: string | null | undefined): number {
  if (!dimensions || typeof dimensions !== 'string') return 0;
  
  const cleaned = dimensions.trim();
  
  // Split by dash for multi-face
  const faceStrings = cleaned.split(/\s*[-–—]\s*/).filter(f => f.trim());
  
  let totalSqft = 0;
  
  for (const faceStr of faceStrings) {
    const separators = /[xX*×\s]+/;
    const parts = faceStr.split(separators).filter(p => p).map(p => parseFloat(p.trim()));
    
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[0] > 0 && parts[1] > 0) {
      totalSqft += parts[0] * parts[1];
    }
  }
  
  return Math.round(totalSqft);
}

/**
 * Get the effective square footage from an asset
 * Priority: total_sqft > areaSqft > parsed from dimensions
 */
export function getAssetSqft(asset: AssetWithSize): number {
  // Priority 1: total_sqft field
  if (asset.total_sqft != null && asset.total_sqft > 0) {
    return asset.total_sqft;
  }
  
  // Priority 2: areaSqft field
  if (asset.areaSqft != null && asset.areaSqft > 0) {
    return asset.areaSqft;
  }
  
  // Priority 3: Calculate from width x height
  if (asset.width != null && asset.height != null && asset.width > 0 && asset.height > 0) {
    return Math.round(asset.width * asset.height);
  }
  
  // Priority 4: Parse from dimensions string
  if (asset.dimensions) {
    return parseDimensionsToSqft(asset.dimensions);
  }
  
  return 0;
}

/**
 * SINGLE SOURCE OF TRUTH: Calculate printing cost
 * 
 * Formula: Printing Cost = SQFT × Rate (₹/SQFT)
 * 
 * This function MUST be used everywhere printing cost is calculated:
 * - Plan Builder UI
 * - Plan Save
 * - Plan → Campaign Conversion
 * - Campaign Edit
 * - Exports (PDF/Excel/PPT)
 * 
 * @param asset - Asset with size information
 * @param printingRatePerSqft - Rate in ₹ per square foot
 * @returns PrintingCostResult with sqft, rate, cost, and any error
 */
export function calculatePrintingCost(
  asset: AssetWithSize,
  printingRatePerSqft: number | null | undefined
): PrintingCostResult {
  const sqft = getAssetSqft(asset);
  const rate = printingRatePerSqft ?? 0;
  
  // Validation: SQFT must be positive
  if (sqft <= 0) {
    return {
      sqft: 0,
      rate,
      cost: 0,
      error: "Asset size missing. Cannot calculate printing cost."
    };
  }
  
  // Validation: Rate must be non-negative
  if (rate < 0) {
    return {
      sqft,
      rate: 0,
      cost: 0,
      error: "Printing rate cannot be negative."
    };
  }
  
  // If rate is 0 or empty, cost is 0 (not an error)
  if (rate === 0) {
    return {
      sqft,
      rate: 0,
      cost: 0,
      error: null
    };
  }
  
  // Calculate: SQFT × Rate, round to 2 decimal places
  const cost = Math.round((sqft * rate) * 100) / 100;
  
  return {
    sqft,
    rate,
    cost,
    error: null
  };
}

/**
 * SINGLE SOURCE OF TRUTH: Calculate mounting/installation cost
 * 
 * Formula: Mounting Cost = SQFT × Rate (₹/SQFT)
 * 
 * Same logic as printing cost but for mounting/installation
 */
export function calculateMountingCost(
  asset: AssetWithSize,
  mountingRatePerSqft: number | null | undefined
): PrintingCostResult {
  const sqft = getAssetSqft(asset);
  const rate = mountingRatePerSqft ?? 0;
  
  if (sqft <= 0) {
    return {
      sqft: 0,
      rate,
      cost: 0,
      error: "Asset size missing. Cannot calculate mounting cost."
    };
  }
  
  if (rate < 0) {
    return {
      sqft,
      rate: 0,
      cost: 0,
      error: "Mounting rate cannot be negative."
    };
  }
  
  if (rate === 0) {
    return {
      sqft,
      rate: 0,
      cost: 0,
      error: null
    };
  }
  
  const cost = Math.round((sqft * rate) * 100) / 100;
  
  return {
    sqft,
    rate,
    cost,
    error: null
  };
}
