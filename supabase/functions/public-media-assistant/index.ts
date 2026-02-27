/**
 * Public Media Availability Assistant
 * NO AUTH REQUIRED - safe for anonymous landing page users
 * Returns ONLY safe fields + card_rate from media_assets
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const ALLOWED_ORIGINS = [
  'https://go-ads.lovable.app',
  'https://id-preview--e5e4d66a-feda-48ef-a6c6-1845bb9855ea.lovable.app',
  'https://e5e4d66a-feda-48ef-a6c6-1845bb9855ea.lovableproject.com',
  'https://app.go-ads.in',
  'http://localhost:5173',
  'http://localhost:3000',
];

function getCors(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  const base = {
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
  if (ALLOWED_ORIGINS.includes(origin)) {
    return { ...base, 'Access-Control-Allow-Origin': origin };
  }
  return { ...base, 'Access-Control-Allow-Origin': '*' };
}

// Simple IP-based rate limiting (in-memory)
const ipStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function checkIpRate(ip: string): boolean {
  const now = Date.now();
  const entry = ipStore.get(ip);
  if (!entry || now > entry.resetAt) {
    ipStore.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT;
}

// Safe fields to select from media_assets
const SAFE_SELECT = [
  'id',
  'media_asset_code',
  'asset_id_readable',
  'media_type',
  'city',
  'area',
  'location',
  'address',
  'direction',
  'latitude',
  'longitude',
  'dimensions',
  'total_sqft',
  'illumination_type',
  'status',
  'next_available_from',
  'primary_photo_url',
  'card_rate',
].join(', ');

// Restricted topics
const RESTRICTED_PATTERNS = [
  /negotiat/i, /base.?rate/i, /final.?rate/i, /final.?price/i,
  /gst/i, /tax/i, /invoice/i, /payment/i, /billing/i,
  /client/i, /customer/i, /lead/i, /campaign/i, /plan\b/i,
  /margin/i, /profit/i, /concession/i, /discount/i,
  /printing.?cost/i, /mounting.?cost/i, /expense/i,
  /revenue/i, /receivable/i, /outstanding/i,
];

const REFUSAL = "I can only help with media availability, site details, and official card rates. For negotiated pricing, booking, or account information, please login or contact our sales team.";

function isRestricted(msg: string): boolean {
  return RESTRICTED_PATTERNS.some(p => p.test(msg));
}

// Parse user message for filters
function parseFilters(msg: string): { city?: string; area?: string; media_type?: string } {
  const lower = msg.toLowerCase();
  const filters: { city?: string; area?: string; media_type?: string } = {};

  // Media type synonyms
  const typeMap: Record<string, string> = {
    'bus shelter': 'Bus Shelter', 'bqs': 'Bus Shelter', 'bus queue': 'Bus Shelter',
    'hoarding': 'Hoarding', 'billboard': 'Hoarding',
    'unipole': 'Unipole', 'cantilever': 'Cantilever',
    'gantry': 'Gantry', 'skywalk': 'Skywalk',
    'pole kiosk': 'Pole Kiosk', 'foot over bridge': 'FOB', 'fob': 'FOB',
  };
  for (const [key, val] of Object.entries(typeMap)) {
    if (lower.includes(key)) { filters.media_type = val; break; }
  }

  // Known cities
  const cities = ['hyderabad', 'bangalore', 'mumbai', 'delhi', 'chennai', 'pune', 'kolkata', 'ahmedabad', 'visakhapatnam', 'vizag', 'warangal', 'secunderabad'];
  for (const c of cities) {
    if (lower.includes(c)) {
      filters.city = c === 'vizag' ? 'Visakhapatnam' : c.charAt(0).toUpperCase() + c.slice(1);
      break;
    }
  }

  // Known areas (common Hyderabad areas)
  const areas = [
    'begumpet', 'ameerpet', 'kukatpally', 'gachibowli', 'madhapur', 'hitech city',
    'jubilee hills', 'banjara hills', 'secunderabad', 'uppal', 'dilsukhnagar',
    'lb nagar', 'mehdipatnam', 'abids', 'koti', 'raidurgam', 'kondapur',
    'miyapur', 'chandanagar', 'lingampally', 'manikonda', 'attapur', 'tolichowki',
    'somajiguda', 'lakdi ka pul', 'panjagutta', 'erragadda', 'sr nagar',
    'habsiguda', 'tarnaka', 'malkajgiri', 'bowenpally', 'trimulgherry',
    'kompally', 'alwal', 'shamshabad', 'rajendranagar', 'nagole', 'vanasthalipuram',
  ];
  for (const a of areas) {
    if (lower.includes(a)) {
      filters.area = a.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      break;
    }
  }

  return filters;
}

function formatAssets(assets: any[]): string {
  if (!assets || assets.length === 0) {
    return "No matching media assets found for your query. Try specifying a different area or media type.";
  }

  const count = assets.length;
  const showing = count > 10 ? 10 : count;
  const list = assets.slice(0, 10);

  let reply = `Found **${count}** matching media asset${count > 1 ? 's' : ''}`;
  if (count > 10) reply += ` (showing top 10)`;
  reply += `:\n\n`;

  for (const a of list) {
    const code = a.media_asset_code || a.asset_id_readable || a.id;
    reply += `• **${code}** — ${a.media_type || 'N/A'}\n`;
    reply += `  📍 ${a.area || ''}, ${a.city || ''}\n`;
    reply += `  Location: ${a.location || a.address || 'N/A'}\n`;
    if (a.direction) reply += `  Direction: ${a.direction}\n`;
    reply += `  Size: ${a.dimensions || 'N/A'}`;
    if (a.total_sqft) reply += ` (${a.total_sqft} sq.ft)`;
    reply += `\n`;
    if (a.illumination_type) reply += `  Illumination: ${a.illumination_type}\n`;
    reply += `  Status: ${a.status || 'N/A'}\n`;
    if (a.card_rate) reply += `  Card Rate: ₹${Number(a.card_rate).toLocaleString('en-IN')} per month\n`;
    if (a.next_available_from) reply += `  Available From: ${a.next_available_from}\n`;
    reply += `\n`;
  }

  if (count > 10) {
    reply += `\n_Please narrow your search by specifying an area or media type to see more results._`;
  }

  return reply;
}

Deno.serve(async (req) => {
  const cors = getCors(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  // Rate limit by IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkIpRate(ip)) {
    return new Response(JSON.stringify({
      reply: "You've made too many requests. Please wait a few minutes and try again.",
    }), { status: 429, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const message = body?.message;
  if (!message || typeof message !== 'string') {
    return new Response(JSON.stringify({ error: 'message field is required' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  if (message.length > 500) {
    return new Response(JSON.stringify({ error: 'Message too long (max 500 characters)' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  // Check for restricted topics
  if (isRestricted(message)) {
    return new Response(JSON.stringify({ reply: REFUSAL }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  // Parse filters from message
  const filters = { ...parseFilters(message), ...(body.filters || {}) };

  // Query media_assets with service client (bypasses RLS since public view)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  let query = supabase.from('media_assets').select(SAFE_SELECT);

  // Apply filters
  if (filters.area) query = query.ilike('area', `%${filters.area}%`);
  if (filters.city) query = query.ilike('city', `%${filters.city}%`);
  if (filters.media_type) query = query.ilike('media_type', `%${filters.media_type}%`);

  // Default to available assets unless user specifically asks
  const lower = message.toLowerCase();
  if (!lower.includes('booked') && !lower.includes('all status') && !lower.includes('all media')) {
    query = query.eq('status', 'Available');
  }

  query = query.order('area').limit(50);

  const { data: assets, error } = await query;

  if (error) {
    console.error('[public-media-assistant] DB error:', error);
    return new Response(JSON.stringify({
      reply: "Sorry, I encountered an error fetching media data. Please try again.",
    }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  const reply = formatAssets(assets || []);

  return new Response(JSON.stringify({ reply }), {
    status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
