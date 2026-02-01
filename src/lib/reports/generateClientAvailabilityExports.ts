/**
 * Client Availability Exports
 * 
 * Generates client-ready exports combining Available + Available Soon assets:
 * 1. Excel: Single sheet with all client-shareable assets
 * 2. PPT: Combined deck with cover, summary, and individual asset slides
 * 
 * CRITICAL: These exports use pre-computed availability results - NO re-querying.
 */

import ExcelJS from "exceljs";
import pptxgen from "pptxgenjs";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { sanitizePptText, PPT_SAFE_FONTS } from "../ppt/sanitizers";
import { fetchImageAsBase64 } from "../qrWatermark";
import { formatAssetDisplayCode } from "@/lib/assets/formatAssetDisplayCode";

// Types matching VacantMediaReport.tsx
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
  availability_status: 'booked' | 'conflict';
  current_booking: BookingInfo | null;
  all_bookings?: BookingInfo[];
  available_from: string | null;
}

interface AvailabilitySummary {
  total_assets: number;
  available_count: number;
  booked_count: number;
  available_soon_count: number;
  conflict_count: number;
  total_sqft_available: number;
  potential_revenue: number;
}

interface ClientExportFilters {
  startDate: string;
  endDate: string;
  city: string;
  mediaType: string;
}

export interface ClientAvailabilityExportData {
  availableAssets: AvailableAsset[];
  availableSoonAssets: BookedAsset[];
  summary: AvailabilitySummary;
  filters: ClientExportFilters;
  companyId?: string;
}

// Column definitions for Client Availability Export
// Order: Area | Location | Direction | Dimensions | Sq.Ft | Illumination | Card Rate | Status | Available From
const CLIENT_EXPORT_COLUMNS = [
  'S.No',
  'Area',
  'Location',
  'Direction',
  'Dimensions',
  'Sq.Ft',
  'Illumination',
  'Card Rate (₹)',
  'Status',
  'Available From',
  'Available Until',
  'Notes',
] as const;

const EXCEL_COLUMN_WIDTHS = [
  6,   // S.No
  15,  // Area
  35,  // Location
  12,  // Direction
  14,  // Dimensions
  10,  // Sq.Ft
  12,  // Illumination
  14,  // Card Rate
  15,  // Status
  14,  // Available From
  14,  // Available Until
  20,  // Notes
];

interface StandardizedClientAsset {
  sNo: number;
  area: string;
  location: string;
  direction: string;
  dimensions: string;
  sqft: number;
  illumination: string;
  cardRate: number;
  status: 'Available' | 'Available Soon';
  availableFrom: string;
  availableUntil: string;
  notes: string;
  // Original data for PPT
  originalAsset: AvailableAsset | BookedAsset;
}

/**
 * Validate export data matches UI counts
 */
export function validateExportData(data: ClientAvailabilityExportData): { valid: boolean; error?: string } {
  const combinedCount = data.availableAssets.length + data.availableSoonAssets.length;
  const expectedCount = data.summary.available_count + data.summary.available_soon_count;

  if (combinedCount !== expectedCount) {
    console.error('Export validation failed:', {
      combinedCount,
      expectedCount,
      availableAssetsLength: data.availableAssets.length,
      availableSoonAssetsLength: data.availableSoonAssets.length,
      summaryAvailable: data.summary.available_count,
      summaryAvailableSoon: data.summary.available_soon_count,
    });
    return {
      valid: false,
      error: `Export data mismatch: Got ${combinedCount} assets but expected ${expectedCount}. Please refresh and re-run availability.`,
    };
  }

  return { valid: true };
}

/**
 * Combine and standardize assets for client export
 */
