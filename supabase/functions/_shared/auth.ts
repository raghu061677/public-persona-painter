/**
 * Phase-3.1: Shared Edge Function Security Utilities
 * 
 * Provides consistent AuthN, tenant isolation, role authorization,
 * and audit logging across all edge functions.
 * 
 * NEVER trust company_id or role from request body.
 * ALWAYS derive from JWT/database.
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from './cors.ts';

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
  'http://localhost:5173',
  'http://localhost:3000',
];

/**
 * Build CORS headers for a specific request, enforcing origin allowlist.
 * For authenticated routes, only allowed origins get Access-Control-Allow-Origin.
 * For public routes (portal), use the shared corsHeaders (wildcard).
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    return {
      ...corsHeaders,
      'Access-Control-Allow-Origin': origin,
      'Vary': 'Origin',
    };
  }
  // For non-matching origins on authenticated routes, return restrictive headers
  return {
    'Access-Control-Allow-Headers': corsHeaders['Access-Control-Allow-Headers'],
    'Vary': 'Origin',
    // Intentionally omit Access-Control-Allow-Origin to block cross-origin
  };
}

// ─── Client Factories ────────────────────────────────────────────────

/**
 * Create a Supabase client scoped to the requesting user's JWT.
 * All queries run under RLS — no service role bypass.
 */
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

/**
 * Create a service-role client. ONLY for true system jobs
 * (webhooks, scheduled tasks) — never for user-triggered endpoints.
 */
export function supabaseServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ─── Authentication ──────────────────────────────────────────────────

/**
 * Verify the requesting user is authenticated.
 * Returns the authenticated user object.
 */
export async function requireUser(supabase: SupabaseClient) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new AuthError('Unauthorized – invalid or missing token', 401);
  }
  return user;
}

// ─── Authorization Context ──────────────────────────────────────────

/**
 * Get full auth context: userId, companyId, role.
 * Derived from the database — NEVER from request body.
 * Uses a service-role client to read company_users (bypasses RLS)
 * since the user client may not have read access to company_users.
 */
export async function getAuthContext(req: Request): Promise<AuthContext> {
  const userClient = supabaseUserClient(req);
  const user = await requireUser(userClient);

  // Use service client to reliably read company_users
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

/**
 * Check if user is a platform admin (company type = 'platform_admin').
 */
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

/**
 * Require the user to have one of the specified roles.
 * Throws 403 if not authorized.
 */
export function requireRole(ctx: AuthContext, allowedRoles: AppRole[]): void {
  if (!allowedRoles.includes(ctx.role)) {
    throw new AuthError(
      `Forbidden – role '${ctx.role}' not in allowed roles: ${allowedRoles.join(', ')}`,
      403
    );
  }
}

/**
 * Verify the target record belongs to the user's company.
 * Prevents cross-tenant access.
 */
export function requireCompanyMatch(ctx: AuthContext, recordCompanyId: string | null): void {
  if (!recordCompanyId || recordCompanyId !== ctx.companyId) {
    throw new AuthError('Forbidden – record does not belong to your company', 403);
  }
}

// ─── Audit Logging ───────────────────────────────────────────────────

/**
 * Log a security-relevant action to the security_audit_log table.
 */
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
    // Never let audit logging failures break the main flow
    console.error('[audit] Failed to log:', e);
  }
}

// ─── Error Handling ──────────────────────────────────────────────────

export class AuthError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Standard JSON error response with CORS headers.
 */
export function jsonError(message: string, status = 400): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * Standard JSON success response with CORS headers.
 */
export function jsonSuccess(data: unknown, status = 200): Response {
  return new Response(
    JSON.stringify(data),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * Wrap an edge function handler with strict CORS enforcement + error handling.
 * Authenticated routes use origin allowlist; rejects disallowed origins.
 */
export function withAuth(handler: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    const responseHeaders = getCorsHeaders(req);

    if (req.method === 'OPTIONS') {
      // Preflight: only respond with CORS if origin is allowed
      if (!responseHeaders['Access-Control-Allow-Origin']) {
        return new Response(null, { status: 403 });
      }
      return new Response(null, { headers: responseHeaders });
    }

    // For non-preflight: reject disallowed origins
    const origin = req.headers.get('Origin') || '';
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return new Response(
        JSON.stringify({ error: 'Origin not allowed' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    try {
      const response = await handler(req);
      // Inject strict CORS headers into response
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
