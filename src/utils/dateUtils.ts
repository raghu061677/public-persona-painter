/**
 * Global Date Utilities for Go-Ads 360°
 * 
 * Prevents timezone shifting and ensures consistent date handling
 * across all modules (Plans, Campaigns, Operations, Finance, Reports)
 */

/**
 * Convert a Date object to UTC date-only format (YYYY-MM-DD)
 * Prevents timezone shifting when saving to Supabase
 * 
 * @param date - JavaScript Date object
 * @returns Date object in UTC with time set to 00:00:00
 */
export const toDateOnly = (date: Date): Date => {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
};

/**
 * Parse a date string (YYYY-MM-DD) from Supabase without timezone issues
 * 
 * @param dateStr - Date string in format YYYY-MM-DD
 * @returns Date object with correct day (no timezone shift)
 */
export const parseDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Format a date for Supabase storage (YYYY-MM-DD)
 * 
 * @param date - JavaScript Date object
 * @returns String in format YYYY-MM-DD
 */
export const formatForSupabase = (date: Date): string => {
  const utcDate = toDateOnly(date);
  return utcDate.toISOString().split('T')[0];
};

/**
 * Calculate duration in days between two dates (inclusive)
 * Formula: (end_date - start_date) + 1
 * 
 * @param startDate - Campaign/Plan start date
 * @param endDate - Campaign/Plan end date
 * @returns Number of days (inclusive)
 */
export const calculateDuration = (startDate: Date, endDate: Date): number => {
  const start = toDateOnly(startDate);
  const end = toDateOnly(endDate);
  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays + 1; // Inclusive (both start and end date count)
};

/**
 * Calculate end_date from start_date and duration
 * Formula: end_date = start_date + (duration - 1) days
 * 
 * @param startDate - Start date
 * @param durationDays - Number of days (inclusive)
 * @returns Calculated end date
 */
export const calculateEndDate = (startDate: Date, durationDays: number): Date => {
  const start = toDateOnly(startDate);
  const endMs = start.getTime() + (durationDays - 1) * 24 * 60 * 60 * 1000;
  return new Date(endMs);
};

/**
 * Add days to a date
 * 
 * @param date - Base date
 * @param days - Number of days to add (can be negative)
 * @returns New date
 */
export const addDays = (date: Date, days: number): Date => {
  const result = toDateOnly(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Calculate pro-rata amount based on duration
 * Formula: (monthly_rate / 30) * duration_days
 * 
 * @param monthlyRate - Monthly rate
 * @param durationDays - Number of days
 * @returns Pro-rated amount
 */
export const calculateProRata = (monthlyRate: number, durationDays: number): number => {
  return (monthlyRate / 30) * durationDays;
};

/**
 * Check if a date falls within a period
 * 
 * @param date - Date to check
 * @param startDate - Period start
 * @param endDate - Period end
 * @returns True if date is within period
 */
export const isWithinPeriod = (date: Date, startDate: Date, endDate: Date): boolean => {
  const checkDate = toDateOnly(date).getTime();
  const start = toDateOnly(startDate).getTime();
  const end = toDateOnly(endDate).getTime();
  return checkDate >= start && checkDate <= end;
};

/**
 * Operations Task Scheduling Utilities
 * Auto-generates task dates based on campaign dates
 */

export interface OperationsTaskDates {
  printing: {
    start_date: Date;
    end_date: Date;
  };
  dispatch: {
    start_date: Date;
    end_date: Date;
  };
  mounting: {
    start_date: Date;
    end_date: Date;
  };
  photoUpload: {
    deadline_date: Date;
  };
  unmounting: {
    start_date: Date;
    end_date: Date;
  };
}

/**
 * Calculate all operations task dates based on campaign dates
 * 
 * @param campaignStartDate - Campaign start date
 * @param campaignEndDate - Campaign end date
 * @returns Object with all task dates
 */
export const calculateOperationsTaskDates = (
  campaignStartDate: Date,
  campaignEndDate: Date
): OperationsTaskDates => {
  const startDate = toDateOnly(campaignStartDate);
  const endDate = toDateOnly(campaignEndDate);

  return {
    printing: {
      start_date: addDays(startDate, -3), // 3 days before campaign start
      end_date: addDays(startDate, -1),   // 1 day before campaign start
    },
    dispatch: {
      start_date: addDays(startDate, -1), // 1 day before campaign start
      end_date: addDays(startDate, -1),   // Same day
    },
    mounting: {
      start_date: startDate,               // Campaign start date
      end_date: startDate,                 // Same day
    },
    photoUpload: {
      deadline_date: addDays(startDate, 1), // 1 day after campaign start
    },
    unmounting: {
      start_date: endDate,                  // Campaign end date
      end_date: endDate,                    // Same day
    },
  };
};

/**
 * Format date for display
 * 
 * @param date - Date to format
 * @param format - Format type ('short', 'long', 'iso')
 * @returns Formatted date string
 */
export const formatDisplayDate = (date: Date, format: 'short' | 'long' | 'iso' = 'short'): string => {
  const safeDate = toDateOnly(date);
  
  switch (format) {
    case 'short':
      return safeDate.toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      });
    case 'long':
      return safeDate.toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      });
    case 'iso':
      return formatForSupabase(safeDate);
    default:
      return safeDate.toLocaleDateString('en-IN');
  }
};
