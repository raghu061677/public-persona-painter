import pptxgen from 'pptxgenjs';
import { format } from 'date-fns';
import { buildStreetViewUrl } from '../streetview';
import { fetchImageAsBase64 } from '../qrWatermark';
import { supabase } from '@/integrations/supabase/client';
import { 
  sanitizePptHyperlink, 
  sanitizePptText, 
  PPT_SAFE_FONTS 
} from '../ppt/sanitizers';

function validateAndFixStreetViewUrl(
  url: string | undefined,
  latitude: number | undefined,
  longitude: number | undefined
): string | null {
  if (url && typeof url === 'string') {
    try {
      const u = new URL(url);
      if (u.protocol === 'http:' || u.protocol === 'https:') return url;
    } catch {
      // fall through
    }
  }
  if (latitude && longitude) return buildStreetViewUrl(latitude, longitude);
  return null;
}

interface PlanAsset {
  asset_id: string;
  db_asset_id?: string; // The actual DB id (e.g. HYD-BQS-0105) for querying photos
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
  google_street_view_url?: string;
  qr_code_url?: string;
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

// NOTE: QR codes are already watermarked onto asset photos during the upload process.
// We no longer add separate QR elements to avoid duplicates.

// Placeholder image for PPT (must be PNG/JPEG; SVG may not render in PowerPoint)
let _placeholderPngDataUrl: string | null = null;
async function getPlaceholderPngDataUrl(): Promise<string> {
  if (_placeholderPngDataUrl) return _placeholderPngDataUrl;

  // Create a simple 1600x1200 PNG placeholder using canvas
  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    // Fallback: tiny transparent PNG
    _placeholderPngDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7W2u0AAAAASUVORK5CYII=';
    return _placeholderPngDataUrl;
  }

  ctx.fillStyle = '#F3F4F6';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#6B7280';
  ctx.font = 'bold 64px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('No Image', canvas.width / 2, canvas.height / 2);

  _placeholderPngDataUrl = canvas.toDataURL('image/png');
  return _placeholderPngDataUrl;
}

// Cache for fetched images to avoid re-fetching
const imageCache = new Map<string, string>();

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

async function toFetchableUrl(url: string): Promise<string> {
  // If it's already a data URL, we can use it as-is.
  if (url.startsWith('data:')) return url;

  // If it isn't an http(s) URL, treat it as a storage object path in the media-assets bucket.
  if (!url.startsWith('http')) {
    const { data } = await supabase.storage.from('media-assets').createSignedUrl(url, 3600);
    return data?.signedUrl || url;
  }

  return url;
}

/**
 * Resize and convert any image data URL to a PPT-compatible JPEG.
 * Caps dimensions at maxW×maxH to prevent bloated files and corruption.
 */
async function ensurePptCompatibleDataUrl(dataUrl: string, maxW = 1200, maxH = 900): Promise<string | null> {
  if (!dataUrl?.startsWith('data:')) return null;

  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to decode image for PPT conversion'));
      img.src = dataUrl;
    });

    let w = img.naturalWidth || 1600;
    let h = img.naturalHeight || 1200;

    // Down-scale if larger than max dimensions
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
    return canvas.toDataURL('image/jpeg', 0.75);
  } catch {
    return null;
  }
}

async function fetchImageAsBase64Smart(url: string): Promise<string | null> {
  try {
    // First try: fetch directly (works for public URLs)
    const directUrl = await toFetchableUrl(url);
    const base = await fetchImageAsBase64(directUrl);
    return await ensurePptCompatibleDataUrl(base);
  } catch {
    // Fallback: if it's a storage public URL, try a signed URL
    try {
      const parsed = parseStorageObjectUrl(url);
      if (!parsed) return null;
      const { data } = await supabase.storage.from(parsed.bucket).createSignedUrl(parsed.path, 3600);
      if (!data?.signedUrl) return null;
      const base = await fetchImageAsBase64(data.signedUrl);
      return await ensurePptCompatibleDataUrl(base);
    } catch (error) {
      console.warn('Failed to fetch image via signed URL fallback:', error);
      return null;
    }
  }
}

