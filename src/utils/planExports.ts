import { supabase } from "@/integrations/supabase/client";
import pptxgen from "pptxgenjs";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

// @ts-ignore
import autoTable from "jspdf-autotable";

interface PlanItem {
  asset_id: string;
  location: string;
  area: string;
  city: string;
  media_type: string;
  dimensions: string;
  sales_price: number;
  printing_charges: number;
  mounting_charges: number;
  card_rate: number;
  subtotal: number;
  gst_amount: number;
  total_with_gst: number;
}

interface AssetDetails {
  id: string;
  location: string;
  area: string;
  city: string;
  media_type: string;
  dimensions: string;
  direction: string | null;
  illumination: string | null;
  total_sqft: number | null;
  image_urls: string[] | null;
  images: any;
}

/**
 * Fetch asset details for plan items
 */
async function fetchAssetDetails(assetIds: string[]): Promise<Map<string, AssetDetails>> {
  const { data } = await supabase
    .from('media_assets')
    .select('id, location, area, city, media_type, dimensions, direction, illumination, total_sqft, image_urls, images')
    .in('id', assetIds);

  const assetMap = new Map<string, AssetDetails>();
  data?.forEach(asset => {
    assetMap.set(asset.id, asset as AssetDetails);
  });
  return assetMap;
}

/**
 * Get first image URL from asset
 */
function getAssetImageUrl(asset: AssetDetails): string | null {
  if (asset.images && typeof asset.images === 'object') {
    const imageKeys = Object.keys(asset.images);
    if (imageKeys.length > 0) {
      const firstImage = asset.images[imageKeys[0]];
      if (firstImage && typeof firstImage === 'object' && firstImage.url) {
        return firstImage.url;
      }
    }
  }
  if (asset.image_urls && asset.image_urls.length > 0) {
    return asset.image_urls[0];
  }
  return null;
}

/**
 * Export plan to PowerPoint with asset images and details
 */
export async function exportPlanToPPT(
  plan: any,
  planItems: PlanItem[],
  orgSettings?: any
) {
  try {
    const pptx = new pptxgen();
    
    // Fetch asset details
    const assetIds = planItems.map(item => item.asset_id);
    const assetDetailsMap = await fetchAssetDetails(assetIds);

    // Title slide
    const titleSlide = pptx.addSlide();
    titleSlide.background = { color: "1e40af" };
    titleSlide.addText(orgSettings?.organization_name || "Go-Ads 360°", {
      x: 0.5,
      y: 1.5,
      w: 9,
      h: 1,
      fontSize: 44,
      bold: true,
      color: "FFFFFF",
      align: "center"
    });
    titleSlide.addText("Media Plan Presentation", {
      x: 0.5,
      y: 2.7,
      w: 9,
      h: 0.5,
      fontSize: 24,
      color: "FFFFFF",
      align: "center"
    });
    titleSlide.addText(plan.plan_name, {
      x: 0.5,
      y: 3.5,
      w: 9,
      h: 0.5,
      fontSize: 20,
      color: "FFFFFF",
      align: "center"
    });
    titleSlide.addText(`Client: ${plan.client_name}`, {
      x: 0.5,
      y: 4.2,
      w: 9,
      h: 0.4,
      fontSize: 18,
      color: "E0E0E0",
      align: "center"
    });

    // Summary slide
    const summarySlide = pptx.addSlide();
    summarySlide.addText("Campaign Summary", {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.6,
      fontSize: 32,
      bold: true,
      color: "1e40af"
    });

    const summaryData = [
      ["Plan ID", plan.id],
      ["Client", plan.client_name],
      ["Duration", `${plan.duration_days} days`],
      ["Start Date", new Date(plan.start_date).toLocaleDateString()],
      ["End Date", new Date(plan.end_date).toLocaleDateString()],
      ["Total Assets", `${planItems.length} sites`],
      ["Total Amount", `₹${plan.grand_total.toLocaleString()}`],
    ];

    summarySlide.addTable(summaryData, {
      x: 1.5,
      y: 1.5,
      w: 7,
      rowH: 0.4,
      fontSize: 14,
      border: { pt: 1, color: "CCCCCC" },
      fill: { color: "F8FAFC" },
      color: "1F2937",
      valign: "middle"
    });

    // Asset slides
    for (const item of planItems) {
      const assetDetail = assetDetailsMap.get(item.asset_id);
      if (!assetDetail) continue;

      const slide = pptx.addSlide();
      
      // Header
      slide.addText(item.asset_id, {
        x: 0.5,
        y: 0.3,
        w: 9,
        h: 0.5,
        fontSize: 24,
        bold: true,
        color: "1e40af"
      });

      // Try to add image
      const imageUrl = getAssetImageUrl(assetDetail);
      if (imageUrl) {
        try {
          slide.addImage({
            path: imageUrl,
            x: 0.5,
            y: 1,
            w: 4.5,
            h: 3,
            sizing: { type: "contain", w: 4.5, h: 3 }
          });
        } catch (err) {
          console.warn("Failed to add image:", err);
        }
      }

      // Asset properties
      const properties = [
        ["Location", assetDetail.location],
        ["Area", assetDetail.area],
        ["City", assetDetail.city],
        ["Media Type", assetDetail.media_type],
        ["Dimensions", assetDetail.dimensions],
        ["Total SQFT", assetDetail.total_sqft?.toString() || "N/A"],
        ["Direction", assetDetail.direction || "N/A"],
        ["Illumination", assetDetail.illumination || "N/A"],
        ["Monthly Rate", `₹${item.sales_price.toLocaleString()}`],
      ];

      slide.addTable(properties, {
        x: 5.2,
        y: 1,
        w: 4.3,
        rowH: 0.33,
        fontSize: 11,
        border: { pt: 1, color: "E5E7EB" },
        fill: { color: "F9FAFB" },
        color: "374151",
        valign: "middle"
      });
    }

    // Save file
    await pptx.writeFile({ fileName: `${plan.id}_presentation.pptx` });
    return true;
  } catch (error) {
    console.error("PPT export error:", error);
    throw error;
  }
}

