import { useState, useCallback, useMemo, useEffect } from "react";
import { DateRange } from "react-day-picker";
import { useSearchParams } from "react-router-dom";
import { SortConfig } from "@/components/reports/types";

interface UseReportFiltersOptions {
  defaultDateType: string;
  defaultSortField: string;
  defaultSortDirection: 'asc' | 'desc';
  reportKey: string;
}

interface FilterState {
  cities: string[];
  areas: string[];
  mediaTypes: string[];
  statuses: string[];
  clients: string[];
}

export function useReportFilters({
  defaultDateType,
  defaultSortField,
  defaultSortDirection,
  reportKey,
}: UseReportFiltersOptions) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize from URL params or defaults
  const [dateType, setDateType] = useState(() => 
    searchParams.get("dateType") || defaultDateType
  );
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (from && to) {
      return { from: new Date(from), to: new Date(to) };
    }
    // Default to last 30 days
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    return { from: thirtyDaysAgo, to: today };
  });

  const [searchValue, setSearchValue] = useState(() => 
    searchParams.get("q") || ""
  );

  const [selectedFilters, setSelectedFilters] = useState<FilterState>(() => ({
    cities: searchParams.get("cities")?.split(",").filter(Boolean) || [],
    areas: searchParams.get("areas")?.split(",").filter(Boolean) || [],
    mediaTypes: searchParams.get("types")?.split(",").filter(Boolean) || [],
    statuses: searchParams.get("statuses")?.split(",").filter(Boolean) || [],
    clients: searchParams.get("clients")?.split(",").filter(Boolean) || [],
  }));

  const [sortConfig, setSortConfig] = useState<SortConfig>(() => {
    const sortParam = searchParams.get("sort");
    if (sortParam) {
      const [field, direction] = sortParam.split(":");
      return { 
        field: field || defaultSortField, 
        direction: (direction as 'asc' | 'desc') || defaultSortDirection 
      };
    }
    return { field: defaultSortField, direction: defaultSortDirection };
  });

  const [comparisonEnabled, setComparisonEnabled] = useState(false);

  // Handle filter change
  const handleFilterChange = useCallback((filterType: string, values: string[]) => {
    setSelectedFilters(prev => ({
      ...prev,
      [filterType]: values,
    }));
  }, []);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setDateType(defaultDateType);
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    setDateRange({ from: thirtyDaysAgo, to: today });
    setSearchValue("");
    setSelectedFilters({
      cities: [],
      areas: [],
      mediaTypes: [],
      statuses: [],
      clients: [],
    });
    setSortConfig({ field: defaultSortField, direction: defaultSortDirection });
    setComparisonEnabled(false);
    setSearchParams({});
  }, [defaultDateType, defaultSortField, defaultSortDirection, setSearchParams]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      searchValue !== "" ||
      selectedFilters.cities.length > 0 ||
      selectedFilters.areas.length > 0 ||
      selectedFilters.mediaTypes.length > 0 ||
      selectedFilters.statuses.length > 0 ||
      selectedFilters.clients.length > 0
    );
  }, [searchValue, selectedFilters]);

  // Get filter summary string
  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (dateRange?.from && dateRange?.to) {
      parts.push(`${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`);
    }
    if (selectedFilters.cities.length) parts.push(`${selectedFilters.cities.length} cities`);
    if (selectedFilters.areas.length) parts.push(`${selectedFilters.areas.length} areas`);
    if (selectedFilters.mediaTypes.length) parts.push(`${selectedFilters.mediaTypes.length} types`);
    if (selectedFilters.statuses.length) parts.push(`${selectedFilters.statuses.length} statuses`);
    if (searchValue) parts.push(`Search: "${searchValue}"`);
    return parts.join(", ") || "No filters applied";
  }, [dateRange, selectedFilters, searchValue]);

  return {
    // Date
    dateType,
    setDateType,
    dateRange,
    setDateRange,
    
    // Search
    searchValue,
    setSearchValue,
    
    // Filters
    selectedFilters,
    setSelectedFilters,
    handleFilterChange,
    
    // Sort
    sortConfig,
    setSortConfig,
    
    // Comparison
    comparisonEnabled,
    setComparisonEnabled,
    
    // Utils
    resetFilters,
    hasActiveFilters,
    filterSummary,
  };
}
