import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TwoColumnRowProps {
  leftColumn: ReactNode;
  rightColumn: ReactNode;
  className?: string;
}

export function TwoColumnRow({ leftColumn, rightColumn, className }: TwoColumnRowProps) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-6", className)}>
      <div>{leftColumn}</div>
      <div>{rightColumn}</div>
    </div>
  );
}
