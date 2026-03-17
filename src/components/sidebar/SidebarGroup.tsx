import { ReactNode, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ChevronRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface SidebarGroupProps {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
  defaultOpen?: boolean;
  collapsed?: boolean;
}

export function SidebarGroup({ icon: Icon, label, children, defaultOpen = false, collapsed }: SidebarGroupProps) {
  const location = useLocation();
  const [open, setOpen] = useState(defaultOpen);

  // Sync open state when route changes cause defaultOpen to change
  useEffect(() => {
    if (defaultOpen) {
      setOpen(true);
    }
  }, [defaultOpen, location.pathname]);

  if (collapsed) {
    return (
      <div className="flex items-center justify-center py-0.5">
        <div 
          className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-accent/80 transition-colors cursor-default"
          title={label}
        >
          <Icon className="h-[18px] w-[18px] text-muted-foreground/70" />
        </div>
      </div>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-[7px] rounded-lg hover:bg-accent/60 transition-colors group cursor-pointer">
        <Icon className="h-4 w-4 text-muted-foreground/70 shrink-0" />
        <span className="flex-1 text-left text-[13px] font-medium text-muted-foreground/90 truncate">{label}</span>
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground/40 transition-transform duration-200",
            open && "rotate-90"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-3 pl-3 mt-0.5 space-y-0.5 border-l border-border/40">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
