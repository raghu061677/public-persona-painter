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
    const { rawMessage, source } = await req.json();
    console.log('Parsing lead from:', source, 'Message:', rawMessage);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Call Lovable AI Gateway to parse lead data
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
            content: `You are an AI that extracts structured lead information from messages. Extract:
- name (person/company name)
- phone (phone number)
- email
- location (city/area)
- requirement (what they need - media type, quantity, duration, budget)
- metadata (any additional context)

Return ONLY valid JSON with these fields. Use null for missing data.`
          },
          {
            role: 'user',
            content: `Extract lead information from this ${source} message:\n\n${rawMessage}`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_lead_data',
              description: 'Extract structured lead information from raw message',
              parameters: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Contact name or company name' },
                  phone: { type: 'string', description: 'Phone number' },
                  email: { type: 'string', description: 'Email address' },
                  location: { type: 'string', description: 'City or area mentioned' },
                  requirement: { type: 'string', description: 'What they need (media type, budget, duration)' },
                  metadata: { type: 'object', description: 'Additional context or details' }
                },
                required: ['name'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_lead_data' } }
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
    console.log('AI Response:', JSON.stringify(aiData, null, 2));

    // Extract structured data from tool call
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const parsedData = JSON.parse(toolCall.function.arguments);
    console.log('Parsed lead data:', parsedData);

    return new Response(
      JSON.stringify({ 
        success: true,
        parsedData,
        source 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Lead parsing error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
