import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Printer, Calculator, CheckSquare, Layers } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PrintingPricingBarProps {
  printingRate: number;
  mountingRate: number;
  onPrintingRateChange: (rate: number) => void;
  onMountingRateChange: (rate: number) => void;
  onApplyPrintingToSelected: () => void;
  onApplyPrintingToAll: () => void;
  onApplyMountingToSelected: () => void;
  onApplyMountingToAll: () => void;
  selectedCount: number;
  totalCount: number;
  disabled?: boolean;
}

export function PrintingPricingBar({
  printingRate,
  mountingRate,
  onPrintingRateChange,
  onMountingRateChange,
  onApplyPrintingToSelected,
  onApplyPrintingToAll,
  onApplyMountingToSelected,
  onApplyMountingToAll,
  selectedCount,
  totalCount,
  disabled = false,
}: PrintingPricingBarProps) {
  return (
    <div className="bg-muted/50 border rounded-lg p-4 mb-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Header */}
        <div className="flex items-center gap-2 shrink-0">
          <Calculator className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-sm">Bulk Pricing Controls</h3>
          {selectedCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {selectedCount} selected
            </Badge>
          )}
        </div>

        {/* Printing Section */}
        <div className="flex flex-wrap items-center gap-3 p-3 bg-background rounded-md border">
          <div className="flex items-center gap-2">
            <Printer className="h-4 w-4 text-blue-600" />
            <Label className="text-sm font-medium whitespace-nowrap">Printing Rate:</Label>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">₹</span>
            <Input
              type="number"
              value={printingRate || ""}
              onChange={(e) => onPrintingRateChange(parseFloat(e.target.value) || 0)}
              className="h-9 w-24"
              placeholder="17"
              step="0.5"
              min="0"
              disabled={disabled}
            />
            <span className="text-sm text-muted-foreground">/sqft</span>
          </div>
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onApplyPrintingToSelected}
                    disabled={selectedCount === 0 || disabled}
                    className="text-xs"
                  >
                    <CheckSquare className="h-3 w-3 mr-1" />
                    Selected ({selectedCount})
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Apply ₹{printingRate}/sqft printing rate to {selectedCount} selected assets</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={onApplyPrintingToAll}
                    disabled={totalCount === 0 || disabled}
                    className="text-xs"
                  >
                    <Layers className="h-3 w-3 mr-1" />
                    All ({totalCount})
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Apply ₹{printingRate}/sqft printing rate to all {totalCount} assets</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Mounting Section */}
        <div className="flex flex-wrap items-center gap-3 p-3 bg-background rounded-md border">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-green-600" />
            <Label className="text-sm font-medium whitespace-nowrap">Mounting Rate:</Label>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">₹</span>
            <Input
              type="number"
              value={mountingRate || ""}
              onChange={(e) => onMountingRateChange(parseFloat(e.target.value) || 0)}
              className="h-9 w-24"
              placeholder="8"
              step="0.5"
              min="0"
              disabled={disabled}
            />
            <span className="text-sm text-muted-foreground">/sqft</span>
          </div>
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onApplyMountingToSelected}
                    disabled={selectedCount === 0 || disabled}
                    className="text-xs"
                  >
                    <CheckSquare className="h-3 w-3 mr-1" />
                    Selected ({selectedCount})
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Apply ₹{mountingRate}/sqft mounting rate to {selectedCount} selected assets</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={onApplyMountingToAll}
                    disabled={totalCount === 0 || disabled}
                    className="text-xs"
                  >
                    <Layers className="h-3 w-3 mr-1" />
                    All ({totalCount})
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Apply ₹{mountingRate}/sqft mounting rate to all {totalCount} assets</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Helper text */}
      <p className="text-xs text-muted-foreground mt-3">
        <Calculator className="h-3 w-3 inline-block mr-1" />
        <strong>Formula:</strong> Printing/Mounting Cost = Total Sqft × Rate/Sqft (auto-calculated, read-only)
      </p>
    </div>
  );
}
