import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  campaignId: string;
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

    // Verify user authentication and company access
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { campaignId } = await req.json() as RequestBody;

    console.log('Generating proof PPT for campaign:', campaignId);

    // Fetch campaign with assets and photos
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select(`
        *,
        clients!inner(name),
        campaign_assets(
          id,
          asset_id,
          location,
          city,
          area,
          media_type,
          status,
          photos
        )
      `)
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error('Campaign not found');
    }

    // Verify user has access to this campaign's company
    const { data: companyUser } = await supabase
      .from('company_users')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('company_id', campaign.company_id)
      .eq('status', 'active')
      .single();
    
    if (!companyUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No access to this campaign' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch company details
    const { data: company } = await supabase
      .from('companies')
      .select('name, logo_url')
      .eq('id', campaign.company_id)
      .single();

    // Prepare slides data
    const slides = [];

    // Title slide
    slides.push({
      type: 'title',
      title: campaign.campaign_name,
      subtitle: `Proof of Performance\n${campaign.clients.name}`,
      date: new Date().toLocaleDateString('en-IN'),
      companyName: company?.name,
      companyLogo: company?.logo_url,
    });

    // Asset slides with photos
    for (const asset of campaign.campaign_assets || []) {
      if (asset.photos && Object.keys(asset.photos).length > 0) {
        const photos = asset.photos as Record<string, string>;
        
        slides.push({
          type: 'asset',
          location: asset.location,
          city: asset.city,
          area: asset.area,
          mediaType: asset.media_type,
          status: asset.status,
          photos: [
            { type: 'Newspaper', url: photos.newspaper },
            { type: 'Geo-tagged', url: photos.geotag },
            { type: 'Traffic View 1', url: photos.traffic1 },
            { type: 'Traffic View 2', url: photos.traffic2 },
          ].filter(p => p.url),
        });
      }
    }

    // Summary slide
    const verifiedCount = campaign.campaign_assets?.filter((a: any) => a.status === 'Verified').length || 0;
    const totalAssets = campaign.campaign_assets?.length || 0;

    slides.push({
      type: 'summary',
      title: 'Campaign Summary',
      stats: {
        totalAssets,
        verifiedAssets: verifiedCount,
        completionRate: totalAssets > 0 ? Math.round((verifiedCount / totalAssets) * 100) : 0,
        startDate: new Date(campaign.start_date).toLocaleDateString('en-IN'),
        endDate: new Date(campaign.end_date).toLocaleDateString('en-IN'),
      },
    });

    // Generate PPT using simple HTML-based approach
    const pptHtml = generatePPTHTML(slides);
    
    // Convert to bytes
    const pptBuffer = new TextEncoder().encode(pptHtml);

    // Upload to storage
    const fileName = `proof-${campaign.id}-${Date.now()}.html`;
    const { error: uploadError } = await supabase.storage
      .from('client-documents')
      .upload(fileName, pptBuffer, {
        contentType: 'text/html',
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get signed URL
    const { data: urlData } = await supabase.storage
      .from('client-documents')
      .createSignedUrl(fileName, 3600);

    console.log('Proof PPT generated successfully:', fileName);

    return new Response(
      JSON.stringify({
        success: true,
        url: urlData?.signedUrl,
        fileName,
        slideCount: slides.length,
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

function generatePPTHTML(slides: any[]): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Campaign Proof of Performance</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #f0f0f0; }
    .slide { 
      width: 1024px; 
      height: 768px; 
      margin: 20px auto; 
      background: white; 
      padding: 40px; 
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      page-break-after: always;
    }
    .title-slide { 
      display: flex; 
      flex-direction: column; 
      justify-content: center; 
      align-items: center; 
      text-align: center;
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      color: white;
    }
    .title-slide h1 { font-size: 48px; margin-bottom: 20px; }
    .title-slide h2 { font-size: 32px; margin-bottom: 40px; opacity: 0.9; }
    .asset-slide h2 { font-size: 32px; margin-bottom: 20px; color: #1e40af; }
    .asset-slide .info { font-size: 18px; color: #666; margin-bottom: 30px; }
    .photos { 
      display: grid; 
      grid-template-columns: 1fr 1fr; 
      gap: 20px; 
      margin-top: 20px;
    }
    .photo { text-align: center; }
    .photo img { 
      width: 100%; 
      height: 300px; 
      object-fit: cover; 
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .photo-label { 
      margin-top: 10px; 
      font-size: 14px; 
      font-weight: bold; 
      color: #333;
    }
    .summary-slide { 
      display: flex; 
      flex-direction: column; 
      justify-content: center;
    }
    .summary-slide h2 { font-size: 40px; margin-bottom: 40px; color: #1e40af; }
    .stat { 
      display: flex; 
      justify-content: space-between; 
      padding: 20px; 
      margin: 10px 0;
      background: #f8fafc;
      border-left: 4px solid #1e40af;
      border-radius: 4px;
    }
    .stat-label { font-size: 20px; color: #666; }
    .stat-value { font-size: 28px; font-weight: bold; color: #1e40af; }
    @media print {
      .slide { 
        page-break-after: always; 
        margin: 0;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  ${slides.map(slide => {
    if (slide.type === 'title') {
      return `
        <div class="slide title-slide">
          ${slide.companyLogo ? `<img src="${slide.companyLogo}" style="max-width: 200px; margin-bottom: 40px;">` : ''}
          <h1>${slide.title}</h1>
          <h2>${slide.subtitle.replace(/\n/g, '<br>')}</h2>
          <p style="font-size: 18px; opacity: 0.8;">${slide.date}</p>
        </div>
      `;
    } else if (slide.type === 'asset') {
      return `
        <div class="slide asset-slide">
          <h2>${slide.location}</h2>
          <div class="info">
            <strong>${slide.city}</strong>, ${slide.area} • ${slide.mediaType}
            <span style="float: right; padding: 4px 12px; background: #10b981; color: white; border-radius: 4px; font-size: 14px;">
              ${slide.status}
            </span>
          </div>
          <div class="photos">
            ${slide.photos.map((photo: any) => `
              <div class="photo">
                <img src="${photo.url}" alt="${photo.type}">
                <div class="photo-label">${photo.type}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else if (slide.type === 'summary') {
      return `
        <div class="slide summary-slide">
          <h2>${slide.title}</h2>
          <div class="stat">
            <span class="stat-label">Total Assets</span>
            <span class="stat-value">${slide.stats.totalAssets}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Verified Assets</span>
            <span class="stat-value">${slide.stats.verifiedAssets}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Completion Rate</span>
            <span class="stat-value">${slide.stats.completionRate}%</span>
          </div>
          <div class="stat">
            <span class="stat-label">Campaign Period</span>
            <span class="stat-value">${slide.stats.startDate} - ${slide.stats.endDate}</span>
          </div>
        </div>
      `;
    }
    return '';
  }).join('')}
</body>
</html>
  `.trim();
}
