import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SidebarSectionProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function SidebarSection({ label, children, className }: SidebarSectionProps) {
  return (
    <div className={cn("mb-6", className)}>
      <h3 className="px-4 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </h3>
      <div className="space-y-0.5">
        {children}
      </div>
    </div>
  );
}
