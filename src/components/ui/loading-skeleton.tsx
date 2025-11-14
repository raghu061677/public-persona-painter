import * as React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface SkeletonCardProps {
  count?: number;
  className?: string;
}

/**
 * Skeleton loader for card components
 */
export const SkeletonCard = React.forwardRef<HTMLDivElement, SkeletonCardProps>(
  ({ count = 1, className }, ref) => {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i} ref={i === 0 ? ref : undefined} className={className}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </CardContent>
          </Card>
        ))}
      </>
    );
  }
);

SkeletonCard.displayName = "SkeletonCard";

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

/**
 * Skeleton loader for table components
 */
export const SkeletonTable = React.forwardRef<HTMLDivElement, SkeletonTableProps>(
  ({ rows = 5, columns = 4, className }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-3", className)}>
        {/* Header */}
        <div className="flex gap-4 border-b pb-3">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={`header-${i}`} className="h-4 flex-1" />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={`row-${rowIndex}`} className="flex gap-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={`cell-${rowIndex}-${colIndex}`} className="h-10 flex-1" />
            ))}
          </div>
        ))}
      </div>
    );
  }
);

SkeletonTable.displayName = "SkeletonTable";

interface SkeletonFormProps {
  fields?: number;
  className?: string;
}

/**
 * Skeleton loader for form components
 */
export const SkeletonForm = React.forwardRef<HTMLDivElement, SkeletonFormProps>(
  ({ fields = 4, className }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-6", className)}>
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <div className="flex gap-2 justify-end pt-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    );
  }
);

SkeletonForm.displayName = "SkeletonForm";

interface SkeletonListProps {
  items?: number;
  withAvatar?: boolean;
  className?: string;
}

/**
 * Skeleton loader for list components
 */
export const SkeletonList = React.forwardRef<HTMLDivElement, SkeletonListProps>(
  ({ items = 5, withAvatar = false, className }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-3", className)}>
        {Array.from({ length: items }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            {withAvatar && <Skeleton className="h-10 w-10 rounded-full shrink-0" />}
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }
);

SkeletonList.displayName = "SkeletonList";

interface SkeletonStatsProps {
  count?: number;
  className?: string;
}

/**
 * Skeleton loader for statistics/KPI cards
 */
export const SkeletonStats = React.forwardRef<HTMLDivElement, SkeletonStatsProps>(
  ({ count = 4, className }, ref) => {
    return (
      <div ref={ref} className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
);

SkeletonStats.displayName = "SkeletonStats";
