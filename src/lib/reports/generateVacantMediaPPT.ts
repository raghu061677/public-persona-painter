import pptxgen from "pptxgenjs";
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
  latitude?: number;
  longitude?: number;
  qr_code_url?: string;
}

const DEFAULT_PLACEHOLDER = "https://via.placeholder.com/800x600/f3f4f6/6b7280?text=No+Image+Available";

export async function generateVacantMediaPPT(
  assets: VacantAsset[],
  dateFilter: string
): Promise<void> {
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

  const totalValue = assets.reduce((sum, a) => sum + a.card_rate, 0);
  const totalSqft = assets.reduce((sum, a) => sum + (a.total_sqft || 0), 0);

  coverSlide.addText(
    `${assets.length} Available Assets | ₹${totalValue.toLocaleString("en-IN")} Potential Revenue`,
    {
      x: 0.5,
      y: 4.7,
      w: 9,
      h: 0.5,
      fontSize: 20,
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

  // ===== SUMMARY SLIDE =====
  const summarySlide = prs.addSlide();
  summarySlide.addText("SUMMARY OVERVIEW", {
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
  const cityGroups = assets.reduce((acc: any, asset) => {
    if (!acc[asset.city]) acc[asset.city] = [];
    acc[asset.city].push(asset);
    return acc;
  }, {});

  const tableData: any[] = [
    [
      { text: "City", options: { bold: true, fill: brandColor, color: "FFFFFF" } },
      { text: "Assets", options: { bold: true, fill: brandColor, color: "FFFFFF" } },
      { text: "Total Sq.Ft", options: { bold: true, fill: brandColor, color: "FFFFFF" } },
      { text: "Potential Revenue", options: { bold: true, fill: brandColor, color: "FFFFFF" } },
    ],
  ];

  Object.entries(cityGroups).forEach(([city, cityAssets]: [string, any[]]) => {
    const citySqft = cityAssets.reduce((sum, a) => sum + (a.total_sqft || 0), 0);
    const cityRevenue = cityAssets.reduce((sum, a) => sum + a.card_rate, 0);
    tableData.push([
      city,
      cityAssets.length.toString(),
      citySqft.toFixed(0),
      `₹${cityRevenue.toLocaleString("en-IN")}`,
    ]);
  });

  tableData.push([
    { text: "TOTAL", options: { bold: true } },
    { text: assets.length.toString(), options: { bold: true } },
    { text: totalSqft.toFixed(0), options: { bold: true } },
    { text: `₹${totalValue.toLocaleString("en-IN")}`, options: { bold: true } },
  ]);

  summarySlide.addTable(tableData, {
    x: 1.5,
    y: 1.5,
    w: 7,
    rowH: 0.4,
    fontSize: 14,
    border: { pt: 1, color: "D1D5DB" },
    align: "center",
    valign: "middle",
  });

  // ===== ASSET SLIDES =====
  for (const asset of assets) {
    // Use primary_photo_url for presentation
    const photo1 = asset.primary_photo_url || DEFAULT_PLACEHOLDER;
    const photo2 = asset.primary_photo_url || DEFAULT_PLACEHOLDER;

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

    // Header
    slide.addText(`${asset.id} – ${asset.area} – ${asset.location}`, {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.6,
      fontSize: 20,
      bold: true,
      color: brandColor,
      align: "center",
    });

    // Add QR Code if available (top-right corner)
    if (asset.qr_code_url) {
      try {
        const qrResponse = await fetch(asset.qr_code_url);
        const qrBlob = await qrResponse.blob();
        const qrBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(qrBlob);
        });
        
        slide.addImage({
          data: qrBase64,
          x: 9.2,
          y: 0.4,
          w: 1.2,
          h: 1.2,
        });
      } catch (error) {
        console.error('Failed to add QR code:', error);
      }
    }

    // Two images side by side
    try {
      slide.addImage({
        path: photo1,
        x: 0.5,
        y: 1.3,
        w: 4.4,
        h: 3.3,
        sizing: { type: "contain", w: 4.4, h: 3.3 },
      });
    } catch (e) {
      console.error("Error adding image 1:", e);
    }

    try {
      slide.addImage({
        path: photo2,
        x: 5.1,
        y: 1.3,
        w: 4.4,
        h: 3.3,
        sizing: { type: "contain", w: 4.4, h: 3.3 },
      });
    } catch (e) {
      console.error("Error adding image 2:", e);
    }

    // Details box
    slide.addShape(prs.ShapeType.rect, {
      x: 0.5,
      y: 4.8,
      w: 9,
      h: 2.2,
      fill: { color: "F9FAFB" },
      line: { color: "E5E7EB", width: 1 },
    });

    const detailsText = [
      `Media Type: ${asset.media_type}`,
      `Dimensions: ${asset.dimensions}`,
      `Direction: ${asset.direction || "N/A"}`,
      `Illumination: ${asset.illumination_type || "N/A"}`,
      `Sq.Ft: ${asset.total_sqft || 0}`,
      `Card Rate: ₹${asset.card_rate.toLocaleString("en-IN")}`,
    ].join("\n");

    slide.addText(detailsText, {
      x: 0.7,
      y: 5.0,
      w: 8.6,
      h: 1.8,
      fontSize: 16,
      color: "1F2937",
      fontFace: "Arial",
      lineSpacing: 22,
    });

    // Footer
    slide.addText(`Available Now | Page ${assets.indexOf(asset) + 3} of ${assets.length + 2}`, {
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
