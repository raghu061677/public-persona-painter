import PptxGenJS from "pptxgenjs";
import { format } from "date-fns";
import { ALL_EXPORT_FIELDS, type CustomExportField } from "./generateCustomAvailabilityExcel";

/** Format date string to Indian DD/MM/YYYY */
function formatDateIN(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    const dd = d.getDate().toString().padStart(2, "0");
    const mm = (d.getMonth() + 1).toString().padStart(2, "0");
    return `${dd}/${mm}/${d.getFullYear()}`;
  } catch {
    return "-";
  }
}

/** Override availability_status for PPT display */
function formatStatus(row: any): string {
  if (row.availability_status === "VACANT_NOW") return "Available";
  if (row.availability_status === "AVAILABLE_SOON") return formatDateIN(row.available_from);
  if (row.availability_status === "HELD") return "Held/Blocked";
  return "Booked";
}

/** Status color mapping */
function getStatusColor(status: string): string {
  switch (status) {
    case "VACANT_NOW": return "22C55E";
    case "AVAILABLE_SOON": return "F59E0B";
    case "HELD": return "8B5CF6";
    default: return "EF4444";
  }
}

function getStatusBgColor(status: string): string {
  switch (status) {
    case "VACANT_NOW": return "E8F5E9";
    case "AVAILABLE_SOON": return "FFF3E0";
    case "HELD": return "F3E8FF";
    default: return "FEE2E2";
  }
}

/**
 * Generate PPT for Media Availability Report with the same custom field options as the Excel export.
 * Creates a cover slide, summary slide, then table slides with the selected fields.
 */
