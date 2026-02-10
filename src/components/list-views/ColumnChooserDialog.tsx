import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileSpreadsheet, FileText } from "lucide-react";
import type { FieldCatalogEntry } from "@/hooks/useFieldCatalog";

interface ColumnChooserDialogProps {
  open: boolean;
  onClose: () => void;
  fields: FieldCatalogEntry[];
  groups: string[];
  selectedFields: string[];
  defaultFieldKeys: string[];
  onApply: (fields: string[]) => void;
  onExportExcel?: (fields: string[]) => void;
  onExportPdf?: (fields: string[]) => void;
}

export function ColumnChooserDialog({
  open,
  onClose,
  fields,
  groups,
  selectedFields,
  defaultFieldKeys,
  onApply,
  onExportExcel,
  onExportPdf,
}: ColumnChooserDialogProps) {
  const [selected, setSelected] = useState<string[]>(selectedFields);

  const toggleField = (key: string) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const selectAll = () => setSelected(fields.map((f) => f.field_key));
  const resetDefaults = () => setSelected(defaultFieldKeys);

  const handleApply = () => {
    onApply(selected);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Custom Fields</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-3">
          <Button variant="outline" size="sm" onClick={selectAll}>
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={resetDefaults}>
            Reset Defaults
          </Button>
          <Badge variant="secondary" className="ml-auto self-center">
            {selected.length} / {fields.length} selected
          </Badge>
        </div>

        <ScrollArea className="max-h-[400px] pr-2">
          {groups.map((group) => {
            const groupFields = fields.filter((f) => f.group_name === group);
            return (
              <div key={group} className="mb-4">
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">{group}</h4>
                <div className="grid grid-cols-2 gap-2">
                  {groupFields.map((f) => (
                    <label
                      key={f.field_key}
                      className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-2 py-1"
                    >
                      <Checkbox
                        checked={selected.includes(f.field_key)}
                        onCheckedChange={() => toggleField(f.field_key)}
                      />
                      {f.label}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {onExportExcel && (
            <Button
              variant="outline"
              onClick={() => {
                onExportExcel(selected);
                onClose();
              }}
              className="gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export Excel
            </Button>
          )}
          {onExportPdf && (
            <Button
              variant="outline"
              onClick={() => {
                onExportPdf(selected);
                onClose();
              }}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              Export PDF
            </Button>
          )}
          <Button onClick={handleApply}>Apply to Table</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
