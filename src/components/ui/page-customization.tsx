import * as React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Settings2, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

export interface PageCustomizationOption {
  id: string;
  label: string;
  description?: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

interface PageCustomizationProps {
  options: PageCustomizationOption[];
  className?: string;
}

/**
 * A reusable page customization component that allows users to toggle
 * visibility of various page elements (filters, cards, stats, etc.)
 */
export const PageCustomization = React.forwardRef<HTMLDivElement, PageCustomizationProps>(
  ({ options, className }, ref) => {
    const enabledCount = options.filter(opt => opt.enabled).length;
    
    return (
      <div ref={ref} className={cn("inline-flex", className)}>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              <Settings2 className="h-4 w-4 mr-2" />
              Customize View
              {enabledCount < options.length && (
                <span className="ml-2 text-xs text-muted-foreground">
                  ({enabledCount}/{options.length})
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Page Visibility</h4>
                <p className="text-xs text-muted-foreground">
                  Toggle elements to customize your view
                </p>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                {options.map((option) => (
                  <div
                    key={option.id}
                    className="flex items-start justify-between space-x-2"
                  >
                    <div className="flex-1 space-y-1">
                      <Label
                        htmlFor={option.id}
                        className="text-sm font-normal cursor-pointer flex items-center gap-2"
                      >
                        {option.enabled ? (
                          <Eye className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        {option.label}
                      </Label>
                      {option.description && (
                        <p className="text-xs text-muted-foreground pl-6">
                          {option.description}
                        </p>
                      )}
                    </div>
                    <Switch
                      id={option.id}
                      checked={option.enabled}
                      onCheckedChange={option.onChange}
                    />
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }
);

PageCustomization.displayName = "PageCustomization";