export async function generateCustomAvailabilityPpt(
  rows: any[],
  selectedFieldKeys: string[],
  startDate: string,
  endDate: string,
  companyName?: string,
  themeColor?: string
): Promise<void> {
  const fields = selectedFieldKeys
    .map((key) => ALL_EXPORT_FIELDS.find((f) => f.key === key))
    .filter(Boolean) as CustomExportField[];

  if (fields.length === 0 || rows.length === 0) return;

  const brandColor = themeColor?.replace("#", "") || "1E3A8A";
  const company = companyName || "Go-Ads 360°";

  const pptx = new PptxGenJS();
  pptx.author = "Go-Ads 360°";
  pptx.company = company;
  pptx.title = `Media Availability Report – ${startDate} to ${endDate}`;
  pptx.layout = "LAYOUT_16x9";

  // ─── Cover Slide ───────────────────────────────────────────
  const cover = pptx.addSlide();
  cover.background = { color: brandColor };
  cover.addText("MEDIA AVAILABILITY REPORT", {
    x: 0.5, y: 1.5, w: 9, h: 0.8,
    fontSize: 32, bold: true, color: "FFFFFF",
    align: "center", fontFace: "Arial",
  });
  const startFormatted = formatDateIN(startDate);
  const endFormatted = formatDateIN(endDate);
  cover.addText(`${startFormatted} to ${endFormatted}`, {
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

  // ─── Summary Slide ─────────────────────────────────────────
  const vacantNow = rows.filter((r) => r.availability_status === "VACANT_NOW").length;
  const availSoon = rows.filter((r) => r.availability_status === "AVAILABLE_SOON").length;
  const held = rows.filter((r) => r.availability_status === "HELD").length;
  const booked = rows.length - vacantNow - availSoon - held;

  const summary = pptx.addSlide();
  summary.addText("AVAILABILITY SUMMARY", {
    x: 0.5, y: 0.3, w: 9, h: 0.6,
    fontSize: 26, bold: true, color: brandColor, fontFace: "Arial",
  });

  const cards = [
    { label: "Total", count: rows.length, color: brandColor },
    { label: "Available", count: vacantNow, color: "22C55E" },
    { label: "Available Soon", count: availSoon, color: "F59E0B" },
    { label: "Held/Blocked", count: held, color: "8B5CF6" },
    { label: "Booked", count: booked, color: "EF4444" },
  ].filter((c) => c.count > 0);

  const cardWidth = Math.min(1.8, 9 / cards.length - 0.1);
  cards.forEach((card, i) => {
    const x = 0.4 + i * (cardWidth + 0.15);
    summary.addShape("roundRect" as any, {
      x, y: 1.3, w: cardWidth, h: 1.4,
      fill: { color: card.color },
      rectRadius: 0.1,
    });
    summary.addText(String(card.count), {
      x, y: 1.5, w: cardWidth, h: 0.7,
      fontSize: 36, bold: true, color: "FFFFFF",
      align: "center", fontFace: "Arial",
    });
    summary.addText(card.label, {
      x, y: 2.2, w: cardWidth, h: 0.35,
      fontSize: 10, color: "FFFFFF",
      align: "center", fontFace: "Arial",
    });
  });

  // Date range info
  summary.addText(`Period: ${startFormatted} – ${endFormatted}`, {
    x: 0.5, y: 3.2, w: 9, h: 0.3,
    fontSize: 11, color: "64748B", align: "center", fontFace: "Arial",
  });

  // ─── Table Slides (paginated) ──────────────────────────────
  // Calculate how many rows fit per slide (header + data)
  const ROWS_PER_SLIDE = 12;
  const slideWidth = 9.5;
  const startX = 0.25;

  // Calculate column widths proportionally
  const totalFieldWidth = fields.reduce((s, f) => s + (f.width || 14), 0);
  const colWidths = fields.map((f) => ((f.width || 14) / totalFieldWidth) * slideWidth);

  // Override getValue for availability_status and date fields in PPT context
  const getFieldValue = (field: CustomExportField, row: any, idx: number): string => {
    if (field.key === "availability_status") return formatStatus(row);
    if (field.key === "available_from") return formatDateIN(row.available_from);
    if (field.key === "booked_till") return formatDateIN(row.booked_till);
    const val = field.getValue(row, idx);
    if (typeof val === "number" && field.key === "card_rate") {
      return `₹${val.toLocaleString("en-IN")}`;
    }
    return String(val ?? "");
  };

  for (let pageStart = 0; pageStart < rows.length; pageStart += ROWS_PER_SLIDE) {
    const slide = pptx.addSlide();
    const pageRows = rows.slice(pageStart, pageStart + ROWS_PER_SLIDE);
    const pageNum = Math.floor(pageStart / ROWS_PER_SLIDE) + 1;
    const totalPages = Math.ceil(rows.length / ROWS_PER_SLIDE);

    // Slide title
    slide.addText(`Media Availability – ${company}`, {
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

    // Header row
    fields.forEach((field, colIdx) => {
      let x = startX;
      for (let k = 0; k < colIdx; k++) x += colWidths[k];

      slide.addShape("rect", {
        x, y: tableY, w: colWidths[colIdx], h: headerHeight,
        fill: { color: brandColor },
      });
      slide.addText(field.label, {
        x, y: tableY, w: colWidths[colIdx], h: headerHeight,
        fontSize: 8, bold: true, color: "FFFFFF",
        align: "center", valign: "middle", fontFace: "Arial",
      });
    });

    // Data rows
    pageRows.forEach((row, rowIdx) => {
      const globalIdx = pageStart + rowIdx;
      const y = tableY + headerHeight + rowIdx * rowHeight;
      const bgColor = getStatusBgColor(row.availability_status);

      fields.forEach((field, colIdx) => {
        let x = startX;
        for (let k = 0; k < colIdx; k++) x += colWidths[k];

        // Cell background
        slide.addShape("rect", {
          x, y, w: colWidths[colIdx], h: rowHeight,
          fill: { color: bgColor },
          line: { color: "E2E8F0", width: 0.5 },
        });

        // Cell value
        const cellVal = getFieldValue(field, row, globalIdx);

        // Special rendering for status field
        if (field.key === "availability_status") {
          const statusColor = getStatusColor(row.availability_status);
          slide.addText(cellVal, {
            x, y, w: colWidths[colIdx], h: rowHeight,
            fontSize: 7, bold: true, color: statusColor,
            align: "center", valign: "middle", fontFace: "Arial",
          });
        } else {
          slide.addText(cellVal, {
            x, y, w: colWidths[colIdx], h: rowHeight,
            fontSize: 7, color: "374151",
            align: field.key === "location" ? "left" : "center",
            valign: "middle", fontFace: "Arial",
          });
        }
      });
    });

    // Footer
    slide.addText(`${company} | Go-Ads 360° OOH Media Management`, {
      x: 0, y: 5.1, w: 10, h: 0.2,
      fontSize: 7, color: "94A3B8", align: "center", fontFace: "Arial",
    });
  }

  // ─── Download ──────────────────────────────────────────────
  const pptxBlob = (await pptx.write({ outputType: "blob" })) as Blob;
  const url = URL.createObjectURL(pptxBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `MediaAvailability_${startDate}_to_${endDate}.pptx`;
  link.click();
  URL.revokeObjectURL(url);
}
