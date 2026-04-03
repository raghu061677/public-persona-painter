import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import {
  normalizeInvoices,
  buildTotalsRow,
  getSummaryColumnsForType,
  resolveSummaryData,
  isDetailedExportType,
  prefilterForExportType,
  filterByPeriod,
  getPeriodFileSlug,
  getPeriodLabel,
  checkReconciliation,
  EXPORT_TYPE_LABELS,
  EXPORT_TYPE_FILE_SLUGS,
  EXPORT_TYPE_SHEET_NAMES,
  GST_INVOICEWISE_KEYS,
  OUTSTANDING_DETAIL_KEYS,
  type ExportType,
  type DateBasis,
  type PeriodConfig,
  type NormalizedInvoice,
  type SummaryRow,
} from "@/utils/exports/invoiceExportMapper";
import {
  ALL_INVOICE_COLUMNS,
  type InvoiceExcelColumn,
} from "@/utils/exports/excel/exportInvoiceExcel";

export interface InvoicePdfBranding {
  companyName: string;
  address?: string;
  gstin?: string;
  email?: string;
  phone?: string;
  logoUrl?: string;
  themeColor?: string;
}

function hexToRgb(hex?: string): [number, number, number] {
  if (!hex) return [30, 64, 175];
  const c = hex.replace("#", "").trim();
  if (c.length !== 6) return [30, 64, 175];
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return [30, 64, 175];
  return [r, g, b];
}

async function loadLogoBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

const fmtINR = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Shared PDF Header ─────────────────────────────────────────────────
async function renderHeader(
  doc: jsPDF,
  branding: InvoicePdfBranding,
  exportType: ExportType,
  rowCount: number,
  periodLabel?: string,
  dateBasis?: string,
): Promise<number> {
  const pageW = doc.internal.pageSize.getWidth();
  const themeRgb = hexToRgb(branding.themeColor);
  const mL = 36; const mR = 36;
  let y = 32;

  let logoOffset = 0;
  if (branding.logoUrl) {
    try {
      const b64 = branding.logoUrl.startsWith("data:") ? branding.logoUrl : await loadLogoBase64(branding.logoUrl);
      if (b64) { doc.addImage(b64, "PNG", mL, y - 2, 40, 40); logoOffset = 50; }
    } catch { /* skip */ }
  }

  doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(0, 0, 0);
  doc.text(branding.companyName || "Company", mL + logoOffset, y + 12);

  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(100, 100, 100);
  let dy = y + 24;
  if (branding.address) { doc.text(branding.address, mL + logoOffset, dy); dy += 10; }
  if (branding.gstin) { doc.text(`GSTIN: ${branding.gstin}`, mL + logoOffset, dy); dy += 10; }
  const contact = [branding.email, branding.phone].filter(Boolean).join(" | ");
  if (contact) { doc.text(contact, mL + logoOffset, dy); dy += 10; }

  // Right: title + metadata
  const title = EXPORT_TYPE_LABELS[exportType].replace("Export", "Report");
  doc.setFont("helvetica", "bold"); doc.setFontSize(14);
  doc.setTextColor(themeRgb[0], themeRgb[1], themeRgb[2]);
  doc.text(title, pageW - mR, y + 12, { align: "right" });

  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  let ry = y + 26;
  doc.text(`Date: ${format(new Date(), "dd-MMM-yyyy HH:mm")}`, pageW - mR, ry, { align: "right" });
  ry += 12;
  doc.text(`${rowCount} records`, pageW - mR, ry, { align: "right" });
  if (periodLabel) {
    ry += 12;
    doc.text(`Period: ${periodLabel}`, pageW - mR, ry, { align: "right" });
  }
  if (dateBasis) {
    ry += 12;
    doc.text(`Date Basis: ${dateBasis}`, pageW - mR, ry, { align: "right" });
  }

  y = Math.max(dy + 4, y + 50);
  doc.setDrawColor(themeRgb[0], themeRgb[1], themeRgb[2]);
  doc.setLineWidth(1.5);
  doc.line(mL, y, pageW - mR, y);
  return y + 12;
}

