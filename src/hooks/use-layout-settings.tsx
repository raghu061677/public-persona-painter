import { useState, useEffect } from 'react';

/**
 * Global layout settings hook with localStorage persistence
 * Manages user preferences for page customization across the app
 */

export interface LayoutSettings {
  [pageId: string]: {
    [settingKey: string]: boolean;
  };
}

const STORAGE_KEY = 'go-ads-layout-settings';

const defaultSettings: LayoutSettings = {
  dashboard: {
    showMetrics: true,
    showCharts: true,
    showQuickActions: true,
    showWidgets: true,
  },
  'media-assets': {
    showHeader: true,
    showStats: true,
    showActionButtons: true,
  },
  plans: {
    showHeader: true,
    showStats: true,
    showFilters: false,
    showBulkActions: true,
  },
  campaigns: {
    showHeader: true,
    showStats: true,
    showFilters: false,
    showTimeline: true,
  },
  clients: {
    showHeader: true,
    showStats: true,
    showFilters: false,
    showQuickActions: true,
  },
  invoices: {
    showHeader: true,
    showStats: true,
    showFilters: false,
    showSummary: true,
  },
  expenses: {
    showSearch: true,
    showSummaryCards: true,
  },
};

export function useLayoutSettings(pageId: string) {
  const [settings, setSettings] = useState<{ [key: string]: boolean }>(() => {
    // Load from localStorage on mount
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: LayoutSettings = JSON.parse(stored);
        return parsed[pageId] || defaultSettings[pageId] || {};
      }
    } catch (error) {
      console.error('Failed to load layout settings:', error);
    }
    return defaultSettings[pageId] || {};
  });

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  const updateSetting = (key: string, value: boolean) => {
    setSettings((prev) => {
      const newSettings = { ...prev, [key]: value };

      // Save to localStorage
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const allSettings: LayoutSettings = stored ? JSON.parse(stored) : {};
        allSettings[pageId] = newSettings;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allSettings));
      } catch (error) {
        console.error('Failed to save layout settings:', error);
      }

      return newSettings;
    });
  };

  const resetSettings = () => {
    const defaults = defaultSettings[pageId] || {};
    setSettings(defaults);

    // Update localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const allSettings: LayoutSettings = stored ? JSON.parse(stored) : {};
      allSettings[pageId] = defaults;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allSettings));
    } catch (error) {
      console.error('Failed to reset layout settings:', error);
    }
  };

  const getSetting = (key: string, fallback: boolean = true): boolean => {
    return settings[key] !== undefined ? settings[key] : fallback;
  };

  return {
    settings,
    getSetting,
    updateSetting,
    resetSettings,
    isReady,
  };
}

// Hook to get all layout settings (for global settings panel)
export function useAllLayoutSettings() {
  const [allSettings, setAllSettings] = useState<LayoutSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load all layout settings:', error);
    }
    return defaultSettings;
  });

  const resetAllSettings = () => {
    setAllSettings(defaultSettings);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSettings));
    } catch (error) {
      console.error('Failed to reset all settings:', error);
    }
  };

  const exportSettings = () => {
    try {
      const json = JSON.stringify(allSettings, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `go-ads-layout-settings-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export settings:', error);
    }
  };

  const importSettings = (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string);
          setAllSettings(imported);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(imported));
        } catch (error) {
          console.error('Failed to parse imported settings:', error);
        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('Failed to import settings:', error);
    }
  };

  return {
    allSettings,
    resetAllSettings,
    exportSettings,
    importSettings,
  };
}
