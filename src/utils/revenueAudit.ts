/**
 * Revenue Data Quality Audit
 * 
 * Logs and tracks records where negative values are clamped to 0.
 * Dev-mode only warnings; does NOT change user-facing calculations.
 */

export interface ClampedRecord {
  sourceTable: string;
  field: string;
  recordId: string;
  rawValue: number;
  context?: string;
}

export interface RevenueAuditSummary {
  totalClamped: number;
  byField: Record<string, number>;
  byTable: Record<string, number>;
  records: ClampedRecord[];
}

const IS_DEV = import.meta.env.DEV;

export class RevenueAuditCollector {
  private records: ClampedRecord[] = [];

  /**
   * Clamp value to >= 0 and record if negative.
   * Drop-in replacement for Math.max(0, val).
   */
  clamp(
    value: number,
    sourceTable: string,
    field: string,
    recordId: string,
    context?: string,
  ): number {
    if (value < 0) {
      this.records.push({ sourceTable, field, recordId, rawValue: value, context });
    }
    return Math.max(0, value);
  }

  /** Finalize and return summary. Logs in dev mode. */
  summarize(label: string): RevenueAuditSummary {
    const byField: Record<string, number> = {};
    const byTable: Record<string, number> = {};

    for (const r of this.records) {
      byField[r.field] = (byField[r.field] || 0) + 1;
      byTable[r.sourceTable] = (byTable[r.sourceTable] || 0) + 1;
    }

    const summary: RevenueAuditSummary = {
      totalClamped: this.records.length,
      byField,
      byTable,
      records: this.records,
    };

    if (IS_DEV && this.records.length > 0) {
      console.groupCollapsed(
        `⚠️ [RevenueAudit:${label}] ${this.records.length} negative value(s) clamped`,
      );
      console.table(
        this.records.map(r => ({
          table: r.sourceTable,
          field: r.field,
          id: r.recordId.substring(0, 12),
          rawValue: r.rawValue,
          context: r.context || "",
        })),
      );
      console.log("By field:", byField);
      console.log("By table:", byTable);
      console.groupEnd();
    }

    return summary;
  }
}
