import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DurationMode,
  calculateDurationDays,
  calculateEndDate,
  syncDurationFromStartDate,
  syncDurationFromEndDate,
  syncDurationFromDays,
  syncDurationFromMonths,
  formatForSupabase,
  toDateOnly,
} from "@/utils/billingEngine";

interface LineItemDurationControlProps {
  startDate: Date;
  endDate: Date;
  durationDays: number;
  durationMode: DurationMode;
  monthsCount: number;
  onDurationChange: (update: {
    start_date?: Date;
    end_date?: Date;
    duration_days?: number;
    duration_mode?: DurationMode;
    months_count?: number;
  }) => void;
  disabled?: boolean;
}

export function LineItemDurationControl({
  startDate,
  endDate,
  durationDays,
  durationMode,
  monthsCount,
  onDurationChange,
  disabled = false,
}: LineItemDurationControlProps) {
  const [localStartDate, setLocalStartDate] = useState(startDate);
  const [localEndDate, setLocalEndDate] = useState(endDate);
  const [localDurationDays, setLocalDurationDays] = useState(durationDays);
  const [localMonthsCount, setLocalMonthsCount] = useState(monthsCount);

  // Sync local state with props
  useEffect(() => {
    setLocalStartDate(startDate);
    setLocalEndDate(endDate);
    setLocalDurationDays(durationDays);
    setLocalMonthsCount(monthsCount);
  }, [startDate, endDate, durationDays, monthsCount]);

  const handleStartDateChange = (date: Date | undefined) => {
    if (!date || disabled) return;
    
    const normalized = toDateOnly(date);
    const sync = syncDurationFromStartDate(normalized, localDurationDays);
    
    setLocalStartDate(normalized);
    setLocalEndDate(sync.end_date);
    
    onDurationChange({
      start_date: normalized,
      end_date: sync.end_date,
    });
  };

  const handleEndDateChange = (date: Date | undefined) => {
    if (!date || disabled) return;
    
    const normalized = toDateOnly(date);
    const sync = syncDurationFromEndDate(localStartDate, normalized, durationMode);
    
    setLocalEndDate(normalized);
    setLocalDurationDays(sync.duration_days);
    setLocalMonthsCount(sync.months_count);
    
    onDurationChange({
      end_date: normalized,
      duration_days: sync.duration_days,
      months_count: sync.months_count,
    });
  };

  const handleDurationDaysChange = (value: string) => {
    if (disabled) return;
    
    const days = Math.max(1, parseInt(value) || 1);
    const sync = syncDurationFromDays(localStartDate, days);
    
    setLocalDurationDays(days);
    setLocalEndDate(sync.end_date);
    setLocalMonthsCount(sync.months_count);
    
    onDurationChange({
      duration_days: days,
      end_date: sync.end_date,
      months_count: sync.months_count,
    });
  };

  const handleMonthsCountChange = (value: string) => {
    if (disabled || durationMode !== 'MONTH') return;
    
    const months = Math.max(0.5, parseFloat(value) || 0.5);
    const sync = syncDurationFromMonths(localStartDate, months);
    
    setLocalMonthsCount(months);
    setLocalDurationDays(sync.duration_days);
    setLocalEndDate(sync.end_date);
    
    onDurationChange({
      months_count: months,
      duration_days: sync.duration_days,
      end_date: sync.end_date,
    });
  };

  const handleDurationModeChange = (mode: DurationMode) => {
    if (disabled) return;
    
    // When switching to Month-wise, default to 30 days (OOH industry standard)
    if (mode === 'MONTH') {
      const defaultMonthDays = 30; // 1 month = 30 days for OOH billing
      const sync = syncDurationFromDays(localStartDate, defaultMonthDays);
      
      setLocalDurationDays(defaultMonthDays);
      setLocalMonthsCount(1);
      setLocalEndDate(sync.end_date);
      
      onDurationChange({
        duration_mode: mode,
        duration_days: defaultMonthDays,
        months_count: 1,
        end_date: sync.end_date,
      });
    } else {
      // Keep current duration when switching to DAYS mode
      onDurationChange({
        duration_mode: mode,
      });
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Start Date */}
        <div className="space-y-2">
          <Label>Start Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !localStartDate && "text-muted-foreground"
                )}
                disabled={disabled}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formatDate(localStartDate)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={localStartDate}
                onSelect={handleStartDateChange}
                initialFocus
                disabled={disabled}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* End Date */}
        <div className="space-y-2">
          <Label>End Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !localEndDate && "text-muted-foreground"
                )}
                disabled={disabled}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formatDate(localEndDate)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={localEndDate}
                onSelect={handleEndDateChange}
                initialFocus
                disabled={(date) => disabled || date < localStartDate}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Duration Days */}
        <div className="space-y-2">
          <Label>Duration (Days)</Label>
          <Input
            type="number"
            min="1"
            value={localDurationDays}
            onChange={(e) => handleDurationDaysChange(e.target.value)}
            disabled={disabled}
            className="font-medium"
          />
        </div>

        {/* Duration Mode */}
        <div className="space-y-2">
          <Label>Billing Mode</Label>
          <Select
            value={durationMode}
            onValueChange={(value) => handleDurationModeChange(value as DurationMode)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MONTH">Month-wise</SelectItem>
              <SelectItem value="DAYS">Day-wise</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Months Count (only visible in MONTH mode) */}
        {durationMode === 'MONTH' && (
          <div className="space-y-2">
            <Label>Months</Label>
            <Input
              type="number"
              min="0.5"
              step="0.5"
              value={localMonthsCount}
              onChange={(e) => handleMonthsCountChange(e.target.value)}
              disabled={disabled}
              className="font-medium"
            />
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        <p>
          <strong>Mode:</strong> {durationMode === 'MONTH' ? 'Month-wise billing' : 'Day-wise billing'}
        </p>
        <p>
          <strong>Factor:</strong> {durationMode === 'MONTH' ? `${localMonthsCount} months` : `${localDurationDays} days ÷ 30`}
        </p>
      </div>
    </div>
  );
}
