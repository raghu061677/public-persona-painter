/**
 * Public Media Availability Assistant
 * NO AUTH REQUIRED - safe for anonymous landing page users
 * Uses asset_availability_view (same source as Vacant Media Report + Plan Builder)
 * Returns ONLY safe public fields (never base_rate, margin, client/campaign names, etc.)
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
    'Access-Control-Allow-Headers': 'content-type, authorization, apikey',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
  if (ALLOWED_ORIGINS.includes(origin)) {
    return { ...base, 'Access-Control-Allow-Origin': origin };
  }
  return { ...base, 'Access-Control-Allow-Origin': '*' };
}

// In-memory IP rate limiting
const ipStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 10 * 60 * 1000;

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

// Safe public fields from asset_availability_view
const SAFE_SELECT = [
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
  'booking_type',
  'booking_start_date',
  'booking_end_date',
  'next_available_date',
].join(', ');

const RESTRICTED_PATTERNS = [
  /negotiat/i, /base.?rate/i, /final.?rate/i, /final.?price/i,
  /gst/i, /\btax\b/i, /invoice/i, /payment/i, /billing/i,
  /\bclient\b/i, /customer/i, /lead/i, /campaign/i, /\bplan\b/i,
  /margin/i, /profit/i, /concession/i, /discount/i,
  /printing.?cost/i, /mounting.?cost/i, /expense/i,
  /revenue/i, /receivable/i, /outstanding/i,
];

const REFUSAL = "I can only help with media availability, site details, and official card rates. For negotiated pricing, booking, or account information, please contact our sales team.";
const SALES_CTA = "\n\n_For booking confirmation and negotiated rates, please contact the sales team._";

function isRestricted(msg: string): boolean {
  return RESTRICTED_PATTERNS.some(p => p.test(msg));
}

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

const CITIES = ['hyderabad', 'bangalore', 'mumbai', 'delhi', 'chennai', 'pune', 'kolkata', 'ahmedabad', 'visakhapatnam', 'vizag', 'warangal', 'secunderabad'];

const AREAS = [
  'begumpet','ameerpet','kukatpally','gachibowli','madhapur','hitech city',
  'jubilee hills','banjara hills','secunderabad','uppal','dilsukhnagar',
  'lb nagar','mehdipatnam','abids','koti','raidurgam','kondapur',
  'miyapur','chandanagar','lingampally','manikonda','attapur','tolichowki',
  'somajiguda','lakdi ka pul','panjagutta','erragadda','sr nagar',
  'habsiguda','tarnaka','malkajgiri','bowenpally','trimulgherry',
  'kompally','alwal','shamshabad','rajendranagar','nagole','vanasthalipuram',
];

function titleCase(s: string): string {
  return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function parseFilters(msg: string): { city?: string; area?: string; media_type?: string; price_max?: number; price_min?: number; want_booked?: boolean } {
  const lower = msg.toLowerCase();
  const f: any = {};

  for (const [key, val] of Object.entries(MEDIA_TYPE_MAP)) {
    if (lower.includes(key)) { f.media_type = val; break; }
  }
  for (const c of CITIES) {
    if (lower.includes(c)) {
      f.city = c === 'vizag' ? 'Visakhapatnam' : titleCase(c);
      break;
    }
  }
  for (const a of AREAS) {
    if (lower.includes(a)) { f.area = titleCase(a); break; }
  }
  // Price: "under 50000", "below 50k", "less than 50000"
  const priceMatch = lower.match(/(?:under|below|less than|<)\s*₹?\s*(\d+)(k)?/);
  if (priceMatch) {
    const n = parseInt(priceMatch[1], 10) * (priceMatch[2] === 'k' ? 1000 : 1);
    f.price_max = n;
  }
  if (/booked|occupied|unavailable/.test(lower) && !/available|vacant/.test(lower)) {
    f.want_booked = true;
  }
  return f;
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function fmtDisplay(d: string): string {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function parseDateRange(msg: string): { start: string; end: string } {
  const lower = msg.toLowerCase();
  const today = new Date(); today.setHours(0,0,0,0);

  // DD/MM/YYYY to DD/MM/YYYY
  const ddRange = lower.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4}).*?(?:to|-|until|till)\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (ddRange) {
    return {
      start: `${ddRange[3]}-${ddRange[2].padStart(2,'0')}-${ddRange[1].padStart(2,'0')}`,
      end: `${ddRange[6]}-${ddRange[5].padStart(2,'0')}-${ddRange[4].padStart(2,'0')}`,
    };
  }
  // YYYY-MM-DD to YYYY-MM-DD
  const isoRange = lower.match(/(\d{4}-\d{2}-\d{2}).*?(?:to|-|until|till)\s*(\d{4}-\d{2}-\d{2})/);
  if (isoRange) return { start: isoRange[1], end: isoRange[2] };

  if (lower.includes('tomorrow')) {
    const t = new Date(today); t.setDate(t.getDate()+1);
    return { start: fmtDate(t), end: fmtDate(t) };
  }
  if (lower.includes('next week')) {
    const s = new Date(today); s.setDate(s.getDate()+7);
    const e = new Date(s); e.setDate(e.getDate()+6);
    return { start: fmtDate(s), end: fmtDate(e) };
  }
  if (lower.includes('next month')) {
    const s = new Date(today.getFullYear(), today.getMonth()+1, 1);
    const e = new Date(today.getFullYear(), today.getMonth()+2, 0);
    return { start: fmtDate(s), end: fmtDate(e) };
  }
  if (lower.includes('this month')) {
    const s = new Date(today.getFullYear(), today.getMonth(), 1);
    const e = new Date(today.getFullYear(), today.getMonth()+1, 0);
    return { start: fmtDate(s), end: fmtDate(e) };
  }
  const daysMatch = lower.match(/(\d+)\s*days?/);
  if (daysMatch) {
    const n = parseInt(daysMatch[1], 10);
    const e = new Date(today); e.setDate(e.getDate()+n-1);
    return { start: fmtDate(today), end: fmtDate(e) };
  }
  return { start: fmtDate(today), end: fmtDate(today) };
}

/** A row is "available" for the requested range if no booking overlaps it */
function isRowAvailableForRange(row: any, start: string, end: string): boolean {
  if (String(row.availability_status || '').toUpperCase() === 'AVAILABLE') return true;
  const bs = row.booking_start_date;
  const be = row.booking_end_date;
  if (!bs || !be) return true;
  // overlap if bs <= end && be >= start
  return !(bs <= end && be >= start);
}

