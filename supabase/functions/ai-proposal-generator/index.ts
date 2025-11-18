import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { planId } = await req.json();
    console.log('Generating proposal for plan:', planId);

    // Fetch plan with items and client details
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select(`
        *,
        clients:client_id (name, company, city, contact_person)
      `)
      .eq('id', planId)
      .single();

    if (planError) throw planError;

    const { data: items, error: itemsError } = await supabase
      .from('plan_items')
      .select(`
        *,
        media_assets:asset_id (city, area, location, media_type, dimension, direction)
      `)
      .eq('plan_id', planId);

    if (itemsError) throw itemsError;

    console.log('Plan:', plan, 'Items:', items);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    // Generate professional proposal text
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a professional copywriter for OOH advertising proposals. Create compelling, persuasive proposals that:
- Open with a strong executive summary
- Highlight strategic asset locations and visibility
- Emphasize ROI and audience reach
- Use professional, confident tone
- Include clear next steps

Format in markdown for easy conversion to email/document.`
          },
          {
            role: 'user',
            content: `Create a professional OOH advertising proposal:

Client: ${plan.clients.name} (${plan.clients.company || ''})
Contact: ${plan.clients.contact_person || 'N/A'}
Campaign: ${plan.name}
Duration: ${plan.start_date} to ${plan.end_date}
Total Investment: ₹${plan.grand_total?.toLocaleString('en-IN') || 0}

Assets (${items?.length || 0} locations):
${items?.map((item: any, i: number) => `
${i + 1}. ${item.media_assets.media_type} - ${item.media_assets.location}, ${item.media_assets.area}, ${item.media_assets.city}
   - Size: ${item.media_assets.dimension}
   - Direction: ${item.media_assets.direction}
   - Rate: ₹${item.negotiated_rate?.toLocaleString('en-IN') || 0}/month
`).join('')}

Additional Details:
- Total Sqft: ${items?.reduce((sum: number, item: any) => sum + (item.media_assets.total_sqft || 0), 0) || 0}
- GST: ₹${plan.gst_amount?.toLocaleString('en-IN') || 0}

Create a persuasive proposal highlighting strategic locations, audience reach, and campaign impact.`
          }
        ]
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const proposalText = aiData.choices[0]?.message?.content;

    if (!proposalText) throw new Error('No proposal generated');

    console.log('Proposal generated:', proposalText.substring(0, 200) + '...');

    // Generate WhatsApp and Email versions
    const whatsappVersion = proposalText
      .replace(/\*\*/g, '*')  // Convert markdown bold
      .replace(/^# /gm, '')   // Remove markdown headers
      .substring(0, 1000) + '\n\n📎 Full proposal attached';

    const emailVersion = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #1e40af; border-bottom: 3px solid #10b981; padding-bottom: 10px; }
    h2 { color: #1e40af; margin-top: 30px; }
    .highlight { background: #f0fdf4; padding: 15px; border-left: 4px solid #10b981; margin: 20px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; font-size: 14px; color: #6b7280; }
  </style>
</head>
<body>
  ${proposalText.replace(/\n/g, '<br>')}
  <div class="footer">
    <p>This proposal is valid for 30 days from the date of issue.</p>
    <p>For questions or to proceed, please contact us at your earliest convenience.</p>
  </div>
</body>
</html>
`;

    return new Response(
      JSON.stringify({
        success: true,
        proposal: {
          markdown: proposalText,
          whatsapp: whatsappVersion,
          email: emailVersion
        },
        plan: {
          id: plan.id,
          client: plan.clients.name,
          totalAmount: plan.grand_total
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Proposal generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
