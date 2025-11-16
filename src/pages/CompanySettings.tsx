import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/contexts/CompanyContext";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/navigation/PageHeader";
import { ROUTES, ROUTE_LABELS } from "@/config/routes";

export default function CompanySettings() {
  const { isLoading } = useCompany();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to profile page by default - runs once on mount
    if (!isLoading) {
      navigate("/admin/company-settings/profile", { replace: true });
    }
  }, [isLoading, navigate]);

  // Show loading while redirecting
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // This should not be reached as we redirect in useEffect, but provide fallback
  return null;
}
