import { useSyncExternalStore, useRef } from "react";
import { auditStore } from "@/utils/auditStore";

/**
 * Memoised snapshot helper – avoids creating new array references
 * on every call to getAllIssues(), which would cause
 * useSyncExternalStore to loop infinitely (React error #185).
 */
let cachedAllIssues: ReturnType<typeof auditStore.getAllIssues> | null = null;
let cachedSnapshots: ReturnType<typeof auditStore.getSnapshots> | null = null;

function getSnapshotsSnapshot() {
  const current = auditStore.getSnapshots();
  if (cachedSnapshots !== current) {
    cachedSnapshots = current;
  }
  return cachedSnapshots;
}

function getAllIssuesSnapshot() {
  // Only rebuild when the underlying snapshots array has changed
  const currentSnapshots = auditStore.getSnapshots();
  if (cachedSnapshots !== currentSnapshots || cachedAllIssues === null) {
    cachedSnapshots = currentSnapshots;
    cachedAllIssues = auditStore.getAllIssues();
  }
  return cachedAllIssues;
}

// Reset caches when store notifies
auditStore.subscribe(() => {
  cachedSnapshots = null;
  cachedAllIssues = null;
});

export function useAuditStore() {
  const snapshots = useSyncExternalStore(
    (cb) => auditStore.subscribe(cb),
    () => getSnapshotsSnapshot()
  );

  const allIssues = useSyncExternalStore(
    (cb) => auditStore.subscribe(cb),
    () => getAllIssuesSnapshot()
  );

  return { snapshots, allIssues, clear: () => auditStore.clear() };
}
