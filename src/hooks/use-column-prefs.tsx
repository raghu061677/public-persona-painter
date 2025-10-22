import { useState, useEffect } from 'react';

export function useColumnPrefs(
  tableKey: string,
  allColumnKeys: string[],
  defaultVisibleKeys: string[]
) {
  const [isReady, setIsReady] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<string[]>(defaultVisibleKeys);
  const [columnOrder, setColumnOrder] = useState<string[]>(allColumnKeys);

  useEffect(() => {
    const storageKey = `table-prefs-${tableKey}`;
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.visibleKeys) {
          setVisibleKeys(parsed.visibleKeys);
        }
        if (parsed.columnOrder) {
          setColumnOrder(parsed.columnOrder);
        }
      } catch (e) {
        console.error('Failed to parse column preferences', e);
      }
    }
    
    setIsReady(true);
  }, [tableKey]);

  useEffect(() => {
    if (!isReady) return;
    
    const storageKey = `table-prefs-${tableKey}`;
    localStorage.setItem(
      storageKey,
      JSON.stringify({ visibleKeys, columnOrder })
    );
  }, [visibleKeys, columnOrder, tableKey, isReady]);

  const reset = () => {
    setVisibleKeys(defaultVisibleKeys);
    setColumnOrder(allColumnKeys);
  };

  return {
    isReady,
    visibleKeys,
    setVisibleKeys,
    columnOrder,
    setColumnOrder,
    reset,
  };
}
