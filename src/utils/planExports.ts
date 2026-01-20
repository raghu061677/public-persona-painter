// Plan export utilities - PDF, PPT, Excel
import { supabase } from "@/integrations/supabase/client";
import pptxgen from "pptxgenjs";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { compressImage } from "@/lib/imageCompression";
import { getCachedQRData } from "@/lib/qrWatermark";
import { sanitizePptHyperlink, sanitizePptText, PPT_SAFE_FONTS } from "@/lib/ppt/sanitizers";
import { formatAssetDisplayCode } from "@/lib/assets/formatAssetDisplayCode";
import JSZip from "jszip";

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
  media_asset_code: string | null;
  location: string;
  area: string;
  city: string;
  media_type: string;
  dimensions: string;
  direction: string | null;
  illumination_type: string | null;
  total_sqft: number | null;
  primary_photo_url: string | null;
  qr_code_url: string | null;
  latitude: number | null;
  longitude: number | null;
}

/**
 * Fetch asset details for plan items
 */
async function fetchAssetDetails(assetIds: string[]): Promise<Map<string, AssetDetails>> {
  const { data } = await supabase
    .from('media_assets')
    .select('id, media_asset_code, location, area, city, media_type, dimensions, direction, illumination_type, total_sqft, primary_photo_url, qr_code_url, latitude, longitude')
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
 * Attempt to parse a backend storage object URL into { bucket, path }.
 * Supports URLs like: .../storage/v1/object/public/<bucket>/<path>
 */
function parseStorageObjectUrl(url: string): { bucket: string; path: string } | null {
  try {
    const u = new URL(url);
    const match = u.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/);
    if (!match) return null;
    return { bucket: match[1], path: decodeURIComponent(match[2]) };
  } catch {
    return null;
  }
}

/**
 * Convert an image data URL to a PPT-compatible JPEG/PNG.
 * PowerPoint often fails to render SVG/WebP.
 */
async function ensurePptCompatibleDataUrl(dataUrl: string): Promise<string | null> {
  if (!dataUrl?.startsWith('data:')) return null;

  // Already compatible
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/png')) return dataUrl;

  // Convert via canvas
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to decode image for PPT conversion'));
      img.src = dataUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || 1600;
    canvas.height = img.naturalHeight || 1200;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);

    return canvas.toDataURL('image/jpeg', 0.9);
  } catch (e) {
    console.warn('ensurePptCompatibleDataUrl failed:', e);
    return null;
  }
}

let _placeholderPptDataUrl: string | null = null;
async function getPlaceholderPptDataUrl(): Promise<string> {
  if (_placeholderPptDataUrl) return _placeholderPptDataUrl;

  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    _placeholderPptDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7W2u0AAAAASUVORK5CYII=';
    return _placeholderPptDataUrl;
  }
  ctx.fillStyle = '#F3F4F6';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#6B7280';
  ctx.font = 'bold 64px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('No Image', canvas.width / 2, canvas.height / 2);
  _placeholderPptDataUrl = canvas.toDataURL('image/png');
  return _placeholderPptDataUrl;
}

/**
 * Convert image URL to base64 with compression.
 * Handles:
 *  - data: URLs
 *  - storage paths
 *  - storage public URLs (and falls back to signed URLs when public fetch fails)
 */
