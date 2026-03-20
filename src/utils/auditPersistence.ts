/**
 * Debounced persistence layer for DataQualityAudit issues.
 *
 * Batches issues and upserts them to data_quality_issues table.
 * Uses natural key (issue_type, table_name, field_name, record_id, company_id)
 * to increment occurrences and update last_seen.
 *
 * Safe: fire-and-forget, no UI blocking, catches all errors silently.
 */

import { supabase } from "@/integrations/supabase/client";
import type { AuditIssue } from "@/utils/dataQualityAudit";

const SEVERITY_MAP: Record<string, string> = {
  missing_company_id: "critical",
  orphan_reference: "high",
  negative_money: "high",
  inverted_date_range: "high",
  invalid_status: "medium",
  booking_outside_campaign: "medium",
  missing_identifier: "low",
};

interface PendingIssue extends AuditIssue {
  context: string;
  companyId?: string;
}

class AuditPersistence {
  private queue: PendingIssue[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly debounceMs = 5_000; // 5 second debounce
  private readonly maxBatchSize = 100;

  /** Queue issues for persistence. Non-blocking. */
  enqueue(issues: AuditIssue[], context: string, companyId?: string) {
    for (const issue of issues) {
      this.queue.push({ ...issue, context, companyId });
    }
    // Trim to prevent memory leak
    if (this.queue.length > 1000) {
      this.queue = this.queue.slice(-1000);
    }
    this.scheduleFlush();
  }

  private scheduleFlush() {
    if (this.timer) return; // already scheduled
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush();
    }, this.debounceMs);
  }

  private async flush() {
    if (this.queue.length === 0) return;

    // Take a batch
    const batch = this.queue.splice(0, this.maxBatchSize);

    // Deduplicate within this batch (keep last occurrence)
    const deduped = new Map<string, PendingIssue>();
    for (const item of batch) {
      const key = `${item.check}|${item.table}|${item.field}|${item.recordId}|${item.companyId || ""}`;
      deduped.set(key, item);
    }

    try {
      const now = new Date().toISOString();
      for (const item of deduped.values()) {
        await supabase.rpc("upsert_data_quality_issue" as any, {
          p_issue_type: item.check,
          p_table_name: item.table,
          p_field_name: item.field,
          p_record_id: item.recordId,
          p_raw_value: item.rawValue != null ? String(item.rawValue) : null,
          p_context: item.context,
          p_detail: item.detail,
          p_company_id: item.companyId || null,
          p_now: now,
          p_severity: SEVERITY_MAP[item.check] || "medium",
        });
      }
    } catch {
      // Silent — persistence is best-effort
    }

    // If more in queue, schedule another flush
    if (this.queue.length > 0) {
      this.scheduleFlush();
    }
  }
}

export const auditPersistence = new AuditPersistence();
