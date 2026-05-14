import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Global auth gate for ALL /admin/* routes.
 * Renders as a layout route — if user is not authenticated,
 * they are immediately redirected to /auth with a ?next= deep-link.
 * Individual routes can still add finer role/module checks on top.
 */
export function AdminAuthGate() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const lastLogged = useRef<string>('');

  // Log verified admin pageview only AFTER auth is confirmed.
  useEffect(() => {
    if (loading || !user) return;
    const path = location.pathname;
    const key = `${user.id}|${path}`;
    if (lastLogged.current === key) return;
    lastLogged.current = key;
    supabase
      .from('admin_pageviews')
      .insert({
        user_id: user.id,
        user_email: user.email ?? null,
        path,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      })
      .then(() => {});
  }, [user, loading, location.pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    const currentPath = location.pathname + location.search + location.hash;
    return <Navigate to={`/auth?next=${encodeURIComponent(currentPath)}`} replace />;
  }

  return <Outlet />;
}
