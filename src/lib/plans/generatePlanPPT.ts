import pptxgen from 'pptxgenjs';
import { format } from 'date-fns';
import { buildStreetViewUrl } from '../streetview';
import { fetchImageAsBase64 } from '../qrWatermark';
import { supabase } from '@/integrations/supabase/client';

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

// QR cache to avoid refetching
const qrCache = new Map<string, { base64: string; streetViewUrl: string }>();

async function getCachedQR(
  assetId: string,
  qrCodeUrl: string | undefined,
  latitude: number | undefined,
  longitude: number | undefined
): Promise<{ base64: string; streetViewUrl: string } | null> {
  if (!qrCodeUrl) return null;

  if (qrCache.has(assetId)) {
    return qrCache.get(assetId)!;
  }

  try {
    const streetViewUrl = latitude && longitude ? buildStreetViewUrl(latitude, longitude) : null;

    if (!streetViewUrl) return null;

    const base64 = await fetchImageAsBase64(qrCodeUrl);
    const result = { base64, streetViewUrl };
    qrCache.set(assetId, result);
    return result;
  } catch (error) {
    console.warn(`Failed to fetch QR for asset ${assetId}:`, error);
    return null;
  }
}

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

  coverSlide.addText('MEDIA ASSET PROPOSAL', {
    x: 0.3,
    y: 0.2,
    w: 9.4,
    h: 0.5,
    fontSize: 16,
    bold: true,
    color: 'FFFFFF',
    align: 'left',
    fontFace: 'Arial',
  });

  // Title - Asset count
  coverSlide.addText(`${plan.assets.length} Premium OOH Media Assets`, {
    x: 0.5,
    y: 2.5,
    w: 9,
    h: 1.2,
    fontSize: 42,
    bold: true,
    color: 'FFFFFF',
    align: 'center',
    fontFace: 'Arial',
  });

  // Client name
  coverSlide.addText(`Prepared for: ${plan.client_name}`, {
    x: 0.5,
    y: 4.0,
    w: 9,
    h: 0.6,
    fontSize: 22,
    color: 'E5E7EB',
    align: 'center',
    fontFace: 'Arial',
  });

  // Plan name
  coverSlide.addText(plan.plan_name, {
    x: 0.5,
    y: 4.8,
    w: 9,
    h: 0.5,
    fontSize: 18,
    color: 'FFFFFF',
    align: 'center',
    fontFace: 'Arial',
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
    `${format(new Date(), 'dd MMMM yyyy')} | ${orgSettings.organization_name || 'Go-Ads 360°'}`,
    {
      x: 0.5,
      y: 6.85,
      w: 9,
      h: 0.5,
      fontSize: 14,
      color: 'FFFFFF',
      align: 'center',
      fontFace: 'Arial',
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

  summarySlide.addText('Campaign Summary', {
    x: 0.3,
    y: 0.15,
    w: 9.4,
    h: 0.5,
    fontSize: 22,
    bold: true,
    color: 'FFFFFF',
    align: 'left',
    fontFace: 'Arial',
  });

  // Summary table
  const summaryData = [
    [{ text: 'Plan ID' }, { text: plan.id }],
    [{ text: 'Company' }, { text: orgSettings.organization_name || 'Go-Ads 360°' }],
    [{ text: 'Client' }, { text: plan.client_name }],
    [{ text: 'Duration' }, { text: `${Math.ceil((new Date(plan.end_date).getTime() - new Date(plan.start_date).getTime()) / (1000 * 60 * 60 * 24))} days` }],
    [{ text: 'Start Date' }, { text: format(new Date(plan.start_date), 'dd/MM/yyyy') }],
    [{ text: 'End Date' }, { text: format(new Date(plan.end_date), 'dd/MM/yyyy') }],
    [{ text: 'Total Assets' }, { text: `${plan.assets.length} sites` }],
  ];

  summarySlide.addTable(summaryData, {
    x: 0.5,
    y: 1.2,
    w: 9,
    colW: [3, 6],
    border: { type: 'solid', color: 'E5E7EB', pt: 0.5 },
    fontFace: 'Arial',
    fontSize: 14,
    valign: 'middle',
    rowH: 0.5,
    fill: { color: 'F9FAFB' },
  });

  // ===== ASSET SLIDES =====
  for (const asset of plan.assets) {
    // Use primary_photo_url for presentation - fetch as base64.
    // IMPORTANT: PowerPoint does not reliably render SVG/WebP. Ensure we embed PNG/JPEG.
    const preferredPhotoUrl = asset.primary_photo_url;
    const photoBase64 = preferredPhotoUrl ? await fetchImageWithCache(preferredPhotoUrl) : null;
    const finalPhotoBase64 = photoBase64 || (await fetchImageWithCache(await getPlaceholderPngDataUrl()));

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
    slide1.addText(asset.asset_id, {
      x: 0.3,
      y: 0.4,
      w: 9.4,
      h: 0.4,
      fontSize: 14,
      bold: true,
      color: '6B7280',
      align: 'left',
      fontFace: 'Arial',
    });

    // Location header
    slide1.addText(`${asset.area} · ${asset.location}`, {
      x: 0.3,
      y: 0.75,
      w: 9.4,
      h: 0.5,
      fontSize: 24,
      bold: true,
      color: brandColor,
      align: 'left',
      fontFace: 'Arial',
    });

    // Get QR data for this asset (cached)
    const qrData = await getCachedQR(
      asset.asset_id,
      asset.qr_code_url,
      asset.latitude,
      asset.longitude
    );

    // Image 1 (fixed frame, cover to keep exact positioning)
    try {
      // Frame (helps visually + ensures consistent crop)
      slide1.addShape(prs.ShapeType.rect, {
        x: 0.4,
        y: 1.5,
        w: 4.5,
        h: 3.8,
        fill: { color: 'FFFFFF' },
        line: { color: 'E5E7EB', width: 1 },
      });

      if (finalPhotoBase64) {
        slide1.addImage({
          data: finalPhotoBase64,
          x: 0.4,
          y: 1.5,
          w: 4.5,
          h: 3.8,
          sizing: { type: 'cover', w: 4.5, h: 3.8 },
        });
      }

      // Add clickable QR overlay on image 1 (bottom-right corner)
      if (qrData) {
        const qrSize = 0.7; // ~70px in inches
        const qrPadding = 0.12; // ~12px
        slide1.addImage({
          data: qrData.base64,
          x: 0.4 + 4.5 - qrSize - qrPadding,
          y: 1.5 + 3.8 - qrSize - qrPadding,
          w: qrSize,
          h: qrSize,
          hyperlink: { url: qrData.streetViewUrl },
        });
      }
    } catch (error) {
      console.error('Failed to add image 1:', error);
    }

    // Image 2 (fixed frame, cover to keep exact positioning)
    try {
      slide1.addShape(prs.ShapeType.rect, {
        x: 5.1,
        y: 1.5,
        w: 4.5,
        h: 3.8,
        fill: { color: 'FFFFFF' },
        line: { color: 'E5E7EB', width: 1 },
      });

      if (finalPhotoBase64) {
        slide1.addImage({
          data: finalPhotoBase64,
          x: 5.1,
          y: 1.5,
          w: 4.5,
          h: 3.8,
          sizing: { type: 'cover', w: 4.5, h: 3.8 },
        });
      }

      // Add clickable QR overlay on image 2 (bottom-right corner)
      if (qrData) {
        const qrSize = 0.7;
        const qrPadding = 0.12;
        slide1.addImage({
          data: qrData.base64,
          x: 5.1 + 4.5 - qrSize - qrPadding,
          y: 1.5 + 3.8 - qrSize - qrPadding,
          w: qrSize,
          h: qrSize,
          hyperlink: { url: qrData.streetViewUrl },
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

    slide1.addText(`${plan.plan_name} | ${plan.client_name} | ${orgSettings.organization_name || 'Go-Ads 360°'}`, {
      x: 0.3,
      y: 6.95,
      w: 9.4,
      h: 0.35,
      fontSize: 12,
      color: 'FFFFFF',
      align: 'center',
      fontFace: 'Arial',
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
    slide2.addText('Asset Specifications', {
      x: 0.3,
      y: 0.4,
      w: 9.4,
      h: 0.5,
      fontSize: 22,
      bold: true,
      color: '6B7280',
      align: 'left',
      fontFace: 'Arial',
    });

    // Asset ID badge
    slide2.addText(asset.asset_id, {
      x: 0.3,
      y: 0.85,
      w: 9.4,
      h: 0.5,
      fontSize: 26,
      bold: true,
      color: brandColor,
      align: 'left',
      fontFace: 'Arial',
    });

    // Add QR Code if available (top-right corner) - with clickable hyperlink
    if (qrData) {
      try {
        slide2.addImage({
          data: qrData.base64,
          x: 8.8,
          y: 0.35,
          w: 1.3,
          h: 1.3,
          hyperlink: { url: qrData.streetViewUrl },
        });
      } catch (error) {
        console.error('Failed to add QR code:', error);
      }
    }

    // Small thumbnail
    try {
      if (finalPhotoBase64) {
        slide2.addImage({
          data: finalPhotoBase64,
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

    // Details table data - use object format for table cells
    const detailsTableData = [
      [{ text: 'City', options: { bold: true } }, { text: 'Hyderabad' }],
      [{ text: 'Area', options: { bold: true } }, { text: asset.area }],
      [{ text: 'Location', options: { bold: true } }, { text: asset.location }],
      [{ text: 'Direction', options: { bold: true } }, { text: asset.direction || 'N/A' }],
      [{ text: 'Dimensions', options: { bold: true } }, { text: width && height ? `${width}X${height}` : asset.dimensions || 'N/A' }],
      [{ text: 'Total Sqft', options: { bold: true } }, { text: asset.total_sqft?.toString() || 'N/A' }],
      [{ text: 'Illumination', options: { bold: true } }, { text: asset.illumination_type || 'Non-lit' }],
    ];

    // Add details table
    slide2.addTable(detailsTableData, {
      x: 3.2,
      y: 1.6,
      w: 6.3,
      colW: [2, 4.3],
      border: { type: 'solid', color: 'E5E7EB', pt: 0.5 },
      fontFace: 'Arial',
      fontSize: 12,
      valign: 'middle',
      rowH: 0.4,
      fill: { color: 'FFFFFF' },
    });

    // Campaign period below
    slide2.addText(`Campaign: ${format(new Date(plan.start_date), 'dd MMM yyyy')} - ${format(new Date(plan.end_date), 'dd MMM yyyy')}`, {
      x: 3.2,
      y: 4.6,
      w: 6.3,
      h: 0.35,
      fontSize: 12,
      color: '6B7280',
      fontFace: 'Arial',
    });

    // Street View Link - Auto-fix if needed
    const streetViewUrl = validateAndFixStreetViewUrl(
      asset.google_street_view_url,
      asset.latitude,
      asset.longitude
    );
    
    if (streetViewUrl) {
      slide2.addText('View on Google Street View', {
        x: 3.2,
        y: 5.0,
        w: 6.3,
        h: 0.35,
        fontSize: 12,
        color: '2563EB',
        underline: { color: '2563EB' },
        hyperlink: { url: streetViewUrl },
        fontFace: 'Arial',
      });
    }

    // GPS Coordinates below thumbnail
    if (asset.latitude && asset.longitude) {
      slide2.addText(`GPS: ${asset.latitude.toFixed(6)}, ${asset.longitude.toFixed(6)}`, {
        x: 0.4,
        y: 4.2,
        w: 2.5,
        h: 0.3,
        fontSize: 9,
        color: '6B7280',
        align: 'center',
        fontFace: 'Arial',
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

    slide2.addText(`${orgSettings.organization_name || 'Go-Ads 360°'} Proposal – Confidential`, {
      x: 0.3,
      y: 6.95,
      w: 9.4,
      h: 0.35,
      fontSize: 12,
      color: 'FFFFFF',
      align: 'center',
      fontFace: 'Arial',
    });
  }

  // Generate and return blob
  const pptBlob = await prs.write({ outputType: 'blob' });
  return pptBlob as Blob;
}
