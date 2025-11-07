import * as React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ResponsiveCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  footer?: React.ReactNode;
  headerAction?: React.ReactNode;
  hover?: boolean;
}

export const ResponsiveCard = React.forwardRef<HTMLDivElement, ResponsiveCardProps>(
  ({ className, title, description, footer, headerAction, hover = true, children, ...props }, ref) => {
    return (
      <Card
        ref={ref}
        className={cn(
          "transition-all duration-300",
          hover && "hover:shadow-elegant hover:scale-[1.02]",
          className
        )}
        {...props}
      >
        {(title || description || headerAction) && (
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
            <div className="space-y-1 flex-1">
              {title && <CardTitle className="text-lg md:text-xl">{title}</CardTitle>}
              {description && <CardDescription className="text-sm">{description}</CardDescription>}
            </div>
            {headerAction && <div className="flex items-center">{headerAction}</div>}
          </CardHeader>
        )}
        <CardContent className="pb-4">{children}</CardContent>
        {footer && <CardFooter className="pt-4 border-t">{footer}</CardFooter>}
      </Card>
    );
  }
);

ResponsiveCard.displayName = "ResponsiveCard";
