import ExcelJS from "exceljs";
import { format } from "date-fns";

export interface BookedExportField {
  key: string;
  label: string;
  group: string;
  getValue: (row: any, idx: number) => string | number;
  width?: number;
  numFmt?: string;
}

export const ALL_BOOKED_EXPORT_FIELDS: BookedExportField[] = [
  // Core
  { key: "sno", label: "S.No", group: "Core", getValue: (_r, i) => i + 1, width: 6 },

  // Location
  { key: "location", label: "Location", group: "Location", getValue: (r) => r.location || "", width: 30 },
  { key: "direction", label: "Direction (facing)", group: "Location", getValue: (r) => r.direction || "", width: 16 },
  { key: "city", label: "City", group: "Location", getValue: (r) => r.city || "", width: 14 },
  { key: "area", label: "Area", group: "Location", getValue: (r) => r.area || "", width: 15 },
  { key: "address", label: "Address", group: "Location", getValue: (r) => r.address || "", width: 30 },
  { key: "asset_code", label: "Asset Code", group: "Core", getValue: (r) => r.asset_code || "", width: 20 },

  // Specifications
  { key: "dimensions", label: "Dimensions", group: "Specifications", getValue: (r) => r.dimensions || "", width: 14 },
  { key: "total_sqft", label: "Sq.Ft", group: "Specifications", getValue: (r) => r.total_sqft || 0, width: 10, numFmt: "#,##0.00" },
  { key: "illumination", label: "Illumination", group: "Specifications", getValue: (r) => r.illumination || "", width: 14 },
  { key: "media_type", label: "Media Type", group: "Specifications", getValue: (r) => r.media_type || "", width: 16 },

  // Dates
  { key: "start_date", label: "Start Date", group: "Dates", getValue: (r) => {
    try { return r.start_date ? format(new Date(r.start_date), "dd/MM/yyyy") : ""; } catch { return r.start_date || ""; }
  }, width: 14 },
  { key: "end_date", label: "End Date", group: "Dates", getValue: (r) => {
    try { return r.end_date ? format(new Date(r.end_date), "dd/MM/yyyy") : ""; } catch { return r.end_date || ""; }
  }, width: 14 },
  { key: "duration_days", label: "Duration (Days)", group: "Dates", getValue: (r) => r.duration_days || 0, width: 14, numFmt: "#,##0" },

  // Campaign
  { key: "campaign_name", label: "Campaign Name", group: "Campaign", getValue: (r) => r.campaign_name || "", width: 24 },
  { key: "client_name", label: "Client Name", group: "Campaign", getValue: (r) => r.client_name || "", width: 24 },
  { key: "campaign_status", label: "Campaign Status", group: "Campaign", getValue: (r) => r.campaign_status || "", width: 16 },
  { key: "installation_status", label: "Installation Status", group: "Campaign", getValue: (r) => r.installation_status || "", width: 16 },

  // Geo Coordinates
  { key: "latitude", label: "Latitude", group: "Geo Coordinates", getValue: (r) => r.latitude ?? "", width: 14, numFmt: "0.000000" },
  { key: "longitude", label: "Longitude", group: "Geo Coordinates", getValue: (r) => r.longitude ?? "", width: 14, numFmt: "0.000000" },
];

/**
 * Default export fields — exact order per spec:
 * S.No, Location, Direction (facing), Dimensions, Sq.Ft, Illumination,
 * Start Date, End Date, Duration (Days), Campaign Name, Client Name, Campaign Status
 */
export const DEFAULT_BOOKED_CUSTOM_FIELDS = [
  "sno", "location", "direction",
  "dimensions", "total_sqft", "illumination",
  "start_date", "end_date", "duration_days",
  "campaign_name", "client_name", "campaign_status",
];

export const BOOKED_FIELD_GROUPS = [...new Set(ALL_BOOKED_EXPORT_FIELDS.map((f) => f.group))];

function getStatusRowColor(status: string): string | null {
  switch (status) {
    case "Completed": return "FFD1FAE5";
    case "Cancelled": return "FFFEE2E2";
    case "Running":
    case "InProgress":
    case "Active": return "FFDBEAFE";
    default: return null;
  }
}

/**
 * Sort rows by Location (A-Z) then Direction (A-Z)
 */
