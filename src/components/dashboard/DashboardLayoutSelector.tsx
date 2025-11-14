import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LayoutGrid, Columns2, Columns3, Grid2x2, Grid3x3 } from "lucide-react";

interface DashboardLayoutSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectLayout: (layout: string) => void;
}

const LAYOUTS = [
  { id: '1-col', label: '1 Column', icon: LayoutGrid, description: 'Full width widgets' },
  { id: '2-col', label: '2 Columns', icon: Columns2, description: 'Two column layout' },
  { id: '3-col', label: '3 Columns', icon: Columns3, description: 'Three column layout' },
  { id: '2x2-grid', label: '2x2 Grid', icon: Grid2x2, description: 'Equal 2x2 grid' },
  { id: '3x3-grid', label: '3x3 Grid', icon: Grid3x3, description: 'Equal 3x3 grid' },
];

export function DashboardLayoutSelector({ open, onOpenChange, onSelectLayout }: DashboardLayoutSelectorProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Select Dashboard Layout</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 py-4">
          {LAYOUTS.map(layout => (
            <Button
              key={layout.id}
              variant="outline"
              className="h-auto p-6 flex flex-col items-center gap-3"
              onClick={() => onSelectLayout(layout.id)}
            >
              <layout.icon className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <div className="font-medium">{layout.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{layout.description}</div>
              </div>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
