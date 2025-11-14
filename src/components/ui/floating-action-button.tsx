import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface FloatingActionButtonProps extends React.ComponentProps<typeof Button> {
  icon?: React.ReactNode;
  label?: string;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
}

export function FloatingActionButton({ 
  icon = <Plus className="h-5 w-5" />, 
  label,
  position = "bottom-right",
  className,
  ...props 
}: FloatingActionButtonProps) {
  const positionClasses = {
    "bottom-right": "bottom-6 right-6",
    "bottom-left": "bottom-6 left-6",
    "top-right": "top-6 right-6",
    "top-left": "top-6 left-6",
  };

  return (
    <Button
      size="lg"
      className={cn(
        "fixed z-50 shadow-elegant rounded-full",
        "h-14 w-14",
        "hover:shadow-lg hover:scale-105",
        "transition-all duration-200",
        "animate-in fade-in slide-in-from-bottom-5",
        label && "w-auto px-6 gap-2",
        positionClasses[position],
        className
      )}
      {...props}
    >
      {icon}
      {label && <span className="font-medium">{label}</span>}
    </Button>
  );
}
