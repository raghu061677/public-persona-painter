import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SidebarSectionProps {
  label: string;
  children: ReactNode;
  className?: string;
  collapsed?: boolean;
}

export function SidebarSection({ label, children, className, collapsed }: SidebarSectionProps) {
  return (
    <div className={cn("mb-1", className)}>
      {!collapsed && (
        <div className="px-4 pt-4 pb-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60 select-none">
            {label}
          </span>
        </div>
      )}
      {collapsed && <div className="my-1.5 mx-3 border-t border-border/30" />}
      <div className="space-y-0.5 px-2">
        {children}
      </div>
    </div>
  );
}
