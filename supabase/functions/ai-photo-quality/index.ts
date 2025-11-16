import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { photoUrl, photoType } = await req.json();
    console.log('Analyzing photo quality:', photoType, photoUrl);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Validation criteria by photo type
    const criteria = {
      newspaper: 'Check if newspaper with ad is clearly visible and readable',
      geotag: 'Check if location/GPS coordinates are visible and asset is clearly shown',
      traffic1: 'Check if asset is visible with traffic/street view context',
      traffic2: 'Check if asset is visible from another angle with traffic context'
    };

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
            content: `You are a quality control expert for OOH advertising proof photos. Analyze photos and score them 0-100 based on:
- Clarity (sharp, well-lit, focused)
- Compliance (meets requirements for photo type)
- Completeness (all required elements visible)
- Professional quality

Be strict but fair. Minimum passing score is 70.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Photo Type: ${photoType}
Criteria: ${criteria[photoType as keyof typeof criteria] || 'General quality check'}

Analyze this proof photo and provide quality score with detailed feedback.`
              },
              {
                type: 'image_url',
                image_url: { url: photoUrl }
              }
            ]
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'score_photo_quality',
              description: 'Score photo quality and provide feedback',
              parameters: {
                type: 'object',
                properties: {
                  score: { 
                    type: 'number', 
                    description: 'Quality score 0-100',
                    minimum: 0,
                    maximum: 100
                  },
                  passed: { 
                    type: 'boolean',
                    description: 'True if score >= 70'
                  },
                  issues: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'List of quality issues found'
                  },
                  recommendations: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'How to improve photo quality'
                  }
                },
                required: ['score', 'passed', 'issues', 'recommendations'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'score_photo_quality' } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const qualityReport = JSON.parse(toolCall.function.arguments);
    console.log('Quality report:', qualityReport);

    return new Response(
      JSON.stringify({
        success: true,
        photoType,
        ...qualityReport
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Photo quality error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
