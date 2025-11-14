import { Building2 } from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";

interface CompanySwitcherProps {
  collapsed?: boolean;
}

export function CompanySwitcher({ collapsed }: CompanySwitcherProps) {
  const { company } = useCompany();

  if (!company) return null;

  if (collapsed) {
    return (
      <div className="px-2 py-3">
        <div className="flex items-center justify-center p-2 rounded-xl bg-accent/50">
          {company.logo_url ? (
            <img src={company.logo_url} alt={company.name} className="h-6 w-6 rounded object-cover" />
          ) : (
            <Building2 className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 py-3">
      <div className="p-3 rounded-xl bg-accent/30 border border-border/40">
        <div className="flex items-center gap-3 min-w-0">
          {company.logo_url ? (
            <img
              src={company.logo_url}
              alt={company.name}
              className="h-8 w-8 rounded object-cover shrink-0"
            />
          ) : (
            <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{company.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{company.type}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
