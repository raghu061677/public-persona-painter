import ExcelJS from "exceljs";
import { format } from "date-fns";

interface AvailabilityRow {
  asset_id: string;
  media_asset_code: string | null;
  area: string;
  location: string;
  direction: string | null;
  dimension: string | null;
  sqft: number;
  illumination: string | null;
  card_rate: number;
  city: string;
  media_type: string;
  availability_status: string;
  available_from: string;
  booked_till: string | null;
  current_campaign_id: string | null;
  current_campaign_name: string | null;
  current_client_name: string | null;
}

export async function generateAvailabilityReportExcel(
  rows: AvailabilityRow[],
  startDate: string,
  endDate: string,
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Media Availability", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true },
  });

  // Column widths
  worksheet.columns = [
    { width: 6 },   // S.No
    { width: 18 },  // Asset ID
    { width: 15 },  // Area
    { width: 30 },  // Location
    { width: 12 },  // Direction
    { width: 14 },  // Dimension
    { width: 10 },  // Sqft
    { width: 12 },  // Illumination
    { width: 16 },  // Availability Status
    { width: 14 },  // Available From
    { width: 14 },  // Booked Till
    { width: 14 },  // Card Rate
  ];

  let currentRow = 1;

  // Title
  worksheet.mergeCells(`A${currentRow}:L${currentRow}`);
  const titleCell = worksheet.getRow(currentRow).getCell(1);
  titleCell.value = "GO-ADS 360° – MEDIA AVAILABILITY REPORT";
  titleCell.font = { size: 16, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(currentRow).height = 30;
  currentRow++;

  // Info row
  worksheet.mergeCells(`A${currentRow}:L${currentRow}`);
  const infoCell = worksheet.getRow(currentRow).getCell(1);
  const start = format(new Date(startDate), "dd MMM yyyy");
  const end = format(new Date(endDate), "dd MMM yyyy");
  infoCell.value = `Period: ${start} – ${end} | Generated: ${format(new Date(), "dd MMM yyyy HH:mm")} | Total: ${rows.length} assets`;
  infoCell.font = { size: 11, italic: true };
  infoCell.alignment = { horizontal: "center" };
  worksheet.getRow(currentRow).height = 20;
  currentRow++;

  // Summary
  currentRow++;
  const vacantNow = rows.filter(r => r.availability_status === 'VACANT_NOW').length;
  const availSoon = rows.filter(r => r.availability_status === 'AVAILABLE_SOON').length;
  worksheet.getRow(currentRow).values = [
    "Total:", rows.length, "", "Vacant Now:", vacantNow, "", "Available Soon:", availSoon,
  ];
  worksheet.getRow(currentRow).font = { bold: true };
  worksheet.getRow(currentRow).getCell(5).font = { bold: true, color: { argb: "FF22C55E" } };
  worksheet.getRow(currentRow).getCell(8).font = { bold: true, color: { argb: "FFEAB308" } };
  worksheet.getRow(currentRow).height = 22;
  currentRow += 2;

  // Column Headers
  const HEADERS = [
    'S.No', 'Asset ID', 'Area', 'Location', 'Direction', 'Dimension',
    'Sq.Ft', 'Illumination', 'Availability Status', 'Available From', 'Booked Till', 'Card Rate',
  ];

  const headerRow = worksheet.getRow(currentRow);
  headerRow.values = HEADERS;
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
    const statusLabel = row.availability_status === 'VACANT_NOW' ? 'Vacant Now'
      : row.availability_status === 'AVAILABLE_SOON' ? 'Available Soon' : 'Booked';
    
    let availFromFormatted = '';
    try { availFromFormatted = row.available_from ? format(new Date(row.available_from), 'dd-MM-yyyy') : ''; } catch { availFromFormatted = row.available_from || ''; }
    
    let bookedTillFormatted = '';
    try { bookedTillFormatted = row.booked_till ? format(new Date(row.booked_till), 'dd-MM-yyyy') : ''; } catch { bookedTillFormatted = row.booked_till || ''; }

    r.values = [
      idx + 1,
      row.media_asset_code || row.asset_id,
      row.area,
      row.location,
      row.direction || '',
      row.dimension || '',
      row.sqft,
      row.illumination || '',
      statusLabel,
      availFromFormatted,
      bookedTillFormatted,
      row.card_rate,
    ];

    // Format card rate
    r.getCell(12).numFmt = '₹#,##0';
    r.getCell(7).numFmt = '#,##0.00';

    // Status color
    const statusCell = r.getCell(9);
    if (row.availability_status === 'VACANT_NOW') {
      statusCell.font = { bold: true, color: { argb: "FF22C55E" } };
    } else if (row.availability_status === 'AVAILABLE_SOON') {
      statusCell.font = { bold: true, color: { argb: "FFEAB308" } };
    }

    r.eachCell((cell, colNum) => {
      cell.alignment = { horizontal: colNum === 4 ? 'left' : 'center', vertical: 'middle', wrapText: colNum === 4 };
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
    currentRow++;
  });

  // Footer
  currentRow++;
  worksheet.mergeCells(`A${currentRow}:L${currentRow}`);
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
  link.download = `VacantMedia_${startDate}_to_${endDate}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
