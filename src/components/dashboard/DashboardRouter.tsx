import { useCompany } from "@/contexts/CompanyContext";
import { Navigate } from "react-router-dom";
import Dashboard from "@/pages/Dashboard";
import PlatformAdminDashboard from "@/pages/PlatformAdminDashboard";

/**
 * Smart dashboard router that shows different dashboards based on company type:
 * - Platform Admin Dashboard for platform_admin companies
 * - Regular Company Dashboard for media_owner and agency companies
 */
export function DashboardRouter() {
  const { company, isLoading } = useCompany();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  if (!company) {
    return <Navigate to="/auth" replace />;
  }

  // Route to appropriate dashboard based on company type
  if (company.type === 'platform_admin') {
    return <PlatformAdminDashboard />;
  }

  // Media owners and agencies see the regular company dashboard
  return <Dashboard />;
}