function standardizeClientAssets(data: ClientAvailabilityExportData): StandardizedClientAsset[] {
  const result: StandardizedClientAsset[] = [];
  let sNo = 1;

  // Add Available assets first
  const availableSorted = [...data.availableAssets].sort((a, b) => {
    // Sort by Available From date (earliest first), then city, area, location
    const dateA = data.filters.startDate;
    const dateB = data.filters.startDate;
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    if (a.city !== b.city) return a.city.localeCompare(b.city);
    if (a.area !== b.area) return a.area.localeCompare(b.area);
    return a.location.localeCompare(b.location);
  });

  for (const asset of availableSorted) {
    result.push({
      sNo: sNo++,
      area: asset.area || '',
      location: asset.location || '',
      direction: asset.direction || 'N/A',
      dimensions: asset.dimensions || 'N/A',
      sqft: asset.total_sqft || 0,
      illumination: asset.illumination_type || 'Non-lit',
      cardRate: asset.card_rate || 0,
      status: 'Available',
      availableFrom: format(new Date(data.filters.startDate), 'dd-MM-yyyy'),
      availableUntil: format(new Date(data.filters.endDate), 'dd-MM-yyyy'),
      notes: '',
      originalAsset: asset,
    });
  }

  // Add Available Soon assets (sorted by next_available_from date)
  const availableSoonSorted = [...data.availableSoonAssets].sort((a, b) => {
    const dateA = a.available_from || '';
    const dateB = b.available_from || '';
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    if (a.city !== b.city) return a.city.localeCompare(b.city);
    if (a.area !== b.area) return a.area.localeCompare(b.area);
    return a.location.localeCompare(b.location);
  });

  for (const asset of availableSoonSorted) {
    const availableFrom = asset.available_from 
      ? format(new Date(asset.available_from), 'dd-MM-yyyy')
      : 'TBD';
    
    result.push({
      sNo: sNo++,
      area: asset.area || '',
      location: asset.location || '',
      direction: asset.direction || 'N/A',
      dimensions: asset.dimensions || 'N/A',
      sqft: asset.total_sqft || 0,
      illumination: asset.illumination_type || 'Non-lit',
      cardRate: asset.card_rate || 0,
      status: 'Available Soon',
      availableFrom: availableFrom,
      availableUntil: format(new Date(data.filters.endDate), 'dd-MM-yyyy'),
      notes: asset.current_booking 
        ? `Current: ${asset.current_booking.campaign_name}` 
        : '',
      originalAsset: asset,
    });
  }

  return result;
}

