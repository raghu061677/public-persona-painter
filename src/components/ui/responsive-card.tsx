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
          "transition-all duration-300 w-full min-w-0",
          hover && "hover:shadow-elegant md:hover:scale-[1.02]", // Disable scale on mobile
          className
        )}
        {...props}
      >
        {(title || description || headerAction) && (
          <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between space-y-2 sm:space-y-0 pb-4">
            <div className="space-y-1 flex-1 min-w-0">
              {title && <CardTitle className="text-lg md:text-xl truncate">{title}</CardTitle>}
              {description && <CardDescription className="text-sm line-clamp-2">{description}</CardDescription>}
            </div>
            {headerAction && <div className="flex items-center shrink-0">{headerAction}</div>}
          </CardHeader>
        )}
        <CardContent className="pb-4 min-w-0">{children}</CardContent>
        {footer && <CardFooter className="pt-4 border-t flex-wrap gap-2">{footer}</CardFooter>}
      </Card>
    );
  }
);

ResponsiveCard.displayName = "ResponsiveCard";
