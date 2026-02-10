import ExcelJS from "exceljs";

export type ExcelFieldDef<T = any> = {
  key: string;
  label: string;
  width?: number;
  type?: "text" | "number" | "date" | "currency";
  format?: string;
  value?: (row: T, index: number) => any;
};

export type ExportBranding = {
  companyName: string;
  title: string;
  subtitle?: string;
};

export type RowStyleRule<T = any> = {
  when: (row: T) => boolean;
  fill: { argb: string };
};

export type ExportListExcelOptions<T = any> = {
  branding: ExportBranding;
  fields: ExcelFieldDef<T>[];
  rows: T[];
  freezeHeaderRows?: number;
  rowStyleRules?: RowStyleRule<T>[];
  fileName?: string;
};

function applyCellBorder(cell: ExcelJS.Cell) {
  cell.border = {
    top: { style: "thin", color: { argb: "FFE5E7EB" } },
    left: { style: "thin", color: { argb: "FFE5E7EB" } },
    bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
    right: { style: "thin", color: { argb: "FFE5E7EB" } },
  };
}

export async function exportListExcel<T = any>(opts: ExportListExcelOptions<T>): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "GO-ADS 360°";
  wb.created = new Date();

  const freezeRow = opts.freezeHeaderRows ?? 3;
  const ws = wb.addWorksheet(opts.branding.title || "Export", {
    properties: { defaultRowHeight: 18 },
  });

  const fields = opts.fields;
  const colCount = fields.length;
  if (colCount === 0) return;

  // Set column widths
  ws.columns = fields.map((f) => ({
    width: f.width ?? Math.max(12, Math.min(40, (f.label?.length ?? 12) + 6)),
  }));

  // Row 1: Company branding header (merged)
  ws.mergeCells(1, 1, 1, colCount);
  const titleCell = ws.getRow(1).getCell(1);
  titleCell.value = `${opts.branding.companyName || "GO-ADS 360°"} – ${opts.branding.title}`;
  titleCell.font = { size: 16, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 30;

  // Row 2: Subtitle info (merged)
  ws.mergeCells(2, 1, 2, colCount);
  const subtitleCell = ws.getRow(2).getCell(1);
  const generated = new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  subtitleCell.value = opts.branding.subtitle
    ? `${opts.branding.subtitle} | Generated: ${generated} | Total: ${opts.rows.length} rows`
    : `Generated: ${generated} | Total: ${opts.rows.length} rows`;
  subtitleCell.font = { size: 11, italic: true };
  subtitleCell.alignment = { horizontal: "center" };
  ws.getRow(2).height = 20;

  // Row 3: Column headers
  const headerRow = ws.getRow(3);
  headerRow.values = fields.map((f) => f.label);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3B82F6" } };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    applyCellBorder(cell);
  });

  // Freeze panes
  ws.views = [{ state: "frozen", ySplit: freezeRow }];

  // Data rows start at row 4
  const startRow = 4;
  opts.rows.forEach((rowData, idx) => {
    const r = ws.getRow(startRow + idx);
    r.values = fields.map((f) => {
      if (f.value) return f.value(rowData, idx);
      return (rowData as any)[f.key] ?? "";
    });

    // Apply number formats
    fields.forEach((f, colIdx) => {
      const cell = r.getCell(colIdx + 1);
      if (f.type === "currency") {
        cell.numFmt = f.format ?? "₹#,##0";
      } else if (f.type === "number") {
        cell.numFmt = f.format ?? "#,##0.00";
      } else if (f.type === "date") {
        cell.numFmt = f.format ?? "dd-mm-yyyy";
      }
      cell.alignment = {
        horizontal: f.key === "location" || f.key === "description" ? "left" : "center",
        vertical: "middle",
        wrapText: f.key === "location" || f.key === "description",
      };
      applyCellBorder(cell);
    });

    // Row style rules (status coloring)
    const matchedRule = opts.rowStyleRules?.find((rule) => rule.when(rowData));
    if (matchedRule) {
      r.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: matchedRule.fill.argb } };
      });
    } else if (idx % 2 === 0) {
      r.eachCell((cell) => {
        if (!cell.fill || (cell.fill as any).fgColor?.argb === undefined) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
        }
      });
    }
  });

  // Footer
  const footerRowIdx = startRow + opts.rows.length + 1;
  ws.mergeCells(footerRowIdx, 1, footerRowIdx, colCount);
  const footerCell = ws.getRow(footerRowIdx).getCell(1);
  footerCell.value = "Go-Ads 360° | OOH Media Management Platform";
  footerCell.font = { size: 10, italic: true, color: { argb: "FF6B7280" } };
  footerCell.alignment = { horizontal: "center" };

  // Download
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = opts.fileName ?? `${opts.branding.title.replace(/\s+/g, "_")}_export.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