function formatResults(rows: any[], start: string, end: string, locLabel: string, wantBooked: boolean): string {
  if (!rows || rows.length === 0) {
    return `No matching media assets found. Please try another area, media type, or date range.${SALES_CTA}`;
  }

  const available: any[] = [];
  const upcoming: any[] = [];
  const booked: any[] = [];

  for (const r of rows) {
    if (isRowAvailableForRange(r, start, end)) available.push(r);
    else if (r.next_available_date) upcoming.push(r);
    else booked.push(r);
  }

  if (wantBooked) {
    const pool = booked.length || rows.filter(r => !isRowAvailableForRange(r, start, end));
    const list = Array.isArray(pool) ? pool : rows;
    if (!list.length) return `No booked media assets found for ${locLabel}.${SALES_CTA}`;
    let reply = `Found **${list.length}** booked media asset${list.length>1?'s':''} for ${locLabel}:\n\n`;
    reply += renderList(list.slice(0, 10), "Booked");
    return reply + SALES_CTA;
  }

  if (available.length > 0) {
    const showing = available.slice(0, 10);
    let reply = `Found **${available.length}** available media asset${available.length>1?'s':''} for ${locLabel} from ${fmtDisplay(start)} to ${fmtDisplay(end)}:\n\n`;
    reply += renderList(showing, "Available");
    if (available.length > 10) reply += `\n_Showing first 10. Narrow your search to see more._\n`;
    return reply + SALES_CTA;
  }

  if (upcoming.length > 0) {
    upcoming.sort((a, b) => (a.next_available_date || '').localeCompare(b.next_available_date || ''));
    let reply = `No fully available media assets found for this date range. Here are assets becoming available soon:\n\n`;
    reply += upcoming.slice(0, 10).map((r, i) => {
      const code = r.media_asset_code || r.asset_id;
      return `${i+1}. **${code}** — ${r.media_type || 'Media'} — Available from ${r.next_available_date ? fmtDisplay(r.next_available_date) : 'TBD'}\n   ${r.area || ''}, ${r.city || ''}`;
    }).join('\n\n');
    return reply + SALES_CTA;
  }

  return `No matching media assets found. Please try another area, media type, or date range.${SALES_CTA}`;
}

