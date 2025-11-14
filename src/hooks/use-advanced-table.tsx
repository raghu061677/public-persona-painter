import { useState, useMemo, useCallback } from 'react';
import { useTableSettings, formatDate, formatCurrency } from './use-table-settings';
import { useTableDensity } from './use-table-density';
import { useColumnPrefs } from './use-column-prefs';

export interface AdvancedTableColumn<T> {
  key: string;
  header: string;
  accessorKey?: keyof T | string;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  resizable?: boolean;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  type?: 'text' | 'number' | 'date' | 'currency' | 'boolean' | 'custom';
}

export interface AdvancedTableConfig<T> {
  data: T[];
  columns: AdvancedTableColumn<T>[];
  tableKey: string;
  enableSorting?: boolean;
  enableFiltering?: boolean;
  enablePagination?: boolean;
  enableSelection?: boolean;
  enableExport?: boolean;
  enableColumnResize?: boolean;
  defaultPageSize?: number;
}

export function useAdvancedTable<T extends Record<string, any>>({
  data,
  columns,
  tableKey,
  enableSorting = true,
  enableFiltering = true,
  enablePagination = true,
  enableSelection = true,
  enableExport = true,
  enableColumnResize = true,
  defaultPageSize = 10,
}: AdvancedTableConfig<T>) {
  // Settings management
  const { settings, updateSettings, resetSettings, isReady: settingsReady } = useTableSettings(tableKey);
  const { density, setDensity, getRowClassName, getCellClassName, isReady: densityReady } = useTableDensity(tableKey);
  const { 
    visibleKeys, 
    setVisibleKeys, 
    columnOrder, 
    setColumnOrder, 
    reset: resetColumnPrefs,
    isReady: columnPrefsReady 
  } = useColumnPrefs(
    tableKey,
    columns.map(c => c.key),
    columns.map(c => c.key)
  );

  // Table state
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(settings.pageSize || defaultPageSize);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});

  // Sorting
  const sortedData = useMemo(() => {
    if (!enableSorting || !sortConfig) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      const comparison = aVal < bVal ? -1 : 1;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [data, sortConfig, enableSorting]);

  // Filtering
  const filteredData = useMemo(() => {
    if (!enableFiltering || Object.keys(filters).length === 0) return sortedData;

    return sortedData.filter(row => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        const cellValue = String(row[key] || '').toLowerCase();
        return cellValue.includes(value.toLowerCase());
      });
    });
  }, [sortedData, filters, enableFiltering]);

  // Pagination
  const paginatedData = useMemo(() => {
    if (!enablePagination) return filteredData;

    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredData.slice(start, end);
  }, [filteredData, currentPage, pageSize, enablePagination]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  // Handlers
  const handleSort = useCallback((key: string) => {
    if (!enableSorting) return;

    setSortConfig(current => {
      if (current?.key === key) {
        return current.direction === 'asc' 
          ? { key, direction: 'desc' }
          : null;
      }
      return { key, direction: 'asc' };
    });
  }, [enableSorting]);

  const handleFilter = useCallback((key: string, value: string) => {
    if (!enableFiltering) return;

    setFilters(current => {
      if (!value) {
        const { [key]: _, ...rest } = current;
        return rest;
      }
      return { ...current, [key]: value };
    });
    setCurrentPage(1);
  }, [enableFiltering]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
    updateSettings({ pageSize: size });
  }, [updateSettings]);

  const handleSelectRow = useCallback((index: number) => {
    if (!enableSelection) return;

    setSelectedRows(current => {
      const newSet = new Set(current);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, [enableSelection]);

  const handleSelectAll = useCallback(() => {
    if (!enableSelection) return;

    if (selectedRows.size === paginatedData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(paginatedData.map((_, i) => i)));
    }
  }, [enableSelection, paginatedData, selectedRows]);

  const handleColumnResize = useCallback((key: string, width: number) => {
    if (!enableColumnResize) return;
    setColumnWidths(current => ({ ...current, [key]: width }));
  }, [enableColumnResize]);

  const exportToCSV = useCallback(() => {
    const visibleColumns = columns.filter(col => visibleKeys.includes(col.key));
    const headers = visibleColumns.map(col => col.header).join(',');
    const rows = filteredData.map(row => 
      visibleColumns.map(col => {
        const value = col.accessorKey ? row[col.accessorKey as string] : '';
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',')
    );

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tableKey}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [columns, visibleKeys, filteredData, tableKey]);

  const reset = useCallback(() => {
    setSortConfig(null);
    setFilters({});
    setCurrentPage(1);
    setSelectedRows(new Set());
    resetSettings();
    resetColumnPrefs();
  }, [resetSettings, resetColumnPrefs]);

  return {
    // Data
    data: paginatedData,
    allData: filteredData,
    originalData: data,
    
    // State
    sortConfig,
    filters,
    currentPage,
    pageSize,
    totalPages,
    selectedRows,
    columnWidths,
    
    // Settings
    density,
    setDensity,
    getRowClassName,
    getCellClassName,
    settings,
    updateSettings,
    visibleKeys,
    setVisibleKeys,
    columnOrder,
    setColumnOrder,
    
    // Handlers
    handleSort,
    handleFilter,
    handlePageChange,
    handlePageSizeChange,
    handleSelectRow,
    handleSelectAll,
    handleColumnResize,
    exportToCSV,
    reset,
    
    // Meta
    isReady: settingsReady && densityReady && columnPrefsReady,
    stats: {
      total: data.length,
      filtered: filteredData.length,
      selected: selectedRows.size,
    },
  };
}
