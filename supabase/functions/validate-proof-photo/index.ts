import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, photoType } = await req.json();

    if (!imageUrl || !photoType) {
      return new Response(
        JSON.stringify({ error: "Missing imageUrl or photoType" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Define validation criteria based on photo type
    const validationPrompts: Record<string, string> = {
      "Newspaper": `Analyze this proof photo. Check if:
1. A newspaper is clearly visible in the photo
2. The newspaper date is readable (should be recent)
3. The media asset/billboard is clearly visible in the background
4. The photo is properly framed (not blurry, good lighting)
5. The newspaper is held in front of the asset

Return a JSON with: score (0-100), issues (array of problems found), suggestions (array of improvements).`,
      
      "Geo-Tagged": `Analyze this geo-tagged proof photo. Check if:
1. The media asset/billboard is the main subject
2. Surrounding landmarks or street signs are visible for location verification
3. The photo is clear and well-lit
4. The asset is fully visible in the frame
5. No obstructions blocking the view

Return a JSON with: score (0-100), issues (array of problems found), suggestions (array of improvements).`,
      
      "Traffic": `Analyze this traffic view photo. Check if:
1. The media asset is clearly visible
2. Traffic or pedestrians are visible showing the area is active
3. The viewing angle shows how visible the asset is from traffic
4. The photo quality is good (clear, not blurry)
5. The full asset is in frame

Return a JSON with: score (0-100), issues (array of problems found), suggestions (array of improvements).`,
      
      "Other": `Analyze this proof photo. Check if:
1. The media asset is clearly visible
2. The photo is well-framed and clear
3. Good lighting and no blur
4. The asset is the main subject

Return a JSON with: score (0-100), issues (array of problems found), suggestions (array of improvements).`
    };

    const prompt = validationPrompts[photoType] || validationPrompts["Other"];

    // Call Lovable AI with vision capabilities
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { 
                type: "image_url", 
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse the JSON response
    const validation = JSON.parse(content);

    // Add quality level based on score
    validation.quality = validation.score >= 80 ? "excellent" : 
                        validation.score >= 60 ? "good" : 
                        validation.score >= 40 ? "acceptable" : "poor";

    validation.approved = validation.score >= 40; // Auto-approve if score >= 40

    return new Response(
      JSON.stringify(validation),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Validation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
