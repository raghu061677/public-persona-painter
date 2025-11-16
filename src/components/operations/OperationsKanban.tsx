import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Calendar, User, Image, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

interface OperationsKanbanProps {
  tasks: any[];
  loading: boolean;
  onRefresh: () => void;
}

const STATUS_COLUMNS = [
  { id: 'Assigned', label: 'Assigned', color: 'bg-blue-500' },
  { id: 'Pending', label: 'Pending', color: 'bg-orange-500' },
  { id: 'Mounted', label: 'Mounted', color: 'bg-yellow-500' },
  { id: 'PhotoUploaded', label: 'Photo Uploaded', color: 'bg-purple-500' },
  { id: 'Verified', label: 'Verified', color: 'bg-green-500' },
];

export function OperationsKanban({ tasks, loading, onRefresh }: OperationsKanbanProps) {
  const { toast } = useToast();
  const [draggingTask, setDraggingTask] = useState<any>(null);

  const getTasksByStatus = (status: string) => {
    return tasks.filter(task => task.status === status);
  };

  const handleDragStart = (task: any) => {
    setDraggingTask(task);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (status: string) => {
    if (!draggingTask) return;

    try {
      const { error } = await supabase
        .from('campaign_assets')
        .update({ status: status as any })
        .eq('id', draggingTask.id);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: `Task moved to ${status}`,
      });

      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDraggingTask(null);
    }
  };

  const getPhotoCount = (task: any) => {
    if (!task.photos) return 0;
    try {
      const photos = typeof task.photos === 'string' ? JSON.parse(task.photos) : task.photos;
      return Object.values(photos).filter(Boolean).length;
    } catch {
      return 0;
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATUS_COLUMNS.map(column => (
          <Card key={column.id}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {STATUS_COLUMNS.map(column => {
        const columnTasks = getTasksByStatus(column.id);
        
        return (
          <Card
            key={column.id}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(column.id)}
            className="flex flex-col"
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${column.color}`} />
                  {column.label}
                </CardTitle>
                <Badge variant="secondary">{columnTasks.length}</Badge>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1">
              <ScrollArea className="h-[calc(100vh-320px)]">
                <div className="space-y-3 pr-4">
                  {columnTasks.map(task => (
                    <Card
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task)}
                      className="cursor-move hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-4 space-y-3">
                        {/* Campaign Info */}
                        <div>
                          <p className="font-medium text-sm line-clamp-1">
                            {task.campaigns?.campaign_name || 'Untitled Campaign'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {task.campaigns?.client_name}
                          </p>
                        </div>

                        {/* Location */}
                        <div className="flex items-start gap-2 text-xs">
                          <MapPin className="h-3 w-3 mt-0.5 text-muted-foreground" />
                          <span className="line-clamp-2">{task.location}</span>
                        </div>

                        {/* Media Type */}
                        <Badge variant="outline" className="text-xs">
                          {task.media_type}
                        </Badge>

                        {/* Photos Count */}
                        {task.status !== 'Assigned' && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Image className="h-3 w-3" />
                            <span>{getPhotoCount(task)}/4 photos</span>
                          </div>
                        )}

                        {/* Mounter */}
                        {task.mounter_name && (
                          <div className="flex items-center gap-2 text-xs">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span>{task.mounter_name}</span>
                          </div>
                        )}

                        {/* Date */}
                        {task.assigned_at && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {format(new Date(task.assigned_at), 'MMM dd')}
                            </span>
                          </div>
                        )}

                        {/* Action */}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full justify-between"
                        >
                          View Details
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}

                  {columnTasks.length === 0 && (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      No tasks
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