// ─── Reconciliation Block ──────────────────────────────────────────────
function renderReconciliationBlock(doc: jsPDF, data: NormalizedInvoice[], branding: InvoicePdfBranding) {
  const themeRgb = hexToRgb(branding.themeColor);
  const pageW = doc.internal.pageSize.getWidth();
  const mL = 36; const mR = 36;
  let y = (doc as any).lastAutoTable?.finalY ?? 100;
  y += 20;

  if (y + 160 > doc.internal.pageSize.getHeight() - 40) {
    doc.addPage();
    y = 40;
  }

  const recon = checkReconciliation(data);
  const boxX = pageW - mR - 250;
  const boxW = 250;

  doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  doc.setTextColor(themeRgb[0], themeRgb[1], themeRgb[2]);
  doc.text("Financial Reconciliation Summary", boxX, y);
  y += 16;

  const items = [
    ["Total Records", String(recon.totalRecords)],
    ["Taxable Total", fmtINR(recon.taxableTotal)],
    ["Total Tax", fmtINR(recon.totalTax)],
    ["IGST Total", fmtINR(recon.igstTotal)],
    ["CGST Total", fmtINR(recon.cgstTotal)],
    ["SGST Total", fmtINR(recon.sgstTotal)],
    ["Gross Total", fmtINR(recon.grossTotal)],
    ["Paid Total", fmtINR(recon.paidTotal)],
    ["Credited Total", fmtINR(recon.creditedTotal)],
    ["Balance Due Total", fmtINR(recon.balanceDueTotal)],
    ["Overdue Total", fmtINR(recon.overdueTotal)],
    ["Mismatch Count", String(recon.mismatchCount)],
  ];

  items.forEach(([label, value], i) => {
    const isBold = i === 6 || i === items.length - 1;
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setFontSize(9); doc.setTextColor(50, 50, 50);
    if (i === items.length - 1 && recon.mismatchCount > 0) {
      doc.setTextColor(200, 50, 50);
    }
    doc.text(label, boxX, y);
    doc.text(value, boxX + boxW, y, { align: "right" });
    if (i === 6) {
      doc.setDrawColor(themeRgb[0], themeRgb[1], themeRgb[2]);
      doc.setLineWidth(1); doc.line(boxX, y + 4, boxX + boxW, y + 4);
      y += 18;
    } else {
      y += 14;
    }
  });
}

// ─── Page numbers & footer ─────────────────────────────────────────────
function addPageNumbers(doc: jsPDF, branding: InvoicePdfBranding) {
  const pageCount = doc.getNumberOfPages();
  const mL = 36; const mR = 36;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pH = doc.internal.pageSize.getHeight();
    const pW = doc.internal.pageSize.getWidth();
    doc.setFontSize(8); doc.setTextColor(130, 130, 130);
    doc.text(`Page ${i} of ${pageCount}`, pW - mR, pH - 16, { align: "right" });
    doc.text(branding.companyName || "", mL, pH - 16);
  }
}

// ─── Detailed PDF ──────────────────────────────────────────────────────
async function exportDetailedPdf(
  normalized: NormalizedInvoice[],
  selectedKeys: string[],
  branding: InvoicePdfBranding,
  exportType: ExportType,
  periodLabel?: string,
  dateBasis?: string,
) {
  const columns = selectedKeys
    .map((k) => ALL_INVOICE_COLUMNS.find((c) => c.key === k))
    .filter(Boolean) as InvoiceExcelColumn[];

  const orientation = columns.length > 8 ? "l" : "p";
  const doc = new jsPDF({ orientation, unit: "pt", format: "a4" });
  const themeRgb = hexToRgb(branding.themeColor);
  const mL = 36; const mR = 36;

  const startY = await renderHeader(doc, branding, exportType, normalized.length, periodLabel, dateBasis);

  const head = [columns.map((c) => c.label)];
  const body = normalized.map((row) =>
    columns.map((col) => {
      const v = col.getValue(row);
      if (v === null || v === undefined) return "";
      if (col.type === "currency" && typeof v === "number")
        return v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return String(v);
    })
  );

  autoTable(doc, {
    startY,
    head, body,
    styles: { font: "helvetica", fontSize: 8, cellPadding: 5, textColor: [17, 24, 39], lineColor: [229, 231, 235], lineWidth: 0.5, overflow: "linebreak" },
    headStyles: { fillColor: [themeRgb[0], themeRgb[1], themeRgb[2]], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: mL, right: mR },
    didParseCell: (data) => {
      if (data.section === "body") {
        const col = columns[data.column.index];
        if (col?.type === "currency" || col?.type === "number") data.cell.styles.halign = "right";
      }
    },
  });

  renderReconciliationBlock(doc, normalized, branding);
  addPageNumbers(doc, branding);
  return doc;
}

