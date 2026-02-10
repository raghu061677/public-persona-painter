import jsPDF from "jspdf";
import autoTable, { RowInput } from "jspdf-autotable";

export type PdfFieldDef<T = any> = {
  key: string;
  label: string;
  width?: number;
  value?: (row: T, index: number) => any;
};

export type PdfBranding = {
  companyName: string;
  title: string;
  subtitle?: string;
  themeColor?: string;
};

export type PdfRowStyleRule<T = any> = {
  when: (row: T) => boolean;
  fillColor: [number, number, number];
};

export type ExportListPdfOptions<T = any> = {
  branding: PdfBranding;
  fields: PdfFieldDef<T>[];
  rows: T[];
  orientation?: "p" | "l";
  rowStyleRules?: PdfRowStyleRule<T>[];
  fileName?: string;
};

function hexToRgb(hex?: string): [number, number, number] | null {
  if (!hex) return null;
  const cleaned = hex.replace("#", "").trim();
  if (cleaned.length !== 6) return null;
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return null;
  return [r, g, b];
}

export function exportListPdf<T = any>(opts: ExportListPdfOptions<T>): void {
  const doc = new jsPDF({
    orientation: opts.orientation ?? "l",
    unit: "pt",
    format: "a4",
  });

  const themeRgb = hexToRgb(opts.branding.themeColor) ?? [30, 64, 175];
  const marginLeft = 40;
  let topY = 38;

  // Company name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(opts.branding.companyName || "Company", marginLeft, topY + 10);

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(themeRgb[0], themeRgb[1], themeRgb[2]);
  doc.text(opts.branding.title || "Report", marginLeft, topY + 30);

  // Subtitle
  if (opts.branding.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    doc.text(opts.branding.subtitle, marginLeft, topY + 46);
  }

  const head = [opts.fields.map((f) => f.label)];
  const body: RowInput[] = opts.rows.map((row, idx) =>
    opts.fields.map((f) => {
      const v = f.value ? f.value(row, idx) : (row as any)[f.key];
      if (v === null || v === undefined) return "";
      return String(v);
    })
  );

  autoTable(doc, {
    startY: topY + 60,
    head,
    body,
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 6,
      textColor: [17, 24, 39],
      lineColor: [229, 231, 235],
      lineWidth: 0.5,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [243, 244, 246],
      textColor: [17, 24, 39],
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [255, 255, 255] },
    didParseCell: (hookData) => {
      if (hookData.section !== "body") return;
      const rowIndex = hookData.row.index;
      const rowObj = opts.rows[rowIndex];
      const rule = opts.rowStyleRules?.find((r) => r.when(rowObj));
      if (rule) {
        hookData.cell.styles.fillColor = rule.fillColor;
      }
    },
    margin: { left: marginLeft, right: marginLeft },
  });

  // Page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() - 90,
      doc.internal.pageSize.getHeight() - 20
    );
  }

  // Download
  doc.save(opts.fileName ?? `${opts.branding.title.replace(/\s+/g, "_")}_export.pdf`);
}
