import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * Global auth gate for ALL /admin/* routes.
 * Renders as a layout route — if user is not authenticated,
 * they are immediately redirected to /auth with a ?next= deep-link.
 * Individual routes can still add finer role/module checks on top.
 */
export function AdminAuthGate() {
  const { user, loading } = useAuth();
  const location = useLocation();

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