async function fetchImageWithCache(url: string): Promise<string | null> {
  if (!url) return null;

  if (imageCache.has(url)) {
    return imageCache.get(url)!;
  }

  const base64 = await fetchImageAsBase64Smart(url);
  if (base64) imageCache.set(url, base64);
  return base64;
}

/**
 * Remove QR watermark from top-right corner of an image.
 * The watermark is a white rounded card ~120x120px in the top-right corner.
 * We use content-aware fill by sampling the surrounding area.
 */
async function removeQRWatermark(dataUrl: string): Promise<string> {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject();
      img.src = dataUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;

    ctx.drawImage(img, 0, 0);

    // QR watermark is typically in top-right corner, ~15% of image width
    const qrSize = Math.min(canvas.width, canvas.height) * 0.15;
    const margin = qrSize * 0.1;
    const x = canvas.width - qrSize - margin;
    const y = margin;

    // Sample color from area just below the QR region for fill
    const sampleY = y + qrSize + 5;
    const sampleData = ctx.getImageData(x + qrSize / 2, Math.min(sampleY, canvas.height - 1), 1, 1).data;
    
    // Also sample from left of QR region
    const sampleX = x - 5;
    const sampleData2 = ctx.getImageData(Math.max(sampleX, 0), y + qrSize / 2, 1, 1).data;

    // Use a gradient fill from the surrounding colors
    const gradient = ctx.createLinearGradient(x, y, x + qrSize, y + qrSize);
    gradient.addColorStop(0, `rgb(${sampleData2[0]},${sampleData2[1]},${sampleData2[2]})`);
    gradient.addColorStop(1, `rgb(${sampleData[0]},${sampleData[1]},${sampleData[2]})`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(x - 2, y, qrSize + margin + 2, qrSize + 2);

    // Also handle bottom-left logo watermark if present
    const logoSize = qrSize * 0.8;
    const logoX = margin;
    const logoY = canvas.height - logoSize - margin;
    const sampleLogoRight = ctx.getImageData(
      Math.min(logoX + logoSize + 5, canvas.width - 1),
      logoY + logoSize / 2,
      1, 1
    ).data;
    const sampleLogoAbove = ctx.getImageData(
      logoX + logoSize / 2,
      Math.max(logoY - 5, 0),
      1, 1
    ).data;
    const gradientLogo = ctx.createLinearGradient(logoX, logoY, logoX + logoSize, logoY + logoSize);
    gradientLogo.addColorStop(0, `rgb(${sampleLogoAbove[0]},${sampleLogoAbove[1]},${sampleLogoAbove[2]})`);
    gradientLogo.addColorStop(1, `rgb(${sampleLogoRight[0]},${sampleLogoRight[1]},${sampleLogoRight[2]})`);
    ctx.fillStyle = gradientLogo;
    ctx.fillRect(logoX, logoY, logoSize + 2, logoSize + margin + 2);

    return canvas.toDataURL('image/jpeg', 0.75);
  } catch {
    return dataUrl;
  }
}

/**
 * Fetch up to 2 distinct photos for an asset in Plan PPT.
 * Priority: campaign_assets.photos → media_photos → primary_photo_url
 * When includeQR=false, QR watermarks are stripped from photos.
 */
async function fetchAssetPhotosPlan(asset: PlanAsset, includeQR: boolean = true): Promise<(string | null)[]> {
  const dbId = asset.db_asset_id;
  const results: string[] = [];

  // 1) Campaign proof photos (latest first)
  if (dbId) {
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
              if (img) {
                if (!includeQR) img = await removeQRWatermark(img);
                results.push(img);
              }
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
            if (img) {
              if (!includeQR) img = await removeQRWatermark(img);
              results.push(img);
            }
          }
        }
      }
    } catch {}
  }

  // 3) Fallback: primary_photo_url
  if (results.length < 2 && asset.primary_photo_url) {
    let img = await fetchImageWithCache(asset.primary_photo_url);
    if (img && !results.includes(img)) {
      if (!includeQR) img = await removeQRWatermark(img);
      results.push(img);
    }
  }

  return results;
}

export interface PlanPPTExportOptions {
  includeQR?: boolean;
}

