// v2.0 - Phase-6 Security: withAuth + getAuthContext + rate limiting
import {
  getAuthContext, checkRateLimit, jsonError, withAuth, supabaseServiceClient,
} from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';

const SAFE_AVAILABILITY_SELECT = [
  'asset_id',
  'media_asset_code',
  'media_type',
  'city',
  'area',
  'location',
  'facing',
  'size',
  'total_sqft',
  'illumination_type',
  'card_rate',
  'availability_status',
  'booking_start_date',
  'booking_end_date',
  'next_available_date',
  'company_id',
].join(', ');

const MEDIA_TYPE_MAP: Record<string, string> = {
  'bus shelter': 'Bus Shelter', 'bus shelters': 'Bus Shelter', 'bqs': 'Bus Shelter', 'bus queue': 'Bus Shelter',
  'hoarding': 'Hoarding', 'hoardings': 'Hoarding', 'billboard': 'Hoarding', 'billboards': 'Hoarding',
  'unipole': 'Unipole', 'unipoles': 'Unipole',
  'cantilever': 'Cantilever', 'cantilevers': 'Cantilever',
  'gantry': 'Gantry', 'gantries': 'Gantry',
  'skywalk': 'Skywalk',
  'pole kiosk': 'Pole Kiosk', 'kiosk': 'Pole Kiosk',
  'foot over bridge': 'FOB', 'fob': 'FOB',
};

const AREAS = [
  'begumpet','ameerpet','kukatpally','gachibowli','madhapur','hitech city',
  'jubilee hills','banjara hills','secunderabad','uppal','dilsukhnagar',
  'lb nagar','mehdipatnam','abids','koti','raidurgam','kondapur',
  'miyapur','chandanagar','lingampally','manikonda','attapur','tolichowki',
  'somajiguda','lakdi ka pul','panjagutta','erragadda','sr nagar',
  'habsiguda','tarnaka','malkajgiri','bowenpally','trimulgherry',
  'kompally','alwal','shamshabad','rajendranagar','nagole','vanasthalipuram',
];

const CITIES = ['hyderabad', 'bangalore', 'mumbai', 'delhi', 'chennai', 'pune', 'kolkata', 'ahmedabad', 'visakhapatnam', 'vizag', 'warangal', 'secunderabad'];

function titleCase(s: string): string {
  return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function isAvailabilityQuery(message: string): boolean {
  return /\b(vacant|available|availability|free media|open sites?)\b/i.test(message);
}

function parseAvailabilityFilters(message: string): Record<string, any> {
  const lower = message.toLowerCase();
  const filters: Record<string, any> = {};
  for (const [key, value] of Object.entries(MEDIA_TYPE_MAP)) {
    if (lower.includes(key)) { filters.media_type = value; break; }
  }
  for (const area of AREAS) {
    if (lower.includes(area)) { filters.area = titleCase(area); break; }
  }
  for (const city of CITIES) {
    if (lower.includes(city)) { filters.city = city === 'vizag' ? 'Visakhapatnam' : titleCase(city); break; }
  }
  const priceMatch = lower.match(/(?:under|below|less than|<)\s*₹?\s*(\d+)(k)?/);
  if (priceMatch) filters.price_max = parseInt(priceMatch[1], 10) * (priceMatch[2] === 'k' ? 1000 : 1);
  return filters;
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseDateRange(message: string): { start: string; end: string } {
  const lower = message.toLowerCase();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const ddRange = lower.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4}).*?(?:to|-|until|till)\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (ddRange) {
    return {
      start: `${ddRange[3]}-${ddRange[2].padStart(2, '0')}-${ddRange[1].padStart(2, '0')}`,
      end: `${ddRange[6]}-${ddRange[5].padStart(2, '0')}-${ddRange[4].padStart(2, '0')}`,
    };
  }
  if (lower.includes('next week')) {
    const s = new Date(today); s.setDate(s.getDate() + 7);
    const e = new Date(s); e.setDate(e.getDate() + 6);
    return { start: fmtDate(s), end: fmtDate(e) };
  }
  if (lower.includes('next month')) {
    const s = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const e = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    return { start: fmtDate(s), end: fmtDate(e) };
  }
  return { start: fmtDate(today), end: fmtDate(today) };
}

function isAvailableForRange(row: any, start: string, end: string): boolean {
  if (String(row.availability_status || '').toUpperCase() === 'AVAILABLE') return true;
  if (!row.booking_start_date || !row.booking_end_date) return true;
  return !(row.booking_start_date <= end && row.booking_end_date >= start);
}

