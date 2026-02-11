import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { 
  VacantAssetExportData, 
  ExportSortOrder, 
  standardizeAssets, 
  EXPORT_COLUMNS 
} from "./vacantMediaExportUtils";

export async function generateVacantMediaPDF(
  assets: VacantAssetExportData[],
  dateFilter: string,
  sortOrder: ExportSortOrder = 'available-from',
): Promise<void> {
  // Standardize, deduplicate, and sort assets
  const standardizedAssets = standardizeAssets(assets, sortOrder);
  
  console.log(`[generateVacantMediaPDF] Exporting ${standardizedAssets.length} unique assets`);
  
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, pageWidth, 25, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("GO-ADS 360° – MEDIA AVAILABILITY REPORT", pageWidth / 2, 12, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  const sortLabel = sortOrder === 'location' ? 'Location A-Z' : 
                    sortOrder === 'area' ? 'Area A-Z' : 
                    sortOrder === 'available-from' ? 'Available From' :
                    'City → Area → Location';
  doc.text(`${dateFilter} | Sorted: ${sortLabel} | Generated: ${format(new Date(), "dd MMM yyyy")}`, pageWidth / 2, 20, {
    align: "center",
  });

  // Summary Stats
  const totalAssets = standardizedAssets.length;
  const availableCount = standardizedAssets.filter(a => a.availability === 'Available').length;
  const bookedCount = standardizedAssets.filter(a => a.availability === 'Booked').length;
  const totalSqft = standardizedAssets.reduce((sum, a) => sum + a.sqft, 0);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  let yPos = 35;

  doc.text(`Total Assets: ${totalAssets}`, 20, yPos);
  doc.text(`Available: ${availableCount}`, 80, yPos);
  doc.text(`Booked: ${bookedCount}`, 140, yPos);
  doc.text(`Total Sq.Ft: ${totalSqft.toFixed(2)}`, 200, yPos);

  // Table data (12 columns)
  // Helper: format date to DD/MM/YYYY
  const fmtDateIN = (d: string | undefined | null) => {
    if (!d) return '-';
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return '-';
      const dd = dt.getDate().toString().padStart(2, '0');
      const mm = (dt.getMonth() + 1).toString().padStart(2, '0');
      return `${dd}/${mm}/${dt.getFullYear()}`;
    } catch { return '-'; }
  };

  const tableData = standardizedAssets.map((asset) => [
    asset.sNo.toString(),
    asset.mediaType,
    asset.city,
    asset.area,
    asset.location,
    asset.direction,
    asset.dimensions,
    asset.sqft.toFixed(2),
    asset.illumination,
    `₹${asset.cardRate.toLocaleString("en-IN")}`,
    asset.availableFrom || '-',
    asset.availability,
  ]);

  autoTable(doc, {
    startY: yPos + 10,
    head: [[...EXPORT_COLUMNS]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontSize: 7,
      fontStyle: "bold",
      halign: "center",
    },
    bodyStyles: {
      fontSize: 6,
      textColor: [31, 41, 55],
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },   // S.No
      1: { cellWidth: 18, halign: "center" },  // Media Type
      2: { cellWidth: 15, halign: "center" },  // City
      3: { cellWidth: 20, halign: "left" },    // Area
      4: { cellWidth: 35, halign: "left" },    // Location
      5: { cellWidth: 15, halign: "center" },  // Direction
      6: { cellWidth: 16, halign: "center" },  // Dimensions
      7: { cellWidth: 12, halign: "right" },   // Sq.Ft
      8: { cellWidth: 15, halign: "center" },  // Illumination
      9: { cellWidth: 18, halign: "right" },   // Card Rate
      10: { cellWidth: 18, halign: "center" }, // Available From
      11: { cellWidth: 15, halign: "center" }, // Status
    },
    margin: { left: 8, right: 8 },
    didDrawPage: (data) => {
      // Footer on each page
      const pageCount = (doc as any).internal.getNumberOfPages();
      const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;

      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text(
        `Page ${currentPage} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
      doc.text("Go-Ads 360° | OOH Media Management Platform", pageWidth - 15, pageHeight - 10, {
        align: "right",
      });
    },
  });

  // Save PDF
  doc.save(`media-availability-${dateFilter.toLowerCase().replace(/\s/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}
