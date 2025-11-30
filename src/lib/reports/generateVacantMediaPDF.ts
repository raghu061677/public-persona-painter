import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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
}

export async function generateVacantMediaPDF(
  assets: VacantAsset[],
  dateFilter: string
): Promise<void> {
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
  doc.text(`${dateFilter} | Generated: ${format(new Date(), "dd MMM yyyy")}`, pageWidth / 2, 20, {
    align: "center",
  });

  // Summary Stats
  const totalAssets = assets.length;
  const totalSqft = assets.reduce((sum, a) => sum + (a.total_sqft || 0), 0);
  const totalValue = assets.reduce((sum, a) => sum + a.card_rate, 0);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  let yPos = 35;

  doc.text(`Total Assets: ${totalAssets}`, 20, yPos);
  doc.text(`Total Sq.Ft: ${totalSqft.toFixed(2)}`, 100, yPos);
  doc.text(`Potential Revenue: ₹${totalValue.toLocaleString("en-IN")}`, 180, yPos);

  // Table
  const tableData = assets.map((asset, index) => [
    (index + 1).toString(),
    asset.id,
    asset.city,
    asset.area,
    asset.location,
    asset.media_type,
    asset.dimensions,
    (asset.total_sqft || 0).toString(),
    asset.direction || "N/A",
    asset.card_rate.toLocaleString("en-IN"),
  ]);

  autoTable(doc, {
    startY: yPos + 10,
    head: [
      [
        "S.No",
        "Asset ID",
        "City",
        "Area",
        "Location",
        "Media Type",
        "Dimensions",
        "Sq.Ft",
        "Direction",
        "Card Rate",
      ],
    ],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: "bold",
      halign: "center",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [31, 41, 55],
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 25, halign: "center" },
      2: { cellWidth: 20, halign: "center" },
      3: { cellWidth: 25, halign: "left" },
      4: { cellWidth: 45, halign: "left" },
      5: { cellWidth: 25, halign: "center" },
      6: { cellWidth: 20, halign: "center" },
      7: { cellWidth: 15, halign: "center" },
      8: { cellWidth: 18, halign: "center" },
      9: { cellWidth: 22, halign: "right" },
    },
    margin: { left: 10, right: 10 },
    didDrawPage: (data) => {
      // Footer
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
