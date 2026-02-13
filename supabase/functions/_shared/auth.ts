/**
 * Phase-6: Shared Edge Function Security Utilities
 * 
 * Provides consistent AuthN, tenant isolation, role authorization,
 * HMAC validation for cron/system endpoints, rate limiting, and audit logging.
 * 
 * NEVER trust company_id or role from request body.
 * ALWAYS derive from JWT/database.
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders } from './cors.ts';

// ─── HMAC Validation for Cron/System Endpoints ─────────────────────

const MAX_TIMESTAMP_SKEW_MS = 5 * 60 * 1000; // 5 minutes

export async function requireHmac(req: Request, rawBody: string): Promise<void> {
  const secret = Deno.env.get('CRON_HMAC_SECRET');
  if (!secret) {
    throw new AuthError('CRON_HMAC_SECRET not configured', 500);
  }

  const timestamp = req.headers.get('X-GoAds-Timestamp');
  const signature = req.headers.get('X-GoAds-Signature');

  if (!timestamp || !signature) {
    throw new AuthError('Missing HMAC headers (X-GoAds-Timestamp, X-GoAds-Signature)', 401);
  }

  const tsNum = parseInt(timestamp, 10);
  if (isNaN(tsNum)) {
    throw new AuthError('Invalid timestamp', 401);
  }

  const now = Date.now();
  if (Math.abs(now - tsNum) > MAX_TIMESTAMP_SKEW_MS) {
    throw new AuthError('Request timestamp too old or too far in future (>5 min skew)', 401);
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const data = encoder.encode(`${timestamp}.${rawBody}`);
  const sigBuffer = await crypto.subtle.sign('HMAC', key, data);
  const expectedHex = Array.from(new Uint8Array(sigBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  if (signature !== expectedHex) {
    throw new AuthError('Invalid HMAC signature', 401);
  }
}

export function withHmac(handler: (req: Request, rawBody: string) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const rawBody = await req.text();
      await requireHmac(req, rawBody);
      return await handler(req, rawBody);
    } catch (error) {
      if (error instanceof AuthError) {
        console.error(`[hmac] Auth error: ${error.message}`);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: error.statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.error('[hmac] Unhandled error:', error);
      const msg = error instanceof Error ? error.message : 'Internal server error';
      return new Response(
        JSON.stringify({ error: msg }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  };
}

// ─── Types ───────────────────────────────────────────────────────────

export type AppRole = 'admin' | 'finance' | 'sales' | 'ops' | 'viewer';

export interface AuthContext {
  userId: string;
  companyId: string;
  role: AppRole;
  email?: string;
}

// ─── CORS Origin Allowlist ───────────────────────────────────────────

const ALLOWED_ORIGINS: string[] = [
  'https://go-ads.lovable.app',
  'https://id-preview--e5e4d66a-feda-48ef-a6c6-1845bb9855ea.lovable.app',
  'https://e5e4d66a-feda-48ef-a6c6-1845bb9855ea.lovableproject.com',
  'http://localhost:5173',
  'http://localhost:3000',
];

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    return {
      ...corsHeaders,
      'Access-Control-Allow-Origin': origin,
      'Vary': 'Origin',
    };
  }
  return {
    'Access-Control-Allow-Headers': corsHeaders['Access-Control-Allow-Headers'],
    'Vary': 'Origin',
  };
}

// ─── Client Factories ────────────────────────────────────────────────

export function supabaseUserClient(req: Request): SupabaseClient {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new AuthError('Missing Authorization header', 401);
  }
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
}

export function supabaseServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ─── Authentication ──────────────────────────────────────────────────

export async function requireUser(supabase: SupabaseClient) {
  // Try getUser first
  const { data: { user }, error } = await supabase.auth.getUser();
  if (!error && user) {
    console.log('[auth] getUser succeeded:', user.id);
    return user;
  }

  console.error('[auth] getUser failed:', error?.message, error?.status);

  // Fallback: try getSession (doesn't verify with server, uses JWT directly)
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (!sessionError && sessionData?.session?.user) {
      console.log('[auth] getSession fallback succeeded:', sessionData.session.user.id);
      return sessionData.session.user;
    }
    console.error('[auth] getSession also failed:', sessionError?.message);
  } catch (e) {
    console.error('[auth] getSession exception:', e);
  }

  throw new AuthError('Unauthorized – invalid or missing token', 401);
}

// ─── Authorization Context ──────────────────────────────────────────

export async function getAuthContext(req: Request): Promise<AuthContext> {
  const userClient = supabaseUserClient(req);
  const user = await requireUser(userClient);

  const serviceClient = supabaseServiceClient();
  const { data: companyUser, error } = await serviceClient
    .from('company_users')
    .select('company_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .single();

  if (error || !companyUser) {
    throw new AuthError('No active company membership found', 403);
  }

  return {
    userId: user.id,
    companyId: companyUser.company_id,
    role: companyUser.role as AppRole,
    email: user.email,
  };
}

export async function isPlatformAdmin(userId: string): Promise<boolean> {
  const serviceClient = supabaseServiceClient();
  const { data } = await serviceClient
    .from('company_users')
    .select('company_id, companies!inner(type)')
    .eq('user_id', userId)
    .eq('status', 'active');

  return data?.some((cu: any) => cu.companies?.type === 'platform_admin') ?? false;
}

// ─── Role Enforcement ────────────────────────────────────────────────

export function requireRole(ctx: AuthContext, allowedRoles: AppRole[]): void {
  if (!allowedRoles.includes(ctx.role)) {
    throw new AuthError(
      `Forbidden – role '${ctx.role}' not in allowed roles: ${allowedRoles.join(', ')}`,
      403
    );
  }
}

export function requireCompanyMatch(ctx: AuthContext, recordCompanyId: string | null): void {
  if (!recordCompanyId || recordCompanyId !== ctx.companyId) {
    throw new AuthError('Forbidden – record does not belong to your company', 403);
  }
}

// ─── In-Memory Rate Limiting ─────────────────────────────────────────

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Simple in-memory rate limiter. Per-function, per-user or per-IP.
 * Throws AuthError(429) if limit exceeded.
 */
