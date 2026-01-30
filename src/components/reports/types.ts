// Report types and interfaces

export interface DateFilterConfig {
  dateType: string;
  dateOptions: { value: string; label: string }[];
  startDate: Date | undefined;
  endDate: Date | undefined;
}

export interface ReportFilters {
  search: string;
  cities: string[];
  areas: string[];
  mediaTypes: string[];
  statuses: string[];
  clientTypes: string[];
  minValue?: number;
  maxValue?: number;
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

export interface SavedView {
  id: string;
  name: string;
  filters: ReportFilters;
  dateConfig: DateFilterConfig;
  sortConfig: SortConfig;
  visibleColumns: string[];
  createdAt: Date;
}

export interface KPITile {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  subLabel?: string;
  color?: 'default' | 'success' | 'warning' | 'danger';
}

export interface DatePreset {
  label: string;
  getValue: () => { from: Date; to: Date };
}

export const DATE_PRESETS: DatePreset[] = [
  {
    label: 'Today',
    getValue: () => {
      const today = new Date();
      return { from: today, to: today };
    },
  },
  {
    label: 'This Week',
    getValue: () => {
      const today = new Date();
      const start = new Date(today);
      start.setDate(today.getDate() - today.getDay());
      return { from: start, to: today };
    },
  },
  {
    label: 'This Month',
    getValue: () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: start, to: today };
    },
  },
  {
    label: 'Last 30 Days',
    getValue: () => {
      const today = new Date();
      const start = new Date(today);
      start.setDate(today.getDate() - 30);
      return { from: start, to: today };
    },
  },
  {
    label: 'This Quarter',
    getValue: () => {
      const today = new Date();
      const quarter = Math.floor(today.getMonth() / 3);
      const start = new Date(today.getFullYear(), quarter * 3, 1);
      return { from: start, to: today };
    },
  },
  {
    label: 'FY (Apr-Mar)',
    getValue: () => {
      const today = new Date();
      const year = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
      const start = new Date(year, 3, 1); // April 1
      const end = new Date(year + 1, 2, 31); // March 31
      return { from: start, to: end > today ? today : end };
    },
  },
];

// Utility functions
export function formatDateRange(from: Date | undefined, to: Date | undefined): string {
  if (!from) return 'Select date range';
  if (!to) return from.toLocaleDateString();
  return `${from.toLocaleDateString()} - ${to.toLocaleDateString()}`;
}

export function isDateInRange(date: Date, start: Date, end: Date): boolean {
  return date >= start && date <= end;
}

export function doesRangeOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  return startA <= endB && endA >= startB;
}

export function getPreviousPeriod(from: Date, to: Date): { from: Date; to: Date } {
  const diff = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - diff);
  return { from: prevFrom, to: prevTo };
}

export function calculateTrendPercentage(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}