function displayDate(date: string): string {
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}`;
}

function renderAvailabilitySse(content: string): Response {
  const payload = `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\ndata: [DONE]\n\n`;
  return new Response(payload, { headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' } });
}

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

  if (isAvailabilityQuery(lastMessage)) {
    const content = await getGroundedAvailabilityReply(ctx.companyId, lastMessage);
    return renderAvailabilitySse(content);
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

async function getGroundedAvailabilityReply(companyId: string, message: string): Promise<string> {
  const filters = parseAvailabilityFilters(message);
  const { start, end } = parseDateRange(message);
  const supabase = supabaseServiceClient();

  let query = supabase
    .from('asset_availability_view')
    .select(SAFE_AVAILABILITY_SELECT)
    .eq('company_id', companyId);

  if (filters.area) query = query.ilike('area', `%${filters.area}%`);
  if (filters.city) query = query.ilike('city', `%${filters.city}%`);
  if (filters.media_type) query = query.ilike('media_type', `%${filters.media_type}%`);
  if (filters.price_max) query = query.lte('card_rate', filters.price_max);

  const { data, error } = await query.order('area').limit(200);
  if (error) {
    console.error('[business-assistant] availability DB error:', error);
    return 'Sorry, I could not fetch live media availability right now. Please try again.';
  }

  const byAsset = new Map<string, any>();
  for (const row of data || []) {
    const existing = byAsset.get(row.asset_id);
    if (!existing) {
      byAsset.set(row.asset_id, row);
      continue;
    }
    const rowAvailable = isAvailableForRange(row, start, end);
    const existingAvailable = isAvailableForRange(existing, start, end);
    if (rowAvailable && !existingAvailable) byAsset.set(row.asset_id, row);
  }

  const rows = Array.from(byAsset.values()).filter(row => isAvailableForRange(row, start, end));
  const locLabel = [filters.area, filters.city].filter(Boolean).join(', ') || 'your search';
  if (!rows.length) {
    const suggestion = await suggestNearbyBusiness(companyId, filters, start, end);
    const base = `No vacant media assets found for ${locLabel} from ${displayDate(start)} to ${displayDate(end)}.`;
    return suggestion ? `${base}\n\n${suggestion}` : base;
  }

  const list = rows.slice(0, 10).map((row, index) => {
    const code = row.media_asset_code || row.asset_id;
    const details = [
      `${index + 1}. **${code}** — ${row.media_type || 'Media'}`,
      `   Area: ${row.area || '—'}, ${row.city || '—'}`,
    ];
    if (row.location) details.push(`   Location: ${row.location}`);
    if (row.facing) details.push(`   Direction: ${row.facing}`);
    const size = [row.size, row.total_sqft ? `${row.total_sqft} sq.ft` : null].filter(Boolean).join(' / ');
    if (size) details.push(`   Size: ${size}`);
    if (row.card_rate) details.push(`   Card Rate: ₹${Number(row.card_rate).toLocaleString('en-IN')} per month`);
    details.push('   Status: Available');
    const bs = row.booking_start_date;
    const be = row.booking_end_date;
    if (row.next_available_date && bs && be) {
      details.push(`   Available Window: from ${displayDate(row.next_available_date)} (currently booked ${displayDate(bs)}–${displayDate(be)})`);
    } else {
      details.push(`   Available Window: Open — no current bookings`);
    }
    return details.join('\n');
  }).join('\n\n');

  const more = rows.length > 10 ? '\n\n_Showing first 10. Narrow your search to see more._' : '';
  return `Found **${rows.length}** vacant media asset${rows.length > 1 ? 's' : ''} for ${locLabel} from ${displayDate(start)} to ${displayDate(end)}:\n\n${list}${more}`;
}

async function suggestNearbyBusiness(
  companyId: string,
  filters: Record<string, any>,
  start: string,
  end: string,
): Promise<string | null> {
  const supabase = supabaseServiceClient();
  const tries: Array<{ label: string; apply: (q: any) => any }> = [];
  if (filters.area && filters.city) {
    tries.push({ label: `Other areas in ${filters.city}`, apply: (q) => {
      let qq = q.ilike('city', `%${filters.city}%`);
      if (filters.media_type) qq = qq.ilike('media_type', `%${filters.media_type}%`);
      return qq;
    }});
  }
  if (filters.city) {
    tries.push({ label: `Other cities`, apply: (q) => {
      let qq = q.not('city', 'ilike', `%${filters.city}%`);
      if (filters.media_type) qq = qq.ilike('media_type', `%${filters.media_type}%`);
      return qq;
    }});
  } else if (filters.area) {
    tries.push({ label: `Other areas`, apply: (q) => {
      let qq = q.not('area', 'ilike', `%${filters.area}%`);
      if (filters.media_type) qq = qq.ilike('media_type', `%${filters.media_type}%`);
      return qq;
    }});
  }
  if (filters.media_type) {
    tries.push({ label: `Other media types`, apply: (q) => {
      let qq = q.not('media_type', 'ilike', `%${filters.media_type}%`);
      if (filters.area) qq = qq.ilike('area', `%${filters.area}%`);
      else if (filters.city) qq = qq.ilike('city', `%${filters.city}%`);
      return qq;
    }});
  }
  for (const t of tries) {
    let q = supabase.from('asset_availability_view').select(SAFE_AVAILABILITY_SELECT).eq('company_id', companyId).limit(300);
    q = t.apply(q);
    const { data, error } = await q;
    if (error || !data || data.length === 0) continue;
    const seen = new Map<string, any>();
    for (const r of data) if (!seen.has(r.asset_id)) seen.set(r.asset_id, r);
    const avail = Array.from(seen.values()).filter(r => isAvailableForRange(r, start, end));
    if (!avail.length) continue;
    const groups = new Map<string, number>();
    for (const r of avail) {
      const key = `${r.area || '—'}, ${r.city || '—'}`;
      groups.set(key, (groups.get(key) || 0) + 1);
    }
    const top = Array.from(groups.entries()).sort((a,b)=>b[1]-a[1]).slice(0,5)
      .map(([k,n]) => `• **${k}** — ${n} asset${n>1?'s':''} available`).join('\n');
    return `**${t.label} with availability for ${displayDate(start)}–${displayDate(end)}:**\n${top}`;
  }
  return null;
}
