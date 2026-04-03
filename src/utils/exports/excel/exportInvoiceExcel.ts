import ExcelJS from "exceljs";
import { format } from "date-fns";

export interface InvoiceExcelColumn {
  key: string;
  label: string;
  width?: number;
  type?: "text" | "number" | "date" | "currency";
  getValue: (row: any, index: number) => any;
}

const fmtDate = (d: string | null | undefined, fmt = "dd-MMM-yyyy") => {
  if (!d) return "";
  try { return format(new Date(d), fmt); } catch { return d; }
};

const gstPercent = (row: any): number => {
  if (row.tax_type === "igst" || row.gst_mode === "igst") return 18;
  const cgst = row.cgst_amount || 0;
  const sgst = row.sgst_amount || 0;
  const taxable = row.subtotal || row.taxable_amount || 0;
  if (taxable > 0) return Math.round(((cgst + sgst) / taxable) * 100);
  return 18;
};

export const ALL_INVOICE_COLUMNS: InvoiceExcelColumn[] = [
  { key: "sno", label: "Sl.No", width: 6, type: "number", getValue: (_r, i) => i + 1 },
  { key: "client_name", label: "Client Name", width: 28, type: "text", getValue: (r) => r.client_name || "" },
  { key: "client_gstin", label: "GST No", width: 18, type: "text", getValue: (r) => r.client_gstin || r.gstin || "" },
  { key: "campaign_display", label: "Campaign Display", width: 30, type: "text", getValue: (r) => r.campaign_name || r.campaign_id || "" },
  { key: "display_period", label: "Display Period", width: 28, type: "text", getValue: (r) => {
    const s = fmtDate(r.billing_from || r.start_date);
    const e = fmtDate(r.billing_to || r.end_date);
    return s && e ? `${s} to ${e}` : s || e || "";
  }},
  { key: "invoice_number", label: "Invoice Number", width: 22, type: "text", getValue: (r) => r.id || "" },
  { key: "invoice_date", label: "Invoice Date", width: 14, type: "date", getValue: (r) => r.invoice_date || "" },
  { key: "total_value", label: "Total Value", width: 14, type: "currency", getValue: (r) => r.total_amount || 0 },
  { key: "rate_percent", label: "Rate (%)", width: 10, type: "number", getValue: (r) => gstPercent(r) },
  { key: "taxable_value", label: "Taxable Value", width: 14, type: "currency", getValue: (r) => r.subtotal || r.taxable_amount || 0 },
  { key: "igst", label: "IGST", width: 12, type: "currency", getValue: (r) => (r.tax_type === "igst" || r.gst_mode === "igst") ? (r.igst_amount || r.tax_amount || 0) : 0 },
  { key: "cgst", label: "CGST", width: 12, type: "currency", getValue: (r) => (r.tax_type === "igst" || r.gst_mode === "igst") ? 0 : (r.cgst_amount || 0) },
  { key: "sgst", label: "SGST", width: 12, type: "currency", getValue: (r) => (r.tax_type === "igst" || r.gst_mode === "igst") ? 0 : (r.sgst_amount || 0) },
  // Optional columns
  { key: "status", label: "Invoice Status", width: 12, type: "text", getValue: (r) => r.status || "" },
  { key: "campaign_id", label: "Campaign ID", width: 20, type: "text", getValue: (r) => r.campaign_id || "" },
  { key: "client_code", label: "Client Code", width: 14, type: "text", getValue: (r) => r.client_id || "" },
  { key: "place_of_supply", label: "Place of Supply", width: 16, type: "text", getValue: (r) => r.place_of_supply || r.billing_state || "" },
  { key: "billing_period", label: "Billing Period", width: 14, type: "text", getValue: (r) => r.billing_month || r.billing_period || "" },
  { key: "asset_count", label: "Asset Count", width: 10, type: "number", getValue: (r) => r.asset_count || r.items?.length || 0 },
  { key: "subtotal_raw", label: "Sub Total", width: 14, type: "currency", getValue: (r) => r.subtotal || 0 },
  { key: "discount", label: "Discount", width: 12, type: "currency", getValue: (r) => r.discount_amount || r.discount || 0 },
  { key: "round_off", label: "Round Off", width: 10, type: "number", getValue: (r) => r.round_off || 0 },
  { key: "grand_total", label: "Grand Total", width: 14, type: "currency", getValue: (r) => r.total_amount || 0 },
  { key: "paid_amount", label: "Paid Amount", width: 14, type: "currency", getValue: (r) => r.paid_amount || 0 },
  { key: "credited_amount", label: "Credited Amount", width: 14, type: "currency", getValue: (r) => r.credited_amount || 0 },
  { key: "balance_due", label: "Balance Due", width: 14, type: "currency", getValue: (r) => r.balance_due || 0 },
  { key: "due_date", label: "Due Date", width: 14, type: "date", getValue: (r) => r.due_date || "" },
  { key: "overdue_days", label: "Overdue Days", width: 12, type: "number", getValue: (r) => {
    if (!r.due_date || r.status === "Paid" || r.status === "Cancelled") return 0;
    const diff = Math.floor((Date.now() - new Date(r.due_date).getTime()) / 86400000);
    return diff > 0 ? diff : 0;
  }},
  { key: "company_name", label: "Company Name", width: 24, type: "text", getValue: (r) => r.company_name || "" },
];

