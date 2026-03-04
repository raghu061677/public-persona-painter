import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import * as pngs from 'https://deno.land/x/pngs@0.1.1/mod.ts';
import QRCode from 'https://esm.sh/qrcode@1.5.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
};

interface RequestBody {
  batch_size?: number;
  offset?: number;
  image_type?: 'media_photos' | 'campaign_assets' | 'both';
  force_reprocess?: boolean;
  dry_run?: boolean;
}

interface ProcessingResult {
  total_images_scanned: number;
  watermarked_count: number;
  skipped_already_done: number;
  skipped_missing_qr: number;
  skipped_missing_image: number;
  failed_count: number;
  errors: Array<{ id: string; error: string }>;
  next_offset: number | null;
}

const QR_SIZE = 80;
const QR_PADDING = 12;

function isAlreadyWatermarked(metadata: any, url?: string): boolean {
  if (metadata?.qr_watermarked === true) return true;
  if (url?.includes('_qr_wm')) return true;
  if (url?.includes('_watermarked')) return true;
  return false;
}

// Build Street View URL from asset data
function buildStreetViewUrl(asset: { google_street_view_url?: string | null; latitude?: number | null; longitude?: number | null }): string | null {
  if (asset.google_street_view_url) return asset.google_street_view_url;
  if (asset.latitude && asset.longitude) {
    return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${asset.latitude},${asset.longitude}&heading=90&pitch=0&fov=80`;
  }
  return null;
}

// Generate QR code as PNG buffer from a URL string
async function generateQRPng(url: string): Promise<Uint8Array> {
  const pngBuffer = await QRCode.toBuffer(url, {
    errorCorrectionLevel: 'M',
    type: 'png',
    margin: 1,
    width: 256,
    color: { dark: '#000000', light: '#FFFFFF' },
  });
  return new Uint8Array(pngBuffer);
}

async function fetchWithRetry(url: string, retries = 2): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
      if (i === retries) return res;
    } catch (err) {
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw new Error('Fetch failed after retries');
}

async function compositeImages(
  mainData: Uint8Array, 
  qrData: Uint8Array, 
  qrSize: number, 
  padding: number
): Promise<Uint8Array> {
  const mainImage = pngs.decode(mainData);
  const qrImage = pngs.decode(qrData);
  
  const posX = mainImage.width - qrSize - padding;
  const posY = mainImage.height - qrSize - padding;
  
  const qrPixels = new Uint8Array(qrSize * qrSize * 4);
  const scaleX = qrImage.width / qrSize;
  const scaleY = qrImage.height / qrSize;
  
  for (let y = 0; y < qrSize; y++) {
    for (let x = 0; x < qrSize; x++) {
      const srcX = Math.floor(x * scaleX);
      const srcY = Math.floor(y * scaleY);
      const srcIdx = (srcY * qrImage.width + srcX) * 4;
      const dstIdx = (y * qrSize + x) * 4;
      qrPixels[dstIdx] = qrImage.image[srcIdx];
      qrPixels[dstIdx + 1] = qrImage.image[srcIdx + 1];
      qrPixels[dstIdx + 2] = qrImage.image[srcIdx + 2];
      qrPixels[dstIdx + 3] = qrImage.image[srcIdx + 3];
    }
  }
  
  const resultPixels = new Uint8Array(mainImage.image);
  for (let y = 0; y < qrSize; y++) {
    for (let x = 0; x < qrSize; x++) {
      const mainX = posX + x;
      const mainY = posY + y;
      if (mainX < 0 || mainX >= mainImage.width || mainY < 0 || mainY >= mainImage.height) continue;
      
      const qrIdx = (y * qrSize + x) * 4;
      const mainIdx = (mainY * mainImage.width + mainX) * 4;
      const alpha = qrPixels[qrIdx + 3] / 255;
      
      resultPixels[mainIdx] = Math.round(qrPixels[qrIdx] * alpha + resultPixels[mainIdx] * (1 - alpha));
      resultPixels[mainIdx + 1] = Math.round(qrPixels[qrIdx + 1] * alpha + resultPixels[mainIdx + 1] * (1 - alpha));
      resultPixels[mainIdx + 2] = Math.round(qrPixels[qrIdx + 2] * alpha + resultPixels[mainIdx + 2] * (1 - alpha));
      resultPixels[mainIdx + 3] = 255;
    }
  }
  
  return pngs.encode(resultPixels, mainImage.width, mainImage.height);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const result: ProcessingResult = {
    total_images_scanned: 0, watermarked_count: 0, skipped_already_done: 0,
    skipped_missing_qr: 0, skipped_missing_image: 0, failed_count: 0,
    errors: [], next_offset: null,
  };

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: userRoles } = await supabase.from('company_users')
      .select('role').eq('user_id', user.id).eq('status', 'active');

    if (!userRoles?.some(r => r.role === 'admin' || r.role === 'director')) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { batch_size = 2, offset = 0, image_type = 'both', force_reprocess = false, dry_run = false } = await req.json() as RequestBody;

    console.log('Starting QR watermark processing (Street View)', { batch_size, offset, image_type, force_reprocess, dry_run });

    if (image_type === 'media_photos' || image_type === 'both') {
      await processMediaPhotos(supabase, result, batch_size, offset, force_reprocess, dry_run);
    }

    if (image_type === 'campaign_assets' || image_type === 'both') {
      await processCampaignAssets(supabase, result, batch_size, image_type === 'both' ? 0 : offset, force_reprocess, dry_run);
    }

    console.log('Processing complete:', result);

    return new Response(JSON.stringify({
      success: true, ...result,
      message: dry_run ? 'Dry run complete - no changes made' : `Processed ${result.watermarked_count} images`,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Failed', 
      ...result,
      next_offset: result.total_images_scanned > 0 ? (result.next_offset ?? null) : null
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

async function processMediaPhotos(supabase: any, result: ProcessingResult, batch_size: number, offset: number, force_reprocess: boolean, dry_run: boolean) {
  const { data: photos } = await supabase.from('media_photos')
    .select('id, asset_id, photo_url, metadata').range(offset, offset + batch_size - 1).order('created_at', { ascending: true });

  for (const photo of photos || []) {
    result.total_images_scanned++;
    if (!force_reprocess && isAlreadyWatermarked(photo.metadata, photo.photo_url)) { result.skipped_already_done++; continue; }
    
    // Fetch asset with Street View URL and coordinates
    const { data: asset } = await supabase.from('media_assets')
      .select('google_street_view_url, latitude, longitude')
      .eq('id', photo.asset_id).single();
    
    const streetViewUrl = asset ? buildStreetViewUrl(asset) : null;
    if (!streetViewUrl) { result.skipped_missing_qr++; continue; }
    if (!photo.photo_url) { result.skipped_missing_image++; continue; }
    if (dry_run) { result.watermarked_count++; continue; }

    try {
      // Generate QR code PNG from Street View URL
      const qrPngData = await generateQRPng(streetViewUrl);
      const watermarkedResult = await applyQRWatermarkFromData(supabase, photo.photo_url, qrPngData, 'media-photos');
      if (watermarkedResult.success) {
        await supabase.from('media_photos').update({
          photo_url: watermarkedResult.newUrl,
          metadata: { ...(photo.metadata || {}), qr_watermarked: true, qr_watermarked_at: new Date().toISOString(), qr_target: 'street_view' },
        }).eq('id', photo.id);
        result.watermarked_count++;
      } else { result.failed_count++; result.errors.push({ id: photo.id, error: watermarkedResult.error || 'Unknown' }); }
    } catch (err) { result.failed_count++; result.errors.push({ id: photo.id, error: String(err) }); }
  }
  if (photos?.length === batch_size) result.next_offset = offset + batch_size;
}

async function processCampaignAssets(supabase: any, result: ProcessingResult, batch_size: number, offset: number, force_reprocess: boolean, dry_run: boolean) {
  const { data: campaignAssets } = await supabase.from('campaign_assets')
    .select('id, asset_id, photos').not('photos', 'is', null).range(offset, offset + batch_size - 1).order('created_at', { ascending: true });

  for (const ca of campaignAssets || []) {
    if (!ca.photos || typeof ca.photos !== 'object') continue;
    
    // Fetch asset with Street View URL and coordinates
    const { data: asset } = await supabase.from('media_assets')
      .select('google_street_view_url, latitude, longitude')
      .eq('id', ca.asset_id).single();
    
    const streetViewUrl = asset ? buildStreetViewUrl(asset) : null;
    if (!streetViewUrl) { result.skipped_missing_qr++; continue; }

    // Generate QR code once per asset
    let qrPngData: Uint8Array | null = null;
    if (!dry_run) {
      try {
        qrPngData = await generateQRPng(streetViewUrl);
      } catch (err) {
        result.failed_count++;
        result.errors.push({ id: ca.id, error: `QR generation failed: ${String(err)}` });
        continue;
      }
    }

    const photos = ca.photos as Record<string, string>;
    let updatedPhotos = { ...photos }, anyUpdated = false;

    for (const [photoType, photoUrl] of Object.entries(photos)) {
      if (!photoUrl?.trim()) continue;
      result.total_images_scanned++;
      if (!force_reprocess && isAlreadyWatermarked(null, photoUrl)) { result.skipped_already_done++; continue; }
      if (dry_run) { result.watermarked_count++; continue; }

      try {
        const watermarkedResult = await applyQRWatermarkFromData(supabase, photoUrl, qrPngData!, 'campaign-proofs');
        if (watermarkedResult.success && watermarkedResult.newUrl) {
          updatedPhotos[photoType] = watermarkedResult.newUrl; anyUpdated = true; result.watermarked_count++;
        } else { result.failed_count++; }
      } catch { result.failed_count++; }
    }
    if (anyUpdated && !dry_run) await supabase.from('campaign_assets').update({ photos: updatedPhotos }).eq('id', ca.id);
  }
}

async function applyQRWatermarkFromData(supabase: any, imageUrl: string, qrPngData: Uint8Array, bucket: string): Promise<{ success: boolean; newUrl?: string; error?: string }> {
  try {
    const imageRes = await fetchWithRetry(imageUrl);
    if (!imageRes.ok) return { success: false, error: 'Failed to fetch image' };

    const imageData = new Uint8Array(await imageRes.arrayBuffer());

    const watermarkedData = await compositeImages(imageData, qrPngData, QR_SIZE, QR_PADDING);

    const storagePath = extractStoragePath(imageUrl);
    if (!storagePath) return { success: false, error: 'Could not extract path' };

    const pathParts = storagePath.split('/');
    const filename = pathParts.pop() || '';
    const dir = pathParts.join('/');
    const baseName = filename.replace(/\.[^.]+$/, '').replace('_qr_wm', '').replace('_watermarked', '');
    const newPath = dir ? `${dir}/${baseName}_qr_wm.png` : `${baseName}_qr_wm.png`;

    const { error: uploadError } = await supabase.storage.from(bucket).upload(newPath, watermarkedData, { contentType: 'image/png', upsert: true });
    if (uploadError) return { success: false, error: uploadError.message };

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(newPath);
    return { success: true, newUrl: urlData.publicUrl };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

function extractStoragePath(url: string): string | null {
  try {
    const match = new URL(url).pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/[^/]+\/(.+)/);
    return match ? match[1].split('?')[0] : null;
  } catch { return null; }
}
