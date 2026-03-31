import pptxgen from 'pptxgenjs';
import { format } from 'date-fns';
import { fetchImageAsBase64 } from '../qrWatermark';
import { supabase } from '@/integrations/supabase/client';
import { 
  sanitizePptText, 
  PPT_SAFE_FONTS 
} from '../ppt/sanitizers';

interface PlanAsset {
  asset_id: string;
  db_asset_id?: string;
  area: string;
  city?: string;
  location: string;
  direction?: string;
  dimensions?: string;
  total_sqft?: number;
  illumination_type?: string;
  card_rate: number;
  media_type: string;
  latitude?: number;
  longitude?: number;
  primary_photo_url?: string;
}

interface PlanData {
  id: string;
  plan_name: string;
  client_name: string;
  start_date: string;
  end_date: string;
  assets: PlanAsset[];
}

interface OrganizationSettings {
  organization_name?: string;
  logo_url?: string;
  primary_color?: string;
}

// Placeholder image for PPT
let _placeholderPngDataUrl: string | null = null;
async function getPlaceholderPngDataUrl(): Promise<string> {
  if (_placeholderPngDataUrl) return _placeholderPngDataUrl;
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 900;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    _placeholderPngDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7W2u0AAAAASUVORK5CYII=';
    return _placeholderPngDataUrl;
  }
  ctx.fillStyle = '#F3F4F6';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#6B7280';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('No Image', canvas.width / 2, canvas.height / 2);
  _placeholderPngDataUrl = canvas.toDataURL('image/jpeg', 0.7);
  return _placeholderPngDataUrl;
}

const imageCache = new Map<string, string>();

async function toFetchableUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;
  if (!url.startsWith('http')) {
    const { data } = await supabase.storage.from('media-assets').createSignedUrl(url, 3600);
    return data?.signedUrl || url;
  }
  return url;
}

/**
 * Convert image to PPT-compatible JPEG, fitting within maxW×maxH.
 * Returns { dataUrl, naturalWidth, naturalHeight } for proper aspect ratio placement.
 */
async function convertToPptImage(dataUrl: string, maxW = 1200, maxH = 900): Promise<{ data: string; w: number; h: number } | null> {
  if (!dataUrl?.startsWith('data:')) return null;
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('decode failed'));
      img.src = dataUrl;
    });

    let w = img.naturalWidth || 800;
    let h = img.naturalHeight || 600;
    if (w > maxW || h > maxH) {
      const scale = Math.min(maxW / w, maxH / h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    return { data: canvas.toDataURL('image/jpeg', 0.72), w, h };
  } catch {
    return null;
  }
}

async function fetchImageAsBase64Smart(url: string): Promise<string | null> {
  try {
    const directUrl = await toFetchableUrl(url);
    const base = await fetchImageAsBase64(directUrl);
    const result = await convertToPptImage(base);
    return result?.data || null;
  } catch {
    try {
      // Try signed URL fallback for storage URLs
      const match = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/);
      if (!match) return null;
      const { data } = await supabase.storage.from(match[1]).createSignedUrl(decodeURIComponent(match[2]), 3600);
      if (!data?.signedUrl) return null;
      const base = await fetchImageAsBase64(data.signedUrl);
      const result = await convertToPptImage(base);
      return result?.data || null;
    } catch {
      return null;
    }
  }
}

async function fetchImageWithCache(url: string): Promise<string | null> {
  if (!url) return null;
  if (imageCache.has(url)) return imageCache.get(url)!;
  const base64 = await fetchImageAsBase64Smart(url);
  if (base64) imageCache.set(url, base64);
  return base64;
}

/**
 * Fetch up to 2 distinct photos for an asset in Plan PPT.
 * When includeQR=false, only clean library/primary photos are used.
 */