export function checkRateLimit(key: string, maxRequests: number, windowMs: number): void {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  entry.count++;
  if (entry.count > maxRequests) {
    throw new AuthError('Rate limit exceeded. Please try again later.', 429);
  }
}

// ─── Audit Logging ───────────────────────────────────────────────────

export async function logSecurityAudit(params: {
  functionName: string;
  userId?: string;
  companyId?: string;
  action: string;
  recordIds?: string[];
  status?: 'success' | 'error' | 'denied';
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  req?: Request;
}): Promise<void> {
  try {
    const serviceClient = supabaseServiceClient();
    await serviceClient.from('security_audit_log').insert({
      function_name: params.functionName,
      user_id: params.userId || null,
      company_id: params.companyId || null,
      action: params.action,
      record_ids: params.recordIds || [],
      status: params.status || 'success',
      error_message: params.errorMessage || null,
      ip_address: params.req?.headers.get('x-forwarded-for') || null,
      metadata: params.metadata || {},
    });
  } catch (e) {
    console.error('[audit] Failed to log:', e);
  }
}

// ─── Email Recipient Validation ──────────────────────────────────────

/**
 * Verify that a recipient email belongs to a client/contact within the caller's company.
 * Prevents sending emails to arbitrary addresses.
 */
export async function validateRecipientInCompany(
  email: string,
  companyId: string
): Promise<boolean> {
  const serviceClient = supabaseServiceClient();

  // Check clients table
  const { data: clientMatch } = await serviceClient
    .from('clients')
    .select('id')
    .eq('company_id', companyId)
    .ilike('email', email)
    .limit(1);

  if (clientMatch && clientMatch.length > 0) return true;

  // Check client_contacts table
  const { data: contactMatch } = await serviceClient
    .from('client_contacts')
    .select('id, clients!inner(company_id)')
    .ilike('email', email)
    .limit(1);

  if (contactMatch && contactMatch.length > 0) {
    const match = contactMatch[0] as any;
    return match.clients?.company_id === companyId;
  }

  // Check company_users (internal emails)
  const { data: companyUserMatch } = await serviceClient
    .from('company_users')
    .select('id')
    .eq('company_id', companyId)
    .ilike('email', email)
    .limit(1);

  return (companyUserMatch && companyUserMatch.length > 0) || false;
}

// ─── Error Handling ──────────────────────────────────────────────────

export class AuthError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = 'AuthError';
  }
}

export function jsonError(message: string, status = 400): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

export function jsonSuccess(data: unknown, status = 200): Response {
  return new Response(
    JSON.stringify(data),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

export function withAuth(handler: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    const responseHeaders = getCorsHeaders(req);

    if (req.method === 'OPTIONS') {
      if (!responseHeaders['Access-Control-Allow-Origin']) {
        return new Response(null, { status: 403 });
      }
      return new Response(null, { headers: responseHeaders });
    }

    const origin = req.headers.get('Origin') || '';
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return new Response(
        JSON.stringify({ error: 'Origin not allowed' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    try {
      const response = await handler(req);
      for (const [key, value] of Object.entries(responseHeaders)) {
        response.headers.set(key, value);
      }
      return response;
    } catch (error) {
      if (error instanceof AuthError) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: error.statusCode, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.error('[edge-fn] Unhandled error:', error);
      const msg = error instanceof Error ? error.message : 'Internal server error';
      return new Response(
        JSON.stringify({ error: msg }),
        { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }
  };
}
