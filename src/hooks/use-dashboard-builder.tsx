import { useState, useEffect, useCallback } from 'react';

export interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  config?: Record<string, any>;
}

export interface DashboardLayout {
  id: string;
  name: string;
  widgets: DashboardWidget[];
  columns: number;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_LAYOUT: DashboardLayout = {
  id: 'default',
  name: 'Default Dashboard',
  widgets: [],
  columns: 12,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function useDashboardBuilder(layoutId: string = 'default') {
  const [layout, setLayout] = useState<DashboardLayout>(DEFAULT_LAYOUT);
  const [isEditing, setIsEditing] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Load layout from localStorage
  useEffect(() => {
    const storageKey = `dashboard-layout-${layoutId}`;
    const stored = localStorage.getItem(storageKey);

    if (stored) {
      try {
        setLayout(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse dashboard layout', e);
        setLayout(DEFAULT_LAYOUT);
      }
    }

    setIsReady(true);
  }, [layoutId]);

  // Save layout to localStorage
  useEffect(() => {
    if (!isReady) return;

    const storageKey = `dashboard-layout-${layoutId}`;
    localStorage.setItem(storageKey, JSON.stringify(layout));
  }, [layout, layoutId, isReady]);

  const addWidget = useCallback((widget: Omit<DashboardWidget, 'id' | 'x' | 'y'>) => {
    const newWidget: DashboardWidget = {
      ...widget,
      id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x: 0,
      y: Infinity, // Place at bottom
    };

    setLayout(current => ({
      ...current,
      widgets: [...current.widgets, newWidget],
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const removeWidget = useCallback((widgetId: string) => {
    setLayout(current => ({
      ...current,
      widgets: current.widgets.filter(w => w.id !== widgetId),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const updateWidget = useCallback((widgetId: string, updates: Partial<DashboardWidget>) => {
    setLayout(current => ({
      ...current,
      widgets: current.widgets.map(w => 
        w.id === widgetId ? { ...w, ...updates } : w
      ),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const moveWidget = useCallback((widgetId: string, x: number, y: number) => {
    updateWidget(widgetId, { x, y });
  }, [updateWidget]);

  const resizeWidget = useCallback((widgetId: string, width: number, height: number) => {
    updateWidget(widgetId, { width, height });
  }, [updateWidget]);

  const saveLayout = useCallback((name?: string) => {
    setLayout(current => ({
      ...current,
      name: name || current.name,
      updatedAt: new Date().toISOString(),
    }));
    setIsEditing(false);
  }, []);

  const resetLayout = useCallback(() => {
    setLayout(DEFAULT_LAYOUT);
    setIsEditing(false);
  }, []);

  const duplicateWidget = useCallback((widgetId: string) => {
    const widget = layout.widgets.find(w => w.id === widgetId);
    if (!widget) return;

    const newWidget: DashboardWidget = {
      ...widget,
      id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x: widget.x + 1,
      y: widget.y + 1,
    };

    setLayout(current => ({
      ...current,
      widgets: [...current.widgets, newWidget],
      updatedAt: new Date().toISOString(),
    }));
  }, [layout.widgets]);

  const exportLayout = useCallback(() => {
    const json = JSON.stringify(layout, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-${layout.id}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [layout]);

  const importLayout = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        setLayout(imported);
      } catch (error) {
        console.error('Failed to import layout', error);
      }
    };
    reader.readAsText(file);
  }, []);

  return {
    layout,
    widgets: layout.widgets,
    isEditing,
    setIsEditing,
    isReady,
    addWidget,
    removeWidget,
    updateWidget,
    moveWidget,
    resizeWidget,
    duplicateWidget,
    saveLayout,
    resetLayout,
    exportLayout,
    importLayout,
  };
}
