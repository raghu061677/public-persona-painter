import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { FileSpreadsheet, CheckSquare, RotateCcw, Loader2 } from "lucide-react";
import {
  ALL_PAYABLE_EXPORT_FIELDS,
  DEFAULT_PAYABLE_CUSTOM_FIELDS,
  PAYABLE_FIELD_GROUPS,
  generateCustomPayablesExcel,
} from "@/lib/reports/generateCustomPayablesExcel";
import { useToast } from "@/hooks/use-toast";

interface PayablesCustomExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: any[];
  month: string;
  companyName?: string;
}

export function PayablesCustomExportDialog({
  open, onOpenChange, rows, month, companyName,
}: PayablesCustomExportDialogProps) {
  const { toast } = useToast();
  const [selectedFields, setSelectedFields] = useState<string[]>([...DEFAULT_PAYABLE_CUSTOM_FIELDS]);
  const [exporting, setExporting] = useState(false);

  const toggleField = (key: string) => {
    setSelectedFields((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleGroup = (group: string) => {
    const groupKeys = ALL_PAYABLE_EXPORT_FIELDS.filter((f) => f.group === group).map((f) => f.key);
    const allSelected = groupKeys.every((k) => selectedFields.includes(k));
    if (allSelected) {
      setSelectedFields((prev) => prev.filter((k) => !groupKeys.includes(k)));
    } else {
      setSelectedFields((prev) => [...new Set([...prev, ...groupKeys])]);
    }
  };

  const isGroupAllSelected = (group: string) => {
    const groupKeys = ALL_PAYABLE_EXPORT_FIELDS.filter((f) => f.group === group).map((f) => f.key);
    return groupKeys.every((k) => selectedFields.includes(k));
  };

  const selectAll = () => setSelectedFields(ALL_PAYABLE_EXPORT_FIELDS.map((f) => f.key));
  const resetToDefault = () => setSelectedFields([...DEFAULT_PAYABLE_CUSTOM_FIELDS]);

  const handleExport = async () => {
    if (selectedFields.length === 0) {
      toast({ title: "No Fields", description: "Select at least one field to export", variant: "destructive" });
      return;
    }
    setExporting(true);
    try {
      await generateCustomPayablesExcel(rows, selectedFields, month, companyName);
      toast({ title: "Export Complete", description: `Excel exported with ${selectedFields.length} columns` });
      onOpenChange(false);
    } catch (err) {
      console.error("Custom export error:", err);
      toast({ title: "Export Failed", description: "Could not generate Excel", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Custom Fields Export
          </DialogTitle>
          <DialogDescription>
            Select fields to include in the export. {rows.length} payable entries will be exported.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-2">
          <Button variant="outline" size="sm" onClick={selectAll} className="gap-1.5 text-xs">
            <CheckSquare className="h-3.5 w-3.5" /> Select All
          </Button>
          <Button variant="outline" size="sm" onClick={resetToDefault} className="gap-1.5 text-xs">
            <RotateCcw className="h-3.5 w-3.5" /> Default
          </Button>
          <Badge variant="secondary" className="ml-auto">
            {selectedFields.length} / {ALL_PAYABLE_EXPORT_FIELDS.length} fields
          </Badge>
        </div>

        <ScrollArea className="h-[360px] pr-4">
          <div className="space-y-4">
            {PAYABLE_FIELD_GROUPS.map((group) => {
              const groupFields = ALL_PAYABLE_EXPORT_FIELDS.filter((f) => f.group === group);
              return (
                <div key={group}>
                  <div className="flex items-center gap-2 mb-2">
                    <Checkbox
                      checked={isGroupAllSelected(group)}
                      onCheckedChange={() => toggleGroup(group)}
                    />
                    <span className="text-sm font-semibold text-foreground">{group}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {groupFields.filter((f) => selectedFields.includes(f.key)).length}/{groupFields.length}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pl-6">
                    {groupFields.map((field) => (
                      <div key={field.key} className="flex items-center gap-2">
                        <Checkbox
                          id={`payable-field-${field.key}`}
                          checked={selectedFields.includes(field.key)}
                          onCheckedChange={() => toggleField(field.key)}
                        />
                        <label htmlFor={`payable-field-${field.key}`} className="text-sm cursor-pointer select-none">
                          {field.label}
                        </label>
                      </div>
                    ))}
                  </div>
                  <Separator className="mt-3" />
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleExport}
            disabled={exporting || selectedFields.length === 0}
            className="gap-2"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            {exporting ? "Exporting..." : "Export Excel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
