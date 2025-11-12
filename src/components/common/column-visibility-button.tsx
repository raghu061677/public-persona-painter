import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Columns3, RotateCcw, Eye, EyeOff, Check, Search, ChevronDown, ChevronRight, Bookmark } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Column {
  key: string;
  label: string;
  group?: string;
}

interface ColumnGroup {
  name: string;
  columns: Column[];
}

interface ColumnPreset {
  id: string;
  name: string;
  icon?: string;
  columns: string[];
}

interface ColumnVisibilityButtonProps {
  allColumns: Column[];
  visibleKeys: string[];
  onChange: (visibleKeys: string[]) => void;
  onReset: () => void;
  tableKey?: string;
}

const DEFAULT_PRESETS: ColumnPreset[] = [
  {
    id: 'essential',
    name: 'Essential',
    icon: '⭐',
    columns: ['select', 'id', 'images', 'location', 'city', 'media_type', 'status', 'card_rate', 'actions']
  },
  {
    id: 'detailed',
    name: 'Detailed',
    icon: '📋',
    columns: ['select', 'id', 'images', 'media_id', 'location', 'area', 'city', 'district', 'state', 'media_type', 'dimensions', 'total_sqft', 'illumination', 'direction', 'card_rate', 'base_rent', 'gst_percent', 'status', 'ownership', 'actions']
  },
  {
    id: 'financial',
    name: 'Financial',
    icon: '💰',
    columns: ['select', 'id', 'location', 'city', 'media_type', 'dimensions', 'total_sqft', 'card_rate', 'base_rent', 'gst_percent', 'status', 'actions']
  },
  {
    id: 'location',
    name: 'Location Focus',
    icon: '📍',
    columns: ['select', 'id', 'images', 'location', 'area', 'city', 'district', 'state', 'direction', 'latitude', 'longitude', 'status', 'actions']
  }
];

