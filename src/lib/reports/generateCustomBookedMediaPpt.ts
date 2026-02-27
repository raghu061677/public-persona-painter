import PptxGenJS from "pptxgenjs";
import { ALL_BOOKED_EXPORT_FIELDS, type BookedExportField } from "./generateCustomBookedMediaExcel";

function formatDateIN(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
  } catch { return "-"; }
}

function getStatusColor(status: string): string {
  switch (status) {
    case "Completed": return "22C55E";
    case "Cancelled": return "EF4444";
    case "Running": case "InProgress": case "Active": return "3B82F6";
    case "Planned": case "Upcoming": return "F59E0B";
    default: return "64748B";
  }
}

function getStatusBgColor(status: string): string {
  switch (status) {
    case "Completed": return "E8F5E9";
    case "Cancelled": return "FEE2E2";
    case "Running": case "InProgress": case "Active": return "DBEAFE";
    case "Planned": case "Upcoming": return "FFF3E0";
    default: return "F9FAFB";
  }
}

export async function generateCustomBookedMediaPpt(
  rows: any[],
  selectedFieldKeys: string[],
  startDate: string,
  endDate: string,
  companyName?: string,
  themeColor?: string,
): Promise<void> {
  const fields = selectedFieldKeys
    .map((key) => ALL_BOOKED_EXPORT_FIELDS.find((f) => f.key === key))
    .filter(Boolean) as BookedExportField[];

  if (fields.length === 0 || rows.length === 0) return;

  const brandColor = themeColor?.replace("#", "") || "1E3A8A";
  const company = companyName || "Go-Ads 360°";
  const startF = formatDateIN(startDate);
  const endF = formatDateIN(endDate);

  const pptx = new PptxGenJS();
  pptx.author = "Go-Ads 360°";
  pptx.company = company;
  pptx.title = `Booked Media Report – ${startDate} to ${endDate}`;
  pptx.layout = "LAYOUT_16x9";

  // Cover
  const cover = pptx.addSlide();
  cover.background = { color: brandColor };
  cover.addText("BOOKED MEDIA REPORT", {
    x: 0.5, y: 1.5, w: 9, h: 0.8,
    fontSize: 32, bold: true, color: "FFFFFF", align: "center", fontFace: "Arial",
  });
  cover.addText(`${startF} to ${endF}`, {
    x: 0.5, y: 2.8, w: 9, h: 0.5,
    fontSize: 18, color: "CBD5E1", align: "center", fontFace: "Arial",
  });
  cover.addText(company, {
    x: 0.5, y: 4.0, w: 9, h: 0.4,
    fontSize: 14, color: "94A3B8", align: "center", fontFace: "Arial",
  });
  cover.addText(`${rows.length} Bookings | ${fields.length} Columns`, {
    x: 0.5, y: 4.5, w: 9, h: 0.3,
    fontSize: 11, color: "64748B", align: "center", fontFace: "Arial",
  });

  // Summary
  const uniqueAssets = new Set(rows.map((r) => r.asset_id || r.asset_code)).size;
  const uniqueCampaigns = new Set(rows.map((r) => r.campaign_name)).size;
  const uniqueClients = new Set(rows.map((r) => r.client_name)).size;

  const summarySlide = pptx.addSlide();
  summarySlide.addText("BOOKING SUMMARY", {
    x: 0.5, y: 0.3, w: 9, h: 0.6,
    fontSize: 26, bold: true, color: brandColor, fontFace: "Arial",
  });

  const cards = [
    { label: "Total Bookings", count: rows.length, color: brandColor },
    { label: "Unique Assets", count: uniqueAssets, color: "3B82F6" },
    { label: "Campaigns", count: uniqueCampaigns, color: "22C55E" },
    { label: "Clients", count: uniqueClients, color: "F59E0B" },
  ];

  const cardWidth = 2.0;
  cards.forEach((card, i) => {
    const x = 0.5 + i * (cardWidth + 0.25);
    summarySlide.addShape("roundRect" as any, {
      x, y: 1.3, w: cardWidth, h: 1.4, fill: { color: card.color }, rectRadius: 0.1,
    });
    summarySlide.addText(String(card.count), {
      x, y: 1.5, w: cardWidth, h: 0.7,
      fontSize: 36, bold: true, color: "FFFFFF", align: "center", fontFace: "Arial",
    });
    summarySlide.addText(card.label, {
      x, y: 2.2, w: cardWidth, h: 0.35,
      fontSize: 10, color: "FFFFFF", align: "center", fontFace: "Arial",
    });
  });

  summarySlide.addText(`Period: ${startF} – ${endF}`, {
    x: 0.5, y: 3.2, w: 9, h: 0.3,
    fontSize: 11, color: "64748B", align: "center", fontFace: "Arial",
  });

  // Table slides
  const ROWS_PER_SLIDE = 12;
  const slideWidth = 9.5;
  const startX = 0.25;
  const totalFieldWidth = fields.reduce((s, f) => s + (f.width || 14), 0);
  const colWidths = fields.map((f) => ((f.width || 14) / totalFieldWidth) * slideWidth);

  for (let pageStart = 0; pageStart < rows.length; pageStart += ROWS_PER_SLIDE) {
    const slide = pptx.addSlide();
    const pageRows = rows.slice(pageStart, pageStart + ROWS_PER_SLIDE);
    const pageNum = Math.floor(pageStart / ROWS_PER_SLIDE) + 1;
    const totalPages = Math.ceil(rows.length / ROWS_PER_SLIDE);

    slide.addText(`Booked Media – ${company}`, {
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
      slide.addShape("rect", { x, y: tableY, w: colWidths[colIdx], h: headerHeight, fill: { color: brandColor } });
      slide.addText(field.label, {
        x, y: tableY, w: colWidths[colIdx], h: headerHeight,
        fontSize: 8, bold: true, color: "FFFFFF", align: "center", valign: "middle", fontFace: "Arial",
      });
    });

    // Data
    pageRows.forEach((row, rowIdx) => {
      const globalIdx = pageStart + rowIdx;
      const y = tableY + headerHeight + rowIdx * rowHeight;
      const bgColor = getStatusBgColor(row.campaign_status);

      fields.forEach((field, colIdx) => {
        let x = startX;
        for (let k = 0; k < colIdx; k++) x += colWidths[k];

        slide.addShape("rect", {
          x, y, w: colWidths[colIdx], h: rowHeight,
          fill: { color: bgColor }, line: { color: "E2E8F0", width: 0.5 },
        });

        const cellVal = String(field.getValue(row, globalIdx) ?? "");

        if (field.key === "campaign_status") {
          slide.addText(cellVal, {
            x, y, w: colWidths[colIdx], h: rowHeight,
            fontSize: 7, bold: true, color: getStatusColor(row.campaign_status),
            align: "center", valign: "middle", fontFace: "Arial",
          });
        } else {
          slide.addText(cellVal, {
            x, y, w: colWidths[colIdx], h: rowHeight,
            fontSize: 7, color: "374151",
            align: field.key === "location" || field.key === "address" ? "left" : "center",
            valign: "middle", fontFace: "Arial",
          });
        }
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
  link.download = `BookedMediaReport_${startDate}_to_${endDate}.pptx`;
  link.click();
  URL.revokeObjectURL(url);
}
