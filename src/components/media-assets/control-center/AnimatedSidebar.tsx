import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Layers,
  FileText,
  Camera,
  DollarSign,
  BarChart3,
  Settings,
  Building2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCompany } from "@/contexts/CompanyContext";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Users, label: "Clients", path: "/clients" },
  { icon: Layers, label: "Media Assets", path: "/media-assets" },
  { icon: FileText, label: "Plans", path: "/plans" },
  { icon: Camera, label: "Campaigns", path: "/campaigns" },
  { icon: DollarSign, label: "Finance", path: "/admin/invoices" },
  { icon: BarChart3, label: "Reports", path: "/reports/vacant-media" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export function AnimatedSidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { company } = useCompany();

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        className={cn(
          "fixed left-0 top-16 bottom-0 z-40 bg-card border-r border-border transition-all duration-250 ease-out",
          isExpanded ? "w-[248px]" : "w-14"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Company Switcher */}
          <div className="p-3 border-b border-border">
            {company && (
              <div className="flex items-center gap-3 min-h-[40px]">
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
                {isExpanded && (
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="text-sm font-semibold truncate">{company.name}</p>
                    <p className="text-xs text-muted-foreground capitalize truncate">
                      {company.type}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Menu Items */}
          <nav className="flex-1 py-4 overflow-y-auto">
            <ul className="space-y-1 px-2">
              {menuItems.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                const Icon = item.icon;

                const button = (
                  <li key={item.path}>
                    <button
                      onClick={() => navigate(item.path)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                        "hover:bg-accent/50 relative group",
                        isActive && "bg-accent text-accent-foreground font-medium"
                      )}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                      )}
                      <Icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
                      {isExpanded && (
                        <span className="text-sm truncate animate-in slide-in-from-left-1 duration-200">
                          {item.label}
                        </span>
                      )}
                    </button>
                  </li>
                );

                if (!isExpanded) {
                  return (
                    <Tooltip key={item.path}>
                      <TooltipTrigger asChild>{button}</TooltipTrigger>
                      <TooltipContent side="right" className="ml-2">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return button;
              })}
            </ul>
          </nav>
        </div>
      </aside>

      {/* Spacer for content */}
      <div className={cn("transition-all duration-250", isExpanded ? "w-[248px]" : "w-14")} />
    </TooltipProvider>
  );
}
