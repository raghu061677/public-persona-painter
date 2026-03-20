/**
 * In-memory Audit Store — singleton that collects DataQualityAudit issues
 * across the session so the admin Data Health Dashboard can display them.
 *
 * Non-intrusive: only captures when explicitly called. No production logging.
 * Session-scoped: resets on page reload.
 */

import type { AuditIssue, AuditSummary } from "./dataQualityAudit";

export interface AuditSnapshot {
  label: string;
  capturedAt: string; // ISO timestamp
  issues: AuditIssue[];
}

class AuditStore {
  private snapshots: AuditSnapshot[] = [];
  private listeners: Set<() => void> = new Set();
  private maxSnapshots = 200;

  /** Push a completed audit summary into the store */
  capture(summary: AuditSummary) {
    if (summary.totalIssues === 0) return;
    this.snapshots.push({
      label: summary.label,
      capturedAt: new Date().toISOString(),
      issues: [...summary.issues],
    });
    // Evict oldest if over limit
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.maxSnapshots);
    }
    this.notify();
  }

  /** Get all captured snapshots */
  getSnapshots(): readonly AuditSnapshot[] {
    return this.snapshots;
  }

  /** Get flattened list of all issues with snapshot metadata */
  getAllIssues(): Array<AuditIssue & { label: string; capturedAt: string }> {
    return this.snapshots.flatMap((s) =>
      s.issues.map((i) => ({ ...i, label: s.label, capturedAt: s.capturedAt }))
    );
  }

  /** Clear all captured data */
  clear() {
    this.snapshots = [];
    this.notify();
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }
}

/** Singleton instance */
export const auditStore = new AuditStore();
