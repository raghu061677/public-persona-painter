import { useState } from "react";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Bookmark, ChevronDown, Copy, Star, Trash2, Edit, Save } from "lucide-react";
import type { ListViewPreset } from "@/hooks/useListViewPreset";

interface SavedViewsManagerProps {
  presets: ListViewPreset[];
  activePreset: ListViewPreset | null;
  onSelect: (preset: ListViewPreset) => void;
  onSave: (name: string, isDefault: boolean, isShared: boolean) => Promise<any>;
  onUpdate: () => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onDuplicate: (id: string) => Promise<void>;
}

export function SavedViewsManager({
  presets,
  activePreset,
  onSelect,
  onSave,
  onUpdate,
  onDelete,
  onDuplicate,
}: SavedViewsManagerProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [isShared, setIsShared] = useState(false);

  const handleSave = async () => {
    if (!newName.trim()) return;
    await onSave(newName.trim(), isDefault, isShared);
    setShowSaveDialog(false);
    setNewName("");
    setIsDefault(false);
    setIsShared(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Bookmark className="h-4 w-4" />
            {activePreset ? activePreset.preset_name : "Views"}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {presets.length === 0 && (
            <DropdownMenuItem disabled>No saved views</DropdownMenuItem>
          )}
          {presets.map((p) => (
            <DropdownMenuItem
              key={p.id}
              onClick={() => onSelect(p)}
              className="flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                {p.is_default && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                {p.preset_name}
              </span>
              <div className="flex gap-1">
                {p.is_shared && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                    Shared
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate(p.id);
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(p.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          {activePreset && (
            <DropdownMenuItem onClick={onUpdate} className="gap-2">
              <Save className="h-4 w-4" />
              Update Current View
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setShowSaveDialog(true)} className="gap-2">
            <Edit className="h-4 w-4" />
            Save as New View
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save View</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="View name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={isDefault} onCheckedChange={(v) => setIsDefault(v === true)} />
                Set as default view
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={isShared} onCheckedChange={(v) => setIsShared(v === true)} />
                Share with team
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!newName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