async function imageToBase64(url: string): Promise<string | null> {
  try {
    if (url.startsWith('data:')) {
      return await ensurePptCompatibleDataUrl(url);
    }

    let fetchUrl = url;

    // If it's a storage path (starts with media-assets/ or similar), get a signed URL
    if (!url.startsWith('http')) {
      const { data: signedUrlData } = await supabase.storage
        .from('media-assets')
        .createSignedUrl(url, 3600);

      if (signedUrlData?.signedUrl) {
        fetchUrl = signedUrlData.signedUrl;
      }
    }

    // First try: fetch as-is
    let response = await fetch(fetchUrl, { mode: 'cors' });

    // Fallback: if it's a public object URL but not actually accessible, create a signed URL
    if (!response.ok && url.startsWith('http')) {
      const parsed = parseStorageObjectUrl(url);
      if (parsed) {
        const { data: signed } = await supabase.storage
          .from(parsed.bucket)
          .createSignedUrl(parsed.path, 3600);

        if (signed?.signedUrl) {
          response = await fetch(signed.signedUrl, { mode: 'cors' });
        }
      }
    }

    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      return null;
    }

    const blob = await response.blob();

    // Convert blob to File and compress for PPT
    const fileName = url.split('/').pop() || 'image.jpg';
    const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });

    const compressedFile = await compressImage(file, {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1280,
      quality: 0.75,
      preserveExif: false,
    });

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        reject(error);
      };
      reader.readAsDataURL(compressedFile);
    });

    return await ensurePptCompatibleDataUrl(dataUrl);
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
 * HARD FAIL validation: ensure no invalid rels XML is produced in PPTX.
 * PowerPoint repairs PPTX when relationship Target attributes contain raw '&'.
 */
