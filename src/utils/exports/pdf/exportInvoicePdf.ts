import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import {
  normalizeInvoices,
  aggregateMonthwise,
  aggregateQuarterwise,
  aggregateClientwise,
  aggregateCampaignwise,
  buildTotalsRow,
  SUMMARY_COLUMNS,
  CLIENT_SUMMARY_COLUMNS,
  CAMPAIGN_SUMMARY_COLUMNS,
  EXPORT_TYPE_LABELS,
  EXPORT_TYPE_FILE_SLUGS,
  type ExportType,
  type DateBasis,
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
): Promise<number> {
  const pageW = doc.internal.pageSize.getWidth();
  const themeRgb = hexToRgb(branding.themeColor);
  const mL = 36;
  const mR = 36;
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

  // Right: title
  const title = EXPORT_TYPE_LABELS[exportType].replace("Export", "Report");
  doc.setFont("helvetica", "bold"); doc.setFontSize(14);
  doc.setTextColor(themeRgb[0], themeRgb[1], themeRgb[2]);
  doc.text(title, pageW - mR, y + 12, { align: "right" });

  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Date: ${format(new Date(), "dd-MMM-yyyy HH:mm")}`, pageW - mR, y + 26, { align: "right" });
  doc.text(`${rowCount} records`, pageW - mR, y + 38, { align: "right" });

  y = Math.max(dy + 4, y + 50);
  doc.setDrawColor(themeRgb[0], themeRgb[1], themeRgb[2]);
  doc.setLineWidth(1.5);
  doc.line(mL, y, pageW - mR, y);
  return y + 12;
}

// ─── Shared Summary Footer ─────────────────────────────────────────────
function renderSummaryFooter(
  doc: jsPDF,
  data: NormalizedInvoice[],
  branding: InvoicePdfBranding,
) {
  const themeRgb = hexToRgb(branding.themeColor);
  const pageW = doc.internal.pageSize.getWidth();
  const mL = 36; const mR = 36;
  let y = (doc as any).lastAutoTable?.finalY ?? 100;
  y += 20;

  if (y + 110 > doc.internal.pageSize.getHeight() - 40) {
    doc.addPage();
    y = 40;
  }

  const totals = {
    taxable: data.reduce((s, r) => s + r.taxable_value, 0),
    igst: data.reduce((s, r) => s + r.igst, 0),
    cgst: data.reduce((s, r) => s + r.cgst, 0),
    sgst: data.reduce((s, r) => s + r.sgst, 0),
    grand: data.reduce((s, r) => s + r.total_value, 0),
    paid: data.reduce((s, r) => s + r.paid_amount, 0),
    credited: data.reduce((s, r) => s + r.credited_amount, 0),
    balance: data.reduce((s, r) => s + r.balance_due, 0),
    overdue: data.reduce((s, r) => s + r.overdue_amount, 0),
  };

  const boxX = pageW - mR - 230;
  const boxW = 230;

  doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  doc.setTextColor(themeRgb[0], themeRgb[1], themeRgb[2]);
  doc.text("Financial Summary", boxX, y);
  y += 14;

  const items = [
    ["Total Taxable Value", fmtINR(totals.taxable)],
    ["Total IGST", fmtINR(totals.igst)],
    ["Total CGST", fmtINR(totals.cgst)],
    ["Total SGST", fmtINR(totals.sgst)],
    ["Grand Total", fmtINR(totals.grand)],
    ["Total Paid", fmtINR(totals.paid)],
    ["Total Credited", fmtINR(totals.credited)],
    ["Total Balance Due", fmtINR(totals.balance)],
    ["Total Overdue", fmtINR(totals.overdue)],
  ];

  items.forEach(([label, value], i) => {
    const isBold = i === 4 || i === items.length - 1;
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setFontSize(9); doc.setTextColor(50, 50, 50);
    doc.text(label, boxX, y);
    doc.text(value, boxX + boxW, y, { align: "right" });
    if (i === 4) {
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
) {
  const columns = selectedKeys
    .map((k) => ALL_INVOICE_COLUMNS.find((c) => c.key === k))
    .filter(Boolean) as InvoiceExcelColumn[];

  const orientation = columns.length > 8 ? "l" : "p";
  const doc = new jsPDF({ orientation, unit: "pt", format: "a4" });
  const themeRgb = hexToRgb(branding.themeColor);
  const mL = 36; const mR = 36;

  const startY = await renderHeader(doc, branding, "detailed", normalized.length);

  const head = [columns.map((c) => c.label)];
  const body = normalized.map((row) =>
    columns.map((col) => {
      const v = col.getValue(row);
      if (v === null || v === undefined) return "";
      if (col.type === "currency" && typeof v === "number") {
        return v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      return String(v);
    })
  );

  autoTable(doc, {
    startY,
    head,
    body,
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

  renderSummaryFooter(doc, normalized, branding);
  addPageNumbers(doc, branding);

  const now = format(new Date(), "yyyyMMdd_HHmm");
  doc.save(`Invoices_${EXPORT_TYPE_FILE_SLUGS.detailed}_${now}.pdf`);
}

// ─── Summary PDF ───────────────────────────────────────────────────────
async function exportSummaryPdf(
  summaryRows: SummaryRow[],
  normalized: NormalizedInvoice[],
  exportType: ExportType,
  branding: InvoicePdfBranding,
) {
  const colDefs = exportType === "campaignwise"
    ? CAMPAIGN_SUMMARY_COLUMNS
    : exportType === "clientwise"
      ? CLIENT_SUMMARY_COLUMNS
      : SUMMARY_COLUMNS;

  const hasSubLabel = summaryRows.some((r) => r.subLabel);
  const cols = hasSubLabel ? colDefs : colDefs.filter((c) => c.key !== "subLabel");

  const orientation = cols.length > 8 ? "l" : "p";
  const doc = new jsPDF({ orientation, unit: "pt", format: "a4" });
  const themeRgb = hexToRgb(branding.themeColor);
  const mL = 36; const mR = 36;

  const startY = await renderHeader(doc, branding, exportType, summaryRows.length);

  const head = [cols.map((c) => c.label)];
  const totals = buildTotalsRow(summaryRows);

  const bodyRows = [...summaryRows, totals];
  const body = bodyRows.map((row) =>
    cols.map((c) => {
      const v = (row as any)[c.key];
      if (v === null || v === undefined) return "";
      if (c.type === "currency" && typeof v === "number") {
        return v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      return String(v);
    })
  );

  autoTable(doc, {
    startY,
    head,
    body,
    styles: { font: "helvetica", fontSize: 8, cellPadding: 5, textColor: [17, 24, 39], lineColor: [229, 231, 235], lineWidth: 0.5, overflow: "linebreak" },
    headStyles: { fillColor: [themeRgb[0], themeRgb[1], themeRgb[2]], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: mL, right: mR },
    didParseCell: (data) => {
      if (data.section === "body") {
        const col = cols[data.column.index];
        if (col?.type === "currency" || col?.type === "number") data.cell.styles.halign = "right";
        // Bold totals row
        if (data.row.index === bodyRows.length - 1) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [243, 244, 246];
        }
      }
    },
  });

  renderSummaryFooter(doc, normalized, branding);
  addPageNumbers(doc, branding);

  const now = format(new Date(), "yyyyMMdd_HHmm");
  doc.save(`Invoices_${EXPORT_TYPE_FILE_SLUGS[exportType]}_${now}.pdf`);
}

// ─── Main Export Function ──────────────────────────────────────────────
export async function exportInvoicePdf(
  invoices: any[],
  selectedKeys: string[],
  branding: InvoicePdfBranding,
  exportType: ExportType = "detailed",
  dateBasis: DateBasis = "invoice_date",
) {
  const normalized = normalizeInvoices(invoices, branding.companyName);
  if (normalized.length === 0) return;

  if (exportType === "detailed") {
    return exportDetailedPdf(normalized, selectedKeys, branding);
  }

  let summaryRows: SummaryRow[];
  switch (exportType) {
    case "monthwise":
      summaryRows = aggregateMonthwise(normalized, dateBasis);
      break;
    case "quarterwise":
      summaryRows = aggregateQuarterwise(normalized, dateBasis);
      break;
    case "clientwise":
      summaryRows = aggregateClientwise(normalized);
      break;
    case "campaignwise":
      summaryRows = aggregateCampaignwise(normalized);
      break;
    default:
      return;
  }

  return exportSummaryPdf(summaryRows, normalized, exportType, branding);
}
