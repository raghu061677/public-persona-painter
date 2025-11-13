import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

interface MultiSelectFilterProps {
  label?: string;
  options: string[];
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

export function MultiSelectFilter({
  label,
  options,
  value,
  onChange,
  placeholder = "Select options...",
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (option: string) => {
    const newValue = value.includes(option)
      ? value.filter((v) => v !== option)
      : [...value, option];
    onChange(newValue);
  };

  const handleClear = () => {
    onChange([]);
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-9 justify-between text-sm"
          >
            <div className="flex gap-1 flex-wrap">
              {value.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : (
                <>
                  {value.length <= 2 ? (
                    value.map((v) => (
                      <Badge
                        key={v}
                        variant="secondary"
                        className="mr-1 text-xs px-1.5 py-0"
                      >
                        {v}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                      {value.length} selected
                    </Badge>
                  )}
                </>
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0 bg-popover" align="start">
          <Command>
            <CommandInput placeholder={`Search ${label?.toLowerCase() || "options"}...`} />
            <CommandEmpty>No options found.</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => handleSelect(option)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value.includes(option) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
          {value.length > 0 && (
            <div className="p-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full gap-2 h-8 text-xs"
                onClick={handleClear}
              >
                <X className="h-3 w-3" />
                Clear All
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
