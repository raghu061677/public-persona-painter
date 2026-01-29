import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GlobalSearchProps {
  data: any[];
  searchableKeys: string[];
  onFilteredData: (filtered: any[]) => void;
  placeholder?: string;
}

export function GlobalSearch({
  data,
  searchableKeys,
  onFilteredData,
  placeholder = "Search across all columns...",
}: GlobalSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const onFilteredDataRef = useRef(onFilteredData);
  
  // Keep ref updated
  useEffect(() => {
    onFilteredDataRef.current = onFilteredData;
  }, [onFilteredData]);

  // Calculate filtered data without calling callback in useMemo
  const { filteredData, matchCount } = useMemo(() => {
    if (!searchTerm.trim()) {
      return { filteredData: data, matchCount: 0 };
    }

    const term = searchTerm.toLowerCase();
    const filtered = data.filter((item) => {
      return searchableKeys.some((key) => {
        const value = item[key];
        if (value == null) return false;
        return String(value).toLowerCase().includes(term);
      });
    });

    return { filteredData: filtered, matchCount: filtered.length };
  }, [data, searchTerm, searchableKeys]);

  // Call the callback in useEffect to avoid infinite loop
  useEffect(() => {
    onFilteredDataRef.current(filteredData);
  }, [filteredData]);

  const handleClear = useCallback(() => {
    setSearchTerm("");
  }, []);

  return (
    <div className="space-y-2">
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={handleClear}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {searchTerm && (
          <Badge variant="secondary" className="whitespace-nowrap">
            {matchCount} match{matchCount !== 1 ? "es" : ""}
          </Badge>
        )}
      </div>
      {searchTerm && (
        <p className="text-xs text-muted-foreground">
          Searching in: {searchableKeys.join(", ")}
        </p>
      )}
    </div>
  );
}

// Utility to highlight matching text
export function highlightText(text: string, searchTerm: string): React.ReactNode {
  if (!searchTerm.trim()) return text;

  const regex = new RegExp(`(${searchTerm})`, "gi");
  const parts = String(text).split(regex);

  return parts.map((part, index) =>
    regex.test(part) ? (
      <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">
        {part}
      </mark>
    ) : (
      part
    )
  );
}
