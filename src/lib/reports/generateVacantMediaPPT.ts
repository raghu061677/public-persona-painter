import pptxgen from "pptxgenjs";
import { format } from "date-fns";
import { 
  VacantAssetExportData, 
  ExportSortOrder, 
  standardizeAssets, 
  EXPORT_COLUMNS,
  StandardizedAssetRow 
} from "./vacantMediaExportUtils";

const DEFAULT_PLACEHOLDER = "https://via.placeholder.com/800x600/f3f4f6/6b7280?text=No+Image+Available";

export async function generateVacantMediaPPT(
  assets: VacantAssetExportData[],
  dateFilter: string,
  sortOrder: ExportSortOrder = 'location'
): Promise<void> {
  // Standardize and sort assets
  const standardizedAssets = standardizeAssets(assets, sortOrder);
  
  const prs = new pptxgen();

  prs.author = "Go-Ads 360°";
  prs.company = "Go-Ads 360°";
  prs.title = `Vacant Media Report - ${dateFilter}`;
  prs.subject = `Vacant Media Availability Report`;

  const brandColor = "1E3A8A";

  // ===== COVER SLIDE =====
  const coverSlide = prs.addSlide();
  coverSlide.background = { fill: brandColor };

  coverSlide.addText("VACANT MEDIA REPORT", {
    x: 0.5,
    y: 2.0,
    w: 9,
    h: 1.5,
    fontSize: 44,
    bold: true,
    color: "FFFFFF",
    align: "center",
    fontFace: "Arial",
  });

  coverSlide.addText(dateFilter, {
    x: 0.5,
    y: 3.7,
    w: 9,
    h: 0.8,
    fontSize: 28,
    color: "FFFFFF",
    align: "center",
    fontFace: "Arial",
  });

  const totalSqft = standardizedAssets.reduce((sum, a) => sum + a.sqft, 0);
  const sortLabel = sortOrder === 'location' ? 'Location A-Z' : 
                    sortOrder === 'area' ? 'Area A-Z' : 'City → Area → Location';

  coverSlide.addText(
    `${standardizedAssets.length} Available Assets | ${totalSqft.toLocaleString("en-IN")} Total Sq.Ft | Sorted: ${sortLabel}`,
    {
      x: 0.5,
      y: 4.7,
      w: 9,
      h: 0.5,
      fontSize: 18,
      color: "E5E7EB",
      align: "center",
      fontFace: "Arial",
    }
  );

  coverSlide.addShape(prs.ShapeType.rect, {
    x: 0,
    y: 6.8,
    w: 10,
    h: 0.7,
    fill: { color: "000000", transparency: 50 },
  });

  coverSlide.addText(`${format(new Date(), "dd MMMM yyyy")} | Go-Ads 360°`, {
    x: 0.5,
    y: 6.9,
    w: 9,
    h: 0.5,
    fontSize: 14,
    color: "FFFFFF",
    align: "center",
    fontFace: "Arial",
  });

  // ===== TABLE SLIDES (Paginated) =====
  const ROWS_PER_SLIDE = 12;
  const totalSlides = Math.ceil(standardizedAssets.length / ROWS_PER_SLIDE);
  
  for (let slideIndex = 0; slideIndex < totalSlides; slideIndex++) {
    const tableSlide = prs.addSlide();
    
    // Header
    tableSlide.addText(`VACANT MEDIA LIST (Page ${slideIndex + 1} of ${totalSlides})`, {
      x: 0.3,
      y: 0.2,
      w: 9.4,
      h: 0.5,
      fontSize: 20,
      bold: true,
      color: brandColor,
      align: "center",
    });

    // Get assets for this slide
    const startIdx = slideIndex * ROWS_PER_SLIDE;
    const endIdx = Math.min(startIdx + ROWS_PER_SLIDE, standardizedAssets.length);
    const slideAssets = standardizedAssets.slice(startIdx, endIdx);

    // Build table data with header row
    const tableData: any[][] = [
      EXPORT_COLUMNS.map(col => ({ 
        text: col, 
        options: { bold: true, fill: brandColor, color: "FFFFFF", fontSize: 8 } 
      })),
    ];

    slideAssets.forEach((asset) => {
      tableData.push([
        { text: asset.sNo.toString(), options: { fontSize: 7 } },
        { text: asset.mediaType, options: { fontSize: 7 } },
        { text: asset.city, options: { fontSize: 7 } },
        { text: asset.area, options: { fontSize: 7 } },
        { text: asset.location.substring(0, 30) + (asset.location.length > 30 ? '...' : ''), options: { fontSize: 7 } },
        { text: asset.direction, options: { fontSize: 7 } },
        { text: asset.dimensions, options: { fontSize: 7 } },
        { text: asset.sqft.toFixed(0), options: { fontSize: 7 } },
        { text: asset.illumination, options: { fontSize: 7 } },
        { text: `₹${asset.cardRate.toLocaleString("en-IN")}`, options: { fontSize: 7 } },
        { text: asset.status, options: { fontSize: 7 } },
      ]);
    });

    tableSlide.addTable(tableData, {
      x: 0.2,
      y: 0.8,
      w: 9.6,
      rowH: 0.4,
      fontSize: 8,
      border: { pt: 0.5, color: "D1D5DB" },
      align: "center",
      valign: "middle",
      colW: [0.5, 0.9, 0.7, 0.9, 1.8, 0.7, 0.7, 0.6, 0.7, 0.8, 0.7],
    });

    // Footer
    tableSlide.addText(`Go-Ads 360° | Generated: ${format(new Date(), "dd MMM yyyy")}`, {
      x: 0.5,
      y: 7.1,
      w: 9,
      h: 0.3,
      fontSize: 10,
      color: "6B7280",
      align: "center",
    });
  }

  // ===== SUMMARY SLIDE =====
  const summarySlide = prs.addSlide();
  summarySlide.addText("SUMMARY BY CITY", {
    x: 0.5,
    y: 0.5,
    w: 9,
    h: 0.6,
    fontSize: 32,
    bold: true,
    color: brandColor,
    align: "center",
  });

  // Group by city
  const cityGroups: Record<string, StandardizedAssetRow[]> = {};
  standardizedAssets.forEach(asset => {
    if (!cityGroups[asset.city]) cityGroups[asset.city] = [];
    cityGroups[asset.city].push(asset);
  });

  const summaryTableData: any[] = [
    [
      { text: "City", options: { bold: true, fill: brandColor, color: "FFFFFF" } },
      { text: "Assets", options: { bold: true, fill: brandColor, color: "FFFFFF" } },
      { text: "Total Sq.Ft", options: { bold: true, fill: brandColor, color: "FFFFFF" } },
    ],
  ];

  Object.entries(cityGroups).forEach(([city, cityAssets]) => {
    const citySqft = cityAssets.reduce((sum, a) => sum + a.sqft, 0);
    summaryTableData.push([
      city,
      cityAssets.length.toString(),
      citySqft.toFixed(0),
    ]);
  });

  summaryTableData.push([
    { text: "TOTAL", options: { bold: true } },
    { text: standardizedAssets.length.toString(), options: { bold: true } },
    { text: totalSqft.toFixed(0), options: { bold: true } },
  ]);

  summarySlide.addTable(summaryTableData, {
    x: 1.5,
    y: 1.5,
    w: 7,
    rowH: 0.4,
    fontSize: 14,
    border: { pt: 1, color: "D1D5DB" },
    align: "center",
    valign: "middle",
  });

  // ===== ASSET SLIDES (with images) =====
  for (const asset of standardizedAssets) {
    const originalAsset = asset.originalAsset;
    const photo1 = originalAsset.primary_photo_url || DEFAULT_PLACEHOLDER;

    const slide = prs.addSlide();

    // Border frame
    slide.addShape(prs.ShapeType.rect, {
      x: 0.2,
      y: 0.2,
      w: 9.6,
      h: 7.1,
      fill: { color: "FFFFFF" },
      line: { color: brandColor, width: 8 },
    });

    // Header with S.No
    slide.addText(`#${asset.sNo} – ${asset.area} – ${asset.location.substring(0, 50)}`, {
      x: 0.5,
      y: 0.5,
      w: 8,
      h: 0.6,
      fontSize: 18,
      bold: true,
      color: brandColor,
      align: "left",
    });

    // Add QR Code if available (top-right corner)
    if (originalAsset.qr_code_url) {
      try {
        const qrResponse = await fetch(originalAsset.qr_code_url);
        const qrBlob = await qrResponse.blob();
        const qrBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(qrBlob);
        });
        
        slide.addImage({
          data: qrBase64,
          x: 8.5,
          y: 0.4,
          w: 1.0,
          h: 1.0,
        });
      } catch (error) {
        console.error('Failed to add QR code:', error);
      }
    }

    // Asset image
    try {
      slide.addImage({
        path: photo1,
        x: 0.5,
        y: 1.3,
        w: 9,
        h: 3.5,
        sizing: { type: "contain", w: 9, h: 3.5 },
      });
    } catch (e) {
      console.error("Error adding image:", e);
    }

    // Details box
    slide.addShape(prs.ShapeType.rect, {
      x: 0.5,
      y: 5.0,
      w: 9,
      h: 1.8,
      fill: { color: "F9FAFB" },
      line: { color: "E5E7EB", width: 1 },
    });

    const detailsText = [
      `Media Type: ${asset.mediaType}        City: ${asset.city}        Area: ${asset.area}`,
      `Dimensions: ${asset.dimensions}        Sq.Ft: ${asset.sqft.toFixed(2)}        Direction: ${asset.direction}`,
      `Illumination: ${asset.illumination}        Card Rate: Rs. ${asset.cardRate.toLocaleString("en-IN")}        Status: ${asset.status}`,
    ].join("\n");

    slide.addText(detailsText, {
      x: 0.7,
      y: 5.1,
      w: 8.6,
      h: 1.6,
      fontSize: 14,
      color: "1F2937",
      fontFace: "Arial",
      lineSpacing: 24,
    });

    // Footer
    slide.addText(`Page ${asset.sNo + totalSlides + 1} | Go-Ads 360°`, {
      x: 0.5,
      y: 7.1,
      w: 9,
      h: 0.3,
      fontSize: 10,
      color: "6B7280",
      align: "center",
    });
  }

  // Save presentation
  const blob = await prs.write({ outputType: "blob" });
  const url = URL.createObjectURL(blob as Blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `vacant-media-${dateFilter.toLowerCase().replace(/\s/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.pptx`;
  link.click();
  URL.revokeObjectURL(url);
}