/**
 * Export plan to Excel
 */
export async function exportPlanToExcel(plan: any, planItems: PlanItem[]) {
  try {
    const workbook = XLSX.utils.book_new();

    // Plan Summary sheet
    const summaryData = [
      ["Plan Details"],
      ["Plan ID", plan.id],
      ["Plan Name", plan.plan_name],
      ["Client", plan.client_name],
      ["Start Date", new Date(plan.start_date).toLocaleDateString()],
      ["End Date", new Date(plan.end_date).toLocaleDateString()],
      ["Duration", `${plan.duration_days} days`],
      [],
      ["Financial Summary"],
      ["Total Assets", planItems.length],
      ["Subtotal", plan.total_amount],
      ["GST (%)", plan.gst_percent],
      ["GST Amount", plan.gst_amount],
      ["Grand Total", plan.grand_total],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    // Assets sheet
    const assetData = planItems.map(item => ({
      "Asset ID": item.asset_id,
      "Location": item.location,
      "Area": item.area,
      "City": item.city,
      "Media Type": item.media_type,
      "Dimensions": item.dimensions,
      "Card Rate": item.card_rate,
      "Sales Price": item.sales_price,
      "Printing Charges": item.printing_charges,
      "Mounting Charges": item.mounting_charges,
      "Subtotal": item.subtotal,
      "GST Amount": item.gst_amount,
      "Total with GST": item.total_with_gst,
    }));
    const assetsSheet = XLSX.utils.json_to_sheet(assetData);
    XLSX.utils.book_append_sheet(workbook, assetsSheet, "Assets");

    // Save file
    XLSX.writeFile(workbook, `${plan.id}_plan.xlsx`);
    return true;
  } catch (error) {
    console.error("Excel export error:", error);
    throw error;
  }
}

/**
 * Export plan to PDF (Work Order, Quotation, etc.)
 */
export async function exportPlanToPDF(
  plan: any,
  planItems: PlanItem[],
  docType: "quotation" | "estimate" | "proforma_invoice" | "work_order",
  orgSettings?: any,
  termsAndConditions?: string[]
) {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    const docTitle = docType === "work_order" ? "WORK ORDER" :
                     docType === "estimate" ? "ESTIMATE" :
                     docType === "proforma_invoice" ? "PROFORMA INVOICE" :
                     "QUOTATION";
    doc.text(docTitle, pageWidth / 2, yPos, { align: "center" });
    yPos += 10;

    // Company info
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(orgSettings?.organization_name || "Go-Ads 360°", 14, yPos);
    yPos += 15;

    // Client details
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("To,", 14, yPos);
    yPos += 7;
    doc.setFont("helvetica", "normal");
    doc.text(plan.client_name, 14, yPos);
    yPos += 10;

    // Plan details
    doc.text(`Display Name: ${plan.plan_name}`, 120, yPos - 17);
    doc.text(`WO No: ${plan.id}`, 120, yPos - 10);
    doc.text(`WO Date: ${new Date().toLocaleDateString()}`, 120, yPos - 3);
    yPos += 5;

    // Summary of charges
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("SUMMARY OF CHARGES", 14, yPos);
    yPos += 10;

    // Assets table
    const tableData = planItems.map(item => [
      item.asset_id,
      item.location,
      new Date(plan.start_date).toLocaleDateString(),
      new Date(plan.end_date).toLocaleDateString(),
      plan.duration_days.toString(),
      item.sales_price.toLocaleString(),
      item.sales_price.toLocaleString(),
    ]);

    // @ts-ignore - jspdf-autotable types issue
    autoTable(doc, {
      startY: yPos,
      head: [["Asset ID", "Location", "Start Date", "End Date", "Days", "Monthly Rate", "Cost"]],
      body: tableData as any,
      theme: "grid",
      headStyles: { fillColor: [30, 64, 175], textColor: 255 },
      styles: { fontSize: 9 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Financial summary
    const summaryX = 120;
    doc.setFontSize(10);
    doc.text(`Display Cost:`, summaryX, yPos);
    doc.text(`₹${plan.total_amount.toLocaleString()}`, 180, yPos, { align: "right" });
    yPos += 7;

    const printingTotal = planItems.reduce((sum, item) => sum + (item.printing_charges || 0), 0);
    const mountingTotal = planItems.reduce((sum, item) => sum + (item.mounting_charges || 0), 0);

    if (printingTotal > 0) {
      doc.text(`Printing Cost:`, summaryX, yPos);
      doc.text(`₹${printingTotal.toLocaleString()}`, 180, yPos, { align: "right" });
      yPos += 7;
    }

    if (mountingTotal > 0) {
      doc.text(`Installation Cost:`, summaryX, yPos);
      doc.text(`₹${mountingTotal.toLocaleString()}`, 180, yPos, { align: "right" });
      yPos += 7;
    }

    doc.text(`Total Without Tax:`, summaryX, yPos);
    doc.text(`₹${(plan.total_amount + printingTotal + mountingTotal).toLocaleString()}`, 180, yPos, { align: "right" });
    yPos += 7;

    doc.text(`GST (${plan.gst_percent}%):`, summaryX, yPos);
    doc.text(`₹${plan.gst_amount.toLocaleString()}`, 180, yPos, { align: "right" });
    yPos += 10;

    doc.setFont("helvetica", "bold");
    doc.text(`Total in INR:`, summaryX, yPos);
    doc.text(`₹${plan.grand_total.toLocaleString()}`, 180, yPos, { align: "right" });
    yPos += 15;

    // Terms and conditions
    if (termsAndConditions && termsAndConditions.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Terms and Conditions -", 14, yPos);
      yPos += 7;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      termsAndConditions.forEach((term, index) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        const lines = doc.splitTextToSize(`${index + 1}. ${term}`, pageWidth - 28);
        doc.text(lines, 14, yPos);
        yPos += lines.length * 5;
      });
    }

    // Save file
    doc.save(`${plan.id}_${docType}.pdf`);
    return true;
  } catch (error) {
    console.error("PDF export error:", error);
    throw error;
  }
}
