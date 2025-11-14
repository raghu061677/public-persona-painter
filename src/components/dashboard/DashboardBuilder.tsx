import { useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { 
  GripVertical, 
  Trash2, 
  Copy, 
  Settings, 
  Save, 
  Download, 
  Upload,
  RotateCcw,
  Edit,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useDashboardBuilder, DashboardWidget } from "@/hooks/use-dashboard-builder";
import { WidgetLibrary, WIDGET_TYPES, WidgetType } from "./WidgetLibrary";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const GRID_COLS = 12;
const ROW_HEIGHT = 80;

interface WidgetRendererProps {
  widget: DashboardWidget;
  isEditing: boolean;
  onRemove: () => void;
  onDuplicate: () => void;
  onMove: (x: number, y: number) => void;
}

function WidgetRenderer({ widget, isEditing, onRemove, onDuplicate, onMove }: WidgetRendererProps) {
  const [{ isDragging }, drag, preview] = useDrag(() => ({
    type: 'widget',
    item: { id: widget.id, x: widget.x, y: widget.y },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: isEditing,
  }), [widget, isEditing]);

  const widgetType = WIDGET_TYPES.find(t => t.type === widget.type);
  const Icon = widgetType?.icon;

  return (
    <div
      ref={preview}
      style={{
        gridColumn: `span ${widget.width}`,
        gridRow: `span ${widget.height}`,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="relative"
    >
      <Card className="h-full">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
              <h3 className="font-semibold text-sm truncate">{widget.title}</h3>
            </div>
            {isEditing && (
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  ref={drag}
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 cursor-move"
                >
                  <GripVertical className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={onDuplicate}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={onRemove}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="flex items-center justify-center h-full min-h-[100px] text-sm text-muted-foreground">
            {widget.type === 'stat-card' && <StatCardWidget />}
            {widget.type === 'revenue-chart' && <ChartPlaceholder />}
            {widget.type === 'client-list' && <ListPlaceholder title="Clients" />}
            {widget.type === 'campaign-status' && <ChartPlaceholder />}
            {widget.type === 'invoice-summary' && <StatCardWidget />}
            {widget.type === 'asset-map' && <MapPlaceholder />}
            {widget.type === 'calendar-view' && <CalendarPlaceholder />}
            {widget.type === 'pie-chart' && <ChartPlaceholder />}
            {widget.type === 'activity-feed' && <ListPlaceholder title="Activities" />}
            {widget.type === 'data-table' && <TablePlaceholder />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCardWidget() {
  return (
    <div className="text-center">
      <p className="text-3xl font-bold">1,234</p>
      <p className="text-xs text-muted-foreground">Sample Metric</p>
    </div>
  );
}

function ChartPlaceholder() {
  return <div className="w-full h-full flex items-center justify-center bg-muted/50 rounded">Chart Widget</div>;
}

function ListPlaceholder({ title }: { title: string }) {
  return (
    <div className="w-full space-y-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
          <div className="h-8 w-8 rounded-full bg-muted" />
          <div className="flex-1 space-y-1">
            <div className="h-3 bg-muted rounded w-3/4" />
            <div className="h-2 bg-muted rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function MapPlaceholder() {
  return <div className="w-full h-full flex items-center justify-center bg-muted/50 rounded">Map Widget</div>;
}

function CalendarPlaceholder() {
  return <div className="w-full h-full flex items-center justify-center bg-muted/50 rounded">Calendar Widget</div>;
}

function TablePlaceholder() {
  return <div className="w-full h-full flex items-center justify-center bg-muted/50 rounded">Table Widget</div>;
}

interface DashboardBuilderProps {
  layoutId?: string;
}

export function DashboardBuilder({ layoutId = 'default' }: DashboardBuilderProps) {
  const {
    layout,
    widgets,
    isEditing,
    setIsEditing,
    isReady,
    addWidget,
    removeWidget,
    moveWidget,
    duplicateWidget,
    saveLayout,
    resetLayout,
    exportLayout,
    importLayout,
  } = useDashboardBuilder(layoutId);

  const [showResetDialog, setShowResetDialog] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [layoutName, setLayoutName] = useState(layout.name);

  const handleAddWidget = (widgetType: WidgetType) => {
    addWidget({
      type: widgetType.type,
      title: widgetType.title,
      width: widgetType.defaultWidth,
      height: widgetType.defaultHeight,
    });
    toast({
      title: "Widget added",
      description: `${widgetType.title} has been added to your dashboard`,
    });
  };

  const handleSave = () => {
    if (editingName && layoutName !== layout.name) {
      saveLayout(layoutName);
      setEditingName(false);
    } else {
      saveLayout();
    }
    toast({
      title: "Dashboard saved",
      description: "Your dashboard layout has been saved successfully",
    });
  };

  const handleReset = () => {
    resetLayout();
    setShowResetDialog(false);
    toast({
      title: "Dashboard reset",
      description: "Your dashboard has been reset to default",
    });
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        importLayout(file);
        toast({
          title: "Dashboard imported",
          description: "Your dashboard layout has been imported",
        });
      }
    };
    input.click();
  };

  if (!isReady) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col lg:flex-row gap-6 h-full">
        {/* Main Dashboard Area */}
        <div className="flex-1 space-y-4 min-w-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={layoutName}
                    onChange={(e) => setLayoutName(e.target.value)}
                    className="h-9 w-64"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setLayoutName(layout.name);
                      setEditingName(false);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold">{layout.name}</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingName(true)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Badge variant={isEditing ? "default" : "secondary"}>
                {isEditing ? 'Editing' : 'Viewing'}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" size="sm" onClick={handleImport}>
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportLayout}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowResetDialog(true)}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                  <Button onClick={handleSave}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Dashboard
                </Button>
              )}
            </div>
          </div>

          {/* Grid */}
          <div
            className="grid gap-4 auto-rows-[80px]"
            style={{
              gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
            }}
          >
            {widgets.map(widget => (
              <WidgetRenderer
                key={widget.id}
                widget={widget}
                isEditing={isEditing}
                onRemove={() => removeWidget(widget.id)}
                onDuplicate={() => duplicateWidget(widget.id)}
                onMove={(x, y) => moveWidget(widget.id, x, y)}
              />
            ))}
          </div>

          {widgets.length === 0 && (
            <Card className="p-12">
              <div className="text-center space-y-4">
                <p className="text-lg text-muted-foreground">
                  Your dashboard is empty
                </p>
                <p className="text-sm text-muted-foreground">
                  {isEditing 
                    ? "Add widgets from the library to get started"
                    : "Click 'Edit Dashboard' to customize your layout"}
                </p>
              </div>
            </Card>
          )}
        </div>

        {/* Widget Library Sidebar */}
        {isEditing && (
          <div className="w-full lg:w-80 shrink-0">
            <WidgetLibrary onAddWidget={handleAddWidget} />
          </div>
        )}
      </div>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Dashboard?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all widgets and reset your dashboard to default. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>Reset</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DndProvider>
  );
}
