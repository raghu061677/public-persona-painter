 /**
  * Single Source of Truth Calculator for Campaign Financials
  * Used by: Financial Summary, Billing Summary, Invoice Generation
  * 
  * This utility computes all campaign financial totals from campaign_assets
  * using the canonical pro-rata formula: (monthly_rate / 30) × duration_days
  */
 
 import { format, differenceInCalendarMonths, startOfMonth, endOfMonth, addMonths, isBefore, isAfter, isSameMonth } from 'date-fns';
 
 const BILLING_CYCLE_DAYS = 30;
 
 export interface CampaignAsset {
   id?: string;
   asset_id?: string;
   negotiated_rate?: number | null;
   card_rate?: number | null;
   printing_charges?: number | null;
   mounting_charges?: number | null;
   booking_start_date?: string | null;
   booking_end_date?: string | null;
   start_date?: string | null;
   end_date?: string | null;
   total_sqft?: number | null;
 }
 
 export interface CampaignData {
   start_date: string;
   end_date: string;
   gst_percent?: number | null;
   billing_cycle?: string | null;
   manual_discount_amount?: number | null;
   manual_discount_reason?: string | null;
 }
 
 export interface ComputeCampaignTotalsParams {
   campaign: CampaignData;
   campaignAssets: CampaignAsset[];
   manualDiscountAmount?: number;
 }
 
 export interface BillingPeriodInfo {
   monthKey: string;
   label: string;
   periodStart: Date;
   periodEnd: Date;
   daysInPeriod: number;
   proRataFactor: number;
   isFirstMonth: boolean;
   isLastMonth: boolean;
   isCurrentMonth: boolean;
 }
 
 export interface CampaignTotalsResult {
   // Core financial values
   displayCost: number;
   printingCost: number;
   mountingCost: number;
   grossAmount: number;
   manualDiscountAmount: number;
   taxableAmount: number;
   gstRate: number;
   gstAmount: number;
   grandTotal: number;
   
   // One-time charges
   oneTimeCharges: number;
   
   // Period info
   campaignPeriodStart: Date;
   campaignPeriodEnd: Date;
   durationDays: number;
   
   // Monthly billing (only populated if billing_mode === 'monthly')
   totalMonths: number;
   monthlyDisplayRent: number;
   billingPeriods: BillingPeriodInfo[];
   
   // Asset counts
   totalAssets: number;
 }
 
 /**
  * Compute all campaign financial totals from campaign_assets
  * This is the SINGLE SOURCE OF TRUTH for all financial calculations
  */
 export function computeCampaignTotals({
   campaign,
   campaignAssets,
   manualDiscountAmount = 0,
 }: ComputeCampaignTotalsParams): CampaignTotalsResult {
   // Use campaign dates as fallback, but prefer asset-level dates
   const campaignStartDate = new Date(campaign.start_date);
   const campaignEndDate = new Date(campaign.end_date);
   
   // Calculate display cost using pro-rata formula per asset with ASSET-LEVEL dates
   // Formula: (monthly_rate / 30) × asset_duration_days for each asset
   let displayCostRaw = 0;
   let minStartDate = campaignStartDate;
   let maxEndDate = campaignEndDate;
   
   for (const asset of campaignAssets) {
     // Use asset-level dates, falling back to campaign dates
     const assetStart = asset.booking_start_date 
       ? new Date(asset.booking_start_date) 
       : (asset.start_date ? new Date(asset.start_date) : campaignStartDate);
     const assetEnd = asset.booking_end_date 
       ? new Date(asset.booking_end_date) 
       : (asset.end_date ? new Date(asset.end_date) : campaignEndDate);
     
     // Calculate this asset's duration in days (inclusive)
     const assetDurationDays = Math.ceil((assetEnd.getTime() - assetStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
     
     const monthlyRate = Number(asset.negotiated_rate) || Number(asset.card_rate) || 0;
     const proRataAmount = (monthlyRate / BILLING_CYCLE_DAYS) * assetDurationDays;
     displayCostRaw += proRataAmount;
     
     // Track min/max dates for campaign period
     if (assetStart < minStartDate) minStartDate = assetStart;
     if (assetEnd > maxEndDate) maxEndDate = assetEnd;
   }
   const displayCost = Math.round(displayCostRaw * 100) / 100;
   
   // Campaign period is the span of all asset dates
   const campaignPeriodStart = minStartDate;
   const campaignPeriodEnd = maxEndDate;
   const durationDays = Math.ceil((campaignPeriodEnd.getTime() - campaignPeriodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
   
   // Sum printing and mounting from campaign_assets
   const printingCost = campaignAssets.reduce((sum, a) => sum + (Number(a.printing_charges) || 0), 0);
   const mountingCost = campaignAssets.reduce((sum, a) => sum + (Number(a.mounting_charges) || 0), 0);
   
   // Calculate gross amount (before discount)
   const grossAmount = Math.round((displayCost + printingCost + mountingCost) * 100) / 100;
   
   // Use campaign's manual discount or provided override
   const effectiveDiscount = manualDiscountAmount !== undefined 
     ? manualDiscountAmount 
     : (Number(campaign.manual_discount_amount) || 0);
   
   // Clamp discount to not exceed gross amount
   const clampedDiscount = Math.min(Math.max(effectiveDiscount, 0), grossAmount);
   
   // Calculate taxable amount (after discount)
   const taxableAmount = Math.round((grossAmount - clampedDiscount) * 100) / 100;
   
   // GST calculation
   const gstRate = Number(campaign.gst_percent) || 0;
   const gstAmount = Math.round(taxableAmount * (gstRate / 100) * 100) / 100;
   
   // Grand total
   const grandTotal = Math.round((taxableAmount + gstAmount) * 100) / 100;
   
   // One-time charges
   const oneTimeCharges = printingCost + mountingCost;
   
   // Monthly billing info (if billing mode is monthly)
   const isMonthlyBilling = (campaign.billing_cycle || '').toLowerCase() === 'monthly';
   const billingPeriods = calculateBillingPeriods(campaignPeriodStart, campaignPeriodEnd);
   const totalMonths = billingPeriods.length;
   
   // Monthly display rent = displayCost / totalMonths (simple division, no reverse engineering)
   const monthlyDisplayRent = totalMonths > 0 ? Math.round((displayCost / totalMonths) * 100) / 100 : displayCost;
   
   return {
     displayCost,
     printingCost,
     mountingCost,
     grossAmount,
     manualDiscountAmount: clampedDiscount,
     taxableAmount,
     gstRate,
     gstAmount,
     grandTotal,
     oneTimeCharges,
     campaignPeriodStart,
     campaignPeriodEnd,
     durationDays,
     totalMonths,
     monthlyDisplayRent,
     billingPeriods,
     totalAssets: campaignAssets.length,
   };
 }
 
 /**
  * Calculate billing periods for monthly invoicing
  */
 function calculateBillingPeriods(startDate: Date, endDate: Date): BillingPeriodInfo[] {
   const today = new Date();
   
   // If campaign duration is <= 30 days, treat as single period
   const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
   if (totalDays <= BILLING_CYCLE_DAYS) {
     const proRataFactor = Math.round((totalDays / BILLING_CYCLE_DAYS) * 100) / 100;
     return [{
       monthKey: format(startDate, 'yyyy-MM'),
       label: format(startDate, 'MMMM yyyy'),
       periodStart: startDate,
       periodEnd: endDate,
       daysInPeriod: totalDays,
       proRataFactor,
       isFirstMonth: true,
       isLastMonth: true,
       isCurrentMonth: isSameMonth(startDate, today),
     }];
   }
   
   const periods: BillingPeriodInfo[] = [];
   let currentPeriodStart = new Date(startDate);
   let monthIndex = 0;
   
   while (isBefore(currentPeriodStart, endDate) || isSameMonth(currentPeriodStart, endDate)) {
     const monthStart = startOfMonth(currentPeriodStart);
     const monthEnd = endOfMonth(currentPeriodStart);
     
     const periodStart = isAfter(startDate, monthStart) ? startDate : monthStart;
     const periodEnd = isBefore(endDate, monthEnd) ? endDate : monthEnd;
     
     const diffTime = periodEnd.getTime() - periodStart.getTime();
     const daysInPeriod = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
     
     const isFullCalendarMonth = 
       periodStart.getDate() === 1 && 
       periodEnd.getDate() === endOfMonth(periodEnd).getDate() &&
       isSameMonth(periodStart, periodEnd);
     
     const proRataFactor = isFullCalendarMonth ? 1 : daysInPeriod / BILLING_CYCLE_DAYS;
     
     periods.push({
       monthKey: format(periodStart, 'yyyy-MM'),
       label: format(periodStart, 'MMMM yyyy'),
       periodStart,
       periodEnd,
       daysInPeriod: isFullCalendarMonth ? 30 : daysInPeriod,
       proRataFactor: Math.round(proRataFactor * 100) / 100,
       isFirstMonth: monthIndex === 0,
       isLastMonth: false,
       isCurrentMonth: isSameMonth(periodStart, today),
     });
     
     currentPeriodStart = addMonths(monthStart, 1);
     monthIndex++;
     
     if (monthIndex > 120) break;
   }
   
   if (periods.length > 0) {
     periods[periods.length - 1].isLastMonth = true;
   }
   
   return periods;
 }
 
 /**
  * Calculate amount for a specific billing period
  * Used for monthly invoice generation
  */
 export function calculatePeriodAmountFromTotals(
   period: BillingPeriodInfo,
   totals: CampaignTotalsResult,
   includePrinting: boolean = false,
   includeMounting: boolean = false,
 ) {
   // For single-period campaigns, the displayCost IS the period rent (already pro-rated)
   // For multi-month campaigns, divide displayCost across periods by their pro-rata factor share
   let baseRent: number;
   
   if (totals.totalMonths <= 1) {
     // Single period: displayCost is already the full pro-rated amount
     baseRent = totals.displayCost;
   } else {
     // Multi-period: calculate this period's share based on pro-rata factor
     // Sum of all proRataFactors should equal totalMonths for proper distribution
     const totalProRata = totals.billingPeriods.reduce((sum, p) => sum + p.proRataFactor, 0);
     baseRent = Math.round((totals.displayCost * period.proRataFactor / totalProRata) * 100) / 100;
   }
   
   const printing = includePrinting ? totals.printingCost : 0;
   const mounting = includeMounting ? totals.mountingCost : 0;
   
   // Apply discount - for single period, apply full discount; for multi-period, distribute proportionally
   let periodDiscountShare: number;
   
   if (totals.totalMonths <= 1) {
     // Single period: apply full discount
     periodDiscountShare = totals.manualDiscountAmount;
   } else {
     // Multi-period: distribute discount proportionally across periods
     const totalProRata = totals.billingPeriods.reduce((sum, p) => sum + p.proRataFactor, 0);
     periodDiscountShare = Math.round((totals.manualDiscountAmount * period.proRataFactor / totalProRata) * 100) / 100;
   }
   
   const subtotalBeforeDiscount = baseRent + printing + mounting;
   const subtotal = Math.round((subtotalBeforeDiscount - periodDiscountShare) * 100) / 100;
   const gstAmount = Math.round(subtotal * (totals.gstRate / 100) * 100) / 100;
   const total = subtotal + gstAmount;
   
   return {
     baseRent,
     printing,
     mounting,
     discount: periodDiscountShare,
     subtotal,
     gstAmount,
     total,
   };
 }