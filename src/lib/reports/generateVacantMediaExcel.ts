import ExcelJS from "exceljs";
import { format } from "date-fns";
import { 
  VacantAssetExportData, 
  ExportSortOrder, 
  standardizeAssets, 
  EXPORT_COLUMNS,
  EXCEL_COLUMN_WIDTHS 
} from "./vacantMediaExportUtils";

export async function generateVacantMediaExcel(
  assets: VacantAssetExportData[],
  dateFilter: string,
  sortOrder: ExportSortOrder = 'available-from',
  defaultAvailableFrom?: string
): Promise<void> {
  // Log original count
  console.log(`[generateVacantMediaExcel] Input: ${assets.length} assets`);
  
  // Standardize, deduplicate, and sort assets
  const standardizedAssets = standardizeAssets(assets, sortOrder, defaultAvailableFrom);
  
  console.log(`[generateVacantMediaExcel] After dedupe: ${standardizedAssets.length} unique assets`);
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Vacant Media", {
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
    },
  });

  // Set column widths (12 columns)
  worksheet.columns = EXCEL_COLUMN_WIDTHS.map(width => ({ width }));

  let currentRow = 1;

  // Header
  const headerRow = worksheet.getRow(currentRow);
  worksheet.mergeCells(`A${currentRow}:L${currentRow}`);
  headerRow.getCell(1).value = "GO-ADS 360° – MEDIA AVAILABILITY REPORT";
  headerRow.getCell(1).font = { size: 18, bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.getCell(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E3A8A" },
  };
  headerRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
  headerRow.height = 30;
  currentRow++;

  // Report Info
  worksheet.mergeCells(`A${currentRow}:L${currentRow}`);
  const infoRow = worksheet.getRow(currentRow);
  const sortLabel = sortOrder === 'location' ? 'Location A-Z' : 
                    sortOrder === 'area' ? 'Area A-Z' : 
                    sortOrder === 'available-from' ? 'Available From (earliest first)' :
                    'City → Area → Location';
  infoRow.getCell(1).value = `Generated: ${format(new Date(), "dd MMM yyyy")} | Filter: ${dateFilter} | Sorted by: ${sortLabel}`;
  infoRow.getCell(1).font = { size: 11, italic: true };
  infoRow.getCell(1).alignment = { horizontal: "center" };
  infoRow.height = 20;
  currentRow++;

  // Summary Stats
  currentRow++;
  const totalAssets = standardizedAssets.length;
  const availableCount = standardizedAssets.filter(a => a.availability === 'Available').length;
  const bookedCount = standardizedAssets.filter(a => a.availability === 'Booked').length;
  const totalSqft = standardizedAssets.reduce((sum, a) => sum + a.sqft, 0);

  worksheet.getRow(currentRow).values = [
    "Total Assets:",
    totalAssets,
    "",
    "Available:",
    availableCount,
    "",
    "Booked:",
    bookedCount,
    "",
    "Total Sq.Ft:",
    totalSqft.toFixed(2),
  ];
  worksheet.getRow(currentRow).font = { bold: true };
  worksheet.getRow(currentRow).height = 25;
  
  // Color code the counts
  worksheet.getRow(currentRow).getCell(5).font = { bold: true, color: { argb: "FF22C55E" } }; // Green for available
  worksheet.getRow(currentRow).getCell(8).font = { bold: true, color: { argb: "FFEF4444" } }; // Red for booked
  currentRow += 2;

  // Column Headers (12 columns)
  const colHeaderRow = worksheet.getRow(currentRow);
  colHeaderRow.values = [...EXPORT_COLUMNS];
  colHeaderRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  colHeaderRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF3B82F6" },
  };
  colHeaderRow.alignment = { horizontal: "center", vertical: "middle" };
  colHeaderRow.height = 25;
  colHeaderRow.eachCell((cell) => {
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });
  
  // Freeze header row
  worksheet.views = [{ state: 'frozen', ySplit: currentRow }];
  currentRow++;

  // Data Rows (12 columns with Available From and Availability)
  standardizedAssets.forEach((asset, index) => {
    const dataRow = worksheet.getRow(currentRow);
    dataRow.values = [
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
      asset.availableFrom,
      asset.availability,
    ];

    // Format Card Rate as currency (column 10)
    const cardRateCell = dataRow.getCell(10);
    cardRateCell.numFmt = '₹#,##0';

    // Format Sq.Ft as number with 2 decimals (column 8)
    const sqftCell = dataRow.getCell(8);
    sqftCell.numFmt = '#,##0.00';

    // Style availability cell with color (column 12)
    const availabilityCell = dataRow.getCell(12);
    if (asset.availability === 'Available') {
      availabilityCell.font = { bold: true, color: { argb: "FF22C55E" } };
    } else {
      availabilityCell.font = { bold: true, color: { argb: "FFEF4444" } };
    }

    dataRow.eachCell((cell, colNumber) => {
      // Alignment: Location left-aligned, others center
      cell.alignment = { 
        horizontal: colNumber === 5 ? "left" : "center", 
        vertical: "middle",
        wrapText: colNumber === 5, // Wrap location text
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFD1D5DB" } },
        left: { style: "thin", color: { argb: "FFD1D5DB" } },
        bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
        right: { style: "thin", color: { argb: "FFD1D5DB" } },
      };
    });

    if (index % 2 === 0) {
      dataRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF9FAFB" },
      };
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

  // Generate file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `media-availability-${dateFilter.toLowerCase().replace(/\s/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
