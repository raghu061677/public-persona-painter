import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import pptxgen from 'https://esm.sh/pptxgenjs@3.12.0';
import JSZip from 'https://esm.sh/jszip@3.10.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ========== PPTX safety helpers (prevent PowerPoint "repair" prompts) ==========
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
    .replace(/→|–|—/g, '-')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/[\uFFFE\uFFFF]/g, '');
}

const PPT_SAFE_FONT = 'Arial';

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
      // Unescaped ampersand in XML attribute value is invalid
      if (target.includes('&') && !target.includes('&amp;')) {
        badTargets.push({ file, target });
      }
    }
  }

  if (badTargets.length) {
    console.error('PPTX validation failed: invalid hyperlink XML (unescaped &)', badTargets);
    const first = badTargets[0];
    throw new Error(
      `PPT generation failed: invalid hyperlink XML (unescaped &). File: ${first.file}. Target: ${first.target}`
    );
  }
}

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
      .select(`
        *,
        clients!inner(name)
      `)
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      console.error('Campaign error:', campaignError);
      throw new Error('Campaign not found');
    }

    // Fetch campaign_assets (the actual data source for campaign media)
    const { data: campaignAssets, error: assetsError } = await supabase
      .from('campaign_assets')
      .select('*')
      .eq('campaign_id', campaign_id);

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

    // Fetch media assets for additional info (qr_code_url, etc.)
    const assetIds = campaignAssets?.map(ca => ca.asset_id).filter(Boolean) || [];
    const { data: mediaAssets } = await supabase
      .from('media_assets')
      .select('id, location, city, area, media_type, dimension, qr_code_url, latitude, longitude, primary_photo_url')
      .in('id', assetIds);

    const assetMap = new Map(mediaAssets?.map(a => [a.id, a]) || []);

    console.log('Media assets mapped:', assetIds.length);

    // Create PowerPoint
    const pptx = new pptxgen();
    pptx.author = company?.name || 'Go-Ads 360°';
    pptx.company = company?.name || 'Go-Ads 360°';
    pptx.title = `${campaign.campaign_name} - Proof of Performance`;

    // Slide 1: Title/Cover
    const titleSlide = pptx.addSlide();
    titleSlide.background = { color: '1E40AF' };
    
    if (company?.logo_url) {
      try {
        titleSlide.addImage({ 
          path: company.logo_url, 
          x: 4.0, 
          y: 1.0, 
          w: 2.0, 
          h: 0.8 
        });
      } catch (e) {
        console.log('Could not add logo:', e);
      }
    }

    titleSlide.addText(sanitizePptText('PROOF OF PERFORMANCE'), {
      x: 1.0,
      y: 2.5,
      w: 8.0,
      h: 1.0,
      fontSize: 44,
      bold: true,
      color: 'FFFFFF',
      align: 'center',
      fontFace: PPT_SAFE_FONT,
    });

    titleSlide.addText(sanitizePptText(campaign.campaign_name), {
      x: 1.0,
      y: 3.6,
      w: 8.0,
      h: 0.6,
      fontSize: 32,
      color: 'FFFFFF',
      align: 'center',
      fontFace: PPT_SAFE_FONT,
    });

    titleSlide.addText(sanitizePptText(`Client: ${campaign.clients?.name || campaign.client_name}`), {
      x: 1.0,
      y: 4.4,
      w: 8.0,
      h: 0.5,
      fontSize: 20,
      color: 'E0E7FF',
      align: 'center',
      fontFace: PPT_SAFE_FONT,
    });

    titleSlide.addText(
      sanitizePptText(
        `Campaign Period: ${new Date(campaign.start_date).toLocaleDateString('en-IN')} - ${new Date(campaign.end_date).toLocaleDateString('en-IN')}`
      ),
      {
        x: 1.0,
        y: 5.0,
        w: 8.0,
        h: 0.4,
        fontSize: 16,
        color: 'E0E7FF',
        align: 'center',
        fontFace: PPT_SAFE_FONT,
      }
    );

    // Add asset slides from campaign_assets
    let slidesWithPhotos = 0;
    for (const campaignAsset of campaignAssets || []) {
      const asset = assetMap.get(campaignAsset.asset_id);
      
      // Get photos from campaign_assets.photos jsonb
      let photos: any[] = [];
      if (campaignAsset.photos && typeof campaignAsset.photos === 'object') {
        const photosObj = campaignAsset.photos as Record<string, string>;
        photos = Object.entries(photosObj)
          .filter(([_, url]) => url && url.trim() !== '')
          .map(([type, url]) => ({ photo_type: type, file_path: url }));
      }

      // Always create slide for verified/completed assets even without photos
      const hasPhotos = photos.length > 0;
      const isCompleted = campaignAsset.status === 'Verified' || campaignAsset.status === 'Completed';
      if (hasPhotos) slidesWithPhotos++;

      const slide = pptx.addSlide();

      // Header with asset info
      slide.addText(sanitizePptText(campaignAsset.location || asset?.location || 'Unknown Location'), {
        x: 0.5,
        y: 0.3,
        w: 9.0,
        h: 0.5,
        fontSize: 24,
        bold: true,
        color: '1E40AF',
        fontFace: PPT_SAFE_FONT,
      });

      slide.addText(
        sanitizePptText(
          `${campaignAsset.city || asset?.city}, ${campaignAsset.area || asset?.area} • ${campaignAsset.media_type || asset?.media_type} • ${campaignAsset.dimensions || asset?.dimension || 'N/A'}`
        ),
        {
          x: 0.5,
          y: 0.8,
          w: 6.5,
          h: 0.3,
          fontSize: 12,
          color: '666666',
          fontFace: PPT_SAFE_FONT,
        }
      );

      // Status badge
      const statusColor = campaignAsset.status === 'Verified' || campaignAsset.status === 'Completed' ? '10B981' : 'F59E0B';
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 7.5,
        y: 0.75,
        w: 1.5,
        h: 0.35,
        fill: { color: statusColor },
      });

      slide.addText(sanitizePptText(campaignAsset.status || 'Pending'), {
        x: 7.5,
        y: 0.8,
        w: 1.5,
        h: 0.3,
        fontSize: 10,
        bold: true,
        color: 'FFFFFF',
        align: 'center',
        fontFace: PPT_SAFE_FONT,
      });

      // Add QR code if available
      if (asset?.qr_code_url) {
        try {
          slide.addImage({
            path: asset.qr_code_url,
            x: 7.8,
            y: 1.5,
            w: 1.2,
            h: 1.2,
          });
          slide.addText('QR Code', {
            x: 7.8,
            y: 2.8,
            w: 1.2,
            h: 0.2,
            fontSize: 8,
            color: '666666',
            align: 'center',
          });
        } catch (e) {
          console.log('Could not add QR code:', e);
        }
      }

      // Add photos in 2x2 grid (show placeholders if missing)
      const photoTypes = ['geo', 'newspaper', 'traffic1', 'traffic2'];
      const photoLabels = ['Geo-tagged Photo', 'Newspaper Ad', 'Traffic View 1', 'Traffic View 2'];
      
      for (let i = 0; i < 4; i++) {
        const photo = photos.find((p: any) => p.photo_type === photoTypes[i]);
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = 0.5 + (col * 3.5);
        const y = 1.5 + (row * 2.5);

        if (photo?.file_path) {
          try {
            // Photo image
            slide.addImage({
              path: photo.file_path,
              x,
              y,
              w: 3.2,
              h: 2.0,
            });
          } catch (e) {
            console.log('Could not add photo:', e);
            // Add placeholder box on error
            slide.addShape(pptx.ShapeType.roundRect, {
              x, y, w: 3.2, h: 2.0,
              fill: { color: 'F8FAFC' },
              line: { color: 'E2E8F0', width: 1 },
            });
            slide.addText('Photo unavailable', {
              x, y: y + 0.8, w: 3.2, h: 0.4,
              fontSize: 12, color: '94A3B8', align: 'center',
            });
          }
        } else {
          // Add placeholder for missing photo
          slide.addShape(pptx.ShapeType.roundRect, {
            x, y, w: 3.2, h: 2.0,
            fill: { color: 'FEF3C7' },
            line: { color: 'F59E0B', width: 1, dashType: 'dash' },
          });
          slide.addText('Photo pending', {
            x, y: y + 0.8, w: 3.2, h: 0.4,
            fontSize: 12, color: 'D97706', align: 'center',
          });
        }

        // Photo label
        slide.addText(sanitizePptText(photoLabels[i]), {
          x,
          y: y + 2.05,
          w: 3.2,
          h: 0.25,
          fontSize: 10,
          bold: true,
          color: '333333',
          align: 'center',
          fontFace: PPT_SAFE_FONT,
        });
      }

      // Footer with mounter info
      const mounterName = campaignAsset.mounter_name || 'N/A';
      const completedDate = campaignAsset.completed_at;
      slide.addText(
        sanitizePptText(
          `Installed by: ${mounterName} | Completed: ${completedDate ? new Date(completedDate).toLocaleDateString('en-IN') : 'Pending'}`
        ),
        {
          x: 0.5,
          y: 6.8,
          w: 9.0,
          h: 0.3,
          fontSize: 10,
          color: '999999',
          italic: true,
          fontFace: PPT_SAFE_FONT,
        }
      );
    }

    // If no slides with photos, add a placeholder slide
    if (slidesWithPhotos === 0) {
      const noDataSlide = pptx.addSlide();
      noDataSlide.addText('No Proof Photos Available', {
        x: 1.0,
        y: 2.5,
        w: 8.0,
        h: 1.0,
        fontSize: 32,
        bold: true,
        color: '666666',
        align: 'center',
      });
      noDataSlide.addText('Photos will appear here once field operations upload proof images.', {
        x: 1.0,
        y: 3.5,
        w: 8.0,
        h: 0.5,
        fontSize: 16,
        color: '999999',
        align: 'center',
      });
    }

    // Summary slide
    const summarySlide = pptx.addSlide();
    summarySlide.addText('Campaign Summary', {
      x: 0.5,
      y: 0.5,
      w: 9.0,
      h: 0.6,
      fontSize: 32,
      bold: true,
      color: '1E40AF',
    });

    const totalAssets = campaignAssets?.length || 0;
    const completedAssets = campaignAssets?.filter(ca => ca.status === 'Verified' || ca.status === 'Completed').length || 0;
    const completionRate = totalAssets > 0 ? Math.round((completedAssets / totalAssets) * 100) : 0;

    const stats = [
      { label: 'Total Assets', value: totalAssets.toString() },
      { label: 'Completed', value: completedAssets.toString() },
      { label: 'Completion Rate', value: `${completionRate}%` },
      { label: 'Campaign Period', value: `${new Date(campaign.start_date).toLocaleDateString('en-IN')} - ${new Date(campaign.end_date).toLocaleDateString('en-IN')}` },
    ];

    stats.forEach((stat, i) => {
      const y = 1.8 + (i * 1.2);
      
      summarySlide.addShape(pptx.ShapeType.roundRect, {
        x: 1.5,
        y,
        w: 7.0,
        h: 0.8,
        fill: { color: 'F8FAFC' },
        line: { color: '1E40AF', width: 1, type: 'solid' },
      });

      summarySlide.addText(stat.label, {
        x: 2.0,
        y: y + 0.15,
        w: 4.0,
        h: 0.5,
        fontSize: 18,
        color: '666666',
      });

      summarySlide.addText(stat.value, {
        x: 6.0,
        y: y + 0.1,
        w: 2.0,
        h: 0.6,
        fontSize: 24,
        bold: true,
        color: '1E40AF',
        align: 'right',
      });
    });

    // Generate PPT binary
    const pptxBuffer = await pptx.write({ outputType: 'arraybuffer' });

    // HARD FAIL validation: ensure no invalid rels XML is produced
    await validatePptxRelationships(pptxBuffer as ArrayBuffer);

    // Upload to storage
    const fileName = `PROOF-${campaign.id}-${Date.now()}.pptx`;
    const { error: uploadError } = await supabase.storage
      .from('client-documents')
      .upload(fileName, pptxBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Update campaign with proof URL
    const { data: urlData } = supabase.storage
      .from('client-documents')
      .getPublicUrl(fileName);

    await supabase
      .from('campaigns')
      .update({ 
        proof_ppt_url: urlData.publicUrl,
        public_proof_ppt_url: urlData.publicUrl 
      })
      .eq('id', campaign_id);

    // Get signed URL for immediate download
    const { data: signedUrlData } = await supabase.storage
      .from('client-documents')
      .createSignedUrl(fileName, 3600);

    console.log('Proof PPT generated successfully:', fileName, 'Slides with photos:', slidesWithPhotos);

    return new Response(
      JSON.stringify({
        success: true,
        file_url: signedUrlData?.signedUrl,
        public_url: urlData.publicUrl,
        fileName,
        slideCount: slidesWithPhotos + 2,
        totalAssets,
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