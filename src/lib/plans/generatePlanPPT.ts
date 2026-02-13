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

async function ensurePptCompatibleDataUrl(dataUrl: string): Promise<string | null> {
  if (!dataUrl?.startsWith('data:')) return null;
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/png')) return dataUrl;

  // Convert SVG/WebP/etc to JPEG via canvas
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
 * Fetch up to 2 distinct photos for an asset in Plan PPT.
 * Priority: campaign_assets.photos → media_photos → primary_photo_url
 */
async function fetchAssetPhotosPlan(asset: PlanAsset): Promise<(string | null)[]> {
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
              const img = await fetchImageWithCache(url);
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
            const img = await fetchImageWithCache(p.photo_url);
            if (img) results.push(img);
          }
        }
      }
    } catch {}
  }

  // 3) Fallback: primary_photo_url
  if (results.length < 2 && asset.primary_photo_url) {
    const img = await fetchImageWithCache(asset.primary_photo_url);
    if (img && !results.includes(img)) results.push(img);
  }

  return results;
}

export async function generatePlanPPT(
  plan: PlanData,
  orgSettings: OrganizationSettings
): Promise<Blob> {
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
    const assetPhotos = await fetchAssetPhotosPlan(asset);
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
      [{ text: sanitizePptText('City'), options: { bold: true } }, { text: sanitizePptText('Hyderabad') }],
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

    // Street View Link - Auto-fix if needed
    const streetViewUrl = validateAndFixStreetViewUrl(
      asset.google_street_view_url,
      asset.latitude,
      asset.longitude
    );
    
    // CRITICAL: Sanitize hyperlink URL to prevent XML corruption (& -> &amp;)
    const sanitizedStreetViewUrl = sanitizePptHyperlink(streetViewUrl || undefined);
    if (sanitizedStreetViewUrl) {
      slide2.addText(sanitizePptText('View on Google Street View'), {
        x: 3.2,
        y: 5.0,
        w: 6.3,
        h: 0.35,
        fontSize: 12,
        color: '2563EB',
        underline: { color: '2563EB' },
        hyperlink: { url: sanitizedStreetViewUrl },
        fontFace: PPT_SAFE_FONTS.primary,
      });
    }

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
