import ExcelJS from "exceljs";
import { format } from "date-fns";

export interface CustomExportField {
  key: string;
  label: string;
  group: string;
  getValue: (row: any, idx: number) => string | number;
  width?: number;
  numFmt?: string;
}

// All available fields grouped by category
export const ALL_EXPORT_FIELDS: CustomExportField[] = [
  // Core
  { key: 'sno', label: 'S.No', group: 'Core', getValue: (_r, i) => i + 1, width: 6 },
  { key: 'asset_id', label: 'Asset ID', group: 'Core', getValue: (r) => r.media_asset_code || r.asset_id || '', width: 20 },

  // Location
  { key: 'area', label: 'Area', group: 'Location', getValue: (r) => r.area || '', width: 15 },
  { key: 'location', label: 'Location', group: 'Location', getValue: (r) => r.location || '', width: 30 },
  { key: 'direction', label: 'Direction', group: 'Location', getValue: (r) => r.direction || '', width: 12 },
  { key: 'city', label: 'City', group: 'Location', getValue: (r) => r.city || '', width: 14 },

  // Specifications
  { key: 'dimension', label: 'Dimension', group: 'Specifications', getValue: (r) => r.dimension || '', width: 14 },
  { key: 'sqft', label: 'Sq.Ft', group: 'Specifications', getValue: (r) => r.sqft || 0, width: 10, numFmt: '#,##0.00' },
  { key: 'illumination', label: 'Illumination', group: 'Specifications', getValue: (r) => r.illumination || '', width: 14 },
  { key: 'media_type', label: 'Media Type', group: 'Specifications', getValue: (r) => r.media_type || '', width: 16 },

  // Availability
  { key: 'availability_status', label: 'Availability Status', group: 'Availability', getValue: (r) => {
    if (r.availability_status === 'VACANT_NOW') return 'Available';
    if (r.availability_status === 'AVAILABLE_SOON') return 'Available Soon';
    return 'Booked';
  }, width: 18 },
  { key: 'available_from', label: 'Available From', group: 'Availability', getValue: (r) => {
    try { return r.available_from ? format(new Date(r.available_from), 'dd-MM-yyyy') : ''; } catch { return r.available_from || ''; }
  }, width: 14 },
  { key: 'booked_till', label: 'Booked Till', group: 'Availability', getValue: (r) => {
    try { return r.booked_till ? format(new Date(r.booked_till), 'dd-MM-yyyy') : ''; } catch { return r.booked_till || ''; }
  }, width: 14 },

  // Pricing
  { key: 'card_rate', label: 'Card Rate', group: 'Pricing', getValue: (r) => r.card_rate || 0, width: 14, numFmt: '₹#,##0' },

  // Campaign & Client
  { key: 'campaign_name', label: 'Campaign Name', group: 'Campaign & Client', getValue: (r) => r.current_campaign_name || '', width: 24 },
  { key: 'client_name', label: 'Client Name', group: 'Campaign & Client', getValue: (r) => r.current_client_name || '', width: 24 },

  // Geo Coordinates
  { key: 'latitude', label: 'Latitude', group: 'Geo Coordinates', getValue: (r) => r.latitude ?? '', width: 14, numFmt: '0.000000' },
  { key: 'longitude', label: 'Longitude', group: 'Geo Coordinates', getValue: (r) => r.longitude ?? '', width: 14, numFmt: '0.000000' },
];

export const DEFAULT_CUSTOM_FIELDS = [
  'sno', 'asset_id', 'area', 'location', 'direction', 'dimension', 'sqft',
  'illumination', 'availability_status', 'available_from', 'booked_till', 'card_rate',
];

export const FIELD_GROUPS = [...new Set(ALL_EXPORT_FIELDS.map(f => f.group))];

