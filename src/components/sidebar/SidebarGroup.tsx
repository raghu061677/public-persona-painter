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
      <div className="flex items-center justify-center py-px">
        <div
          className={cn(
            "flex items-center justify-center w-9 h-9 rounded-md transition-colors cursor-default",
            "hover:bg-muted",
            defaultOpen && "text-primary"
          )}
          title={label}
        >
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className={cn(
          "flex items-center gap-2 w-full px-3 py-[6px] rounded-md transition-colors group cursor-pointer",
          "hover:bg-muted",
          open && "text-foreground",
          !open && "text-foreground/70"
        )}
      >
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 text-left text-[13px] font-medium truncate">{label}</span>
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground/50 transition-transform duration-200",
            open && "rotate-90"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-4 pl-2.5 mt-px space-y-px border-l border-border/50">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
