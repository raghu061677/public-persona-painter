import jsPDF from "jspdf";
import autoTable, { RowInput } from "jspdf-autotable";
import { format } from "date-fns";
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
  } catch {
    return null;
  }
}

export async function exportInvoicePdf(
  invoices: any[],
  selectedKeys: string[],
  branding: InvoicePdfBranding,
) {
  const rows = invoices.filter((inv) => inv.status !== "Draft" && inv.status !== "Cancelled");
  if (rows.length === 0) return;

  const columns = selectedKeys
    .map((k) => ALL_INVOICE_COLUMNS.find((c) => c.key === k))
    .filter(Boolean) as InvoiceExcelColumn[];

  // Auto orientation based on column count
  const orientation = columns.length > 8 ? "l" : "p";

  const doc = new jsPDF({ orientation, unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const themeRgb = hexToRgb(branding.themeColor);
  const marginL = 36;
  const marginR = 36;
  let y = 32;

  // --- HEADER ---
  let logoOffset = 0;
  if (branding.logoUrl) {
    try {
      const b64 = branding.logoUrl.startsWith("data:")
        ? branding.logoUrl
        : await loadLogoBase64(branding.logoUrl);
      if (b64) {
        doc.addImage(b64, "PNG", marginL, y - 2, 40, 40);
        logoOffset = 50;
      }
    } catch { /* skip */ }
  }

  // Company name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(branding.companyName || "Company", marginL + logoOffset, y + 12);

  // Company details
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  let detailY = y + 24;
  if (branding.address) {
    doc.text(branding.address, marginL + logoOffset, detailY);
    detailY += 10;
  }
  if (branding.gstin) {
    doc.text(`GSTIN: ${branding.gstin}`, marginL + logoOffset, detailY);
    detailY += 10;
  }
  const contactParts: string[] = [];
  if (branding.email) contactParts.push(branding.email);
  if (branding.phone) contactParts.push(branding.phone);
  if (contactParts.length) {
    doc.text(contactParts.join(" | "), marginL + logoOffset, detailY);
  }

  // Right side - report title & date
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(themeRgb[0], themeRgb[1], themeRgb[2]);
  doc.text("Invoice Summary Report", pageW - marginR, y + 12, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Date: ${format(new Date(), "dd-MMM-yyyy HH:mm")}`, pageW - marginR, y + 26, { align: "right" });
  doc.text(`${rows.length} invoices`, pageW - marginR, y + 38, { align: "right" });

  // Separator line
  y = Math.max(detailY + 8, y + 50);
  doc.setDrawColor(themeRgb[0], themeRgb[1], themeRgb[2]);
  doc.setLineWidth(1.5);
  doc.line(marginL, y, pageW - marginR, y);
  y += 12;

  // --- TABLE ---
  const head = [columns.map((c) => c.label)];
  const body: RowInput[] = rows.map((row, idx) =>
    columns.map((col) => {
      const v = col.getValue(row, idx);
      if (v === null || v === undefined) return "";
      if (col.type === "date" && v) {
        try { return format(new Date(v), "dd-MMM-yyyy"); } catch { return String(v); }
      }
      if (col.type === "currency" && typeof v === "number") {
        return v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      return String(v);
    })
  );

  autoTable(doc, {
    startY: y,
    head,
    body,
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 5,
      textColor: [17, 24, 39],
      lineColor: [229, 231, 235],
      lineWidth: 0.5,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [themeRgb[0], themeRgb[1], themeRgb[2]],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: marginL, right: marginR },
    didParseCell: (data) => {
      if (data.section === "body") {
        const col = columns[data.column.index];
        if (col?.type === "currency" || col?.type === "number") {
          data.cell.styles.halign = "right";
        }
      }
    },
  });

  // --- TOTALS SUMMARY ---
  const finalY = (doc as any).lastAutoTable?.finalY ?? y + 40;
  let summaryY = finalY + 20;

  // Check if we need a new page for summary
  if (summaryY + 100 > doc.internal.pageSize.getHeight() - 40) {
    doc.addPage();
    summaryY = 40;
  }

  // Calculate totals
  const totalTaxable = rows.reduce((s, r) => s + (r.subtotal || r.taxable_amount || 0), 0);
  const totalIgst = rows.reduce((s, r) => {
    if (r.tax_type === "igst" || r.gst_mode === "igst") return s + (r.igst_amount || r.tax_amount || 0);
    return s;
  }, 0);
  const totalCgst = rows.reduce((s, r) => {
    if (r.tax_type === "igst" || r.gst_mode === "igst") return s;
    return s + (r.cgst_amount || 0);
  }, 0);
  const totalSgst = rows.reduce((s, r) => {
    if (r.tax_type === "igst" || r.gst_mode === "igst") return s;
    return s + (r.sgst_amount || 0);
  }, 0);
  const grandTotal = rows.reduce((s, r) => s + (r.total_amount || 0), 0);
  const totalOutstanding = rows.reduce((s, r) => s + (r.balance_due || 0), 0);

  const fmtNum = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Summary box
  const boxX = pageW - marginR - 220;
  const boxW = 220;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);

  const summaryItems = [
    ["Total Taxable Value", fmtNum(totalTaxable)],
    ["Total IGST", fmtNum(totalIgst)],
    ["Total CGST", fmtNum(totalCgst)],
    ["Total SGST", fmtNum(totalSgst)],
    ["Grand Total", fmtNum(grandTotal)],
    ["Total Outstanding", fmtNum(totalOutstanding)],
  ];

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(themeRgb[0], themeRgb[1], themeRgb[2]);
  doc.text("Summary", boxX, summaryY);
  summaryY += 14;

  summaryItems.forEach(([label, value], i) => {
    const isLast = i === summaryItems.length - 1;
    const isGrand = i === 4;

    if (isGrand || isLast) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
    }

    doc.setTextColor(50, 50, 50);
    doc.text(label, boxX, summaryY);
    doc.text(value, boxX + boxW, summaryY, { align: "right" });

    if (isGrand) {
      doc.setDrawColor(themeRgb[0], themeRgb[1], themeRgb[2]);
      doc.setLineWidth(1);
      doc.line(boxX, summaryY + 4, boxX + boxW, summaryY + 4);
    }

    summaryY += isGrand ? 18 : 14;
  });

  // --- PAGE NUMBERS & FOOTER ---
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pH = doc.internal.pageSize.getHeight();

    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageW - marginR,
      pH - 16,
      { align: "right" }
    );
    doc.text(
      branding.companyName || "Company",
      marginL,
      pH - 16
    );
  }

  // --- SAVE ---
  const now = format(new Date(), "yyyyMMdd_HHmm");
  doc.save(`Invoices_Report_${now}.pdf`);
}