function renderList(rows: any[], statusOverride?: string): string {
  return rows.map((r, i) => {
    const code = r.media_asset_code || r.asset_id;
    const lines: string[] = [];
    lines.push(`${i+1}. **${code}** — ${r.media_type || 'Media'}`);
    lines.push(`   Area: ${r.area || '—'}, ${r.city || '—'}`);
    if (r.location) lines.push(`   Location: ${r.location}`);
    if (r.facing) lines.push(`   Direction: ${r.facing}`);
    const sizeBits = [r.size, r.total_sqft ? `${r.total_sqft} sq.ft` : null].filter(Boolean).join(' / ');
    if (sizeBits) lines.push(`   Size: ${sizeBits}`);
    if (r.illumination_type) lines.push(`   Illumination: ${r.illumination_type}`);
    if (r.card_rate) lines.push(`   Card Rate: ₹${Number(r.card_rate).toLocaleString('en-IN')} per month`);
    lines.push(`   Status: ${statusOverride || r.availability_status || "Available"}`);
    // Show the asset's exact available window relative to current bookings
    const bs = r.booking_start_date;
    const be = r.booking_end_date;
    if (statusOverride === 'Available' || String(r.availability_status||'').toUpperCase() === 'AVAILABLE') {
      if (r.next_available_date && bs && be) {
        lines.push(`   Available Window: from ${fmtDisplay(r.next_available_date)} (currently booked ${fmtDisplay(bs)}–${fmtDisplay(be)})`);
      } else {
        lines.push(`   Available Window: Open — no current bookings`);
      }
    } else if (r.next_available_date) {
      lines.push(`   Next Available: ${fmtDisplay(r.next_available_date)}${bs && be ? ` (booked ${fmtDisplay(bs)}–${fmtDisplay(be)})` : ''}`);
    } else if (bs && be) {
      lines.push(`   Currently Booked: ${fmtDisplay(bs)}–${fmtDisplay(be)}`);
    }
    return lines.join('\n');
  }).join('\n\n');
}

