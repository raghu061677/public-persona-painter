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

interface BookingInfo {
  campaign_id: string;
  campaign_name: string;
  client_name: string;
  start_date: string;
  end_date: string;
  status: string;
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
  all_bookings?: BookingInfo[];
  available_from: string | null;
}

export type ExportTab = 'available' | 'booked' | 'soon' | 'conflict' | 'all';

interface ExportData {
  availableAssets: AvailableAsset[];
  bookedAssets: BookedAsset[];
  availableSoonAssets: BookedAsset[];
  conflictAssets?: BookedAsset[];
  dateRange: string;
  summary: {
    total_assets: number;
    available_count: number;
    booked_count: number;
    available_soon_count: number;
    conflict_count?: number;
    potential_revenue: number;
  };
  exportTab?: ExportTab;
}

// ==================== EXCEL EXPORT ====================
export async function generateAvailabilityExcel(data: ExportData): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const exportTab = data.exportTab || 'all';
  
  const brandColor = "FF1E3A8A";
  const headerColor = "FF3B82F6";
  const successGreen = "FF22C55E";
  const dangerRed = "FFDC2626";
  const warningYellow = "FFEAB308";
  const orangeColor = "FFF97316";

  // Helper function to create a sheet
  const createSheet = (
    sheetName: string, 
    assets: (AvailableAsset | BookedAsset)[], 
    type: 'available' | 'booked' | 'soon' | 'conflict'
  ) => {
    const sheet = workbook.addWorksheet(sheetName, {
      pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true },
    });

    sheet.columns = [
      { width: 6 }, { width: 18 }, { width: 12 }, { width: 15 },
      { width: 30 }, { width: 15 }, { width: 12 }, { width: 10 },
      { width: 12 }, { width: 12 }, { width: 20 }, { width: 14 },
    ];

    let row = 1;
    
    const titleColors: Record<string, string> = {
      available: brandColor,
      booked: dangerRed,
      soon: warningYellow,
      conflict: orangeColor,
    };
    
    const titleTexts: Record<string, string> = {
      available: "AVAILABLE ASSETS",
      booked: "BOOKED ASSETS",
      soon: "AVAILABLE SOON ASSETS",
      conflict: "CONFLICT ASSETS",
    };
    
    // Header
    sheet.mergeCells(`A${row}:L${row}`);
    const titleCell = sheet.getRow(row).getCell(1);
    titleCell.value = `MEDIA AVAILABILITY REPORT - ${titleTexts[type]}`;
    titleCell.font = { size: 16, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: titleColors[type] } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(row).height = 28;
    row++;

    // Date Range
    sheet.mergeCells(`A${row}:L${row}`);
    const infoCell = sheet.getRow(row).getCell(1);
    infoCell.value = `Period: ${data.dateRange} | Generated: ${format(new Date(), "dd MMM yyyy HH:mm")}`;
    infoCell.font = { size: 10, italic: true };
    infoCell.alignment = { horizontal: "center" };
    row += 2;

    // Summary
    sheet.getRow(row).values = [
      "Total:", assets.length
    ];
    sheet.getRow(row).font = { bold: true };
    row += 2;

    // Column Headers based on type
    const isBookedType = type === 'booked' || type === 'soon' || type === 'conflict';
    const colHeaders = isBookedType 
      ? ["S.No", "Asset ID", "City", "Area", "Location", "Media Type", "Dimensions", "Sq.Ft", "Direction", "Illumination", "Booking Info", "Card Rate"]
      : ["S.No", "Asset ID", "City", "Area", "Location", "Media Type", "Dimensions", "Sq.Ft", "Direction", "Illumination", "Status", "Card Rate"];
    
    const headerRow = sheet.getRow(row);
    headerRow.values = colHeaders;
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: titleColors[type] } };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };
    headerRow.height = 22;
    headerRow.eachCell(cell => {
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    });
    row++;

    // Data Rows
    assets.forEach((asset, index) => {
      const dataRow = sheet.getRow(row);
      const bookedAsset = asset as BookedAsset;
      const availableAsset = asset as AvailableAsset;
      
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
        asset.illumination_type || "-",
        isBookedType 
          ? (bookedAsset.current_booking?.campaign_name || "-")
          : (availableAsset.availability_status || asset.status),
        asset.card_rate,
      ];
      dataRow.eachCell((cell, colNum) => {
        cell.alignment = { horizontal: colNum === 5 ? "left" : "center", vertical: "middle" };
        cell.border = { top: { style: "thin", color: { argb: "FFD1D5DB" } }, left: { style: "thin", color: { argb: "FFD1D5DB" } }, bottom: { style: "thin", color: { argb: "FFD1D5DB" } }, right: { style: "thin", color: { argb: "FFD1D5DB" } } };
      });
      if (index % 2 === 0) {
        const altColors: Record<string, string> = {
          available: "FFF0FDF4",
          booked: "FFFEF2F2",
          soon: "FFFFFBEB",
          conflict: "FFFFF7ED",
        };
        dataRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: altColors[type] } };
      }
      row++;
    });
  };

  // Create sheets based on export tab
  if (exportTab === 'all' || exportTab === 'available') {
    if (data.availableAssets.length > 0) {
      createSheet("Available Assets", data.availableAssets, 'available');
    }
  }
  
  if (exportTab === 'all' || exportTab === 'booked') {
    if (data.bookedAssets.length > 0) {
      const nonConflictBooked = data.bookedAssets.filter(a => a.availability_status !== 'conflict');
      if (nonConflictBooked.length > 0) {
        createSheet("Booked Assets", nonConflictBooked, 'booked');
      }
    }
  }
  
  if (exportTab === 'all' || exportTab === 'soon') {
    if (data.availableSoonAssets.length > 0) {
      createSheet("Available Soon", data.availableSoonAssets, 'soon');
    }
  }
  
  if (exportTab === 'all' || exportTab === 'conflict') {
    const conflicts = data.conflictAssets || data.bookedAssets.filter(a => a.availability_status === 'conflict');
    if (conflicts.length > 0) {
      createSheet("Conflicts", conflicts, 'conflict');
    }
  }

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const tabSuffix = exportTab === 'all' ? '' : `-${exportTab}`;
  link.download = `media-availability${tabSuffix}-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}

// ==================== PDF EXPORT ====================
export async function generateAvailabilityPDF(data: ExportData): Promise<void> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const exportTab = data.exportTab || 'all';

  const addPageHeader = (title: string, color: [number, number, number]) => {
    doc.setFillColor(...color);
    doc.rect(0, 0, pageWidth, 22, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(title, pageWidth / 2, 10, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`${data.dateRange} | Generated: ${format(new Date(), "dd MMM yyyy")}`, pageWidth / 2, 18, { align: "center" });
  };

  const addFooter = () => {
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text("Go-Ads 360° | OOH Media Management Platform", pageWidth - 15, pageHeight - 8, { align: "right" });
  };

  let isFirstPage = true;

  // ===== AVAILABLE ASSETS PAGE =====
  if ((exportTab === 'all' || exportTab === 'available') && data.availableAssets.length > 0) {
    if (!isFirstPage) doc.addPage();
    isFirstPage = false;
    
    addPageHeader("MEDIA AVAILABILITY REPORT - AVAILABLE ASSETS", [30, 58, 138]);

    // Summary
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Available: ${data.availableAssets.length}`, 15, 30);

    const availableTableData = data.availableAssets.map((asset, i) => [
      (i + 1).toString(),
      asset.media_asset_code || asset.id,
      asset.city,
      asset.area,
      asset.location,
      asset.media_type,
      asset.direction || "-",
      asset.illumination_type || "-",
      `Rs. ${asset.card_rate.toLocaleString("en-IN")}`,
    ]);

    autoTable(doc, {
      startY: 38,
      head: [["S.No", "Asset ID", "City", "Area", "Location", "Type", "Direction", "Illumination", "Card Rate"]],
      body: availableTableData,
      theme: "grid",
      headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold", halign: "center" },
      bodyStyles: { fontSize: 7, textColor: [31, 41, 55] },
      alternateRowStyles: { fillColor: [240, 253, 244] },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 28, halign: "center" },
        2: { cellWidth: 20, halign: "center" },
        3: { cellWidth: 22, halign: "left" },
        4: { cellWidth: 45, halign: "left" },
        5: { cellWidth: 22, halign: "center" },
        6: { cellWidth: 20, halign: "center" },
        7: { cellWidth: 22, halign: "center" },
        8: { cellWidth: 25, halign: "right" },
      },
      margin: { left: 10, right: 10 },
      didDrawPage: addFooter,
    });
  }

  // ===== BOOKED ASSETS PAGE =====
  const nonConflictBooked = data.bookedAssets.filter(a => a.availability_status !== 'conflict');
  if ((exportTab === 'all' || exportTab === 'booked') && nonConflictBooked.length > 0) {
    if (!isFirstPage) doc.addPage();
    isFirstPage = false;
    
    addPageHeader("MEDIA AVAILABILITY REPORT - BOOKED ASSETS", [220, 38, 38]);

    const bookedTableData = nonConflictBooked.map((asset, i) => [
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
      didDrawPage: addFooter,
    });
  }

  // ===== AVAILABLE SOON ASSETS PAGE =====
  if ((exportTab === 'all' || exportTab === 'soon') && data.availableSoonAssets.length > 0) {
    if (!isFirstPage) doc.addPage();
    isFirstPage = false;
    
    addPageHeader("MEDIA AVAILABILITY REPORT - AVAILABLE SOON", [234, 179, 8]);

    const soonTableData = data.availableSoonAssets.map((asset, i) => [
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
      body: soonTableData,
      theme: "grid",
      headStyles: { fillColor: [234, 179, 8], textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold", halign: "center" },
      bodyStyles: { fontSize: 7, textColor: [31, 41, 55] },
      alternateRowStyles: { fillColor: [255, 251, 235] },
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
      didDrawPage: addFooter,
    });
  }

  // ===== CONFLICT ASSETS PAGE =====
  const conflicts = data.conflictAssets || data.bookedAssets.filter(a => a.availability_status === 'conflict');
  if ((exportTab === 'all' || exportTab === 'conflict') && conflicts.length > 0) {
    if (!isFirstPage) doc.addPage();
    isFirstPage = false;
    
    addPageHeader("MEDIA AVAILABILITY REPORT - CONFLICTS", [249, 115, 22]);

    const conflictTableData = conflicts.map((asset, i) => [
      (i + 1).toString(),
      asset.media_asset_code || asset.id,
      asset.city,
      asset.area,
      asset.location,
      (asset.all_bookings?.length || 0).toString() + " overlapping",
      asset.all_bookings?.map(b => b.campaign_name).join(", ") || "-",
      `Rs. ${asset.card_rate.toLocaleString("en-IN")}`,
    ]);

    autoTable(doc, {
      startY: 30,
      head: [["S.No", "Asset ID", "City", "Area", "Location", "Conflicts", "Campaigns", "Card Rate"]],
      body: conflictTableData,
      theme: "grid",
      headStyles: { fillColor: [249, 115, 22], textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold", halign: "center" },
      bodyStyles: { fontSize: 7, textColor: [31, 41, 55] },
      alternateRowStyles: { fillColor: [255, 247, 237] },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 28, halign: "center" },
        2: { cellWidth: 20, halign: "center" },
        3: { cellWidth: 22, halign: "left" },
        4: { cellWidth: 40, halign: "left" },
        5: { cellWidth: 22, halign: "center" },
        6: { cellWidth: 55, halign: "left" },
        7: { cellWidth: 22, halign: "right" },
      },
      margin: { left: 10, right: 10 },
      didDrawPage: addFooter,
    });
  }

  const tabSuffix = exportTab === 'all' ? '' : `-${exportTab}`;
  doc.save(`media-availability${tabSuffix}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}

// ==================== PPT EXPORT ====================
export async function generateAvailabilityPPT(data: ExportData): Promise<void> {
  const prs = new pptxgen();
  prs.author = "Go-Ads 360°";
  prs.company = "Go-Ads 360°";
  prs.title = `Media Availability Report - ${data.dateRange}`;
  const exportTab = data.exportTab || 'all';

  const brandBlue = "1E3A8A";
  const successGreen = "22C55E";
  const dangerRed = "DC2626";
  const warningYellow = "EAB308";
  const orangeColor = "F97316";

  // ===== COVER SLIDE =====
  const coverSlide = prs.addSlide();
  coverSlide.background = { fill: brandBlue };

  const titleTexts: Record<string, string> = {
    all: "MEDIA AVAILABILITY REPORT",
    available: "AVAILABLE ASSETS REPORT",
    booked: "BOOKED ASSETS REPORT",
    soon: "AVAILABLE SOON REPORT",
    conflict: "CONFLICT ASSETS REPORT",
  };

  coverSlide.addText(titleTexts[exportTab], {
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

  // Helper to create asset table slide
  const createAssetSlide = (
    title: string,
    assets: (AvailableAsset | BookedAsset)[],
    color: string,
    type: 'available' | 'booked' | 'soon' | 'conflict'
  ) => {
    if (assets.length === 0) return;

    const slide = prs.addSlide();
    slide.addText(title, {
      x: 0.5, y: 0.3, w: 9, h: 0.6,
      fontSize: 28, bold: true, color: color, fontFace: "Arial",
    });

    // Count card
    slide.addShape("rect", {
      x: 0.5, y: 1, w: 2, h: 0.8,
      fill: { color: color }, line: { color: color, width: 0 },
    });
    slide.addText(assets.length.toString(), {
      x: 0.5, y: 1.05, w: 2, h: 0.5,
      fontSize: 24, bold: true, color: "FFFFFF", align: "center", fontFace: "Arial",
    });
    slide.addText("Assets", {
      x: 0.5, y: 1.5, w: 2, h: 0.25,
      fontSize: 10, color: "FFFFFF", align: "center", fontFace: "Arial",
    });

    const tableRows: pptxgen.TableRow[] = [
      [
        { text: "Asset ID", options: { fill: { color: color }, color: "FFFFFF", bold: true, align: "center" } },
        { text: "City", options: { fill: { color: color }, color: "FFFFFF", bold: true, align: "center" } },
        { text: "Area", options: { fill: { color: color }, color: "FFFFFF", bold: true, align: "center" } },
        { text: "Location", options: { fill: { color: color }, color: "FFFFFF", bold: true, align: "left" } },
        { text: "Type", options: { fill: { color: color }, color: "FFFFFF", bold: true, align: "center" } },
        { text: type === 'conflict' ? "Conflicts" : "Rate", options: { fill: { color: color }, color: "FFFFFF", bold: true, align: "right" } },
      ],
    ];

    assets.slice(0, 12).forEach(asset => {
      const bookedAsset = asset as BookedAsset;
      tableRows.push([
        { text: asset.media_asset_code || asset.id, options: { align: "center" } },
        { text: asset.city, options: { align: "center" } },
        { text: asset.area, options: { align: "center" } },
        { text: asset.location, options: { align: "left" } },
        { text: asset.media_type, options: { align: "center" } },
        { text: type === 'conflict' 
          ? `${bookedAsset.all_bookings?.length || 0} overlapping` 
          : `Rs. ${asset.card_rate.toLocaleString("en-IN")}`, 
          options: { align: "right" } 
        },
      ]);
    });

    slide.addTable(tableRows, {
      x: 0.5, y: 2, w: 9, h: 2.5,
      fontSize: 9, fontFace: "Arial",
      border: { pt: 0.5, color: "D1D5DB" },
      colW: [1.6, 0.9, 1.2, 2.4, 1.2, 1.2],
    });

    if (assets.length > 12) {
      slide.addText(`+ ${assets.length - 12} more assets...`, {
        x: 0.5, y: 4.6, w: 9, h: 0.3,
        fontSize: 10, italic: true, color: "6B7280", align: "center", fontFace: "Arial",
      });
    }

    slide.addText("Go-Ads 360° | OOH Media Management Platform", {
      x: 0.5, y: 5.3, w: 9, h: 0.3,
      fontSize: 9, color: "94A3B8", align: "center", fontFace: "Arial",
    });
  };

  // Create slides based on export tab
  if (exportTab === 'all' || exportTab === 'available') {
    createAssetSlide("AVAILABLE ASSETS", data.availableAssets, successGreen, 'available');
  }
  
  if (exportTab === 'all' || exportTab === 'booked') {
    const nonConflictBooked = data.bookedAssets.filter(a => a.availability_status !== 'conflict');
    createAssetSlide("BOOKED ASSETS", nonConflictBooked, dangerRed, 'booked');
  }
  
  if (exportTab === 'all' || exportTab === 'soon') {
    createAssetSlide("AVAILABLE SOON", data.availableSoonAssets, warningYellow, 'soon');
  }
  
  if (exportTab === 'all' || exportTab === 'conflict') {
    const conflicts = data.conflictAssets || data.bookedAssets.filter(a => a.availability_status === 'conflict');
    createAssetSlide("CONFLICT ASSETS", conflicts, orangeColor, 'conflict');
  }

  const tabSuffix = exportTab === 'all' ? '' : `-${exportTab}`;
  await prs.writeFile({ fileName: `media-availability${tabSuffix}-${format(new Date(), "yyyy-MM-dd")}.pptx` });
}
