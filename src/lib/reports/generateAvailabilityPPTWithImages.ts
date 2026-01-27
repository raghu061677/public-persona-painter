/**
 * Image-Based Vacant Media Availability PPT Export
 * 
 * Generates a premium, client-ready PowerPoint presentation with:
 * - Cover slide with branding
 * - Summary slide with counts
 * - Individual asset slides with images, details, QR codes
 * - Terms & conditions slide
 * 
 * Matches the quality of Plans module PPT exports.
 */

import pptxgen from 'pptxgenjs';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { 
  sanitizePptHyperlink, 
  sanitizePptText, 
  PPT_SAFE_FONTS 
} from '../ppt/sanitizers';
import { fetchImageAsBase64 } from '../qrWatermark';
import { buildStreetViewUrl } from '../streetview';

interface AvailableAsset {
  id: string;
  media_asset_code: string | null;
  city: string;
  area: string;
  location: string;
  media_type: string;
  dimensions: string | null;
  card_rate: number;
  total_sqft: number | null;
  status: string;
  direction?: string | null;
  illumination_type?: string | null;
  primary_photo_url?: string | null;
  qr_code_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  availability_status: 'available' | 'available_soon';
  next_available_from: string | null;
}

interface BookingInfo {
  campaign_id: string;
  campaign_name: string;
  client_name: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface BookedAsset {
  id: string;
  media_asset_code: string | null;
  city: string;
  area: string;
  location: string;
  media_type: string;
  dimensions: string | null;
  card_rate: number;
  total_sqft: number | null;
  status: string;
  direction?: string | null;
  illumination_type?: string | null;
  primary_photo_url?: string | null;
  qr_code_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  availability_status: 'booked' | 'conflict';
  current_booking: BookingInfo | null;
  all_bookings?: BookingInfo[];
  available_from: string | null;
}

export type ExportTab = 'available' | 'booked' | 'soon' | 'conflict' | 'all';

interface ExportData {
  availableAssets: AvailableAsset[];
  bookedAssets: BookedAsset[];
  availableSoonAssets: BookedAsset[];
  conflictAssets?: BookedAsset[];
  dateRange: string;
  summary: {
    total_assets: number;
    available_count: number;
    booked_count: number;
    available_soon_count: number;
    conflict_count?: number;
    potential_revenue: number;
  };
  exportTab?: ExportTab;
  companyId?: string;
}

interface OrganizationSettings {
  organization_name?: string;
  logo_url?: string;
  primary_color?: string;
}

// Image cache to avoid re-fetching
const imageCache = new Map<string, string>();

// Placeholder image for PPT
let _placeholderPngDataUrl: string | null = null;
async function getPlaceholderPngDataUrl(): Promise<string> {
  if (_placeholderPngDataUrl) return _placeholderPngDataUrl;

  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
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

async function toFetchableUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;
  if (!url.startsWith('http')) {
    const { data } = await supabase.storage.from('media-assets').createSignedUrl(url, 3600);
    return data?.signedUrl || url;
  }
  return url;
}

async function ensurePptCompatibleDataUrl(dataUrl: string): Promise<string | null> {
  if (!dataUrl?.startsWith('data:')) return null;
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/png')) return dataUrl;

  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to decode image'));
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
    const directUrl = await toFetchableUrl(url);
    const base = await fetchImageAsBase64(directUrl);
    return await ensurePptCompatibleDataUrl(base);
  } catch {
    try {
      const { data } = await supabase.storage.from('media-assets').createSignedUrl(url, 3600);
      if (!data?.signedUrl) return null;
      const base = await fetchImageAsBase64(data.signedUrl);
      return await ensurePptCompatibleDataUrl(base);
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

// QR cache to avoid refetching
const qrCache = new Map<string, { base64: string; streetViewUrl: string }>();

async function getCachedQR(
  assetId: string,
  qrCodeUrl: string | undefined | null,
  latitude: number | undefined | null,
  longitude: number | undefined | null
): Promise<{ base64: string; streetViewUrl: string } | null> {
  if (!qrCodeUrl) return null;

  const cacheKey = `${assetId}-${qrCodeUrl}`;
  if (qrCache.has(cacheKey)) {
    return qrCache.get(cacheKey)!;
  }

  try {
    const streetViewUrl = latitude && longitude ? buildStreetViewUrl(latitude, longitude) : null;
    if (!streetViewUrl) return null;

    const base64 = await fetchImageAsBase64(qrCodeUrl);
    const result = { base64, streetViewUrl };
    qrCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.warn(`Failed to fetch QR for asset ${assetId}:`, error);
    return null;
  }
}

async function fetchAssetPhoto(
  asset: AvailableAsset | BookedAsset, 
  companyId?: string,
  isBookedReport: boolean = false,
  isAvailableReport: boolean = false
): Promise<string | null> {
  const bookedAsset = asset as BookedAsset;
  
  // NEW: For AVAILABLE reports, prioritize Photo Library (media_photos) first
  if (isAvailableReport) {
    try {
      // Priority 1: Fetch most recent Photo Library image for this asset
      const { data: libraryPhotos } = await supabase
        .from('media_photos')
        .select('photo_url, category, uploaded_at')
        .eq('asset_id', asset.id)
        .order('uploaded_at', { ascending: false })
        .limit(5);

      if (libraryPhotos?.length) {
        // Try each photo in order until one loads successfully
        for (const photo of libraryPhotos) {
          if (photo.photo_url) {
            const img = await fetchImageWithCache(photo.photo_url);
            if (img) return img;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to fetch Photo Library images for available asset:', e);
    }
  }
  
  // SPECIAL RULE: For BOOKED assets, prioritize proof photos from the latest booking/campaign
  if (isBookedReport && bookedAsset.current_booking?.campaign_id) {
    try {
      // First, try to get campaign_assets.id for this specific booking
      const { data: campaignAssetData } = await supabase
        .from('campaign_assets')
        .select('id, photos, completed_at')
        .eq('campaign_id', bookedAsset.current_booking.campaign_id)
        .eq('asset_id', asset.id)
        .limit(1);

      if (campaignAssetData?.[0]) {
        const campaignAssetId = campaignAssetData[0].id;
        
        // Priority 1a: Fetch latest proof photos from media_photos table for this campaign asset
        // Prefer: geotag, traffic1, traffic2, newspaper
        const { data: proofPhotos } = await supabase
          .from('media_photos')
          .select('photo_url, category')
          .eq('campaign_id', bookedAsset.current_booking.campaign_id)
          .eq('asset_id', campaignAssetId)
          .order('uploaded_at', { ascending: false })
          .limit(10);

        if (proofPhotos?.length) {
          // Order by preference: geotag -> traffic1 -> traffic2 -> newspaper
          const categoryPriority = ['geo', 'geotag', 'traffic1', 'traffic_left', 'traffic2', 'traffic_right', 'newspaper'];
          for (const cat of categoryPriority) {
            const match = proofPhotos.find(p => 
              p.category?.toLowerCase().includes(cat) || 
              p.category?.toLowerCase() === cat
            );
            if (match?.photo_url) {
              const img = await fetchImageWithCache(match.photo_url);
              if (img) return img;
            }
          }
          // Fallback: any proof photo from this campaign
          const firstPhoto = proofPhotos[0]?.photo_url;
          if (firstPhoto) {
            const img = await fetchImageWithCache(firstPhoto);
            if (img) return img;
          }
        }

        // Priority 1b: Try campaign_assets.photos JSONB field
        if (campaignAssetData[0].photos) {
          const photos = campaignAssetData[0].photos as Record<string, string>;
          // Prefer: geo/geotag -> traffic1 -> traffic2 -> newspaper
          const photoUrl = photos.geo || photos.geotag || photos.traffic1 || photos.traffic_left || 
                          photos.traffic2 || photos.traffic_right || photos.newspaper || 
                          Object.values(photos).find(v => v && typeof v === 'string');
          if (photoUrl) {
            const img = await fetchImageWithCache(photoUrl);
            if (img) return img;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to fetch booked campaign proof photos:', e);
    }
  }

  // Priority 2: Try to get latest campaign photo (for non-booked or fallback)
  if (companyId) {
    try {
      const { data: campaignAssets } = await supabase
        .from('campaign_assets')
        .select(`
          id,
          photos,
          campaigns!inner(id, status)
        `)
        .eq('asset_id', asset.id)
        .in('campaigns.status', ['Completed', 'Running', 'Upcoming'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (campaignAssets?.[0]?.photos) {
        const photos = campaignAssets[0].photos as Record<string, string>;
        const photoUrl = photos.geo || photos.geotag || photos.traffic1 || photos.newspaper || photos.traffic2;
        if (photoUrl) {
          const img = await fetchImageWithCache(photoUrl);
          if (img) return img;
        }
      }
    } catch (e) {
      console.warn('Failed to fetch campaign photos:', e);
    }
  }

  // Priority 3: Try primary_photo_url from asset
  if ((asset as any).primary_photo_url) {
    const img = await fetchImageWithCache((asset as any).primary_photo_url);
    if (img) return img;
  }

  // Priority 4: Try to fetch from media_photos table (final attempt for any asset)
  try {
    const { data: photos } = await supabase
      .from('media_photos')
      .select('photo_url, category')
      .eq('asset_id', asset.id)
      .order('uploaded_at', { ascending: false })
      .limit(1);

    if (photos?.[0]?.photo_url) {
      const img = await fetchImageWithCache(photos[0].photo_url);
      if (img) return img;
    }
  } catch (e) {
    console.warn('Failed to fetch media_photos:', e);
  }

  // Fallback: placeholder - NEVER skip an asset due to missing image
  return await getPlaceholderPngDataUrl();
}

export async function generateAvailabilityPPTWithImages(data: ExportData): Promise<void> {
  const prs = new pptxgen();
  prs.author = 'Go-Ads 360°';
  prs.company = 'Go-Ads 360°';
  prs.title = `Media Availability Report - ${data.dateRange}`;
  
  const exportTab = data.exportTab || 'all';

  // Fetch organization settings
  let orgSettings: OrganizationSettings = { organization_name: 'Go-Ads 360°' };
  if (data.companyId) {
    try {
      const { data: settings } = await supabase
        .from('organization_settings')
        .select('organization_name, logo_url, primary_color')
        .eq('company_id', data.companyId)
        .single();
      if (settings) orgSettings = settings;
    } catch (e) {
      console.warn('Failed to fetch org settings:', e);
    }
  }

  const brandColor = (orgSettings.primary_color || '1E3A8A').replace('#', '');
  const successGreen = '22C55E';
  const dangerRed = 'DC2626';
  const warningYellow = 'EAB308';
  const orangeColor = 'F97316';

  const getStatusColor = (type: 'available' | 'booked' | 'soon' | 'conflict') => {
    switch (type) {
      case 'available': return successGreen;
      case 'booked': return dangerRed;
      case 'soon': return warningYellow;
      case 'conflict': return orangeColor;
    }
  };

  const getStatusLabel = (type: 'available' | 'booked' | 'soon' | 'conflict') => {
    switch (type) {
      case 'available': return 'AVAILABLE';
      case 'booked': return 'BOOKED';
      case 'soon': return 'AVAILABLE SOON';
      case 'conflict': return 'CONFLICT';
    }
  };

  const titleTexts: Record<ExportTab, string> = {
    all: 'MEDIA AVAILABILITY REPORT',
    available: 'AVAILABLE ASSETS REPORT',
    booked: 'BOOKED ASSETS REPORT',
    soon: 'AVAILABLE SOON REPORT',
    conflict: 'CONFLICT ASSETS REPORT',
  };

  // ===== COVER SLIDE =====
  const coverSlide = prs.addSlide();
  coverSlide.background = { color: brandColor };

  coverSlide.addShape(prs.ShapeType.rect, {
    x: 0, y: 0, w: 10, h: 0.8,
    fill: { color: 'FFFFFF', transparency: 90 },
  });

  coverSlide.addText(sanitizePptText('MEDIA AVAILABILITY REPORT'), {
    x: 0.3, y: 0.2, w: 9.4, h: 0.5,
    fontSize: 16, bold: true, color: 'FFFFFF', align: 'left', fontFace: PPT_SAFE_FONTS.primary,
  });

  // Determine what assets we're exporting
  let assetsToExport: (AvailableAsset | BookedAsset)[] = [];
  let exportType: 'available' | 'booked' | 'soon' | 'conflict' = 'available';
  
  if (exportTab === 'available' || exportTab === 'all') {
    assetsToExport = data.availableAssets;
    exportType = 'available';
  } else if (exportTab === 'booked') {
    assetsToExport = data.bookedAssets.filter(a => a.availability_status !== 'conflict');
    exportType = 'booked';
  } else if (exportTab === 'soon') {
    assetsToExport = data.availableSoonAssets;
    exportType = 'soon';
  } else if (exportTab === 'conflict') {
    assetsToExport = data.conflictAssets || data.bookedAssets.filter(a => a.availability_status === 'conflict');
    exportType = 'conflict';
  }

  coverSlide.addText(sanitizePptText(`${assetsToExport.length} Premium OOH Media Assets`), {
    x: 0.5, y: 2.5, w: 9, h: 1.2,
    fontSize: 42, bold: true, color: 'FFFFFF', align: 'center', fontFace: PPT_SAFE_FONTS.primary,
  });

  coverSlide.addText(sanitizePptText(titleTexts[exportTab]), {
    x: 0.5, y: 4.0, w: 9, h: 0.6,
    fontSize: 22, color: 'E5E7EB', align: 'center', fontFace: PPT_SAFE_FONTS.primary,
  });

  coverSlide.addText(sanitizePptText(data.dateRange), {
    x: 0.5, y: 4.8, w: 9, h: 0.5,
    fontSize: 18, color: 'FFFFFF', align: 'center', fontFace: PPT_SAFE_FONTS.primary,
  });

  coverSlide.addShape(prs.ShapeType.rect, {
    x: 0, y: 6.7, w: 10, h: 0.8,
    fill: { color: '000000', transparency: 50 },
  });

  coverSlide.addText(
    sanitizePptText(`${format(new Date(), 'dd MMMM yyyy')} | ${orgSettings.organization_name || 'Go-Ads 360°'}`),
    {
      x: 0.5, y: 6.85, w: 9, h: 0.5,
      fontSize: 14, color: 'FFFFFF', align: 'center', fontFace: PPT_SAFE_FONTS.primary,
    }
  );

  // ===== SUMMARY SLIDE =====
  const summarySlide = prs.addSlide();
  summarySlide.background = { color: 'FFFFFF' };

  summarySlide.addShape(prs.ShapeType.rect, {
    x: 0, y: 0, w: 10, h: 0.7,
    fill: { color: brandColor },
  });

  summarySlide.addText(sanitizePptText('Availability Summary'), {
    x: 0.3, y: 0.15, w: 9.4, h: 0.5,
    fontSize: 22, bold: true, color: 'FFFFFF', align: 'left', fontFace: PPT_SAFE_FONTS.primary,
  });

  // Summary cards
  const summaryCards = [
    { label: 'Available', count: data.summary.available_count, color: successGreen },
    { label: 'Booked', count: data.summary.booked_count, color: dangerRed },
    { label: 'Available Soon', count: data.summary.available_soon_count, color: warningYellow },
    { label: 'Conflicts', count: data.summary.conflict_count || 0, color: orangeColor },
  ];

  summaryCards.forEach((card, idx) => {
    const xPos = 0.5 + idx * 2.4;
    
    summarySlide.addShape(prs.ShapeType.rect, {
      x: xPos, y: 1.2, w: 2.2, h: 1.4,
      fill: { color: card.color },
      line: { color: card.color, width: 0 },
    });

    summarySlide.addText(card.count.toString(), {
      x: xPos, y: 1.3, w: 2.2, h: 0.8,
      fontSize: 36, bold: true, color: 'FFFFFF', align: 'center', fontFace: PPT_SAFE_FONTS.primary,
    });

    summarySlide.addText(sanitizePptText(card.label), {
      x: xPos, y: 2.1, w: 2.2, h: 0.4,
      fontSize: 12, color: 'FFFFFF', align: 'center', fontFace: PPT_SAFE_FONTS.primary,
    });
  });

  // Summary table
  const summaryData = [
    [{ text: sanitizePptText('Report Period') }, { text: sanitizePptText(data.dateRange) }],
    [{ text: sanitizePptText('Company') }, { text: sanitizePptText(orgSettings.organization_name || 'Go-Ads 360°') }],
    [{ text: sanitizePptText('Total Assets') }, { text: sanitizePptText(`${data.summary.total_assets} sites`) }],
    [{ text: sanitizePptText('Export Type') }, { text: sanitizePptText(titleTexts[exportTab]) }],
    [{ text: sanitizePptText('Potential Revenue') }, { text: sanitizePptText(`Rs. ${data.summary.potential_revenue.toLocaleString('en-IN')}`) }],
  ];

  summarySlide.addTable(summaryData, {
    x: 0.5, y: 3.0, w: 9, colW: [3, 6],
    border: { type: 'solid', color: 'E5E7EB', pt: 0.5 },
    fontFace: PPT_SAFE_FONTS.primary,
    fontSize: 14,
    valign: 'middle',
    rowH: 0.5,
    fill: { color: 'F9FAFB' },
  });

  // ===== ASSET SLIDES =====
  // IMPORTANT: Export ALL assets - no arbitrary limit. User expects count to match UI.
  const totalAssets = assetsToExport.length;
  
  for (let i = 0; i < totalAssets; i++) {
    const asset = assetsToExport[i];
    const assetType = (asset as BookedAsset).availability_status === 'conflict' 
      ? 'conflict' 
      : (asset as BookedAsset).availability_status === 'booked'
        ? 'booked'
        : (asset as AvailableAsset).availability_status === 'available_soon'
          ? 'soon'
          : 'available';
    
    const statusColor = getStatusColor(assetType);
    const statusLabel = getStatusLabel(assetType);

    // Fetch asset photo - pass context flags to prioritize correct image sources
    const isBookedReport = exportTab === 'booked';
    const isAvailableReport = exportTab === 'available' || exportTab === 'soon' || exportTab === 'all';
    const photoBase64 = await fetchAssetPhoto(asset, data.companyId, isBookedReport, isAvailableReport);

    // Fetch QR code data for this asset (cached)
    const qrData = await getCachedQR(
      asset.id,
      asset.qr_code_url,
      asset.latitude,
      asset.longitude
    );

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

    // ===== SLIDE: ASSET PRESENTATION =====
    const slide = prs.addSlide();

    // Border frame
    slide.addShape(prs.ShapeType.rect, {
      x: 0.15, y: 0.15, w: 9.7, h: 7.2,
      fill: { color: 'FFFFFF' },
      line: { color: brandColor, width: 6 },
    });

    // Asset ID header
    slide.addText(sanitizePptText(asset.media_asset_code || asset.id), {
      x: 0.3, y: 0.4, w: 7, h: 0.4,
      fontSize: 14, bold: true, color: '6B7280', align: 'left', fontFace: PPT_SAFE_FONTS.primary,
    });

    // Status badge (top right)
    slide.addShape(prs.ShapeType.rect, {
      x: 7.5, y: 0.35, w: 2.2, h: 0.5,
      fill: { color: statusColor },
    });
    slide.addText(sanitizePptText(statusLabel), {
      x: 7.5, y: 0.4, w: 2.2, h: 0.4,
      fontSize: 12, bold: true, color: 'FFFFFF', align: 'center', fontFace: PPT_SAFE_FONTS.primary,
    });

    // Location header
    slide.addText(sanitizePptText(`${asset.area} - ${asset.location}`), {
      x: 0.3, y: 0.75, w: 9.4, h: 0.5,
      fontSize: 20, bold: true, color: brandColor, align: 'left', fontFace: PPT_SAFE_FONTS.primary,
    });

    // Main Image
    try {
      slide.addShape(prs.ShapeType.rect, {
        x: 0.4, y: 1.4, w: 5, h: 4,
        fill: { color: 'F3F4F6' },
        line: { color: 'E5E7EB', width: 1 },
      });

      if (photoBase64) {
        slide.addImage({
          data: photoBase64,
          x: 0.4, y: 1.4, w: 5, h: 4,
          sizing: { type: 'cover', w: 5, h: 4 },
        });
      }
    } catch (e) {
      console.error('Failed to add image:', e);
    }

    // Add QR code overlay on image (bottom-right corner) - clickable link to Street View
    if (qrData) {
      try {
        const sanitizedStreetViewUrl = sanitizePptHyperlink(qrData.streetViewUrl);
        if (sanitizedStreetViewUrl) {
          const qrSize = 0.8; // ~80px in inches
          const qrPadding = 0.15;
          slide.addImage({
            data: qrData.base64,
            x: 0.4 + 5 - qrSize - qrPadding, // Bottom-right of image area
            y: 1.4 + 4 - qrSize - qrPadding,
            w: qrSize,
            h: qrSize,
            hyperlink: { url: sanitizedStreetViewUrl },
          });
        }
      } catch (e) {
        console.error('Failed to add QR code:', e);
      }
    }

    // Details panel (right side)
    slide.addShape(prs.ShapeType.rect, {
      x: 5.6, y: 1.4, w: 4, h: 4,
      fill: { color: 'F9FAFB' },
      line: { color: 'E5E7EB', width: 1 },
    });

    // Details table
    const bookedAsset = asset as BookedAsset;
    const detailsTableData = [
      [{ text: sanitizePptText('City'), options: { bold: true } }, { text: sanitizePptText(asset.city) }],
      [{ text: sanitizePptText('Area'), options: { bold: true } }, { text: sanitizePptText(asset.area) }],
      [{ text: sanitizePptText('Location'), options: { bold: true } }, { text: sanitizePptText(asset.location) }],
      [{ text: sanitizePptText('Direction'), options: { bold: true } }, { text: sanitizePptText(asset.direction || 'N/A') }],
      [{ text: sanitizePptText('Dimensions'), options: { bold: true } }, { text: sanitizePptText(width && height ? `${width} x ${height} ft` : asset.dimensions || 'N/A') }],
      [{ text: sanitizePptText('Sq.Ft'), options: { bold: true } }, { text: sanitizePptText(asset.total_sqft?.toString() || 'N/A') }],
      [{ text: sanitizePptText('Illumination'), options: { bold: true } }, { text: sanitizePptText(asset.illumination_type || 'Non-lit') }],
      [{ text: sanitizePptText('Media Type'), options: { bold: true } }, { text: sanitizePptText(asset.media_type) }],
      [{ text: sanitizePptText('Card Rate'), options: { bold: true } }, { text: sanitizePptText(`Rs. ${asset.card_rate.toLocaleString('en-IN')}/month`) }],
    ];

    // Add booking info for booked/soon assets
    if (assetType === 'booked' || assetType === 'soon') {
      if (bookedAsset.current_booking) {
        detailsTableData.push([
          { text: sanitizePptText('Campaign'), options: { bold: true } },
          { text: sanitizePptText(bookedAsset.current_booking.campaign_name) }
        ]);
      }
      if (bookedAsset.available_from) {
        detailsTableData.push([
          { text: sanitizePptText('Available From'), options: { bold: true } },
          { text: sanitizePptText(format(new Date(bookedAsset.available_from), 'dd MMM yyyy')) }
        ]);
      }
    }

    slide.addTable(detailsTableData, {
      x: 5.7, y: 1.5, w: 3.8, colW: [1.4, 2.4],
      border: { type: 'solid', color: 'E5E7EB', pt: 0.5 },
      fontFace: PPT_SAFE_FONTS.primary,
      fontSize: 10,
      valign: 'middle',
      rowH: 0.32,
      fill: { color: 'FFFFFF' },
    });

    // Footer bar
    slide.addShape(prs.ShapeType.rect, {
      x: 0.15, y: 6.85, w: 9.7, h: 0.5,
      fill: { color: brandColor },
    });

    slide.addText(
      sanitizePptText(`${orgSettings.organization_name || 'Go-Ads 360°'} | Media Availability Report | Asset ${i + 1} of ${totalAssets}`),
      {
        x: 0.3, y: 6.95, w: 9.4, h: 0.35,
        fontSize: 11, color: 'FFFFFF', align: 'center', fontFace: PPT_SAFE_FONTS.primary,
      }
    );
  }

  // ===== TERMS SLIDE =====
  const termsSlide = prs.addSlide();
  termsSlide.background = { color: 'FFFFFF' };

  termsSlide.addShape(prs.ShapeType.rect, {
    x: 0, y: 0, w: 10, h: 0.7,
    fill: { color: brandColor },
  });

  termsSlide.addText(sanitizePptText('Terms & Conditions'), {
    x: 0.3, y: 0.15, w: 9.4, h: 0.5,
    fontSize: 22, bold: true, color: 'FFFFFF', align: 'left', fontFace: PPT_SAFE_FONTS.primary,
  });

  const termsText = [
    '1. Subject to availability at the time of confirmation',
    '2. Card rates are indicative and subject to negotiation',
    '3. Taxes & statutory charges extra as applicable',
    '4. Artwork approval is mandatory before printing',
    '5. Images shown are indicative and may vary',
    '6. Booking confirmation required within 7 days',
    '7. Installation dates subject to weather and permissions',
  ];

  termsText.forEach((term, idx) => {
    termsSlide.addText(sanitizePptText(term), {
      x: 0.5, y: 1.2 + idx * 0.5, w: 9, h: 0.4,
      fontSize: 14, color: '374151', fontFace: PPT_SAFE_FONTS.primary,
    });
  });

  // Contact info
  termsSlide.addShape(prs.ShapeType.rect, {
    x: 0.5, y: 5.2, w: 9, h: 1.2,
    fill: { color: 'F3F4F6' },
    line: { color: 'E5E7EB', width: 1 },
  });

  termsSlide.addText(sanitizePptText('For queries and bookings, please contact:'), {
    x: 0.6, y: 5.3, w: 8.8, h: 0.4,
    fontSize: 12, bold: true, color: '374151', fontFace: PPT_SAFE_FONTS.primary,
  });

  termsSlide.addText(sanitizePptText(orgSettings.organization_name || 'Go-Ads 360°'), {
    x: 0.6, y: 5.7, w: 8.8, h: 0.4,
    fontSize: 14, bold: true, color: brandColor, fontFace: PPT_SAFE_FONTS.primary,
  });

  termsSlide.addText(sanitizePptText('www.go-ads.in | OOH Media Management Platform'), {
    x: 0.6, y: 6.0, w: 8.8, h: 0.3,
    fontSize: 10, color: '6B7280', fontFace: PPT_SAFE_FONTS.primary,
  });

  // Generate and download
  const tabSuffix = exportTab === 'all' ? '' : `-${exportTab}`;
  await prs.writeFile({ fileName: `media-availability${tabSuffix}-${format(new Date(), 'yyyy-MM-dd')}.pptx` });
}
