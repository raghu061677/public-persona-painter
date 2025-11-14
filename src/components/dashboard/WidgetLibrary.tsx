import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  FileText, 
  DollarSign,
  Calendar,
  MapPin,
  Activity,
  PieChart,
  List,
  Table as TableIcon,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface WidgetType {
  type: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultWidth: number;
  defaultHeight: number;
  minWidth: number;
  minHeight: number;
  category: 'stats' | 'charts' | 'lists' | 'other';
}

export const WIDGET_TYPES: WidgetType[] = [
  {
    type: 'stat-card',
    title: 'Stat Card',
    description: 'Display a single metric with trend',
    icon: TrendingUp,
    defaultWidth: 3,
    defaultHeight: 2,
    minWidth: 2,
    minHeight: 2,
    category: 'stats',
  },
  {
    type: 'revenue-chart',
    title: 'Revenue Chart',
    description: 'Line chart showing revenue trends',
    icon: BarChart3,
    defaultWidth: 6,
    defaultHeight: 4,
    minWidth: 4,
    minHeight: 3,
    category: 'charts',
  },
  {
    type: 'client-list',
    title: 'Recent Clients',
    description: 'List of recently added clients',
    icon: Users,
    defaultWidth: 4,
    defaultHeight: 4,
    minWidth: 3,
    minHeight: 3,
    category: 'lists',
  },
  {
    type: 'campaign-status',
    title: 'Campaign Status',
    description: 'Overview of campaign statuses',
    icon: Activity,
    defaultWidth: 4,
    defaultHeight: 3,
    minWidth: 3,
    minHeight: 2,
    category: 'charts',
  },
  {
    type: 'invoice-summary',
    title: 'Invoice Summary',
    description: 'Financial summary and aging',
    icon: DollarSign,
    defaultWidth: 4,
    defaultHeight: 3,
    minWidth: 3,
    minHeight: 2,
    category: 'stats',
  },
  {
    type: 'asset-map',
    title: 'Asset Map',
    description: 'Geographic distribution of assets',
    icon: MapPin,
    defaultWidth: 6,
    defaultHeight: 5,
    minWidth: 4,
    minHeight: 4,
    category: 'other',
  },
  {
    type: 'calendar-view',
    title: 'Calendar',
    description: 'Campaign schedule calendar',
    icon: Calendar,
    defaultWidth: 6,
    defaultHeight: 4,
    minWidth: 4,
    minHeight: 3,
    category: 'other',
  },
  {
    type: 'pie-chart',
    title: 'Distribution Chart',
    description: 'Pie chart for categorical data',
    icon: PieChart,
    defaultWidth: 4,
    defaultHeight: 4,
    minWidth: 3,
    minHeight: 3,
    category: 'charts',
  },
  {
    type: 'activity-feed',
    title: 'Activity Feed',
    description: 'Recent system activities',
    icon: List,
    defaultWidth: 4,
    defaultHeight: 5,
    minWidth: 3,
    minHeight: 4,
    category: 'lists',
  },
  {
    type: 'data-table',
    title: 'Data Table',
    description: 'Configurable data table',
    icon: TableIcon,
    defaultWidth: 6,
    defaultHeight: 4,
    minWidth: 4,
    minHeight: 3,
    category: 'lists',
  },
];

interface WidgetLibraryProps {
  onAddWidget: (widgetType: WidgetType) => void;
}

export function WidgetLibrary({ onAddWidget }: WidgetLibraryProps) {
  const categories = ['all', 'stats', 'charts', 'lists', 'other'] as const;
  const [selectedCategory, setSelectedCategory] = React.useState<typeof categories[number]>('all');

  const filteredWidgets = WIDGET_TYPES.filter(
    widget => selectedCategory === 'all' || widget.category === selectedCategory
  );

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-base">Widget Library</CardTitle>
        <CardDescription>Drag or click to add widgets</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4 min-h-0">
        <div className="flex gap-2 flex-wrap">
          {categories.map(cat => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className="capitalize"
            >
              {cat}
            </Button>
          ))}
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-2 pr-4">
            {filteredWidgets.map(widget => {
              const Icon = widget.icon;
              return (
                <Card
                  key={widget.type}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => onAddWidget(widget)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm mb-1">{widget.title}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {widget.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

import * as React from "react";
