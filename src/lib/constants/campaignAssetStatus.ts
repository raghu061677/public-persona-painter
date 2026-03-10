/**
 * Campaign Asset Status — Single source of truth for execution workflow.
 *
 * Canonical statuses: Pending → Assigned → Installed → Completed → Verified
 *
 * This file defines all constants, types, metadata, transition rules,
 * and helper functions for campaign asset execution status.
 *
 * IMPORTANT: Never import status strings or helpers from any other file.
 * All status logic must flow through this module.
 */

import {
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Hammer,
  UserCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─── Canonical Status List ──────────────────────────────────────

export const CAMPAIGN_ASSET_STATUSES = [
  "Pending",
  "Assigned",
  "Installed",
  "Completed",
  "Verified",
] as const;

export type CampaignAssetStatus =
  (typeof CAMPAIGN_ASSET_STATUSES)[number];

/**
 * Loose type that accepts canonical, legacy, and case-variant values.
 * Used as input type for normalization functions.
 */
export type CampaignAssetStatusLike =
  | CampaignAssetStatus
  | "Mounted"
  | "PhotoUploaded"
  | "mounted"
  | "photo_uploaded"
  | "photo uploaded"
  | "pending"
  | "assigned"
  | "installed"
  | "completed"
  | "verified"
  | string
  | null
  | undefined;

// ─── Legacy Normalization Map ───────────────────────────────────

export const LEGACY_CAMPAIGN_ASSET_STATUS_MAP: Record<string, CampaignAssetStatus> = {
  Mounted: "Installed",
  mounted: "Installed",
  "In Progress": "Installed",
  InProgress: "Installed",
  PhotoUploaded: "Completed",
  photo_uploaded: "Completed",
  "photo uploaded": "Completed",
  "QA Pending": "Completed",
  pending: "Pending",
  assigned: "Assigned",
  installed: "Installed",
  completed: "Completed",
  verified: "Verified",
};

// ─── Status Order ───────────────────────────────────────────────

export const CAMPAIGN_ASSET_STATUS_ORDER: Record<CampaignAssetStatus, number> = {
  Pending: 1,
  Assigned: 2,
  Installed: 3,
  Completed: 4,
  Verified: 5,
};

// ─── Status Metadata ────────────────────────────────────────────

export type CampaignAssetStatusMeta = {
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  colorClass: string;
  badgeClass: string;
  sortOrder: number;
  isTerminal: boolean;
};

export const CAMPAIGN_ASSET_STATUS_META: Record<
  CampaignAssetStatus,
  CampaignAssetStatusMeta
> = {
  Pending: {
    label: "Pending",
    shortLabel: "Pending",
    description: "Asset is created but not yet assigned to operations.",
    icon: Clock3,
    colorClass: "text-slate-600",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    sortOrder: 1,
    isTerminal: false,
  },
  Assigned: {
    label: "Assigned",
    shortLabel: "Assigned",
    description: "Asset work has been assigned to the mounting team.",
    icon: UserCheck,
    colorClass: "text-blue-600",
    badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
    sortOrder: 2,
    isTerminal: false,
  },
  Installed: {
    label: "Installed",
    shortLabel: "Installed",
    description: "Flex has been mounted at site.",
    icon: Hammer,
    colorClass: "text-amber-600",
    badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
    sortOrder: 3,
    isTerminal: false,
  },
  Completed: {
    label: "Completed",
    shortLabel: "Completed",
    description: "Proof images have been uploaded and execution is submitted.",
    icon: ClipboardCheck,
    colorClass: "text-purple-600",
    badgeClass: "bg-purple-100 text-purple-700 border-purple-200",
    sortOrder: 4,
    isTerminal: false,
  },
  Verified: {
    label: "Verified",
    shortLabel: "Verified",
    description: "Proof has been approved by admin/reviewer.",
    icon: CheckCircle2,
    colorClass: "text-green-600",
    badgeClass: "bg-green-100 text-green-700 border-green-200",
    sortOrder: 5,
    isTerminal: true,
  },
};

// ─── Allowed Transitions ────────────────────────────────────────

export const CAMPAIGN_ASSET_ALLOWED_TRANSITIONS: Record<
  CampaignAssetStatus,
  CampaignAssetStatus[]
> = {
  Pending: ["Assigned"],
  Assigned: ["Installed"],
  Installed: ["Completed"],
  Completed: ["Verified", "Installed"], // Installed = rejection/reopen
  Verified: ["Completed"],             // Reopen by admin
};

// ─── Helper Functions ───────────────────────────────────────────

/**
 * Normalize any status string (canonical, legacy, or case-variant) to a canonical value.
 * Returns "Pending" for null, undefined, empty, or unrecognized values.
 */
export function normalizeCampaignAssetStatus(
  status: CampaignAssetStatusLike
): CampaignAssetStatus {
  const raw = String(status ?? "").trim();
  if (!raw) return "Pending";

  if ((CAMPAIGN_ASSET_STATUSES as readonly string[]).includes(raw)) {
    return raw as CampaignAssetStatus;
  }

  if (raw in LEGACY_CAMPAIGN_ASSET_STATUS_MAP) {
    return LEGACY_CAMPAIGN_ASSET_STATUS_MAP[raw];
  }

  return "Pending";
}

/**
 * Get full metadata for a status (normalizes first).
 */
export function getCampaignAssetStatusMeta(
  status: CampaignAssetStatusLike
): CampaignAssetStatusMeta {
  const normalized = normalizeCampaignAssetStatus(status);
  return CAMPAIGN_ASSET_STATUS_META[normalized];
}

/**
 * Check if a status is terminal (no further progression expected).
 */
export function isTerminalCampaignAssetStatus(
  status: CampaignAssetStatusLike
): boolean {
  return getCampaignAssetStatusMeta(status).isTerminal;
}

/**
 * Check if transition from one status to another is allowed.
 */
export function canTransitionCampaignAssetStatus(
  from: CampaignAssetStatusLike,
  to: CampaignAssetStatusLike
): boolean {
  const normalizedFrom = normalizeCampaignAssetStatus(from);
  const normalizedTo = normalizeCampaignAssetStatus(to);
  return CAMPAIGN_ASSET_ALLOWED_TRANSITIONS[normalizedFrom].includes(normalizedTo);
}

/**
 * Get list of statuses the current status can transition to.
 */
export function getNextAllowedCampaignAssetStatuses(
  current: CampaignAssetStatusLike
): CampaignAssetStatus[] {
  const normalized = normalizeCampaignAssetStatus(current);
  return CAMPAIGN_ASSET_ALLOWED_TRANSITIONS[normalized];
}

/**
 * Compare two statuses by sort order. Returns negative if a < b, 0 if equal, positive if a > b.
 */
export function compareCampaignAssetStatuses(
  a: CampaignAssetStatusLike,
  b: CampaignAssetStatusLike
): number {
  const statusA = normalizeCampaignAssetStatus(a);
  const statusB = normalizeCampaignAssetStatus(b);
  return CAMPAIGN_ASSET_STATUS_ORDER[statusA] - CAMPAIGN_ASSET_STATUS_ORDER[statusB];
}

/**
 * Check if current status is at least at the given target level.
 */
export function isCampaignAssetStatusAtLeast(
  current: CampaignAssetStatusLike,
  target: CampaignAssetStatusLike
): boolean {
  const currentNormalized = normalizeCampaignAssetStatus(current);
  const targetNormalized = normalizeCampaignAssetStatus(target);
  return (
    CAMPAIGN_ASSET_STATUS_ORDER[currentNormalized] >=
    CAMPAIGN_ASSET_STATUS_ORDER[targetNormalized]
  );
}

/**
 * Get options array for status dropdowns/selectors.
 */
export function getCampaignAssetStatusOptions() {
  return CAMPAIGN_ASSET_STATUSES.map((status) => ({
    value: status,
    label: CAMPAIGN_ASSET_STATUS_META[status].label,
    shortLabel: CAMPAIGN_ASSET_STATUS_META[status].shortLabel,
    description: CAMPAIGN_ASSET_STATUS_META[status].description,
    icon: CAMPAIGN_ASSET_STATUS_META[status].icon,
    colorClass: CAMPAIGN_ASSET_STATUS_META[status].colorClass,
    badgeClass: CAMPAIGN_ASSET_STATUS_META[status].badgeClass,
    sortOrder: CAMPAIGN_ASSET_STATUS_META[status].sortOrder,
  }));
}
