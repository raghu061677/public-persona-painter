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
  getGSTR1ValidationFlags,
  getGSTR1ExclusionCounts,
  normalizeInvoice,
  EXPORT_TYPE_LABELS,
  EXPORT_TYPE_FILE_SLUGS,
  EXPORT_TYPE_SHEET_NAMES,
  GST_INVOICEWISE_KEYS,
  GSTR1_SALES_REGISTER_KEYS,
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

const fmtINR = (n: number) => `Rs. ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

// ─── GSTR-1 Premium Header ────────────────────────────────────────────
async function renderGSTR1Header(
  doc: jsPDF,
  branding: InvoicePdfBranding,
  normalized: NormalizedInvoice[],
  periodLabel: string,
): Promise<number> {
  const pageW = doc.internal.pageSize.getWidth();
  const themeRgb = hexToRgb(branding.themeColor);
  const mL = 36; const mR = 36;
  const contentW = pageW - mL - mR;
  let y = 28;

  // ── Top bar accent ──
  doc.setFillColor(themeRgb[0], themeRgb[1], themeRgb[2]);
  doc.rect(0, 0, pageW, 6, "F");

  // ── Logo + Company ──
  let logoOffset = 0;
  if (branding.logoUrl) {
    try {
      const b64 = branding.logoUrl.startsWith("data:") ? branding.logoUrl : await loadLogoBase64(branding.logoUrl);
      if (b64) { doc.addImage(b64, "PNG", mL, y, 36, 36); logoOffset = 44; }
    } catch { /* skip */ }
  }

  doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(17, 24, 39);
  doc.text(branding.companyName || "Company", mL + logoOffset, y + 14);
  if (branding.gstin) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(100, 100, 100);
    doc.text(`GSTIN: ${branding.gstin}`, mL + logoOffset, y + 26);
  }

  // ── Right: Report title ──
  doc.setFont("helvetica", "bold"); doc.setFontSize(16);
  doc.setTextColor(themeRgb[0], themeRgb[1], themeRgb[2]);
  doc.text("GSTR-1 Sales Register", pageW - mR, y + 12, { align: "right" });

  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(100, 100, 100);
  doc.text("GST Filing Report for CA / Auditor", pageW - mR, y + 24, { align: "right" });
  doc.text(`Period: ${periodLabel || "All"}`, pageW - mR, y + 36, { align: "right" });
  doc.text(`Generated: ${format(new Date(), "dd-MMM-yyyy HH:mm")}`, pageW - mR, y + 48, { align: "right" });

  y += 56;

  // ── Separator ──
  doc.setDrawColor(themeRgb[0], themeRgb[1], themeRgb[2]);
  doc.setLineWidth(1.5);
  doc.line(mL, y, pageW - mR, y);
  y += 14;

  // ── Summary KPI Cards ──
  const totalTaxable = normalized.reduce((s, r) => s + r.taxable_value, 0);
  const totalIgst = normalized.reduce((s, r) => s + r.igst, 0);
  const totalCgst = normalized.reduce((s, r) => s + r.cgst, 0);
  const totalSgst = normalized.reduce((s, r) => s + r.sgst, 0);
  const totalTax = totalIgst + totalCgst + totalSgst;
  const grandTotal = normalized.reduce((s, r) => s + r.total_value, 0);

  const cards = [
    { label: "Invoices", value: String(normalized.length) },
    { label: "Taxable Value", value: fmtINR(totalTaxable) },
    { label: "IGST", value: fmtINR(totalIgst) },
    { label: "CGST", value: fmtINR(totalCgst) },
    { label: "SGST", value: fmtINR(totalSgst) },
    { label: "Total Tax", value: fmtINR(totalTax) },
    { label: "Grand Total", value: fmtINR(grandTotal) },
  ];

  const cardW = (contentW - (cards.length - 1) * 6) / cards.length;
  const cardH = 36;

  cards.forEach((card, i) => {
    const cx = mL + i * (cardW + 6);

    // Card background
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.5);
    doc.roundedRect(cx, y, cardW, cardH, 3, 3, "FD");

    // Label
    doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.setTextColor(100, 116, 139);
    doc.text(card.label, cx + cardW / 2, y + 12, { align: "center" });

    // Value
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(17, 24, 39);
    doc.text(card.value, cx + cardW / 2, y + 26, { align: "center" });
  });

  y += cardH + 14;
  return y;
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

// ─── GSTR-1 Reconciliation Panel (Premium) ─────────────────────────────
function renderGSTR1ReconciliationPanel(
  doc: jsPDF,
  normalized: NormalizedInvoice[],
  allRawInvoices: any[],
  branding: InvoicePdfBranding,
  companyName: string,
) {
  const themeRgb = hexToRgb(branding.themeColor);
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const mL = 36; const mR = 36;
  const contentW = pageW - mL - mR;

  doc.addPage();
  let y = 36;

  // ── Section title ──
  doc.setFont("helvetica", "bold"); doc.setFontSize(13);
  doc.setTextColor(themeRgb[0], themeRgb[1], themeRgb[2]);
  doc.text("Reconciliation & Validation Summary", mL, y);
  y += 6;
  doc.setDrawColor(themeRgb[0], themeRgb[1], themeRgb[2]);
  doc.setLineWidth(1);
  doc.line(mL, y, pageW - mR, y);
  y += 18;

  // ── Exclusion Counts ──
  const allNorm = allRawInvoices.map((r, i) => normalizeInvoice(r, i, companyName));
  const exclusions = getGSTR1ExclusionCounts(allNorm);

  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(17, 24, 39);
  doc.text("Inclusion / Exclusion Breakdown", mL, y);
  y += 16;

  const exclItems = [
    ["Included in Report", String(normalized.length), true],
    ["Excluded: Draft Invoices", String(exclusions.drafts), false],
    ["Excluded: Cancelled / Void", String(exclusions.cancelled), false],
    ["Excluded: Zero-GST (Rate <= 0)", String(exclusions.zeroGst), false],
    ["Excluded: INV-Z Sequence", String(exclusions.invZ), false],
    ["Excluded: Zero Taxable Value", String(exclusions.zeroTaxable), false],
  ] as [string, string, boolean][];

  const halfW = contentW / 2;

  exclItems.forEach(([label, value, bold]) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(9);
    doc.setTextColor(bold ? 17 : 75, bold ? 24 : 85, bold ? 39 : 99);
    doc.text(label, mL + 4, y);
    doc.text(value, mL + halfW - 20, y, { align: "right" });
    y += 14;
  });

  y += 10;

  // ── Tax Summary ──
  const recon = checkReconciliation(normalized);
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(17, 24, 39);
  doc.text("Tax Reconciliation", mL, y);
  y += 16;

  const taxItems: [string, string][] = [
    ["Total Taxable Value", fmtINR(recon.taxableTotal)],
    ["IGST Total", fmtINR(recon.igstTotal)],
    ["CGST Total", fmtINR(recon.cgstTotal)],
    ["SGST Total", fmtINR(recon.sgstTotal)],
    ["Total Tax", fmtINR(recon.totalTax)],
    ["Grand Total", fmtINR(recon.grossTotal)],
  ];

  taxItems.forEach(([label, value], i) => {
    const isBold = i >= 4;
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setFontSize(9); doc.setTextColor(50, 50, 50);
    doc.text(label, mL + 4, y);
    doc.text(value, mL + halfW - 20, y, { align: "right" });
    if (i === 3) {
      doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.5);
      doc.line(mL + 4, y + 4, mL + halfW - 20, y + 4);
      y += 6;
    }
    y += 14;
  });

  y += 10;

  // ── Validation Issues ──
  const validationIssues: { inv: string; warnings: string[] }[] = [];
  for (const inv of normalized) {
    const flags = getGSTR1ValidationFlags(inv);
    if (flags.length > 0) validationIssues.push({ inv: inv.invoice_number, warnings: flags });
  }

  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(17, 24, 39);
  doc.text(`Validation Issues: ${validationIssues.length}`, mL, y);
  y += 14;

  if (validationIssues.length > 0) {
    const issueRows = validationIssues.slice(0, 30).map((iss) => [iss.inv, iss.warnings.join("; ")]);

    autoTable(doc, {
      startY: y,
      head: [["Invoice No", "Validation Warning"]],
      body: issueRows,
      styles: { font: "helvetica", fontSize: 8, cellPadding: 4, textColor: [75, 85, 99], lineColor: [229, 231, 235], lineWidth: 0.3 },
      headStyles: { fillColor: [254, 243, 199], textColor: [146, 64, 14], fontStyle: "bold", fontSize: 8 },
      margin: { left: mL, right: mR },
      columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: "auto" } },
    });
  } else {
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(22, 163, 74);
    doc.text("No validation issues found.", mL + 4, y);
  }
}

// ─── Page numbers & footer ─────────────────────────────────────────────
function addPageNumbers(doc: jsPDF, branding: InvoicePdfBranding, isGstr1 = false) {
  const pageCount = doc.getNumberOfPages();
  const mL = 36; const mR = 36;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pH = doc.internal.pageSize.getHeight();
    const pW = doc.internal.pageSize.getWidth();
    doc.setFontSize(7); doc.setTextColor(130, 130, 130);
    doc.text(`Page ${i} of ${pageCount}`, pW - mR, pH - 14, { align: "right" });
    doc.text(branding.companyName || "", mL, pH - 14);
    if (isGstr1) {
      doc.text("System Generated Report -- For GST Reconciliation Use", pW / 2, pH - 14, { align: "center" });
    }
  }
}

// ─── GSTR-1 Premium PDF ───────────────────────────────────────────────
async function exportGSTR1Pdf(
  normalized: NormalizedInvoice[],
  allRawInvoices: any[],
  branding: InvoicePdfBranding,
  periodLabel: string,
) {
  const doc = new jsPDF({ orientation: "l", unit: "pt", format: "a4" });
  const themeRgb = hexToRgb(branding.themeColor);
  const pageW = doc.internal.pageSize.getWidth();
  const mL = 36; const mR = 36;

  const startY = await renderGSTR1Header(doc, branding, normalized, periodLabel);

  // ── Column setup with proper widths ──
  const columns = GSTR1_SALES_REGISTER_KEYS
    .map((k) => ALL_INVOICE_COLUMNS.find((c) => c.key === k))
    .filter(Boolean) as InvoiceExcelColumn[];

  // Custom widths for landscape GSTR-1 — must fit within ~770pt (842 - 36*2)
  const gstr1Widths: Record<string, number> = {
    sno: 22, client_name: 80, client_gstin: 72, campaign_display: 72,
    bill_from: 48, bill_to: 48, invoice_number: 68, invoice_date: 48,
    total_value: 54, rate_percent: 26, taxable_value: 54, igst: 46, cgst: 46, sgst: 46,
  };

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

  // Totals row
  const totalsBody = columns.map((col) => {
    if (col.key === "sno") return "";
    if (col.key === "client_name") return "TOTAL";
    if (col.type === "currency") {
      const sum = normalized.reduce((s, r) => s + ((col.getValue(r) as number) || 0), 0);
      return sum.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (col.key === "rate_percent") return "";
    return "";
  });
  body.push(totalsBody);

  const colStyles: Record<number, any> = {};
  columns.forEach((col, i) => {
    const w = gstr1Widths[col.key] || 50;
    const style: any = { cellWidth: w };
    if (col.type === "currency" || col.type === "number") style.halign = "right";
    if (col.key === "invoice_date" || col.key === "bill_from" || col.key === "bill_to" || col.key === "rate_percent") style.halign = "center";
    if (col.key === "client_name" || col.key === "campaign_display") style.cellWidth = w;
    colStyles[i] = style;
  });

  autoTable(doc, {
    startY,
    head,
    body,
    styles: {
      font: "helvetica",
      fontSize: 6.5,
      cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
      textColor: [17, 24, 39],
      lineColor: [229, 231, 235],
      lineWidth: 0.3,
      overflow: "linebreak",
      minCellHeight: 16,
    },
    headStyles: {
      fillColor: [themeRgb[0], themeRgb[1], themeRgb[2]],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 6.5,
      cellPadding: { top: 4, right: 3, bottom: 4, left: 3 },
      minCellHeight: 18,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: mL, right: mR, bottom: 40 },
    columnStyles: colStyles,
    showHead: "everyPage",
    didParseCell: (data) => {
      // Style the totals row (last body row)
      if (data.section === "body" && data.row.index === body.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [themeRgb[0], themeRgb[1], themeRgb[2]];
        data.cell.styles.textColor = [255, 255, 255];
        data.cell.styles.fontSize = 8;
      }
    },
  });

  // ── Reconciliation panel on new page ──
  renderGSTR1ReconciliationPanel(doc, normalized, allRawInvoices, branding, branding.companyName || "Company");

  addPageNumbers(doc, branding, true);
  return doc;
}

// ─── Detailed PDF (non-GSTR1) ──────────────────────────────────────────
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
    showHead: "everyPage",
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
    showHead: "everyPage",
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

  if (exportType === "gstr1_sales_register") {
    doc = await exportGSTR1Pdf(normalized, invoices, branding, periodLabel || "All");
  } else if (isDetailedExportType(exportType)) {
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
