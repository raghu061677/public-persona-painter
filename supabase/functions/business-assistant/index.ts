// v2.0 - Phase-6 Security: withAuth + getAuthContext + rate limiting
import {
  getAuthContext, checkRateLimit, jsonError, withAuth,
} from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(withAuth(async (req) => {
  const ctx = await getAuthContext(req);

  // Rate limit: 30/min per user
  checkRateLimit(`business-assistant:${ctx.userId}`, 30, 60000);

  const body = await req.json().catch(() => null);
  if (!body?.messages || !Array.isArray(body.messages)) {
    return jsonError('messages array is required', 400);
  }

  const { messages } = body;
  const lastMessage = messages[messages.length - 1]?.content || '';
  if (lastMessage.length > 2000) {
    return jsonError('Message too long (max 2000 characters)', 400);
  }

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    return jsonError('AI service not configured', 500);
  }

  const systemPrompt = `You are a helpful AI assistant for Go-Ads 360°, an OOH (Out-of-Home) media management platform.

You can help with:
- Finding vacant media assets by location, type, or specifications
- Providing client information and history
- Campaign status and performance
- Financial summaries and pending invoices
- Power bill tracking and expense management

When users ask questions:
1. Be concise and professional
2. Provide actionable information
3. Reference specific asset IDs, client names, or campaign IDs when relevant
4. Suggest next steps when appropriate

Keep responses clear and brief unless detailed analysis is requested.`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      stream: true,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) return jsonError('Rate limit exceeded. Please try again later.', 429);
    if (response.status === 402) return jsonError('AI credits exhausted.', 402);
    console.error('AI gateway error:', response.status);
    return jsonError('AI gateway error', 500);
  }

  return new Response(response.body, {
    headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
  });
}));
