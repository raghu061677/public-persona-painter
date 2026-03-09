import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";

interface SidebarFooterProps {
  collapsed?: boolean;
}

export function SidebarFooter({ collapsed }: SidebarFooterProps) {
  const version = "v1.0.0";

  return (
    <div className={cn(
      "border-t border-border/30 p-2.5 space-y-1.5",
      collapsed && "px-1.5"
    )}>
      {!collapsed && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2.5 text-muted-foreground/70 hover:text-foreground text-[13px] h-8 rounded-lg"
            onClick={() => window.open("https://docs.lovable.dev", "_blank")}
          >
            <HelpCircle className="h-4 w-4" />
            <span>Help & Docs</span>
          </Button>
          
          <div className="flex items-center justify-between px-2.5 pt-0.5">
            <span className="text-[10px] text-muted-foreground/50 font-medium">{version}</span>
            <ThemeToggle />
          </div>
        </>
      )}
      
      {collapsed && (
        <div className="flex flex-col items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => window.open("https://docs.lovable.dev", "_blank")}
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
          <ThemeToggle iconOnly />
        </div>
      )}
    </div>
  );
}
