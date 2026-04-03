/**
 * Export Audit Logger — lightweight, non-blocking audit trail for exports.
 * Falls back to console if no backend storage is available.
 */
import { logAudit } from "@/utils/auditLog";

export interface ExportAuditEntry {
  exportFormat: "excel" | "pdf";
  exportType: string;
  presetName?: string;
  dateBasis: string;
  selectedPeriod: string;
  recordCount: number;
  filterSummary?: string;
  exportScope: "current_view" | "selected_rows";
}

export async function logExportAudit(entry: ExportAuditEntry): Promise<void> {
  try {
    await logAudit({
      action: "export_data",
      resourceType: "export",
      details: {
        export_format: entry.exportFormat,
        export_type: entry.exportType,
        preset_name: entry.presetName || null,
        date_basis: entry.dateBasis,
        selected_period: entry.selectedPeriod,
        record_count: entry.recordCount,
        filter_summary: entry.filterSummary || null,
        export_scope: entry.exportScope,
        exported_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    // Non-blocking — never fail the export
    console.warn("Export audit log failed (non-blocking):", err);
  }
}
