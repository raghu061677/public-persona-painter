/**
 * Common validation & normalization helpers.
 * Pure functions — no side effects, no UI dependencies.
 */

/** Normalize null / undefined / empty-string to undefined */
export function normalizeEmpty(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

/** Return true if value is null, undefined, or empty after trimming */
export function isBlank(value: string | null | undefined): boolean {
  return normalizeEmpty(value) === undefined;
}

/** Validate a UUID v4 string */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isValidUUID(value: string | null | undefined): boolean {
  return typeof value === "string" && UUID_RE.test(value);
}

/** Assert a required field is present (non-blank string or valid number) */
export function isPresent(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return !isBlank(value);
  if (typeof value === "number") return !Number.isNaN(value);
  return true;
}