export default function ColumnVisibilityButton({
  allColumns,
  visibleKeys,
  onChange,
  onReset,
  tableKey = 'default',
}: ColumnVisibilityButtonProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['Location', 'Rates', 'Status', 'Dimensions']);
  const [selectedPreset, setSelectedPreset] = useState<string>("");

  // Group columns by category
  const groupedColumns = useMemo(() => {
    const groups: { [key: string]: Column[] } = {
      'Selection & Actions': [],
      'Location': [],
      'Rates & Financial': [],
      'Status & Info': [],
      'Dimensions': [],
      'Other': []
    };

    allColumns.forEach(col => {
      const key = col.key.toLowerCase();
      
      if (key === 'select' || key === 'actions') {
        groups['Selection & Actions'].push(col);
      } else if (key.includes('location') || key.includes('area') || key.includes('city') || 
                 key.includes('district') || key.includes('state') || key.includes('latitude') || 
                 key.includes('longitude') || key.includes('direction')) {
        groups['Location'].push(col);
      } else if (key.includes('rate') || key.includes('rent') || key.includes('gst') || 
                 key.includes('price') || key.includes('cost') || key.includes('amount')) {
        groups['Rates & Financial'].push(col);
      } else if (key.includes('status') || key.includes('id') || key.includes('media_type') || 
                 key.includes('illumination') || key.includes('ownership') || key.includes('public')) {
        groups['Status & Info'].push(col);
      } else if (key.includes('dimension') || key.includes('sqft') || key.includes('size')) {
        groups['Dimensions'].push(col);
      } else {
        groups['Other'].push(col);
      }
    });

    // Remove empty groups
    return Object.entries(groups)
      .filter(([_, cols]) => cols.length > 0)
      .map(([name, columns]) => ({ name, columns }));
  }, [allColumns]);

  // Filter columns based on search
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groupedColumns;

    const query = searchQuery.toLowerCase();
    return groupedColumns
      .map(group => ({
        ...group,
        columns: group.columns.filter(col => 
          col.label.toLowerCase().includes(query) || 
          col.key.toLowerCase().includes(query)
        )
      }))
      .filter(group => group.columns.length > 0);
  }, [groupedColumns, searchQuery]);

  const handleToggle = (key: string) => {
    if (visibleKeys.includes(key)) {
      onChange(visibleKeys.filter((k) => k !== key));
    } else {
      onChange([...visibleKeys, key]);
    }
    setSelectedPreset(""); // Clear preset when manually toggling
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupName) 
        ? prev.filter(g => g !== groupName)
        : [...prev, groupName]
    );
  };

  const selectAll = () => {
    onChange(allColumns.map(c => c.key));
    setSelectedPreset("");
  };

  const deselectAll = () => {
    onChange(allColumns.filter(c => c.key === 'select' || c.key === 'actions').map(c => c.key));
    setSelectedPreset("");
  };

  const applyPreset = (presetId: string) => {
    const preset = DEFAULT_PRESETS.find(p => p.id === presetId);
    if (preset) {
      // Filter to only include columns that exist in allColumns
      const availableColumns = preset.columns.filter(key => 
        allColumns.some(col => col.key === key)
      );
      onChange(availableColumns);
      setSelectedPreset(presetId);
    }
  };

  const toggleGroupColumns = (group: ColumnGroup, allVisible: boolean) => {
    const groupKeys = group.columns.map(c => c.key);
    if (allVisible) {
      // Hide all group columns
      onChange(visibleKeys.filter(k => !groupKeys.includes(k)));
    } else {
      // Show all group columns
      const newKeys = [...new Set([...visibleKeys, ...groupKeys])];
      onChange(newKeys);
    }
    setSelectedPreset("");
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 hover:bg-accent">
          <Columns3 className="h-4 w-4" />
          <span className="hidden sm:inline">Columns</span>
          <Badge variant="secondary" className="ml-1 px-1.5 py-0 h-5">
            {visibleKeys.length}/{allColumns.length}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-popover z-50 p-0" align="end">
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

          {/* Presets */}
          <div className="p-3 bg-background border-b">
            <div className="flex items-center gap-2 mb-2">
              <Bookmark className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Quick Presets</span>
            </div>
            <Select value={selectedPreset} onValueChange={applyPreset}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select a preset..." />
              </SelectTrigger>
              <SelectContent className="bg-popover z-[100]">
                {DEFAULT_PRESETS.map(preset => (
                  <SelectItem key={preset.id} value={preset.id} className="text-xs">
                    <span className="mr-2">{preset.icon}</span>
                    {preset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search */}
          <div className="p-3 bg-background border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search columns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="p-3 bg-background border-b">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-7 text-xs"
                onClick={selectAll}
              >
                <Eye className="h-3 w-3 mr-1.5" />
                All
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-7 text-xs"
                onClick={deselectAll}
              >
                <EyeOff className="h-3 w-3 mr-1.5" />
                None
              </Button>
            </div>
          </div>
          
          {/* Grouped Column List */}
          <div className="p-3">
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredGroups.map((group, groupIndex) => {
                const isExpanded = expandedGroups.includes(group.name);
                const visibleInGroup = group.columns.filter(col => visibleKeys.includes(col.key)).length;
                const allVisible = visibleInGroup === group.columns.length;
                
                return (
                  <div key={group.name}>
                    {groupIndex > 0 && <Separator className="my-2" />}
                    <Collapsible open={isExpanded} onOpenChange={() => toggleGroup(group.name)}>
                      <div className="flex items-center justify-between py-1.5 px-2 hover:bg-accent/50 rounded-md group">
                        <CollapsibleTrigger className="flex items-center gap-2 flex-1 text-left">
                          {isExpanded ? (
                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span className="text-xs font-semibold text-foreground/80">
                            {group.name}
                          </span>
                          <Badge variant="outline" className="ml-auto px-1.5 py-0 h-4 text-[10px]">
                            {visibleInGroup}/{group.columns.length}
                          </Badge>
                        </CollapsibleTrigger>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleGroupColumns(group, allVisible);
                          }}
                        >
                          {allVisible ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      <CollapsibleContent className="space-y-0.5 mt-1 animate-accordion-down">
                        {group.columns.map((column) => {
                          const isVisible = visibleKeys.includes(column.key);
                          return (
                            <div 
                              key={column.key}
                              className="flex items-center space-x-3 py-1.5 pl-8 pr-3 hover:bg-accent/50 rounded-md cursor-pointer transition-colors group"
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
                                className="text-xs font-normal cursor-pointer flex-1 leading-none select-none"
                              >
                                {column.label}
                              </label>
                              {isVisible && (
                                <Check className="h-3 w-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                            </div>
                          );
                        })}
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                );
              })}
              
              {filteredGroups.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No columns found matching "{searchQuery}"
                </div>
              )}
            </div>
          </div>
          
          {/* Footer */}
          <div className="p-3 pt-2 border-t bg-muted/30">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Eye className="h-3 w-3" />
                <span>Visible</span>
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


