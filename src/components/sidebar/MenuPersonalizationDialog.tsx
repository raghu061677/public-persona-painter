import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { GripVertical, RotateCcw } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { useMenuPreferences } from '@/hooks/useMenuPreferences';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MenuPersonalizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: { title: string }[];
}

export function MenuPersonalizationDialog({ 
  open, 
  onOpenChange, 
  sections 
}: MenuPersonalizationDialogProps) {
  const { preferences, toggleSectionVisibility, reorderSections, resetPreferences } = useMenuPreferences();
  
  // Get ordered sections based on preferences
  const getOrderedSections = () => {
    if (preferences.section_order.length === 0) {
      return sections.map(s => s.title);
    }
    
    const ordered = [...preferences.section_order];
    // Add any new sections that aren't in the saved order
    sections.forEach(s => {
      if (!ordered.includes(s.title)) {
        ordered.push(s.title);
      }
    });
    return ordered;
  };

  const [orderedSections, setOrderedSections] = useState(getOrderedSections());

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(orderedSections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setOrderedSections(items);
    reorderSections(items);
  };

  const handleReset = async () => {
    await resetPreferences();
    setOrderedSections(sections.map(s => s.title));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Customize Menu</DialogTitle>
          <DialogDescription>
            Show/hide sections and reorder them to match your workflow
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Drag to reorder, uncheck to hide
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>

          <ScrollArea className="h-[400px] pr-4">
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="sections">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2"
                  >
                    {orderedSections.map((title, index) => {
                      const isVisible = !preferences.hidden_sections.includes(title);
                      
                      return (
                        <Draggable key={title} draggableId={title} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`flex items-center gap-3 p-3 rounded-lg border bg-card ${
                                snapshot.isDragging ? 'shadow-lg' : ''
                              }`}
                            >
                              <div {...provided.dragHandleProps}>
                                <GripVertical className="h-5 w-5 text-muted-foreground" />
                              </div>
                              
                              <div className="flex items-center gap-3 flex-1">
                                <Checkbox
                                  id={title}
                                  checked={isVisible}
                                  onCheckedChange={() => toggleSectionVisibility(title)}
                                />
                                <Label
                                  htmlFor={title}
                                  className={`cursor-pointer ${
                                    !isVisible ? 'text-muted-foreground line-through' : ''
                                  }`}
                                >
                                  {title}
                                </Label>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
