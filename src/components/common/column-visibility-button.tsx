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
        <Button variant="outline" size="sm">
          <Columns3 className="mr-2 h-4 w-4" />
          Columns
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Toggle Columns</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-8 px-2"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {allColumns.map((column) => (
              <div 
                key={column.key} 
                className="flex items-center space-x-2 py-1 hover:bg-muted/50 rounded px-2 -mx-2"
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
          <div className="pt-3 border-t text-xs text-muted-foreground">
            {visibleKeys.length} of {allColumns.length} columns visible
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