// ─── Summary PDF ───────────────────────────────────────────────────────
async function exportSummaryPdf(
  summaryRows: SummaryRow[],
  normalized: NormalizedInvoice[],
  exportType: ExportType,
  branding: InvoicePdfBranding,
  periodLabel?: string,
  dateBasis?: string,
) {
  const colDefs = getSummaryColumnsForType(exportType);
  const hasSubLabel = summaryRows.some((r) => r.subLabel);
  const cols = hasSubLabel ? colDefs : colDefs.filter((c) => c.key !== "subLabel");

  const orientation = cols.length > 8 ? "l" : "p";
  const doc = new jsPDF({ orientation, unit: "pt", format: "a4" });
  const themeRgb = hexToRgb(branding.themeColor);
  const mL = 36; const mR = 36;

  const startY = await renderHeader(doc, branding, exportType, summaryRows.length, periodLabel, dateBasis);

  const head = [cols.map((c) => c.label)];
  const totals = buildTotalsRow(summaryRows);
  const bodyRows = [...summaryRows, totals];
  const body = bodyRows.map((row) =>
    cols.map((c) => {
      const v = (row as any)[c.key];
      if (v === null || v === undefined) return "";
      if (c.type === "currency" && typeof v === "number")
        return v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return String(v);
    })
  );

  autoTable(doc, {
    startY,
    head, body,
    styles: { font: "helvetica", fontSize: 8, cellPadding: 5, textColor: [17, 24, 39], lineColor: [229, 231, 235], lineWidth: 0.5, overflow: "linebreak" },
    headStyles: { fillColor: [themeRgb[0], themeRgb[1], themeRgb[2]], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: mL, right: mR },
    didParseCell: (data) => {
      if (data.section === "body") {
        const col = cols[data.column.index];
        if (col?.type === "currency" || col?.type === "number") data.cell.styles.halign = "right";
        if (data.row.index === bodyRows.length - 1) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [243, 244, 246];
        }
      }
    },
  });

  renderReconciliationBlock(doc, normalized, branding);
  addPageNumbers(doc, branding);
  return doc;
}

// ─── Main Export Function ──────────────────────────────────────────────
export async function exportInvoicePdf(
  invoices: any[],
  selectedKeys: string[],
  branding: InvoicePdfBranding,
  exportType: ExportType = "detailed",
  dateBasis: DateBasis = "invoice_date",
  period?: PeriodConfig,
) {
  let normalized = normalizeInvoices(invoices, branding.companyName);
  if (period) normalized = filterByPeriod(normalized, period, dateBasis);
  normalized = prefilterForExportType(normalized, exportType);
  if (normalized.length === 0) return;

  normalized.forEach((r, i) => { r.sno = i + 1; });

  const periodLabel = period ? getPeriodLabel(period) : undefined;
  const basisLabel = dateBasis === "billing_period" ? "Billing Period" : dateBasis === "due_date" ? "Due Date" : "Invoice Date";
  const periodSlug = period ? getPeriodFileSlug(period) : "";
  const now = format(new Date(), "yyyyMMdd_HHmm");
  const periodPart = periodSlug ? `_${periodSlug}` : "";

  let doc: jsPDF;

  if (isDetailedExportType(exportType)) {
    const keys = exportType === "gst_invoicewise" ? GST_INVOICEWISE_KEYS
      : (exportType === "outstanding_detailed" || exportType === "outstanding_overdue") ? OUTSTANDING_DETAIL_KEYS
      : selectedKeys;
    doc = await exportDetailedPdf(normalized, keys, branding, exportType, periodLabel, basisLabel);
  } else {
    const summaryRows = resolveSummaryData(normalized, exportType, dateBasis);
    doc = await exportSummaryPdf(summaryRows, normalized, exportType, branding, periodLabel, basisLabel);
  }

  doc.save(`Invoices_${EXPORT_TYPE_FILE_SLUGS[exportType]}${periodPart}_${now}.pdf`);
}
