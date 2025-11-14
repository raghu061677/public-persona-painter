import { ReactNode, useState } from "react";
import { ChevronDown, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface SidebarGroupProps {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
  defaultOpen?: boolean;
  collapsed?: boolean;
}

export function SidebarGroup({ icon: Icon, label, children, defaultOpen = true, collapsed }: SidebarGroupProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (collapsed) {
    return (
      <div className="px-1 py-1">
        <div 
          className="flex items-center justify-center p-2.5 rounded-xl hover:bg-accent/50 transition-colors"
          title={label}
        >
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full px-4 py-2 mx-2 rounded-xl hover:bg-accent/50 transition-colors group">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1 text-left text-sm font-medium text-muted-foreground">{label}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-6 mt-1 space-y-0.5">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
