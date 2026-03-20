/**
 * Generalized Data Quality Audit System
 *
 * Tracks integrity issues across reporting and core business modules.
 * Dev-mode only logging — zero production noise.
 *
 * Check types:
 *  - negative_money: negative monetary values
 *  - invalid_status: status not in canonical set
 *  - missing_company_id: null/empty company_id
 *  - orphan_reference: related entity not found after lookup
 *  - inverted_date_range: start > end
 *  - booking_outside_campaign: booking dates outside parent campaign
 *  - missing_identifier: null/empty critical ID field
 */

import { isCanonicalStatus } from "@/lib/validation/status";
import { safeMoney } from "@/lib/validation/money";
import { safeDate } from "@/lib/validation/date";

export type AuditCheckType =
  | "negative_money"
  | "invalid_status"
  | "missing_company_id"
  | "orphan_reference"
  | "inverted_date_range"
  | "booking_outside_campaign"
  | "missing_identifier";

export interface AuditIssue {
  check: AuditCheckType;
  table: string;
  field: string;
  recordId: string;
  detail: string;
  rawValue?: unknown;
}

export interface AuditSummary {
  label: string;
  totalIssues: number;
  byCheck: Record<string, number>;
  byTable: Record<string, number>;
  issues: AuditIssue[];
}

const IS_DEV = import.meta.env.DEV;

export class DataQualityAudit {
  private issues: AuditIssue[] = [];

  private add(issue: AuditIssue) {
    this.issues.push(issue);
  }

  // ── Monetary Checks ──

  /** Clamp to non-negative and record if negative. Returns clamped value. */
  clampMoney(
    value: unknown,
    table: string,
    field: string,
    recordId: string,
  ): number {
    const n = safeMoney(value);
    if (n < 0) {
      this.add({
        check: "negative_money",
        table,
        field,
        recordId,
        detail: `Negative value ${n} clamped to 0`,
        rawValue: n,
      });
    }
    return Math.max(0, n);
  }

  // ── Status Checks ──

  /** Flag if status is not in the provided canonical set */
  checkStatus(
    value: string | null | undefined,
    canonicalSet: readonly string[],
    table: string,
    recordId: string,
    field = "status",
  ): void {
    if (!isCanonicalStatus(value, canonicalSet)) {
      this.add({
        check: "invalid_status",
        table,
        field,
        recordId,
        detail: `"${value}" not in [${canonicalSet.join(", ")}]`,
        rawValue: value,
      });
    }
  }

  // ── Reference Checks ──

  /** Flag orphan reference when a related entity was not found */
  checkOrphanRef(
    refId: string | null | undefined,
    found: boolean,
    table: string,
    field: string,
    recordId: string,
  ): void {
    if (refId && !found) {
      this.add({
        check: "orphan_reference",
        table,
        field,
        recordId,
        detail: `Referenced ${field}="${refId}" not found`,
        rawValue: refId,
      });
    }
  }

  // ── Company ID Check ──

  checkCompanyId(
    companyId: string | null | undefined,
    table: string,
    recordId: string,
  ): void {
    if (!companyId || companyId.trim().length === 0) {
      this.add({
        check: "missing_company_id",
        table,
        field: "company_id",
        recordId,
        detail: "Row has null/empty company_id",
      });
    }
  }

  // ── Date Checks ──

  /** Flag if start > end */
  checkDateRange(
    startVal: string | Date | null | undefined,
    endVal: string | Date | null | undefined,
    table: string,
    recordId: string,
    startField = "start_date",
    endField = "end_date",
  ): void {
    const s = safeDate(startVal);
    const e = safeDate(endVal);
    if (s && e && s > e) {
      this.add({
        check: "inverted_date_range",
        table,
        field: `${startField}/${endField}`,
        recordId,
        detail: `${s.toISOString().substring(0, 10)} > ${e.toISOString().substring(0, 10)}`,
      });
    }
  }

  /** Flag booking dates outside campaign range */
  checkBookingInCampaign(
    bookingStart: string | Date | null | undefined,
    bookingEnd: string | Date | null | undefined,
    campaignStart: string | Date | null | undefined,
    campaignEnd: string | Date | null | undefined,
    table: string,
    recordId: string,
  ): void {
    const bS = safeDate(bookingStart);
    const bE = safeDate(bookingEnd);
    const cS = safeDate(campaignStart);
    const cE = safeDate(campaignEnd);
    if (bS && bE && cS && cE && (bE < cS || bS > cE)) {
      this.add({
        check: "booking_outside_campaign",
        table,
        field: "booking_dates",
        recordId,
        detail: `Booking [${bS.toISOString().substring(0, 10)}..${bE.toISOString().substring(0, 10)}] outside campaign [${cS.toISOString().substring(0, 10)}..${cE.toISOString().substring(0, 10)}]`,
      });
    }
  }

  // ── Missing Identifier ──

  checkIdentifier(
    value: string | null | undefined,
    table: string,
    field: string,
    recordId: string,
  ): void {
    if (!value || value.trim().length === 0) {
      this.add({
        check: "missing_identifier",
        table,
        field,
        recordId,
        detail: `Required field "${field}" is null/empty`,
      });
    }
  }

  // ── Summarize ──

  summarize(label: string): AuditSummary {
    const byCheck: Record<string, number> = {};
    const byTable: Record<string, number> = {};

    for (const issue of this.issues) {
      byCheck[issue.check] = (byCheck[issue.check] || 0) + 1;
      byTable[issue.table] = (byTable[issue.table] || 0) + 1;
    }

    const summary: AuditSummary = {
      label,
      totalIssues: this.issues.length,
      byCheck,
      byTable,
      issues: this.issues,
    };

    if (IS_DEV && this.issues.length > 0) {
      console.groupCollapsed(
        `🔍 [DataQualityAudit:${label}] ${this.issues.length} issue(s) detected`,
      );
      console.table(
        this.issues.map((i) => ({
          check: i.check,
          table: i.table,
          field: i.field,
          id: i.recordId.substring(0, 12),
          detail: i.detail.substring(0, 80),
        })),
      );
      console.log("By check:", byCheck);
      console.log("By table:", byTable);
      console.groupEnd();
    }

    return summary;
  }

  /** Get current issue count (useful for conditional logic) */
  get count(): number {
    return this.issues.length;
  }
}
