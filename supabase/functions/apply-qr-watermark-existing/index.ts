import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Image, decode } from 'https://deno.land/x/imagescript@1.3.0/mod.ts';

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
  return false;
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

    const { batch_size = 25, offset = 0, image_type = 'both', force_reprocess = false, dry_run = false } = await req.json() as RequestBody;

    console.log('Starting QR watermark processing', { batch_size, offset, image_type, force_reprocess, dry_run });

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
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Failed', ...result }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

async function processMediaPhotos(supabase: any, result: ProcessingResult, batch_size: number, offset: number, force_reprocess: boolean, dry_run: boolean) {
  const { data: photos } = await supabase.from('media_photos')
    .select('id, asset_id, photo_url, metadata').range(offset, offset + batch_size - 1).order('created_at', { ascending: true });

  for (const photo of photos || []) {
    result.total_images_scanned++;
    if (!force_reprocess && isAlreadyWatermarked(photo.metadata, photo.photo_url)) { result.skipped_already_done++; continue; }
    
    const { data: asset } = await supabase.from('media_assets').select('qr_code_url').eq('id', photo.asset_id).single();
    if (!asset?.qr_code_url) { result.skipped_missing_qr++; continue; }
    if (!photo.photo_url) { result.skipped_missing_image++; continue; }
    if (dry_run) { result.watermarked_count++; continue; }

    try {
      const watermarkedResult = await applyQRWatermark(supabase, photo.photo_url, asset.qr_code_url, 'media-photos');
      if (watermarkedResult.success) {
        await supabase.from('media_photos').update({
          photo_url: watermarkedResult.newUrl,
          metadata: { ...(photo.metadata || {}), qr_watermarked: true, qr_watermarked_at: new Date().toISOString() },
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
    const { data: asset } = await supabase.from('media_assets').select('qr_code_url').eq('id', ca.asset_id).single();
    if (!asset?.qr_code_url) { result.skipped_missing_qr++; continue; }

    const photos = ca.photos as Record<string, string>;
    let updatedPhotos = { ...photos }, anyUpdated = false;

    for (const [photoType, photoUrl] of Object.entries(photos)) {
      if (!photoUrl?.trim()) continue;
      result.total_images_scanned++;
      if (!force_reprocess && isAlreadyWatermarked(null, photoUrl)) { result.skipped_already_done++; continue; }
      if (dry_run) { result.watermarked_count++; continue; }

      try {
        const watermarkedResult = await applyQRWatermark(supabase, photoUrl, asset.qr_code_url, 'campaign-proofs');
        if (watermarkedResult.success && watermarkedResult.newUrl) {
          updatedPhotos[photoType] = watermarkedResult.newUrl; anyUpdated = true; result.watermarked_count++;
        } else { result.failed_count++; }
      } catch { result.failed_count++; }
    }
    if (anyUpdated && !dry_run) await supabase.from('campaign_assets').update({ photos: updatedPhotos }).eq('id', ca.id);
  }
}

async function applyQRWatermark(supabase: any, imageUrl: string, qrCodeUrl: string, bucket: string): Promise<{ success: boolean; newUrl?: string; error?: string }> {
  try {
    const [imageRes, qrRes] = await Promise.all([fetch(imageUrl), fetch(qrCodeUrl)]);
    if (!imageRes.ok || !qrRes.ok) return { success: false, error: 'Failed to fetch images' };

    const imageData = new Uint8Array(await imageRes.arrayBuffer());
    const qrData = new Uint8Array(await qrRes.arrayBuffer());

    const decoded = await decode(imageData);
    const mainImage = decoded instanceof Image ? decoded : null;
    if (!mainImage) return { success: false, error: 'Could not decode main image' };

    const qrDecoded = await decode(qrData);
    const qrImage = qrDecoded instanceof Image ? qrDecoded : null;
    if (!qrImage) return { success: false, error: 'Could not decode QR image' };

    const qrResized = qrImage.resize(QR_SIZE, QR_SIZE);
    const posX = mainImage.width - QR_SIZE - QR_PADDING;
    const posY = mainImage.height - QR_SIZE - QR_PADDING;
    mainImage.composite(qrResized, posX, posY);

    const watermarkedData = await mainImage.encode();

    const storagePath = extractStoragePath(imageUrl);
    if (!storagePath) return { success: false, error: 'Could not extract path' };

    const pathParts = storagePath.split('/');
    const filename = pathParts.pop() || '';
    const dir = pathParts.join('/');
    const baseName = filename.replace(/\.[^.]+$/, '').replace('_qr_wm', '');
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
