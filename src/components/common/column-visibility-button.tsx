import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Columns3, RotateCcw, Eye, EyeOff, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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

  const selectAll = () => {
    onChange(allColumns.map(c => c.key));
  };

  const deselectAll = () => {
    // Keep select and actions columns
    onChange(allColumns.filter(c => c.key === 'select' || c.key === 'actions').map(c => c.key));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 hover:bg-accent">
          <Columns3 className="h-4 w-4" />
          <span className="hidden sm:inline">Toggle Columns</span>
          <Badge variant="secondary" className="ml-1 px-1.5 py-0 h-5">
            {visibleKeys.length}/{allColumns.length}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 bg-popover z-50 p-0" align="end">
        <div className="space-y-0">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-muted/50">
            <div className="flex items-center gap-2">
              <Columns3 className="h-4 w-4 text-primary" />
              <h4 className="font-semibold text-sm">Column Visibility</h4>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-7 px-2 text-xs hover:bg-background"
              title="Reset to Default"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          </div>
          
          {/* Quick Actions */}
          <div className="p-3 bg-background border-b">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8 text-xs"
                onClick={selectAll}
              >
                <Eye className="h-3 w-3 mr-1.5" />
                Show All
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8 text-xs"
                onClick={deselectAll}
              >
                <EyeOff className="h-3 w-3 mr-1.5" />
                Hide All
              </Button>
            </div>
          </div>
          
          {/* Column List */}
          <div className="p-3">
            <div className="space-y-0.5 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
              {allColumns.map((column, index) => {
                const isVisible = visibleKeys.includes(column.key);
                return (
                  <div key={column.key}>
                    {index > 0 && index % 5 === 0 && (
                      <Separator className="my-2" />
                    )}
                    <div 
                      className="flex items-center space-x-3 py-2 px-3 hover:bg-accent/50 rounded-md cursor-pointer transition-colors group"
                      onClick={() => handleToggle(column.key)}
                    >
                      <Checkbox
                        id={`col-${column.key}`}
                        checked={isVisible}
                        onCheckedChange={() => handleToggle(column.key)}
                        className="data-[state=checked]:bg-primary"
                      />
                      <label
                        htmlFor={`col-${column.key}`}
                        className="text-sm font-normal cursor-pointer flex-1 leading-none select-none"
                      >
                        {column.label}
                      </label>
                      {isVisible && (
                        <Check className="h-3 w-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Footer */}
          <div className="p-3 pt-2 border-t bg-muted/30">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Eye className="h-3 w-3" />
                <span>Visible Columns</span>
              </div>
              <Badge variant="outline" className="font-mono">
                {visibleKeys.length} / {allColumns.length}
              </Badge>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

