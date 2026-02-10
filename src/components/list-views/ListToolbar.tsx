import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Columns, RotateCcw, Download } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SavedViewsManager } from "./SavedViewsManager";
import { ColumnChooserDialog } from "./ColumnChooserDialog";
import type { FieldCatalogEntry } from "@/hooks/useFieldCatalog";
import type { ListViewPreset } from "@/hooks/useListViewPreset";

interface ListToolbarProps {
  // Search
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchPlaceholder?: string;

  // Fields / Columns
  fields: FieldCatalogEntry[];
  groups: string[];
  selectedFields: string[];
  defaultFieldKeys: string[];
  onFieldsChange: (fields: string[]) => void;

  // Saved Views
  presets: ListViewPreset[];
  activePreset: ListViewPreset | null;
  onPresetSelect: (preset: ListViewPreset) => void;
  onPresetSave: (name: string, isDefault: boolean, isShared: boolean) => Promise<any>;
  onPresetUpdate: () => Promise<void>;
  onPresetDelete: (id: string) => Promise<void>;
  onPresetDuplicate: (id: string) => Promise<void>;

  // Export
  onExportExcel?: (fields: string[]) => void;
  onExportPdf?: (fields: string[]) => void;

  // Reset
  onReset: () => void;

  // Extra actions (filters button, etc.)
  extraActions?: React.ReactNode;
}

export function ListToolbar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search...",
  fields,
  groups,
  selectedFields,
  defaultFieldKeys,
  onFieldsChange,
  presets,
  activePreset,
  onPresetSelect,
  onPresetSave,
  onPresetUpdate,
  onPresetDelete,
  onPresetDuplicate,
  onExportExcel,
  onExportPdf,
  onReset,
  extraActions,
}: ListToolbarProps) {
  const [showColumns, setShowColumns] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => onSearchChange(localSearch), 300);
    return () => clearTimeout(t);
  }, [localSearch, onSearchChange]);

  // Sync external changes
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-card border rounded-lg mb-4">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-[320px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-9 h-9"
        />
      </div>

      {/* Extra actions (filters etc.) */}
      {extraActions}

      {/* Saved Views */}
      <SavedViewsManager
        presets={presets}
        activePreset={activePreset}
        onSelect={onPresetSelect}
        onSave={onPresetSave}
        onUpdate={onPresetUpdate}
        onDelete={onPresetDelete}
        onDuplicate={onPresetDuplicate}
      />

      {/* Columns */}
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowColumns(true)}>
        <Columns className="h-4 w-4" />
        Columns
      </Button>

      {/* Export */}
      {(onExportExcel || onExportPdf) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {onExportExcel && (
              <DropdownMenuItem onClick={() => setShowColumns(true)}>
                Custom Fields Excel
              </DropdownMenuItem>
            )}
            {onExportPdf && (
              <DropdownMenuItem onClick={() => setShowColumns(true)}>
                Custom Fields PDF
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Reset */}
      <Button variant="ghost" size="sm" onClick={onReset} className="gap-2">
        <RotateCcw className="h-4 w-4" />
        Reset
      </Button>

      {/* Column Chooser Dialog */}
      <ColumnChooserDialog
        open={showColumns}
        onClose={() => setShowColumns(false)}
        fields={fields}
        groups={groups}
        selectedFields={selectedFields}
        defaultFieldKeys={defaultFieldKeys}
        onApply={onFieldsChange}
        onExportExcel={onExportExcel}
        onExportPdf={onExportPdf}
      />
    </div>
  );
}
