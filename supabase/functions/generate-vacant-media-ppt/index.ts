/**
 * generate-vacant-media-ppt — Phase-6 Hardened
 * Auth: JWT + role gate (admin, sales)
 * company_id: derived from JWT, NEVER from body
 * Rate limit: 5/min/user (heavy export)
 * Audit log on export
 */
import {
  withAuth, getAuthContext, requireRole, checkRateLimit,
  supabaseServiceClient, logSecurityAudit, jsonError,
} from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';
import PptxGenJS from 'https://esm.sh/pptxgenjs@3.12.0';

Deno.serve(withAuth(async (req) => {
  if (req.method !== 'POST') return jsonError('Method not allowed', 405);

  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin', 'sales']);
  checkRateLimit(`vacant-ppt:${ctx.userId}`, 5, 60_000);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError('Invalid JSON');

  const { asset_ids, start_date, end_date, export_tab, filters } = body;
  // company_id derived from ctx, ignore body.company_id
  const companyId = ctx.companyId;

  if (!asset_ids || !Array.isArray(asset_ids) || asset_ids.length === 0) return jsonError('asset_ids (array) is required');
  if (!start_date || !end_date) return jsonError('start_date and end_date are required');
  if (asset_ids.length > 500) return jsonError('Maximum 500 assets per export');

  const supabase = supabaseServiceClient();

  // Fetch company branding
  const { data: company } = await supabase
    .from('companies').select('name, logo_url').eq('id', companyId).single();

  // Fetch assets scoped to company
  const { data: assets, error: assetsError } = await supabase
    .from('media_assets')
    .select('id, media_asset_code, city, area, location, media_type, dimensions, card_rate, total_sqft, status, direction, illumination_type, latitude, longitude, primary_photo_url, images, google_street_view_url, qr_code_url, booked_from, booked_to, current_campaign_id')
    .eq('company_id', companyId)
    .in('id', asset_ids);

  if (assetsError) return jsonError('Failed to fetch assets', 500);
  if (!assets || assets.length === 0) return jsonError('No assets found', 404);

  // Fetch campaign bookings
  const { data: allBookings } = await supabase
    .from('campaign_assets')
    .select('asset_id, campaign_id, booking_start_date, booking_end_date, photos, created_at, campaigns(id, campaign_name, client_name, start_date, end_date, status)')
    .in('asset_id', asset_ids)
    .order('created_at', { ascending: false });

  const searchStart = new Date(start_date);
  const searchEnd = new Date(end_date);

  // Build availability data (simplified from original)
  const assetBookingMap = new Map<string, any[]>();
  for (const booking of (allBookings || [])) {
    const campaign = booking.campaigns as any;
    if (!campaign) continue;
    const bStart = new Date(booking.booking_start_date || campaign.start_date);
    const bEnd = new Date(booking.booking_end_date || campaign.end_date);
    if (!['Draft', 'Upcoming', 'Running'].includes(campaign.status)) continue;
    if (bStart <= searchEnd && bEnd >= searchStart) {
      const existing = assetBookingMap.get(booking.asset_id) || [];
      existing.push({ campaign_id: campaign.id, campaign_name: campaign.campaign_name || 'Unnamed', client_name: campaign.client_name || 'Unknown', start_date: booking.booking_start_date || campaign.start_date, end_date: booking.booking_end_date || campaign.end_date, status: campaign.status });
      assetBookingMap.set(booking.asset_id, existing);
    }
  }

  const assetsWithAvailability = assets.map(asset => {
    const bookings = assetBookingMap.get(asset.id) || [];
    let status = 'available';
    let availableFrom: string | null = null;
    if (bookings.length > 1) status = 'conflict';
    else if (bookings.length === 1) {
      status = 'booked';
      const bEnd = new Date(bookings[0].end_date);
      if (bEnd <= searchEnd) { status = 'available_soon'; const nd = new Date(bEnd); nd.setDate(nd.getDate() + 1); availableFrom = nd.toISOString().split('T')[0]; }
    }
    return { ...asset, availability_status: status, available_from: availableFrom, current_booking: bookings[0] || null };
  });

  let filteredAssets = assetsWithAvailability;
  if (export_tab && export_tab !== 'all') {
    filteredAssets = assetsWithAvailability.filter(a => {
      if (export_tab === 'available') return a.availability_status === 'available';
      if (export_tab === 'booked') return a.availability_status === 'booked';
      if (export_tab === 'soon') return a.availability_status === 'available_soon';
      if (export_tab === 'conflict') return a.availability_status === 'conflict';
      return true;
    });
  }

  // Generate PPT
  const pptx = new PptxGenJS();
  pptx.author = 'Go-Ads 360°';
  pptx.company = company?.name || 'Go-Ads 360°';
  pptx.title = `Media Availability Report - ${start_date} to ${end_date}`;
  pptx.layout = 'LAYOUT_16x9';

  const brandBlue = '1E3A8A';

  // Cover slide
  const cover = pptx.addSlide();
  cover.background = { color: brandBlue };
  cover.addText('MEDIA AVAILABILITY REPORT', { x: 0.5, y: 1.5, w: 9, h: 0.8, fontSize: 36, bold: true, color: 'FFFFFF', align: 'center', fontFace: 'Arial' });
  cover.addText(`${start_date} to ${end_date}`, { x: 0.5, y: 3.0, w: 9, h: 0.5, fontSize: 18, color: '94A3B8', align: 'center', fontFace: 'Arial' });
  cover.addText(company?.name || 'Go-Ads 360°', { x: 0.5, y: 4.2, w: 9, h: 0.4, fontSize: 14, color: '94A3B8', align: 'center', fontFace: 'Arial' });

  // Summary slide
  const summary = pptx.addSlide();
  const counts = { available: 0, booked: 0, soon: 0, conflict: 0 };
  assetsWithAvailability.forEach(a => { if (a.availability_status === 'available') counts.available++; else if (a.availability_status === 'booked') counts.booked++; else if (a.availability_status === 'available_soon') counts.soon++; else counts.conflict++; });
  summary.addText('AVAILABILITY SUMMARY', { x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 28, bold: true, color: brandBlue, fontFace: 'Arial' });
  const cards = [{ l: 'Available', c: counts.available, cl: '22C55E' }, { l: 'Booked', c: counts.booked, cl: 'DC2626' }, { l: 'Soon', c: counts.soon, cl: 'EAB308' }, { l: 'Conflicts', c: counts.conflict, cl: 'F97316' }];
  cards.forEach((card, i) => {
    const x = 0.5 + i * 2.3;
    summary.addShape('rect', { x, y: 1.2, w: 2, h: 1.2, fill: { color: card.cl } });
    summary.addText(String(card.c), { x, y: 1.4, w: 2, h: 0.6, fontSize: 32, bold: true, color: 'FFFFFF', align: 'center', fontFace: 'Arial' });
    summary.addText(card.l, { x, y: 2.0, w: 2, h: 0.3, fontSize: 11, color: 'FFFFFF', align: 'center', fontFace: 'Arial' });
  });

  // Asset slides (2 per slide)
  for (let i = 0; i < filteredAssets.length; i += 2) {
    const slide = pptx.addSlide();
    slide.addText(`${company?.name || 'Go-Ads 360°'} | Media Availability`, { x: 0, y: 5.0, w: 10, h: 0.3, fontSize: 8, color: '94A3B8', align: 'center', fontFace: 'Arial' });
    for (let j = 0; j < 2 && (i + j) < filteredAssets.length; j++) {
      const asset = filteredAssets[i + j];
      const yOff = j * 2.5;
      const statusColor = asset.availability_status === 'available' ? '22C55E' : asset.availability_status === 'booked' ? 'DC2626' : asset.availability_status === 'available_soon' ? 'EAB308' : 'F97316';
      slide.addText(asset.media_asset_code || asset.id, { x: 0.3, y: 0.2 + yOff, w: 4, h: 0.35, fontSize: 14, bold: true, color: brandBlue, fontFace: 'Arial' });
      slide.addShape('rect', { x: 7.5, y: 0.2 + yOff, w: 2, h: 0.3, fill: { color: statusColor } });
      slide.addText(asset.availability_status.toUpperCase(), { x: 7.5, y: 0.2 + yOff, w: 2, h: 0.3, fontSize: 10, color: 'FFFFFF', align: 'center', fontFace: 'Arial' });
      const details = `${asset.city} | ${asset.area} | ${asset.media_type}\n${asset.location}\n${asset.dimensions || ''} | ₹${asset.card_rate?.toLocaleString() || '0'}/month`;
      slide.addText(details, { x: 0.3, y: 0.6 + yOff, w: 9, h: 0.8, fontSize: 10, color: '374151', fontFace: 'Arial', lineSpacing: 16 });
    }
  }

  const pptxData = await pptx.write({ outputType: 'base64' });

  await logSecurityAudit({
    functionName: 'generate-vacant-media-ppt', userId: ctx.userId, companyId: ctx.companyId,
    action: 'export_vacant_media_ppt',
    metadata: { assetCount: filteredAssets.length, exportTab: export_tab || 'all' }, req,
  });

  return new Response(
    JSON.stringify({ success: true, pptxBase64: pptxData, filename: `Media_Availability_${start_date}_${end_date}.pptx`, assetCount: filteredAssets.length }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}));
