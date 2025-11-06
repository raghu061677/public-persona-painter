import * as React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const sectionVariants = {
  primary: "border-l-4 border-l-primary",
  blue: "border-l-4 border-l-blue-500",
  green: "border-l-4 border-l-green-500",
  purple: "border-l-4 border-l-purple-500",
  amber: "border-l-4 border-l-amber-500",
  red: "border-l-4 border-l-red-500",
  default: "",
} as const;

const iconVariants = {
  primary: "text-primary",
  blue: "text-blue-500",
  green: "text-green-500",
  purple: "text-purple-500",
  amber: "text-amber-500",
  red: "text-red-500",
  default: "text-muted-foreground",
} as const;

export interface SectionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  icon?: LucideIcon;
  variant?: keyof typeof sectionVariants;
  children: React.ReactNode;
}

const SectionCard = React.forwardRef<HTMLDivElement, SectionCardProps>(
  ({ className, title, description, icon: Icon, variant = "default", children, ...props }, ref) => {
    return (
      <Card 
        ref={ref} 
        className={cn(sectionVariants[variant], className)} 
        {...props}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {Icon && <Icon className={cn("h-5 w-5", iconVariants[variant])} />}
            {title}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-4">
          {children}
        </CardContent>
      </Card>
    );
  }
);

SectionCard.displayName = "SectionCard";

export { SectionCard };
