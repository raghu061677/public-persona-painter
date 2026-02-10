import { useState, useMemo, useCallback } from "react";
import { useFieldCatalog, FieldCatalogEntry } from "./useFieldCatalog";
import { useListViewPreset, ListViewPreset } from "./useListViewPreset";
import { useCompany } from "@/contexts/CompanyContext";
import type { ExcelFieldDef } from "@/utils/exports/excel/exportListExcel";
import type { PdfFieldDef } from "@/utils/exports/pdf/exportListPdf";

export interface ListViewState {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filters: Record<string, any>;
  setFilters: (f: Record<string, any>) => void;
  sort: { field: string; direction: "asc" | "desc" };
  setSort: (s: { field: string; direction: "asc" | "desc" }) => void;
  selectedFields: string[];
  setSelectedFields: (f: string[]) => void;
}

export function useListView(pageKey: string) {
  const { company } = useCompany();
  const catalog = useFieldCatalog(pageKey);
  const presetHook = useListViewPreset(pageKey);

  // Local UI state (initialized from active preset or defaults)
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [sort, setSort] = useState<{ field: string; direction: "asc" | "desc" }>({
    field: "created_at",
    direction: "desc",
  });
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Initialize from active preset or defaults when catalog loads
  useMemo(() => {
    if (catalog.loading || initialized) return;
    
    if (presetHook.activePreset) {
      const p = presetHook.activePreset;
      if (p.search_query) setSearchQuery(p.search_query);
      if (Object.keys(p.filters).length) setFilters(p.filters);
      if (p.sort) setSort(p.sort);
      if (p.selected_fields?.length) setSelectedFields(p.selected_fields);
      else setSelectedFields(catalog.defaultFieldKeys);
    } else {
      setSelectedFields(catalog.defaultFieldKeys);
    }
    setInitialized(true);
  }, [catalog.loading, catalog.defaultFieldKeys, presetHook.activePreset, initialized]);

  // Apply a preset
  const applyPreset = useCallback(
    (preset: ListViewPreset) => {
      presetHook.setActivePreset(preset);
      setSearchQuery(preset.search_query || "");
      setFilters(preset.filters || {});
      setSort(preset.sort || { field: "created_at", direction: "desc" });
      setSelectedFields(
        preset.selected_fields?.length ? preset.selected_fields : catalog.defaultFieldKeys
      );
    },
    [catalog.defaultFieldKeys, presetHook]
  );

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setSearchQuery("");
    setFilters({});
    setSort({ field: "created_at", direction: "desc" });
    setSelectedFields(catalog.defaultFieldKeys);
  }, [catalog.defaultFieldKeys]);

  // Build export field defs from selected fields
  const excelFieldDefs = useMemo((): ExcelFieldDef[] => {
    return selectedFields
      .map((key) => {
        const entry = catalog.fields.find((f) => f.field_key === key);
        if (!entry) return null;
        return {
          key: entry.field_key,
          label: entry.label,
          width: entry.width ?? undefined,
          type: entry.data_type as any,
        } as ExcelFieldDef;
      })
      .filter(Boolean) as ExcelFieldDef[];
  }, [selectedFields, catalog.fields]);

  const pdfFieldDefs = useMemo((): PdfFieldDef[] => {
    return selectedFields
      .map((key) => {
        const entry = catalog.fields.find((f) => f.field_key === key);
        if (!entry) return null;
        return {
          key: entry.field_key,
          label: entry.label,
          width: entry.width ?? undefined,
        } as PdfFieldDef;
      })
      .filter(Boolean) as PdfFieldDef[];
  }, [selectedFields, catalog.fields]);

  // Save current state as a view
  const saveCurrentAsView = useCallback(
    async (name: string, isDefault = false, isShared = false) => {
      return presetHook.savePreset({
        preset_name: name,
        is_default: isDefault,
        is_shared: isShared,
        search_query: searchQuery,
        filters,
        sort,
        selected_fields: selectedFields,
        field_order: selectedFields,
      });
    },
    [searchQuery, filters, sort, selectedFields, presetHook]
  );

  // Update current active preset with current state
  const updateCurrentView = useCallback(async () => {
    if (!presetHook.activePreset) return;
    await presetHook.updatePreset(presetHook.activePreset.id, {
      search_query: searchQuery,
      filters,
      sort,
      selected_fields: selectedFields,
      field_order: selectedFields,
    });
  }, [presetHook, searchQuery, filters, sort, selectedFields]);

  return {
    // Catalog
    catalog,
    // State
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    sort,
    setSort,
    selectedFields,
    setSelectedFields,
    // Presets
    presets: presetHook.presets,
    activePreset: presetHook.activePreset,
    applyPreset,
    saveCurrentAsView,
    updateCurrentView,
    deletePreset: presetHook.deletePreset,
    duplicatePreset: presetHook.duplicatePreset,
    resetToDefaults,
    // Export helpers
    excelFieldDefs,
    pdfFieldDefs,
    companyName: company?.name || "GO-ADS 360°",
    themeColor: company?.theme_color,
    // Loading
    loading: catalog.loading || presetHook.loading,
  };
}
