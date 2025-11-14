import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

interface MobileBottomNavProps {
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
}

export function MobileBottomNav({ 
  children, 
  className, 
  visible = true 
}: MobileBottomNavProps) {
  const isMobile = useIsMobile();
  
  if (!visible || !isMobile) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
        "px-3 py-2 shadow-lg",
        "animate-in slide-in-from-bottom-full duration-300",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 max-w-screen-xl mx-auto">
        {children}
      </div>
    </div>
  );
}

interface MobileBottomNavButtonProps extends React.ComponentProps<typeof Button> {
  icon?: React.ReactNode;
  label?: string;
  badge?: number;
}

export function MobileBottomNavButton({ 
  icon, 
  label, 
  badge,
  className, 
  ...props 
}: MobileBottomNavButtonProps) {
  return (
    <Button
      className={cn(
        "flex-1 h-12 text-sm font-medium relative",
        "touch-manipulation",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-center gap-1.5">
        {icon && <span className="text-base">{icon}</span>}
        {label && <span className="hidden xs:inline">{label}</span>}
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
    </Button>
  );
}