export async function generatePlanPPT(
  plan: PlanData,
  orgSettings: OrganizationSettings,
  exportOptions?: PlanPPTExportOptions
): Promise<Blob> {
  const includeQR = exportOptions?.includeQR ?? true;
  const prs = new pptxgen();

  // Configure presentation
  prs.author = orgSettings.organization_name || 'Go-Ads 360°';
  prs.company = orgSettings.organization_name || 'Go-Ads 360°';
  prs.title = `${plan.plan_name} - Media Proposal`;
  prs.subject = `Media Plan Proposal for ${plan.client_name}`;

  const primaryColor = orgSettings.primary_color || '1E3A8A';
  const brandColor = primaryColor.replace('#', '');

  // ===== COVER SLIDE =====
  const coverSlide = prs.addSlide();

  // Background (PowerPoint expects "color" here; using "fill" can corrupt the file)
  coverSlide.background = { color: brandColor };
  // Header bar
  coverSlide.addShape(prs.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 10,
    h: 0.8,
    fill: { color: 'FFFFFF', transparency: 90 },
  });

  coverSlide.addText(sanitizePptText('MEDIA ASSET PROPOSAL'), {
    x: 0.3,
    y: 0.2,
    w: 9.4,
    h: 0.5,
    fontSize: 16,
    bold: true,
    color: 'FFFFFF',
    align: 'left',
    fontFace: PPT_SAFE_FONTS.primary,
  });

  // Title - Asset count
  coverSlide.addText(sanitizePptText(`${plan.assets.length} Premium OOH Media Assets`), {
    x: 0.5,
    y: 2.5,
    w: 9,
    h: 1.2,
    fontSize: 42,
    bold: true,
    color: 'FFFFFF',
    align: 'center',
    fontFace: PPT_SAFE_FONTS.primary,
  });

  // Client name
  coverSlide.addText(sanitizePptText(`Prepared for: ${plan.client_name}`), {
    x: 0.5,
    y: 4.0,
    w: 9,
    h: 0.6,
    fontSize: 22,
    color: 'E5E7EB',
    align: 'center',
    fontFace: PPT_SAFE_FONTS.primary,
  });

  // Plan name
  coverSlide.addText(sanitizePptText(plan.plan_name), {
    x: 0.5,
    y: 4.8,
    w: 9,
    h: 0.5,
    fontSize: 18,
    color: 'FFFFFF',
    align: 'center',
    fontFace: PPT_SAFE_FONTS.primary,
  });

  // Footer box
  coverSlide.addShape(prs.ShapeType.rect, {
    x: 0,
    y: 6.7,
    w: 10,
    h: 0.8,
    fill: { color: '000000', transparency: 50 },
  });

  coverSlide.addText(
    sanitizePptText(`${format(new Date(), 'dd MMMM yyyy')} | ${orgSettings.organization_name || 'Go-Ads 360°'}`),
    {
      x: 0.5,
      y: 6.85,
      w: 9,
      h: 0.5,
      fontSize: 14,
      color: 'FFFFFF',
      align: 'center',
      fontFace: PPT_SAFE_FONTS.primary,
    }
  );

  // ===== SUMMARY SLIDE =====
  const summarySlide = prs.addSlide();
  summarySlide.background = { color: 'FFFFFF' };

  // Header bar
  summarySlide.addShape(prs.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 10,
    h: 0.7,
    fill: { color: brandColor },
  });

  summarySlide.addText(sanitizePptText('Campaign Summary'), {
    x: 0.3,
    y: 0.15,
    w: 9.4,
    h: 0.5,
    fontSize: 22,
    bold: true,
    color: 'FFFFFF',
    align: 'left',
    fontFace: PPT_SAFE_FONTS.primary,
  });

  // Summary table - sanitize all text values
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
    x: 0.5,
    y: 1.2,
    w: 9,
    colW: [3, 6],
    border: { type: 'solid', color: 'E5E7EB', pt: 0.5 },
    fontFace: PPT_SAFE_FONTS.primary,
    fontSize: 14,
    valign: 'middle',
    rowH: 0.5,
    fill: { color: 'F9FAFB' },
  });

  // ===== ASSET SLIDES =====
  for (const asset of plan.assets) {
    // Fetch up to 2 distinct photos for this asset
    const assetPhotos = await fetchAssetPhotosPlan(asset, includeQR);
    const photo1Base64 = assetPhotos[0] || (await fetchImageWithCache(await getPlaceholderPngDataUrl()));
    const photo2Base64 = assetPhotos[1] || photo1Base64; // fallback to photo1 if only one available

    // ===== SLIDE 1: TWO-IMAGE PRESENTATION SLIDE =====
    const slide1 = prs.addSlide();

    // Border frame
    slide1.addShape(prs.ShapeType.rect, {
      x: 0.15,
      y: 0.15,
      w: 9.7,
      h: 7.2,
      fill: { color: 'FFFFFF' },
      line: { color: brandColor, width: 6 },
    });

    // Asset ID header
    slide1.addText(sanitizePptText(asset.asset_id), {
      x: 0.3,
      y: 0.4,
      w: 9.4,
      h: 0.4,
      fontSize: 14,
      bold: true,
      color: '6B7280',
      align: 'left',
      fontFace: PPT_SAFE_FONTS.primary,
    });

    // Location header
    slide1.addText(sanitizePptText(`${asset.area} - ${asset.location}`), {
      x: 0.3,
      y: 0.75,
      w: 9.4,
      h: 0.5,
      fontSize: 24,
      bold: true,
      color: brandColor,
      align: 'left',
      fontFace: PPT_SAFE_FONTS.primary,
    });

    // Image 1
    try {
      slide1.addShape(prs.ShapeType.rect, {
        x: 0.4,
        y: 1.5,
        w: 4.5,
        h: 3.8,
        fill: { color: 'FFFFFF' },
        line: { color: 'E5E7EB', width: 1 },
      });

      if (photo1Base64) {
        slide1.addImage({
          data: photo1Base64,
          x: 0.4,
          y: 1.5,
          w: 4.5,
          h: 3.8,
          sizing: { type: 'cover', w: 4.5, h: 3.8 },
        });
      }
    } catch (error) {
      console.error('Failed to add image 1:', error);
    }

    // Image 2
    try {
      slide1.addShape(prs.ShapeType.rect, {
        x: 5.1,
        y: 1.5,
        w: 4.5,
        h: 3.8,
        fill: { color: 'FFFFFF' },
        line: { color: 'E5E7EB', width: 1 },
      });

      if (photo2Base64) {
        slide1.addImage({
          data: photo2Base64,
          x: 5.1,
          y: 1.5,
          w: 4.5,
          h: 3.8,
          sizing: { type: 'cover', w: 4.5, h: 3.8 },
        });
      }
    } catch (error) {
      console.error('Failed to add image 2:', error);
    }

    // Footer bar
    slide1.addShape(prs.ShapeType.rect, {
      x: 0.15,
      y: 6.85,
      w: 9.7,
      h: 0.5,
      fill: { color: brandColor },
    });

    slide1.addText(sanitizePptText(`${plan.plan_name} | ${plan.client_name} | ${orgSettings.organization_name || 'Go-Ads 360°'}`), {
      x: 0.3,
      y: 6.95,
      w: 9.4,
      h: 0.35,
      fontSize: 12,
      color: 'FFFFFF',
      align: 'center',
      fontFace: PPT_SAFE_FONTS.primary,
    });

    // ===== SLIDE 2: DETAILS SLIDE =====
    const slide2 = prs.addSlide();

    // Border frame
    slide2.addShape(prs.ShapeType.rect, {
      x: 0.15,
      y: 0.15,
      w: 9.7,
      h: 7.2,
      fill: { color: 'FFFFFF' },
      line: { color: brandColor, width: 6 },
    });

    // Header title
    slide2.addText(sanitizePptText('Asset Specifications'), {
      x: 0.3,
      y: 0.4,
      w: 9.4,
      h: 0.5,
      fontSize: 22,
      bold: true,
      color: '6B7280',
      align: 'left',
      fontFace: PPT_SAFE_FONTS.primary,
    });

    // Asset ID badge
    slide2.addText(sanitizePptText(asset.asset_id), {
      x: 0.3,
      y: 0.85,
      w: 9.4,
      h: 0.5,
      fontSize: 26,
      bold: true,
      color: brandColor,
      align: 'left',
      fontFace: PPT_SAFE_FONTS.primary,
    });

    // NOTE: QR code element is NOT added here because the asset photos already have 
    // QR watermarks baked in from the photo upload/watermarking process.
    // Adding another QR here would create duplicates (3 QR codes: 2 on images + 1 element).

    // Small thumbnail
    try {
      if (photo1Base64) {
        slide2.addImage({
          data: photo1Base64,
          x: 0.4,
          y: 1.6,
          w: 2.5,
          h: 2.5,
          sizing: { type: 'cover', w: 2.5, h: 2.5 },
        });
      }
    } catch (error) {
      console.error('Failed to add thumbnail:', error);
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

    // Details table data - use object format for table cells, sanitize all text
    const detailsTableData = [
      [{ text: sanitizePptText('City'), options: { bold: true } }, { text: sanitizePptText(asset.city || 'N/A') }],
      [{ text: sanitizePptText('Area'), options: { bold: true } }, { text: sanitizePptText(asset.area) }],
      [{ text: sanitizePptText('Location'), options: { bold: true } }, { text: sanitizePptText(asset.location) }],
      [{ text: sanitizePptText('Direction'), options: { bold: true } }, { text: sanitizePptText(asset.direction || 'N/A') }],
      [{ text: sanitizePptText('Dimensions'), options: { bold: true } }, { text: sanitizePptText(width && height ? `${width}X${height}` : asset.dimensions || 'N/A') }],
      [{ text: sanitizePptText('Total Sqft'), options: { bold: true } }, { text: sanitizePptText(asset.total_sqft?.toString() || 'N/A') }],
      [{ text: sanitizePptText('Illumination'), options: { bold: true } }, { text: sanitizePptText(asset.illumination_type || 'Non-lit') }],
    ];

    // Add details table
    slide2.addTable(detailsTableData, {
      x: 3.2,
      y: 1.6,
      w: 6.3,
      colW: [2, 4.3],
      border: { type: 'solid', color: 'E5E7EB', pt: 0.5 },
      fontFace: PPT_SAFE_FONTS.primary,
      fontSize: 12,
      valign: 'middle',
      rowH: 0.4,
      fill: { color: 'FFFFFF' },
    });

    // Campaign period below
    slide2.addText(sanitizePptText(`Campaign: ${format(new Date(plan.start_date), 'dd MMM yyyy')} - ${format(new Date(plan.end_date), 'dd MMM yyyy')}`), {
      x: 3.2,
      y: 4.6,
      w: 6.3,
      h: 0.35,
      fontSize: 12,
      color: '6B7280',
      fontFace: PPT_SAFE_FONTS.primary,
    });

    // Street View link removed to prevent XML corruption issues with complex URLs

    // GPS Coordinates below thumbnail
    if (asset.latitude && asset.longitude) {
      slide2.addText(sanitizePptText(`GPS: ${asset.latitude.toFixed(6)}, ${asset.longitude.toFixed(6)}`), {
        x: 0.4,
        y: 4.2,
        w: 2.5,
        h: 0.3,
        fontSize: 9,
        color: '6B7280',
        align: 'center',
        fontFace: PPT_SAFE_FONTS.primary,
      });
    }

    // Footer
    slide2.addShape(prs.ShapeType.rect, {
      x: 0.15,
      y: 6.85,
      w: 9.7,
      h: 0.5,
      fill: { color: '6B7280' },
    });

    slide2.addText(sanitizePptText(`${orgSettings.organization_name || 'Go-Ads 360°'} Proposal - Confidential`), {
      x: 0.3,
      y: 6.95,
      w: 9.4,
      h: 0.35,
      fontSize: 12,
      color: 'FFFFFF',
      align: 'center',
      fontFace: PPT_SAFE_FONTS.primary,
    });
  }

  // Generate and return blob
  const pptBlob = await prs.write({ outputType: 'blob' });
  return pptBlob as Blob;
}
