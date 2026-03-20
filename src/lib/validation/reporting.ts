/**
 * Reporting-specific helpers that combine money, date, and status validation.
 * Used in dashboards, reports, and analytics modules.
 */

import { safePositiveMoney, safeMoney, isMoneyAnomaly } from "./money";
import { safeDate, isInvertedDateRange } from "./date";

export { safePositiveMoney, safeMoney, safeDate, isInvertedDateRange };

/**
 * Safely sum an array of monetary values, clamping each to non-negative.
 */
export function safeRevenueSum(values: unknown[]): number {
  return values.reduce<number>((sum, v) => sum + safePositiveMoney(v), 0);
}

/**
 * Compute profit = revenue - cost, where revenue is non-negative.
 */
export function safeProfit(revenue: unknown, cost: unknown): number {
  return safePositiveMoney(revenue) - safeMoney(cost);
}

/**
 * Compute margin percent safely (returns 0 if revenue <= 0).
 */
export function safeMarginPercent(revenue: number, profit: number): number {
  return revenue > 0 ? (profit / revenue) * 100 : 0;
}

/**
 * Validate a row for basic reporting integrity.
 * Returns an array of issue descriptions (empty = clean).
 */
export function validateReportingRow(row: {
  revenue?: unknown;
  cost?: unknown;
  start_date?: unknown;
  end_date?: unknown;
  company_id?: unknown;
  id?: unknown;
}): string[] {
  const issues: string[] = [];
  if (row.revenue !== undefined && isMoneyAnomaly(safeMoney(row.revenue))) issues.push("anomalous_revenue");
  if (row.cost !== undefined && isMoneyAnomaly(safeMoney(row.cost))) issues.push("anomalous_cost");
  if (isInvertedDateRange(row.start_date as string, row.end_date as string)) issues.push("inverted_date_range");
  if (row.company_id === null || row.company_id === undefined || row.company_id === "") issues.push("missing_company_id");
  return issues;
}
