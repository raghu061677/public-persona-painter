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
 * Get all image URLs from asset
 */
function getAssetImageUrls(asset: AssetDetails): string[] {
  const urls: string[] = [];
  
  // Try images object first (newer format)
  if (asset.images && typeof asset.images === 'object') {
    const imageKeys = Object.keys(asset.images);
    imageKeys.forEach(key => {
      const img = asset.images[key];
      if (img && typeof img === 'object' && img.url) {
        urls.push(img.url);
      }
    });
  }
  
  // Fallback to image_urls array
  if (urls.length === 0 && asset.image_urls && Array.isArray(asset.image_urls)) {
    urls.push(...asset.image_urls.filter(url => url && typeof url === 'string'));
  }
  
  console.log(`Asset ${asset.id} has ${urls.length} images:`, urls);
  return urls;
}

/**
 * Convert image URL to base64 - handles both public URLs and Supabase storage paths
 */
async function imageToBase64(url: string): Promise<string | null> {
  try {
    let fetchUrl = url;
    
    // If it's a Supabase storage path (starts with media-assets/ or similar), get a signed URL
    if (!url.startsWith('http') && !url.startsWith('data:')) {
      const { data: signedUrlData } = await supabase.storage
        .from('media-assets')
        .createSignedUrl(url, 3600);
      
      if (signedUrlData?.signedUrl) {
        fetchUrl = signedUrlData.signedUrl;
      }
    }
    
    // Fetch with mode 'cors' to handle cross-origin requests
    const response = await fetch(fetchUrl, { mode: 'cors' });
    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        reject(error);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to convert image to base64:', error, 'URL:', url);
    return null;
  }
}

/**
 * Get terms and conditions
 */
async function getTermsAndConditions(): Promise<string[]> {
  const { data } = await supabase
    .from('plan_terms_settings')
    .select('terms')
    .limit(1)
    .single();
  
  return data?.terms || [];
}

/**
 * Upload file to Supabase Storage
 */
async function uploadToStorage(
  file: Blob,
  bucket: string,
  path: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: true });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error('Storage upload error:', error);
    return null;
  }
}

/**
 * Update plan export links
 */
async function updatePlanExportLinks(planId: string, links: Record<string, any>) {
  const { data } = await supabase
    .from('plans')
    .select('export_links')
    .eq('id', planId)
    .single();

  const currentLinks = (data?.export_links as Record<string, any>) || {};
  
  await supabase
    .from('plans')
    .update({
      export_links: { ...currentLinks, ...links }
    })
    .eq('id', planId);
}

/**
 * Export plan to PowerPoint with asset images and details
 */
