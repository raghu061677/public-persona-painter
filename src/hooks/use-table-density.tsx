import { useState, useEffect } from 'react';

export type TableDensity = 'compact' | 'normal' | 'comfortable';

export function useTableDensity(tableKey: string, defaultDensity: TableDensity = 'normal') {
  const [density, setDensity] = useState<TableDensity>(defaultDensity);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const storageKey = `table-density-${tableKey}`;
    const stored = localStorage.getItem(storageKey);
    
    if (stored && ['compact', 'normal', 'comfortable'].includes(stored)) {
      setDensity(stored as TableDensity);
    }
    
    setIsReady(true);
  }, [tableKey]);

  useEffect(() => {
    if (!isReady) return;
    
    const storageKey = `table-density-${tableKey}`;
    localStorage.setItem(storageKey, density);
  }, [density, tableKey, isReady]);

  const getRowClassName = () => {
    switch (density) {
      case 'compact':
        return 'h-8';
      case 'comfortable':
        return 'h-16';
      default:
        return 'h-12';
    }
  };

  const getCellClassName = () => {
    switch (density) {
      case 'compact':
        return 'p-2 text-xs';
      case 'comfortable':
        return 'p-6 text-base';
      default:
        return 'p-4 text-sm';
    }
  };

  return {
    density,
    setDensity,
    getRowClassName,
    getCellClassName,
    isReady,
  };
}
