import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import pptxgen from 'https://esm.sh/pptxgenjs@3.12.0';
import JSZip from 'https://esm.sh/jszip@3.10.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
};

// ========== CONSTANTS ==========
const PPT_SAFE_FONT = 'Arial';
const SLIDE_WIDTH = 10; // inches
const SLIDE_HEIGHT = 7.5; // inches
const MARGIN = 0.4; // inches from edge
const CONTENT_WIDTH = SLIDE_WIDTH - (MARGIN * 2); // 9.2 inches

// Colors
const PRIMARY_COLOR = '1E40AF';
const SECONDARY_COLOR = '10B981';
const MUTED_COLOR = '64748B';
const BORDER_COLOR = 'E2E8F0';
const BG_LIGHT = 'F8FAFC';

// ========== PPTX safety helpers ==========
function sanitizePptHyperlink(url: string | null | undefined): string | undefined {
  if (!url || typeof url !== 'string' || url.trim() === '') return undefined;
  return url
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

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

// Truncate long text
function truncateText(text: string, maxLength: number): string {
  const sanitized = sanitizePptText(text);
  if (sanitized.length <= maxLength) return sanitized;
  return sanitized.substring(0, maxLength - 3) + '...';
}

interface RequestBody {
  campaign_id: string;
  company_id: string;
}

async function validatePptxRelationships(pptxArrayBuffer: ArrayBuffer) {
  const zip = await JSZip.loadAsync(pptxArrayBuffer);
  const relsFiles = Object.keys(zip.files).filter((p) => p.endsWith('.rels'));

  const badTargets: Array<{ file: string; target: string }> = [];
  const targetAttrRegex = /Target="([^"]*)"/g;

  for (const file of relsFiles) {
    const content = await zip.file(file)!.async('string');
    let m: RegExpExecArray | null;
    while ((m = targetAttrRegex.exec(content))) {
      const target = m[1] ?? '';
      if (target.includes('&') && !target.includes('&amp;')) {
        badTargets.push({ file, target });
      }
    }
  }

  if (badTargets.length) {
    console.error('PPTX validation failed: invalid hyperlink XML (unescaped &)', badTargets);
    throw new Error(`PPT generation failed: invalid hyperlink XML`);
  }
}