export async function exportPlanToPPT(
  plan: any,
  planItems: PlanItem[],
  orgSettings?: any,
  uploadToCloud: boolean = false
) {
  try {
    // Verify user has access to this plan
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required");

    if (plan.company_id) {
      const { data: userCompany } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", user.id)
        .eq("company_id", plan.company_id)
        .single();

      if (!userCompany) {
        throw new Error("You don't have access to this plan");
      }
    }

    // Fetch company details
    const { data: companyData } = await supabase
      .from('companies')
      .select('*')
      .eq('id', plan.company_id)
      .single();

    const pptx = new pptxgen();
    
    // Fetch client details with company filter
    const { data: clientData } = await supabase
      .from('clients')
      .select('*')
      .eq('id', plan.client_id)
      .eq('company_id', plan.company_id)
      .single();
    
    // Fetch asset details
    const assetIds = planItems.map(item => item.asset_id);
    const assetDetailsMap = await fetchAssetDetails(assetIds);

    // Title slide with dark background
    const titleSlide = pptx.addSlide();
    titleSlide.background = { color: "1a1a2e" };
    
    titleSlide.addText("MEDIA ASSET PROPOSAL", {
      x: 0.5,
      y: 2.5,
      w: 9,
      h: 1.2,
      fontSize: 48,
      bold: true,
      color: "FFFFFF",
      align: "center"
    });
    
    titleSlide.addText(`${planItems.length} Premium OOH Media Assets`, {
      x: 0.5,
      y: 3.8,
      w: 9,
      h: 0.6,
      fontSize: 24,
      color: "FFFFFF",
      align: "center"
    });

    // Summary slide
    const summarySlide = pptx.addSlide();
    summarySlide.addText("Campaign Summary", {
      x: 0.5,
      y: 0.4,
      w: 9,
      h: 0.5,
      fontSize: 28,
      bold: true,
      color: companyData?.theme_color?.replace('#', '') || "1e40af"
    });

    const summaryData = [
      [{ text: "Plan ID", options: { bold: true } }, { text: plan.id }],
      [{ text: "Company", options: { bold: true } }, { text: companyData?.name || "N/A" }],
      [{ text: "GSTIN", options: { bold: true } }, { text: companyData?.gstin || "N/A" }],
      [{ text: "Client", options: { bold: true } }, { text: plan.client_name }],
      [{ text: "Client GSTIN", options: { bold: true } }, { text: clientData?.gst_number || "N/A" }],
      [{ text: "Address", options: { bold: true } }, { text: clientData?.billing_address_line1 || clientData?.address || "N/A" }],
      [{ text: "City, State", options: { bold: true } }, { text: `${clientData?.billing_city || clientData?.city || ""}, ${clientData?.billing_state || clientData?.state || ""}` }],
      [{ text: "Duration", options: { bold: true } }, { text: `${plan.duration_days} days` }],
      [{ text: "Start Date", options: { bold: true } }, { text: new Date(plan.start_date).toLocaleDateString() }],
      [{ text: "End Date", options: { bold: true } }, { text: new Date(plan.end_date).toLocaleDateString() }],
      [{ text: "Total Assets", options: { bold: true } }, { text: `${planItems.length} sites` }],
      [{ text: "Total Amount", options: { bold: true } }, { text: `₹${plan.grand_total.toLocaleString('en-IN')}` }],
    ];

    summarySlide.addTable(summaryData, {
      x: 0.8,
      y: 1.1,
      w: 8.4,
      rowH: 0.32,
      fontSize: 10,
      border: { pt: 1, color: "CCCCCC" },
      fill: { color: "F8FAFC" },
      color: "1F2937",
      valign: "middle",
      align: "left",
      margin: 0.1
    });

    // Asset slides - 2 slides per asset (like reference)
    for (const item of planItems) {
      const assetDetail = assetDetailsMap.get(item.asset_id);
      if (!assetDetail) continue;

      // Get all images for this asset
      const allImages = getAssetImageUrls(assetDetail);
      console.log(`Processing asset ${item.asset_id}, found ${allImages.length} images`);

      // SLIDE 1: Full-size images
      const imageSlide = pptx.addSlide();
      
      // Header with asset ID
      imageSlide.addText(`${item.asset_id} – ${assetDetail.area} – ${assetDetail.location}`, {
        x: 0.3,
        y: 0.3,
        w: 9.4,
        h: 0.4,
        fontSize: 14,
        bold: true,
        color: "1F2937"
      });

      // Display 2 large images side by side
      const imagesToShow = allImages.slice(0, 2);
      if (imagesToShow.length > 0) {
        try {
          const img1Base64 = await imageToBase64(imagesToShow[0]);
          if (img1Base64) {
            imageSlide.addImage({
              data: img1Base64,
              x: 0.3,
              y: 0.9,
              w: imagesToShow.length === 1 ? 9.4 : 4.6,
              h: 5.5,
              sizing: { type: "cover", w: imagesToShow.length === 1 ? 9.4 : 4.6, h: 5.5 }
            });
          }
        } catch (err) {
          console.warn("Failed to add first image:", err);
        }
      }

      if (imagesToShow.length > 1) {
        try {
          const img2Base64 = await imageToBase64(imagesToShow[1]);
          if (img2Base64) {
            imageSlide.addImage({
              data: img2Base64,
              x: 5.1,
              y: 0.9,
              w: 4.6,
              h: 5.5,
              sizing: { type: "cover", w: 4.6, h: 5.5 }
            });
          }
        } catch (err) {
          console.warn("Failed to add second image:", err);
        }
      }

      // Footer branding
      imageSlide.addText(`${companyData?.name || "Go-Ads 360°"}   ${companyData?.website || "www.goads.in"}`, {
        x: 0.3,
        y: 6.8,
        w: 6,
        h: 0.3,
        fontSize: 10,
        color: "374151"
      });

      const now = new Date();
      imageSlide.addText(now.toLocaleString('en-IN', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true 
      }), {
        x: 7,
        y: 6.8,
        w: 2.7,
        h: 0.3,
        fontSize: 10,
        color: "374151",
        align: "right"
      });

      // SLIDE 2: Asset specifications with one image
      const detailSlide = pptx.addSlide();
      
      // Header
      detailSlide.addText(`Asset Specifications – ${item.asset_id}`, {
        x: 0.3,
        y: 0.3,
        w: 9.4,
        h: 0.5,
        fontSize: 18,
        bold: true,
        color: "1F2937"
      });

      // Large image on the right
      if (imagesToShow.length > 0) {
        try {
          const imgBase64 = await imageToBase64(imagesToShow[0]);
          if (imgBase64) {
            detailSlide.addImage({
              data: imgBase64,
              x: 5.2,
              y: 1,
              w: 4.5,
              h: 5.4,
              sizing: { type: "cover", w: 4.5, h: 5.4 }
            });
          }
        } catch (err) {
          console.warn("Failed to add detail image:", err);
        }
      }

      // Specifications on the left
      const specs = [
        { label: "City:", value: assetDetail.city },
        { label: "Area:", value: assetDetail.area },
        { label: "Location:", value: assetDetail.location },
        { label: "Direction:", value: assetDetail.direction || "N/A" },
        { label: "Dimensions:", value: assetDetail.dimensions },
        { label: "Total Sqft:", value: assetDetail.total_sqft?.toString() || "N/A" },
        { label: "Illumination:", value: assetDetail.illumination || "N/A" },
      ];

      let yPos = 1.2;
      specs.forEach(spec => {
        detailSlide.addText(spec.label, {
          x: 0.5,
          y: yPos,
          w: 1.8,
          h: 0.35,
          fontSize: 12,
          bold: true,
          color: "1F2937"
        });
        detailSlide.addText(spec.value, {
          x: 2.4,
          y: yPos,
          w: 2.5,
          h: 0.35,
          fontSize: 12,
          color: "374151"
        });
        yPos += 0.45;
      });

      // Footer branding
      detailSlide.addText(`${companyData?.name || "Go-Ads 360°"}   ${companyData?.website || "www.goads.in"}`, {
        x: 0.3,
        y: 6.8,
        w: 6,
        h: 0.3,
        fontSize: 10,
        color: "374151"
      });

      detailSlide.addText(now.toLocaleString('en-IN', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true 
      }), {
        x: 7,
        y: 6.8,
        w: 2.7,
        h: 0.3,
        fontSize: 10,
        color: "374151",
        align: "right"
      });
    }

    // Terms & Conditions slide
    const terms = await getTermsAndConditions();
    if (terms.length > 0) {
      const termsSlide = pptx.addSlide();
      termsSlide.addText("Terms & Conditions", {
        x: 0.5,
        y: 0.5,
        w: 9,
        h: 0.6,
        fontSize: 28,
        bold: true,
        color: "1e40af"
      });

      const termsText = terms.map((term, idx) => `${idx + 1}. ${term}`).join('\n\n');
      termsSlide.addText(termsText, {
        x: 0.5,
        y: 1.3,
        w: 9,
        h: 5,
        fontSize: 11,
        color: "374151",
        valign: "top"
      });

      // Add public link if available
      if (plan.share_token) {
        const publicUrl = `${window.location.origin}/share/plan/${plan.id}/${plan.share_token}`;
        termsSlide.addText("View Interactive Map & Asset Details:", {
          x: 0.5,
          y: 6.5,
          w: 9,
          h: 0.4,
          fontSize: 12,
          color: "1e40af",
          bold: true
        });
        termsSlide.addText(publicUrl, {
          x: 0.5,
          y: 6.9,
          w: 9,
          h: 0.4,
          fontSize: 10,
          color: "0066cc",
          hyperlink: { url: publicUrl }
        });
      }
    }

    // Save file
    if (uploadToCloud) {
      const blob = await pptx.write({ outputType: 'blob' }) as Blob;
      const fileName = `plan_${plan.id}_${Date.now()}.pptx`;
      const storagePath = `exports/plans/${plan.id}/${fileName}`;
      
      const publicUrl = await uploadToStorage(blob, 'client-documents', storagePath);
      if (publicUrl) {
        await updatePlanExportLinks(plan.id, { ppt_url: publicUrl });
      }
      
      // Also download locally
      await pptx.writeFile({ fileName: `${plan.id}_presentation.pptx` });
      return publicUrl;
    } else {
      await pptx.writeFile({ fileName: `${plan.id}_presentation.pptx` });
      return true;
    }
  } catch (error) {
    console.error("PPT export error:", error);
    throw error;
  }
}

