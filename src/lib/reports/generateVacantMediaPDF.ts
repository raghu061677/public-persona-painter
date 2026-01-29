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
  sortOrder: ExportSortOrder = 'location'
): Promise<void> {
  // Standardize and sort assets
  const standardizedAssets = standardizeAssets(assets, sortOrder);
  
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
  doc.text("GO-ADS 360° – VACANT MEDIA REPORT", pageWidth / 2, 12, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  const sortLabel = sortOrder === 'location' ? 'Location A-Z' : 
                    sortOrder === 'area' ? 'Area A-Z' : 'City → Area → Location';
  doc.text(`${dateFilter} | Sorted: ${sortLabel} | Generated: ${format(new Date(), "dd MMM yyyy")}`, pageWidth / 2, 20, {
    align: "center",
  });

  // Summary Stats
  const totalAssets = standardizedAssets.length;
  const totalSqft = standardizedAssets.reduce((sum, a) => sum + a.sqft, 0);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  let yPos = 35;

  doc.text(`Total Assets: ${totalAssets}`, 20, yPos);
  doc.text(`Total Sq.Ft: ${totalSqft.toFixed(2)}`, 120, yPos);

  // Table
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
    `Rs. ${asset.cardRate.toLocaleString("en-IN")}`,
    asset.status,
  ]);

  autoTable(doc, {
    startY: yPos + 10,
    head: [[...EXPORT_COLUMNS]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
      halign: "center",
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [31, 41, 55],
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },  // S.No
      1: { cellWidth: 22, halign: "center" },  // Media Type
      2: { cellWidth: 18, halign: "center" },  // City
      3: { cellWidth: 22, halign: "left" },    // Area
      4: { cellWidth: 40, halign: "left" },    // Location
      5: { cellWidth: 18, halign: "center" },  // Direction
      6: { cellWidth: 18, halign: "center" },  // Dimensions
      7: { cellWidth: 15, halign: "right" },   // Sq.Ft
      8: { cellWidth: 18, halign: "center" },  // Illumination
      9: { cellWidth: 22, halign: "right" },   // Card Rate
      10: { cellWidth: 20, halign: "center" }, // Status
    },
    margin: { left: 10, right: 10 },
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
  doc.save(`vacant-media-${dateFilter.toLowerCase().replace(/\s/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}
