import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { 
  BillingMode, 
  computeBookedDays, 
  computeRentAmount,
  formatBillingMode 
} from "@/utils/perAssetPricing";

interface CampaignAssetDurationCellProps {
  startDate: Date | string | null;
  endDate: Date | string | null;
  billingMode: BillingMode;
  monthlyRate: number;
  campaignStartDate?: Date;
  campaignEndDate?: Date;
  onChange: (updates: {
    start_date?: Date | string;
    end_date?: Date | string;
    billing_mode?: BillingMode;
    booked_days?: number;
    daily_rate?: number;
    rent_amount?: number;
  }) => void;
  readOnly?: boolean;
  compact?: boolean;
}

export function CampaignAssetDurationCell({
  startDate,
  endDate,
  billingMode,
  monthlyRate,
  campaignStartDate,
  campaignEndDate,
  onChange,
  readOnly = false,
  compact = false,
}: CampaignAssetDurationCellProps) {
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const assetStart = startDate ? (typeof startDate === 'string' ? new Date(startDate) : startDate) : null;
  const assetEnd = endDate ? (typeof endDate === 'string' ? new Date(endDate) : endDate) : null;
  
  // Calculate booked days and rent
  const bookedDays = assetStart && assetEnd ? computeBookedDays(assetStart, assetEnd) : 0;
  const rentResult = assetStart && assetEnd 
    ? computeRentAmount(monthlyRate, assetStart, assetEnd, billingMode)
    : { booked_days: 0, daily_rate: 0, rent_amount: 0, billing_mode: billingMode };

  const handleStartDateChange = (date: Date | undefined) => {
    if (!date) return;
    setStartOpen(false);
    
    const newEnd = assetEnd || campaignEndDate || date;
    const result = computeRentAmount(monthlyRate, date, newEnd, billingMode);
    
    onChange({
      start_date: date,
      end_date: newEnd,
      booked_days: result.booked_days,
      daily_rate: result.daily_rate,
      rent_amount: result.rent_amount,
    });
  };

  const handleEndDateChange = (date: Date | undefined) => {
    if (!date) return;
    setEndOpen(false);
    
    const newStart = assetStart || campaignStartDate || date;
    const result = computeRentAmount(monthlyRate, newStart, date, billingMode);
    
    onChange({
      start_date: newStart,
      end_date: date,
      booked_days: result.booked_days,
      daily_rate: result.daily_rate,
      rent_amount: result.rent_amount,
    });
  };

  const handleBillingModeChange = (mode: BillingMode) => {
    if (!assetStart || !assetEnd) {
      onChange({ billing_mode: mode });
      return;
    }
    
    const result = computeRentAmount(monthlyRate, assetStart, assetEnd, mode);
    onChange({
      billing_mode: mode,
      booked_days: result.booked_days,
      daily_rate: result.daily_rate,
      rent_amount: result.rent_amount,
    });
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs whitespace-nowrap">
          {bookedDays}d
        </Badge>
        {assetStart && assetEnd && (
          <span className="text-xs text-muted-foreground">
            {format(assetStart, 'dd/MM')} - {format(assetEnd, 'dd/MM')}
          </span>
        )}
      </div>
    );
  }

  if (readOnly) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-semibold">
            {bookedDays} days
          </Badge>
          <Badge variant="outline" className="text-xs">
            {formatBillingMode(billingMode)}
          </Badge>
        </div>
        {assetStart && assetEnd && (
          <p className="text-xs text-muted-foreground">
            {format(assetStart, 'dd MMM')} - {format(assetEnd, 'dd MMM yyyy')}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Start Date */}
      <Popover open={startOpen} onOpenChange={setStartOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 w-[100px] justify-start text-left font-normal text-xs",
              !assetStart && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-1 h-3 w-3" />
            {assetStart ? format(assetStart, "dd/MM") : "Start"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={assetStart || undefined}
            onSelect={handleStartDateChange}
            initialFocus
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      <span className="text-muted-foreground text-xs">-</span>

      {/* End Date */}
      <Popover open={endOpen} onOpenChange={setEndOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 w-[100px] justify-start text-left font-normal text-xs",
              !assetEnd && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-1 h-3 w-3" />
            {assetEnd ? format(assetEnd, "dd/MM") : "End"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={assetEnd || undefined}
            onSelect={handleEndDateChange}
            initialFocus
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      {/* Days Badge */}
      <Badge variant="secondary" className="h-6 text-xs font-semibold">
        {bookedDays}d
      </Badge>
    </div>
  );
}
