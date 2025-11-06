import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookmarkPlus, Bookmark, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface FilterPreset {
  id: string;
  name: string;
  filters: Record<string, string>;
  createdAt: string;
}

interface FilterPresetsProps {
  tableKey: string;
  currentFilters: Record<string, string>;
  onApplyPreset: (filters: Record<string, string>) => void;
}

export function FilterPresets({
  tableKey,
  currentFilters,
  onApplyPreset,
}: FilterPresetsProps) {
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState("");

  const storageKey = `filter-presets-${tableKey}`;

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        setPresets(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse filter presets", e);
      }
    }
  }, [storageKey]);

  const savePresets = (newPresets: FilterPreset[]) => {
    localStorage.setItem(storageKey, JSON.stringify(newPresets));
    setPresets(newPresets);
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a preset name",
        variant: "destructive",
      });
      return;
    }

    const hasActiveFilters = Object.values(currentFilters).some(v => v !== "");
    if (!hasActiveFilters) {
      toast({
        title: "Error",
        description: "Please set some filters before saving",
        variant: "destructive",
      });
      return;
    }

    const newPreset: FilterPreset = {
      id: Date.now().toString(),
      name: presetName.trim(),
      filters: { ...currentFilters },
      createdAt: new Date().toISOString(),
    };

    savePresets([...presets, newPreset]);
    setPresetName("");
    setIsSaveDialogOpen(false);

    toast({
      title: "Success",
      description: `Preset "${newPreset.name}" saved`,
    });
  };

  const handleApplyPreset = (preset: FilterPreset) => {
    onApplyPreset(preset.filters);
    setIsOpen(false);
    toast({
      title: "Preset Applied",
      description: `Loaded filters from "${preset.name}"`,
    });
  };

  const handleDeletePreset = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newPresets = presets.filter(p => p.id !== id);
    savePresets(newPresets);
    toast({
      title: "Preset Deleted",
      description: `"${name}" has been removed`,
    });
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsSaveDialogOpen(true)}
          className="gap-2"
        >
          <BookmarkPlus className="h-4 w-4" />
          Save Filters
        </Button>

        {presets.length > 0 && (
          <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Bookmark className="h-4 w-4" />
                Load Preset ({presets.length})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              {presets.map((preset) => (
                <DropdownMenuItem
                  key={preset.id}
                  className="flex items-center justify-between cursor-pointer"
                  onSelect={() => handleApplyPreset(preset)}
                >
                  <span className="flex-1 truncate">{preset.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 ml-2"
                    onClick={(e) => handleDeletePreset(preset.id, preset.name, e)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Filter Preset</DialogTitle>
            <DialogDescription>
              Give your current filter combination a name for quick access later
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="preset-name">Preset Name</Label>
              <Input
                id="preset-name"
                placeholder="e.g., Available Assets in Hyderabad"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSavePreset()}
              />
            </div>
            <div className="space-y-2">
              <Label>Active Filters:</Label>
              <div className="text-sm text-muted-foreground space-y-1">
                {Object.entries(currentFilters)
                  .filter(([, value]) => value !== "")
                  .map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <span className="font-medium capitalize">{key}:</span>
                      <span>{value}</span>
                    </div>
                  ))}
                {Object.values(currentFilters).every(v => v === "") && (
                  <p className="text-destructive">No active filters</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePreset}>Save Preset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
