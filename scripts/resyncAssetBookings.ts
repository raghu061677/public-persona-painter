/**
 * Backfill / Repair Script — Resync All Media Asset Booking States
 *
 * This script iterates over all media_assets and runs the sync engine
 * to repair stale status, booking caches, and availability fields.
 *
 * Usage (from browser console or as a one-time admin action):
 *   1. Import and call resyncAllAssets()
 *   2. Or trigger from an admin settings page
 *
 * This is safe to run multiple times — it's idempotent.
 */

import { supabase } from "@/integrations/supabase/client";
import { syncMediaAssetBookingState } from "@/lib/availability/syncAssetStatus";

export async function resyncAllAssets(options?: {
  batchSize?: number;
  onProgress?: (done: number, total: number) => void;
}) {
  const batchSize = options?.batchSize || 20;
  const onProgress = options?.onProgress;

  console.log("[resyncAssetBookings] Starting full asset resync...");

  // Fetch all asset IDs
  const { data: assets, error } = await supabase
    .from("media_assets")
    .select("id")
    .order("id");

  if (error) {
    console.error("[resyncAssetBookings] Failed to fetch assets:", error);
    throw error;
  }

  const allIds = (assets || []).map((a) => a.id);
  console.log(`[resyncAssetBookings] Found ${allIds.length} assets to sync`);

  let synced = 0;
  let errors = 0;

  for (let i = 0; i < allIds.length; i += batchSize) {
    const batch = allIds.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (id) => {
        try {
          const result = await syncMediaAssetBookingState(id);
          return result;
        } catch (err) {
          console.error(`[resyncAssetBookings] Error syncing ${id}:`, err);
          return { assetId: id, newStatus: "Error", error: String(err) };
        }
      })
    );

    const batchErrors = results.filter((r) => r.error);
    synced += batch.length;
    errors += batchErrors.length;

    onProgress?.(synced, allIds.length);
    console.log(
      `[resyncAssetBookings] Progress: ${synced}/${allIds.length} (${batchErrors.length} errors in batch)`
    );
  }

  const summary = {
    total: allIds.length,
    synced,
    errors,
    completedAt: new Date().toISOString(),
  };

  console.log("[resyncAssetBookings] Complete:", summary);
  return summary;
}