export const DEFAULT_INVOICE_EXPORT_KEYS = [
  "sno", "client_name", "client_gstin", "campaign_display", "display_period",
  "invoice_number", "invoice_date", "total_value", "rate_percent",
  "taxable_value", "igst", "cgst", "sgst",
];

const LS_KEY = "invoice_export_columns";

export function loadSavedColumnKeys(): string[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_INVOICE_EXPORT_KEYS;
}

export function saveColumnKeys(keys: string[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(keys));
}

export async function exportInvoiceExcel(
  invoices: any[],
  selectedKeys: string[],
  companyName?: string,
) {
  // Filter out drafts and cancelled unless explicitly in the data
  const rows = invoices.filter((inv) => inv.status !== "Draft" && inv.status !== "Cancelled");
  if (rows.length === 0) return;

  const columns = selectedKeys
    .map((k) => ALL_INVOICE_COLUMNS.find((c) => c.key === k))
    .filter(Boolean) as InvoiceExcelColumn[];

  const wb = new ExcelJS.Workbook();
  wb.creator = "GO-ADS 360°";
  wb.created = new Date();

  const ws = wb.addWorksheet("Invoices Export", {
    properties: { defaultRowHeight: 18 },
    views: [{ state: "frozen", ySplit: 1, xSplit: 0 }],
  });

  // Header row
  const headerRow = ws.addRow(columns.map((c) => c.label));
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FF1E40AF" } },
    };
  });

  // Set column widths
  columns.forEach((col, idx) => {
    ws.getColumn(idx + 1).width = col.width || 14;
  });

  // Data rows
  rows.forEach((row, rowIdx) => {
    const values = columns.map((col) => {
      const val = col.getValue(row, rowIdx);
      if (col.type === "date" && val) {
        return fmtDate(val);
      }
      return val;
    });
    const excelRow = ws.addRow(values);
    excelRow.eachCell((cell, colNumber) => {
      const col = columns[colNumber - 1];
      if (col?.type === "currency" || col?.type === "number") {
        cell.alignment = { horizontal: "right" };
        if (col.type === "currency") {
          cell.numFmt = '#,##0.00';
        }
      } else {
        cell.alignment = { horizontal: "left" };
      }
      cell.font = { size: 10 };
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
    });
  });

  // Download
  const now = format(new Date(), "yyyyMMdd_HHmm");
  const fileName = `Invoices_Export_${now}.xlsx`;
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
