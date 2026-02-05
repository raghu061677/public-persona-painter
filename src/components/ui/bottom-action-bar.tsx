import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface BottomActionBarProps {
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
}

export function BottomActionBar({ children, className, visible = true }: BottomActionBarProps) {
  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "md:hidden", // Only show on mobile
        "border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
        "px-4 py-3 pb-safe shadow-elegant",
        "animate-in slide-in-from-bottom-full duration-300",
        "touch-manipulation pointer-events-auto",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        {children}
      </div>
    </div>
  );
}

interface BottomActionButtonProps extends React.ComponentProps<typeof Button> {
  icon?: React.ReactNode;
  label: string;
}

export function BottomActionButton({ icon, label, className, ...props }: BottomActionButtonProps) {
  return (
    <Button
      className={cn(
        "flex-1 h-12 min-h-[48px] text-sm font-medium",
        "touch-manipulation pointer-events-auto", // Better touch response
        className
      )}
      {...props}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {label}
    </Button>
  );
}
