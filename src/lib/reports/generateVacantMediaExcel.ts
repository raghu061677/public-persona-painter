import ExcelJS from "exceljs";
import { format } from "date-fns";

interface VacantAsset {
  id: string;
  city: string;
  area: string;
  location: string;
  media_type: string;
  dimensions: string;
  card_rate: number;
  total_sqft: number | null;
  status: string;
  direction?: string;
  illumination_type?: string;
  primary_photo_url?: string;
  next_available_from?: string;
}

export async function generateVacantMediaExcel(
  assets: VacantAsset[],
  dateFilter: string
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Vacant Media Report", {
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
    },
  });

  worksheet.columns = [
    { width: 6 },   // S.No
    { width: 15 },  // Asset ID
    { width: 12 },  // City
    { width: 15 },  // Area
    { width: 25 },  // Location
    { width: 15 },  // Media Type
    { width: 12 },  // Dimensions
    { width: 10 },  // Sq.Ft
    { width: 12 },  // Direction
    { width: 12 },  // Illumination
    { width: 14 },  // Card Rate
    { width: 10 },  // Status
  ];

  let currentRow = 1;

  // Header
  const headerRow = worksheet.getRow(currentRow);
  worksheet.mergeCells(`A${currentRow}:L${currentRow}`);
  headerRow.getCell(1).value = "GO-ADS 360° – VACANT MEDIA REPORT";
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
  infoRow.getCell(1).value = `Generated: ${format(new Date(), "dd MMM yyyy")} | Filter: ${dateFilter}`;
  infoRow.getCell(1).font = { size: 11, italic: true };
  infoRow.getCell(1).alignment = { horizontal: "center" };
  infoRow.height = 20;
  currentRow++;

  // Summary Stats
  currentRow++;
  const totalAssets = assets.length;
  const totalSqft = assets.reduce((sum, a) => sum + (a.total_sqft || 0), 0);
  const totalValue = assets.reduce((sum, a) => sum + a.card_rate, 0);

  worksheet.getRow(currentRow).values = [
    "Total Assets:",
    totalAssets,
    "",
    "Total Sq.Ft:",
    totalSqft.toFixed(2),
    "",
    "Potential Revenue:",
    `₹${totalValue.toLocaleString("en-IN")}`,
  ];
  worksheet.getRow(currentRow).font = { bold: true };
  worksheet.getRow(currentRow).height = 25;
  currentRow += 2;

  // Column Headers
  const colHeaderRow = worksheet.getRow(currentRow);
  colHeaderRow.values = [
    "S.No",
    "Asset ID",
    "City",
    "Area",
    "Location",
    "Media Type",
    "Dimensions",
    "Sq.Ft",
    "Direction",
    "Illumination",
    "Card Rate",
    "Status",
  ];
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
  currentRow++;

  // Data Rows
  assets.forEach((asset, index) => {
    const dataRow = worksheet.getRow(currentRow);
    dataRow.values = [
      index + 1,
      asset.id,
      asset.city,
      asset.area,
      asset.location,
      asset.media_type,
      asset.dimensions,
      asset.total_sqft || 0,
      asset.direction || "N/A",
      asset.illumination_type || "N/A",
      asset.card_rate,
      asset.status,
    ];

    dataRow.eachCell((cell, colNumber) => {
      cell.alignment = { horizontal: colNumber === 5 ? "left" : "center", vertical: "middle" };
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
  link.download = `vacant-media-${dateFilter.toLowerCase().replace(/\s/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
