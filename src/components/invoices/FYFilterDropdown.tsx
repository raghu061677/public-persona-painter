import { useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getFinancialYear } from "@/utils/finance";
import { CalendarDays } from "lucide-react";

interface FYFilterDropdownProps {
  value: string;
  onChange: (fy: string) => void;
  /** Additional FY labels found in data */
  availableFYs?: string[];
  className?: string;
}

/**
 * Financial Year dropdown filter.
 * Indian FY: April 1 → March 31
 * Format: "2025-26" means Apr 2025 – Mar 2026
 */
export function FYFilterDropdown({ value, onChange, availableFYs = [], className }: FYFilterDropdownProps) {
  const currentFY = getFinancialYear();

  const fyOptions = useMemo(() => {
    const fys = new Set<string>();
    fys.add(currentFY);
    // Add previous 2 FYs
    const now = new Date();
    for (let offset = -1; offset >= -2; offset--) {
      const d = new Date(now.getFullYear() + offset, now.getMonth(), 1);
      fys.add(getFinancialYear(d));
    }
    // Add any FYs from data
    availableFYs.forEach(fy => { if (fy) fys.add(fy); });
    return [...fys].sort().reverse();
  }, [currentFY, availableFYs]);

  return (
    <div className={className}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 w-[160px] gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <SelectValue placeholder="Financial Year" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Years</SelectItem>
          {fyOptions.map(fy => (
            <SelectItem key={fy} value={fy}>
              FY {fy}
              {fy === currentFY && <span className="ml-1 text-xs text-muted-foreground">(current)</span>}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Utility: Get FY date range from FY label like "2025-26"
 */
export function getFYDateRange(fyLabel: string): { from: string; to: string } | null {
  if (!fyLabel || fyLabel === 'all') return null;
  const parts = fyLabel.split('-');
  if (parts.length !== 2) return null;
  const startYear = parseInt(parts[0]);
  if (isNaN(startYear)) return null;
  return {
    from: `${startYear}-04-01`,
    to: `${startYear + 1}-03-31`,
  };
}

/**
 * Utility: Check if a date string falls within a FY
 */
export function isDateInFY(dateStr: string | null | undefined, fyLabel: string): boolean {
  if (!dateStr || !fyLabel || fyLabel === 'all') return true;
  const range = getFYDateRange(fyLabel);
  if (!range) return true;
  const d = dateStr.substring(0, 10);
  return d >= range.from && d <= range.to;
}
