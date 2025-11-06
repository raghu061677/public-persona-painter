import { useState, useEffect } from "react";

export type DateFormat = "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD" | "MMM DD, YYYY";
export type CurrencyFormat = "en-IN" | "en-US" | "en-GB";

export interface TableSettings {
  defaultPageSize: number;
  autoRefreshInterval: number; // in seconds, 0 = disabled
  dateFormat: DateFormat;
  currencyFormat: CurrencyFormat;
  currencySymbol: string;
  showTimestamps: boolean;
  compactNumbers: boolean;
}

const defaultSettings: TableSettings = {
  defaultPageSize: 25,
  autoRefreshInterval: 0,
  dateFormat: "DD/MM/YYYY",
  currencyFormat: "en-IN",
  currencySymbol: "₹",
  showTimestamps: false,
  compactNumbers: false,
};

export function useTableSettings(tableKey: string) {
  const [settings, setSettings] = useState<TableSettings>(defaultSettings);
  const [isReady, setIsReady] = useState(false);

  const storageKey = `table-settings-${tableKey}`;

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (e) {
        console.error("Failed to parse table settings", e);
      }
    }
    setIsReady(true);
  }, [storageKey]);

  useEffect(() => {
    if (!isReady) return;
    localStorage.setItem(storageKey, JSON.stringify(settings));
  }, [settings, storageKey, isReady]);

  const updateSettings = (updates: Partial<TableSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  return {
    settings,
    updateSettings,
    resetSettings,
    isReady,
  };
}

// Utility functions for formatting
export function formatDate(date: Date | string, format: DateFormat, showTime = false): string {
  const d = typeof date === "string" ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return "Invalid Date";

  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  let formatted = "";
  switch (format) {
    case "MM/DD/YYYY":
      formatted = `${month}/${day}/${year}`;
      break;
    case "DD/MM/YYYY":
      formatted = `${day}/${month}/${year}`;
      break;
    case "YYYY-MM-DD":
      formatted = `${year}-${month}-${day}`;
      break;
    case "MMM DD, YYYY":
      formatted = `${monthNames[d.getMonth()]} ${day}, ${year}`;
      break;
  }

  if (showTime) {
    const hours = d.getHours().toString().padStart(2, "0");
    const minutes = d.getMinutes().toString().padStart(2, "0");
    formatted += ` ${hours}:${minutes}`;
  }

  return formatted;
}

export function formatCurrency(
  amount: number | null | undefined,
  format: CurrencyFormat,
  symbol: string,
  compact = false
): string {
  if (amount == null) return "-";

  const absAmount = Math.abs(amount);
  let formatted = "";

  if (compact && absAmount >= 100000) {
    // Format in lakhs/crores for Indian format
    if (format === "en-IN") {
      if (absAmount >= 10000000) {
        formatted = `${symbol}${(absAmount / 10000000).toFixed(2)}Cr`;
      } else if (absAmount >= 100000) {
        formatted = `${symbol}${(absAmount / 100000).toFixed(2)}L`;
      }
    } else {
      // Format in K/M for other formats
      if (absAmount >= 1000000) {
        formatted = `${symbol}${(absAmount / 1000000).toFixed(2)}M`;
      } else if (absAmount >= 1000) {
        formatted = `${symbol}${(absAmount / 1000).toFixed(2)}K`;
      }
    }
  }

  if (!formatted) {
    formatted = new Intl.NumberFormat(format, {
      style: "currency",
      currency: format === "en-IN" ? "INR" : format === "en-US" ? "USD" : "GBP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(absAmount);

    // Replace currency symbol with custom one
    formatted = formatted.replace(/₹|£|\$/, symbol);
  }

  return amount < 0 ? `-${formatted}` : formatted;
}
