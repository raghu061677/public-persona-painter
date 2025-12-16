import { supabase } from "@/integrations/supabase/client";
import pptxgen from "pptxgenjs";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { compressImage } from "@/lib/imageCompression";

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
  illumination_type: string | null;
  total_sqft: number | null;
  primary_photo_url: string | null;
}

/**
 * Fetch asset details for plan items
 */
async function fetchAssetDetails(assetIds: string[]): Promise<Map<string, AssetDetails>> {
  const { data } = await supabase
    .from('media_assets')
    .select('id, location, area, city, media_type, dimensions, direction, illumination_type, total_sqft, primary_photo_url')
    .in('id', assetIds);

  const assetMap = new Map<string, AssetDetails>();
  data?.forEach(asset => {
    assetMap.set(asset.id, asset as AssetDetails);
  });
  return assetMap;
}

/**
 * Get all image URLs from asset - now fetches from media_photos table
 */
async function getAssetImageUrls(assetId: string): Promise<string[]> {
  const { data: photos } = await supabase
    .from('media_photos')
    .select('photo_url')
    .eq('asset_id', assetId)
    .order('uploaded_at', { ascending: false });
  
  const urls = photos?.map(p => p.photo_url).filter(url => url) || [];
  console.log(`Asset ${assetId} has ${urls.length} images:`, urls);
  return urls;
}

