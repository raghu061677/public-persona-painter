import PptxGenJS from "pptxgenjs";
import { format } from "date-fns";
import { ALL_ASSET_EXPORT_FIELDS, type AssetExportField } from "./generateMediaAssetsCustomExcel";

function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "available": return "22C55E";
    case "booked": return "EF4444";
    default: return "64748B";
  }
}

function getStatusBgColor(status: string): string {
  switch (status.toLowerCase()) {
    case "available": return "E8F5E9";
    case "booked": return "FEE2E2";
    default: return "F1F5F9";
  }
}

export async function generateMediaAssetsCustomPpt(
  rows: any[],
  selectedFieldKeys: string[],
  companyName?: string,
  themeColor?: string,
): Promise<void> {
  const fields = selectedFieldKeys
    .map(key => ALL_ASSET_EXPORT_FIELDS.find(f => f.key === key))
    .filter(Boolean) as AssetExportField[];

  if (fields.length === 0 || rows.length === 0) return;

  const brandColor = themeColor?.replace("#", "") || "1E3A8A";
  const company = companyName || "Go-Ads 360°";

  const pptx = new PptxGenJS();
  pptx.author = "Go-Ads 360°";
  pptx.company = company;
  pptx.title = `Media Assets Inventory`;
  pptx.layout = "LAYOUT_16x9";

  // Cover Slide
  const cover = pptx.addSlide();
  cover.background = { color: brandColor };
  cover.addText("MEDIA ASSETS INVENTORY", {
    x: 0.5, y: 1.5, w: 9, h: 0.8,
    fontSize: 32, bold: true, color: "FFFFFF", align: "center", fontFace: "Arial",
  });
  cover.addText(format(new Date(), "dd/MM/yyyy"), {
    x: 0.5, y: 2.8, w: 9, h: 0.5,
    fontSize: 18, color: "CBD5E1", align: "center", fontFace: "Arial",
  });
  cover.addText(company, {
    x: 0.5, y: 4.0, w: 9, h: 0.4,
    fontSize: 14, color: "94A3B8", align: "center", fontFace: "Arial",
  });
  cover.addText(`${rows.length} Assets | ${fields.length} Columns`, {
    x: 0.5, y: 4.5, w: 9, h: 0.3,
    fontSize: 11, color: "64748B", align: "center", fontFace: "Arial",
  });

  // Summary Slide
  const available = rows.filter(r => (r.status || '').toLowerCase() === 'available').length;
  const booked = rows.filter(r => (r.status || '').toLowerCase() === 'booked').length;

  const summary = pptx.addSlide();
  summary.addText("INVENTORY SUMMARY", {
    x: 0.5, y: 0.3, w: 9, h: 0.6,
    fontSize: 26, bold: true, color: brandColor, fontFace: "Arial",
  });

  const cards = [
    { label: "Total", count: rows.length, color: brandColor },
    { label: "Available", count: available, color: "22C55E" },
    { label: "Booked", count: booked, color: "EF4444" },
  ].filter(c => c.count > 0);

  const cardWidth = Math.min(2.5, 9 / cards.length - 0.1);
  cards.forEach((card, i) => {
    const x = 0.4 + i * (cardWidth + 0.2);
    summary.addShape("roundRect" as any, {
      x, y: 1.3, w: cardWidth, h: 1.4, fill: { color: card.color }, rectRadius: 0.1,
    });
    summary.addText(String(card.count), {
      x, y: 1.5, w: cardWidth, h: 0.7,
      fontSize: 36, bold: true, color: "FFFFFF", align: "center", fontFace: "Arial",
    });
    summary.addText(card.label, {
      x, y: 2.2, w: cardWidth, h: 0.35,
      fontSize: 10, color: "FFFFFF", align: "center", fontFace: "Arial",
    });
  });

  // Table Slides
  const ROWS_PER_SLIDE = 12;
  const slideWidth = 9.5;
  const startX = 0.25;
  const totalFieldWidth = fields.reduce((s, f) => s + (f.width || 14), 0);
  const colWidths = fields.map(f => ((f.width || 14) / totalFieldWidth) * slideWidth);

  for (let pageStart = 0; pageStart < rows.length; pageStart += ROWS_PER_SLIDE) {
    const slide = pptx.addSlide();
    const pageRows = rows.slice(pageStart, pageStart + ROWS_PER_SLIDE);
    const pageNum = Math.floor(pageStart / ROWS_PER_SLIDE) + 1;
    const totalPages = Math.ceil(rows.length / ROWS_PER_SLIDE);

    slide.addText(`Media Assets – ${company}`, {
      x: 0.25, y: 0.15, w: 7, h: 0.3,
      fontSize: 10, bold: true, color: brandColor, fontFace: "Arial",
    });
    slide.addText(`Page ${pageNum} of ${totalPages}`, {
      x: 7.5, y: 0.15, w: 2.25, h: 0.3,
      fontSize: 9, color: "94A3B8", align: "right", fontFace: "Arial",
    });

    const tableY = 0.5;
    const rowHeight = 0.35;
    const headerHeight = 0.4;

    // Header
    fields.forEach((field, colIdx) => {
      let x = startX;
      for (let k = 0; k < colIdx; k++) x += colWidths[k];
      slide.addShape("rect", {
        x, y: tableY, w: colWidths[colIdx], h: headerHeight, fill: { color: brandColor },
      });
      slide.addText(field.label, {
        x, y: tableY, w: colWidths[colIdx], h: headerHeight,
        fontSize: 8, bold: true, color: "FFFFFF", align: "center", valign: "middle", fontFace: "Arial",
      });
    });

    // Data
    pageRows.forEach((row, rowIdx) => {
      const globalIdx = pageStart + rowIdx;
      const y = tableY + headerHeight + rowIdx * rowHeight;
      const bgColor = getStatusBgColor(row.status || '');

      fields.forEach((field, colIdx) => {
        let x = startX;
        for (let k = 0; k < colIdx; k++) x += colWidths[k];

        slide.addShape("rect", {
          x, y, w: colWidths[colIdx], h: rowHeight,
          fill: { color: bgColor }, line: { color: "E2E8F0", width: 0.5 },
        });

        let cellVal = String(field.getValue(row, globalIdx) ?? "");
        if (field.key === "card_rate" && typeof field.getValue(row, globalIdx) === "number") {
          cellVal = `₹${Number(cellVal).toLocaleString("en-IN")}`;
        }

        const isStatus = field.key === "status";
        slide.addText(cellVal, {
          x, y, w: colWidths[colIdx], h: rowHeight,
          fontSize: 7,
          bold: isStatus,
          color: isStatus ? getStatusColor(row.status || '') : "374151",
          align: field.key === "location" ? "left" : "center",
          valign: "middle", fontFace: "Arial",
        });
      });
    });

    slide.addText(`${company} | Go-Ads 360° OOH Media Management`, {
      x: 0, y: 5.1, w: 10, h: 0.2,
      fontSize: 7, color: "94A3B8", align: "center", fontFace: "Arial",
    });
  }

  const pptxBlob = (await pptx.write({ outputType: "blob" })) as Blob;
  const url = URL.createObjectURL(pptxBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `MediaAssets_Inventory_${format(new Date(), 'yyyy-MM-dd')}.pptx`;
  link.click();
  URL.revokeObjectURL(url);
}
