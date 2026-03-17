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
    <div className={cn("py-1", className)}>
      {!collapsed && (
        <div className="px-4 pt-3 pb-1">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70 select-none">
            {label}
          </span>
        </div>
      )}
      {collapsed && <div className="my-2 mx-3 border-t border-border/40" />}
      <div className="space-y-px px-2">
        {children}
      </div>
    </div>
  );
}
