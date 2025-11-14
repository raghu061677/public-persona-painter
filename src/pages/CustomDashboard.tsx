import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { SectionHeader } from "@/components/ui/section-header";
import { Plus, Settings, Trash2, Save, Layout } from "lucide-react";
import { toast } from "sonner";
import { DashboardWidget } from "@/components/dashboard/DashboardWidget";
import { WidgetConfigDialog } from "@/components/dashboard/WidgetConfigDialog";
import { DashboardLayoutSelector } from "@/components/dashboard/DashboardLayoutSelector";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";

interface Widget {
  id: string;
  type: string;
  metric: string;
  timeRange: string;
  visualizationType: string;
  title: string;
  config: any;
}

interface DashboardConfig {
  id: string;
  name: string;
  is_default: boolean;
  layout: Widget[];
}

export default function CustomDashboard() {
  const [loading, setLoading] = useState(true);
  const [dashboards, setDashboards] = useState<DashboardConfig[]>([]);
  const [currentDashboard, setCurrentDashboard] = useState<DashboardConfig | null>(null);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [showWidgetConfig, setShowWidgetConfig] = useState(false);
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null);
  const [showLayoutSelector, setShowLayoutSelector] = useState(false);

  useEffect(() => {
    fetchDashboards();
  }, []);

  const fetchDashboards = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('dashboard_configurations' as any)
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false }) as any;

    if (error) {
      toast.error('Failed to load dashboards');
      console.error(error);
      return;
    }

    setDashboards(data || []);
    
    // Load default or first dashboard
    const defaultDashboard = data?.find((d: any) => d.is_default) || data?.[0];
    if (defaultDashboard) {
      setCurrentDashboard(defaultDashboard);
      setWidgets(defaultDashboard.layout || []);
    }
    
    setLoading(false);
  };

  const handleAddWidget = () => {
    setEditingWidget(null);
    setShowWidgetConfig(true);
  };

  const handleEditWidget = (widget: Widget) => {
    setEditingWidget(widget);
    setShowWidgetConfig(true);
  };

  const handleSaveWidget = (widget: Widget) => {
    if (editingWidget) {
      // Update existing widget
      setWidgets(prev => prev.map(w => w.id === widget.id ? widget : w));
    } else {
      // Add new widget
      setWidgets(prev => [...prev, { ...widget, id: `widget-${Date.now()}` }]);
    }
    setShowWidgetConfig(false);
    setEditingWidget(null);
  };

  const handleDeleteWidget = (widgetId: string) => {
    setWidgets(prev => prev.filter(w => w.id !== widgetId));
    toast.success('Widget removed');
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(widgets);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setWidgets(items);
  };

  const handleSaveDashboard = async () => {
    if (!currentDashboard) {
      toast.error('No dashboard selected');
      return;
    }

    const { error } = await supabase
      .from('dashboard_configurations' as any)
      .update({ layout: widgets })
      .eq('id', currentDashboard.id) as any;

    if (error) {
      toast.error('Failed to save dashboard');
      console.error(error);
      return;
    }

    toast.success('Dashboard saved successfully');
  };

  const handleCreateDashboard = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: companyData } = await supabase
      .from('company_users' as any)
      .select('company_id')
      .eq('user_id', user.id)
      .single() as any;

    const { data, error } = await supabase
      .from('dashboard_configurations' as any)
      .insert({
        user_id: user.id,
        company_id: companyData?.company_id,
        name: `Dashboard ${dashboards.length + 1}`,
        layout: []
      })
      .select()
      .single() as any;

    if (error) {
      toast.error('Failed to create dashboard');
      console.error(error);
      return;
    }

    setDashboards(prev => [...prev, data]);
    setCurrentDashboard(data);
    setWidgets([]);
    toast.success('New dashboard created');
  };

  const handleDeleteDashboard = async (dashboardId: string) => {
    const { error } = await supabase
      .from('dashboard_configurations' as any)
      .delete()
      .eq('id', dashboardId) as any;

    if (error) {
      toast.error('Failed to delete dashboard');
      console.error(error);
      return;
    }

    setDashboards(prev => prev.filter(d => d.id !== dashboardId));
    if (currentDashboard?.id === dashboardId) {
      const nextDashboard = dashboards.find(d => d.id !== dashboardId);
      setCurrentDashboard(nextDashboard || null);
      setWidgets(nextDashboard?.layout || []);
    }
    toast.success('Dashboard deleted');
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <SectionHeader title="Custom Dashboard" description="Loading..." />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <SectionHeader 
        title="Custom Dashboard" 
        description="Build your personalized analytics view with customizable widgets"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCreateDashboard}>
              <Plus className="h-4 w-4 mr-2" />
              New Dashboard
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowLayoutSelector(true)}>
              <Layout className="h-4 w-4 mr-2" />
              Layout
            </Button>
            <Button variant="outline" size="sm" onClick={handleAddWidget}>
              <Plus className="h-4 w-4 mr-2" />
              Add Widget
            </Button>
            <Button onClick={handleSaveDashboard} disabled={!widgets.length}>
              <Save className="h-4 w-4 mr-2" />
              Save Dashboard
            </Button>
          </div>
        }
      />

      {/* Dashboard Selector */}
      {dashboards.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {dashboards.map(dashboard => (
            <div key={dashboard.id} className="flex items-center gap-2">
              <Button
                variant={currentDashboard?.id === dashboard.id ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setCurrentDashboard(dashboard);
                  setWidgets(dashboard.layout || []);
                }}
              >
                {dashboard.name}
                {dashboard.is_default && " (Default)"}
              </Button>
              {dashboards.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDeleteDashboard(dashboard.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Widgets Grid */}
      {widgets.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">No widgets yet. Add your first widget to get started!</p>
          <Button onClick={handleAddWidget}>
            <Plus className="h-4 w-4 mr-2" />
            Add Widget
          </Button>
        </Card>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="widgets" direction="vertical">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
              >
                {widgets.map((widget, index) => (
                  <Draggable key={widget.id} draggableId={widget.id} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                      >
                        <Card className="relative group">
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 bg-background/80 backdrop-blur"
                              onClick={() => handleEditWidget(widget)}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 bg-background/80 backdrop-blur"
                              onClick={() => handleDeleteWidget(widget.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                          <DashboardWidget widget={widget} />
                        </Card>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Widget Config Dialog */}
      <WidgetConfigDialog
        open={showWidgetConfig}
        onOpenChange={setShowWidgetConfig}
        widget={editingWidget}
        onSave={handleSaveWidget}
      />

      {/* Layout Selector Dialog */}
      <DashboardLayoutSelector
        open={showLayoutSelector}
        onOpenChange={setShowLayoutSelector}
        onSelectLayout={(layout) => {
          // Apply layout logic here
          setShowLayoutSelector(false);
        }}
      />
    </div>
  );
}
