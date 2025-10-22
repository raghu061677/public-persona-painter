import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Columns3, RotateCcw } from "lucide-react";

interface Column {
  key: string;
  label: string;
}

interface ColumnVisibilityButtonProps {
  allColumns: Column[];
  visibleKeys: string[];
  onChange: (visibleKeys: string[]) => void;
  onReset: () => void;
}

export default function ColumnVisibilityButton({
  allColumns,
  visibleKeys,
  onChange,
  onReset,
}: ColumnVisibilityButtonProps) {
  const handleToggle = (key: string) => {
    if (visibleKeys.includes(key)) {
      onChange(visibleKeys.filter((k) => k !== key));
    } else {
      onChange([...visibleKeys, key]);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Columns3 className="h-4 w-4" />
          Columns ({visibleKeys.length}/{allColumns.length})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 bg-popover z-50" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h4 className="font-semibold text-sm">Toggle Columns</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-7 px-2 text-xs"
              title="Reset to Default"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          </div>
          
          <div className="space-y-2 border-b pb-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 text-xs font-normal"
              onClick={() => onChange(allColumns.map(c => c.key))}
            >
              Select All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 text-xs font-normal"
              onClick={() => onChange(allColumns.filter(c => c.key === 'select' || c.key === 'actions').map(c => c.key))}
            >
              Deselect All
            </Button>
          </div>
          
          <div className="space-y-1 max-h-[350px] overflow-y-auto pr-2">
            {allColumns.map((column) => (
              <div 
                key={column.key} 
                className="flex items-center space-x-2 py-1.5 hover:bg-muted/50 rounded px-2 -mx-2 cursor-pointer"
                onClick={() => handleToggle(column.key)}
              >
                <Checkbox
                  id={`col-${column.key}`}
                  checked={visibleKeys.includes(column.key)}
                  onCheckedChange={() => handleToggle(column.key)}
                />
                <label
                  htmlFor={`col-${column.key}`}
                  className="text-sm font-normal cursor-pointer flex-1 leading-none"
                >
                  {column.label}
                </label>
              </div>
            ))}
          </div>
          
          <div className="pt-2 border-t text-xs text-muted-foreground text-center">
            {visibleKeys.length} of {allColumns.length} columns visible
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