async function fetchAssetPhotosPlan(asset: PlanAsset, includeQR: boolean = true): Promise<(string | null)[]> {
  const dbId = asset.db_asset_id;
  const results: string[] = [];

   // 1) Campaign proof photos (latest first) only when QR-enabled export is requested
   if (includeQR && dbId) {
    try {
      const { data: campAssets } = await supabase
        .from("campaign_assets")
        .select("photos")
        .eq("asset_id", dbId)
        .not("photos", "is", null)
        .order("created_at", { ascending: false })
        .limit(3);
      if (campAssets) {
        for (const ca of campAssets) {
          if (results.length >= 2) break;
          if (ca.photos && typeof ca.photos === "object") {
            const p = ca.photos as Record<string, string>;
            const urls = Object.values(p).filter((v): v is string => typeof v === "string" && v.length > 0);
            for (const url of urls) {
              if (results.length >= 2) break;
              let img = await fetchImageWithCache(url);
               if (img) results.push(img);
            }
          }
        }
      }
    } catch {}
  }

  // 2) Latest media_photos library uploads
  if (results.length < 2 && dbId) {
    try {
      const { data: libPhotos } = await supabase
        .from("media_photos")
        .select("photo_url")
        .eq("asset_id", dbId)
        .order("uploaded_at", { ascending: false })
        .limit(4);
      if (libPhotos) {
        for (const p of libPhotos) {
          if (results.length >= 2) break;
          if (p.photo_url) {
            let img = await fetchImageWithCache(p.photo_url);
             if (img) results.push(img);
          }
        }
      }
    } catch {}
  }

  // 3) Fallback: primary_photo_url
  if (results.length < 2 && asset.primary_photo_url) {
    let img = await fetchImageWithCache(asset.primary_photo_url);
    if (img && !results.includes(img)) {
      results.push(img);
    }
  }

  return results;
}

export interface PlanPPTExportOptions {
  includeQR?: boolean;
}

/**
 * Calculate image placement to fit within a box while maintaining aspect ratio.
 * Centers the image within the box.
 */
function fitImageInBox(
  imgW: number, imgH: number,
  boxX: number, boxY: number, boxW: number, boxH: number
): { x: number; y: number; w: number; h: number } {
  const imgRatio = imgW / imgH;
  const boxRatio = boxW / boxH;
  let w: number, h: number;
  if (imgRatio > boxRatio) {
    w = boxW;
    h = boxW / imgRatio;
  } else {
    h = boxH;
    w = boxH * imgRatio;
  }
  return {
    x: boxX + (boxW - w) / 2,
    y: boxY + (boxH - h) / 2,
    w,
    h,
  };
}

/**
 * Get image dimensions from a data URL
 */
async function getImageDimensions(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth || 800, h: img.naturalHeight || 600 });
    img.onerror = () => resolve({ w: 800, h: 600 });
    img.src = dataUrl;
  });
}