// Photo type mapping with priority order
const PHOTO_TYPE_CONFIG = [
  { keys: ['geo', 'geotag', 'photo_1'], label: 'Geo-tagged Photo', color: '10B981' },
  { keys: ['newspaper', 'photo_2'], label: 'Newspaper Ad', color: '3B82F6' },
  { keys: ['traffic1', 'traffic_left', 'photo_3'], label: 'Traffic View 1', color: 'F59E0B' },
  { keys: ['traffic2', 'traffic_right', 'photo_4'], label: 'Traffic View 2', color: 'EF4444' },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { campaign_id, company_id } = await req.json() as RequestBody;
    console.log('Generating proof PPT for campaign:', campaign_id);

    // Verify user access
    const { data: companyUser } = await supabase
      .from('company_users')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('company_id', company_id)
      .eq('status', 'active')
      .single();
    
    if (!companyUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch campaign with client info
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select(`*, clients!inner(name)`)
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      console.error('Campaign error:', campaignError);
      throw new Error('Campaign not found');
    }

    // Fetch campaign_assets
    const { data: campaignAssets, error: assetsError } = await supabase
      .from('campaign_assets')
      .select('*')
      .eq('campaign_id', campaign_id)
      .order('city', { ascending: true })
      .order('area', { ascending: true });

    if (assetsError) {
      console.error('Campaign assets error:', assetsError);
    }

    console.log('Found campaign assets:', campaignAssets?.length || 0);

    // Fetch company details
    const { data: company } = await supabase
      .from('companies')
      .select('name, logo_url')
      .eq('id', company_id)
      .single();

    // Fetch media assets for additional info
    const assetIds = campaignAssets?.map(ca => ca.asset_id).filter(Boolean) || [];
    const { data: mediaAssets } = await supabase
      .from('media_assets')
      .select('id, location, city, area, media_type, dimension, qr_code_url, latitude, longitude, primary_photo_url, direction, total_sqft, illumination_type')
      .in('id', assetIds);

    const assetMap = new Map(mediaAssets?.map(a => [a.id, a]) || []);

    // Create PowerPoint
    const pptx = new pptxgen();
    pptx.author = company?.name || 'Go-Ads 360°';
    pptx.company = company?.name || 'Go-Ads 360°';
    pptx.title = `${campaign.campaign_name} - Proof of Performance`;
    pptx.subject = 'Campaign Proof of Installation';
    pptx.layout = 'LAYOUT_16x9';

    // ==================== SLIDE 1: COVER ====================
    const coverSlide = pptx.addSlide();
    coverSlide.background = { color: PRIMARY_COLOR };

    // Campaign name (centered, large)
    coverSlide.addText(sanitizePptText(campaign.campaign_name), {
      x: MARGIN,
      y: 2.0,
      w: CONTENT_WIDTH,
      h: 1.2,
      fontSize: 44,
      bold: true,
      color: 'FFFFFF',
      align: 'center',
      fontFace: PPT_SAFE_FONT,
    });

    // Subtitle
    coverSlide.addText('Proof of Performance Report', {
      x: MARGIN,
      y: 3.2,
      w: CONTENT_WIDTH,
      h: 0.6,
      fontSize: 24,
      color: 'E0E7FF',
      align: 'center',
      fontFace: PPT_SAFE_FONT,
    });

    // Horizontal divider
    coverSlide.addShape(pptx.ShapeType.rect, {
      x: 3.5,
      y: 4.0,
      w: 3,
      h: 0.02,
      fill: { color: SECONDARY_COLOR },
    });

    // Total Assets badge
    coverSlide.addText(`Total Assets: ${campaignAssets?.length || 0}`, {
      x: MARGIN,
      y: 4.3,
      w: CONTENT_WIDTH,
      h: 0.5,
      fontSize: 18,
      bold: true,
      color: 'FFFFFF',
      align: 'center',
      fontFace: PPT_SAFE_FONT,
    });

    // Footer with company branding
    const footerY = SLIDE_HEIGHT - 0.6;
    coverSlide.addText(sanitizePptText(company?.name || 'Go-Ads 360°'), {
      x: MARGIN,
      y: footerY,
      w: CONTENT_WIDTH,
      h: 0.4,
      fontSize: 12,
      color: 'B0C4DE',
      align: 'center',
      fontFace: PPT_SAFE_FONT,
    });

    // ==================== SLIDE 2: SUMMARY ====================
    const summarySlide = pptx.addSlide();
    summarySlide.background = { color: 'FFFFFF' };

    // Summary title
    summarySlide.addText('Campaign Summary', {
      x: MARGIN,
      y: 0.4,
      w: CONTENT_WIDTH,
      h: 0.7,
      fontSize: 28,
      bold: true,
      color: PRIMARY_COLOR,
      fontFace: PPT_SAFE_FONT,
    });

    // Summary stats table
    const totalAssets = campaignAssets?.length || 0;
    const assetsWithPhotos = campaignAssets?.filter(ca => {
      if (!ca.photos || typeof ca.photos !== 'object') return false;
      const photosObj = ca.photos as Record<string, string>;
      return Object.values(photosObj).some(url => url && url.trim() !== '');
    }).length || 0;
    const verifiedAssets = campaignAssets?.filter(ca => ca.status === 'Verified' || ca.status === 'Completed').length || 0;
    const installedAssets = campaignAssets?.filter(ca => ca.status === 'Installed').length || 0;
    const totalPhotos = campaignAssets?.reduce((sum, ca) => {
      if (!ca.photos || typeof ca.photos !== 'object') return sum;
      const photosObj = ca.photos as Record<string, string>;
      return sum + Object.values(photosObj).filter(url => url && url.trim() !== '').length;
    }, 0) || 0;

    // Create professional table
    const summaryTableData = [
      [{ text: 'Metric', options: { bold: true, fill: { color: PRIMARY_COLOR }, color: 'FFFFFF' } }, 
       { text: 'Value', options: { bold: true, fill: { color: PRIMARY_COLOR }, color: 'FFFFFF' } }],
      ['Total Assets', totalAssets.toString()],
      ['Assets with Photos', assetsWithPhotos.toString()],
      ['Total Photos Uploaded', totalPhotos.toString()],
      ['Verified Assets', verifiedAssets.toString()],
      ['Installed Assets', installedAssets.toString()],
    ];

    summarySlide.addTable(summaryTableData, {
      x: 1.5,
      y: 1.4,
      w: 7,
      colW: [4.5, 2.5],
      border: { type: 'solid', color: BORDER_COLOR, pt: 0.5 },
      fontFace: PPT_SAFE_FONT,
      fontSize: 14,
      align: 'left',
      valign: 'middle',
      rowH: 0.5,
    });

    // Campaign period info
    const startDate = new Date(campaign.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const endDate = new Date(campaign.end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    
    summarySlide.addText(`Campaign Period: ${startDate} - ${endDate}`, {
      x: MARGIN,
      y: 5.0,
      w: CONTENT_WIDTH,
      h: 0.4,
      fontSize: 14,
      color: MUTED_COLOR,
      align: 'center',
      fontFace: PPT_SAFE_FONT,
    });

    summarySlide.addText(`Client: ${sanitizePptText(campaign.clients?.name || campaign.client_name)}`, {
      x: MARGIN,
      y: 5.5,
      w: CONTENT_WIDTH,
      h: 0.4,
      fontSize: 14,
      color: MUTED_COLOR,
      align: 'center',
      fontFace: PPT_SAFE_FONT,
    });

    // Footer
    summarySlide.addText('Powered by Go-Ads 360° — OOH Media Platform', {
      x: MARGIN,
      y: footerY,
      w: CONTENT_WIDTH,
      h: 0.3,
      fontSize: 10,
      color: MUTED_COLOR,
      align: 'center',
      fontFace: PPT_SAFE_FONT,
    });

    // ==================== ASSET SLIDES ====================
    // Each asset gets slides with 2 photos per slide
    let slideCount = 2; // cover + summary

    for (const campaignAsset of campaignAssets || []) {
      const asset = assetMap.get(campaignAsset.asset_id);
      
      // Parse photos
      let photos: Array<{ type: string; url: string; label: string; color: string }> = [];
      if (campaignAsset.photos && typeof campaignAsset.photos === 'object') {
        const photosObj = campaignAsset.photos as Record<string, string>;
        for (const config of PHOTO_TYPE_CONFIG) {
          for (const key of config.keys) {
            const url = photosObj[key];
            if (url && url.trim() !== '') {
              photos.push({
                type: key,
                url: url,
                label: config.label,
                color: config.color,
              });
              break; // Only take first match per category
            }
          }
        }
      }

      if (photos.length === 0) continue; // Skip assets without photos

      // Create slides with 2 photos per slide
      for (let photoIndex = 0; photoIndex < photos.length; photoIndex += 2) {
        const slide = pptx.addSlide();
        slide.background = { color: 'FFFFFF' };
        slideCount++;

        // ========== HEADER SECTION (y: 0.2 - 1.0) ==========
        // Asset code with city/area - truncate if too long
        const assetCode = campaignAsset.asset_id || 'Unknown';
        const cityArea = `${campaignAsset.city || asset?.city || ''}, ${campaignAsset.area || asset?.area || ''}`;
        const locationText = truncateText(campaignAsset.location || asset?.location || 'Unknown Location', 50);
        
        const headerTitle = `Asset: ${assetCode} – ${cityArea}, ${locationText}`;
        slide.addText(truncateText(headerTitle, 85), {
          x: MARGIN,
          y: 0.25,
          w: CONTENT_WIDTH - 0.2, // Leave room for right margin
          h: 0.45,
          fontSize: 18,
          bold: true,
          color: PRIMARY_COLOR,
          fontFace: PPT_SAFE_FONT,
        });

        // Details line 2: Location | Direction | Dimension | Illumination
        const detailParts: string[] = [];
        if (campaignAsset.location || asset?.location) {
          detailParts.push(`Location: ${truncateText(campaignAsset.location || asset?.location || '', 35)}`);
        }
        if (campaignAsset.direction || asset?.direction) {
          detailParts.push(`Direction: ${sanitizePptText(campaignAsset.direction || asset?.direction || '')}`);
        }
        if (campaignAsset.dimensions || asset?.dimension) {
          detailParts.push(`Dimension: ${sanitizePptText(campaignAsset.dimensions || asset?.dimension || '')}`);
        }
        if (campaignAsset.illumination_type || asset?.illumination_type) {
          detailParts.push(`${sanitizePptText(campaignAsset.illumination_type || asset?.illumination_type || '')}`);
        }

        const detailsText = truncateText(detailParts.join(' | '), 120);
        slide.addText(detailsText, {
          x: MARGIN,
          y: 0.75,
          w: CONTENT_WIDTH,
          h: 0.3,
          fontSize: 11,
          color: MUTED_COLOR,
          fontFace: PPT_SAFE_FONT,
        });

        // ========== PHOTO SECTION (y: 1.2 - 5.8) ==========
        const photoAreaY = 1.15;
        const photoAreaHeight = 4.6;
        const photoWidth = 4.3;
        const photoHeight = photoAreaHeight;
        const photoGap = 0.3;
        const photoStartX = MARGIN + 0.1;

        // Photo 1 (left)
        const photo1 = photos[photoIndex];
        if (photo1) {
          addPhotoWithFrame(slide, pptx, photo1, photoStartX, photoAreaY, photoWidth, photoHeight);
        }

        // Photo 2 (right) if exists
        const photo2 = photos[photoIndex + 1];
        if (photo2) {
          const photo2X = photoStartX + photoWidth + photoGap;
          addPhotoWithFrame(slide, pptx, photo2, photo2X, photoAreaY, photoWidth, photoHeight);
        }

        // ========== FOOTER SECTION (y: 5.9 - 6.5) ==========
        // Mounter info
        const mounterName = campaignAsset.mounter_name || 'N/A';
        const completedDate = campaignAsset.completed_at 
          ? new Date(campaignAsset.completed_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
          : 'Pending';
        
        slide.addText(sanitizePptText(`Installed by: ${mounterName} | Completed: ${completedDate}`), {
          x: MARGIN,
          y: 5.9,
          w: 4.5,
          h: 0.25,
          fontSize: 9,
          italic: true,
          color: MUTED_COLOR,
          fontFace: PPT_SAFE_FONT,
        });

        // Company branding
        slide.addText(sanitizePptText(company?.name || 'Matrix Network Solutions'), {
          x: 5.5,
          y: 5.9,
          w: 4,
          h: 0.25,
          fontSize: 9,
          bold: true,
          color: PRIMARY_COLOR,
          align: 'right',
          fontFace: PPT_SAFE_FONT,
        });

        // Powered by footer
        slide.addText('Powered by Go-Ads 360° — OOH Media Platform', {
          x: MARGIN,
          y: footerY,
          w: CONTENT_WIDTH,
          h: 0.3,
          fontSize: 10,
          color: MUTED_COLOR,
          align: 'center',
          fontFace: PPT_SAFE_FONT,
        });
      }
    }

    // Generate PPT binary
    console.log('Generating PPTX buffer...');
    const pptxBuffer = await pptx.write({ outputType: 'arraybuffer' });

    // Validate PPTX
    await validatePptxRelationships(pptxBuffer as ArrayBuffer);

    // Upload to storage
    const timestamp = Date.now();
    const safeCampaignName = (campaign.campaign_name || 'Campaign').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    const fileName = `proofs/${campaign_id}/${safeCampaignName}-Proof-Report.pptx`;
    
    const { error: uploadError } = await supabase.storage
      .from('client-documents')
      .upload(fileName, pptxBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('client-documents')
      .getPublicUrl(fileName);

    // Update campaign
    await supabase
      .from('campaigns')
      .update({ 
        proof_ppt_url: urlData.publicUrl,
        public_proof_ppt_url: urlData.publicUrl 
      })
      .eq('id', campaign_id);

    // Get signed URL for download
    const { data: signedUrlData } = await supabase.storage
      .from('client-documents')
      .createSignedUrl(fileName, 3600);

    console.log('Proof PPT generated successfully:', fileName, 'Total slides:', slideCount);

    return new Response(
      JSON.stringify({
        success: true,
        file_url: signedUrlData?.signedUrl || urlData.publicUrl,
        public_url: urlData.publicUrl,
        fileName,
        slideCount,
        totalAssets,
        assetsWithPhotos,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating proof PPT:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to generate PPT',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to add photo with professional frame
function addPhotoWithFrame(
  slide: any, 
  pptx: any,
  photo: { type: string; url: string; label: string; color: string },
  x: number,
  y: number,
  w: number,
  h: number
) {
  const borderWidth = 0.03;
  const labelHeight = 0.35;
  const imageHeight = h - labelHeight - 0.1;

  // Outer border/frame
  slide.addShape(pptx.ShapeType.rect, {
    x: x - borderWidth,
    y: y - borderWidth,
    w: w + (borderWidth * 2),
    h: h + (borderWidth * 2),
    line: { color: BORDER_COLOR, width: 1.5 },
    fill: { color: 'FFFFFF' },
  });

  // Photo image
  try {
    slide.addImage({
      path: photo.url,
      x: x,
      y: y,
      w: w,
      h: imageHeight,
      sizing: { type: 'contain', w, h: imageHeight },
    });
  } catch (e) {
    console.log('Could not add photo:', e);
    // Placeholder on error
    slide.addShape(pptx.ShapeType.rect, {
      x, y, w, h: imageHeight,
      fill: { color: BG_LIGHT },
    });
    slide.addText('Photo unavailable', {
      x, y: y + (imageHeight / 2) - 0.2, w, h: 0.4,
      fontSize: 14, color: MUTED_COLOR, align: 'center',
    });
  }

  // Category label badge at bottom of photo area
  const labelY = y + imageHeight + 0.05;
  slide.addShape(pptx.ShapeType.rect, {
    x: x,
    y: labelY,
    w: w,
    h: labelHeight,
    fill: { color: photo.color },
  });

  slide.addText(sanitizePptText(photo.label), {
    x: x,
    y: labelY,
    w: w,
    h: labelHeight,
    fontSize: 11,
    bold: true,
    color: 'FFFFFF',
    align: 'center',
    valign: 'middle',
    fontFace: PPT_SAFE_FONT,
  });
}
