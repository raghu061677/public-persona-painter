/**
 * Status Normalizer — maps legacy status values to canonical ones.
 * "Mounted" → "Installed" is the primary normalization.
 */

export function normalizeInstallationStatus(status: string | null | undefined): string {
  if (!status) return status ?? "Pending";
  if (status === "Mounted") return "Installed";
  return status;
}

/**
 * Check if a status represents the "installed/mounted" state.
 * Handles both canonical "Installed" and legacy "Mounted".
 */
export function isInstalledStatus(status: string | null | undefined): boolean {
  return status === "Installed" || status === "Mounted";
}
