import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, addMonths, isBefore, isAfter, isSameMonth } from 'date-fns';

export interface BillingPeriod {
  monthKey: string; // e.g., "2026-01"
  label: string; // e.g., "January 2026"
  periodStart: Date;
  periodEnd: Date;
  daysInPeriod: number;
  proRataFactor: number; // 0-1, where 1 = full month (30 days)
  isFirstMonth: boolean;
  isLastMonth: boolean;
  isCurrentMonth: boolean;
}

export interface CampaignBillingSummary {
  periods: BillingPeriod[];
  totalMonths: number;
  monthlyBaseRent: number;
  printingTotal: number;
  mountingTotal: number;
  gstPercent: number;
}

interface UseCampaignBillingPeriodsParams {
  startDate: string;
  endDate: string;
  totalAmount: number; // Base rent total (without printing/mounting)
  printingTotal: number;
  mountingTotal: number;
  gstPercent: number;
}

/**
 * Calculate billing periods for a campaign based on start/end dates
 * Uses OOH industry standard: 1 month = 30 days
 */
export function useCampaignBillingPeriods({
  startDate,
  endDate,
  totalAmount,
  printingTotal,
  mountingTotal,
  gstPercent,
}: UseCampaignBillingPeriodsParams): CampaignBillingSummary {
  const BILLING_CYCLE_DAYS = 30;

  const periods = useMemo(() => {
    if (!startDate || !endDate) return [];

    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();

    // If campaign duration is <= 30 days, treat it as a SINGLE pro‑rata period.
    // This avoids creating month-wise invoices for short campaigns (industry expectation).
    const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (totalDays <= BILLING_CYCLE_DAYS) {
      const proRataFactor = Math.round((totalDays / BILLING_CYCLE_DAYS) * 100) / 100;
      return [
        {
          monthKey: format(start, 'yyyy-MM'),
          label: format(start, 'MMMM yyyy'),
          periodStart: start,
          periodEnd: end,
          daysInPeriod: totalDays,
          proRataFactor,
          isFirstMonth: true,
          isLastMonth: true,
          isCurrentMonth: isSameMonth(start, today),
        },
      ];
    }

    const result: BillingPeriod[] = [];

    let currentPeriodStart = new Date(start);
    let monthIndex = 0;

    while (isBefore(currentPeriodStart, end) || isSameMonth(currentPeriodStart, end)) {
      const monthStart = startOfMonth(currentPeriodStart);
      const monthEnd = endOfMonth(currentPeriodStart);

      // Calculate actual period within campaign dates
      const periodStart = isAfter(start, monthStart) ? start : monthStart;
      const periodEnd = isBefore(end, monthEnd) ? end : monthEnd;

      // Calculate days in this period (inclusive)
      const diffTime = periodEnd.getTime() - periodStart.getTime();
      const daysInPeriod = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

      // Check if full calendar month (1st to last day)
      const isFullCalendarMonth = 
        periodStart.getDate() === 1 && 
        periodEnd.getDate() === endOfMonth(periodEnd).getDate() &&
        isSameMonth(periodStart, periodEnd);

      // Pro-rata factor: full month = 1, otherwise days/30
      const proRataFactor = isFullCalendarMonth ? 1 : daysInPeriod / BILLING_CYCLE_DAYS;

      const monthKey = format(periodStart, 'yyyy-MM');
      const label = format(periodStart, 'MMMM yyyy');
      const isFirstMonth = monthIndex === 0;
      const isCurrentMonth = isSameMonth(periodStart, today);

      result.push({
        monthKey,
        label,
        periodStart,
        periodEnd,
        daysInPeriod: isFullCalendarMonth ? 30 : daysInPeriod,
        proRataFactor: Math.round(proRataFactor * 100) / 100,
        isFirstMonth,
        isLastMonth: false, // Will be set after loop
        isCurrentMonth,
      });

      // Move to next month
      currentPeriodStart = addMonths(monthStart, 1);
      monthIndex++;

      // Safety break for very long campaigns
      if (monthIndex > 120) break;
    }

    // Mark last month
    if (result.length > 0) {
      result[result.length - 1].isLastMonth = true;
    }

    return result;
  }, [startDate, endDate]);

  // Calculate monthly base rent (total divided by sum of pro-rata factors)
  const totalProRata = periods.reduce((sum, p) => sum + p.proRataFactor, 0);
  const monthlyBaseRent = totalProRata > 0 ? totalAmount / totalProRata : 0;

  return {
    periods,
    totalMonths: periods.length,
    monthlyBaseRent: Math.round(monthlyBaseRent * 100) / 100,
    printingTotal,
    mountingTotal,
    gstPercent,
  };
}

/**
 * Calculate the amount for a specific billing period
 */
export function calculatePeriodAmount(
  period: BillingPeriod,
  monthlyBaseRent: number,
  gstPercent: number,
  includePrinting: boolean = false,
  includeMounting: boolean = false,
  printingTotal: number = 0,
  mountingTotal: number = 0
) {
  const baseRent = Math.round(monthlyBaseRent * period.proRataFactor * 100) / 100;
  const printing = includePrinting ? printingTotal : 0;
  const mounting = includeMounting ? mountingTotal : 0;
  const subtotal = baseRent + printing + mounting;
  const gstAmount = Math.round(subtotal * (gstPercent / 100) * 100) / 100;
  const total = subtotal + gstAmount;

  return {
    baseRent,
    printing,
    mounting,
    subtotal,
    gstAmount,
    total,
  };
}
