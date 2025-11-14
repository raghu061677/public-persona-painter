import { useState, useEffect } from 'react';

export function useFrozenColumns(tableKey: string) {
  const [frozenColumns, setFrozenColumns] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const storageKey = `frozen-columns-${tableKey}`;
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      try {
        setFrozenColumns(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse frozen columns:', e);
      }
    }
    
    setIsReady(true);
  }, [tableKey]);

  useEffect(() => {
    if (!isReady) return;
    
    const storageKey = `frozen-columns-${tableKey}`;
    localStorage.setItem(storageKey, JSON.stringify(frozenColumns));
  }, [frozenColumns, tableKey, isReady]);

  const toggleFrozen = (columnId: string) => {
    setFrozenColumns(prev => 
      prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  };

  const isFrozen = (columnId: string) => frozenColumns.includes(columnId);

  const getFrozenStyle = (columnId: string, index: number) => {
    if (!isFrozen(columnId)) return {};
    
    // Calculate left position based on previous frozen columns
    let left = 0;
    const frozenBefore = frozenColumns.slice(0, frozenColumns.indexOf(columnId));
    
    return {
      position: 'sticky' as const,
      left: `${left}px`,
      zIndex: 20,
      backgroundColor: 'hsl(var(--background))',
      boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
    };
  };

  return {
    frozenColumns,
    setFrozenColumns,
    toggleFrozen,
    isFrozen,
    getFrozenStyle,
    isReady,
  };
}
