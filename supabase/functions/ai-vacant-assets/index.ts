import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { requirements } = await req.json();
    console.log('Finding vacant assets for:', requirements);

    // Get user's company
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) throw new Error('Unauthorized');

    const { data: companyUser } = await supabase
      .from('company_users')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!companyUser) throw new Error('Company not found');

    // Fetch available assets
    let query = supabase
      .from('media_assets')
      .select('*')
      .eq('company_id', companyUser.company_id)
      .eq('status', 'Available');

    // Apply filters from requirements
    if (requirements.city) {
      query = query.ilike('city', `%${requirements.city}%`);
    }
    if (requirements.area) {
      query = query.ilike('area', `%${requirements.area}%`);
    }
    if (requirements.mediaType) {
      query = query.eq('media_type', requirements.mediaType);
    }

    const { data: assets, error } = await query.limit(50);
    if (error) throw error;

    console.log(`Found ${assets?.length || 0} available assets`);

    if (!assets || assets.length === 0) {
      return new Response(
        JSON.stringify({ 
          recommendations: [],
          message: 'No available assets match your criteria' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Lovable AI to rank and recommend assets
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

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
            content: `You are an OOH media expert. Analyze assets and recommend the best matches based on client requirements. Consider:
- Location (high-traffic areas are better)
- Size (larger is more visible)
- Price (balance budget with quality)
- Media type match
- Area relevance

Return top 10 recommendations with reasoning.`
          },
          {
            role: 'user',
            content: `Client Requirements: ${JSON.stringify(requirements, null, 2)}

Available Assets: ${JSON.stringify(assets.slice(0, 20), null, 2)}

Recommend the best assets and explain why each is suitable.`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'recommend_assets',
              description: 'Recommend top assets with reasoning',
              parameters: {
                type: 'object',
                properties: {
                  recommendations: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        asset_id: { type: 'string' },
                        score: { type: 'number', description: 'Match score 0-100' },
                        reasoning: { type: 'string', description: 'Why this asset is recommended' }
                      },
                      required: ['asset_id', 'score', 'reasoning']
                    }
                  }
                },
                required: ['recommendations'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'recommend_assets' } }
      }),
    });

    if (!aiResponse.ok) {
      console.error('AI Gateway error:', aiResponse.status);
      // Fallback: return assets without AI ranking
      return new Response(
        JSON.stringify({ 
          recommendations: assets.slice(0, 10).map(a => ({ asset: a, score: 50, reasoning: 'Matches basic criteria' }))
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const aiRecommendations = JSON.parse(toolCall.function.arguments);
    console.log('AI Recommendations:', aiRecommendations);

    // Merge AI recommendations with asset data
    const enrichedRecommendations = aiRecommendations.recommendations
      .map((rec: any) => {
        const asset = assets.find(a => a.id === rec.asset_id);
        return asset ? { ...rec, asset } : null;
      })
      .filter((r: any) => r !== null)
      .slice(0, 10);

    return new Response(
      JSON.stringify({ 
        recommendations: enrichedRecommendations,
        totalAvailable: assets.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Vacant assets error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
