import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import pptxgen from "pptxgenjs";
import { format } from "date-fns";

interface AvailableAsset {
  id: string;
  media_asset_code: string | null;
  city: string;
  area: string;
  location: string;
  media_type: string;
  dimensions: string | null;
  card_rate: number;
  total_sqft: number | null;
  status: string;
  direction?: string | null;
  illumination_type?: string | null;
  primary_photo_url?: string | null;
  availability_status: 'available' | 'available_soon';
  next_available_from: string | null;
}

interface BookedAsset {
  id: string;
  media_asset_code: string | null;
  city: string;
  area: string;
  location: string;
  media_type: string;
  dimensions: string | null;
  card_rate: number;
  total_sqft: number | null;
  status: string;
  direction?: string | null;
  illumination_type?: string | null;
  availability_status: 'booked' | 'conflict';
  current_booking: {
    campaign_name: string;
    client_name: string;
    start_date: string;
    end_date: string;
  } | null;
  available_from: string | null;
}

interface ExportData {
  availableAssets: AvailableAsset[];
  bookedAssets: BookedAsset[];
  availableSoonAssets: BookedAsset[];
  dateRange: string;
  summary: {
    total_assets: number;
    available_count: number;
    booked_count: number;
    available_soon_count: number;
    potential_revenue: number;
  };
}