export async function generatePlanPPT(
  plan: PlanData,
  orgSettings: OrganizationSettings,
  exportOptions?: PlanPPTExportOptions
): Promise<Blob> {
  const includeQR = exportOptions?.includeQR ?? false;
  imageCache.clear();
  const prs = new pptxgen();

  prs.author = orgSettings.organization_name || 'Go-Ads 360°';
  prs.company = orgSettings.organization_name || 'Go-Ads 360°';
  prs.title = sanitizePptText(`${plan.plan_name} - Media Proposal`);
  prs.subject = sanitizePptText(`Media Plan Proposal for ${plan.client_name}`);

  const primaryColor = orgSettings.primary_color || '1E3A8A';
  const brandColor = primaryColor.replace('#', '');

  // ===== COVER SLIDE =====
  const coverSlide = prs.addSlide();
  coverSlide.background = { color: brandColor };

  coverSlide.addShape(prs.ShapeType.rect, {
    x: 0, y: 0, w: 10, h: 0.8,
    fill: { color: 'FFFFFF', transparency: 90 },
  });

  coverSlide.addText(sanitizePptText('MEDIA ASSET PROPOSAL'), {
    x: 0.3, y: 0.2, w: 9.4, h: 0.5,
    fontSize: 16, bold: true, color: 'FFFFFF', align: 'left',
    fontFace: PPT_SAFE_FONTS.primary,
  });

  coverSlide.addText(sanitizePptText(`${plan.assets.length} Premium OOH Media Assets`), {
    x: 0.5, y: 2.5, w: 9, h: 1.2,
    fontSize: 42, bold: true, color: 'FFFFFF', align: 'center',
    fontFace: PPT_SAFE_FONTS.primary,
  });

  coverSlide.addText(sanitizePptText(`Prepared for: ${plan.client_name}`), {
    x: 0.5, y: 4.0, w: 9, h: 0.6,
    fontSize: 22, color: 'E5E7EB', align: 'center',
    fontFace: PPT_SAFE_FONTS.primary,
  });

  coverSlide.addText(sanitizePptText(plan.plan_name), {
    x: 0.5, y: 4.8, w: 9, h: 0.5,
    fontSize: 18, color: 'FFFFFF', align: 'center',
    fontFace: PPT_SAFE_FONTS.primary,
  });

  coverSlide.addShape(prs.ShapeType.rect, {
    x: 0, y: 6.7, w: 10, h: 0.8,
    fill: { color: '000000', transparency: 50 },
  });

  coverSlide.addText(
    sanitizePptText(`${format(new Date(), 'dd MMMM yyyy')} | ${orgSettings.organization_name || 'Go-Ads 360°'}`),
    {
      x: 0.5, y: 6.85, w: 9, h: 0.5,
      fontSize: 14, color: 'FFFFFF', align: 'center',
      fontFace: PPT_SAFE_FONTS.primary,
    }
  );

  // ===== SUMMARY SLIDE =====
  const summarySlide = prs.addSlide();
  summarySlide.background = { color: 'FFFFFF' };

  summarySlide.addShape(prs.ShapeType.rect, {
    x: 0, y: 0, w: 10, h: 0.7,
    fill: { color: brandColor },
  });

  summarySlide.addText(sanitizePptText('Campaign Summary'), {
    x: 0.3, y: 0.15, w: 9.4, h: 0.5,
    fontSize: 22, bold: true, color: 'FFFFFF', align: 'left',
    fontFace: PPT_SAFE_FONTS.primary,
  });

  const summaryData = [
    [{ text: sanitizePptText('Plan ID') }, { text: sanitizePptText(plan.id) }],
    [{ text: sanitizePptText('Company') }, { text: sanitizePptText(orgSettings.organization_name || 'Go-Ads 360°') }],
    [{ text: sanitizePptText('Client') }, { text: sanitizePptText(plan.client_name) }],
    [{ text: sanitizePptText('Duration') }, { text: sanitizePptText(`${Math.ceil((new Date(plan.end_date).getTime() - new Date(plan.start_date).getTime()) / (1000 * 60 * 60 * 24))} days`) }],
    [{ text: sanitizePptText('Start Date') }, { text: sanitizePptText(format(new Date(plan.start_date), 'dd/MM/yyyy')) }],
    [{ text: sanitizePptText('End Date') }, { text: sanitizePptText(format(new Date(plan.end_date), 'dd/MM/yyyy')) }],
    [{ text: sanitizePptText('Total Assets') }, { text: sanitizePptText(`${plan.assets.length} sites`) }],
  ];

  summarySlide.addTable(summaryData, {
    x: 0.5, y: 1.2, w: 9, colW: [3, 6],
    border: { type: 'solid', color: 'E5E7EB', pt: 0.5 },
    fontFace: PPT_SAFE_FONTS.primary, fontSize: 14,
    valign: 'middle', rowH: 0.5,
    fill: { color: 'F9FAFB' },
  });

  // ===== ASSET SLIDES =====
  for (const asset of plan.assets) {
    const assetPhotos = await fetchAssetPhotosPlan(asset, includeQR);
    const placeholderUrl = await getPlaceholderPngDataUrl();
    const photo1Base64 = assetPhotos[0] || placeholderUrl;
    const photo2Base64 = assetPhotos[1] || photo1Base64;

    // Get image dimensions for proper aspect-ratio fitting (no 'sizing' property)
    const img1Dims = photo1Base64 ? await getImageDimensions(photo1Base64) : { w: 800, h: 600 };
    const img2Dims = photo2Base64 ? await getImageDimensions(photo2Base64) : { w: 800, h: 600 };

    // ===== SLIDE 1: TWO-IMAGE PRESENTATION SLIDE =====
    const slide1 = prs.addSlide();

    // Border frame
    slide1.addShape(prs.ShapeType.rect, {
      x: 0.15, y: 0.15, w: 9.7, h: 7.2,
      fill: { color: 'FFFFFF' },
      line: { color: brandColor, width: 6 },
    });

    // Asset ID header
    slide1.addText(sanitizePptText(asset.asset_id), {
      x: 0.3, y: 0.4, w: 9.4, h: 0.4,
      fontSize: 14, bold: true, color: '6B7280', align: 'left',
      fontFace: PPT_SAFE_FONTS.primary,
    });

    // Location header
    slide1.addText(sanitizePptText(`${asset.area} - ${asset.location}`), {
      x: 0.3, y: 0.75, w: 9.4, h: 0.5,
      fontSize: 24, bold: true, color: brandColor, align: 'left',
      fontFace: PPT_SAFE_FONTS.primary,
    });

    // Image boxes - gray background placeholders
    const imgBoxW = 4.3;
    const imgBoxH = 3.4;

    slide1.addShape(prs.ShapeType.rect, {
      x: 0.4, y: 1.5, w: imgBoxW, h: imgBoxH,
      fill: { color: 'F3F4F6' },
      line: { color: 'E5E7EB', width: 1 },
    });

    slide1.addShape(prs.ShapeType.rect, {
      x: 5.0, y: 1.5, w: imgBoxW, h: imgBoxH,
      fill: { color: 'F3F4F6' },
      line: { color: 'E5E7EB', width: 1 },
    });

    // Image 1 - fitted without using 'sizing' property
    if (photo1Base64) {
      try {
        const fit1 = fitImageInBox(img1Dims.w, img1Dims.h, 0.4, 1.5, imgBoxW, imgBoxH);
        slide1.addImage({ data: photo1Base64, x: fit1.x, y: fit1.y, w: fit1.w, h: fit1.h });
      } catch (e) {
        console.error('Failed to add image 1:', e);
      }
    }

    // Image 2 - fitted without using 'sizing' property
    if (photo2Base64) {
      try {
        const fit2 = fitImageInBox(img2Dims.w, img2Dims.h, 5.0, 1.5, imgBoxW, imgBoxH);
        slide1.addImage({ data: photo2Base64, x: fit2.x, y: fit2.y, w: fit2.w, h: fit2.h });
      } catch (e) {
        console.error('Failed to add image 2:', e);
      }
    }

    // Details info below images
    const infoY = 5.2;
    slide1.addText(sanitizePptText(`Direction: ${asset.direction || 'N/A'}`), {
      x: 0.4, y: infoY, w: 4.3, h: 0.35,
      fontSize: 11, color: '374151', fontFace: PPT_SAFE_FONTS.primary,
    });
    slide1.addText(sanitizePptText(`Media Type: ${asset.media_type || 'N/A'}`), {
      x: 5.0, y: infoY, w: 4.3, h: 0.35,
      fontSize: 11, color: '374151', fontFace: PPT_SAFE_FONTS.primary,
    });
    slide1.addText(sanitizePptText(`Dimensions: ${asset.dimensions || 'N/A'} | Sqft: ${asset.total_sqft || 'N/A'} | ${asset.illumination_type || 'Non-lit'}`), {
      x: 0.4, y: infoY + 0.35, w: 9, h: 0.35,
      fontSize: 11, color: '6B7280', fontFace: PPT_SAFE_FONTS.primary,
    });

    // Footer bar
    slide1.addShape(prs.ShapeType.rect, {
      x: 0.15, y: 6.85, w: 9.7, h: 0.5,
      fill: { color: brandColor },
    });

    slide1.addText(sanitizePptText(`${plan.plan_name} | ${plan.client_name} | ${orgSettings.organization_name || 'Go-Ads 360°'}`), {
      x: 0.3, y: 6.95, w: 9.4, h: 0.35,
      fontSize: 12, color: 'FFFFFF', align: 'center',
      fontFace: PPT_SAFE_FONTS.primary,
    });

    // ===== SLIDE 2: DETAILS SLIDE =====
    const slide2 = prs.addSlide();

    slide2.addShape(prs.ShapeType.rect, {
      x: 0.15, y: 0.15, w: 9.7, h: 7.2,
      fill: { color: 'FFFFFF' },
      line: { color: brandColor, width: 6 },
    });

    slide2.addText(sanitizePptText('Asset Specifications'), {
      x: 0.3, y: 0.4, w: 9.4, h: 0.5,
      fontSize: 22, bold: true, color: '6B7280', align: 'left',
      fontFace: PPT_SAFE_FONTS.primary,
    });

    slide2.addText(sanitizePptText(asset.asset_id), {
      x: 0.3, y: 0.85, w: 9.4, h: 0.5,
      fontSize: 26, bold: true, color: brandColor, align: 'left',
      fontFace: PPT_SAFE_FONTS.primary,
    });

    // Small thumbnail - fitted without 'sizing'
    if (photo1Base64) {
      try {
        const fitThumb = fitImageInBox(img1Dims.w, img1Dims.h, 0.4, 1.6, 2.5, 2.5);
        slide2.addImage({ data: photo1Base64, x: fitThumb.x, y: fitThumb.y, w: fitThumb.w, h: fitThumb.h });
      } catch (e) {
        console.error('Failed to add thumbnail:', e);
      }
    }

    // Parse dimensions
    let width = '';
    let height = '';
    if (asset.dimensions) {
      const match = asset.dimensions.match(/(\d+\.?\d*)\s*[xX×]\s*(\d+\.?\d*)/);
      if (match) {
        width = match[1];
        height = match[2];
      }
    }

    const detailsTableData = [
      [{ text: sanitizePptText('City'), options: { bold: true } }, { text: sanitizePptText(asset.city || 'N/A') }],
      [{ text: sanitizePptText('Area'), options: { bold: true } }, { text: sanitizePptText(asset.area) }],
      [{ text: sanitizePptText('Location'), options: { bold: true } }, { text: sanitizePptText(asset.location) }],
      [{ text: sanitizePptText('Direction'), options: { bold: true } }, { text: sanitizePptText(asset.direction || 'N/A') }],
      [{ text: sanitizePptText('Dimensions'), options: { bold: true } }, { text: sanitizePptText(width && height ? `${width}X${height}` : asset.dimensions || 'N/A') }],
      [{ text: sanitizePptText('Total Sqft'), options: { bold: true } }, { text: sanitizePptText(asset.total_sqft?.toString() || 'N/A') }],
      [{ text: sanitizePptText('Illumination'), options: { bold: true } }, { text: sanitizePptText(asset.illumination_type || 'Non-lit') }],
    ];

    slide2.addTable(detailsTableData, {
      x: 3.2, y: 1.6, w: 6.3, colW: [2, 4.3],
      border: { type: 'solid', color: 'E5E7EB', pt: 0.5 },
      fontFace: PPT_SAFE_FONTS.primary, fontSize: 12,
      valign: 'middle', rowH: 0.4,
      fill: { color: 'FFFFFF' },
    });

    slide2.addText(sanitizePptText(`Campaign: ${format(new Date(plan.start_date), 'dd MMM yyyy')} - ${format(new Date(plan.end_date), 'dd MMM yyyy')}`), {
      x: 3.2, y: 4.6, w: 6.3, h: 0.35,
      fontSize: 12, color: '6B7280',
      fontFace: PPT_SAFE_FONTS.primary,
    });

    // GPS Coordinates
    if (asset.latitude && asset.longitude) {
      slide2.addText(sanitizePptText(`GPS: ${asset.latitude.toFixed(6)}, ${asset.longitude.toFixed(6)}`), {
        x: 0.4, y: 4.2, w: 2.5, h: 0.3,
        fontSize: 9, color: '6B7280', align: 'center',
        fontFace: PPT_SAFE_FONTS.primary,
      });
    }

    // Footer
    slide2.addShape(prs.ShapeType.rect, {
      x: 0.15, y: 6.85, w: 9.7, h: 0.5,
      fill: { color: '6B7280' },
    });

    slide2.addText(sanitizePptText(`${orgSettings.organization_name || 'Go-Ads 360°'} Proposal - Confidential`), {
      x: 0.3, y: 6.95, w: 9.4, h: 0.35,
      fontSize: 12, color: 'FFFFFF', align: 'center',
      fontFace: PPT_SAFE_FONTS.primary,
    });
  }

  const pptBlob = await prs.write({ outputType: 'blob' });
  return pptBlob as Blob;
}