// ==================== EXCEL EXPORT ====================
export async function generateClientAvailabilityExcel(data: ClientAvailabilityExportData): Promise<void> {
  // Validate before export
  const validation = validateExportData(data);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Client Availability", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true },
  });

  worksheet.columns = EXCEL_COLUMN_WIDTHS.map((width) => ({ width }));

  const standardized = standardizeClientAssets(data);
  let row = 1;

  // ===== HEADER BLOCK =====
  // Title
  worksheet.mergeCells(`A${row}:N${row}`);
  const titleCell = worksheet.getRow(row).getCell(1);
  titleCell.value = "MEDIA AVAILABILITY REPORT";
  titleCell.font = { size: 18, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(row).height = 30;
  row++;

  // Date Range
  worksheet.mergeCells(`A${row}:N${row}`);
  const dateRangeCell = worksheet.getRow(row).getCell(1);
  const startDateFormatted = format(new Date(data.filters.startDate), 'dd MMM yyyy');
  const endDateFormatted = format(new Date(data.filters.endDate), 'dd MMM yyyy');
  dateRangeCell.value = `Date Range: ${startDateFormatted} → ${endDateFormatted}`;
  dateRangeCell.font = { size: 12, bold: true };
  dateRangeCell.alignment = { horizontal: "center" };
  worksheet.getRow(row).height = 22;
  row++;

  // Filters
  const filters: string[] = [];
  if (data.filters.city && data.filters.city !== 'all') filters.push(`City: ${data.filters.city}`);
  if (data.filters.mediaType && data.filters.mediaType !== 'all') filters.push(`Type: ${data.filters.mediaType}`);
  
  worksheet.mergeCells(`A${row}:N${row}`);
  const filtersCell = worksheet.getRow(row).getCell(1);
  filtersCell.value = filters.length > 0 ? `Filters: ${filters.join(', ')}` : 'Filters: None';
  filtersCell.font = { size: 10, italic: true };
  filtersCell.alignment = { horizontal: "center" };
  worksheet.getRow(row).height = 20;
  row++;

  // Generated At
  worksheet.mergeCells(`A${row}:N${row}`);
  const generatedCell = worksheet.getRow(row).getCell(1);
  generatedCell.value = `Generated At: ${format(new Date(), 'dd MMM yyyy, HH:mm')}`;
  generatedCell.font = { size: 10 };
  generatedCell.alignment = { horizontal: "center" };
  worksheet.getRow(row).height = 20;
  row++;

  // Empty row
  row++;

  // ===== TOTALS SUMMARY =====
  worksheet.getRow(row).values = [
    "Available:",
    data.summary.available_count,
    "",
    "Available Soon:",
    data.summary.available_soon_count,
    "",
    "Total Shared with Client:",
    data.summary.available_count + data.summary.available_soon_count,
  ];
  worksheet.getRow(row).font = { bold: true };
  worksheet.getRow(row).height = 25;
  
  // Highlight totals
  worksheet.getRow(row).getCell(2).font = { bold: true, color: { argb: "FF22C55E" } }; // Green for available
  worksheet.getRow(row).getCell(5).font = { bold: true, color: { argb: "FFEAB308" } }; // Yellow for soon
  worksheet.getRow(row).getCell(8).font = { bold: true, color: { argb: "FF1E3A8A" } }; // Blue for total
  row += 2;

  // ===== COLUMN HEADERS =====
  const headerRow = worksheet.getRow(row);
  headerRow.values = [...CLIENT_EXPORT_COLUMNS];
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3B82F6" } };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });
  
  // Freeze the header row
  worksheet.views = [{ state: 'frozen', ySplit: row }];
  row++;

  // ===== DATA ROWS =====
  standardized.forEach((asset, idx) => {
    const dataRow = worksheet.getRow(row);
    dataRow.values = [
      asset.sNo,
      asset.area,
      asset.location,
      asset.direction,
      asset.dimensions,
      asset.sqft,
      asset.illumination,
      asset.cardRate,
      asset.status,
      asset.availableFrom,
      asset.availableUntil,
      asset.notes,
    ];

    // Format Card Rate as currency
    const rateCell = dataRow.getCell(8);
    rateCell.numFmt = '₹#,##0';

    // Style status cell with color
    const statusCell = dataRow.getCell(9);
    if (asset.status === 'Available') {
      statusCell.font = { bold: true, color: { argb: "FF22C55E" } };
    } else {
      statusCell.font = { bold: true, color: { argb: "FFEAB308" } };
    }

    // Borders and alignment
    dataRow.eachCell((cell, colNumber) => {
      cell.alignment = {
        horizontal: [3, 12].includes(colNumber) ? "left" : "center",
        vertical: "middle",
        wrapText: colNumber === 3 || colNumber === 12, // Wrap location and notes
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFD1D5DB" } },
        left: { style: "thin", color: { argb: "FFD1D5DB" } },
        bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
        right: { style: "thin", color: { argb: "FFD1D5DB" } },
      };
    });

    // Alternate row colors
    if (idx % 2 === 0) {
      dataRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
    }
    
    dataRow.height = 22;
    row++;
  });

  // ===== FOOTER =====
  row++;
  worksheet.mergeCells(`A${row}:N${row}`);
  const footerRow = worksheet.getRow(row);
  footerRow.getCell(1).value = "Go-Ads 360° | OOH Media Management Platform";
  footerRow.getCell(1).font = { size: 10, italic: true, color: { argb: "FF6B7280" } };
  footerRow.getCell(1).alignment = { horizontal: "center" };

  // Generate file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  
  const startStr = format(new Date(data.filters.startDate), 'ddMMMyy');
  const endStr = format(new Date(data.filters.endDate), 'ddMMMyy');
  link.download = `Client_Availability_${startStr}to${endStr}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}

// ==================== PPT EXPORT ====================

// Image cache
const imageCache = new Map<string, string>();

// Placeholder image
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

// QR cache
const qrCache = new Map<string, { base64: string }>();

async function getCachedQR(assetId: string, qrCodeUrl: string | undefined | null): Promise<{ base64: string } | null> {
  if (!qrCodeUrl) return null;

  const cacheKey = `${assetId}-${qrCodeUrl}`;
  if (qrCache.has(cacheKey)) {
    return qrCache.get(cacheKey)!;
  }

  try {
    const base64 = await fetchImageAsBase64(qrCodeUrl);
    if (!base64) return null;
    const result = { base64 };
    qrCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.warn(`Failed to fetch QR for asset ${assetId}:`, error);
    return null;
  }
}

async function fetchAssetPhoto(asset: AvailableAsset | BookedAsset): Promise<string | null> {
  // Priority 1: Photo Library (media_photos)
  try {
    const { data: libraryPhotos } = await supabase
      .from('media_photos')
      .select('photo_url, category, uploaded_at')
      .eq('asset_id', asset.id)
      .order('uploaded_at', { ascending: false })
      .limit(5);

    if (libraryPhotos?.length) {
      for (const photo of libraryPhotos) {
        if (photo.photo_url) {
          const img = await fetchImageWithCache(photo.photo_url);
          if (img) return img;
        }
      }
    }
  } catch (e) {
    console.warn('Failed to fetch Photo Library images:', e);
  }

  // Priority 2: primary_photo_url from asset
  if ((asset as any).primary_photo_url) {
    const img = await fetchImageWithCache((asset as any).primary_photo_url);
    if (img) return img;
  }

  // Fallback: placeholder
  return await getPlaceholderPngDataUrl();
}

function formatMultiFaceDimensions(dimensions: string | null | undefined): string {
  if (!dimensions) return 'N/A';
  const trimmed = dimensions.trim();
  if (!trimmed) return 'N/A';

  const hasDash = /\d\s*[-–—]\s*\d/.test(trimmed);
  if (hasDash) {
    const normalized = trimmed
      .replace(/\s*[-–—]\s*/g, ' - ')
      .replace(/\s*[xX×]\s*/g, 'x');
    return `${normalized} ft`;
  }

  const match = trimmed.match(/(\d+\.?\d*)\s*[xX×]\s*(\d+\.?\d*)/);
  if (match) {
    return `${match[1]} x ${match[2]} ft`;
  }

  return trimmed;
}

interface OrganizationSettings {
  organization_name?: string;
  logo_url?: string;
  primary_color?: string;
}

export async function generateClientAvailabilityPPT(data: ClientAvailabilityExportData): Promise<void> {
  // Validate before export
  const validation = validateExportData(data);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const prs = new pptxgen();
  prs.author = 'Go-Ads 360°';
  prs.company = 'Go-Ads 360°';
  
  const startDateFormatted = format(new Date(data.filters.startDate), 'dd MMM yyyy');
  const endDateFormatted = format(new Date(data.filters.endDate), 'dd MMM yyyy');
  const dateRange = `${startDateFormatted} - ${endDateFormatted}`;
  
  prs.title = `Media Availability Report - ${dateRange}`;

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
  const warningYellow = 'EAB308';

  const standardized = standardizeClientAssets(data);
  const totalAssets = standardized.length;

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

  coverSlide.addText(sanitizePptText(`${totalAssets} Available Media Assets`), {
    x: 0.5, y: 2.5, w: 9, h: 1.2,
    fontSize: 42, bold: true, color: 'FFFFFF', align: 'center', fontFace: PPT_SAFE_FONTS.primary,
  });

  coverSlide.addText(sanitizePptText('FOR CLIENT REVIEW'), {
    x: 0.5, y: 4.0, w: 9, h: 0.6,
    fontSize: 22, color: 'E5E7EB', align: 'center', fontFace: PPT_SAFE_FONTS.primary,
  });

  coverSlide.addText(sanitizePptText(dateRange), {
    x: 0.5, y: 4.8, w: 9, h: 0.5,
    fontSize: 18, color: 'FFFFFF', align: 'center', fontFace: PPT_SAFE_FONTS.primary,
  });

  // Filters info
  const filters: string[] = [];
  if (data.filters.city && data.filters.city !== 'all') filters.push(`City: ${data.filters.city}`);
  if (data.filters.mediaType && data.filters.mediaType !== 'all') filters.push(`Type: ${data.filters.mediaType}`);
  
  if (filters.length > 0) {
    coverSlide.addText(sanitizePptText(`Filters: ${filters.join(' | ')}`), {
      x: 0.5, y: 5.3, w: 9, h: 0.4,
      fontSize: 12, color: 'E5E7EB', align: 'center', fontFace: PPT_SAFE_FONTS.primary,
    });
  }

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

  // Summary cards - only Available and Available Soon
  const summaryCards = [
    { label: 'Available', count: data.summary.available_count, color: successGreen },
    { label: 'Available Soon', count: data.summary.available_soon_count, color: warningYellow },
    { label: 'Total for Client', count: totalAssets, color: brandColor },
  ];

  summaryCards.forEach((card, idx) => {
    const xPos = 0.8 + idx * 3.0;

    summarySlide.addShape(prs.ShapeType.rect, {
      x: xPos, y: 1.2, w: 2.6, h: 1.6,
      fill: { color: card.color },
      line: { color: card.color, width: 0 },
    });

    summarySlide.addText(card.count.toString(), {
      x: xPos, y: 1.4, w: 2.6, h: 0.9,
      fontSize: 40, bold: true, color: 'FFFFFF', align: 'center', fontFace: PPT_SAFE_FONTS.primary,
    });

    summarySlide.addText(sanitizePptText(card.label), {
      x: xPos, y: 2.3, w: 2.6, h: 0.4,
      fontSize: 13, color: 'FFFFFF', align: 'center', fontFace: PPT_SAFE_FONTS.primary,
    });
  });

  // Summary table
  const summaryData = [
    [{ text: sanitizePptText('Report Period') }, { text: sanitizePptText(dateRange) }],
    [{ text: sanitizePptText('Company') }, { text: sanitizePptText(orgSettings.organization_name || 'Go-Ads 360°') }],
    [{ text: sanitizePptText('Total Assets') }, { text: sanitizePptText(`${totalAssets} sites`) }],
    [{ text: sanitizePptText('Generated') }, { text: sanitizePptText(format(new Date(), 'dd MMM yyyy, HH:mm')) }],
  ];

  summarySlide.addTable(summaryData, {
    x: 0.5, y: 3.2, w: 9, colW: [3, 6],
    border: { type: 'solid', color: 'E5E7EB', pt: 0.5 },
    fontFace: PPT_SAFE_FONTS.primary,
    fontSize: 14,
    valign: 'middle',
    rowH: 0.5,
    fill: { color: 'F9FAFB' },
  });

  // ===== ASSET SLIDES =====
  for (let i = 0; i < totalAssets; i++) {
    const asset = standardized[i];
    const originalAsset = asset.originalAsset;
    const isAvailableSoon = asset.status === 'Available Soon';
    const statusColor = isAvailableSoon ? warningYellow : successGreen;
    const statusLabel = isAvailableSoon ? 'AVAILABLE SOON' : 'AVAILABLE';

    // Fetch asset photo
    const photoBase64 = await fetchAssetPhoto(originalAsset);

    // Fetch QR code
    const qrData = await getCachedQR(originalAsset.id, (originalAsset as any).qr_code_url);

    // Format dimensions
    const formattedDimensions = formatMultiFaceDimensions(originalAsset.dimensions);

    const slide = prs.addSlide();

    // Border frame
    slide.addShape(prs.ShapeType.rect, {
      x: 0.15, y: 0.15, w: 9.7, h: 7.2,
      fill: { color: 'FFFFFF' },
      line: { color: brandColor, width: 6 },
    });

    // Asset ID header
    const displayAssetCode = formatAssetDisplayCode({
      mediaAssetCode: originalAsset.media_asset_code,
      fallbackId: originalAsset.id,
    });
    slide.addText(sanitizePptText(displayAssetCode), {
      x: 0.3, y: 0.4, w: 7, h: 0.4,
      fontSize: 14, bold: true, color: '6B7280', align: 'left', fontFace: PPT_SAFE_FONTS.primary,
    });

    // Status badge (top right)
    slide.addShape(prs.ShapeType.rect, {
      x: 7.3, y: 0.35, w: 2.4, h: 0.5,
      fill: { color: statusColor },
    });
    slide.addText(sanitizePptText(statusLabel), {
      x: 7.3, y: 0.4, w: 2.4, h: 0.4,
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

    // QR code overlay
    if (qrData) {
      try {
        const qrSize = 0.8;
        const qrPadding = 0.15;
        slide.addImage({
          data: qrData.base64,
          x: 0.4 + 5 - qrSize - qrPadding,
          y: 1.4 + 4 - qrSize - qrPadding,
          w: qrSize,
          h: qrSize,
        });
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

    // Details table - use originalAsset for city/mediaType
    const originalAssetData = asset.originalAsset as any;
    const detailsTableData = [
      [{ text: sanitizePptText('Area'), options: { bold: true } }, { text: sanitizePptText(asset.area) }],
      [{ text: sanitizePptText('Location'), options: { bold: true } }, { text: sanitizePptText(asset.location) }],
      [{ text: sanitizePptText('Direction'), options: { bold: true } }, { text: sanitizePptText(asset.direction) }],
      [{ text: sanitizePptText('Dimensions'), options: { bold: true } }, { text: sanitizePptText(formattedDimensions) }],
      [{ text: sanitizePptText('Sq.Ft'), options: { bold: true } }, { text: sanitizePptText(asset.sqft?.toString() || 'N/A') }],
      [{ text: sanitizePptText('Illumination'), options: { bold: true } }, { text: sanitizePptText(asset.illumination) }],
      [{ text: sanitizePptText('Card Rate'), options: { bold: true } }, { text: sanitizePptText(`Rs. ${asset.cardRate.toLocaleString('en-IN')}/month`) }],
      [{ text: sanitizePptText('Available From'), options: { bold: true } }, { text: sanitizePptText(asset.availableFrom) }],
    ];

    slide.addTable(detailsTableData, {
      x: 5.7, y: 1.5, w: 3.8, colW: [1.4, 2.4],
      border: { type: 'solid', color: 'E5E7EB', pt: 0.5 },
      fontFace: PPT_SAFE_FONTS.primary,
      fontSize: 10,
      valign: 'middle',
      rowH: 0.35,
      fill: { color: 'FFFFFF' },
    });

    // Footer bar
    slide.addShape(prs.ShapeType.rect, {
      x: 0.15, y: 6.85, w: 9.7, h: 0.5,
      fill: { color: brandColor },
    });

    slide.addText(
      sanitizePptText(`${orgSettings.organization_name || 'Go-Ads 360°'} | Asset ${i + 1} of ${totalAssets} | Generated: ${format(new Date(), 'dd MMM yyyy')}`),
      {
        x: 0.3, y: 6.95, w: 9.4, h: 0.35,
        fontSize: 10, color: 'FFFFFF', align: 'center', fontFace: PPT_SAFE_FONTS.primary,
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
  const startStr = format(new Date(data.filters.startDate), 'ddMMMyy');
  const endStr = format(new Date(data.filters.endDate), 'ddMMMyy');
  await prs.writeFile({ fileName: `Client_Availability_${startStr}to${endStr}.pptx` });
}