// ==================== EXCEL EXPORT ====================
export async function generateAvailabilityExcel(data: ExportData): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  
  const brandColor = "FF1E3A8A";
  const headerColor = "FF3B82F6";

  // ===== AVAILABLE ASSETS SHEET =====
  const availableSheet = workbook.addWorksheet("Available Assets", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true },
  });

  availableSheet.columns = [
    { width: 6 }, { width: 18 }, { width: 12 }, { width: 15 },
    { width: 30 }, { width: 15 }, { width: 12 }, { width: 10 },
    { width: 12 }, { width: 14 },
  ];

  let row = 1;
  
  // Header
  availableSheet.mergeCells(`A${row}:J${row}`);
  const titleCell = availableSheet.getRow(row).getCell(1);
  titleCell.value = "MEDIA AVAILABILITY REPORT - AVAILABLE ASSETS";
  titleCell.font = { size: 16, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: brandColor } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  availableSheet.getRow(row).height = 28;
  row++;

  // Date Range
  availableSheet.mergeCells(`A${row}:J${row}`);
  const infoCell = availableSheet.getRow(row).getCell(1);
  infoCell.value = `Period: ${data.dateRange} | Generated: ${format(new Date(), "dd MMM yyyy HH:mm")}`;
  infoCell.font = { size: 10, italic: true };
  infoCell.alignment = { horizontal: "center" };
  row += 2;

  // Summary
  availableSheet.getRow(row).values = [
    "Total Available:", data.summary.available_count, "",
    "Potential Revenue:", `Rs. ${data.summary.potential_revenue.toLocaleString("en-IN")}`,
  ];
  availableSheet.getRow(row).font = { bold: true };
  row += 2;

  // Column Headers
  const colHeaders = ["S.No", "Asset ID", "City", "Area", "Location", "Media Type", "Dimensions", "Sq.Ft", "Direction", "Card Rate"];
  const headerRow = availableSheet.getRow(row);
  headerRow.values = colHeaders;
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: headerColor } };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };
  headerRow.height = 22;
  headerRow.eachCell(cell => {
    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
  });
  row++;

  // Data Rows
  data.availableAssets.forEach((asset, index) => {
    const dataRow = availableSheet.getRow(row);
    dataRow.values = [
      index + 1,
      asset.media_asset_code || asset.id,
      asset.city,
      asset.area,
      asset.location,
      asset.media_type,
      asset.dimensions || "-",
      asset.total_sqft || 0,
      asset.direction || "-",
      asset.card_rate,
    ];
    dataRow.eachCell((cell, colNum) => {
      cell.alignment = { horizontal: colNum === 5 ? "left" : "center", vertical: "middle" };
      cell.border = { top: { style: "thin", color: { argb: "FFD1D5DB" } }, left: { style: "thin", color: { argb: "FFD1D5DB" } }, bottom: { style: "thin", color: { argb: "FFD1D5DB" } }, right: { style: "thin", color: { argb: "FFD1D5DB" } } };
    });
    if (index % 2 === 0) {
      dataRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
    }
    row++;
  });

  // ===== BOOKED ASSETS SHEET =====
  const bookedSheet = workbook.addWorksheet("Booked Assets", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true },
  });

  bookedSheet.columns = [
    { width: 6 }, { width: 18 }, { width: 12 }, { width: 15 },
    { width: 25 }, { width: 15 }, { width: 20 }, { width: 20 }, { width: 14 },
  ];

  row = 1;

  // Header
  bookedSheet.mergeCells(`A${row}:I${row}`);
  const bookedTitleCell = bookedSheet.getRow(row).getCell(1);
  bookedTitleCell.value = "MEDIA AVAILABILITY REPORT - BOOKED ASSETS";
  bookedTitleCell.font = { size: 16, bold: true, color: { argb: "FFFFFFFF" } };
  bookedTitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDC2626" } };
  bookedTitleCell.alignment = { horizontal: "center", vertical: "middle" };
  bookedSheet.getRow(row).height = 28;
  row++;

  // Date Range
  bookedSheet.mergeCells(`A${row}:I${row}`);
  const bookedInfoCell = bookedSheet.getRow(row).getCell(1);
  bookedInfoCell.value = `Period: ${data.dateRange} | Generated: ${format(new Date(), "dd MMM yyyy HH:mm")}`;
  bookedInfoCell.font = { size: 10, italic: true };
  bookedInfoCell.alignment = { horizontal: "center" };
  row += 2;

  // Summary
  bookedSheet.getRow(row).values = ["Total Booked:", data.summary.booked_count];
  bookedSheet.getRow(row).font = { bold: true };
  row += 2;

  // Column Headers
  const bookedColHeaders = ["S.No", "Asset ID", "City", "Area", "Location", "Media Type", "Current Campaign", "Available From", "Card Rate"];
  const bookedHeaderRow = bookedSheet.getRow(row);
  bookedHeaderRow.values = bookedColHeaders;
  bookedHeaderRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  bookedHeaderRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDC2626" } };
  bookedHeaderRow.alignment = { horizontal: "center", vertical: "middle" };
  bookedHeaderRow.height = 22;
  bookedHeaderRow.eachCell(cell => {
    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
  });
  row++;

  // Data Rows
  data.bookedAssets.forEach((asset, index) => {
    const dataRow = bookedSheet.getRow(row);
    dataRow.values = [
      index + 1,
      asset.media_asset_code || asset.id,
      asset.city,
      asset.area,
      asset.location,
      asset.media_type,
      asset.current_booking?.campaign_name || "-",
      asset.available_from ? format(new Date(asset.available_from), "dd MMM yyyy") : "-",
      asset.card_rate,
    ];
    dataRow.eachCell((cell, colNum) => {
      cell.alignment = { horizontal: colNum === 5 ? "left" : "center", vertical: "middle" };
      cell.border = { top: { style: "thin", color: { argb: "FFD1D5DB" } }, left: { style: "thin", color: { argb: "FFD1D5DB" } }, bottom: { style: "thin", color: { argb: "FFD1D5DB" } }, right: { style: "thin", color: { argb: "FFD1D5DB" } } };
    });
    if (index % 2 === 0) {
      dataRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF2F2" } };
    }
    row++;
  });

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `media-availability-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}

// ==================== PDF EXPORT ====================
export async function generateAvailabilityPDF(data: ExportData): Promise<void> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // ===== AVAILABLE ASSETS PAGE =====
  // Header
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, pageWidth, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("MEDIA AVAILABILITY REPORT - AVAILABLE ASSETS", pageWidth / 2, 10, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`${data.dateRange} | Generated: ${format(new Date(), "dd MMM yyyy")}`, pageWidth / 2, 18, { align: "center" });

  // Summary
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Available: ${data.summary.available_count}`, 15, 30);
  doc.text(`Booked: ${data.summary.booked_count}`, 80, 30);
  doc.text(`Potential Revenue: Rs. ${data.summary.potential_revenue.toLocaleString("en-IN")}`, 145, 30);

  // Available Assets Table
  const availableTableData = data.availableAssets.map((asset, i) => [
    (i + 1).toString(),
    asset.media_asset_code || asset.id,
    asset.city,
    asset.area,
    asset.location,
    asset.media_type,
    asset.dimensions || "-",
    (asset.total_sqft || 0).toString(),
    `Rs. ${asset.card_rate.toLocaleString("en-IN")}`,
  ]);

  autoTable(doc, {
    startY: 38,
    head: [["S.No", "Asset ID", "City", "Area", "Location", "Type", "Dimensions", "Sq.Ft", "Card Rate"]],
    body: availableTableData,
    theme: "grid",
    headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold", halign: "center" },
    bodyStyles: { fontSize: 7, textColor: [31, 41, 55] },
    alternateRowStyles: { fillColor: [240, 253, 244] },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 28, halign: "center" },
      2: { cellWidth: 20, halign: "center" },
      3: { cellWidth: 25, halign: "left" },
      4: { cellWidth: 50, halign: "left" },
      5: { cellWidth: 22, halign: "center" },
      6: { cellWidth: 22, halign: "center" },
      7: { cellWidth: 15, halign: "center" },
      8: { cellWidth: 25, halign: "right" },
    },
    margin: { left: 10, right: 10 },
    didDrawPage: () => {
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text("Go-Ads 360° | OOH Media Management Platform", pageWidth - 15, pageHeight - 8, { align: "right" });
    },
  });

  // ===== BOOKED ASSETS PAGE =====
  if (data.bookedAssets.length > 0) {
    doc.addPage();
    
    doc.setFillColor(220, 38, 38);
    doc.rect(0, 0, pageWidth, 22, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("MEDIA AVAILABILITY REPORT - BOOKED ASSETS", pageWidth / 2, 10, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`${data.dateRange} | Generated: ${format(new Date(), "dd MMM yyyy")}`, pageWidth / 2, 18, { align: "center" });

    const bookedTableData = data.bookedAssets.map((asset, i) => [
      (i + 1).toString(),
      asset.media_asset_code || asset.id,
      asset.city,
      asset.area,
      asset.location,
      asset.current_booking?.campaign_name || "-",
      asset.available_from ? format(new Date(asset.available_from), "dd MMM yyyy") : "-",
      `Rs. ${asset.card_rate.toLocaleString("en-IN")}`,
    ]);

    autoTable(doc, {
      startY: 30,
      head: [["S.No", "Asset ID", "City", "Area", "Location", "Current Campaign", "Available From", "Card Rate"]],
      body: bookedTableData,
      theme: "grid",
      headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold", halign: "center" },
      bodyStyles: { fontSize: 7, textColor: [31, 41, 55] },
      alternateRowStyles: { fillColor: [254, 242, 242] },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 28, halign: "center" },
        2: { cellWidth: 20, halign: "center" },
        3: { cellWidth: 25, halign: "left" },
        4: { cellWidth: 50, halign: "left" },
        5: { cellWidth: 40, halign: "left" },
        6: { cellWidth: 25, halign: "center" },
        7: { cellWidth: 25, halign: "right" },
      },
      margin: { left: 10, right: 10 },
    });
  }

  doc.save(`media-availability-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}

// ==================== PPT EXPORT ====================
export async function generateAvailabilityPPT(data: ExportData): Promise<void> {
  const prs = new pptxgen();
  prs.author = "Go-Ads 360°";
  prs.company = "Go-Ads 360°";
  prs.title = `Media Availability Report - ${data.dateRange}`;

  const brandBlue = "1E3A8A";
  const successGreen = "22C55E";
  const dangerRed = "DC2626";

  // ===== COVER SLIDE =====
  const coverSlide = prs.addSlide();
  coverSlide.background = { fill: brandBlue };

  coverSlide.addText("MEDIA AVAILABILITY REPORT", {
    x: 0.5, y: 1.8, w: 9, h: 1.2,
    fontSize: 40, bold: true, color: "FFFFFF", align: "center", fontFace: "Arial",
  });

  coverSlide.addText(data.dateRange, {
    x: 0.5, y: 3.2, w: 9, h: 0.6,
    fontSize: 24, color: "FFFFFF", align: "center", fontFace: "Arial",
  });

  coverSlide.addText(`Generated: ${format(new Date(), "dd MMM yyyy")}`, {
    x: 0.5, y: 3.9, w: 9, h: 0.5,
    fontSize: 14, color: "94A3B8", align: "center", fontFace: "Arial",
  });

  // ===== SUMMARY SLIDE =====
  const summarySlide = prs.addSlide();
  summarySlide.addText("AVAILABILITY SUMMARY", {
    x: 0.5, y: 0.3, w: 9, h: 0.6,
    fontSize: 28, bold: true, color: brandBlue, fontFace: "Arial",
  });

  // Summary Cards
  const cards = [
    { label: "Available", value: data.summary.available_count.toString(), color: successGreen, x: 0.5 },
    { label: "Booked", value: data.summary.booked_count.toString(), color: dangerRed, x: 2.8 },
    { label: "Available Soon", value: data.summary.available_soon_count.toString(), color: "EAB308", x: 5.1 },
    { label: "Potential Revenue", value: `Rs. ${data.summary.potential_revenue.toLocaleString("en-IN")}`, color: brandBlue, x: 7.4 },
  ];

  cards.forEach(card => {
    summarySlide.addShape("rect", {
      x: card.x, y: 1.2, w: 2.1, h: 1.4,
      fill: { color: card.color }, line: { color: card.color, width: 0 },
    });
    summarySlide.addText(card.value, {
      x: card.x, y: 1.35, w: 2.1, h: 0.7,
      fontSize: 26, bold: true, color: "FFFFFF", align: "center", fontFace: "Arial",
    });
    summarySlide.addText(card.label, {
      x: card.x, y: 2.1, w: 2.1, h: 0.4,
      fontSize: 11, color: "FFFFFF", align: "center", fontFace: "Arial",
    });
  });

  // Available Assets Table
  if (data.availableAssets.length > 0) {
    const tableRows: pptxgen.TableRow[] = [
      [
        { text: "Asset ID", options: { fill: { color: successGreen }, color: "FFFFFF", bold: true, align: "center" } },
        { text: "City", options: { fill: { color: successGreen }, color: "FFFFFF", bold: true, align: "center" } },
        { text: "Area", options: { fill: { color: successGreen }, color: "FFFFFF", bold: true, align: "center" } },
        { text: "Location", options: { fill: { color: successGreen }, color: "FFFFFF", bold: true, align: "left" } },
        { text: "Type", options: { fill: { color: successGreen }, color: "FFFFFF", bold: true, align: "center" } },
        { text: "Rate", options: { fill: { color: successGreen }, color: "FFFFFF", bold: true, align: "right" } },
      ],
    ];

    data.availableAssets.slice(0, 12).forEach(asset => {
      tableRows.push([
        { text: asset.media_asset_code || asset.id, options: { align: "center" } },
        { text: asset.city, options: { align: "center" } },
        { text: asset.area, options: { align: "center" } },
        { text: asset.location, options: { align: "left" } },
        { text: asset.media_type, options: { align: "center" } },
        { text: `Rs. ${asset.card_rate.toLocaleString("en-IN")}`, options: { align: "right" } },
      ]);
    });

    summarySlide.addTable(tableRows, {
      x: 0.5, y: 2.8, w: 9, h: 2.2,
      fontSize: 9, fontFace: "Arial",
      border: { pt: 0.5, color: "D1D5DB" },
      colW: [1.6, 0.9, 1.2, 2.4, 1.2, 1.2],
    });

    if (data.availableAssets.length > 12) {
      summarySlide.addText(`+ ${data.availableAssets.length - 12} more available assets...`, {
        x: 0.5, y: 5.05, w: 9, h: 0.3,
        fontSize: 10, italic: true, color: "6B7280", align: "center", fontFace: "Arial",
      });
    }
  }

  // Footer
  summarySlide.addText("Go-Ads 360° | OOH Media Management Platform", {
    x: 0.5, y: 5.3, w: 9, h: 0.3,
    fontSize: 9, color: "94A3B8", align: "center", fontFace: "Arial",
  });

  // ===== BOOKED ASSETS SLIDE =====
  if (data.bookedAssets.length > 0) {
    const bookedSlide = prs.addSlide();
    bookedSlide.addText("BOOKED ASSETS", {
      x: 0.5, y: 0.3, w: 9, h: 0.6,
      fontSize: 28, bold: true, color: dangerRed, fontFace: "Arial",
    });

    const bookedRows: pptxgen.TableRow[] = [
      [
        { text: "Asset ID", options: { fill: { color: dangerRed }, color: "FFFFFF", bold: true, align: "center" } },
        { text: "City", options: { fill: { color: dangerRed }, color: "FFFFFF", bold: true, align: "center" } },
        { text: "Location", options: { fill: { color: dangerRed }, color: "FFFFFF", bold: true, align: "left" } },
        { text: "Current Campaign", options: { fill: { color: dangerRed }, color: "FFFFFF", bold: true, align: "left" } },
        { text: "Available From", options: { fill: { color: dangerRed }, color: "FFFFFF", bold: true, align: "center" } },
      ],
    ];

    data.bookedAssets.slice(0, 14).forEach(asset => {
      bookedRows.push([
        { text: asset.media_asset_code || asset.id, options: { align: "center" } },
        { text: asset.city, options: { align: "center" } },
        { text: asset.location, options: { align: "left" } },
        { text: asset.current_booking?.campaign_name || "-", options: { align: "left" } },
        { text: asset.available_from ? format(new Date(asset.available_from), "dd MMM yyyy") : "-", options: { align: "center" } },
      ]);
    });

    bookedSlide.addTable(bookedRows, {
      x: 0.5, y: 1.0, w: 9, h: 3.8,
      fontSize: 9, fontFace: "Arial",
      border: { pt: 0.5, color: "D1D5DB" },
      colW: [1.8, 1.0, 2.5, 2.2, 1.5],
    });

    bookedSlide.addText("Go-Ads 360° | OOH Media Management Platform", {
      x: 0.5, y: 5.3, w: 9, h: 0.3,
      fontSize: 9, color: "94A3B8", align: "center", fontFace: "Arial",
    });
  }

  // Save
  await prs.writeFile({ fileName: `media-availability-${format(new Date(), "yyyy-MM-dd")}.pptx` });
}
