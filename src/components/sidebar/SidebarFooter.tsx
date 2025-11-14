import { HelpCircle, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";

interface SidebarFooterProps {
  collapsed?: boolean;
}

export function SidebarFooter({ collapsed }: SidebarFooterProps) {
  const version = "v1.0.0";

  return (
    <div className={cn("border-t border-border/40 p-3 space-y-2", collapsed && "px-2")}>
      {!collapsed && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => window.open("https://docs.lovable.dev", "_blank")}
          >
            <HelpCircle className="h-4 w-4" />
            <span>Help & Docs</span>
          </Button>
          
          <div className="flex items-center justify-between px-3">
            <span className="text-xs text-muted-foreground">{version}</span>
            <ThemeToggle />
          </div>
        </>
      )}
      
      {collapsed && (
        <div className="flex flex-col items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
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