/**
 * Export plan to Excel
 */
export async function exportPlanToExcel(
  plan: any,
  planItems: PlanItem[],
  uploadToCloud: boolean = false
) {
  try {
    // Fetch company details
    const { data: companyData } = await supabase
      .from('companies')
      .select('*')
      .eq('id', plan.company_id)
      .single();

    // Fetch client details
    const { data: clientData } = await supabase
      .from('clients')
      .select('*')
      .eq('id', plan.client_id)
      .single();
    
    const workbook = XLSX.utils.book_new();

    // Plan Summary sheet
    const summaryData = [
      ["Company Details"],
      ["Company Name", companyData?.name || "N/A"],
      ["Company GSTIN", companyData?.gstin || "N/A"],
      ["Address", `${companyData?.address_line1 || ""}, ${companyData?.city || ""}, ${companyData?.state || ""}`],
      [],
      ["Plan Details"],
      ["Plan ID", plan.id],
      ["Plan Name", plan.plan_name],
      ["Client", plan.client_name],
      ["Client GSTIN", clientData?.gst_number || "N/A"],
      ["Billing Address", clientData?.billing_address_line1 || clientData?.address || "N/A"],
      ["City", clientData?.billing_city || clientData?.city || "N/A"],
      ["State", clientData?.billing_state || clientData?.state || "N/A"],
      ["Pincode", clientData?.billing_pincode || "N/A"],
      ["Contact Person", clientData?.contact_person || "N/A"],
      ["Phone", clientData?.phone || "N/A"],
      ["Email", clientData?.email || "N/A"],
      ["Start Date", new Date(plan.start_date).toLocaleDateString()],
      ["End Date", new Date(plan.end_date).toLocaleDateString()],
      ["Duration", `${plan.duration_days} days`],
      [],
    ["Financial Summary"],
    ["Total Assets", planItems.length],
    ["Subtotal", `₹${plan.total_amount.toLocaleString('en-IN')}`],
    ["GST (%)", plan.gst_percent],
    ["GST Amount", `₹${plan.gst_amount.toLocaleString('en-IN')}`],
    ["Grand Total", `₹${plan.grand_total.toLocaleString('en-IN')}`],
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
    if (uploadToCloud) {
      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const fileName = `plan_${plan.id}_${Date.now()}.xlsx`;
      const storagePath = `exports/plans/${plan.id}/${fileName}`;
      
      const publicUrl = await uploadToStorage(blob, 'client-documents', storagePath);
      if (publicUrl) {
        await updatePlanExportLinks(plan.id, { excel_url: publicUrl });
      }
      
      XLSX.writeFile(workbook, `${plan.id}_plan.xlsx`);
      return publicUrl;
    } else {
      XLSX.writeFile(workbook, `${plan.id}_plan.xlsx`);
      return true;
    }
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
  termsAndConditions?: string[],
  uploadToCloud: boolean = false
) {
  try {
    // Fetch company details
    const { data: companyData } = await supabase
      .from('companies')
      .select('*')
      .eq('id', plan.company_id)
      .single();

    // Fetch client details
    const { data: clientData } = await supabase
      .from('clients')
      .select('*')
      .eq('id', plan.client_id)
      .single();
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Header - Company Logo
    if (companyData?.logo_url) {
      try {
        doc.addImage(companyData.logo_url, 'PNG', 14, yPos, 40, 20);
      } catch (e) {
        console.log('Logo loading skipped');
      }
    }

    // Company info (Left)
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(companyData?.name || orgSettings?.organization_name || "Go-Ads 360°", 14, yPos + 25);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    yPos += 30;
    if (companyData?.address_line1) {
      doc.text(companyData.address_line1, 14, yPos);
      yPos += 4;
    }
    if (companyData?.address_line2) {
      doc.text(companyData.address_line2, 14, yPos);
      yPos += 4;
    }
    if (companyData?.city || companyData?.state) {
      doc.text(`${companyData?.city || ""}, ${companyData?.state || ""} ${companyData?.pincode || ""}`, 14, yPos);
      yPos += 4;
    }
    if (companyData?.gstin || orgSettings?.gstin) {
      doc.text(`GSTIN: ${companyData?.gstin || orgSettings?.gstin}`, 14, yPos);
      yPos += 4;
    }
    if (companyData?.phone) {
      doc.text(`Phone: ${companyData.phone}`, 14, yPos);
      yPos += 4;
    }
    if (companyData?.email) {
      doc.text(`Email: ${companyData.email}`, 14, yPos);
      yPos += 4;
    }

    // Document Title (Right)
    const rightX = pageWidth - 14;
    const titleYPos = 20;
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 64, 175);
    const docTitle = docType === "work_order" ? "WORK ORDER" :
                     docType === "estimate" ? "ESTIMATE" :
                     docType === "proforma_invoice" ? "PROFORMA INVOICE" :
                     "QUOTATION";
    doc.text(docTitle, rightX, titleYPos, { align: "right" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    yPos = Math.max(yPos, titleYPos + 10);

    // Client details
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Bill To:", 14, yPos);
    yPos += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(plan.client_name, 14, yPos);
    yPos += 5;
    if (clientData?.gst_number) {
      doc.text(`GSTIN: ${clientData.gst_number}`, 14, yPos);
      yPos += 5;
    }
    if (clientData?.billing_address_line1 || clientData?.address) {
      const address = clientData?.billing_address_line1 || clientData?.address;
      const addressLines = doc.splitTextToSize(address, 80);
      doc.text(addressLines, 14, yPos);
      yPos += addressLines.length * 5;
    }
    if (clientData?.billing_city || clientData?.city) {
      const cityState = `${clientData?.billing_city || clientData?.city || ""}, ${clientData?.billing_state || clientData?.state || ""} ${clientData?.billing_pincode || ""}`;
      doc.text(cityState, 14, yPos);
      yPos += 5;
    }
    yPos += 5;

    // Plan details (Right)
    doc.text(`Plan Name: ${plan.plan_name}`, rightX, yPos - 5, { align: "right" });
    doc.text(`${docTitle} No: ${plan.id}`, rightX, yPos + 2, { align: "right" });
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, rightX, yPos + 9, { align: "right" });
    yPos += 15;

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

    // Financial summary (in box)
    const summaryX = pageWidth - 75;
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.5);
    doc.rect(summaryX - 5, yPos - 5, 65, 50);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    doc.text(`Display Cost:`, summaryX, yPos);
    doc.text(`₹${plan.total_amount.toLocaleString('en-IN')}`, pageWidth - 14, yPos, { align: "right" });
    yPos += 6;

    const printingTotal = planItems.reduce((sum, item) => sum + (item.printing_charges || 0), 0);
    const mountingTotal = planItems.reduce((sum, item) => sum + (item.mounting_charges || 0), 0);

    if (printingTotal > 0) {
      doc.text(`Printing Cost:`, summaryX, yPos);
      doc.text(`₹${printingTotal.toLocaleString('en-IN')}`, pageWidth - 14, yPos, { align: "right" });
      yPos += 6;
    }

    if (mountingTotal > 0) {
      doc.text(`Installation Cost:`, summaryX, yPos);
      doc.text(`₹${mountingTotal.toLocaleString('en-IN')}`, pageWidth - 14, yPos, { align: "right" });
      yPos += 6;
    }

    doc.setFont("helvetica", "bold");
    doc.text(`Subtotal:`, summaryX, yPos);
    doc.text(`₹${(plan.total_amount + printingTotal + mountingTotal).toLocaleString('en-IN')}`, pageWidth - 14, yPos, { align: "right" });
    yPos += 6;

    doc.setFont("helvetica", "normal");
    doc.text(`CGST @ ${plan.gst_percent/2}%:`, summaryX, yPos);
    doc.text(`₹${(plan.gst_amount/2).toLocaleString('en-IN')}`, pageWidth - 14, yPos, { align: "right" });
    yPos += 6;

    doc.text(`SGST @ ${plan.gst_percent/2}%:`, summaryX, yPos);
    doc.text(`₹${(plan.gst_amount/2).toLocaleString('en-IN')}`, pageWidth - 14, yPos, { align: "right" });
    yPos += 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`Grand Total:`, summaryX, yPos);
    doc.text(`₹${plan.grand_total.toLocaleString('en-IN')}`, pageWidth - 14, yPos, { align: "right" });
    yPos += 15;

    // Terms and conditions
    const terms = termsAndConditions || await getTermsAndConditions();
    if (terms && terms.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Terms and Conditions -", 14, yPos);
      yPos += 7;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      terms.forEach((term, index) => {
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
    if (uploadToCloud) {
      const pdfBlob = doc.output('blob');
      const fileName = `plan_${plan.id}_${docType}_${Date.now()}.pdf`;
      const storagePath = `exports/plans/${plan.id}/${fileName}`;
      
      const publicUrl = await uploadToStorage(pdfBlob, 'client-documents', storagePath);
      if (publicUrl) {
        await updatePlanExportLinks(plan.id, { pdf_url: publicUrl });
      }
      
      doc.save(`${plan.id}_${docType}.pdf`);
      return publicUrl;
    } else {
      doc.save(`${plan.id}_${docType}.pdf`);
      return true;
    }
  } catch (error) {
    console.error("PDF export error:", error);
    throw error;
  }
}
