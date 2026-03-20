/**
 * Monetary value validation and normalization.
 * All helpers are pure — no side effects.
 */

/** Parse to a finite number, returning 0 for any non-numeric input */
export function safeMoney(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = parseFloat(value.replace(/[₹,\s]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

/** Parse to a non-negative monetary value, clamping negatives to 0 */
export function safePositiveMoney(value: unknown): number {
  return Math.max(0, safeMoney(value));
}

/** Normalize a percentage to 0–100 range */
export function safePercent(value: unknown): number {
  const n = safeMoney(value);
  return Math.max(0, Math.min(100, n));
}

/** Check if a monetary value looks suspicious (negative or unreasonably large) */
export function isMoneyAnomaly(value: number, maxThreshold = 1_000_000_000): boolean {
  return value < 0 || value > maxThreshold || !Number.isFinite(value);
}
