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
