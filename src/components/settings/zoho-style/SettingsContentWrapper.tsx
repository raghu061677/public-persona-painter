import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SettingsContentWrapperProps {
  children: ReactNode;
  className?: string;
}

export function SettingsContentWrapper({ children, className }: SettingsContentWrapperProps) {
  return (
    <div className={cn("space-y-8", className)}>
      {children}
    </div>
  );
}
