import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import pptxgen from "pptxgenjs";
import { format } from "date-fns";

import {
  EXPORT_COLUMNS,
  EXCEL_COLUMN_WIDTHS,
  standardizeAssets,
  type ExportSortOrder,
  type VacantAssetExportData,
} from "./vacantMediaExportUtils";

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
  exportSortOrder?: ExportSortOrder;
}

function getSortLabel(sortOrder: ExportSortOrder): string {
  return sortOrder === 'location'
    ? 'Location A-Z'
    : sortOrder === 'area'
      ? 'Area A-Z'
      : 'City → Area → Location';
}

function toVacantExportAsset(
  asset: AvailableAsset | BookedAsset,
  statusOverride?: string,
  nextAvailableFrom?: string | null
): VacantAssetExportData {
  const anyAsset = asset as any;
  return {
    id: asset.media_asset_code || asset.id,
    city: asset.city || anyAsset.location_city || "",
    area: asset.area || anyAsset.zone || anyAsset.subzone || "",
    location: asset.location || anyAsset.location_name || "",
    media_type: asset.media_type || anyAsset.category || "",
    dimensions: asset.dimensions || "",
    card_rate: asset.card_rate ?? 0,
    total_sqft: asset.total_sqft ?? null,
    status: statusOverride ?? asset.status,
    next_available_from: nextAvailableFrom ?? anyAsset.next_available_from ?? undefined,
    direction: anyAsset.direction ?? anyAsset.facing ?? undefined,
    illumination_type: anyAsset.illumination_type ?? anyAsset.illumination ?? anyAsset.lit_type ?? undefined,
    primary_photo_url: anyAsset.primary_photo_url ?? undefined,
    latitude: anyAsset.latitude ?? undefined,
    longitude: anyAsset.longitude ?? undefined,
    qr_code_url: anyAsset.qr_code_url ?? undefined,
  };
}

function getAssetsForExport(data: ExportData): VacantAssetExportData[] {
  const exportTab = data.exportTab || 'all';
  const nonConflictBooked = data.bookedAssets.filter(a => a.availability_status !== 'conflict');
  const conflicts = data.conflictAssets || data.bookedAssets.filter(a => a.availability_status === 'conflict');

  const availableRows = data.availableAssets.map((a) =>
    toVacantExportAsset(
      a,
      'available',
      a.availability_status === 'available_soon' ? a.next_available_from : null
    )
  );
  const bookedRows = nonConflictBooked.map((a) => toVacantExportAsset(a, 'booked', a.available_from));
  const soonRows = data.availableSoonAssets.map((a) => toVacantExportAsset(a, 'booked', a.available_from));
  const conflictRows = conflicts.map((a) => toVacantExportAsset(a, 'booked', a.available_from));

  switch (exportTab) {
    case 'available':
      return availableRows;
    case 'booked':
      return bookedRows;
    case 'soon':
      return soonRows;
    case 'conflict':
      return conflictRows;
    case 'all':
    default:
      return [...availableRows, ...bookedRows, ...soonRows, ...conflictRows];
  }
}