/**
 * Convert image URL to base64 with compression - handles both public URLs and Supabase storage paths
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
    
    // Convert blob to File and compress for PPT (optimize for smaller file size)
    const fileName = url.split('/').pop() || 'image.jpg';
    const file = new File([blob], fileName, { type: blob.type });
    
    // Compress image - target 800px max dimension and 0.5MB max size for PPT
    const compressedFile = await compressImage(file, {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1280,
      quality: 0.75,
      preserveExif: false
    });
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        reject(error);
      };
      reader.readAsDataURL(compressedFile);
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

    // Professional title slide with gradient and branding
    const titleSlide = pptx.addSlide();
    titleSlide.background = { color: "0F172A" };
    
    // Accent bar
    titleSlide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 2.2,
      w: 10,
      h: 0.08,
      fill: { color: companyData?.theme_color?.replace('#', '') || "0EA5E9" }
    });
    
    titleSlide.addText("MEDIA ASSET PROPOSAL", {
      x: 0.5,
      y: 2.5,
      w: 9,
      h: 1,
      fontSize: 44,
      bold: true,
      color: "FFFFFF",
      align: "center",
      fontFace: "Arial"
    });
    
    titleSlide.addText(`${planItems.length} Premium OOH Media Assets`, {
      x: 0.5,
      y: 3.6,
      w: 9,
      h: 0.5,
      fontSize: 20,
      color: "CBD5E1",
      align: "center",
      fontFace: "Arial"
    });
    
    titleSlide.addText(`${companyData?.name || "Go-Ads 360°"}`, {
      x: 0.5,
      y: 6.2,
      w: 9,
      h: 0.4,
      fontSize: 16,
      color: "94A3B8",
      align: "center",
      fontFace: "Arial"
    });

    // Professional summary slide with border
    const summarySlide = pptx.addSlide();
    summarySlide.background = { color: "FFFFFF" };
    
    // Header with accent
    summarySlide.addShape(pptx.ShapeType.rect, {
      x: 0.4,
      y: 0.35,
      w: 0.1,
      h: 0.5,
      fill: { color: companyData?.theme_color?.replace('#', '') || "0EA5E9" }
    });
    
    summarySlide.addText("Campaign Summary", {
      x: 0.65,
      y: 0.4,
      w: 8.5,
      h: 0.5,
      fontSize: 26,
      bold: true,
      color: "1E293B",
      fontFace: "Arial"
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
      x: 0.65,
      y: 1.15,
      w: 8.7,
      rowH: 0.35,
      fontSize: 11,
      border: { pt: 0.5, color: "E2E8F0" },
      fill: { color: "F8FAFC" },
      color: "334155",
      valign: "middle",
      align: "left",
      margin: [0.05, 0.15, 0.05, 0.15],
      fontFace: "Arial"
    });

    // Asset slides - 2 slides per asset (like reference)
    for (const item of planItems) {
      const assetDetail = assetDetailsMap.get(item.asset_id);
      if (!assetDetail) continue;

      // Get all images for this asset from media_photos table
      const allImages = await getAssetImageUrls(item.asset_id);
      console.log(`Processing asset ${item.asset_id}, found ${allImages.length} images`);

      // SLIDE 1: Professional full-size images with border
      const imageSlide = pptx.addSlide();
      imageSlide.background = { color: "F8FAFC" };
      
      // Elegant header with accent line
      imageSlide.addShape(pptx.ShapeType.rect, {
        x: 0.3,
        y: 0.28,
        w: 0.08,
        h: 0.45,
        fill: { color: companyData?.theme_color?.replace('#', '') || "0EA5E9" }
      });
      
      imageSlide.addText(`${item.asset_id}`, {
        x: 0.5,
        y: 0.32,
        w: 4,
        h: 0.35,
        fontSize: 16,
        bold: true,
        color: "1E293B",
        fontFace: "Arial"
      });
      
      imageSlide.addText(`${assetDetail.area} · ${assetDetail.location}`, {
        x: 0.5,
        y: 0.58,
        w: 9,
        h: 0.25,
        fontSize: 11,
        color: "64748B",
        fontFace: "Arial"
      });

      // Display 2 high-quality images with subtle shadow
      const imagesToShow = allImages.slice(0, 2);
      if (imagesToShow.length > 0) {
        try {
          const img1Base64 = await imageToBase64(imagesToShow[0]);
          if (img1Base64) {
            imageSlide.addImage({
              data: img1Base64,
              x: 0.35,
              y: 1,
              w: imagesToShow.length === 1 ? 9.3 : 4.55,
              h: 5.3,
              sizing: { type: "cover", w: imagesToShow.length === 1 ? 9.3 : 4.55, h: 5.3 }
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
              y: 1,
              w: 4.55,
              h: 5.3,
              sizing: { type: "cover", w: 4.55, h: 5.3 }
            });
          }
        } catch (err) {
          console.warn("Failed to add second image:", err);
        }
      }

      // Professional footer with separator
      imageSlide.addShape(pptx.ShapeType.rect, {
        x: 0.35,
        y: 6.55,
        w: 9.3,
        h: 0.01,
        fill: { color: "CBD5E1" }
      });
      
      imageSlide.addText(`${companyData?.name || "Go-Ads 360°"}`, {
        x: 0.4,
        y: 6.7,
        w: 4,
        h: 0.25,
        fontSize: 9,
        color: "475569",
        fontFace: "Arial",
        bold: true
      });
      
      if (companyData?.website) {
        imageSlide.addText(companyData.website, {
          x: 4.5,
          y: 6.7,
          w: 2.5,
          h: 0.25,
          fontSize: 9,
          color: "64748B",
          fontFace: "Arial"
        });
      }

      const now = new Date();
      imageSlide.addText(now.toLocaleString('en-IN', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true 
      }), {
        x: 7.5,
        y: 6.7,
        w: 2.15,
        h: 0.25,
        fontSize: 9,
        color: "64748B",
        align: "right",
        fontFace: "Arial"
      });

      // SLIDE 2: Professional asset specifications
      const detailSlide = pptx.addSlide();
      detailSlide.background = { color: "FFFFFF" };
      
      // Elegant header with accent
      detailSlide.addShape(pptx.ShapeType.rect, {
        x: 0.3,
        y: 0.28,
        w: 0.08,
        h: 0.5,
        fill: { color: companyData?.theme_color?.replace('#', '') || "0EA5E9" }
      });
      
      detailSlide.addText("Asset Specifications", {
        x: 0.5,
        y: 0.32,
        w: 4,
        h: 0.4,
        fontSize: 20,
        bold: true,
        color: "1E293B",
        fontFace: "Arial"
      });
      
      detailSlide.addText(item.asset_id, {
        x: 0.5,
        y: 0.65,
        w: 4,
        h: 0.3,
        fontSize: 13,
        color: companyData?.theme_color?.replace('#', '') || "0EA5E9",
        fontFace: "Arial",
        bold: true
      });

      // High-quality image on the right with border
      if (imagesToShow.length > 0) {
        try {
          const imgBase64 = await imageToBase64(imagesToShow[0]);
          if (imgBase64) {
            detailSlide.addImage({
              data: imgBase64,
              x: 5.25,
              y: 1.05,
              w: 4.4,
              h: 5.25,
              sizing: { type: "cover", w: 4.4, h: 5.25 }
            });
          }
        } catch (err) {
          console.warn("Failed to add detail image:", err);
        }
      }

      // Professional specifications table on the left
      const specs = [
        { label: "City", value: assetDetail.city },
        { label: "Area", value: assetDetail.area },
        { label: "Location", value: assetDetail.location },
        { label: "Direction", value: assetDetail.direction || "N/A" },
        { label: "Dimensions", value: assetDetail.dimensions },
        { label: "Total Sqft", value: assetDetail.total_sqft?.toString() || "N/A" },
        { label: "Illumination", value: assetDetail.illumination_type || "N/A" },
      ];

      let yPos = 1.15;
      specs.forEach(spec => {
        detailSlide.addText(spec.label, {
          x: 0.55,
          y: yPos,
          w: 1.6,
          h: 0.4,
          fontSize: 11,
          bold: true,
          color: "334155",
          fontFace: "Arial"
        });
        detailSlide.addText(spec.value, {
          x: 2.25,
          y: yPos,
          w: 2.7,
          h: 0.4,
          fontSize: 11,
          color: "475569",
          fontFace: "Arial"
        });
        
        // Subtle separator line
        if (yPos < 4.5) {
          detailSlide.addShape(pptx.ShapeType.rect, {
            x: 0.55,
            y: yPos + 0.38,
            w: 4.4,
            h: 0.005,
            fill: { color: "E2E8F0" }
          });
        }
        
        yPos += 0.5;
      });

      // Professional footer with separator
      detailSlide.addShape(pptx.ShapeType.rect, {
        x: 0.35,
        y: 6.55,
        w: 9.3,
        h: 0.01,
        fill: { color: "CBD5E1" }
      });
      
      detailSlide.addText(`${companyData?.name || "Go-Ads 360°"}`, {
        x: 0.4,
        y: 6.7,
        w: 4,
        h: 0.25,
        fontSize: 9,
        color: "475569",
        fontFace: "Arial",
        bold: true
      });
      
      if (companyData?.website) {
        detailSlide.addText(companyData.website, {
          x: 4.5,
          y: 6.7,
          w: 2.5,
          h: 0.25,
          fontSize: 9,
          color: "64748B",
          fontFace: "Arial"
        });
      }

      detailSlide.addText(now.toLocaleString('en-IN', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true 
      }), {
        x: 7.5,
        y: 6.7,
        w: 2.15,
        h: 0.25,
        fontSize: 9,
        color: "64748B",
        align: "right",
        fontFace: "Arial"
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
 * Uses the standardized finance PDF template (consistent header/footer + ₹).
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
    const { generateStandardizedPDF, formatDateToDDMonYY } = await import('@/lib/pdf/standardPDFTemplate');
    const { getPrimaryContactName } = await import('@/lib/pdf/pdfHelpers');

    // Fetch company (seller) details
    const { data: companyData } = await supabase
      .from('companies')
      .select('*')
      .eq('id', plan.company_id)
      .single();

    // Fetch client (buyer) details
    const { data: clientData } = await supabase
      .from('clients')
      .select('*')
      .eq('id', plan.client_id)
      .single();

    // Fetch client contacts for POC
    const { data: clientContacts } = await supabase
      .from('client_contacts')
      .select('*')
      .eq('client_id', plan.client_id)
      .order('is_primary', { ascending: false });

    const clientWithContacts = {
      ...clientData,
      contacts:
        clientContacts?.map((c) => ({
          name: c.first_name ? `${c.first_name} ${c.last_name || ''}`.trim() : c.name,
          first_name: c.first_name,
          last_name: c.last_name,
        })) || [],
    };

    const pointOfContact = getPrimaryContactName(clientWithContacts);

    // Days
    const startDate = new Date(plan.start_date);
    const endDate = new Date(plan.end_date);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Build line items
    const items = (planItems || []).map((item: any) => {
      const desc = item.location
        ? item.location
        : `${item.media_type || 'Display'} - ${item.area || ''} - ${item.city || ''}`;

      const monthlyRate = item.sales_price || item.card_rate || 0;
      const cost = monthlyRate - (item.discount_amount || 0);

      return {
        description: desc,
        dimension: item.dimensions || '',
        sqft: item.total_sqft || undefined,
        illuminationType: item.illumination_type || undefined,
        startDate: formatDateToDDMonYY(plan.start_date),
        endDate: formatDateToDDMonYY(plan.end_date),
        days,
        monthlyRate,
        cost,
      };
    });

    const totalPrinting = (planItems || []).reduce((sum, i: any) => sum + (i.printing_charges || 0), 0);
    const totalInstallation = (planItems || []).reduce((sum, i: any) => sum + (i.mounting_charges || 0), 0);

    if (totalPrinting > 0) {
      items.push({
        description: 'Printing Charges',
        startDate: '',
        endDate: '',
        days: 0,
        monthlyRate: 0,
        cost: totalPrinting,
      } as any);
    }

    if (totalInstallation > 0) {
      items.push({
        description: 'Installation Charges',
        startDate: '',
        endDate: '',
        days: 0,
        monthlyRate: 0,
        cost: totalInstallation,
      } as any);
    }

    // Totals (keep existing plan totals)
    const displayCost = Number(plan.total_amount || 0);
    const gst = Number(plan.gst_amount || 0);
    const totalInr = Number(plan.grand_total || 0);

    const docTitle =
      docType === 'work_order'
        ? 'WORK ORDER'
        : docType === 'estimate'
          ? 'ESTIMATE'
          : docType === 'proforma_invoice'
            ? 'PROFORMA INVOICE'
            : 'QUOTATION';

    // Logo: use companyData.logo_url if it is already a data URL; otherwise skip (no breaking)
    const logoBase64 = typeof companyData?.logo_url === 'string' && companyData.logo_url.startsWith('data:')
      ? companyData.logo_url
      : undefined;

    const pdfBlob = await generateStandardizedPDF({
      documentType: docTitle as any,
      documentNumber: plan.id,
      documentDate: new Date().toLocaleDateString('en-IN'),
      displayName: plan.plan_name || plan.id,
      pointOfContact,

      // To (Client)
      clientName: plan.client_name || clientData?.name || 'Client',
      clientAddress: clientData?.billing_address_line1 || clientData?.address || '',
      clientCity: clientData?.billing_city || clientData?.city || '',
      clientState: clientData?.billing_state || clientData?.state || '',
      clientPincode: clientData?.billing_pincode || '',
      clientGSTIN: clientData?.gst_number || undefined,

      // For (Seller)
      companyName: companyData?.name || orgSettings?.organization_name || 'Matrix Network Solutions',
      companyGSTIN: companyData?.gstin || orgSettings?.gstin || '36AATFM4107H2Z3',
      companyPAN: companyData?.pan || orgSettings?.pan || 'AATFM4107H',
      companyLogoBase64: logoBase64,

      items,
      displayCost,
      installationCost: totalInstallation,
      gst,
      totalInr,
      terms: termsAndConditions,
    });

    if (uploadToCloud) {
      const fileName = `plan_${plan.id}_${docType}_${Date.now()}.pdf`;
      const storagePath = `exports/plans/${plan.id}/${fileName}`;

      const publicUrl = await uploadToStorage(pdfBlob, 'client-documents', storagePath);
      if (publicUrl) {
        await updatePlanExportLinks(plan.id, { pdf_url: publicUrl });
      }
      return publicUrl;
    }

    // download
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${plan.id}_${docType}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('PDF export error:', error);
    throw error;
  }
}