function sortBookedRows(rows: any[]): any[] {
  return [...rows].sort((a, b) => {
    const locA = (a.location || "").toLowerCase();
    const locB = (b.location || "").toLowerCase();
    if (locA < locB) return -1;
    if (locA > locB) return 1;
    const dirA = (a.direction || "").toLowerCase();
    const dirB = (b.direction || "").toLowerCase();
    if (dirA < dirB) return -1;
    if (dirA > dirB) return 1;
    return 0;
  });
}

export async function generateCustomBookedMediaExcel(
  rows: any[],
  selectedFieldKeys: string[],
  startDate: string,
  endDate: string,
  companyName?: string,
): Promise<void> {
  const fields = selectedFieldKeys
    .map((key) => ALL_BOOKED_EXPORT_FIELDS.find((f) => f.key === key))
    .filter(Boolean) as BookedExportField[];

  if (fields.length === 0) return;

  // Sort rows by Location → Direction before export
  const sortedRows = sortBookedRows(rows);

  const colCount = fields.length;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "GO-ADS 360°";
  const worksheet = workbook.addWorksheet("Booked Media Report", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true },
  });

  worksheet.columns = fields.map((f) => ({ width: f.width || 14 }));

  let currentRow = 1;

  // Title
  worksheet.mergeCells(currentRow, 1, currentRow, colCount);
  const titleCell = worksheet.getRow(currentRow).getCell(1);
  titleCell.value = `${companyName || "GO-ADS 360°"} – BOOKED MEDIA REPORT`;
  titleCell.font = { size: 16, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(currentRow).height = 30;
  currentRow++;

  // Info
  worksheet.mergeCells(currentRow, 1, currentRow, colCount);
  const infoCell = worksheet.getRow(currentRow).getCell(1);
  const start = format(new Date(startDate), "dd MMM yyyy");
  const end = format(new Date(endDate), "dd MMM yyyy");
  infoCell.value = `Period: ${start} – ${end} | Generated: ${format(new Date(), "dd MMM yyyy HH:mm")} | Total: ${sortedRows.length} bookings | Columns: ${fields.length}`;
  infoCell.font = { size: 11, italic: true };
  infoCell.alignment = { horizontal: "center" };
  worksheet.getRow(currentRow).height = 20;
  currentRow++;

  // Summary
  currentRow++;
  const uniqueAssets = new Set(sortedRows.map((r) => r.asset_id || r.asset_code)).size;
  const uniqueCampaigns = new Set(sortedRows.map((r) => r.campaign_name)).size;
  const uniqueClients = new Set(sortedRows.map((r) => r.client_name)).size;
  worksheet.getRow(currentRow).values = [
    "Total Bookings:", sortedRows.length, "",
    "Unique Assets:", uniqueAssets, "",
    "Campaigns:", uniqueCampaigns, "",
    "Clients:", uniqueClients,
  ];
  worksheet.getRow(currentRow).font = { bold: true };
  worksheet.getRow(currentRow).height = 22;
  currentRow += 2;

  // Header
  const headerRow = worksheet.getRow(currentRow);
  headerRow.values = fields.map((f) => f.label);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3B82F6" } };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
  });
  worksheet.views = [{ state: "frozen", ySplit: currentRow }];
  currentRow++;

  // Data — S.No regenerated sequentially after sorting
  sortedRows.forEach((row, idx) => {
    const r = worksheet.getRow(currentRow);
    r.values = fields.map((f) => f.getValue(row, idx));

    fields.forEach((f, colIdx) => {
      if (f.numFmt) {
        r.getCell(colIdx + 1).numFmt = f.numFmt;
      }
    });

    const statusColor = getStatusRowColor(row.campaign_status);
    if (statusColor) {
      r.fill = { type: "pattern", pattern: "solid", fgColor: { argb: statusColor } };
    } else if (idx % 2 === 0) {
      r.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
    }

    r.eachCell((cell, colNum) => {
      const field = fields[colNum - 1];
      cell.alignment = {
        horizontal: field?.key === "location" || field?.key === "address" ? "left" : "center",
        vertical: "middle",
        wrapText: field?.key === "location" || field?.key === "address",
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFD1D5DB" } },
        left: { style: "thin", color: { argb: "FFD1D5DB" } },
        bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
        right: { style: "thin", color: { argb: "FFD1D5DB" } },
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
  link.download = `BookedMediaReport_${startDate}_to_${endDate}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