// ==================== EXCEL EXPORT ====================
export async function generateAvailabilityExcel(data: ExportData): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const exportTab = data.exportTab || 'all';
  const sortOrder = data.exportSortOrder || 'location';

  const standardized = standardizeAssets(getAssetsForExport(data), sortOrder);

  const worksheet = workbook.addWorksheet("Vacant Media", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true },
  });
  worksheet.columns = EXCEL_COLUMN_WIDTHS.map((width) => ({ width }));

  let row = 1;

  worksheet.mergeCells(`A${row}:K${row}`);
  const titleCell = worksheet.getRow(row).getCell(1);
  titleCell.value = "GO-ADS 360° – VACANT MEDIA REPORT";
  titleCell.font = { size: 18, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(row).height = 30;
  row++;

  worksheet.mergeCells(`A${row}:K${row}`);
  const infoCell = worksheet.getRow(row).getCell(1);
  infoCell.value = `Period: ${data.dateRange} | Generated: ${format(new Date(), "dd MMM yyyy HH:mm")} | Sorted by: ${getSortLabel(sortOrder)}`;
  infoCell.font = { size: 11, italic: true };
  infoCell.alignment = { horizontal: "center" };
  worksheet.getRow(row).height = 20;
  row += 2;

  const totalAssets = standardized.length;
  const totalSqft = standardized.reduce((sum, a) => sum + a.sqft, 0);
  worksheet.getRow(row).values = ["Total Assets:", totalAssets, "", "Total Sq.Ft:", totalSqft.toFixed(2)];
  worksheet.getRow(row).font = { bold: true };
  worksheet.getRow(row).height = 22;
  row += 2;

  const headerRow = worksheet.getRow(row);
  headerRow.values = [...EXPORT_COLUMNS];
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3B82F6" } };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
  });
  row++;

  standardized.forEach((asset, idx) => {
    const r = worksheet.getRow(row);
    r.values = [
      asset.sNo,
      asset.mediaType,
      asset.city,
      asset.area,
      asset.location,
      asset.direction,
      asset.dimensions,
      asset.sqft,
      asset.illumination,
      asset.cardRate,
      asset.status,
    ];

    r.getCell(10).numFmt = '₹#,##0';
    r.getCell(8).numFmt = '#,##0.00';

    r.eachCell((cell, colNumber) => {
      cell.alignment = { horizontal: colNumber === 5 ? 'left' : 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      };
    });

    if (idx % 2 === 0) {
      r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
    }
    row++;
  });

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
  const sortOrder = data.exportSortOrder || 'location';

  const standardized = standardizeAssets(getAssetsForExport(data), sortOrder);

  const addHeader = () => {
    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, pageWidth, 20, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("GO-ADS 360° – VACANT MEDIA REPORT", pageWidth / 2, 8, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Period: ${data.dateRange} | Sorted by: ${getSortLabel(sortOrder)} | Generated: ${format(new Date(), "dd MMM yyyy")}`,
      pageWidth / 2,
      16,
      { align: "center" }
    );
  };

  const addFooter = () => {
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text("Go-Ads 360° | OOH Media Management Platform", pageWidth - 15, pageHeight - 8, { align: "right" });
  };

  addHeader();

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Total Assets: ${standardized.length}`, 12, 28);

  const body = standardized.map((a) => [
    a.sNo,
    a.mediaType,
    a.city,
    a.area,
    a.location,
    a.direction,
    a.dimensions,
    a.sqft.toFixed(2),
    a.illumination,
    `Rs. ${Math.round(a.cardRate).toLocaleString("en-IN")}`,
    a.status,
  ]);

  autoTable(doc, {
    startY: 32,
    head: [[...EXPORT_COLUMNS]],
    body,
    theme: "grid",
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
      halign: "center",
    },
    bodyStyles: { fontSize: 7, textColor: [31, 41, 55] },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: 8, right: 8 },
    didDrawPage: addFooter,
  });

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
  const sortOrder = data.exportSortOrder || 'location';
  const standardized = standardizeAssets(getAssetsForExport(data), sortOrder);

  const brandBlue = "1E3A8A";

  // ===== COVER SLIDE =====
  const coverSlide = prs.addSlide();
  coverSlide.background = { fill: brandBlue };

  coverSlide.addText("VACANT MEDIA REPORT", {
    x: 0.5, y: 1.6, w: 9, h: 0.8,
    fontSize: 40, bold: true, color: "FFFFFF", align: "center", fontFace: "Arial",
  });
  coverSlide.addText(`Period: ${data.dateRange}`, {
    x: 0.5, y: 2.6, w: 9, h: 0.5,
    fontSize: 22, color: "FFFFFF", align: "center", fontFace: "Arial",
  });
  coverSlide.addText(`Sorted by: ${getSortLabel(sortOrder)} | Generated: ${format(new Date(), "dd MMM yyyy")}`, {
    x: 0.5, y: 3.2, w: 9, h: 0.4,
    fontSize: 12, color: "E2E8F0", align: "center", fontFace: "Arial",
  });
  coverSlide.addText(`${standardized.length} assets`, {
    x: 0.5, y: 3.8, w: 9, h: 0.5,
    fontSize: 18, color: "FFFFFF", align: "center", fontFace: "Arial",
  });

  // ===== TABLE SLIDES (PAGINATED) =====
  const rowsPerSlide = 14;
  const headerRow: pptxgen.TableRow = (EXPORT_COLUMNS as readonly string[]).map((label) => ({
    text: label,
    options: { fill: { color: "3B82F6" }, color: "FFFFFF", bold: true, align: "center" },
  })) as any;

  const makeRow = (a: any): pptxgen.TableRow => ([
    { text: String(a.sNo), options: { align: "center" } },
    { text: a.mediaType, options: { align: "center" } },
    { text: a.city, options: { align: "center" } },
    { text: a.area, options: { align: "center" } },
    { text: a.location, options: { align: "left" } },
    { text: a.direction, options: { align: "center" } },
    { text: a.dimensions, options: { align: "center" } },
    { text: Number(a.sqft).toFixed(2), options: { align: "right" } },
    { text: a.illumination, options: { align: "center" } },
    { text: `Rs. ${Math.round(a.cardRate).toLocaleString("en-IN")}`, options: { align: "right" } },
    { text: a.status, options: { align: "center" } },
  ] as any);

  for (let i = 0; i < standardized.length; i += rowsPerSlide) {
    const chunk = standardized.slice(i, i + rowsPerSlide);
    const slide = prs.addSlide();

    slide.addText(`VACANT MEDIA (${exportTab.toUpperCase()})`, {
      x: 0.5, y: 0.2, w: 9, h: 0.4,
      fontSize: 18, bold: true, color: "1E3A8A", fontFace: "Arial",
    });
    slide.addText(`Sorted by: ${getSortLabel(sortOrder)} | Period: ${data.dateRange}`, {
      x: 0.5, y: 0.62, w: 9, h: 0.3,
      fontSize: 10, color: "64748B", fontFace: "Arial",
    });

    const tableRows: pptxgen.TableRow[] = [headerRow, ...chunk.map(makeRow)];
    slide.addTable(tableRows, {
      x: 0.3, y: 1.0, w: 9.4, h: 5.7,
      fontSize: 8,
      fontFace: "Arial",
      border: { pt: 0.5, color: "D1D5DB" },
      colW: [0.45, 1.0, 0.8, 0.9, 2.2, 0.9, 0.9, 0.7, 0.9, 0.9, 0.75],
    });
  }

  const tabSuffix = exportTab === 'all' ? '' : `-${exportTab}`;
  await prs.writeFile({ fileName: `media-availability${tabSuffix}-${format(new Date(), "yyyy-MM-dd")}.pptx` });
}