Deno.serve(async (req) => {
  const cors = getCors(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkIpRate(ip)) {
    return new Response(JSON.stringify({ reply: "You've made too many requests. Please wait a few minutes and try again." }), { status: 429, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  const message = body?.message;
  if (!message || typeof message !== 'string') {
    return new Response(JSON.stringify({ error: 'message field is required' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
  if (message.length > 500) {
    return new Response(JSON.stringify({ error: 'Message too long (max 500 characters)' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
  if (isRestricted(message)) {
    return new Response(JSON.stringify({ reply: REFUSAL }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  const filters = { ...parseFilters(message), ...(body.filters || {}) };
  const { start, end } = body.date_range && body.date_range.start && body.date_range.end
    ? body.date_range
    : parseDateRange(message);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  let q = supabase.from('asset_availability_view').select(SAFE_SELECT);
  if (filters.area) q = q.ilike('area', `%${filters.area}%`);
  if (filters.city) q = q.ilike('city', `%${filters.city}%`);
  if (filters.media_type) q = q.ilike('media_type', `%${filters.media_type}%`);
  if (filters.price_max) q = q.lte('card_rate', filters.price_max);
  if (filters.price_min) q = q.gte('card_rate', filters.price_min);
  q = q.order('area').limit(200);

  const { data, error } = await q;
  if (error) {
    console.error('[public-media-assistant] DB error:', error);
    return new Response(JSON.stringify({ reply: "Sorry, I encountered an error fetching media data. Please try again." }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  // De-dupe per asset_id keeping the most relevant row (prefer overlapping or running)
  const byAsset = new Map<string, any>();
  for (const r of (data || [])) {
    const existing = byAsset.get(r.asset_id);
    if (!existing) { byAsset.set(r.asset_id, r); continue; }
    // prefer the row that overlaps the requested range
    const newOverlaps = !isRowAvailableForRange(r, start, end);
    const oldOverlaps = !isRowAvailableForRange(existing, start, end);
    if (newOverlaps && !oldOverlaps) byAsset.set(r.asset_id, r);
  }
  const uniqueRows = Array.from(byAsset.values());

  const locLabel = [filters.area, filters.city].filter(Boolean).join(', ') || 'your search';
  let reply = formatResults(uniqueRows, start, end, locLabel, !!filters.want_booked);

  // If nothing matched OR no available rows in the requested range, suggest nearest areas/cities
  const anyAvailableInRange = uniqueRows.some(r => isRowAvailableForRange(r, start, end));
  if (uniqueRows.length === 0 || !anyAvailableInRange) {
    const suggestions = await suggestNearby(supabase, filters, start, end);
    if (suggestions) reply = `${reply}\n\n${suggestions}`;
  }

  return new Response(JSON.stringify({ reply, count: uniqueRows.length, date_range: { start, end }, filters }), {
    status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
  });
});

/**
 * Look up alternative areas/cities that DO have availability in the requested range.
 * Relaxes the area filter first, then the city filter, then media_type.
 */
async function suggestNearby(
  supabase: any,
  filters: { city?: string; area?: string; media_type?: string; price_max?: number; price_min?: number },
  start: string,
  end: string,
): Promise<string | null> {
  const tries: Array<{ label: string; apply: (q: any) => any }> = [];

  if (filters.area && filters.city) {
    tries.push({
      label: `Other areas in ${filters.city}`,
      apply: (q) => {
        let qq = q.ilike('city', `%${filters.city}%`);
        if (filters.media_type) qq = qq.ilike('media_type', `%${filters.media_type}%`);
        return qq;
      },
    });
  }
  if (filters.city) {
    tries.push({
      label: `Other cities`,
      apply: (q) => {
        let qq = q.not('city', 'ilike', `%${filters.city}%`);
        if (filters.media_type) qq = qq.ilike('media_type', `%${filters.media_type}%`);
        return qq;
      },
    });
  } else if (filters.area) {
    tries.push({
      label: `Other areas`,
      apply: (q) => {
        let qq = q.not('area', 'ilike', `%${filters.area}%`);
        if (filters.media_type) qq = qq.ilike('media_type', `%${filters.media_type}%`);
        return qq;
      },
    });
  }
  if (filters.media_type) {
    tries.push({
      label: `Other media types`,
      apply: (q) => {
        let qq = q.not('media_type', 'ilike', `%${filters.media_type}%`);
        if (filters.area) qq = qq.ilike('area', `%${filters.area}%`);
        else if (filters.city) qq = qq.ilike('city', `%${filters.city}%`);
        return qq;
      },
    });
  }
  if (tries.length === 0) return null;

  for (const t of tries) {
    let q = supabase.from('asset_availability_view').select(SAFE_SELECT).limit(300);
    q = t.apply(q);
    const { data, error } = await q;
    if (error || !data || data.length === 0) continue;

    // De-dup per asset, then keep only rows available in requested range
    const seen = new Map<string, any>();
    for (const r of data) {
      if (!seen.has(r.asset_id)) seen.set(r.asset_id, r);
    }
    const available = Array.from(seen.values()).filter(r => isRowAvailableForRange(r, start, end));
    if (available.length === 0) continue;

    // Group by area, city
    const groups = new Map<string, number>();
    for (const r of available) {
      const key = `${r.area || '—'}, ${r.city || '—'}`;
      groups.set(key, (groups.get(key) || 0) + 1);
    }
    const top = Array.from(groups.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k, n]) => `• **${k}** — ${n} asset${n > 1 ? 's' : ''} available`)
      .join('\n');

    return `**${t.label} with availability for ${fmtDisplay(start)}–${fmtDisplay(end)}:**\n${top}`;
  }
  return null;
}
