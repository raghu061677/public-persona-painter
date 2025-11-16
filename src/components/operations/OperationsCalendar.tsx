import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface OperationsCalendarProps {
  tasks: any[];
  loading: boolean;
}

export function OperationsCalendar({ tasks, loading }: OperationsCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getTasksForDay = (day: Date) => {
    return tasks.filter(task => {
      if (!task.assigned_at) return false;
      return isSameDay(new Date(task.assigned_at), day);
    });
  };

  const previousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Assigned': 'bg-blue-500',
      'Pending': 'bg-orange-500',
      'Mounted': 'bg-yellow-500',
      'PhotoUploaded': 'bg-purple-500',
      'Verified': 'bg-green-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  return (
    <Card>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={previousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, index) => {
            const dayTasks = getTasksForDay(day);
            const isToday = isSameDay(day, new Date());
            
            return (
              <div
                key={index}
                className={`
                  min-h-[120px] p-2 border rounded-lg
                  ${!isSameMonth(day, currentDate) ? 'bg-muted/50' : ''}
                  ${isToday ? 'border-primary border-2' : ''}
                `}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${isToday ? 'text-primary' : ''}`}>
                    {format(day, 'd')}
                  </span>
                  {dayTasks.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {dayTasks.length}
                    </Badge>
                  )}
                </div>

                <div className="space-y-1">
                  {dayTasks.slice(0, 3).map(task => (
                    <div
                      key={task.id}
                      className={`
                        text-xs p-1 rounded truncate cursor-pointer
                        hover:opacity-80 transition-opacity
                        ${getStatusColor(task.status)} text-white
                      `}
                      title={`${task.campaigns?.campaign_name} - ${task.location}`}
                    >
                      {task.location}
                    </div>
                  ))}
                  {dayTasks.length > 3 && (
                    <div className="text-xs text-muted-foreground pl-1">
                      +{dayTasks.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-6 flex-wrap">
          {[
            { key: 'Assigned', label: 'Assigned' },
            { key: 'Pending', label: 'Pending' },
            { key: 'Mounted', label: 'Mounted' },
            { key: 'PhotoUploaded', label: 'Photo Uploaded' },
            { key: 'Verified', label: 'Verified' }
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded ${getStatusColor(key)}`} />
              <span className="text-sm text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
