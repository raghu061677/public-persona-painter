// supabase/functions/generate-vacant-media-ppt/index.ts
// Generates a professional PowerPoint presentation for vacant media availability report

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import PptxGenJS from "https://esm.sh/pptxgenjs@3.12.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RequestBody {
  company_id: string;
  asset_ids: string[];
  start_date: string;
  end_date: string;
  export_tab?: 'available' | 'booked' | 'soon' | 'conflict' | 'all';
  filters?: {
    city?: string;
    area?: string[];
    media_type?: string;
  };
}

interface BookingInfo {
  campaign_id: string;
  campaign_name: string;
  client_name: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface AssetWithAvailability {
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
  direction: string | null;
  illumination_type: string | null;
  latitude: number | null;
  longitude: number | null;
  primary_photo_url: string | null;
  images: string[] | null;
  google_street_view_url: string | null;
  qr_code_url: string | null;
  availability_status: 'available' | 'booked' | 'available_soon' | 'conflict';
  current_booking: BookingInfo | null;
  available_from: string | null;
  latest_campaign_name?: string | null;
  latest_photo_date?: string | null;
}

// Sanitize text for PowerPoint XML
function sanitizePptText(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .replace(/→/g, '->')
    .replace(/←/g, '<-')
    .replace(/↔/g, '<->')
    .replace(/–/g, '-')
    .replace(/—/g, '-')
    .replace(/'/g, "'")
    .replace(/'/g, "'")
    .replace(/"/g, '"')
    .replace(/"/g, '"')
    .replace(/…/g, '...')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/[\uFFFE\uFFFF]/g, '');
}

// Sanitize hyperlinks for PowerPoint XML attributes
function sanitizePptHyperlink(url: string | null | undefined): string | undefined {
  if (!url || typeof url !== 'string' || url.trim() === '') return undefined;
  
  return url
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Generate QR code as base64 using external API
async function generateQRCodeBase64(data: string): Promise<string | null> {
  try {
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}`;
    const response = await fetch(qrApiUrl, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    return `data:image/png;base64,${btoa(binary)}`;
  } catch (error) {
    console.error('QR code generation error:', error);
    return null;
  }
}

// Fetch image as base64
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { 
      headers: { 'Accept': 'image/*' },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) return null;
    
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64 = btoa(binary);
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error('Image fetch error:', error);
    return null;
  }
}

// Get status color based on availability
function getStatusColor(status: string): string {
  switch (status) {
    case 'available': return '22C55E'; // Green
    case 'booked': return 'DC2626'; // Red
    case 'available_soon': return 'EAB308'; // Yellow/Amber
    case 'conflict': return 'F97316'; // Orange
    default: return '6B7280'; // Gray
  }
}

// Get status label
function getStatusLabel(status: string, availableFrom?: string | null): string {
  switch (status) {
    case 'available': return 'AVAILABLE';
    case 'booked': return 'BOOKED';
    case 'available_soon': return availableFrom ? `AVAILABLE SOON (${availableFrom})` : 'AVAILABLE SOON';
    case 'conflict': return 'CONFLICT';
    default: return status.toUpperCase();
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonError("Only POST is allowed", 405);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth check
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return jsonError('Unauthorized', 401);
    }

    const body = await req.json().catch(() => null) as RequestBody | null;
    if (!body) {
      return jsonError("Invalid request body", 400);
    }

    const { company_id, asset_ids, start_date, end_date, export_tab, filters } = body;

    if (!company_id || !asset_ids || asset_ids.length === 0 || !start_date || !end_date) {
      return jsonError("Missing required fields: company_id, asset_ids, start_date, end_date", 400);
    }

    console.log(`[generate-vacant-media-ppt] Generating PPT for ${asset_ids.length} assets`);

    // Verify user access
    const { data: companyUser } = await supabase
      .from('company_users')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('company_id', company_id)
      .eq('status', 'active')
      .single();
    
    if (!companyUser) {
      return jsonError('Unauthorized', 403);
    }

    // Fetch company details
    const { data: company } = await supabase
      .from('companies')
      .select('name, logo_url')
      .eq('id', company_id)
      .single();

    // Fetch assets with all required details
    const { data: assets, error: assetsError } = await supabase
      .from('media_assets')
      .select(`
        id,
        media_asset_code,
        city,
        area,
        location,
        media_type,
        dimensions,
        card_rate,
        total_sqft,
        status,
        direction,
        illumination_type,
        latitude,
        longitude,
        primary_photo_url,
        images,
        google_street_view_url,
        qr_code_url,
        booked_from,
        booked_to,
        current_campaign_id
      `)
      .eq('company_id', company_id)
      .in('id', asset_ids);

    if (assetsError) {
      console.error('[generate-vacant-media-ppt] Error fetching assets:', assetsError);
      return jsonError('Failed to fetch assets', 500);
    }

    if (!assets || assets.length === 0) {
      return jsonError('No assets found', 404);
    }

    const searchStart = new Date(start_date);
    const searchEnd = new Date(end_date);

    // Fetch campaign bookings for these assets
    const { data: allBookings } = await supabase
      .from('campaign_assets')
      .select(`
        asset_id,
        campaign_id,
        booking_start_date,
        booking_end_date,
        photos,
        created_at,
        campaigns (
          id,
          campaign_name,
          client_name,
          start_date,
          end_date,
          status
        )
      `)
      .in('asset_id', asset_ids)
      .order('created_at', { ascending: false });

    // Build booking maps
    const assetBookingMap = new Map<string, BookingInfo[]>();
    const assetLatestCampaignMap = new Map<string, { name: string; photos: any; photoDate: string | null }>();

    for (const booking of (allBookings || [])) {
      const campaign = booking.campaigns as any;
      if (!campaign) continue;

      const bookingStart = booking.booking_start_date || campaign.start_date;
      const bookingEnd = booking.booking_end_date || campaign.end_date;
      if (!bookingStart || !bookingEnd) continue;

      const bStart = new Date(bookingStart);
      const bEnd = new Date(bookingEnd);

      // Store latest campaign for images
      if (!assetLatestCampaignMap.has(booking.asset_id)) {
        assetLatestCampaignMap.set(booking.asset_id, {
          name: campaign.campaign_name || 'Unknown Campaign',
          photos: booking.photos,
          photoDate: booking.created_at,
        });
      }

      // Check if overlaps with search range
      const activeStatuses = ['Draft', 'Upcoming', 'Running'];
      if (!activeStatuses.includes(campaign.status)) continue;

      const hasOverlap = bStart <= searchEnd && bEnd >= searchStart;
      if (hasOverlap) {
        const existing = assetBookingMap.get(booking.asset_id) || [];
        existing.push({
          campaign_id: campaign.id,
          campaign_name: campaign.campaign_name || 'Unnamed Campaign',
          client_name: campaign.client_name || 'Unknown Client',
          start_date: bookingStart,
          end_date: bookingEnd,
          status: campaign.status,
        });
        assetBookingMap.set(booking.asset_id, existing);
      }
    }

    // Process assets with availability status
    const assetsWithAvailability: AssetWithAvailability[] = assets.map(asset => {
      const bookings = assetBookingMap.get(asset.id) || [];
      const latestCampaign = assetLatestCampaignMap.get(asset.id);
      
      let availability_status: 'available' | 'booked' | 'available_soon' | 'conflict' = 'available';
      let available_from: string | null = null;
      let current_booking: BookingInfo | null = null;

      if (bookings.length > 1) {
        availability_status = 'conflict';
        current_booking = bookings[0];
      } else if (bookings.length === 1) {
        availability_status = 'booked';
        current_booking = bookings[0];
        // Check if becomes available during search period
        const bookingEnd = new Date(bookings[0].end_date);
        if (bookingEnd <= searchEnd) {
          const nextDay = new Date(bookingEnd);
          nextDay.setDate(nextDay.getDate() + 1);
          available_from = nextDay.toISOString().split('T')[0];
          availability_status = 'available_soon';
        }
      } else if (asset.status === 'Booked' && asset.booked_to) {
        const bookedTo = new Date(asset.booked_to);
        if (bookedTo < searchStart) {
          availability_status = 'available';
        } else if (bookedTo <= searchEnd) {
          availability_status = 'available_soon';
          const nextDay = new Date(bookedTo);
          nextDay.setDate(nextDay.getDate() + 1);
          available_from = nextDay.toISOString().split('T')[0];
        } else {
          availability_status = 'booked';
        }
      }

      return {
        ...asset,
        availability_status,
        current_booking,
        available_from,
        latest_campaign_name: latestCampaign?.name || null,
        latest_photo_date: latestCampaign?.photoDate || null,
      };
    });

    // Filter based on export_tab
    let filteredAssets = assetsWithAvailability;
    if (export_tab && export_tab !== 'all') {
      filteredAssets = assetsWithAvailability.filter(a => {
        switch (export_tab) {
          case 'available': return a.availability_status === 'available';
          case 'booked': return a.availability_status === 'booked';
          case 'soon': return a.availability_status === 'available_soon';
          case 'conflict': return a.availability_status === 'conflict';
          default: return true;
        }
      });
    }

    console.log(`[generate-vacant-media-ppt] Processing ${filteredAssets.length} assets for PPT`);

    // Generate PPT
    const pptx = new PptxGenJS();
    pptx.author = 'Go-Ads 360°';
    pptx.company = company?.name || 'Go-Ads 360°';
    pptx.title = `Media Availability Report - ${start_date} to ${end_date}`;
    pptx.layout = 'LAYOUT_16x9';

    const brandBlue = '1E3A8A';
    const lightGray = 'F8FAFC';

    // Summary stats
    const availableCount = assetsWithAvailability.filter(a => a.availability_status === 'available').length;
    const bookedCount = assetsWithAvailability.filter(a => a.availability_status === 'booked').length;
    const soonCount = assetsWithAvailability.filter(a => a.availability_status === 'available_soon').length;
    const conflictCount = assetsWithAvailability.filter(a => a.availability_status === 'conflict').length;

    // ===== COVER SLIDE =====
    const coverSlide = pptx.addSlide();
    coverSlide.background = { color: brandBlue };

    coverSlide.addText(sanitizePptText('MEDIA AVAILABILITY REPORT'), {
      x: 0.5, y: 1.5, w: 9, h: 0.8,
      fontSize: 36, bold: true, color: 'FFFFFF', align: 'center', fontFace: 'Arial',
    });

    const titleLabel = export_tab && export_tab !== 'all' 
      ? export_tab.toUpperCase().replace('SOON', 'AVAILABLE SOON') 
      : 'ALL ASSETS';
    coverSlide.addText(sanitizePptText(titleLabel), {
      x: 0.5, y: 2.3, w: 9, h: 0.5,
      fontSize: 20, color: 'FFFFFF', align: 'center', fontFace: 'Arial',
    });

    coverSlide.addText(sanitizePptText(`${start_date} to ${end_date}`), {
      x: 0.5, y: 3.0, w: 9, h: 0.5,
      fontSize: 18, color: '94A3B8', align: 'center', fontFace: 'Arial',
    });

    if (filters?.city && filters.city !== 'all') {
      coverSlide.addText(sanitizePptText(`City: ${filters.city}`), {
        x: 0.5, y: 3.5, w: 9, h: 0.4,
        fontSize: 14, color: '94A3B8', align: 'center', fontFace: 'Arial',
      });
    }

    // Company branding
    coverSlide.addText(sanitizePptText(company?.name || 'Go-Ads 360°'), {
      x: 0.5, y: 4.2, w: 9, h: 0.4,
      fontSize: 14, color: '94A3B8', align: 'center', fontFace: 'Arial',
    });

    const generatedDate = new Date().toLocaleDateString('en-IN', { 
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
    coverSlide.addText(sanitizePptText(`Generated: ${generatedDate}`), {
      x: 0.5, y: 4.6, w: 9, h: 0.3,
      fontSize: 10, color: '64748B', align: 'center', fontFace: 'Arial',
    });

    // ===== SUMMARY SLIDE =====
    const summarySlide = pptx.addSlide();
    summarySlide.background = { color: 'FFFFFF' };

    summarySlide.addText(sanitizePptText('AVAILABILITY SUMMARY'), {
      x: 0.5, y: 0.3, w: 9, h: 0.6,
      fontSize: 28, bold: true, color: brandBlue, fontFace: 'Arial',
    });

    // Summary cards
    const cardY = 1.2;
    const cardH = 1.2;
    const cardW = 2;
    const cardGap = 0.3;

    const summaryCards = [
      { label: 'Available', count: availableCount, color: '22C55E' },
      { label: 'Booked', count: bookedCount, color: 'DC2626' },
      { label: 'Available Soon', count: soonCount, color: 'EAB308' },
      { label: 'Conflicts', count: conflictCount, color: 'F97316' },
    ];

    summaryCards.forEach((card, index) => {
      const cardX = 0.5 + index * (cardW + cardGap);
      
      summarySlide.addShape('rect', {
        x: cardX, y: cardY, w: cardW, h: cardH,
        fill: { color: card.color }, line: { color: card.color, width: 0 },
      });

      summarySlide.addText(card.count.toString(), {
        x: cardX, y: cardY + 0.2, w: cardW, h: 0.6,
        fontSize: 32, bold: true, color: 'FFFFFF', align: 'center', fontFace: 'Arial',
      });

      summarySlide.addText(sanitizePptText(card.label), {
        x: cardX, y: cardY + 0.8, w: cardW, h: 0.3,
        fontSize: 11, color: 'FFFFFF', align: 'center', fontFace: 'Arial',
      });
    });

    // Areas list
    const areas = [...new Set(filteredAssets.map(a => a.area))].filter(Boolean).slice(0, 10);
    if (areas.length > 0) {
      summarySlide.addText(sanitizePptText('Areas Covered:'), {
        x: 0.5, y: 2.8, w: 9, h: 0.4,
        fontSize: 14, bold: true, color: '374151', fontFace: 'Arial',
      });
      summarySlide.addText(sanitizePptText(areas.join(', ')), {
        x: 0.5, y: 3.2, w: 9, h: 0.5,
        fontSize: 11, color: '6B7280', fontFace: 'Arial',
      });
    }

    // Footer
    summarySlide.addText(sanitizePptText('Go-Ads 360° | OOH Media Management Platform'), {
      x: 0.5, y: 5.1, w: 9, h: 0.3,
      fontSize: 9, color: '94A3B8', align: 'center', fontFace: 'Arial',
    });

    // ===== ASSET SLIDES (1 per asset) =====
    const baseUrl = Deno.env.get('SITE_URL') || 'https://go-ads.lovable.app';

    for (const asset of filteredAssets.slice(0, 50)) { // Limit to 50 assets for performance
      const slide = pptx.addSlide();
      slide.background = { color: 'FFFFFF' };

      // Header with asset code
      const statusColor = getStatusColor(asset.availability_status);
      slide.addShape('rect', {
        x: 0, y: 0, w: 10, h: 0.6,
        fill: { color: brandBlue },
      });

      slide.addText(sanitizePptText(asset.media_asset_code || asset.id), {
        x: 0.3, y: 0.12, w: 5, h: 0.35,
        fontSize: 16, bold: true, color: 'FFFFFF', fontFace: 'Arial',
      });

      // Status badge
      slide.addShape('rect', {
        x: 7.8, y: 0.1, w: 1.9, h: 0.4,
        fill: { color: statusColor },
      });
      slide.addText(sanitizePptText(getStatusLabel(asset.availability_status, asset.available_from)), {
        x: 7.8, y: 0.15, w: 1.9, h: 0.3,
        fontSize: 9, bold: true, color: 'FFFFFF', align: 'center', fontFace: 'Arial',
      });

      // Left side: Main image
      let mainImageAdded = false;
      
      // Try to get image from various sources
      let imageUrl = asset.primary_photo_url;
      if (!imageUrl && asset.images && Array.isArray(asset.images) && asset.images.length > 0) {
        imageUrl = asset.images[0];
      }

      if (imageUrl) {
        const base64Image = await fetchImageAsBase64(imageUrl);
        if (base64Image) {
          slide.addImage({
            data: base64Image,
            x: 0.3, y: 0.8, w: 4.5, h: 3.4,
          });
          mainImageAdded = true;
        }
      }

      if (!mainImageAdded) {
        // Placeholder for no image
        slide.addShape('rect', {
          x: 0.3, y: 0.8, w: 4.5, h: 3.4,
          fill: { color: 'F3F4F6' },
          line: { color: 'E5E7EB', width: 1 },
        });
        slide.addText(sanitizePptText('No Photo Available'), {
          x: 0.3, y: 2.3, w: 4.5, h: 0.4,
          fontSize: 14, color: '9CA3AF', align: 'center', fontFace: 'Arial',
        });
      }

      // Right side: Details card
      const detailsX = 5.0;
      const detailsW = 4.5;
      
      slide.addShape('rect', {
        x: detailsX, y: 0.8, w: detailsW, h: 3.4,
        fill: { color: 'F8FAFC' },
        line: { color: 'E2E8F0', width: 1 },
      });

      // Asset details
      const details = [
        { label: 'Area', value: asset.area || '-' },
        { label: 'Location', value: asset.location || '-' },
        { label: 'Direction', value: asset.direction || '-' },
        { label: 'Dimensions', value: asset.dimensions || '-' },
        { label: 'Illumination', value: asset.illumination_type || 'No' },
        { label: 'Card Rate', value: `Rs. ${(asset.card_rate || 0).toLocaleString('en-IN')}` },
      ];

      if (asset.current_booking) {
        details.push({ label: 'Campaign', value: asset.current_booking.campaign_name });
      }

      if (asset.available_from) {
        details.push({ label: 'Available From', value: asset.available_from });
      }

      let detailY = 0.95;
      for (const detail of details) {
        slide.addText(sanitizePptText(detail.label + ':'), {
          x: detailsX + 0.15, y: detailY, w: 1.3, h: 0.3,
          fontSize: 9, bold: true, color: '4B5563', fontFace: 'Arial',
        });
        slide.addText(sanitizePptText(detail.value), {
          x: detailsX + 1.5, y: detailY, w: 2.8, h: 0.3,
          fontSize: 9, color: '1F2937', fontFace: 'Arial',
        });
        detailY += 0.32;
      }

      // QR Code section (bottom right of details card)
      const assetShareUrl = `${baseUrl}/share/asset/${asset.id}`;
      const qrBase64 = await generateQRCodeBase64(assetShareUrl);
      
      if (qrBase64) {
        slide.addImage({
          data: qrBase64,
          x: detailsX + 3.2, y: 3.0, w: 1.0, h: 1.0,
        });
        
        // Short URL text below QR
        slide.addText(sanitizePptText('Scan for Details'), {
          x: detailsX + 2.8, y: 4.0, w: 1.5, h: 0.2,
          fontSize: 7, color: '6B7280', align: 'center', fontFace: 'Arial',
        });
      }

      // Footer
      slide.addText(sanitizePptText('Go-Ads 360° | OOH Media Management Platform'), {
        x: 0.3, y: 5.1, w: 7, h: 0.3,
        fontSize: 8, color: '94A3B8', fontFace: 'Arial',
      });

      slide.addText(sanitizePptText(asset.city || ''), {
        x: 7.5, y: 5.1, w: 2, h: 0.3,
        fontSize: 8, color: '94A3B8', align: 'right', fontFace: 'Arial',
      });
    }

    // ===== APPENDIX SLIDE =====
    const appendixSlide = pptx.addSlide();
    appendixSlide.background = { color: lightGray };

    appendixSlide.addText(sanitizePptText('Terms & Conditions'), {
      x: 0.5, y: 1.5, w: 9, h: 0.6,
      fontSize: 24, bold: true, color: brandBlue, align: 'center', fontFace: 'Arial',
    });

    appendixSlide.addText(sanitizePptText('• All rates are subject to confirmation at the time of booking'), {
      x: 1, y: 2.3, w: 8, h: 0.4,
      fontSize: 12, color: '4B5563', fontFace: 'Arial',
    });

    appendixSlide.addText(sanitizePptText('• Availability may change without prior notice'), {
      x: 1, y: 2.7, w: 8, h: 0.4,
      fontSize: 12, color: '4B5563', fontFace: 'Arial',
    });

    appendixSlide.addText(sanitizePptText('• GST and other applicable taxes will be charged extra'), {
      x: 1, y: 3.1, w: 8, h: 0.4,
      fontSize: 12, color: '4B5563', fontFace: 'Arial',
    });

    appendixSlide.addText(sanitizePptText('For inquiries, please contact your account manager'), {
      x: 0.5, y: 4.0, w: 9, h: 0.4,
      fontSize: 12, color: '6B7280', align: 'center', fontFace: 'Arial',
    });

    appendixSlide.addText(sanitizePptText(company?.name || 'Go-Ads 360°'), {
      x: 0.5, y: 4.6, w: 9, h: 0.4,
      fontSize: 14, bold: true, color: brandBlue, align: 'center', fontFace: 'Arial',
    });

    // Generate PPT as buffer
    console.log('[generate-vacant-media-ppt] Writing PPT file...');
    const pptxBuffer = await pptx.write({ outputType: 'arraybuffer' }) as ArrayBuffer;
    
    // Validate PPTX
    const uint8 = new Uint8Array(pptxBuffer);
    if (uint8[0] !== 0x50 || uint8[1] !== 0x4B) {
      console.error('[generate-vacant-media-ppt] Invalid PPTX: Missing ZIP signature');
      return jsonError('Generated file is invalid', 500);
    }

    console.log(`[generate-vacant-media-ppt] PPT generated successfully, size: ${pptxBuffer.byteLength} bytes`);

    // Return as downloadable file
    const filename = `media-availability-${export_tab || 'all'}-${new Date().toISOString().split('T')[0]}.pptx`;
    
    return new Response(pptxBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pptxBuffer.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error('[generate-vacant-media-ppt] Error:', error);
    return jsonError(`Failed to generate PPT: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
  }
});

function jsonError(message: string, status = 400): Response {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}
