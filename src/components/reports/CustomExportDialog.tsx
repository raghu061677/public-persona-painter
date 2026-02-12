import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { FileSpreadsheet, Presentation, CheckSquare, RotateCcw, Loader2 } from "lucide-react";
import {
  ALL_EXPORT_FIELDS,
  DEFAULT_CUSTOM_FIELDS,
  FIELD_GROUPS,
  generateCustomAvailabilityExcel,
} from "@/lib/reports/generateCustomAvailabilityExcel";
import { generateCustomAvailabilityPpt } from "@/lib/reports/generateCustomAvailabilityPpt";
import { useToast } from "@/hooks/use-toast";

interface CustomExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: any[];
  startDate: string;
  endDate: string;
  companyName?: string;
  themeColor?: string;
}

export function CustomExportDialog({
  open,
  onOpenChange,
  rows,
  startDate,
  endDate,
  companyName,
  themeColor,
}: CustomExportDialogProps) {
  const { toast } = useToast();
  const [selectedFields, setSelectedFields] = useState<string[]>([...DEFAULT_CUSTOM_FIELDS]);
  const [exporting, setExporting] = useState<"excel" | "ppt" | null>(null);

  const toggleField = (key: string) => {
    setSelectedFields(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleGroup = (group: string) => {
    const groupKeys = ALL_EXPORT_FIELDS.filter(f => f.group === group).map(f => f.key);
    const allSelected = groupKeys.every(k => selectedFields.includes(k));
    if (allSelected) {
      setSelectedFields(prev => prev.filter(k => !groupKeys.includes(k)));
    } else {
      setSelectedFields(prev => [...new Set([...prev, ...groupKeys])]);
    }
  };

  const isGroupAllSelected = (group: string) => {
    const groupKeys = ALL_EXPORT_FIELDS.filter(f => f.group === group).map(f => f.key);
    return groupKeys.every(k => selectedFields.includes(k));
  };

  const isGroupPartial = (group: string) => {
    const groupKeys = ALL_EXPORT_FIELDS.filter(f => f.group === group).map(f => f.key);
    const count = groupKeys.filter(k => selectedFields.includes(k)).length;
    return count > 0 && count < groupKeys.length;
  };

  const selectAll = () => setSelectedFields(ALL_EXPORT_FIELDS.map(f => f.key));
  const resetToDefault = () => setSelectedFields([...DEFAULT_CUSTOM_FIELDS]);

  const handleExport = async (type: "excel" | "ppt") => {
    if (selectedFields.length === 0) {
      toast({ title: "No Fields", description: "Select at least one field to export", variant: "destructive" });
      return;
    }
    setExporting(type);
    try {
      if (type === "excel") {
        await generateCustomAvailabilityExcel(rows, selectedFields, startDate, endDate, companyName);
      } else {
        await generateCustomAvailabilityPpt(rows, selectedFields, startDate, endDate, companyName, themeColor);
      }
      toast({
        title: "Export Complete",
        description: `${type === "excel" ? "Excel" : "PPT"} exported with ${selectedFields.length} columns`,
      });
      onOpenChange(false);
    } catch (err) {
      console.error("Custom export error:", err);
      toast({ title: "Export Failed", description: `Could not generate ${type.toUpperCase()}`, variant: "destructive" });
    } finally {
      setExporting(null);
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
            Select the fields you want to include in the export. {rows.length} assets will be exported.
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
            {selectedFields.length} / {ALL_EXPORT_FIELDS.length} fields
          </Badge>
        </div>

        <ScrollArea className="h-[360px] pr-4">
          <div className="space-y-4">
            {FIELD_GROUPS.map(group => {
              const groupFields = ALL_EXPORT_FIELDS.filter(f => f.group === group);
              return (
                <div key={group}>
                  <div className="flex items-center gap-2 mb-2">
                    <Checkbox
                      checked={isGroupAllSelected(group)}
                      // @ts-ignore
                      indeterminate={isGroupPartial(group)}
                      onCheckedChange={() => toggleGroup(group)}
                    />
                    <span className="text-sm font-semibold text-foreground">{group}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {groupFields.filter(f => selectedFields.includes(f.key)).length}/{groupFields.length}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pl-6">
                    {groupFields.map(field => (
                      <div key={field.key} className="flex items-center gap-2">
                        <Checkbox
                          id={`field-${field.key}`}
                          checked={selectedFields.includes(field.key)}
                          onCheckedChange={() => toggleField(field.key)}
                        />
                        <label
                          htmlFor={`field-${field.key}`}
                          className="text-sm cursor-pointer select-none"
                        >
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
            variant="outline"
            onClick={() => handleExport("ppt")}
            disabled={!!exporting || selectedFields.length === 0}
            className="gap-2"
          >
            {exporting === "ppt" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Presentation className="h-4 w-4 text-orange-600" />
            )}
            {exporting === "ppt" ? "Exporting..." : "Export PPT"}
          </Button>
          <Button
            onClick={() => handleExport("excel")}
            disabled={!!exporting || selectedFields.length === 0}
            className="gap-2"
          >
            {exporting === "excel" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            {exporting === "excel" ? "Exporting..." : "Export Excel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
