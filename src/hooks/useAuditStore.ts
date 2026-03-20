import { useSyncExternalStore } from "react";
import { auditStore } from "@/utils/auditStore";
import type { AuditIssue } from "@/utils/dataQualityAudit";

export function useAuditStore() {
  const snapshots = useSyncExternalStore(
    (cb) => auditStore.subscribe(cb),
    () => auditStore.getSnapshots()
  );

  const allIssues = useSyncExternalStore(
    (cb) => auditStore.subscribe(cb),
    () => auditStore.getAllIssues()
  );

  return { snapshots, allIssues, clear: () => auditStore.clear() };
}
