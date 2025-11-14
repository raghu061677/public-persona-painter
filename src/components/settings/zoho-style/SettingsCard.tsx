import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SettingsCardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
}

export function SettingsCard({ children, className, title, description }: SettingsCardProps) {
  return (
    <div className={cn(
      "bg-white rounded-xl shadow-sm border border-border/40 p-6",
      className
    )}>
      {(title || description) && (
        <div className="mb-6 pb-4 border-b border-border/30">
          {title && (
            <h3 className="text-base font-semibold text-foreground mb-1">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
