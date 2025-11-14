import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  message: string;
  onRetry?: () => void;
  variant?: "default" | "inline" | "page";
}

/**
 * A standardized error state component for handling errors across the application
 */
export const ErrorState = React.forwardRef<HTMLDivElement, ErrorStateProps>(
  (
    {
      className,
      title = "Something went wrong",
      message,
      onRetry,
      variant = "default",
      ...props
    },
    ref
  ) => {
    if (variant === "inline") {
      return (
        <Alert ref={ref} variant="destructive" className={cn("my-4", className)} {...props}>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span className="flex-1">{message}</span>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="shrink-0 border-destructive-foreground/20 hover:bg-destructive-foreground/10"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            )}
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center text-center",
          variant === "page" ? "min-h-[400px] py-12 px-4" : "py-8 px-4",
          className
        )}
        {...props}
      >
        <div className="rounded-full bg-destructive/10 flex items-center justify-center w-16 h-16 md:w-20 md:h-20 mb-4">
          <AlertCircle className="w-8 h-8 md:w-10 md:h-10 text-destructive" />
        </div>
        <h3 className="text-lg md:text-xl font-semibold text-foreground mb-2">
          {title}
        </h3>
        <p className="text-sm md:text-base text-muted-foreground max-w-md mx-auto mb-6">
          {message}
        </p>
        {onRetry && (
          <Button onClick={onRetry} variant="default">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        )}
      </div>
    );
  }
);

ErrorState.displayName = "ErrorState";