async function validatePptxRelationships(pptxArrayBuffer: ArrayBuffer) {
  const zip = await JSZip.loadAsync(pptxArrayBuffer);
  const relsFiles = Object.keys(zip.files).filter((p) => p.endsWith('.rels'));
  const targetAttrRegex = /Target="([^"]*)"/g;

  for (const file of relsFiles) {
    const content = await zip.file(file)!.async('string');
    let m: RegExpExecArray | null;
    while ((m = targetAttrRegex.exec(content))) {
      const target = m[1] ?? '';
      if (target.includes('&') && !target.includes('&amp;')) {
        console.error('Invalid hyperlink XML (unescaped &):', { file, target });
        throw new Error(
          `PPT generation failed: invalid hyperlink XML (unescaped &). File: ${file}. Target: ${target}`
        );
      }
    }
  }
}
async function uploadToStorage(
  file: Blob,
  bucket: string,
  path: string,
  contentType?: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { 
        upsert: true,
        ...(contentType ? { contentType } : {}),
      });

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

    // Fetch code prefix settings (for display IDs like MNS-HYD-...)
    const { data: codeSettings } = await supabase
      .from('company_code_settings')
      .select('use_custom_asset_codes, asset_code_prefix')
      .eq('company_id', plan.company_id)
      .maybeSingle();

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
      
       const baseAssetCode = assetDetail.media_asset_code || item.asset_id;
       const displayAssetCode = (codeSettings?.use_custom_asset_codes && codeSettings?.asset_code_prefix)
         ? `${codeSettings.asset_code_prefix}-${baseAssetCode}`
         : baseAssetCode;

       imageSlide.addText(displayAssetCode, {
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

      // Get QR code data for this asset
      const qrData = await getCachedQRData(
        item.asset_id,
        assetDetail.qr_code_url || '',
        assetDetail.latitude,
        assetDetail.longitude
      );

      // Display 2 high-quality images with subtle shadow
      const imagesToShow = allImages.slice(0, 2);
      const img1Width = imagesToShow.length === 1 ? 9.3 : 4.55;
      const img1X = 0.35;
      const img1Y = 1;
      const imgHeight = 5.3;

      if (imagesToShow.length > 0) {
        try {
          const img1Base64 = await imageToBase64(imagesToShow[0]);
          const img1Final = img1Base64 || (await getPlaceholderPptDataUrl());
          imageSlide.addImage({
            data: img1Final,
            x: img1X,
            y: img1Y,
            w: img1Width,
            h: imgHeight,
            sizing: { type: "cover", w: img1Width, h: imgHeight }
          });

          // Add clickable QR code watermark on image 1 (bottom-right corner)
          // CRITICAL: sanitize hyperlink to avoid invalid XML in slide rels
          const safeStreetViewUrl1 = sanitizePptHyperlink(qrData?.streetViewUrl);
          if (qrData?.qrBase64 && safeStreetViewUrl1) {
            const qrSize = 0.7;
            const qrPadding = 0.12;
            imageSlide.addImage({
              data: qrData.qrBase64,
              x: img1X + img1Width - qrSize - qrPadding,
              y: img1Y + imgHeight - qrSize - qrPadding,
              w: qrSize,
              h: qrSize,
              hyperlink: { url: safeStreetViewUrl1 },
            });
          }
        } catch (err) {
          console.warn("Failed to add first image:", err);
        }
      } else {
        // No images at all for this asset
        const placeholder = await getPlaceholderPptDataUrl();
        imageSlide.addImage({
          data: placeholder,
          x: img1X,
          y: img1Y,
          w: 9.3,
          h: imgHeight,
          sizing: { type: "cover", w: 9.3, h: imgHeight }
        });
      }

      const img2X = 5.1;
      const img2Width = 4.55;

      if (imagesToShow.length > 1) {
        try {
          const img2Base64 = await imageToBase64(imagesToShow[1]);
          const img2Final = img2Base64 || (await getPlaceholderPptDataUrl());
          imageSlide.addImage({
            data: img2Final,
            x: img2X,
            y: img1Y,
            w: img2Width,
            h: imgHeight,
            sizing: { type: "cover", w: img2Width, h: imgHeight }
          });

          // Add clickable QR code watermark on image 2 (bottom-right corner)
          // CRITICAL: sanitize hyperlink to avoid invalid XML in slide rels
          const safeStreetViewUrl2 = sanitizePptHyperlink(qrData?.streetViewUrl);
          if (qrData?.qrBase64 && safeStreetViewUrl2) {
            const qrSize = 0.7;
            const qrPadding = 0.12;
            imageSlide.addImage({
              data: qrData.qrBase64,
              x: img2X + img2Width - qrSize - qrPadding,
              y: img1Y + imgHeight - qrSize - qrPadding,
              w: qrSize,
              h: qrSize,
              hyperlink: { url: safeStreetViewUrl2 },
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
      
       detailSlide.addText(displayAssetCode, {
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
      const detailImgX = 5.25;
      const detailImgY = 1.05;
      const detailImgW = 4.4;
      const detailImgH = 5.25;
      
      if (imagesToShow.length > 0) {
        try {
          const imgBase64 = await imageToBase64(imagesToShow[0]);
          if (imgBase64) {
            detailSlide.addImage({
              data: imgBase64,
              x: detailImgX,
              y: detailImgY,
              w: detailImgW,
              h: detailImgH,
              sizing: { type: "cover", w: detailImgW, h: detailImgH }
            });

            // Add clickable QR code watermark on detail image (bottom-right corner)
            // CRITICAL: sanitize hyperlink to avoid invalid XML in slide rels
            const safeStreetViewUrl3 = sanitizePptHyperlink(qrData?.streetViewUrl);
            if (qrData?.qrBase64 && safeStreetViewUrl3) {
              const qrSize = 0.7;
              const qrPadding = 0.12;
              detailSlide.addImage({
                data: qrData.qrBase64,
                x: detailImgX + detailImgW - qrSize - qrPadding,
                y: detailImgY + detailImgH - qrSize - qrPadding,
                w: qrSize,
                h: qrSize,
                hyperlink: { url: safeStreetViewUrl3 },
              });
            }
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
        const safePublicUrl = sanitizePptHyperlink(publicUrl);

        termsSlide.addText("View Interactive Map & Asset Details:", {
          x: 0.5,
          y: 6.5,
          w: 9,
          h: 0.4,
          fontSize: 12,
          color: "1e40af",
          bold: true,
          fontFace: PPT_SAFE_FONTS.primary,
        });

        if (safePublicUrl) {
          termsSlide.addText(publicUrl, {
            x: 0.5,
            y: 6.9,
            w: 9,
            h: 0.4,
            fontSize: 10,
            color: "0066cc",
            hyperlink: { url: safePublicUrl },
            fontFace: PPT_SAFE_FONTS.primary,
          });
        } else {
          termsSlide.addText(publicUrl, {
            x: 0.5,
            y: 6.9,
            w: 9,
            h: 0.4,
            fontSize: 10,
            color: "0066cc",
            fontFace: PPT_SAFE_FONTS.primary,
          });
        }
      }
    }

    // Save file
    // IMPORTANT: always validate and download from an ArrayBuffer to avoid corrupt PPTX output
    const fileName = `plan_${plan.id}_${Date.now()}.pptx`;
    const arrayBuffer = await pptx.write({ outputType: 'arraybuffer' }) as ArrayBuffer;
    await validatePptxRelationships(arrayBuffer);

    const blob = new Blob([arrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    });

    if (uploadToCloud) {
      const storagePath = `exports/plans/${plan.id}/${fileName}`;

      const publicUrl = await uploadToStorage(
        blob,
        'client-documents',
        storagePath,
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      );
      if (publicUrl) {
        await updatePlanExportLinks(plan.id, { ppt_url: publicUrl });
      }

      // Download locally too
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${plan.id}_presentation.pptx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      return publicUrl;
    }

    // download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${plan.id}_presentation.pptx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    return true;
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
    const assetData = planItems.map(item => {
      const baseCode = (item as any).display_asset_id || (item as any).media_asset_code || item.asset_id;

      return {
        "Asset ID": formatAssetDisplayCode({
          mediaAssetCode: baseCode,
          fallbackId: item.asset_id,
          companyName: companyData?.name || null,
        }),
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
      };
    });
    const assetsSheet = XLSX.utils.json_to_sheet(assetData);
    XLSX.utils.book_append_sheet(workbook, assetsSheet, "Assets");

    // Save file
    if (uploadToCloud) {
      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const fileName = `plan_${plan.id}_${Date.now()}.xlsx`;
      const storagePath = `exports/plans/${plan.id}/${fileName}`;
      
      const publicUrl = await uploadToStorage(
        blob,
        'client-documents',
        storagePath,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
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

    const fetchAsDataUrl = async (url: string): Promise<string | undefined> => {
      try {
        if (!url) return undefined;
        if (url.startsWith('data:')) return url;
        const res = await fetch(url, { mode: 'cors' });
        if (!res.ok) return undefined;
        const blob = await res.blob();
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch {
        return undefined;
      }
    };

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

    // Helper for duration display
    const getDurationDisplay = (d: number): string => {
      if (d <= 0) return '-';
      if (d >= 28 && d <= 31) return '1 Month';
      if (d > 31) {
        const months = Math.round(d / 30);
        return `${months} Month${months > 1 ? 's' : ''}`;
      }
      return `${d} Days`;
    };

    // Format date helper
    const formatDateToDDMMYYYY = (dateString: string): string => {
      if (!dateString) return '-';
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      } catch {
        return '-';
      }
    };

    // Build line items with new 098-style structure
    const items = (planItems || []).map((item: any, index: number) => {
      const monthlyRate = item.sales_price || item.card_rate || 0;
      const subtotal = monthlyRate - (item.discount_amount || 0);

      // Build location code from asset_id or location
      const locationCode = item.asset_id 
        ? `[${item.asset_id}] ${item.location || ''}`.trim()
        : item.location || 'Display';

      return {
        sno: index + 1,
        locationCode: locationCode.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim(),
        area: item.area || item.city || '-',
        mediaType: item.media_type || 'OOH Media',
        route: item.direction || '-',
        illumination: item.illumination_type || 'NonLit',
        dimension: (item.dimensions || '-').toString().replace(/\s+/g, ' ').trim(),
        totalSqft: item.total_sqft || 0,
        fromDate: formatDateToDDMMYYYY(plan.start_date),
        toDate: formatDateToDDMMYYYY(plan.end_date),
        duration: getDurationDisplay(days),
        unitPrice: monthlyRate,
        subtotal,
      };
    });

    // Totals (keep existing plan totals)
    const untaxedAmount = Number(plan.total_amount || 0);
    const gstTotal = Number(plan.gst_amount || 0);
    const cgst = Math.round(gstTotal / 2);
    const sgst = gstTotal - cgst;
    const totalInr = Number(plan.grand_total || 0);

    const docTitle =
      docType === 'work_order'
        ? 'WORK ORDER'
        : docType === 'estimate'
          ? 'ESTIMATE'
          : docType === 'proforma_invoice'
            ? 'PROFORMA INVOICE'
            : 'QUOTATION';

    // Logo: support both data URLs and normal URLs (convert to base64)
    const logoBase64 = typeof companyData?.logo_url === 'string'
      ? await fetchAsDataUrl(companyData.logo_url)
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
      untaxedAmount,
      cgst,
      sgst,
      totalInr,
      terms: termsAndConditions,
    });

    if (uploadToCloud) {
      const fileName = `plan_${plan.id}_${docType}_${Date.now()}.pdf`;
      const storagePath = `exports/plans/${plan.id}/${fileName}`;

      const publicUrl = await uploadToStorage(pdfBlob, 'client-documents', storagePath, 'application/pdf');
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

/**
 * Export plan images to PDF - Similar layout to PPT but in PDF format
 * Each asset gets a page with its images arranged in a grid
 */
export async function exportPlanImagesToPDF(
  plan: any,
  planItems: any[],
  options: { uploadToCloud?: boolean } = {}
): Promise<string | boolean> {
  const { uploadToCloud = false } = options;

  try {
    // Helper to fetch image as data URL
    const fetchAsDataUrl = async (url: string): Promise<string | undefined> => {
      try {
        if (!url) return undefined;
        if (url.startsWith('data:')) return url;
        const res = await fetch(url, { mode: 'cors' });
        if (!res.ok) return undefined;
        const blob = await res.blob();
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch {
        return undefined;
      }
    };

    const assetIds = planItems.map(item => item.asset_id).filter(Boolean);
    const assetDetailsMap = await fetchAssetDetails(assetIds);

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const contentWidth = pageWidth - 2 * margin;

    // Cover page
    pdf.setFillColor(30, 64, 175); // Deep blue
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(28);
    pdf.text(plan.plan_name || 'Media Plan', pageWidth / 2, 60, { align: 'center' });
    
    pdf.setFontSize(16);
    pdf.text(`Client: ${plan.client_name || 'N/A'}`, pageWidth / 2, 85, { align: 'center' });
    
    pdf.setFontSize(12);
    const dateRange = `${plan.start_date || ''} to ${plan.end_date || ''}`;
    pdf.text(dateRange, pageWidth / 2, 100, { align: 'center' });
    
    pdf.setFontSize(10);
    pdf.text(`Plan ID: ${plan.id}`, pageWidth / 2, 115, { align: 'center' });
    pdf.text(`Total Assets: ${planItems.length}`, pageWidth / 2, 125, { align: 'center' });

    // Process each asset
    for (let i = 0; i < planItems.length; i++) {
      const item = planItems[i];
      const assetDetails = assetDetailsMap.get(item.asset_id);
      
      pdf.addPage('landscape');
      
      // Header bar
      pdf.setFillColor(30, 64, 175);
      pdf.rect(0, 0, pageWidth, 25, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(14);
      const assetCode = assetDetails?.media_asset_code || item.asset_id || `Asset ${i + 1}`;
      pdf.text(assetCode, margin, 16);
      
      pdf.setFontSize(10);
      pdf.text(`${i + 1} of ${planItems.length}`, pageWidth - margin, 16, { align: 'right' });
      
      // Reset text color
      pdf.setTextColor(0, 0, 0);
      
      // Asset info section
      const infoY = 35;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Location:', margin, infoY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(item.location || assetDetails?.location || 'N/A', margin + 25, infoY);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Area:', margin + 120, infoY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(item.area || assetDetails?.area || 'N/A', margin + 135, infoY);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('City:', margin + 180, infoY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(item.city || assetDetails?.city || 'N/A', margin + 195, infoY);
      
      const infoY2 = infoY + 8;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Type:', margin, infoY2);
      pdf.setFont('helvetica', 'normal');
      pdf.text(item.media_type || assetDetails?.media_type || 'N/A', margin + 25, infoY2);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Dimensions:', margin + 120, infoY2);
      pdf.setFont('helvetica', 'normal');
      pdf.text(item.dimensions || assetDetails?.dimensions || 'N/A', margin + 150, infoY2);
      
      // Get images for this asset
      const imageUrls = await getAssetImageUrls(item.asset_id);
      
      // Image grid area
      const imagesStartY = 55;
      const availableHeight = pageHeight - imagesStartY - 15;
      const availableWidth = contentWidth;
      
      if (imageUrls.length === 0) {
        // No images placeholder
        pdf.setFillColor(240, 240, 240);
        pdf.rect(margin, imagesStartY, availableWidth, availableHeight, 'F');
        pdf.setTextColor(128, 128, 128);
        pdf.setFontSize(14);
        pdf.text('No images available', pageWidth / 2, imagesStartY + availableHeight / 2, { align: 'center' });
        pdf.setTextColor(0, 0, 0);
      } else {
        // Calculate grid layout - max 4 images per page (2x2)
        const maxImages = Math.min(imageUrls.length, 4);
        const cols = maxImages <= 2 ? maxImages : 2;
        const rows = Math.ceil(maxImages / cols);
        
        const imgWidth = (availableWidth - (cols - 1) * 5) / cols;
        const imgHeight = (availableHeight - (rows - 1) * 5) / rows;
        
        for (let j = 0; j < maxImages; j++) {
          const col = j % cols;
          const row = Math.floor(j / cols);
          const x = margin + col * (imgWidth + 5);
          const y = imagesStartY + row * (imgHeight + 5);
          
          try {
            const dataUrl = await fetchAsDataUrl(imageUrls[j]);
            if (dataUrl) {
              pdf.addImage(dataUrl, 'JPEG', x, y, imgWidth, imgHeight);
            } else {
              // Placeholder for failed image
              pdf.setFillColor(220, 220, 220);
              pdf.rect(x, y, imgWidth, imgHeight, 'F');
              pdf.setTextColor(100, 100, 100);
              pdf.setFontSize(10);
              pdf.text('Image unavailable', x + imgWidth / 2, y + imgHeight / 2, { align: 'center' });
              pdf.setTextColor(0, 0, 0);
            }
          } catch (err) {
            console.error(`Failed to add image ${j} for asset ${item.asset_id}:`, err);
            pdf.setFillColor(220, 220, 220);
            pdf.rect(x, y, imgWidth, imgHeight, 'F');
          }
        }
      }
      
      // Footer
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, margin, pageHeight - 5);
      pdf.text(plan.id, pageWidth - margin, pageHeight - 5, { align: 'right' });
      pdf.setTextColor(0, 0, 0);
    }

    const pdfBlob = pdf.output('blob');

    if (uploadToCloud) {
      const fileName = `plan_${plan.id}_images_${Date.now()}.pdf`;
      const storagePath = `exports/plans/${plan.id}/${fileName}`;
      const publicUrl = await uploadToStorage(pdfBlob, 'client-documents', storagePath, 'application/pdf');
      return publicUrl || false;
    }

    // Download
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${plan.id}_images.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('Plan images PDF export error:', error);
    throw error;
  }
}