export async function generateCustomAvailabilityExcel(
  rows: any[],
  selectedFieldKeys: string[],
  startDate: string,
  endDate: string,
  companyName?: string,
): Promise<void> {
  const fields = selectedFieldKeys
    .map(key => ALL_EXPORT_FIELDS.find(f => f.key === key))
    .filter(Boolean) as CustomExportField[];

  if (fields.length === 0) return;

  const colCount = fields.length;
  const lastCol = String.fromCharCode(64 + Math.min(colCount, 26)); // A-Z
  const mergeEnd = colCount > 26 ? `A${colCount}` : `${lastCol}`;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Custom Media Report", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true },
  });

  // Column widths
  worksheet.columns = fields.map(f => ({ width: f.width || 14 }));

  let currentRow = 1;

  // Title row
  worksheet.mergeCells(currentRow, 1, currentRow, colCount);
  const titleCell = worksheet.getRow(currentRow).getCell(1);
  titleCell.value = `${companyName || 'GO-ADS 360°'} – MEDIA REPORT`;
  titleCell.font = { size: 16, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(currentRow).height = 30;
  currentRow++;

  // Info row
  worksheet.mergeCells(currentRow, 1, currentRow, colCount);
  const infoCell = worksheet.getRow(currentRow).getCell(1);
  const start = format(new Date(startDate), "dd MMM yyyy");
  const end = format(new Date(endDate), "dd MMM yyyy");
  infoCell.value = `Period: ${start} – ${end} | Generated: ${format(new Date(), "dd MMM yyyy HH:mm")} | Total: ${rows.length} assets | Columns: ${fields.length}`;
  infoCell.font = { size: 11, italic: true };
  infoCell.alignment = { horizontal: "center" };
  worksheet.getRow(currentRow).height = 20;
  currentRow++;

  // Summary row
  currentRow++;
  const vacantNow = rows.filter(r => r.availability_status === 'VACANT_NOW').length;
  const availSoon = rows.filter(r => r.availability_status === 'AVAILABLE_SOON').length;
  const booked = rows.length - vacantNow - availSoon;
  worksheet.getRow(currentRow).values = [
    "Total:", rows.length, "", "Available:", vacantNow, "", "Available Soon:", availSoon, "", "Booked:", booked,
  ];
  worksheet.getRow(currentRow).font = { bold: true };
  worksheet.getRow(currentRow).height = 22;
  currentRow += 2;

  // Header row
  const headerRow = worksheet.getRow(currentRow);
  headerRow.values = fields.map(f => f.label);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3B82F6" } };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };
  headerRow.height = 24;
  headerRow.eachCell(cell => {
    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
  });
  worksheet.views = [{ state: 'frozen', ySplit: currentRow }];
  currentRow++;

  // Data rows
  rows.forEach((row, idx) => {
    const r = worksheet.getRow(currentRow);
    r.values = fields.map(f => f.getValue(row, idx));

    // Apply number formats
    fields.forEach((f, colIdx) => {
      if (f.numFmt) {
        r.getCell(colIdx + 1).numFmt = f.numFmt;
      }
    });

    // Row color based on status
    if (row.availability_status === 'VACANT_NOW') {
      r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
    } else if (row.availability_status === 'AVAILABLE_SOON') {
      r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3E0' } };
    } else if (idx % 2 === 0) {
      r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
    }

    r.eachCell((cell, colNum) => {
      const field = fields[colNum - 1];
      cell.alignment = {
        horizontal: field?.key === 'location' ? 'left' : 'center',
        vertical: 'middle',
        wrapText: field?.key === 'location',
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      };
    });

    currentRow++;
  });

  // Footer
  currentRow++;
  worksheet.mergeCells(currentRow, 1, currentRow, colCount);
  const footerRow = worksheet.getRow(currentRow);
  footerRow.getCell(1).value = "Go-Ads 360° | OOH Media Management Platform";
  footerRow.getCell(1).font = { size: 10, italic: true, color: { argb: "FF6B7280" } };
  footerRow.getCell(1).alignment = { horizontal: "center" };

  // Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `CustomMediaReport_${startDate}_to_${endDate}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
