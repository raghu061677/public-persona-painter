import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCompany } from "@/contexts/CompanyContext";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/navigation/PageHeader";

export default function ClientEdit() {
  const { id } = useParams<{ id: string }>();
  const { isLoading } = useCompany();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to client detail page with edit mode
    if (!isLoading && id) {
      navigate(`/admin/clients/${id}?edit=true`, { replace: true });
    }
  }, [isLoading, id, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return null;
}
