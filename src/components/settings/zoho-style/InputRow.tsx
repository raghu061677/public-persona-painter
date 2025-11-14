import { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface InputRowProps {
  label: string;
  required?: boolean;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function InputRow({ label, required, description, children, className }: InputRowProps) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-4 py-4", className)}>
      <div className="md:col-span-1">
        <Label className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </div>
      <div className="md:col-span-2">
        {children}
      </div>
    </div>
  );
}
